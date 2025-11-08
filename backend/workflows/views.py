"""
Django REST Framework views for workflows
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import models
import uuid
import asyncio
import os
import time
from asgiref.sync import async_to_sync

from .models import Workflow, WorkflowExecution, Credential, ExportedWorkflow
from .serializers import (
    WorkflowSerializer,
    WorkflowExecutionSerializer,
    CredentialSerializer,
    ExecuteWorkflowSerializer,
    ExecuteNodeSerializer,
    ExportedWorkflowSerializer,
    ExportedWorkflowCreateSerializer,
    ExportedWorkflowListSerializer
)
from .execution_engine import execution_engine


class WorkflowViewSet(viewsets.ModelViewSet):
    """ViewSet for Workflow CRUD operations"""
    queryset = Workflow.objects.all()
    serializer_class = WorkflowSerializer
    
    def get_queryset(self):
        """Filter workflows by authenticated user"""
        queryset = Workflow.objects.all()
        if self.request.user.is_authenticated:
            queryset = queryset.filter(user=self.request.user)
        else:
            queryset = queryset.none()  # No workflows for unauthenticated users
        return queryset
    
    def perform_create(self, serializer):
        """Associate workflow with current user"""
        serializer.save(user=self.request.user if self.request.user.is_authenticated else None)
    
    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Execute a workflow"""
        workflow = self.get_object()
        serializer = ExecuteWorkflowSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        trigger_data = serializer.validated_data.get('trigger_data', {})
        start_node_id = serializer.validated_data.get('start_node_id')
        credentials = serializer.validated_data.get('credentials', {})
        
        # Generate execution ID
        execution_id = str(uuid.uuid4())
        
        # Execute workflow asynchronously
        try:
            context = async_to_sync(execution_engine.execute_workflow)(
                workflow_id=str(workflow.id),
                execution_id=execution_id,
                nodes=workflow.nodes,
                edges=workflow.edges,
                trigger_data=trigger_data,
                credentials=credentials,
                start_node_id=start_node_id
            )
            
            # Save execution to database
            execution = WorkflowExecution.objects.create(
                workflow=workflow,
                status=context.status,
                started_at=context.start_time,
                finished_at=context.end_time,
                execution_order=context.execution_order,
                node_states=context.node_states,
                errors=context.errors,
                trigger_data=trigger_data
            )
            
            return Response({
                'execution_id': execution_id,
                'status': context.status,
                'execution': context.to_dict()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': str(e),
                'execution_id': execution_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def execute_node(self, request, pk=None):
        """Execute a single node in the workflow"""
        workflow = self.get_object()
        serializer = ExecuteNodeSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        node_id = serializer.validated_data['node_id']
        trigger_data = serializer.validated_data.get('trigger_data', {})
        credentials = serializer.validated_data.get('credentials', {})
        
        # Check if node exists in workflow
        node = next((n for n in workflow.nodes if n['id'] == node_id), None)
        if not node:
            return Response({
                'error': f'Node {node_id} not found in workflow'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Generate execution ID
        execution_id = str(uuid.uuid4())
        
        try:
            context = async_to_sync(execution_engine.execute_workflow)(
                workflow_id=str(workflow.id),
                execution_id=execution_id,
                nodes=workflow.nodes,
                edges=workflow.edges,
                trigger_data=trigger_data,
                credentials=credentials,
                start_node_id=node_id
            )
            
            # Save execution to database
            execution = WorkflowExecution.objects.create(
                workflow=workflow,
                status=context.status,
                started_at=context.start_time,
                finished_at=context.end_time,
                execution_order=context.execution_order,
                node_states=context.node_states,
                errors=context.errors,
                trigger_data=trigger_data
            )
            
            return Response({
                'execution_id': execution_id,
                'node_id': node_id,
                'status': context.status,
                'execution': context.to_dict()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': str(e),
                'execution_id': execution_id,
                'node_id': node_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def executions(self, request, pk=None):
        """Get execution history for a workflow"""
        workflow = self.get_object()
        executions = workflow.executions.all()
        serializer = WorkflowExecutionSerializer(executions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def validate(self, request):
        """Validate workflow structure"""
        nodes = request.data.get('nodes', [])
        edges = request.data.get('edges', [])
        
        errors = []
        warnings = []
        
        # Check for trigger nodes
        trigger_count = sum(1 for n in nodes if n.get('data', {}).get('type', '').endswith('-trigger'))
        if trigger_count == 0:
            errors.append("Workflow must have at least one trigger node")
        
        # Check for orphaned nodes
        connected_nodes = set()
        for edge in edges:
            connected_nodes.add(edge['source'])
            connected_nodes.add(edge['target'])
        
        orphaned = [n['id'] for n in nodes if n['id'] not in connected_nodes and len(edges) > 0]
        if orphaned:
            warnings.append(f"Orphaned nodes detected: {', '.join(orphaned)}")
        
        # Check for cycles (simple check)
        # A more sophisticated cycle detection would be needed for production
        
        return Response({
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        })


class WorkflowExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing workflow execution history"""
    queryset = WorkflowExecution.objects.all()
    serializer_class = WorkflowExecutionSerializer
    
    def get_queryset(self):
        """Filter executions by authenticated user's workflows"""
        queryset = WorkflowExecution.objects.all()
        if self.request.user.is_authenticated:
            queryset = queryset.filter(workflow__user=self.request.user)
        else:
            queryset = queryset.none()
        return queryset
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Get current execution status"""
        execution = self.get_object()
        
        # Check if execution is still running
        context = execution_engine.get_execution(str(execution.id))
        if context:
            return Response(context.to_dict())
        
        # Return stored execution data
        return Response({
            'execution_id': str(execution.id),
            'status': execution.status,
            'started_at': execution.started_at.isoformat(),
            'finished_at': execution.finished_at.isoformat() if execution.finished_at else None,
            'execution_order': execution.execution_order,
            'node_states': execution.node_states,
            'errors': execution.errors
        })


class CredentialViewSet(viewsets.ModelViewSet):
    """ViewSet for managing credentials"""
    queryset = Credential.objects.all()
    serializer_class = CredentialSerializer
    
    def get_queryset(self):
        """Filter credentials by authenticated user"""
        queryset = Credential.objects.all()
        if self.request.user.is_authenticated:
            queryset = queryset.filter(user=self.request.user)
        else:
            queryset = queryset.none()  # No credentials for unauthenticated users
        return queryset
    
    def perform_create(self, serializer):
        """Associate credential with current user"""
        serializer.save(user=self.request.user if self.request.user.is_authenticated else None)
    
    def create(self, request, *args, **kwargs):
        """Create a new credential"""
        # In production, encrypt the credential data before storing
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Update a credential"""
        # In production, encrypt the credential data before storing
        return super().update(request, *args, **kwargs)


# Chat trigger endpoint
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['POST'])
def trigger_chat(request):
    """Trigger a workflow from a chat message"""
    workflow_id = request.data.get('workflow_id')
    message = request.data.get('message', '')
    user = request.data.get('user', 'anonymous')
    channel = request.data.get('channel', '')
    
    if not workflow_id:
        return Response({'error': 'workflow_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    workflow = get_object_or_404(Workflow, id=workflow_id)
    
    # Find chat trigger node
    chat_trigger = next((n for n in workflow.nodes if n['data']['type'] == 'when-chat-received'), None)
    if not chat_trigger:
        return Response({'error': 'Workflow does not have a chat trigger'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Execute workflow
    execution_id = str(uuid.uuid4())
    
    try:
        context = async_to_sync(execution_engine.execute_workflow)(
            workflow_id=str(workflow.id),
            execution_id=execution_id,
            nodes=workflow.nodes,
            edges=workflow.edges,
            trigger_data={
                'message': message,
                'user': user,
                'channel': channel,
                'timestamp': '',
            },
            credentials={}
        )
        
        # Save execution
        execution = WorkflowExecution.objects.create(
            workflow=workflow,
            status=context.status,
            started_at=context.start_time,
            finished_at=context.end_time,
            execution_order=context.execution_order,
            node_states=context.node_states,
            errors=context.errors,
            trigger_data={'message': message, 'user': user, 'channel': channel}
        )
        
        return Response({
            'execution_id': execution_id,
            'status': context.status,
            'chat_response': context.chat_response,
            'execution': context.to_dict()
        })
        
    except Exception as e:
        return Response({
            'error': str(e),
            'execution_id': execution_id
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])  # Allow AI chat without authentication
def ai_chat(request):
    """AI chatbot endpoint for general assistance"""
    request_start_time = time.time()
    print(f"\n🤖 AI Chat endpoint called with method: {request.method}")
    print(f"🤖 Request data: {request.data}")
    print(f"🤖 Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        data = request.data
        message = data.get('message', '')
        conversation_history = data.get('conversation_history', [])
        settings = data.get('settings', {})
        
        print(f"🤖 Message: {message}")
        print(f"🤖 Conversation history length: {len(conversation_history)}")
        print(f"🤖 Settings: {settings}")
        
        if not message:
            return Response({
                'error': 'message is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Use settings from request or fallback to environment variables
        api_key = settings.get('apiKey') or os.getenv('GROQ_API_KEY')
        model = settings.get('model') or 'llama-3.1-8b-instant'
        base_url = settings.get('baseUrl') or 'https://api.groq.com/openai/v1'
        provider = settings.get('llmProvider', 'groq')
        
        if not api_key:
            return Response({
                'response': 'Please configure your AI settings first. Go to Settings to set up your API key and model.',
                'timestamp': str(asyncio.get_event_loop().time())
            })
        
        try:
            # Import alith with error handling
            try:
                from alith import Agent, WindowBufferMemory
            except ImportError as e:
                print(f"🤖 Alith import error: {e}")
                return Response({
                    'error': 'AI service dependencies not available',
                    'response': 'The AI service is not properly configured. Please check the backend setup.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            # Create memory for conversation history
            memory = WindowBufferMemory(window_size=20)  # Keep last 20 messages
            
            # Add conversation history to memory (ensure proper alternation)
            if conversation_history:
                try:
                    # Process conversation history in order, ensuring alternation
                    for msg in conversation_history:
                        if isinstance(msg, dict) and 'role' in msg and 'content' in msg:
                            if msg['role'] == 'user':
                                memory.add_user_message(msg['content'])
                            elif msg['role'] == 'assistant':
                                memory.add_ai_message(msg['content'])
                except Exception as e:
                    print(f"🤖 Memory processing error: {e}")
                    # Continue without memory if there's an error
            
            # Create simple agent without tools
            try:
                agent = Agent(
                    name="workflow-assistant",
                    model=model,
                    api_key=api_key,
                    base_url=base_url,
                    memory=memory
                )
            except Exception as e:
                print(f"🤖 Agent creation error: {e}")
                return Response({
                    'error': f'Failed to create AI agent: {str(e)}',
                    'response': 'I apologize, but there was an error initializing the AI service. Please check your API key and try again.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            # Set simple preamble for the agent
            agent.preamble = """You are a helpful AI assistant for a workflow builder application. You can help users with:

- Creating and configuring workflows
- Understanding workflow concepts
- General questions about the platform
- Technical support and guidance

Be friendly, helpful, and provide clear, concise answers."""
            
            # Get AI response (memory is already loaded)
            try:
                print(f"🤖 Sending message to AI: {message[:50]}...")
                start_time = time.time()
                response = agent.prompt(message)
                end_time = time.time()
                execution_time = (end_time - start_time) * 1000  # Convert to milliseconds
                
                print(f"🤖 AI Response generated: {response[:100]}...")
                print(f"🤖 Response length: {len(response)} characters")
                print(f"🤖 Execution time: {execution_time:.2f}ms")
                
                total_request_time = (time.time() - request_start_time) * 1000
                print(f"🤖 Total request time: {total_request_time:.2f}ms")
                
                return Response({
                    'response': response,
                    'timestamp': str(time.time()),
                    'execution_time_ms': execution_time,
                    'total_request_time_ms': total_request_time
                })
            except Exception as e:
                total_request_time = (time.time() - request_start_time) * 1000
                print(f"🤖 Agent prompt error: {e}")
                print(f"🤖 Total request time (error): {total_request_time:.2f}ms")
                return Response({
                    'error': f'AI response generation failed: {str(e)}',
                    'response': 'I apologize, but I encountered an error while generating a response. Please try again or check your API key.',
                    'total_request_time_ms': total_request_time
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        except Exception as e:
            total_request_time = (time.time() - request_start_time) * 1000
            error_msg = str(e) if str(e) else 'Unknown error occurred'
            print(f"🤖 AI Service Exception: {error_msg}")
            print(f"🤖 Exception type: {type(e)}")
            print(f"🤖 Total request time (exception): {total_request_time:.2f}ms")
            return Response({
                'error': f'AI service unavailable: {error_msg}',
                'response': 'I apologize, but the AI service is currently unavailable. Please try again later.',
                'total_request_time_ms': total_request_time
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
    except Exception as e:
        total_request_time = (time.time() - request_start_time) * 1000
        error_msg = str(e) if str(e) else 'Unknown error occurred'
        print(f"🤖 Final exception: {error_msg}")
        print(f"🤖 Total request time (final error): {total_request_time:.2f}ms")
        return Response({
            'error': f'Chat request failed: {error_msg}',
            'total_request_time_ms': total_request_time
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST'])
def test_api_key(request):
    """Test API key validity for a specific node type"""
    print(f"🔍 Test API key endpoint called with method: {request.method}")
    print(f"🔍 Request data: {request.data}")
    
    # Handle GET requests for testing
    if request.method == 'GET':
        return Response({
            'message': 'Test API key endpoint is working',
            'method': request.method
        })
    
    try:
        data = request.data
        node_type = data.get('nodeType')
        api_key = data.get('apiKey')
        test_message = data.get('testMessage', 'Hello, this is a test message.')
        
        print(f"🔍 Backend received API key: {api_key[:20] if api_key else 'None'}... (length: {len(api_key) if api_key else 0})")
        print(f"🔍 Node type: {node_type}")
        print(f"🔍 Test message: {test_message}")
        
        if not node_type or not api_key:
            return Response({
                'error': 'nodeType and apiKey are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Test the API key based on node type
        if node_type in ['groq-llama', 'groq-gemma']:
            # Test Groq API
            try:
                from alith import Agent
                agent = Agent(
                    name="test-agent",
                    model="llama-3.1-8b-instant",
                    api_key=api_key,
                    base_url="https://api.groq.com/openai/v1"
                )
                response = agent.prompt(test_message)
                return Response({
                    'valid': True,
                    'message': 'Groq API key is valid',
                    'response': response[:100] + '...' if len(response) > 100 else response
                })
            except Exception as e:
                error_msg = str(e) if str(e) else 'Unknown error occurred'
                return Response({
                    'valid': False,
                    'error': f'Groq API key test failed: {error_msg}'
                })
        
        elif node_type in ['gpt-4-turbo', 'gpt-3.5-turbo']:
            # Test OpenAI API
            try:
                import openai
                client = openai.OpenAI(api_key=api_key)
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": test_message}],
                    max_tokens=50
                )
                return Response({
                    'valid': True,
                    'message': 'OpenAI API key is valid',
                    'response': response.choices[0].message.content
                })
            except Exception as e:
                error_msg = str(e) if str(e) else 'Unknown error occurred'
                return Response({
                    'valid': False,
                    'error': f'OpenAI API key test failed: {error_msg}'
                })
        
        elif node_type in ['claude-3-opus', 'claude-3-sonnet']:
            # Test Anthropic API
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=api_key)
                response = client.messages.create(
                    model="claude-3-sonnet-20240229",
                    max_tokens=50,
                    messages=[{"role": "user", "content": test_message}]
                )
                return Response({
                    'valid': True,
                    'message': 'Anthropic API key is valid',
                    'response': response.content[0].text
                })
            except Exception as e:
                error_msg = str(e) if str(e) else 'Unknown error occurred'
                return Response({
                    'valid': False,
                    'error': f'Anthropic API key test failed: {error_msg}'
                })
        
        else:
            return Response({
                'valid': False,
                'error': f'Unsupported node type: {node_type}'
            })
            
    except Exception as e:
        error_msg = str(e) if str(e) else 'Unknown error occurred'
        return Response({
            'valid': False,
            'error': f'API key test failed: {error_msg}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExportedWorkflowViewSet(viewsets.ModelViewSet):
    """ViewSet for ExportedWorkflow CRUD operations"""
    queryset = ExportedWorkflow.objects.all()
    serializer_class = ExportedWorkflowSerializer
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return ExportedWorkflowCreateSerializer
        elif self.action == 'list':
            return ExportedWorkflowListSerializer
        return ExportedWorkflowSerializer
    
    def get_queryset(self):
        """Filter queryset based on query parameters and user"""
        # Base queryset: user's own exports + public exports
        if self.request.user.is_authenticated:
            queryset = ExportedWorkflow.objects.filter(
                models.Q(user=self.request.user) | models.Q(is_public=True)
            )
        else:
            # Unauthenticated users can only see public exports
            queryset = ExportedWorkflow.objects.filter(is_public=True)
        
        # Filter by export type
        export_type = self.request.query_params.get('export_type')
        if export_type:
            queryset = queryset.filter(export_type=export_type)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by public status
        is_public = self.request.query_params.get('is_public')
        if is_public is not None:
            queryset = queryset.filter(is_public=is_public.lower() == 'true')
        
        # Filter by featured status
        is_featured = self.request.query_params.get('is_featured')
        if is_featured is not None:
            queryset = queryset.filter(is_featured=is_featured.lower() == 'true')
        
        # Search by name or description
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) | 
                models.Q(description__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        """Associate exported workflow with current user"""
        serializer.save(user=self.request.user if self.request.user.is_authenticated else None)
    
    @action(detail=True, methods=['post'])
    def download(self, request, pk=None):
        """Increment download count for exported workflow"""
        exported_workflow = self.get_object()
        exported_workflow.increment_download_count()
        
        # Return the workflow data for download
        serializer = ExportedWorkflowSerializer(exported_workflow)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def import_workflow(self, request, pk=None):
        """Import exported workflow and increment import count"""
        exported_workflow = self.get_object()
        exported_workflow.increment_import_count()
        
        # Return the workflow data for import
        serializer = ExportedWorkflowSerializer(exported_workflow)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get list of available categories"""
        categories = ExportedWorkflow.objects.values_list('category', flat=True).distinct()
        categories = [cat for cat in categories if cat]  # Remove empty categories
        return Response({'categories': categories})
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get export statistics"""
        total_exported = ExportedWorkflow.objects.count()
        total_downloads = ExportedWorkflow.objects.aggregate(
            total=models.Sum('download_count')
        )['total'] or 0
        total_imports = ExportedWorkflow.objects.aggregate(
            total=models.Sum('import_count')
        )['total'] or 0
        
        return Response({
            'total_exported': total_exported,
            'total_downloads': total_downloads,
            'total_imports': total_imports
        })


@api_view(['POST'])
def export_workflow(request):
    """Export workflow to the exported workflows database"""
    try:
        # Get workflow data from request
        workflow_data = request.data.copy()
        
        # Validate required fields
        required_fields = ['name', 'nodes', 'edges']
        for field in required_fields:
            if field not in workflow_data:
                return Response({
                    'error': f'Missing required field: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create exported workflow and associate with user
        serializer = ExportedWorkflowCreateSerializer(data=workflow_data)
        if serializer.is_valid():
            exported_workflow = serializer.save(user=request.user if request.user.is_authenticated else None)
            response_serializer = ExportedWorkflowSerializer(exported_workflow)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'error': f'Export failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_exported_workflow(request, workflow_id):
    """Get specific exported workflow by ID"""
    try:
        exported_workflow = get_object_or_404(ExportedWorkflow, id=workflow_id)
        
        # Check if user has access (owner or public)
        if not exported_workflow.is_public:
            if not request.user.is_authenticated or exported_workflow.user != request.user:
                return Response({
                    'error': 'You do not have permission to access this workflow'
                }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ExportedWorkflowSerializer(exported_workflow)
        return Response(serializer.data)
    except Exception as e:
        return Response({
            'error': f'Failed to get exported workflow: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Memory Management Endpoints
@api_view(['GET'])
def get_available_memory_types(request):
    """Get list of available memory types from Alith SDK"""
    try:
        memory_types = [
            {
                'id': 'window-buffer-memory',
                'name': 'Window Buffer Memory',
                'description': 'Maintains a sliding window of recent messages using Alith SDK',
                'category': 'Alith SDK',
                'features': ['Fast', 'Memory efficient', 'Real-time', 'Alith powered']
            },
            {
                'id': 'agent-flow-db-memory',
                'name': 'Agent Flow DB Memory',
                'description': 'Persistent memory storage using Django database - survives server restarts',
                'category': 'Database',
                'features': ['Persistent', 'Survives restarts', 'Scalable', 'Reliable']
            },
            {
                'id': 'simple-memory',
                'name': 'Simple Memory',
                'description': 'Simple memory storage for conversation context (legacy)',
                'category': 'Legacy',
                'features': ['Simple', 'Compatible', 'Easy to use']
            },
            {
                'id': 'vector-memory',
                'name': 'Vector Memory',
                'description': 'Store and retrieve information using vector embeddings (legacy)',
                'category': 'Legacy',
                'features': ['Vector search', 'Semantic matching', 'Scalable']
            }
        ]
        
        return Response({
            'memory_types': memory_types,
            'total': len(memory_types)
        })
        
    except Exception as e:
        return Response({
            'error': f'Failed to get memory types: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def test_memory_connection(request):
    """Test memory connection and configuration"""
    try:
        memory_type = request.data.get('memory_type')
        config = request.data.get('config', {})
        
        if not memory_type:
            return Response({
                'error': 'memory_type is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Test different memory types
        if memory_type == 'redis-memory':
            import redis
            redis_url = config.get('redisUrl', 'redis://localhost:6379')
            try:
                r = redis.from_url(redis_url)
                r.ping()
                return Response({
                    'valid': True,
                    'message': 'Redis connection successful'
                })
            except Exception as e:
                return Response({
                    'valid': False,
                    'error': f'Redis connection failed: {str(e)}'
                })
        
        elif memory_type == 'postgres-memory':
            import psycopg2
            connection_string = config.get('connectionString', 'postgresql://user:password@localhost:5432/memory')
            try:
                conn = psycopg2.connect(connection_string)
                conn.close()
                return Response({
                    'valid': True,
                    'message': 'PostgreSQL connection successful'
                })
            except Exception as e:
                return Response({
                    'valid': False,
                    'error': f'PostgreSQL connection failed: {str(e)}'
                })
        
        elif memory_type == 'mongodb-memory':
            import pymongo
            connection_string = config.get('connectionString', 'mongodb://localhost:27017')
            try:
                client = pymongo.MongoClient(connection_string)
                client.admin.command('ping')
                client.close()
                return Response({
                    'valid': True,
                    'message': 'MongoDB connection successful'
                })
            except Exception as e:
                return Response({
                    'valid': False,
                    'error': f'MongoDB connection failed: {str(e)}'
                })
        
        elif memory_type in ['window-buffer-memory', 'simple-memory', 'vector-memory', 'agent-flow-db-memory']:
            # These don't require external connections
            return Response({
                'valid': True,
                'message': f'{memory_type} configuration is valid'
            })
        
        else:
            return Response({
                'valid': False,
                'error': f'Unknown memory type: {memory_type}'
            })
            
    except Exception as e:
        return Response({
            'valid': False,
            'error': f'Memory test failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_memory_statistics(request):
    """Get memory usage statistics"""
    try:
        from .models import MemoryCollection, MemoryMessage
        
        # Filter by user if authenticated
        if request.user.is_authenticated:
            collections = MemoryCollection.objects.filter(user=request.user)
            messages = MemoryMessage.objects.filter(collection__user=request.user)
        else:
            collections = MemoryCollection.objects.none()
            messages = MemoryMessage.objects.none()
        
        stats = {
            'total_memories': collections.count(),
            'active_memories': collections.filter(updated_at__gte=models.F('created_at')).count(),
            'total_messages': messages.count(),
            'memory_types': {
                'window-buffer-memory': collections.filter(name__icontains='window').count(),
                'agent-flow-db-memory': collections.filter(name__icontains='db').count(),
                'simple-memory': collections.filter(name__icontains='simple').count(),
                'vector-memory': collections.filter(name__icontains='vector').count()
            },
            'storage_usage': {
                'total_size': f'{messages.count() * 0.001:.2f} MB',  # Rough estimate
                'conversation_data': f'{messages.count() * 0.001:.2f} MB',
                'window_buffer': f'{collections.count() * 0.01:.2f} MB',
                'database_memory': f'{collections.count() * 0.01:.2f} MB'
            }
        }
        
        return Response(stats)
        
    except Exception as e:
        return Response({
            'error': f'Failed to get memory statistics: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)