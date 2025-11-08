"""
Flow Control Node Executors
"""
from typing import Dict, Any, List
from .base import BaseNodeExecutor, NodeExecutionError


class FlowNodeExecutor(BaseNodeExecutor):
    """Executor for flow control nodes"""
    
    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute flow control nodes"""
        
        handlers = {
            'if-else': self._execute_if_else,
            'switch': self._execute_switch,
            'merge': self._execute_merge,
        }
        
        handler = handlers.get(self.node_type)
        if not handler:
            raise NodeExecutionError(f"Unknown flow node type: {self.node_type}")
        
        return await handler(inputs, context)
    
    async def _execute_if_else(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute If-Else node"""
        self.validate_inputs(inputs, ['main'])
        
        input_data = inputs.get('main', {})
        conditions = self.get_property('conditions', [])
        combine_operation = self.get_property('combineOperation', 'AND')
        
        if not conditions:
            raise NodeExecutionError("No conditions defined for If node")
        
        results = []
        for condition in conditions:
            field = condition.get('field', '')
            operator = condition.get('operator', 'equals')
            value = condition.get('value', '')
            
            field_value = input_data.get(field, '')
            result = self._evaluate_condition(field_value, operator, value)
            results.append(result)
        
        # Combine results
        if combine_operation == 'AND':
            final_result = all(results)
        else:  # OR
            final_result = any(results)
        
        self.log_execution(f"If condition evaluated to: {final_result}")
        
        # Return data on appropriate output
        if final_result:
            return {
                'true': input_data,
                'false': None
            }
        else:
            return {
                'true': None,
                'false': input_data
            }
    
    def _evaluate_condition(self, field_value: Any, operator: str, expected_value: Any) -> bool:
        """Evaluate a single condition"""
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
        
        return False
    
    async def _execute_switch(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Switch node"""
        self.validate_inputs(inputs, ['main'])
        
        input_data = inputs.get('main', {})
        mode = self.get_property('mode', 'rules')
        
        # Simple implementation - route to output0 by default
        self.log_execution("Switch node routing to output0")
        
        return {
            'output0': input_data,
            'output1': None,
            'output2': None,
            'output3': None
        }
    
    async def _execute_merge(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Merge node"""
        input1 = inputs.get('input1', {})
        input2 = inputs.get('input2', {})
        
        mode = self.get_property('mode', 'append')
        
        if mode == 'append':
            # Combine both inputs into a list
            result = []
            if input1:
                result.append(input1)
            if input2:
                result.append(input2)
            
            self.log_execution(f"Merged {len(result)} inputs")
            
            return {
                'main': {
                    'merged': result,
                    'count': len(result)
                }
            }
        elif mode == 'merge':
            # Merge dictionaries
            result = {**input1, **input2}
            self.log_execution("Merged inputs as dictionary")
            return {'main': result}
        else:  # choose - take first non-empty
            result = input1 if input1 else input2
            self.log_execution("Chose first non-empty input")
            return {'main': result}

