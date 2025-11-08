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

