"""
Trigger Node Executors
"""
from typing import Dict, Any
from .base import BaseNodeExecutor, NodeExecutionError
import asyncio


class TriggerNodeExecutor(BaseNodeExecutor):
    """Executor for trigger nodes"""
    
    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute trigger nodes"""
        
        handlers = {
            'when-chat-received': self._execute_chat_trigger,
            'webhook': self._execute_webhook,
            'schedule': self._execute_schedule,
            'manual-trigger': self._execute_manual_trigger,
        }
        
        handler = handlers.get(self.node_type)
        if not handler:
            raise NodeExecutionError(f"Unknown trigger node type: {self.node_type}")
        
        return await handler(inputs, context)
    
    async def _execute_chat_trigger(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute chat message trigger"""
        channel = self.get_property('channel', '')
        
        # Get message from context (passed when chat triggers the workflow)
        message = context.get('trigger_data', {}).get('message', '')
        user = context.get('trigger_data', {}).get('user', 'anonymous')
        timestamp = context.get('trigger_data', {}).get('timestamp', '')
        
        self.log_execution(f"Chat trigger activated from channel: {channel}")
        
        return {
            'main': {
                'message': message,
                'user': user,
                'channel': channel,
                'timestamp': timestamp,
                'text': message  # For compatibility with downstream nodes
            }
        }
    
    async def _execute_webhook(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute webhook trigger"""
        path = self.get_property('path', '/webhook')
        methods = self.get_property('method', ['POST'])
        
        # Get webhook data from context
        webhook_data = context.get('trigger_data', {})
        
        self.log_execution(f"Webhook trigger activated on path: {path}")
        self.log_execution(f"Webhook trigger_data keys: {list(webhook_data.keys()) if isinstance(webhook_data, dict) else 'N/A'}")
        self.log_execution(f"Webhook trigger_data body: {webhook_data.get('body', {})}")
        
        # Extract body data for easier access in downstream nodes
        body_data = webhook_data.get('body', {})
        
        # If body is empty or missing, check if we have test_json in properties
        # This is a fallback in case the execute_node endpoint didn't set it
        if not body_data or (isinstance(body_data, dict) and len(body_data) == 0):
            test_json = self.get_property('test_json', '')
            self.log_execution(f"Checking for test_json in properties: {bool(test_json)}")
            if test_json and test_json.strip():
                try:
                    import json
                    body_data = json.loads(test_json)
                    self.log_execution(f"✅ Using test_json from properties (fallback): {body_data}")
                    # Update webhook_data with the parsed body
                    webhook_data['body'] = body_data
                except json.JSONDecodeError as e:
                    self.log_execution(f"❌ Failed to parse test_json: {e}")
            else:
                self.log_execution(f"⚠️ No test_json found in properties, body remains empty")
        
        # Build output with both structured data and flattened body for compatibility
        output = {
            'path': path,
            'methods': methods,
            'data': webhook_data,  # Full webhook data structure
            'body': body_data,  # Direct access to body
            'headers': webhook_data.get('headers', {}),
            'query_params': webhook_data.get('query_params', {}),
            'method': webhook_data.get('method', 'POST'),
            'timestamp': webhook_data.get('timestamp'),
            'text': str(webhook_data)  # For compatibility
        }
        
        # Also merge body fields directly into output for easier template access
        # This allows templates like {{ $json.name }} to work directly
        if isinstance(body_data, dict):
            output.update(body_data)
        
        return {
            'main': output
        }
    
    async def _execute_schedule(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute schedule trigger"""
        interval = self.get_property('interval', 'hours')
        value = self.get_property('value', 1)
        
        self.log_execution(f"Schedule trigger activated (every {value} {interval})")
        
        return {
            'main': {
                'interval': interval,
                'value': value,
                'triggered_at': context.get('trigger_data', {}).get('timestamp', ''),
                'text': f"Scheduled execution every {value} {interval}"
            }
        }
    
    async def _execute_manual_trigger(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute manual trigger"""
        self.log_execution("Manual trigger activated")
        
        # Get message from properties or context
        message = self.get_property('message', '') or context.get('trigger_data', {}).get('message', '') or context.get('trigger_data', {}).get('text', 'Manual execution started')
        
        self.log_execution(f"Manual trigger message: '{message}'")
        self.log_execution(f"Manual trigger properties: {self.properties}")
        
        return {
            'main': {
                'triggered_manually': True,
                'message': message,
                'text': message  # For compatibility with downstream nodes
            }
        }

