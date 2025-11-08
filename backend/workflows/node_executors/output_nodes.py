"""
Output Node Executors
"""
from typing import Dict, Any
from .base import BaseNodeExecutor, NodeExecutionError
from datetime import datetime


class OutputNodeExecutor(BaseNodeExecutor):
    """Executor for output nodes"""
    
    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute output nodes"""
        
        handlers = {
            'respond-to-chat': self._execute_respond_to_chat,
            'readme-viewer': self._execute_readme_viewer,
        }
        
        handler = handlers.get(self.node_type)
        if not handler:
            raise NodeExecutionError(f"Unknown output node type: {self.node_type}")
        
        return await handler(inputs, context)
    
    async def _execute_respond_to_chat(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute respond to chat output"""
        # Get message from properties or input
        message = self.get_property('message', '')
        
        # If no message in properties, try to get from input
        if not message and inputs.get('main'):
            input_data = inputs['main']
            if isinstance(input_data, dict):
                message = input_data.get('text', '') or input_data.get('message', '') or str(input_data)
            else:
                message = str(input_data)
        
        self.log_execution(f"Responding to chat with message: {message[:100]}...")
        
        return {
            'main': {
                'response': message,
                'text': message,
                'timestamp': datetime.now().isoformat(),
                'type': 'chat_response'
            }
        }
    
    async def _execute_readme_viewer(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute README viewer output - just pass through the content"""
        # Get configured content from properties (default: 'work')
        configured_content = self.get_property('content', 'work')
        
        # Get content from input
        content = ''
        input_data = inputs.get('main', {})
        
        # Handle merged inputs from multiple nodes
        if isinstance(input_data, dict):
            # Try to extract content from common fields
            content = (
                input_data.get('text', '') or 
                input_data.get('content', '') or 
                input_data.get('response', '') or 
                input_data.get('message', '') or
                input_data.get('output', '')
            )
            
            # If no direct content field, look for agent output
            if not content:
                # Check for nested structures (e.g., from AI agent)
                for key, value in input_data.items():
                    if isinstance(value, dict):
                        content = (
                            value.get('text', '') or 
                            value.get('content', '') or 
                            value.get('response', '') or 
                            value.get('message', '')
                        )
                        if content:
                            break
                    elif isinstance(value, str) and len(value) > len(content):
                        content = value
            
            # If still no content, stringify the whole object
            if not content:
                # Try to create a readable representation
                import json
                try:
                    content = json.dumps(input_data, indent=2)
                except:
                    content = str(input_data)
        else:
            content = str(input_data)
        
        # Priority: input data > configured content > default "work"
        if not content or (isinstance(content, str) and not content.strip()):
            content = configured_content if configured_content and configured_content.strip() else 'work'
        
        # Get title from properties
        title = self.get_property('title', 'Content Viewer')
        
        self.log_execution(f"Displaying content in README viewer: {title}")
        
        return {
            'main': {
                'title': title,
                'content': content,
                'timestamp': datetime.now().isoformat(),
                'type': 'readme_viewer',
                'formatted': True
            }
        }
