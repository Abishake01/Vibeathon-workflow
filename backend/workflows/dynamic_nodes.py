"""
Dynamic Node System
Allows creating custom nodes dynamically from Python functions
"""
from typing import Dict, Any, List, Callable, Optional
from dataclasses import dataclass, field
from enum import Enum
import inspect
import json


class ParameterType(Enum):
    """Parameter types for node properties"""
    TEXT = "text"
    NUMBER = "number"
    BOOLEAN = "boolean"
    SELECT = "select"
    TEXTAREA = "textarea"
    JSON = "json"
    EXPRESSION = "expression"


@dataclass
class NodeParameter:
    """Definition of a node parameter"""
    name: str
    label: str
    type: ParameterType
    required: bool = False
    default: Any = None
    description: str = ""
    options: List[Any] = field(default_factory=list)
    placeholder: str = ""


@dataclass
class DynamicNode:
    """Dynamic node definition"""
    id: str
    name: str
    description: str
    category: str
    icon: str
    color: str
    parameters: List[NodeParameter]
    handler: Callable
    input_handles: List[str] = field(default_factory=lambda: ['main'])
    output_handles: List[str] = field(default_factory=lambda: ['main'])


class DynamicNodeRegistry:
    """Registry for dynamic nodes"""
    
    def __init__(self):
        self._nodes: Dict[str, DynamicNode] = {}
    
    def register(
        self,
        node_id: str,
        name: str,
        description: str,
        category: str = "Custom",
        icon: str = "🔧",
        color: str = "#6366f1",
        parameters: Optional[List[NodeParameter]] = None,
        input_handles: Optional[List[str]] = None,
        output_handles: Optional[List[str]] = None
    ):
        """Decorator to register a function as a dynamic node"""
        def decorator(func: Callable):
            # Auto-detect parameters from function signature if not provided
            detected_params = parameters or self._detect_parameters(func)
            
            node = DynamicNode(
                id=node_id,
                name=name,
                description=description,
                category=category,
                icon=icon,
                color=color,
                parameters=detected_params,
                handler=func,
                input_handles=input_handles or ['main'],
                output_handles=output_handles or ['main']
            )
            
            self._nodes[node_id] = node
            return func
        
        return decorator
    
    def _detect_parameters(self, func: Callable) -> List[NodeParameter]:
        """Auto-detect parameters from function signature"""
        sig = inspect.signature(func)
        parameters = []
        
        for param_name, param in sig.parameters.items():
            if param_name in ['self', 'inputs', 'context']:
                continue
            
            # Determine type from annotation
            param_type = ParameterType.TEXT
            if param.annotation != inspect.Parameter.empty:
                if param.annotation == int or param.annotation == float:
                    param_type = ParameterType.NUMBER
                elif param.annotation == bool:
                    param_type = ParameterType.BOOLEAN
                elif param.annotation == dict or param.annotation == list:
                    param_type = ParameterType.JSON
            
            parameters.append(NodeParameter(
                name=param_name,
                label=param_name.replace('_', ' ').title(),
                type=param_type,
                required=param.default == inspect.Parameter.empty,
                default=param.default if param.default != inspect.Parameter.empty else None
            ))
        
        return parameters
    
    def get_node(self, node_id: str) -> Optional[DynamicNode]:
        """Get node by ID"""
        return self._nodes.get(node_id)
    
    def get_all_nodes(self) -> Dict[str, DynamicNode]:
        """Get all registered nodes"""
        return self._nodes.copy()
    
    def to_frontend_format(self) -> List[Dict[str, Any]]:
        """Convert nodes to frontend format"""
        result = []
        for node in self._nodes.values():
            result.append({
                'id': node.id,
                'name': node.name,
                'description': node.description,
                'category': node.category,
                'icon': node.icon,
                'color': node.color,
                'nodeType': 'custom',
                'parameters': [
                    {
                        'name': p.name,
                        'label': p.label,
                        'type': p.type.value,
                        'required': p.required,
                        'default': p.default,
                        'description': p.description,
                        'options': p.options,
                        'placeholder': p.placeholder
                    }
                    for p in node.parameters
                ],
                'inputs': node.input_handles if isinstance(node.input_handles, list) else [node.input_handles] if node.input_handles else [],
                'outputs': [
                    {
                        'name': handle if isinstance(handle, str) else handle.get('name', 'main'),
                        'type': 'main' if isinstance(handle, str) else handle.get('type', 'main'),
                        'displayName': 'Output' if isinstance(handle, str) else handle.get('displayName', 'Output')
                    }
                    for handle in (node.output_handles if isinstance(node.output_handles, list) else [node.output_handles] if node.output_handles else ['main'])
                ]
            })
        return result


# Global registry
node_registry = DynamicNodeRegistry()

