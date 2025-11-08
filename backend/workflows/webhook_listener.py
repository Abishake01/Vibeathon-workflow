"""
Webhook Listener Manager
Manages active webhook listeners and broadcasts events via SSE
"""
import uuid
import time
import logging
import queue
from typing import Dict, Any, Optional, List
from threading import Lock

logger = logging.getLogger(__name__)

# Store active webhook listeners
# Format: {listener_id: {workflow_id, user_id, status, created_at, events: []}}
active_listeners: Dict[str, Dict[str, Any]] = {}

# Store SSE connections for listeners
# Format: {listener_id: [conn_info, ...]}
listener_sse_connections: Dict[str, List[Dict[str, Any]]] = {}

# Thread lock for thread-safe operations
listener_lock = Lock()


def create_listener(workflow_id: str, user_id: int) -> str:
    """Create a new webhook listener"""
    listener_id = str(uuid.uuid4())
    
    with listener_lock:
        active_listeners[listener_id] = {
            'workflow_id': workflow_id,
            'user_id': user_id,
            'status': 'running',  # running, paused, stopped
            'created_at': time.time(),
            'events': [],  # Store recent events
            'request_count': 0,
            'last_request_at': None
        }
        listener_sse_connections[listener_id] = []
    
    logger.info(f"Created webhook listener {listener_id} for workflow {workflow_id}")
    return listener_id


def get_listener(listener_id: str) -> Optional[Dict[str, Any]]:
    """Get listener info"""
    with listener_lock:
        return active_listeners.get(listener_id)


def pause_listener(listener_id: str, user_id: int) -> bool:
    """Pause a listener"""
    with listener_lock:
        listener = active_listeners.get(listener_id)
        if not listener:
            return False
        if listener['user_id'] != user_id:
            return False
        if listener['status'] == 'running':
            listener['status'] = 'paused'
            logger.info(f"Paused listener {listener_id}")
            broadcast_listener_event(listener_id, {
                'type': 'status_changed',
                'status': 'paused',
                'timestamp': time.time()
            })
            return True
    return False


def resume_listener(listener_id: str, user_id: int) -> bool:
    """Resume a paused listener"""
    with listener_lock:
        listener = active_listeners.get(listener_id)
        if not listener:
            return False
        if listener['user_id'] != user_id:
            return False
        if listener['status'] == 'paused':
            listener['status'] = 'running'
            logger.info(f"Resumed listener {listener_id}")
            broadcast_listener_event(listener_id, {
                'type': 'status_changed',
                'status': 'running',
                'timestamp': time.time()
            })
            return True
    return False


def stop_listener(listener_id: str, user_id: int) -> bool:
    """Stop a listener"""
    with listener_lock:
        listener = active_listeners.get(listener_id)
        if not listener:
            return False
        if listener['user_id'] != user_id:
            return False
        listener['status'] = 'stopped'
        logger.info(f"Stopped listener {listener_id}")
        broadcast_listener_event(listener_id, {
            'type': 'status_changed',
            'status': 'stopped',
            'timestamp': time.time()
        })
        # Clean up after a delay
        return True


def delete_listener(listener_id: str, user_id: int) -> bool:
    """Delete a listener and clean up"""
    with listener_lock:
        listener = active_listeners.get(listener_id)
        if not listener:
            return False
        if listener['user_id'] != user_id:
            return False
        del active_listeners[listener_id]
        if listener_id in listener_sse_connections:
            # Close all connections
            for conn_info in listener_sse_connections[listener_id]:
                conn_info['closed'] = True
            del listener_sse_connections[listener_id]
        logger.info(f"Deleted listener {listener_id}")
        return True


def is_listener_active(listener_id: str) -> bool:
    """Check if listener is active (running or paused)"""
    with listener_lock:
        listener = active_listeners.get(listener_id)
        if not listener:
            return False
        return listener['status'] in ['running', 'paused']


def should_process_request(listener_id: str) -> bool:
    """Check if listener should process incoming requests"""
    with listener_lock:
        listener = active_listeners.get(listener_id)
        if not listener:
            return False
        return listener['status'] == 'running'


def record_webhook_request(listener_id: str, request_data: Dict[str, Any], execution_result: Dict[str, Any]):
    """Record an incoming webhook request and broadcast it"""
    logger.info(f"Recording webhook request for listener {listener_id}")
    
    with listener_lock:
        listener = active_listeners.get(listener_id)
        if not listener:
            logger.warning(f"Listener {listener_id} not found in active_listeners")
            return
        
        event = {
            'type': 'webhook_request',
            'request_id': str(uuid.uuid4()),
            'timestamp': time.time(),
            'request': {
                'method': request_data.get('method', 'POST'),
                'path': request_data.get('path', ''),
                'headers': request_data.get('headers', {}),
                'body': request_data.get('body', {}),
                'query_params': request_data.get('query_params', {})
            },
            'execution': execution_result
        }
        
        # Add to events history (keep last 100)
        listener['events'].append(event)
        if len(listener['events']) > 100:
            listener['events'] = listener['events'][-100:]
        
        listener['request_count'] += 1
        listener['last_request_at'] = time.time()
        
        logger.info(f"Event created for listener {listener_id}, request_count now: {listener['request_count']}")
    
    # Broadcast to SSE connections
    logger.info(f"Broadcasting webhook_request event to listener {listener_id}")
    broadcast_listener_event(listener_id, event)


def broadcast_listener_event(listener_id: str, event: Dict[str, Any]):
    """Broadcast event to all SSE connections for this listener"""
    if listener_id not in listener_sse_connections:
        logger.warning(f"No SSE connections found for listener {listener_id}")
        return
    
    with listener_lock:
        # Remove closed connections
        listener_sse_connections[listener_id] = [
            conn for conn in listener_sse_connections[listener_id]
            if not conn.get('closed', False)
        ]
        
        connection_count = len(listener_sse_connections[listener_id])
        logger.info(f"Broadcasting event to {connection_count} connections for listener {listener_id}, event type: {event.get('type')}")
        
        # Send event to all connections
        for conn_info in listener_sse_connections[listener_id]:
            try:
                conn_info['queue'].put(event)
                logger.debug(f"Event queued for connection (user_id: {conn_info.get('user_id')})")
            except Exception as e:
                logger.warning(f"Error broadcasting to listener SSE connection: {e}")
                conn_info['closed'] = True


def get_user_listeners(user_id: int) -> List[Dict[str, Any]]:
    """Get all listeners for a user"""
    with listener_lock:
        return [
            {
                'listener_id': listener_id,
                'workflow_id': listener['workflow_id'],
                'status': listener['status'],
                'created_at': listener['created_at'],
                'request_count': listener['request_count'],
                'last_request_at': listener['last_request_at']
            }
            for listener_id, listener in active_listeners.items()
            if listener['user_id'] == user_id
        ]


def get_workflow_listeners(workflow_id: str) -> List[Dict[str, Any]]:
    """Get all active listeners for a workflow (regardless of user)"""
    with listener_lock:
        return [
            {
                'listener_id': listener_id,
                'workflow_id': listener['workflow_id'],
                'status': listener['status'],
                'created_at': listener['created_at'],
                'request_count': listener['request_count'],
                'last_request_at': listener['last_request_at'],
                'user_id': listener['user_id']
            }
            for listener_id, listener in active_listeners.items()
            if listener['workflow_id'] == workflow_id
        ]

