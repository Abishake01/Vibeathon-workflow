"""
Views for Webhook Listener Management
Allows starting/stopping webhook listeners and receiving real-time updates
"""
import json
import time
import queue
from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404
import logging

from .models import Workflow
from .webhook_listener import (
    create_listener, get_listener, pause_listener, resume_listener,
    stop_listener, delete_listener, get_user_listeners, broadcast_listener_event
)

logger = logging.getLogger(__name__)


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def start_webhook_listener(request, workflow_id: str):
    """Start listening for webhook requests"""
    try:
        workflow = get_object_or_404(Workflow, id=workflow_id)
        
        # Check if workflow has a webhook trigger
        has_webhook = any(
            node.get('data', {}).get('type') == 'webhook'
            for node in workflow.nodes
        )
        
        if not has_webhook:
            return Response({
                'error': 'This workflow does not have a webhook trigger node'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create listener
        listener_id = create_listener(str(workflow.id), request.user.id)
        
        return Response({
            'listener_id': listener_id,
            'workflow_id': str(workflow.id),
            'workflow_name': workflow.name,
            'status': 'running',
            'message': 'Webhook listener started'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error starting webhook listener: {e}")
        return Response({
            'error': f'Failed to start listener: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def pause_webhook_listener(request, listener_id: str):
    """Pause a webhook listener"""
    try:
        if pause_listener(listener_id, request.user.id):
            return Response({
                'listener_id': listener_id,
                'status': 'paused',
                'message': 'Listener paused'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Listener not found or cannot be paused'
            }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error pausing listener: {e}")
        return Response({
            'error': f'Failed to pause listener: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def resume_webhook_listener(request, listener_id: str):
    """Resume a paused webhook listener"""
    try:
        if resume_listener(listener_id, request.user.id):
            return Response({
                'listener_id': listener_id,
                'status': 'running',
                'message': 'Listener resumed'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Listener not found or cannot be resumed'
            }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error resuming listener: {e}")
        return Response({
            'error': f'Failed to resume listener: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def stop_webhook_listener(request, listener_id: str):
    """Stop a webhook listener"""
    try:
        if stop_listener(listener_id, request.user.id):
            return Response({
                'listener_id': listener_id,
                'status': 'stopped',
                'message': 'Listener stopped'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Listener not found or cannot be stopped'
            }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error stopping listener: {e}")
        return Response({
            'error': f'Failed to stop listener: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def delete_webhook_listener(request, listener_id: str):
    """Delete a webhook listener"""
    try:
        if delete_listener(listener_id, request.user.id):
            return Response({
                'listener_id': listener_id,
                'message': 'Listener deleted'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Listener not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error deleting listener: {e}")
        return Response({
            'error': f'Failed to delete listener: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_webhook_listener(request, listener_id: str):
    """Get listener status and info"""
    try:
        listener = get_listener(listener_id)
        if not listener:
            return Response({
                'error': 'Listener not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if listener['user_id'] != request.user.id:
            return Response({
                'error': 'Access denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        return Response({
            'listener_id': listener_id,
            'workflow_id': listener['workflow_id'],
            'status': listener['status'],
            'created_at': listener['created_at'],
            'request_count': listener['request_count'],
            'last_request_at': listener['last_request_at'],
            'recent_events_count': len(listener['events'])
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error getting listener: {e}")
        return Response({
            'error': f'Failed to get listener: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def list_webhook_listeners(request):
    """List all listeners for the current user"""
    try:
        listeners = get_user_listeners(request.user.id)
        return Response({
            'listeners': listeners,
            'count': len(listeners)
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error listing listeners: {e}")
        return Response({
            'error': f'Failed to list listeners: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse

@csrf_exempt
def webhook_listener_stream(request, listener_id: str):
    """
    Server-Sent Events (SSE) stream for real-time webhook listener updates
    
    Usage: GET /api/listeners/{listener_id}/stream/
    Note: EventSource doesn't support custom headers, so token should be passed as ?token=...
    This endpoint bypasses DRF to properly support SSE streaming.
    """
    from .webhook_listener import listener_sse_connections
    
    # Handle token from query parameter (for EventSource compatibility)
    token = request.GET.get('token')
    user = None
    
    if token:
        # Try to authenticate with token from query param
        from rest_framework_simplejwt.tokens import AccessToken
        try:
            access_token = AccessToken(token)
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(id=access_token['user_id'])
        except Exception as e:
            logger.warning(f"Failed to authenticate with token from query param: {e}")
    
    # Also try session authentication
    if not user and hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
    
    logger.info(f"SSE stream request for listener {listener_id}, user: {user.id if user else 'anonymous'}")
    
    # Verify listener exists and user has access
    listener = get_listener(listener_id)
    if not listener:
        logger.warning(f"Listener {listener_id} not found")
        return HttpResponse(
            json.dumps({'error': 'Listener not found'}),
            status=404,
            content_type='application/json'
        )
    
    if not user or listener['user_id'] != user.id:
        logger.warning(f"Access denied for listener {listener_id}, user: {user.id if user else 'anonymous'}")
        return HttpResponse(
            json.dumps({'error': 'Access denied'}),
            status=403,
            content_type='application/json'
        )
    
    logger.info(f"SSE stream connected for listener {listener_id}")
    
    # Create queue for this connection
    update_queue = queue.Queue()
    
    # Register connection
    if listener_id not in listener_sse_connections:
        listener_sse_connections[listener_id] = []
    
    conn_info = {
        'queue': update_queue,
        'closed': False,
        'user_id': request.user.id
    }
    listener_sse_connections[listener_id].append(conn_info)
    
    def event_stream():
        """Generator for SSE events"""
        try:
            # Send initial connection message
            yield f"data: {json.dumps({'type': 'connected', 'listener_id': listener_id})}\n\n"
            
            # Send current status
            yield f"data: {json.dumps({
                'type': 'status',
                'listener_id': listener_id,
                'status': listener['status'],
                'request_count': listener['request_count'],
                'last_request_at': listener['last_request_at']
            })}\n\n"
            
            # Send recent events (last 10) - send them as webhook_request events
            recent_events = listener['events'][-10:]
            logger.info(f"Sending {len(recent_events)} recent events to new SSE connection")
            for event in recent_events:
                yield f"data: {json.dumps(event)}\n\n"
            
            # Keep connection alive and send updates
            while True:
                try:
                    # Wait for update with timeout
                    update = update_queue.get(timeout=30)
                    yield f"data: {json.dumps(update)}\n\n"
                    
                    # If listener is stopped, close connection
                    if update.get('type') == 'status_changed' and update.get('status') == 'stopped':
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
            if listener_id in listener_sse_connections:
                listener_sse_connections[listener_id] = [
                    conn for conn in listener_sse_connections[listener_id]
                    if conn != conn_info
                ]
    
    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'  # Disable buffering in nginx
    # Note: 'Connection' is a hop-by-hop header and cannot be set in response
    response['Access-Control-Allow-Origin'] = '*'  # Allow CORS for SSE
    response['Access-Control-Allow-Headers'] = 'Cache-Control'
    return response

