"""
n8n Integration Views for FlowPages
Enables UI components to trigger n8n workflows and receive real-time updates
"""
import uuid
import hmac
import hashlib
import json
import time
from typing import Dict, Any, Optional
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
import requests
import logging

from .models import Workflow, WorkflowExecution
from django.shortcuts import get_object_or_404

logger = logging.getLogger(__name__)

# In-memory store for active workflow runs (use Redis in production)
active_runs: Dict[str, Dict[str, Any]] = {}

# Store for SSE connections (use proper channels in production)
sse_connections: Dict[str, list] = {}


def generate_signature(payload: str, secret: str) -> str:
    """Generate HMAC signature for n8n webhook authentication"""
    return hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def run_n8n_workflow(request):
    """
    Trigger an n8n workflow from a UI component
    
    Request body:
    {
        "webhook_url": "https://n8n.example.com/webhook/flows/hot-lead",
        "workflow_id": "optional-workflow-id-for-tracking",
        "data": {
            "formData": {...},
            "userContext": {...},
            "componentId": "button-123"
        },
        "secret": "optional-shared-secret-for-hmac",
        "wait_for_result": false  // If true, waits for callback
    }
    """
    try:
        webhook_url = request.data.get('webhook_url')
        workflow_id = request.data.get('workflow_id')
        payload_data = request.data.get('data', {})
        secret = request.data.get('secret', '')
        wait_for_result = request.data.get('wait_for_result', False)
        
        if not webhook_url:
            return Response({
                'error': 'webhook_url is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate run ID for tracking
        run_id = str(uuid.uuid4())
        
        # Prepare payload
        payload = {
            'runId': run_id,
            'workflowId': workflow_id or 'unknown',
            'timestamp': time.time(),
            'userContext': {
                'userId': str(request.user.id) if request.user.is_authenticated else None,
                'username': request.user.username if request.user.is_authenticated else 'anonymous'
            },
            **payload_data
        }
        
        # Prepare headers
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'FlowPages/1.0'
        }
        
        # Add HMAC signature if secret provided
        if secret:
            payload_str = json.dumps(payload, sort_keys=True)
            signature = generate_signature(payload_str, secret)
            headers['X-Signature'] = f'sha256={signature}'
        
        # Store run info for tracking
        active_runs[run_id] = {
            'run_id': run_id,
            'workflow_id': workflow_id,
            'webhook_url': webhook_url,
            'user_id': request.user.id if request.user.is_authenticated else None,
            'status': 'pending',
            'started_at': time.time(),
            'data': payload_data,
            'wait_for_result': wait_for_result
        }
        
        # Make request to n8n webhook
        try:
            response = requests.post(
                webhook_url,
                json=payload,
                headers=headers,
                timeout=30 if wait_for_result else 5
            )
            
            # Update run status
            if response.status_code == 200:
                active_runs[run_id]['status'] = 'accepted'
                active_runs[run_id]['response'] = response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
                
                # If wait_for_result is False, return immediately
                if not wait_for_result:
                    return Response({
                        'run_id': run_id,
                        'status': 'accepted',
                        'message': 'Workflow triggered successfully',
                        'response': active_runs[run_id].get('response')
                    }, status=status.HTTP_200_OK)
            else:
                active_runs[run_id]['status'] = 'error'
                active_runs[run_id]['error'] = f'n8n returned status {response.status_code}'
                
                return Response({
                    'run_id': run_id,
                    'status': 'error',
                    'error': f'n8n webhook returned status {response.status_code}',
                    'response': response.text[:500]
                }, status=status.HTTP_502_BAD_GATEWAY)
                
        except requests.exceptions.Timeout:
            active_runs[run_id]['status'] = 'timeout'
            return Response({
                'run_id': run_id,
                'status': 'timeout',
                'message': 'n8n webhook did not respond in time, but workflow may still be processing'
            }, status=status.HTTP_202_ACCEPTED)
            
        except requests.exceptions.RequestException as e:
            active_runs[run_id]['status'] = 'error'
            active_runs[run_id]['error'] = str(e)
            logger.error(f"Error calling n8n webhook: {e}")
            
            return Response({
                'run_id': run_id,
                'status': 'error',
                'error': f'Failed to reach n8n webhook: {str(e)}'
            }, status=status.HTTP_502_BAD_GATEWAY)
        
        # If we get here and wait_for_result is True, we should wait for callback
        # For now, return accepted status
        return Response({
            'run_id': run_id,
            'status': 'accepted',
            'message': 'Workflow triggered, waiting for completion...'
        }, status=status.HTTP_202_ACCEPTED)
        
    except Exception as e:
        logger.error(f"Error in run_n8n_workflow: {e}")
        return Response({
            'error': f'Internal error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])  # n8n will call this, so we need to allow it
def flow_updates(request):
    """
    Receive updates from n8n workflows (callback endpoint)
    
    This endpoint is called by n8n HTTP Request nodes to send progress updates
    
    Request body:
    {
        "runId": "uuid",
        "step": "step-name",
        "state": "progress|done|error",
        "data": {...},
        "message": "optional message"
    }
    """
    try:
        run_id = request.data.get('runId')
        step = request.data.get('step', 'unknown')
        state = request.data.get('state', 'progress')
        data = request.data.get('data', {})
        message = request.data.get('message', '')
        
        if not run_id:
            return Response({
                'error': 'runId is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update run info
        if run_id in active_runs:
            active_runs[run_id]['status'] = state
            active_runs[run_id]['last_update'] = time.time()
            active_runs[run_id]['last_step'] = step
            active_runs[run_id]['last_data'] = data
            active_runs[run_id]['last_message'] = message
            
            # If done or error, mark finished
            if state in ['done', 'error']:
                active_runs[run_id]['finished_at'] = time.time()
        
        # Broadcast to SSE connections
        broadcast_sse_update(run_id, {
            'runId': run_id,
            'step': step,
            'state': state,
            'data': data,
            'message': message,
            'timestamp': time.time()
        })
        
        return Response({
            'status': 'received',
            'runId': run_id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in flow_updates: {e}")
        return Response({
            'error': f'Internal error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def broadcast_sse_update(run_id: str, update: Dict[str, Any]):
    """Broadcast update to all SSE connections for this run"""
    if run_id in sse_connections:
        # Remove closed connections
        sse_connections[run_id] = [
            conn for conn in sse_connections[run_id]
            if not conn.get('closed', False)
        ]
        
        # Send update to all connections
        for conn_info in sse_connections[run_id]:
            try:
                conn_info['queue'].put(update)
            except Exception as e:
                logger.warning(f"Error broadcasting to SSE connection: {e}")
                conn_info['closed'] = True


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def workflow_status(request, run_id: str):
    """Get status of a workflow run"""
    if run_id not in active_runs:
        return Response({
            'error': 'Run ID not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    run_info = active_runs[run_id]
    
    # Check if user has access
    if run_info.get('user_id') and request.user.id != run_info['user_id']:
        return Response({
            'error': 'Access denied'
        }, status=status.HTTP_403_FORBIDDEN)
    
    return Response({
        'run_id': run_id,
        'status': run_info.get('status', 'unknown'),
        'started_at': run_info.get('started_at'),
        'finished_at': run_info.get('finished_at'),
        'last_step': run_info.get('last_step'),
        'last_data': run_info.get('last_data'),
        'last_message': run_info.get('last_message'),
        'response': run_info.get('response')
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def workflow_updates_stream(request, run_id: str):
    """
    Server-Sent Events (SSE) stream for real-time workflow updates
    
    Usage: GET /api/n8n/workflows/{run_id}/stream/
    """
    import queue
    
    # Verify run exists and user has access
    if run_id not in active_runs:
        return Response({
            'error': 'Run ID not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    run_info = active_runs[run_id]
    if run_info.get('user_id') and request.user.id != run_info['user_id']:
        return Response({
            'error': 'Access denied'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Create queue for this connection
    update_queue = queue.Queue()
    
    # Register connection
    if run_id not in sse_connections:
        sse_connections[run_id] = []
    
    conn_info = {
        'queue': update_queue,
        'closed': False,
        'user_id': request.user.id
    }
    sse_connections[run_id].append(conn_info)
    
    def event_stream():
        """Generator for SSE events"""
        try:
            # Send initial status
            yield f"data: {json.dumps({'type': 'connected', 'runId': run_id})}\n\n"
            
            # Send current status if available
            if run_info.get('last_data'):
                yield f"data: {json.dumps({
                    'type': 'status',
                    'runId': run_id,
                    'status': run_info.get('status'),
                    'data': run_info.get('last_data')
                })}\n\n"
            
            # Keep connection alive and send updates
            while True:
                try:
                    # Wait for update with timeout
                    update = update_queue.get(timeout=30)
                    yield f"data: {json.dumps(update)}\n\n"
                    
                    # If workflow is done, close connection
                    if update.get('state') in ['done', 'error']:
                        break
                        
                except queue.Empty:
                    # Send heartbeat
                    yield f": heartbeat\n\n"
                    continue
                    
        except GeneratorExit:
            pass
        finally:
            # Clean up connection
            conn_info['closed'] = True
            if run_id in sse_connections:
                sse_connections[run_id] = [
                    conn for conn in sse_connections[run_id]
                    if conn != conn_info
                ]
    
    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'  # Disable buffering in nginx
    return response


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def list_workflow_runs(request):
    """List all workflow runs for the current user"""
    user_runs = [
        {
            'run_id': run_id,
            'workflow_id': run_info.get('workflow_id'),
            'status': run_info.get('status'),
            'started_at': run_info.get('started_at'),
            'finished_at': run_info.get('finished_at'),
            'last_step': run_info.get('last_step')
        }
        for run_id, run_info in active_runs.items()
        if run_info.get('user_id') == request.user.id
    ]
    
    # Sort by started_at descending
    user_runs.sort(key=lambda x: x.get('started_at', 0), reverse=True)
    
    return Response({
        'runs': user_runs,
        'count': len(user_runs)
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_webhook_url(request, workflow_id: str):
    """
    Get webhook URL for a workflow
    
    Returns the webhook URL that can be used to trigger this workflow
    """
    try:
        workflow = get_object_or_404(Workflow, id=workflow_id)
        
        # Check if user has access
        if workflow.user and workflow.user != request.user:
            return Response({
                'error': 'Access denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get webhook path from workflow nodes
        webhook_path = None
        webhook_method = 'POST'
        
        for node in workflow.nodes:
            if node.get('data', {}).get('type') == 'webhook':
                webhook_path = node.get('data', {}).get('properties', {}).get('path', '')
                webhook_method = node.get('data', {}).get('properties', {}).get('method', ['POST'])[0] if isinstance(node.get('data', {}).get('properties', {}).get('method'), list) else 'POST'
                break
        
        if not webhook_path:
            return Response({
                'error': 'This workflow does not have a webhook trigger',
                'webhook_url': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get base URL from request
        scheme = request.scheme  # http or https
        host = request.get_host()  # domain:port
        
        # Construct webhook URL
        base_url = f"{scheme}://{host}"
        webhook_url = f"{base_url}/api/workflows/{workflow_id}/webhook/{webhook_path.lstrip('/')}"
        
        return Response({
            'webhook_url': webhook_url,
            'webhook_path': webhook_path,
            'method': webhook_method,
            'workflow_id': str(workflow_id),
            'workflow_name': workflow.name,
            'base_url': base_url
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting webhook URL: {e}")
        return Response({
            'error': f'Failed to get webhook URL: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_base_url(request):
    """Get the base URL of the backend server"""
    scheme = request.scheme
    host = request.get_host()
    base_url = f"{scheme}://{host}"
    
    return Response({
        'base_url': base_url,
        'api_base_url': f"{base_url}/api"
    }, status=status.HTTP_200_OK)

