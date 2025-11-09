"""
Django REST Framework views for workflows
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
from django.db import models
import uuid
import asyncio
import os
import time
import logging
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

from .models import Workflow, WorkflowExecution, Credential, ExportedWorkflow, CustomWidget
from .serializers import (
    WorkflowSerializer,
    WorkflowExecutionSerializer,
    CredentialSerializer,
    ExecuteWorkflowSerializer,
    ExecuteNodeSerializer,
    ExportedWorkflowSerializer,
    ExportedWorkflowCreateSerializer,
    ExportedWorkflowListSerializer,
    CustomWidgetSerializer
)
from .execution_engine import execution_engine
from .dynamic_nodes import node_registry
from .dynamic_tools import tool_registry
from .custom_nodes import *  # Import to register custom nodes
from .custom_tools import *  # Import to register custom tools


class WorkflowViewSet(viewsets.ModelViewSet):
    """ViewSet for Workflow CRUD operations"""
    queryset = Workflow.objects.all()
    serializer_class = WorkflowSerializer
    authentication_classes = [JWTAuthentication, SessionAuthentication]  # JWT first, then session
    permission_classes = [IsAuthenticated]  # Require authentication
    
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
        # Initialize logger at the start
        import logging
        logger = logging.getLogger(__name__)
        
        workflow = self.get_object()
        serializer = ExecuteNodeSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        node_id = serializer.validated_data['node_id']
        trigger_data = serializer.validated_data.get('trigger_data', {})
        credentials = serializer.validated_data.get('credentials', {})
        
        # Refresh workflow from database to get latest properties
        workflow.refresh_from_db()
        
        # Check if node exists in workflow
        node = next((n for n in workflow.nodes if n['id'] == node_id), None)
        if not node:
            return Response({
                'error': f'Node {node_id} not found in workflow'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get node properties once
        node_properties = node.get('data', {}).get('properties', {})
        
        # If this is a webhook trigger node, check if test_json is in the node properties and use it
        # This takes priority over any existing trigger_data
        if node.get('data', {}).get('type') == 'webhook':
            test_json = node_properties.get('test_json', '')
            if test_json and test_json.strip():
                try:
                    import json
                    import time
                    test_body = json.loads(test_json)
                    # Prepare webhook trigger data with test JSON
                    trigger_data = {
                        'method': 'POST',
                        'path': node_properties.get('path', '/webhook'),
                        'headers': {},
                        'body': test_body,  # This is the actual test JSON data
                        'query_params': {},
                        'timestamp': time.time()
                    }
                    logger.info(f"✅ Using test_json from webhook node properties: {test_body}")
                except json.JSONDecodeError as e:
                    logger.warning(f"❌ Invalid test_json in webhook node properties: {e}")
            elif not trigger_data.get('body'):
                # If no test_json and no body in trigger_data, use default
                logger.info("⚠️ No test_json found in webhook properties, using default trigger data")
        
        # Log node properties for debugging
        logger.info(f"Executing node {node_id} with properties: {node_properties}")
        logger.info(f"user_message property: {node_properties.get('user_message', 'NOT FOUND')}")
        if node.get('data', {}).get('type') == 'webhook':
            test_json_value = node_properties.get('test_json', '')
            logger.info(f"test_json property present: {bool(test_json_value)}")
            logger.info(f"test_json length: {len(test_json_value) if test_json_value else 0}")
            logger.info(f"Final trigger_data body: {trigger_data.get('body', 'NOT SET')}")
        
        # Generate execution ID
        execution_id = str(uuid.uuid4())
        
        try:
            # If this is a trigger node, execute the full workflow
            # Otherwise, execute from this node forward through all downstream nodes
            node_type = node.get('data', {}).get('type', '')
            is_trigger_node = node_type in ['webhook', 'manual-trigger', 'when-chat-received', 'schedule']
            
            if is_trigger_node:
                # Execute full workflow from trigger
                context = async_to_sync(execution_engine.execute_workflow)(
                    workflow_id=str(workflow.id),
                    execution_id=execution_id,
                    nodes=workflow.nodes,
                    edges=workflow.edges,
                    trigger_data=trigger_data,
                    credentials=credentials,
                    start_node_id=None  # Execute full workflow
                )
            else:
                # Execute from this node forward through all downstream nodes
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
    authentication_classes = [JWTAuthentication, SessionAuthentication]  # JWT first, then session
    permission_classes = [IsAuthenticated]  # Require authentication
    
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
    authentication_classes = [JWTAuthentication, SessionAuthentication]  # JWT first, then session
    permission_classes = [IsAuthenticated]  # Require authentication
    
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


@csrf_exempt
@api_view(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])  # Webhooks should be accessible without authentication
def trigger_webhook(request, workflow_id: str, webhook_path: str = ''):
    """
    Webhook endpoint to trigger workflows
    
    URL pattern: /api/workflows/{workflow_id}/webhook/{path}/
    Supports all HTTP methods (GET, POST, PUT, PATCH, DELETE)
    """
    try:
        workflow = get_object_or_404(Workflow, id=workflow_id)
        
        # Find webhook trigger node matching the path
        webhook_trigger = None
        for node in workflow.nodes:
            if node.get('data', {}).get('type') == 'webhook':
                node_path = node.get('data', {}).get('properties', {}).get('path', '').lstrip('/')
                node_methods = node.get('data', {}).get('properties', {}).get('method', ['POST'])
                if isinstance(node_methods, list):
                    node_methods = node_methods
                else:
                    node_methods = [node_methods] if node_methods else ['POST']
                
                # Check if path matches and method is allowed
                if node_path == webhook_path.lstrip('/') and request.method in node_methods:
                    webhook_trigger = node
                    break
        
        if not webhook_trigger:
            return Response({
                'error': f'Webhook trigger not found for path "{webhook_path}" and method "{request.method}"'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Extract request data
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                request_data = request.data if hasattr(request, 'data') else {}
            except:
                request_data = {}
        else:
            request_data = dict(request.GET)
        
        # Execute workflow
        execution_id = str(uuid.uuid4())
        
        logger.info(f"🚀 Executing workflow {workflow_id} via webhook trigger")
        logger.info(f"   Path: {webhook_path}, Method: {request.method}")
        logger.info(f"   Nodes: {len(workflow.nodes)}, Edges: {len(workflow.edges)}")
        logger.info(f"   Request data: {request_data}")
        
        try:
            # Prepare trigger data
            trigger_data = {
                'method': request.method,
                'path': webhook_path,
                'headers': dict(request.headers),
                'body': request_data,
                'query_params': dict(request.GET),
                'timestamp': time.time()
            }
            
            logger.info(f"📋 Trigger data prepared: {trigger_data}")
            
            # Execute workflow - THIS IS THE CRITICAL STEP
            context = async_to_sync(execution_engine.execute_workflow)(
                workflow_id=str(workflow.id),
                execution_id=execution_id,
                nodes=workflow.nodes,
                edges=workflow.edges,
                trigger_data=trigger_data,
                credentials={}
            )
            
            logger.info(f"✅ Workflow execution completed: {context.status}")
            logger.info(f"   Executed {len(context.execution_order)} nodes: {context.execution_order}")
            logger.info(f"   Node states: {list(context.node_states.keys())}")
            logger.info(f"   Node results: {list(context.node_results.keys())}")
            
            # Log each node's execution status
            for node_id, node_state in context.node_states.items():
                logger.info(f"   Node {node_id}: status={node_state.get('status')}, has_output={node_state.get('output') is not None}")
            
            if context.errors:
                logger.warning(f"⚠️ Workflow execution had errors: {context.errors}")
            
            # Save execution
            execution = WorkflowExecution.objects.create(
                workflow=workflow,
                status=context.status,
                started_at=context.start_time,
                finished_at=context.end_time,
                execution_order=context.execution_order,
                node_states=context.node_states,
                errors=context.errors,
                trigger_data={
                    'method': request.method,
                    'path': webhook_path,
                    'body': request_data
                }
            )
            
            # Return response from workflow execution
            # Check if workflow has a response in the output
            response_data = context.node_states.get('output', {})
            if isinstance(response_data, dict) and 'main' in response_data:
                response_data = response_data['main']
            
            # Prepare enhanced execution dict with node outputs
            # This ensures node_states always include outputs, even if no listeners
            enhanced_node_states = {}
            for node_id, node_state in context.node_states.items():
                # Get output from node_state first, then fallback to node_results
                node_output = node_state.get('output')
                if not node_output:
                    node_output = context.node_results.get(node_id)
                
                enhanced_node_states[node_id] = {
                    **node_state,
                    'output': node_output  # Ensure output is always included
                }
                
                logger.info(f"   Node {node_id}: status={node_state.get('status')}, has_output={node_output is not None}, output_type={type(node_output).__name__}")
            
            execution_dict = context.to_dict()
            execution_dict['node_states'] = enhanced_node_states  # Replace with enhanced states
            
            # Check if there's an active listener for this workflow and broadcast event
            # IMPORTANT: Do this AFTER workflow execution succeeds, but don't fail if it errors
            try:
                from .webhook_listener import get_workflow_listeners, record_webhook_request, should_process_request, active_listeners
                
                # Debug: Log all active listeners
                logger.info(f"Total active listeners: {len(active_listeners)}")
                for lid, linfo in active_listeners.items():
                    logger.info(f"  Listener {lid}: workflow_id={linfo['workflow_id']}, status={linfo['status']}, user_id={linfo['user_id']}")
                
                # Find active listeners for this workflow (by workflow_id, not user_id)
                # This works even for unauthenticated webhook requests
                workflow_id_str = str(workflow.id)
                workflow_listeners = get_workflow_listeners(workflow_id_str)
                
                logger.info(f"Looking for listeners for workflow {workflow_id_str}, found {len(workflow_listeners)} listeners")
                
                # Ensure execution_dict has all required fields for frontend
                execution_dict['node_results'] = context.node_results  # Ensure node_results is included
                execution_dict['node_states'] = enhanced_node_states  # Use enhanced states with outputs
                execution_dict['execution_order'] = context.execution_order
                execution_dict['started_at'] = context.start_time.isoformat()
                execution_dict['finished_at'] = context.end_time.isoformat() if context.end_time else None
                
                # Use the already-prepared enhanced_node_states and execution_dict
                execution_result = {
                    'execution_id': execution_id,
                    'status': context.status,
                    'data': response_data,
                    'execution': execution_dict,
                    'node_states': enhanced_node_states,  # Direct access for frontend
                    'node_results': context.node_results,  # Direct access for frontend
                    'execution_order': context.execution_order
                }
                
                logger.info(f"📤 Broadcasting execution result to {len(workflow_listeners)} listeners")
                logger.info(f"   Execution has {len(enhanced_node_states)} node states with outputs")
                logger.info(f"   Node IDs in execution: {list(enhanced_node_states.keys())}")
                logger.info(f"   Execution order: {context.execution_order}")
                
                for listener_info in workflow_listeners:
                    listener_id = listener_info['listener_id']
                    if should_process_request(listener_id):
                        logger.info(f"📡 Broadcasting webhook request to listener {listener_id} (status: {listener_info['status']})")
                        try:
                            record_webhook_request(
                                listener_id,
                                {
                                    'method': request.method,
                                    'path': webhook_path,
                                    'headers': dict(request.headers),
                                    'body': request_data,
                                    'query_params': dict(request.GET),
                                    'timestamp': time.time()
                                },
                                execution_result
                            )
                            logger.info(f"✅ Successfully broadcasted to listener {listener_id}")
                        except Exception as broadcast_error:
                            logger.error(f"❌ Error broadcasting to listener {listener_id}: {broadcast_error}", exc_info=True)
                    else:
                        logger.info(f"⏸️ Skipping listener {listener_id} (status: {listener_info['status']}, not running)")
            except Exception as e:
                # Don't fail the webhook if listener broadcasting fails
                logger.error(f"❌ Error in listener broadcasting logic: {e}", exc_info=True)
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Return response with enhanced execution dict (always includes node outputs)
            return Response({
                'execution_id': execution_id,
                'status': context.status,
                'data': response_data,
                'execution': execution_dict
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Error executing webhook workflow: {e}", exc_info=True)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({
                'error': str(e),
                'execution_id': execution_id,
                'traceback': traceback.format_exc() if os.getenv('DEBUG') == 'True' else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"Error in webhook trigger: {e}")
        return Response({
            'error': f'Internal error: {str(e)}'
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
@authentication_classes([])  # Disable authentication (and CSRF requirement) for this endpoint
@permission_classes([AllowAny])  # Allow testing API keys without authentication
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
                    'status': 'active',
                    'message': 'Groq API key is valid',
                    'response': response[:100] + '...' if len(response) > 100 else response
                })
            except Exception as e:
                error_msg = str(e) if str(e) else 'Unknown error occurred'
                return Response({
                    'valid': False,
                    'status': 'inactive',
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
        
        elif node_type in ['sentiment-analysis', 'text-classifier']:
            # These nodes support both OpenAI and Groq API keys
            # Detect API key type and test accordingly
            if api_key.startswith('gsk_'):
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
                        'status': 'active',
                        'message': 'Groq API key is valid',
                        'response': response[:100] + '...' if len(response) > 100 else response
                    })
                except Exception as e:
                    error_msg = str(e) if str(e) else 'Unknown error occurred'
                    return Response({
                        'valid': False,
                        'status': 'inactive',
                        'error': f'Groq API key test failed: {error_msg}'
                    })
            else:
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
    authentication_classes = [JWTAuthentication, SessionAuthentication]  # JWT first, then session
    
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


@api_view(['POST'])
@authentication_classes([])  # Disable authentication (and CSRF requirement) for this endpoint
@permission_classes([AllowAny])  # Allow saving widgets without authentication
def save_custom_widget(request):
    """Save a custom widget to the database"""
    try:
        data = request.data
        name = data.get('name')
        html_content = data.get('html_content', '')
        css_content = data.get('css_content', '')
        js_content = data.get('js_content', '')
        block_id = data.get('block_id')
        
        if not name or not html_content or not block_id:
            return Response({
                'error': 'name, html_content, and block_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if widget with this block_id already exists for this user
        # Try to get authenticated user, otherwise use None
        user = None
        try:
            # Try JWT authentication first
            from rest_framework_simplejwt.authentication import JWTAuthentication
            jwt_auth = JWTAuthentication()
            try:
                auth_user, token = jwt_auth.authenticate(request)
                if auth_user:
                    user = auth_user
            except Exception:
                pass
            
            # Fallback to session authentication
            if not user and request.user.is_authenticated:
                user = request.user
        except Exception:
            pass
        
        # Check for existing widget with this block_id for this user (or anonymous)
        existing_widget = CustomWidget.objects.filter(
            user=user,
            block_id=block_id
        ).first()
        
        if existing_widget:
            # Update existing widget
            existing_widget.name = name
            existing_widget.html_content = html_content
            existing_widget.css_content = css_content
            existing_widget.js_content = js_content
            existing_widget.save()
            serializer = CustomWidgetSerializer(existing_widget)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            # Create new widget
            widget = CustomWidget.objects.create(
                user=user,
                name=name,
                html_content=html_content,
                css_content=css_content,
                js_content=js_content,
                block_id=block_id
            )
            serializer = CustomWidgetSerializer(widget)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        return Response({
            'error': f'Failed to save widget: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])  # Allow getting widgets without authentication
def get_custom_widgets(request):
    """Get all custom widgets for the current user"""
    try:
        # Try to get authenticated user (JWT or session)
        user = None
        try:
            # Try JWT authentication first
            from rest_framework_simplejwt.authentication import JWTAuthentication
            jwt_auth = JWTAuthentication()
            try:
                auth_user, token = jwt_auth.authenticate(request)
                if auth_user:
                    user = auth_user
            except Exception:
                pass
            
            # Fallback to session authentication
            if not user and request.user.is_authenticated:
                user = request.user
        except Exception:
            pass
        
        if user:
            # Return widgets for authenticated user AND anonymous widgets
            # This allows authenticated users to see their own widgets plus any anonymous widgets
            widgets = CustomWidget.objects.filter(
                models.Q(user=user) | models.Q(user=None)
            )
        else:
            # Return anonymous widgets (user=None) for unauthenticated users
            widgets = CustomWidget.objects.filter(user=None)
        
        serializer = CustomWidgetSerializer(widgets, many=True)
        print(f"📦 Returning {len(serializer.data)} widget(s) for user: {user.username if user else 'Anonymous'}")
        return Response({
            'widgets': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ Error getting widgets: {str(e)}")
        return Response({
            'error': f'Failed to get widgets: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@authentication_classes([])  # Disable authentication (and CSRF requirement) for this endpoint
@permission_classes([AllowAny])  # Allow deleting widgets without authentication
def delete_custom_widget(request, widget_id):
    """Delete a custom widget"""
    try:
        widget = get_object_or_404(CustomWidget, id=widget_id)
        
        # Security check: 
        # - If widget belongs to a user, only that user can delete it
        # - If widget is anonymous (user=None), anyone can delete it
        if widget.user is not None:
            # Widget belongs to a user - require authentication and ownership
            if not request.user.is_authenticated:
                return Response({
                    'error': 'Authentication required to delete this widget'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if widget.user != request.user:
                return Response({
                    'error': 'You do not have permission to delete this widget'
                }, status=status.HTTP_403_FORBIDDEN)
        
        widget.delete()
        return Response({
            'message': 'Widget deleted successfully'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to delete widget: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])  # Allow access without authentication
def get_dynamic_nodes(request):
    """Get all dynamically registered nodes"""
    try:
        nodes = node_registry.to_frontend_format()
        return Response({
            'nodes': nodes,
            'count': len(nodes)
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': f'Failed to get dynamic nodes: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_dynamic_tools(request):
    """Get all dynamically registered tools"""
    try:
        tools = tool_registry.to_frontend_format()
        return Response({
            'tools': tools,
            'count': len(tools)
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': f'Failed to get dynamic tools: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([AllowAny])  # Allow access without authentication for now
def get_node_execution_data(request):
    """Get execution data for a specific node (for VariablesPanel)"""
    try:
        workflow_id = request.data.get('workflow_id')
        node_id = request.data.get('node_id')
        
        if not workflow_id or not node_id:
            return Response({
                'error': 'workflow_id and node_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get workflow
        workflow = get_object_or_404(Workflow, id=workflow_id, user=request.user)
        
        # Find the node
        node = next((n for n in workflow.nodes if n['id'] == node_id), None)
        if not node:
            return Response({
                'error': f'Node {node_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get all previous nodes (nodes that connect to this node)
        previous_nodes = []
        for edge in workflow.edges:
            if edge['target'] == node_id:
                source_node = next((n for n in workflow.nodes if n['id'] == edge['source']), None)
                if source_node:
                    previous_nodes.append(source_node['id'])
        
        # Get execution results for previous nodes
        # Check latest execution
        latest_execution = WorkflowExecution.objects.filter(
            workflow=workflow
        ).order_by('-started_at').first()
        
        if not latest_execution:
            return Response({
                'data': None,
                'has_data': False,
                'previous_nodes': previous_nodes
            }, status=status.HTTP_200_OK)
        
        # Get results from previous nodes
        node_results = {}
        for prev_node_id in previous_nodes:
            node_state = latest_execution.node_states.get(prev_node_id, {})
            if node_state.get('output'):
                node_results[prev_node_id] = node_state['output']
        
        # Get main input data (from first previous node or trigger)
        main_data = None
        if previous_nodes:
            first_prev = previous_nodes[0]
            if first_prev in node_results:
                result = node_results[first_prev]
                if isinstance(result, dict) and 'main' in result:
                    main_data = result['main']
                else:
                    main_data = result
        
        return Response({
            'data': main_data,
            'has_data': main_data is not None,
            'previous_nodes': previous_nodes,
            'node_results': node_results,
            'execution_id': str(latest_execution.id)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to get node execution data: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([])  # Allow without authentication for now
@permission_classes([AllowAny])  # Allow access without authentication
def generate_ui_code(request):
    """Generate UI code using AI based on description or existing HTML"""
    try:
        data = request.data
        mode = data.get('mode', 'generate')  # 'generate' or 'edit'
        description = data.get('description', '')
        existing_html = data.get('existing_html', '')
        existing_css = data.get('existing_css', '')
        existing_js = data.get('existing_js', '')
        settings = data.get('settings', {})
        
        # Use settings from request or fallback to environment variables
        api_key = settings.get('apiKey') or os.getenv('GROQ_API_KEY')
        model = settings.get('model') or 'llama-3.1-8b-instant'
        base_url = settings.get('baseUrl') or 'https://api.groq.com/openai/v1'
        
        if not api_key:
            return Response({
                'error': 'API key is required. Please configure your AI settings.',
                'html': '',
                'css': '',
                'js': ''
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from alith import Agent
        except ImportError:
            return Response({
                'error': 'AI service dependencies not available',
                'html': '',
                'css': '',
                'js': ''
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # Create agent
        try:
            agent = Agent(
                name="ui-code-generator",
                model=model,
                api_key=api_key,
                base_url=base_url
            )
        except Exception as e:
            return Response({
                'error': f'Failed to create AI agent: {str(e)}',
                'html': '',
                'css': '',
                'js': ''
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # Build prompt based on mode
        if mode == 'edit':
            # Edit existing code
            prompt = f"""You are an expert web developer. Edit the following HTML/CSS/JS code based on the user's description.

User's request: {description}

Current HTML:
{existing_html}

Current CSS:
{existing_css}

Current JS:
{existing_js}

Please provide:
1. Updated HTML code (only the HTML, no explanations)
2. Updated CSS code (only the CSS, no explanations)
3. Updated JS code (only the JavaScript, no explanations)

Format your response as:
HTML:
[your HTML code here]

CSS:
[your CSS code here]

JS:
[your JavaScript code here]

Make sure to:
- Use Tailwind CSS classes for styling
- Keep the code clean and well-structured
- Maintain semantic HTML
- Ensure responsive design
- Only return the code, no markdown formatting or code blocks"""
        else:
            # Generate new code
            prompt = f"""You are an expert web developer. Generate modern, responsive HTML/CSS/JS code based on the following description.

Description: {description}

Please provide:
1. HTML code (only the HTML, no explanations)
2. CSS code (only the CSS, no explanations)
3. JavaScript code (only the JavaScript, no explanations)

Format your response as:
HTML:
[your HTML code here]

CSS:
[your CSS code here]

JS:
[your JavaScript code here]

Requirements:
- Use Tailwind CSS classes for styling (via CDN: https://cdn.tailwindcss.com)
- Create modern, responsive design
- Use semantic HTML5 elements
- Ensure accessibility
- Make it visually appealing
- Only return the code, no markdown formatting or code blocks"""
        
        try:
            # Get AI response
            response = agent.prompt(prompt)
            
            # Parse response to extract HTML, CSS, and JS
            html_code = ''
            css_code = ''
            js_code = ''
            
            # Try to parse the response - improved parsing
            lines = response.split('\n')
            current_section = None
            current_code = []
            
            for line in lines:
                line_stripped = line.strip()
                line_lower = line_stripped.lower()
                
                # Check for section headers (more flexible matching)
                if line_lower.startswith('html:') or line_lower == 'html':
                    # Save previous section if exists
                    if current_section and current_code:
                        code_text = '\n'.join(current_code).strip()
                        if current_section == 'html':
                            html_code = code_text
                        elif current_section == 'css':
                            css_code = code_text
                        elif current_section == 'js':
                            js_code = code_text
                    # Start new HTML section
                    current_section = 'html'
                    current_code = []
                    # Skip the header line itself
                    continue
                elif line_lower.startswith('css:') or line_lower == 'css':
                    # Save previous section if exists
                    if current_section and current_code:
                        code_text = '\n'.join(current_code).strip()
                        if current_section == 'html':
                            html_code = code_text
                        elif current_section == 'css':
                            css_code = code_text
                        elif current_section == 'js':
                            js_code = code_text
                    # Start new CSS section
                    current_section = 'css'
                    current_code = []
                    # Skip the header line itself
                    continue
                elif line_lower.startswith('js:') or line_lower.startswith('javascript:') or line_lower == 'js' or line_lower == 'javascript':
                    # Save previous section if exists
                    if current_section and current_code:
                        code_text = '\n'.join(current_code).strip()
                        if current_section == 'html':
                            html_code = code_text
                        elif current_section == 'css':
                            css_code = code_text
                        elif current_section == 'js':
                            js_code = code_text
                    # Start new JS section
                    current_section = 'js'
                    current_code = []
                    # Skip the header line itself
                    continue
                elif current_section:
                    # Add line to current section (only if we're in a section)
                    current_code.append(line)
            
            # Handle last section
            if current_section and current_code:
                code_text = '\n'.join(current_code).strip()
                if current_section == 'html':
                    html_code = code_text
                elif current_section == 'css':
                    css_code = code_text
                elif current_section == 'js':
                    js_code = code_text
            
            # If parsing failed, try to extract from code blocks
            if not html_code and not css_code and not js_code:
                import re
                # Try to find code blocks
                html_match = re.search(r'```html\s*\n(.*?)\n```', response, re.DOTALL)
                css_match = re.search(r'```css\s*\n(.*?)\n```', response, re.DOTALL)
                js_match = re.search(r'```(?:js|javascript)\s*\n(.*?)\n```', response, re.DOTALL)
                
                if html_match:
                    html_code = html_match.group(1).strip()
                if css_match:
                    css_code = css_match.group(1).strip()
                if js_match:
                    js_code = js_match.group(1).strip()
            
            # If still no code, use the entire response as HTML
            if not html_code and not css_code and not js_code:
                html_code = response.strip()
            
            return Response({
                'html': html_code,
                'css': css_code,
                'js': js_code,
                'raw_response': response
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'AI response generation failed: {str(e)}',
                'html': '',
                'css': '',
                'js': ''
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
    except Exception as e:
        return Response({
            'error': f'Code generation failed: {str(e)}',
            'html': '',
            'css': '',
            'js': ''
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)