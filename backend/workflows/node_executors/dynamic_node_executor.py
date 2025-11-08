"""
Dynamic Node Executor
Executes dynamically registered nodes
"""
from typing import Dict, Any
from .base import BaseNodeExecutor, NodeExecutionError
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from workflows.dynamic_nodes import DynamicNode
from workflows.expression_evaluator import evaluate_expression
import inspect


class DynamicNodeExecutor(BaseNodeExecutor):
    """Executor for dynamically registered nodes"""
    
    def __init__(self, node_id: str, node_type: str, node_data: Dict[str, Any], dynamic_node: DynamicNode):
        super().__init__(node_id, node_type, node_data)
        self.dynamic_node = dynamic_node
    
    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute dynamic node"""
        try:
            # Get handler function
            handler = self.dynamic_node.handler
            
            # Prepare arguments from node properties
            sig = inspect.signature(handler)
            kwargs = {}
            
            # Get evaluation context for expressions
            eval_context = {
                'node_results': context.get('node_results', {}),
                'json': inputs.get('main', {}),
                '$vars': context.get('$vars', {})
            }
            
            # Extract parameters from node properties
            for param_name, param in sig.parameters.items():
                if param_name in ['inputs', 'context']:
                    continue
                
                # Get value from properties
                value = self.get_property(param_name, param.default if param.default != inspect.Parameter.empty else None)
                
                # Evaluate expression if it's a string with ${{ }}
                if isinstance(value, str) and '${{' in value:
                    try:
                        value = evaluate_expression(value, eval_context)
                    except Exception as e:
                        self.log_execution(f"Warning: Failed to evaluate expression for {param_name}: {e}")
                
                kwargs[param_name] = value
            
            # Add inputs and context
            kwargs['inputs'] = inputs
            kwargs['context'] = context
            
            # Execute handler
            if inspect.iscoroutinefunction(handler):
                result = await handler(**kwargs)
            else:
                result = handler(**kwargs)
            
            # Ensure result is in correct format
            if not isinstance(result, dict):
                result = {'main': result}
            elif 'main' not in result:
                result = {'main': result}
            
            self.log_execution(f"Dynamic node {self.dynamic_node.name} executed successfully")
            
            return result
            
        except Exception as e:
            raise NodeExecutionError(f"Dynamic node execution failed: {str(e)}")

