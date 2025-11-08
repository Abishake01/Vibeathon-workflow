"""
Custom Nodes
Define your custom nodes here using the dynamic node system
"""
from .dynamic_nodes import node_registry, NodeParameter, ParameterType
from typing import Dict, Any
import json


@node_registry.register(
    node_id="custom-text-transform",
    name="Text Transform",
    description="Transform text with various operations",
    category="Custom",
    icon="🔤",
    color="#8b5cf6",
    parameters=[
        NodeParameter(
            name="operation",
            label="Operation",
            type=ParameterType.SELECT,
            required=True,
            options=["uppercase", "lowercase", "title", "reverse"],
            default="uppercase"
        ),
        NodeParameter(
            name="input_text",
            label="Input Text",
            type=ParameterType.EXPRESSION,
            required=False,
            placeholder="${{ $json.text }}",
            description="Text to transform (supports expressions)"
        )
    ]
)
async def transform_text(inputs: Dict[str, Any], context: Dict[str, Any], operation: str, input_text: str = "") -> Dict[str, Any]:
    """Transform text based on operation"""
    # Get text from input or parameter
    text = input_text or inputs.get('main', {}).get('text', '')
    
    if not text:
        return {'main': {'error': 'No text provided'}}
    
    # Apply transformation
    if operation == "uppercase":
        result = text.upper()
    elif operation == "lowercase":
        result = text.lower()
    elif operation == "title":
        result = text.title()
    elif operation == "reverse":
        result = text[::-1]
    else:
        result = text
    
    return {
        'main': {
            'text': result,
            'original': text,
            'operation': operation
        }
    }


@node_registry.register(
    node_id="custom-math-calculator",
    name="Math Calculator",
    description="Perform mathematical calculations",
    category="Custom",
    icon="🔢",
    color="#10b981",
    parameters=[
        NodeParameter(
            name="operation",
            label="Operation",
            type=ParameterType.SELECT,
            required=True,
            options=["add", "subtract", "multiply", "divide", "power"],
            default="add"
        ),
        NodeParameter(
            name="num1",
            label="First Number",
            type=ParameterType.EXPRESSION,
            required=True,
            placeholder="${{ $json.value1 }}"
        ),
        NodeParameter(
            name="num2",
            label="Second Number",
            type=ParameterType.EXPRESSION,
            required=True,
            placeholder="${{ $json.value2 }}"
        )
    ]
)
async def calculate(inputs: Dict[str, Any], context: Dict[str, Any], operation: str, num1: float, num2: float) -> Dict[str, Any]:
    """Perform mathematical calculation"""
    try:
        num1 = float(num1)
        num2 = float(num2)
        
        if operation == "add":
            result = num1 + num2
        elif operation == "subtract":
            result = num1 - num2
        elif operation == "multiply":
            result = num1 * num2
        elif operation == "divide":
            if num2 == 0:
                return {'main': {'error': 'Division by zero'}}
            result = num1 / num2
        elif operation == "power":
            result = num1 ** num2
        else:
            result = 0
        
        return {
            'main': {
                'result': result,
                'num1': num1,
                'num2': num2,
                'operation': operation
            }
        }
    except (ValueError, TypeError) as e:
        return {'main': {'error': f'Invalid number: {str(e)}'}}


@node_registry.register(
    node_id="custom-json-processor",
    name="JSON Processor",
    description="Process and transform JSON data",
    category="Custom",
    icon="📦",
    color="#f59e0b",
    parameters=[
        NodeParameter(
            name="json_path",
            label="JSON Path",
            type=ParameterType.TEXT,
            required=False,
            placeholder="data.items.0.value",
            description="Path to extract from JSON (dot notation)"
        ),
        NodeParameter(
            name="filter_key",
            label="Filter Key",
            type=ParameterType.TEXT,
            required=False,
            placeholder="status"
        ),
        NodeParameter(
            name="filter_value",
            label="Filter Value",
            type=ParameterType.TEXT,
            required=False,
            placeholder="active"
        )
    ]
)
async def process_json(
    inputs: Dict[str, Any], 
    context: Dict[str, Any],
    json_path: str = "",
    filter_key: str = "",
    filter_value: str = ""
) -> Dict[str, Any]:
    """Process JSON data"""
    input_data = inputs.get('main', {})
    
    # Extract data using path
    if json_path:
        parts = json_path.split('.')
        current = input_data
        for part in parts:
            if isinstance(current, dict):
                current = current.get(part, {})
            elif isinstance(current, list):
                try:
                    index = int(part)
                    current = current[index] if index < len(current) else {}
                except (ValueError, IndexError):
                    current = {}
        result_data = current
    else:
        result_data = input_data
    
    # Apply filter
    if filter_key and filter_value:
        if isinstance(result_data, list):
            result_data = [item for item in result_data if item.get(filter_key) == filter_value]
        elif isinstance(result_data, dict) and result_data.get(filter_key) == filter_value:
            result_data = result_data
        else:
            result_data = {}
    
    return {
        'main': {
            'data': result_data,
            'original_size': len(str(input_data)),
            'result_size': len(str(result_data))
        }
    }

