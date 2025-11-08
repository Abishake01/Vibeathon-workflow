"""
Action/Integration Node Executors
"""
from typing import Dict, Any
from .base import BaseNodeExecutor, NodeExecutionError
import httpx
import json


class ActionNodeExecutor(BaseNodeExecutor):
    """Executor for action/integration nodes"""
    
    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute action nodes"""
        
        handlers = {
            'http-request': self._execute_http_request,
            'google-sheets': self._execute_google_sheets,
            'respond-to-chat': self._execute_respond_to_chat,
        }
        
        handler = handlers.get(self.node_type)
        if not handler:
            raise NodeExecutionError(f"Unknown action node type: {self.node_type}")
        
        return await handler(inputs, context)
    
    async def _execute_http_request(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute HTTP Request node"""
        self.validate_inputs(inputs, ['main'])
        
        method = self.get_property('method', 'GET')
        url = self.get_property('url', '')
        headers = self.get_property('headers', [])
        body = self.get_property('body', '{}')
        
        if not url:
            raise NodeExecutionError("No URL specified for HTTP request")
        
        # Convert headers list to dict
        headers_dict = {}
        for header in headers:
            key = header.get('key', '')
            value = header.get('value', '')
            if key:
                headers_dict[key] = value
        
        self.log_execution(f"Making {method} request to {url}")
        
        try:
            async with httpx.AsyncClient() as client:
                if method == 'GET':
                    response = await client.get(url, headers=headers_dict)
                elif method == 'POST':
                    body_data = json.loads(body) if isinstance(body, str) else body
                    response = await client.post(url, headers=headers_dict, json=body_data)
                elif method == 'PUT':
                    body_data = json.loads(body) if isinstance(body, str) else body
                    response = await client.put(url, headers=headers_dict, json=body_data)
                elif method == 'PATCH':
                    body_data = json.loads(body) if isinstance(body, str) else body
                    response = await client.patch(url, headers=headers_dict, json=body_data)
                elif method == 'DELETE':
                    response = await client.delete(url, headers=headers_dict)
                else:
                    raise NodeExecutionError(f"Unsupported HTTP method: {method}")
                
                response.raise_for_status()
                
                try:
                    response_data = response.json()
                except:
                    response_data = response.text
                
                self.log_execution(f"HTTP request completed with status: {response.status_code}")
                
                return {
                    'main': {
                        'status_code': response.status_code,
                        'data': response_data,
                        'headers': dict(response.headers)
                    }
                }
        except httpx.HTTPError as e:
            raise NodeExecutionError(f"HTTP request failed: {str(e)}")
    
    async def _execute_google_sheets(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Google Sheets node"""
        self.validate_inputs(inputs, ['main'])
        
        operation = self.get_property('operation', 'append')
        spreadsheet_id = self.get_property('spreadsheetId', '')
        range_name = self.get_property('range', 'Sheet1!A1:Z')
        
        if not spreadsheet_id:
            raise NodeExecutionError("No spreadsheet ID specified")
        
        self.log_execution(f"Google Sheets {operation} operation (requires Google Sheets API setup)")
        
        # Placeholder - actual implementation would require Google Sheets API
        raise NodeExecutionError("Google Sheets integration requires Google API credentials setup")
    
    async def _execute_respond_to_chat(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Respond to Chat node"""
        self.validate_inputs(inputs, ['main'])
        
        input_data = inputs.get('main', {})
        message = self.get_property('message', '')
        
        if not message:
            # Try to get message from input
            message = input_data.get('text', '') or input_data.get('message', '') or str(input_data)
        
        if not message:
            raise NodeExecutionError("No message to respond with")
        
        self.log_execution(f"Responding to chat: {message[:100]}...")
        
        # Store response in context so frontend can display it
        context['chat_response'] = message
        
        return {
            'main': {
                'message': message,
                'sent': True,
                'timestamp': input_data.get('timestamp', '')
            }
        }

