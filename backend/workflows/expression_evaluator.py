"""
Expression Evaluator
Handles evaluation of expressions like ${{ json.value.path }}
"""
import re
import json
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class ExpressionEvaluator:
    """Evaluates expressions in the format ${{ expression }}"""
    
    def __init__(self, context: Dict[str, Any]):
        """
        Initialize evaluator with execution context
        
        Args:
            context: Dictionary containing:
                - node_results: Results from all executed nodes
                - json: Current node's input data (from previous node)
                - $vars: Workflow variables
        """
        self.context = context
        self.node_results = context.get('node_results', {})
        self.json_data = context.get('json', {})
        self.vars = context.get('$vars', {})
    
    def evaluate(self, expression: str) -> Any:
        """
        Evaluate an expression string
        
        Supports:
        - ${{ json.path.to.value }}
        - ${{ $vars.variable }}
        - ${{ $json.node_id.output_handle.field }}
        - JavaScript-like expressions
        """
        if not expression or not isinstance(expression, str):
            return expression
        
        # Check if expression contains ${{ }}
        if '${{' not in expression:
            return expression
        
        # Extract all ${{ }} blocks
        pattern = r'\$\{\{([^}]+)\}\}'
        matches = re.findall(pattern, expression)
        
        if not matches:
            return expression
        
        result = expression
        for match in matches:
            expr = match.strip()
            evaluated = self._evaluate_expression(expr)
            
            # Replace in result
            result = result.replace(f'${{{{{match}}}}}', str(evaluated))
        
        # Try to parse as JSON if it looks like JSON
        try:
            if result.startswith('{') or result.startswith('['):
                return json.loads(result)
        except:
            pass
        
        return result
    
    def _evaluate_expression(self, expr: str) -> Any:
        """Evaluate a single expression"""
        expr = expr.strip()
        
        # Handle $json references
        if expr.startswith('$json') or expr.startswith('json'):
            return self._evaluate_json_path(expr)
        
        # Handle $vars references
        if expr.startswith('$vars'):
            return self._evaluate_vars_path(expr)
        
        # Handle $json.node_id references (get data from specific node)
        if expr.startswith('$json.') and '.' in expr[6:]:
            parts = expr.split('.')
            if len(parts) >= 2:
                node_id = parts[1]
                path = '.'.join(parts[2:]) if len(parts) > 2 else None
                return self._get_node_output(node_id, path)
        
        # Handle JavaScript-like expressions
        if any(op in expr for op in ['+', '-', '*', '/', '(', ')', '[', ']']):
            return self._evaluate_javascript(expr)
        
        # Default: try to evaluate as path
        return self._evaluate_path(expr)
    
    def _evaluate_json_path(self, path: str) -> Any:
        """Evaluate a JSON path like json.field.subfield or $json.field"""
        # Remove $json or json prefix
        path = re.sub(r'^\$?json\.?', '', path)
        
        if not path:
            return self.json_data
        
        return self._get_nested_value(self.json_data, path)
    
    def _evaluate_vars_path(self, path: str) -> Any:
        """Evaluate a vars path like $vars.workflow.id"""
        # Remove $vars prefix
        path = re.sub(r'^\$vars\.?', '', path)
        
        if not path:
            return self.vars
        
        return self._get_nested_value(self.vars, path)
    
    def _get_node_output(self, node_id: str, path: Optional[str] = None) -> Any:
        """Get output from a specific node"""
        node_result = self.node_results.get(node_id)
        
        if not node_result:
            return None
        
        # If result is a dict with 'main' key, use that
        if isinstance(node_result, dict) and 'main' in node_result:
            data = node_result['main']
        else:
            data = node_result
        
        if path:
            return self._get_nested_value(data, path)
        
        return data
    
    def _get_nested_value(self, obj: Any, path: str) -> Any:
        """Get nested value from object using dot notation or bracket notation"""
        if not path:
            return obj
        
        # Handle bracket notation like [0] or ['key']
        path_parts = re.split(r'\.|\[|\]', path)
        path_parts = [p.strip('"\'') for p in path_parts if p]
        
        current = obj
        for part in path_parts:
            if not part:
                continue
            
            if isinstance(current, dict):
                current = current.get(part)
            elif isinstance(current, list):
                try:
                    index = int(part)
                    if 0 <= index < len(current):
                        current = current[index]
                    else:
                        return None
                except (ValueError, IndexError):
                    return None
            else:
                return None
            
            if current is None:
                return None
        
        return current
    
    def _evaluate_javascript(self, expr: str) -> Any:
        """Evaluate JavaScript-like expressions (simplified)"""
        try:
            # Replace $json references with actual values
            expr = re.sub(r'\$json\.([a-zA-Z0-9_\.\[\]]+)', 
                         lambda m: repr(self._evaluate_json_path(f"json.{m.group(1)}")), 
                         expr)
            
            # Replace json references
            expr = re.sub(r'json\.([a-zA-Z0-9_\.\[\]]+)', 
                         lambda m: repr(self._evaluate_json_path(f"json.{m.group(1)}")), 
                         expr)
            
            # Safe evaluation (only basic operations)
            # In production, use a proper JS evaluator like PyMiniRacer
            # For now, handle simple cases
            if '+' in expr:
                parts = expr.split('+')
                values = [self._evaluate_expression(p.strip()) for p in parts]
                return sum(float(v) if isinstance(v, (int, float)) else 0 for v in values)
            elif '-' in expr:
                parts = expr.split('-')
                values = [self._evaluate_expression(p.strip()) for p in parts]
                return float(values[0]) - sum(float(v) if isinstance(v, (int, float)) else 0 for v in values[1:])
            elif '*' in expr:
                parts = expr.split('*')
                values = [self._evaluate_expression(p.strip()) for p in parts]
                result = 1
                for v in values:
                    result *= float(v) if isinstance(v, (int, float)) else 0
                return result
            elif '/' in expr:
                parts = expr.split('/')
                values = [self._evaluate_expression(p.strip()) for p in parts]
                if len(values) >= 2:
                    return float(values[0]) / float(values[1]) if float(values[1]) != 0 else 0
                return 0
            
            # Try to evaluate as Python expression (limited)
            return eval(expr, {"__builtins__": {}}, {})
        except Exception as e:
            logger.warning(f"Failed to evaluate JavaScript expression: {expr}, error: {e}")
            return expr
    
    def _evaluate_path(self, path: str) -> Any:
        """Try to evaluate as a general path"""
        # Try as JSON path first
        if path.startswith('json') or path.startswith('$json'):
            return self._evaluate_json_path(path)
        
        # Try as vars path
        if path.startswith('$vars'):
            return self._evaluate_vars_path(path)
        
        # Try as direct property access
        return self._get_nested_value(self.json_data, path)


def evaluate_expression(expression: Any, context: Dict[str, Any]) -> Any:
    """
    Convenience function to evaluate an expression
    
    Args:
        expression: Expression string or value
        context: Execution context with node_results, json, $vars
    
    Returns:
        Evaluated value
    """
    if not isinstance(expression, str):
        return expression
    
    evaluator = ExpressionEvaluator(context)
    return evaluator.evaluate(expression)

