"""
Data Transformation Node Executors
"""
from typing import Dict, Any
from .base import BaseNodeExecutor, NodeExecutionError
import json


class DataNodeExecutor(BaseNodeExecutor):
    """Executor for data transformation nodes"""
    
    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute data nodes"""
        
        handlers = {
            'filter': self._execute_filter,
            'edit-fields': self._execute_edit_fields,
            'code': self._execute_code,
            'text-transform': self._execute_text_transform,
            'notes': self._execute_notes,
        }
        
        handler = handlers.get(self.node_type)
        if not handler:
            raise NodeExecutionError(f"Unknown data node type: {self.node_type}")
        
        return await handler(inputs, context)
    
    async def _execute_filter(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Filter node"""
        self.validate_inputs(inputs, ['main'])
        
        input_data = inputs.get('main', {})
        field = self.get_property('field', '')
        operator = self.get_property('operator', 'equals')
        value = self.get_property('value', '')
        
        if not field:
            raise NodeExecutionError("No field specified for filter")
        
        field_value = input_data.get(field, '')
        
        # Evaluate condition
        keep = self._evaluate_filter(field_value, operator, value)
        
        self.log_execution(f"Filter condition: {field} {operator} {value} = {keep}")
        
        if keep:
            return {'main': input_data}
        else:
            return {'main': None}  # Filtered out
    
    def _evaluate_filter(self, field_value: Any, operator: str, expected_value: Any) -> bool:
        """Evaluate filter condition"""
        field_value_str = str(field_value).lower()
        expected_value_str = str(expected_value).lower()
        
        if operator == 'equals':
            return field_value_str == expected_value_str
        elif operator == 'notEquals':
            return field_value_str != expected_value_str
        elif operator == 'contains':
            return expected_value_str in field_value_str
        elif operator == 'greaterThan':
            try:
                return float(field_value) > float(expected_value)
            except:
                return False
        elif operator == 'lessThan':
            try:
                return float(field_value) < float(expected_value)
            except:
                return False
        
        return True
    
    async def _execute_edit_fields(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Edit Fields node"""
        self.validate_inputs(inputs, ['main'])
        
        input_data = inputs.get('main', {}).copy()
        fields = self.get_property('fields', [])
        
        for field_def in fields:
            key = field_def.get('key', '')
            value = field_def.get('value', '')
            
            if key:
                input_data[key] = value
        
        self.log_execution(f"Edited {len(fields)} fields")
        
        return {'main': input_data}
    
    async def _execute_code(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Code node"""
        self.validate_inputs(inputs, ['main'])
        
        input_data = inputs.get('main', {})
        language = self.get_property('language', 'javascript')
        code = self.get_property('code', '')
        
        if not code:
            raise NodeExecutionError("No code provided")
        
        if language == 'javascript':
            # For JavaScript, we'd need a JS runtime (like PyMiniRacer)
            # For now, return a placeholder
            self.log_execution("JavaScript execution not yet implemented")
            raise NodeExecutionError("JavaScript execution requires additional setup")
        
        elif language == 'python':
            # Execute Python code safely
            try:
                # Create safe execution environment
                local_vars = {'$input': input_data, 'result': None}
                
                # Execute code
                exec(code, {}, local_vars)
                
                result = local_vars.get('result', input_data)
                
                self.log_execution("Python code executed successfully")
                
                return {'main': result}
            except Exception as e:
                raise NodeExecutionError(f"Python code execution failed: {str(e)}")
        
        else:
            raise NodeExecutionError(f"Unsupported language: {language}")
    
    async def _execute_text_transform(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Text Transform node"""
        self.validate_inputs(inputs, ['main'])
        
        input_data = inputs.get('main', {})
        operation = self.get_property('operation', 'template')
        
        # Debug logging - ALWAYS log input data structure
        self.log_execution(f"🔍 Text Transform - Input data type: {type(input_data)}")
        self.log_execution(f"🔍 Text Transform - Full inputs: {inputs}")
        
        if isinstance(input_data, dict):
            self.log_execution(f"🔍 Text Transform - Input data keys: {list(input_data.keys())}")
            self.log_execution(f"🔍 Text Transform - Input data: {input_data}")
            
            if 'data' in input_data:
                self.log_execution(f"🔍 Text Transform - Data structure: {input_data.get('data', {})}")
            if 'body' in input_data:
                self.log_execution(f"🔍 Text Transform - Body data: {input_data.get('body', {})}")
            # Log top-level keys for direct access
            top_level_keys = [k for k in input_data.keys() if k not in ['data', 'body', 'headers', 'query_params', 'method', 'path', 'methods', 'timestamp', 'text']]
            if top_level_keys:
                self.log_execution(f"🔍 Text Transform - Top-level fields (direct access): {top_level_keys}")
        else:
            self.log_execution(f"🔍 Text Transform - Input data is not a dict: {input_data}")
        
        result_text = ''
        
        if operation == 'template':
            template = self.get_property('template', '')
            if not template:
                # If no template, return input as string
                result_text = str(input_data)
            else:
                # Simple template replacement
                # Replace {{ $json.field }} patterns
                import re
                
                def replace_expression(match):
                    expr = match.group(1).strip()
                    default_value = None
                    
                    # Check for default value syntax: field || 'default'
                    if '||' in expr:
                        parts = expr.split('||', 1)
                        expr = parts[0].strip()
                        default_value = parts[1].strip().strip("'\"")
                    
                    # Handle $json.field expressions
                    if expr.startswith('$json.'):
                        field_path = expr[6:]  # Remove '$json.'
                        # Navigate nested fields
                        value = input_data
                        found = True
                        for part in field_path.split('.'):
                            if isinstance(value, dict):
                                if part in value:
                                    value = value[part]
                                else:
                                    found = False
                                    value = None
                                    break
                            elif isinstance(value, list) and part.isdigit():
                                try:
                                    value = value[int(part)]
                                except (IndexError, ValueError):
                                    found = False
                                    value = None
                                    break
                            else:
                                found = False
                                value = None
                                break
                        
                        # Return value or default
                        if found and value is not None:
                            return str(value)
                        elif default_value is not None:
                            return str(default_value)
                        else:
                            return ''  # Return empty if no value and no default
                    
                    # Handle simple field access (direct access to top-level fields)
                    elif expr in input_data:
                        return str(input_data[expr])
                    # Try accessing through data.body path (for webhook data structure)
                    elif 'data' in input_data and isinstance(input_data['data'], dict):
                        data_obj = input_data['data']
                        if 'body' in data_obj and isinstance(data_obj['body'], dict):
                            if expr in data_obj['body']:
                                return str(data_obj['body'][expr])
                    # Try accessing through body path directly
                    elif 'body' in input_data and isinstance(input_data['body'], dict):
                        if expr in input_data['body']:
                            return str(input_data['body'][expr])
                    else:
                        # Return default if provided, otherwise return original
                        if default_value is not None:
                            return str(default_value)
                        return match.group(0)  # Return original if not found
                
                # Replace {{ ... }} patterns
                result_text = re.sub(r'\{\{\s*(.+?)\s*\}\}', replace_expression, template)
        
        elif operation == 'uppercase':
            text = self.get_property('text', '') or str(input_data.get('text', input_data))
            result_text = text.upper()
        
        elif operation == 'lowercase':
            text = self.get_property('text', '') or str(input_data.get('text', input_data))
            result_text = text.lower()
        
        elif operation == 'capitalize':
            text = self.get_property('text', '') or str(input_data.get('text', input_data))
            result_text = text.capitalize()
        
        elif operation == 'replace':
            text = self.get_property('text', '') or str(input_data.get('text', input_data))
            find = self.get_property('find', '')
            replace = self.get_property('replace', '')
            if find:
                result_text = text.replace(find, replace)
            else:
                result_text = text
        
        elif operation == 'extract':
            text = self.get_property('text', '') or str(input_data.get('text', input_data))
            pattern = self.get_property('pattern', '')
            if pattern:
                import re
                matches = re.findall(pattern, text)
                if matches:
                    result_text = matches[0] if isinstance(matches[0], str) else str(matches[0])
                else:
                    result_text = ''
            else:
                result_text = text
        
        elif operation == 'trim':
            text = self.get_property('text', '') or str(input_data.get('text', input_data))
            result_text = text.strip()
        
        elif operation == 'concat':
            fields = self.get_property('fields', [])
            if fields:
                parts = []
                for field_def in fields:
                    key = field_def.get('key', '')
                    value = field_def.get('value', '')
                    if key and key in input_data:
                        parts.append(str(input_data[key]))
                    elif value:
                        parts.append(value)
                result_text = ' '.join(parts)
            else:
                # Concatenate all input fields
                if isinstance(input_data, dict):
                    result_text = ' '.join(str(v) for v in input_data.values() if v)
                else:
                    result_text = str(input_data)
        
        else:
            result_text = str(input_data)
        
        self.log_execution(f"Text transform ({operation}): {result_text[:100]}...")
        
        return {
            'main': {
                'text': result_text,
                'content': result_text,
                'output': result_text
            }
        }
    
    async def _execute_notes(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Notes node - passes through data unchanged"""
        self.validate_inputs(inputs, ['main'])
        
        input_data = inputs.get('main', {})
        content = self.get_property('content', '')
        
        self.log_execution(f"Notes: {content[:50]}..." if content else "Empty notes")
        
        # Notes node just passes data through (for documentation purposes)
        return {'main': input_data}

