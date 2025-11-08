"""
AI Node Executors using Alith SDK
"""
from typing import Dict, Any, List
from .base import BaseNodeExecutor, NodeExecutionError
import os
import json
from datetime import datetime


class AgentFlowDBMemory:
    """Custom memory class that uses Django database for persistent storage"""
    
    def __init__(self, collection, window_size: int = 20):
        self.collection = collection
        self.window_size = window_size
    
    def add_user_message(self, content: str):
        """Add a user message to memory"""
        from ..models import MemoryMessage
        MemoryMessage.objects.create(
            collection=self.collection,
            role='user',
            content=content,
            timestamp=datetime.now()
        )
        self._enforce_window_size()
    
    def add_ai_message(self, content: str):
        """Add an AI message to memory"""
        from ..models import MemoryMessage
        MemoryMessage.objects.create(
            collection=self.collection,
            role='assistant',
            content=content,
            timestamp=datetime.now()
        )
        self._enforce_window_size()
    
    def add_message(self, message):
        """Add a message object to memory"""
        from ..models import MemoryMessage
        MemoryMessage.objects.create(
            collection=self.collection,
            role=message.role,
            content=message.content,
            timestamp=datetime.now()
        )
        self._enforce_window_size()
    
    def messages(self) -> List:
        """Get all messages from memory"""
        from ..models import MemoryMessage
        from alith import MessageBuilder
        
        db_messages = MemoryMessage.objects.filter(
            collection=self.collection
        ).order_by('timestamp')
        
        # Convert to Alith message objects
        messages = []
        for msg in db_messages:
            if msg.role == 'user':
                message = MessageBuilder.new_human_message(msg.content)
            elif msg.role == 'assistant':
                message = MessageBuilder.new_ai_message(msg.content)
            elif msg.role == 'system':
                message = MessageBuilder.new_system_message(msg.content)
            else:
                message = MessageBuilder.new_tool_message(msg.content)
            
            messages.append(message)
        
        return messages
    
    def to_string(self) -> str:
        """Convert memory to string format"""
        messages = self.messages()
        return '\n'.join([f"{msg.role}: {msg.content}" for msg in messages])
    
    def clear(self):
        """Clear all messages from memory"""
        from ..models import MemoryMessage
        MemoryMessage.objects.filter(collection=self.collection).delete()
    
    def _enforce_window_size(self):
        """Remove oldest messages if we exceed window size"""
        from ..models import MemoryMessage
        
        total_messages = MemoryMessage.objects.filter(collection=self.collection).count()
        if total_messages > self.window_size:
            # Delete oldest messages
            messages_to_delete = total_messages - self.window_size
            oldest_messages = MemoryMessage.objects.filter(
                collection=self.collection
            ).order_by('timestamp')[:messages_to_delete]
            
            for msg in oldest_messages:
                msg.delete()


class AINodeExecutor(BaseNodeExecutor):
    """Executor for AI-related nodes"""
    
    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute AI nodes based on node type"""
        
        handlers = {
            'ai-agent': self._execute_ai_agent,
            'openai': self._execute_openai,
            'groq-llama': self._execute_groq,
            'groq-gemma': self._execute_groq,
            'anthropic': self._execute_anthropic,
            'google-gemini': self._execute_google_gemini,
            'question-answer-chain': self._execute_qa_chain,
            'summarization-chain': self._execute_summarization,
            'information-extractor': self._execute_extractor,
            'text-classifier': self._execute_classifier,
            'sentiment-analysis': self._execute_sentiment,
        }
        
        handler = handlers.get(self.node_type)
        if not handler:
            raise NodeExecutionError(f"Unknown AI node type: {self.node_type}")
        
        return await handler(inputs, context)
    
    async def _execute_ai_agent(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute AI Agent node"""
        try:
            from alith import Agent, WindowBufferMemory
            
            # Get inputs
            main_input = inputs.get('main', {})
            chat_model_input = inputs.get('chat-model', {})
            memory_input = inputs.get('memory', {})
            tools_input = inputs.get('tools', [])
            
            # Debug logging
            # self.log_execution(f"AI Agent inputs: {inputs}")
            # self.log_execution(f"Tools input: {tools_input}")
            
            # Get properties
            system_prompt = self.get_property('prompt', '# AI Agent System Prompt\n\nYou are a helpful AI assistant.')
            
            # Get model from chat-model input or use default
            model = chat_model_input.get('model', 'gpt-4-turbo') if chat_model_input else 'gpt-4-turbo'
            temperature = chat_model_input.get('temperature', 0.7) if chat_model_input else 0.7
            max_tokens = chat_model_input.get('max_tokens', 1024) if chat_model_input else 1024
            base_url = chat_model_input.get('base_url') if chat_model_input else None
            
            # Create memory if provided
            memory = None
            if memory_input:
                # Get window size from memory input (could be windowSize or maxMessages for legacy)
                window_size = memory_input.get('window_size', memory_input.get('maxMessages', 20))
                memory_type = memory_input.get('type', 'WindowBufferMemory')
                
                # Handle different memory types
                if memory_type == 'AgentFlowDBMemory':
                    # Use Django database for persistent memory
                    from ..models import MemoryCollection, MemoryMessage
                    from django.db import transaction
                    from asgiref.sync import sync_to_async
                    
                    workflow_id = context.workflow_id if hasattr(context, 'workflow_id') else context.get('workflow_id', 'unknown')
                    collection_name = f"workflow_{workflow_id}_node_{self.node_id}"
                    
                    # Get or create memory collection using sync_to_async
                    @sync_to_async
                    def get_or_create_collection():
                        with transaction.atomic():
                            collection, created = MemoryCollection.objects.get_or_create(
                                name=collection_name,
                                defaults={
                                    'workflow_id': workflow_id,
                                    'node_id': self.node_id,
                                    'window_size': window_size,
                                    'description': 'Agent Flow Database Memory'
                                }
                            )
                        return collection, created
                    
                    collection, created = await get_or_create_collection()
                    
                    if created:
                        self.log_execution(f"Created new database memory collection: {collection_name}")
                    else:
                        self.log_execution(f"Loaded existing database memory collection: {collection_name}")
                    
                    # Create a custom memory class that uses Django database with proper persistence
                    # We'll use a thread-safe approach to avoid async context issues
                    import threading
                    from concurrent.futures import ThreadPoolExecutor
                    
                    class ThreadSafeDBMemory:
                        def __init__(self, collection, window_size):
                            self.collection = collection
                            self.window_size = window_size
                            self._messages = []
                            self._executor = ThreadPoolExecutor(max_workers=1)
                            self._load_messages_from_db()
                        
                        def _load_messages_from_db(self):
                            """Load messages from database using thread pool"""
                            def _load():
                                try:
                                    from ..models import MemoryMessage
                                    db_messages = MemoryMessage.objects.filter(
                                        collection=self.collection
                                    ).order_by('timestamp')
                                    
                                    from alith import MessageBuilder
                                    messages = []
                                    for msg in db_messages:
                                        if msg.role == 'user':
                                            message = MessageBuilder.new_human_message(msg.content)
                                        elif msg.role == 'assistant':
                                            message = MessageBuilder.new_ai_message(msg.content)
                                        elif msg.role == 'system':
                                            message = MessageBuilder.new_system_message(msg.content)
                                        else:
                                            message = MessageBuilder.new_tool_message(msg.content)
                                        
                                        messages.append(message)
                                    return messages
                                except Exception as e:
                                    print(f"Error loading messages from DB: {e}")
                                    return []
                            
                            try:
                                future = self._executor.submit(_load)
                                self._messages = future.result(timeout=5)
                            except Exception as e:
                                print(f"Error in thread pool: {e}")
                                self._messages = []
                        
                        def add_user_message(self, content: str):
                            from alith import MessageBuilder
                            message = MessageBuilder.new_human_message(content)
                            self._messages.append(message)
                            self._enforce_window_size()
                            self._save_to_db('user', content)
                        
                        def add_ai_message(self, content: str):
                            from alith import MessageBuilder
                            message = MessageBuilder.new_ai_message(content)
                            self._messages.append(message)
                            self._enforce_window_size()
                            self._save_to_db('assistant', content)
                        
                        def add_message(self, message):
                            self._messages.append(message)
                            self._enforce_window_size()
                            self._save_to_db(message.role, message.content)
                        
                        def messages(self):
                            return self._messages
                        
                        def to_string(self):
                            return '\n'.join([f"{msg.role}: {msg.content}" for msg in self._messages])
                        
                        def clear(self):
                            self._messages.clear()
                            def _clear():
                                try:
                                    from ..models import MemoryMessage
                                    MemoryMessage.objects.filter(collection=self.collection).delete()
                                except Exception as e:
                                    print(f"Error clearing DB messages: {e}")
                            
                            try:
                                future = self._executor.submit(_clear)
                                future.result(timeout=5)
                            except Exception as e:
                                print(f"Error in clear thread: {e}")
                        
                        def _enforce_window_size(self):
                            if len(self._messages) > self.window_size:
                                # Remove oldest messages
                                messages_to_remove = len(self._messages) - self.window_size
                                self._messages = self._messages[messages_to_remove:]
                        
                        def _save_to_db(self, role: str, content: str):
                            """Save message to database using thread pool"""
                            def _save():
                                try:
                                    from ..models import MemoryMessage
                                    MemoryMessage.objects.create(
                                        collection=self.collection,
                                        role=role,
                                        content=content,
                                        timestamp=datetime.now()
                                    )
                                    self._enforce_window_size_db()
                                except Exception as e:
                                    print(f"Error saving to DB: {e}")
                            
                            try:
                                future = self._executor.submit(_save)
                                future.result(timeout=5)
                            except Exception as e:
                                print(f"Error in save thread: {e}")
                        
                        def _enforce_window_size_db(self):
                            """Enforce window size in database"""
                            try:
                                from ..models import MemoryMessage
                                total_messages = MemoryMessage.objects.filter(collection=self.collection).count()
                                if total_messages > self.window_size:
                                    messages_to_delete = total_messages - self.window_size
                                    oldest_messages = MemoryMessage.objects.filter(
                                        collection=self.collection
                                    ).order_by('timestamp')[:messages_to_delete]
                                    
                                    for msg in oldest_messages:
                                        msg.delete()
                            except Exception as e:
                                print(f"Error enforcing DB window size: {e}")
                    
                    memory = ThreadSafeDBMemory(collection, window_size)
                    
                    # Get message count
                    message_count = len(memory.messages())
                    self.log_execution(f"Database memory has {message_count} messages")
                    
                else:
                    # Use global memory storage for in-memory persistence
                    from ..execution_engine import _global_memory_storage
                    # Handle both ExecutionContext object and dict
                    workflow_id = context.workflow_id if hasattr(context, 'workflow_id') else context.get('workflow_id', 'unknown')
                    memory_key = f"memory_{self.node_id}_{workflow_id}"
                    
                    if memory_key in _global_memory_storage:
                        memory = _global_memory_storage[memory_key]
                        self.log_execution(f"Loaded existing WindowBufferMemory with {len(memory.messages())} messages")
                    else:
                        memory = WindowBufferMemory(window_size=window_size)
                        _global_memory_storage[memory_key] = memory
                        self.log_execution(f"Created new WindowBufferMemory with window_size: {window_size}")
                
                # Log current memory state
                if memory:
                    current_messages = memory.messages()
                    self.log_execution(f"Memory state: {len(current_messages)} messages")
                    if current_messages:
                        self.log_execution(f"Latest message: {current_messages[-1].content[:50]}...")
            else:
                self.log_execution("No memory input provided to AI Agent")
            
            # Determine API key based on model
            # First check if chat_model_input has an api_key (from the connected chat model node)
            api_key = None
            if chat_model_input and 'api_key' in chat_model_input:
                api_key = chat_model_input['api_key']
            
            # If no API key from chat model, determine based on model type
            if not api_key:
                if model.startswith('llama-') or model.startswith('mixtral-') or model.startswith('gemma-'):
                    # Use Groq API key
                    api_key = context.get('groq_api_key') or os.getenv('GROQ_API_KEY')
                    if not api_key:
                        raise NodeExecutionError("Groq API key not found. Please configure it in the chat model node settings.")
                    base_url = base_url or "https://api.groq.com/openai/v1"
                elif model.startswith('claude-'):
                    # Use Anthropic API key
                    api_key = context.get('anthropic_api_key') or os.getenv('ANTHROPIC_API_KEY')
                    if not api_key:
                        raise NodeExecutionError("Anthropic API key not found. Please configure it in the chat model node settings.")
                    base_url = base_url or "https://api.anthropic.com/v1"
                elif model.startswith('gemini-'):
                    # Use Google API key
                    api_key = context.get('google_api_key') or os.getenv('GOOGLE_API_KEY')
                    if not api_key:
                        raise NodeExecutionError("Google API key not found. Please configure it in the chat model node settings.")
                    base_url = base_url or "https://generativelanguage.googleapis.com/v1"
                else:
                    # Default to OpenAI
                    api_key = context.get('openai_api_key') or os.getenv('OPENAI_API_KEY')
                    if not api_key:
                        raise NodeExecutionError("OpenAI API key not found. Please configure it in the chat model node settings.")
                    base_url = base_url or "https://api.openai.com/v1"
            
            # Process tools input to create actual tool instances
            tool_instances = []
            if tools_input:
                # Handle both single tool dict and list of tools
                tools_list = tools_input if isinstance(tools_input, list) else [tools_input]
                
                for tool_config in tools_list:
                    if isinstance(tool_config, dict):
                        tool_type = tool_config.get('tool_type', '')
                        
                        if tool_type == 'duckduckgo-search':
                            from .duckduckgo_tool import create_duckduckgo_tool
                            max_results = tool_config.get('maxResults', 5)
                            region = tool_config.get('region', 'us-en')
                            duckduckgo_tool = create_duckduckgo_tool(max_results=max_results, region=region)
                            tool_instances.append(duckduckgo_tool)
                            
                            # Also create a brave_search alias to handle AI model preferences
                            brave_tool = create_duckduckgo_tool(max_results=max_results, region=region)
                            # Override the name to be brave_search
                            brave_tool.name = "brave_search"
                            brave_tool.description = "Search the web using DuckDuckGo for privacy-focused search results (Brave Search compatible)"
                            tool_instances.append(brave_tool)
                            
                            self.log_execution(f"Added DuckDuckGo tool with maxResults={max_results}, region={region}")
                            self.log_execution(f"Also added brave_search alias for AI model compatibility")
                        elif tool_type == 'calculator':
                            # Add calculator tool if needed
                            pass
                        elif tool_type == 'web-search':
                            # Add web search tool if needed
                            pass
                        elif tool_type == 'api-caller':
                            # Add API caller tool if needed
                            pass
            
            # Log tools being passed to agent
            tool_names = []
            for tool in tool_instances:
                if hasattr(tool, 'name'):
                    tool_names.append(tool.name)
                elif hasattr(tool, 'get_tool_definition'):
                    tool_names.append(tool.get_tool_definition().get('name', 'unknown'))
                else:
                    tool_names.append(type(tool).__name__)
            
            self.log_execution(f"Creating agent with {len(tool_instances)} tools: {tool_names}")
            
            # Enhance system prompt with available tools information
            enhanced_system_prompt = system_prompt
            if tool_instances:
                tool_info = []
                for tool in tool_instances:
                    if hasattr(tool, 'name'):
                        tool_info.append(f"- {tool.name}")
                    elif hasattr(tool, 'get_tool_definition'):
                        tool_def = tool.get_tool_definition()
                        tool_info.append(f"- {tool_def.get('name', 'unknown')}")
                
                if tool_info:
                    enhanced_system_prompt += f"\n\nAvailable tools:\n" + "\n".join(tool_info)
                    enhanced_system_prompt += "\n\nIMPORTANT: Only use the exact tool names listed above. Do not use alternative names like 'brave_search' - use the exact names provided."
            
            self.log_execution(f"Enhanced system prompt: {enhanced_system_prompt[:200]}...")
            
            # Create agent
            agent = Agent(
                name=self.label,
                model=model,
                api_key=api_key,
                base_url=base_url,
                preamble=enhanced_system_prompt,
                memory=memory,
                tools=tool_instances if tool_instances else []
            )
            
            # Get prompt from input
            prompt = main_input.get('text') or main_input.get('message') or main_input.get('prompt', '')
            if not prompt:
                raise NodeExecutionError("No prompt provided to AI Agent")
            
            self.log_execution(f"Executing AI Agent with prompt: {prompt[:100]}...")
            
            # Log memory state before execution
            if memory:
                current_messages = memory.messages()
                self.log_execution(f"Memory has {len(current_messages)} messages before execution")
                if current_messages:
                    self.log_execution(f"Latest message: {current_messages[-1].content[:50]}...")
            
            # Execute
            response = agent.prompt(prompt)
            
            # Log memory state after execution
            if memory:
                current_messages = memory.messages()
                self.log_execution(f"Memory has {len(current_messages)} messages after execution")
            
            self.log_execution(f"AI Agent response: {response[:100]}...")
            
            return {
                'main': {
                    'text': response,
                    'prompt': prompt,
                    'model': model,
                    'temperature': temperature
                }
            }
            
        except ImportError:
            raise NodeExecutionError("Alith SDK not installed. Please install: pip install alith")
        except Exception as e:
            raise NodeExecutionError(f"AI Agent execution failed: {str(e)}")
    
    async def _execute_openai(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute OpenAI node"""
        try:
            from alith import Agent
            
            api_key = context.get('openai_api_key') or os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise NodeExecutionError("OpenAI API key not found")
            
            operation = self.get_property('operation', 'chat')
            message = self.get_property('message', '')
            
            if not message:
                message = inputs.get('main', {}).get('text', '')
            
            if not message:
                raise NodeExecutionError("No message provided to OpenAI node")
            
            agent = Agent(
                name=self.label,
                model='gpt-4-turbo',
                api_key=api_key
            )
            
            self.log_execution(f"Calling OpenAI with message: {message[:100]}...")
            response = agent.prompt(message)
            
            return {
                'main': {
                    'text': response,
                    'operation': operation,
                    'input': message
                }
            }
            
        except Exception as e:
            raise NodeExecutionError(f"OpenAI execution failed: {str(e)}")
    
    async def _execute_groq(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Groq node"""
        try:
            from alith import Agent
            
            # Get API key from node properties first, then context, then environment
            api_key = self.get_property('api_key', '') or context.get('groq_api_key') or os.getenv('GROQ_API_KEY')
            
            # Debug logging
            self.log_execution(f"Groq API key sources:")
            self.log_execution(f"  - Node properties: {self.properties}")
            self.log_execution(f"  - Context groq_api_key: {context.get('groq_api_key')}")
            self.log_execution(f"  - Environment GROQ_API_KEY: {os.getenv('GROQ_API_KEY')}")
            self.log_execution(f"  - Final API key: {api_key[:10] + '...' if api_key else 'None'}")
            
            if not api_key:
                raise NodeExecutionError("Groq API key not found. Please configure it in the node settings.")
            
            model = self.get_property('model', 'llama-3.1-8b-instant')
            temperature = self.get_property('temperature', 0.7)
            max_tokens = self.get_property('max_tokens', 1024)
            
            # Check if this node has input (being used standalone) or no input (being used as model config)
            message = inputs.get('main', {}).get('text', '')
            
            # Debug logging
            self.log_execution(f"Groq node inputs: {inputs}")
            self.log_execution(f"Groq node message: '{message}'")
            
            # If no input, this is a chat model configuration node
            # Just return the model configuration including API key
            if not message:
                self.log_execution(f"Providing Groq model configuration: {model}")
                return {
                    'main': {
                        'model': model,
                        'temperature': temperature,
                        'max_tokens': max_tokens,
                        'base_url': "https://api.groq.com/openai/v1",
                        'api_key': api_key  # Pass API key to AI Agent
                    }
                }
            
            # If there is input, execute the model
            agent = Agent(
                name=self.label,
                model=model,
                api_key=api_key,
                base_url="https://api.groq.com/openai/v1"
            )
            
            self.log_execution(f"Calling Groq ({model}) with message: {message[:100]}...")
            response = agent.prompt(message)
            
            return {
                'main': {
                    'text': response,
                    'model': model,
                    'temperature': temperature,
                    'max_tokens': max_tokens,
                    'input': message
                }
            }
            
        except Exception as e:
            raise NodeExecutionError(f"Groq execution failed: {str(e)}")
    
    async def _execute_anthropic(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Anthropic (Claude) node"""
        try:
            from alith import Agent
            
            api_key = context.get('anthropic_api_key') or os.getenv('ANTHROPIC_API_KEY')
            if not api_key:
                raise NodeExecutionError("Anthropic API key not found")
            
            model = self.get_property('model', 'claude-3-sonnet')
            prompt = self.get_property('prompt', '')
            
            if not prompt:
                prompt = inputs.get('main', {}).get('text', '')
            
            if not prompt:
                raise NodeExecutionError("No prompt provided to Anthropic node")
            
            agent = Agent(
                name=self.label,
                model=model,
                api_key=api_key,
                base_url="https://api.anthropic.com/v1"
            )
            
            self.log_execution(f"Calling Anthropic ({model}) with prompt: {prompt[:100]}...")
            response = agent.prompt(prompt)
            
            return {
                'main': {
                    'text': response,
                    'model': model,
                    'input': prompt
                }
            }
            
        except Exception as e:
            raise NodeExecutionError(f"Anthropic execution failed: {str(e)}")
    
    async def _execute_google_gemini(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Google Gemini node"""
        try:
            from alith import Agent
            
            api_key = context.get('google_api_key') or os.getenv('GOOGLE_API_KEY')
            if not api_key:
                raise NodeExecutionError("Google API key not found")
            
            model = self.get_property('model', 'gemini-pro')
            prompt = self.get_property('prompt', '')
            
            if not prompt:
                prompt = inputs.get('main', {}).get('text', '')
            
            if not prompt:
                raise NodeExecutionError("No prompt provided to Google Gemini node")
            
            agent = Agent(
                name=self.label,
                model=model,
                api_key=api_key,
                base_url="https://generativelanguage.googleapis.com/v1"
            )
            
            self.log_execution(f"Calling Google Gemini ({model}) with prompt: {prompt[:100]}...")
            response = agent.prompt(prompt)
            
            return {
                'main': {
                    'text': response,
                    'model': model,
                    'input': prompt
                }
            }
            
        except Exception as e:
            raise NodeExecutionError(f"Google Gemini execution failed: {str(e)}")
    
    async def _execute_qa_chain(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Question Answer Chain"""
        try:
            from alith import Agent, ChromaDBStore, FastEmbeddings, chunk_text
            
            self.validate_inputs(inputs, ['main'])
            
            question = self.get_property('question', '')
            if not question:
                question = inputs.get('main', {}).get('question', '')
            
            if not question:
                raise NodeExecutionError("No question provided")
            
            documents = inputs.get('main', {}).get('documents', [])
            if not documents:
                raise NodeExecutionError("No documents provided for QA")
            
            # Setup vector store
            embeddings = FastEmbeddings()
            store = ChromaDBStore(path="./data/qa_store", embeddings=embeddings)
            
            # Chunk and store documents
            all_chunks = []
            for doc in documents:
                chunks = chunk_text(doc, max_chunk_token_size=200)
                all_chunks.extend(chunks)
            
            store.save_docs(all_chunks)
            
            # Create agent with RAG
            api_key = context.get('openai_api_key') or os.getenv('OPENAI_API_KEY')
            agent = Agent(
                name=self.label,
                model='gpt-4-turbo',
                api_key=api_key,
                store=store
            )
            
            self.log_execution(f"Answering question: {question}")
            answer = agent.prompt(question)
            
            return {
                'main': {
                    'answer': answer,
                    'question': question,
                    'documents_count': len(documents)
                }
            }
            
        except Exception as e:
            raise NodeExecutionError(f"QA Chain execution failed: {str(e)}")
    
    async def _execute_summarization(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Summarization Chain"""
        try:
            from alith import Agent
            
            self.validate_inputs(inputs, ['main'])
            
            text = inputs.get('main', {}).get('text', '')
            if not text:
                raise NodeExecutionError("No text provided for summarization")
            
            max_length = self.get_property('maxLength', 500)
            
            api_key = context.get('openai_api_key') or os.getenv('OPENAI_API_KEY')
            agent = Agent(
                name=self.label,
                model='gpt-4-turbo',
                api_key=api_key,
                preamble=f"You are a summarization assistant. Summarize the following text in approximately {max_length} words or less."
            )
            
            self.log_execution(f"Summarizing text of length: {len(text)}")
            summary = agent.prompt(text)
            
            return {
                'main': {
                    'summary': summary,
                    'original_length': len(text),
                    'summary_length': len(summary)
                }
            }
            
        except Exception as e:
            raise NodeExecutionError(f"Summarization execution failed: {str(e)}")
    
    async def _execute_extractor(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Information Extractor"""
        try:
            from alith import Agent, Extractor
            from pydantic import BaseModel, create_model
            
            self.validate_inputs(inputs, ['main'])
            
            text = inputs.get('main', {}).get('text', '')
            if not text:
                raise NodeExecutionError("No text provided for extraction")
            
            schema_json = self.get_property('schema', '{"fields": []}')
            schema = json.loads(schema_json) if isinstance(schema_json, str) else schema_json
            
            fields = schema.get('fields', [])
            if not fields:
                raise NodeExecutionError("No extraction schema defined")
            
            # Create dynamic Pydantic model
            field_definitions = {field: (str, ...) for field in fields}
            ExtractionModel = create_model('ExtractionModel', **field_definitions)
            
            api_key = context.get('openai_api_key') or os.getenv('OPENAI_API_KEY')
            agent = Agent(model='gpt-4-turbo', api_key=api_key)
            
            extractor = Extractor(agent=agent, model=ExtractionModel)
            
            self.log_execution(f"Extracting fields: {', '.join(fields)}")
            result = extractor.extract(text)
            
            return {
                'main': {
                    'extracted': result.dict(),
                    'fields': fields
                }
            }
            
        except Exception as e:
            raise NodeExecutionError(f"Information extraction failed: {str(e)}")
    
    async def _execute_classifier(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Text Classifier"""
        try:
            from alith import Agent
            
            text = self.get_property('text', '')
            if not text:
                text = inputs.get('main', {}).get('text', '')
            
            if not text:
                raise NodeExecutionError("No text provided for classification")
            
            categories = self.get_property('categories', 'positive, negative, neutral')
            category_list = [cat.strip() for cat in categories.split(',')]
            
            api_key = context.get('openai_api_key') or os.getenv('OPENAI_API_KEY')
            agent = Agent(
                name=self.label,
                model='gpt-4-turbo',
                api_key=api_key,
                preamble=f"You are a text classifier. Classify the following text into one of these categories: {', '.join(category_list)}. Respond with only the category name."
            )
            
            self.log_execution(f"Classifying text into categories: {category_list}")
            category = agent.prompt(text)
            
            return {
                'main': {
                    'category': category.strip(),
                    'text': text,
                    'available_categories': category_list
                }
            }
            
        except Exception as e:
            raise NodeExecutionError(f"Text classification failed: {str(e)}")
    
    async def _execute_sentiment(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Sentiment Analysis"""
        try:
            from alith import Agent
            
            text = self.get_property('text', '')
            if not text:
                text = inputs.get('main', {}).get('text', '')
            
            if not text:
                raise NodeExecutionError("No text provided for sentiment analysis")
            
            api_key = context.get('openai_api_key') or os.getenv('OPENAI_API_KEY')
            agent = Agent(
                name=self.label,
                model='gpt-4-turbo',
                api_key=api_key,
                preamble="You are a sentiment analysis assistant. Analyze the sentiment of the text and respond with: positive, negative, or neutral, followed by a confidence score (0-1)."
            )
            
            self.log_execution("Analyzing sentiment...")
            result = agent.prompt(text)
            
            # Parse result
            parts = result.lower().split()
            sentiment = parts[0] if parts else 'neutral'
            confidence = 0.5
            
            try:
                if len(parts) > 1:
                    confidence = float(parts[1])
            except:
                pass
            
            return {
                'main': {
                    'sentiment': sentiment,
                    'confidence': confidence,
                    'text': text
                }
            }
            
        except Exception as e:
            raise NodeExecutionError(f"Sentiment analysis failed: {str(e)}")


class ChatModelExecutor(BaseNodeExecutor):
    """Executor for chat model nodes"""
    
    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute chat model nodes - these provide configuration for AI agents"""
        model = self.get_property('model', 'gpt-4-turbo')
        temperature = self.get_property('temperature', 0.7)
        max_tokens = self.get_property('max_tokens', 1024)
        
        # Determine base URL based on model
        base_url = None
        if model.startswith('llama-') or model.startswith('mixtral-') or model.startswith('gemma-'):
            base_url = "https://api.groq.com/openai/v1"
        elif model.startswith('gpt-'):
            base_url = "https://api.openai.com/v1"
        elif model.startswith('claude-'):
            base_url = "https://api.anthropic.com/v1"
        elif model.startswith('gemini-'):
            base_url = "https://generativelanguage.googleapis.com/v1"
        
        return {
            'main': {
                'model': model,
                'temperature': temperature,
                'max_tokens': max_tokens,
                'base_url': base_url,
                'node_type': 'chat-model'
            }
        }


class MemoryExecutor(BaseNodeExecutor):
    """Executor for memory nodes using Alith SDK WindowBufferMemory"""
    
    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute memory nodes - these provide memory configuration using Alith SDK"""
        
        try:
            from alith import WindowBufferMemory
            
            memory_config = {
                'node_type': 'memory',
                'memory_type': self.node_type
            }
            
            if self.node_type == 'window-buffer-memory':
                window_size = self.get_property('windowSize', 20)
                memory_config.update({
                    'type': 'WindowBufferMemory',
                    'window_size': window_size,
                    'description': 'Maintains a sliding window of recent messages using Alith SDK'
                })
                
            elif self.node_type == 'agent-flow-db-memory':
                window_size = self.get_property('windowSize', 20)
                memory_config.update({
                    'type': 'AgentFlowDBMemory',
                    'window_size': window_size,
                    'description': 'Persistent memory storage using Django database',
                    'storage_type': 'database'
                })
                
            # Legacy support for old memory types - all map to WindowBufferMemory
            elif self.node_type == 'simple-memory':
                max_messages = self.get_property('maxMessages', 10)
                memory_config.update({
                    'type': 'WindowBufferMemory',
                    'window_size': max_messages,
                    'description': 'Simple memory storage for conversation context (legacy)'
                })
                
            elif self.node_type == 'vector-memory':
                # For vector memory, we still use WindowBufferMemory as the base
                # Vector operations would be handled by the Agent's store parameter
                collection = self.get_property('collection', 'default')
                memory_config.update({
                    'type': 'WindowBufferMemory',
                    'window_size': 20,  # Default window size
                    'collection_name': collection,
                    'description': 'Memory with vector store integration (legacy)'
                })
            
            self.log_execution(f"Memory configuration: {memory_config}")
            
            return {
                'main': memory_config
            }
            
        except ImportError:
            raise NodeExecutionError("Alith SDK not installed. Please install: pip install alith")
        except Exception as e:
            raise NodeExecutionError(f"Memory configuration failed: {str(e)}")


class ToolExecutor(BaseNodeExecutor):
    """Executor for tool nodes"""
    
    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute tool nodes - these provide tools for AI agents"""
        
        if self.node_type == 'calculator':
            precision = self.get_property('precision', 2)
            return {
                'main': {
                    'tool_type': 'calculator',
                    'precision': precision,
                    'node_type': 'tool'
                }
            }
        elif self.node_type == 'web-search':
            max_results = self.get_property('maxResults', 5)
            return {
                'main': {
                    'tool_type': 'web-search',
                    'maxResults': max_results,
                    'node_type': 'tool'
                }
            }
        elif self.node_type == 'duckduckgo-search':
            max_results = self.get_property('maxResults', 5)
            region = self.get_property('region', 'us-en')
            return {
                'main': {
                    'tool_type': 'duckduckgo-search',
                    'maxResults': max_results,
                    'region': region,
                    'node_type': 'tool'
                }
            }
        elif self.node_type == 'api-caller':
            url = self.get_property('url', '')
            method = self.get_property('method', 'GET')
            return {
                'main': {
                    'tool_type': 'api-caller',
                    'url': url,
                    'method': method,
                    'node_type': 'tool'
                }
            }
        
        return {'main': {'node_type': 'tool'}}

