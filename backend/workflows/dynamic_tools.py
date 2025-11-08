"""
Dynamic Tool System
Allows creating custom tools dynamically from Python functions
"""
from typing import Dict, Any, List, Callable, Optional
from dataclasses import dataclass, field
import inspect
from alith import Tool
from pydantic import BaseModel, create_model


@dataclass
class DynamicTool:
    """Dynamic tool definition"""
    id: str
    name: str
    description: str
    handler: Callable
    parameters: Dict[str, Any]
    version: str = "1.0.0"
    author: str = "Agent Flow"


class DynamicToolRegistry:
    """Registry for dynamic tools"""
    
    def __init__(self):
        self._tools: Dict[str, DynamicTool] = {}
    
    def register(
        self,
        tool_id: str,
        name: str,
        description: str,
        version: str = "1.0.0",
        author: str = "Agent Flow"
    ):
        """Decorator to register a function as a dynamic tool"""
        def decorator(func: Callable):
            # Auto-detect parameters from function signature
            parameters = self._detect_parameters(func)
            
            tool = DynamicTool(
                id=tool_id,
                name=name,
                description=description,
                handler=func,
                parameters=parameters,
                version=version,
                author=author
            )
            
            self._tools[tool_id] = tool
            return func
        
        return decorator
    
    def _detect_parameters(self, func: Callable) -> Dict[str, Any]:
        """Auto-detect parameters from function signature"""
        sig = inspect.signature(func)
        parameters = {}
        
        for param_name, param in sig.parameters.items():
            if param_name in ['self']:
                continue
            
            # Determine type from annotation
            param_type = str
            if param.annotation != inspect.Parameter.empty:
                param_type = param.annotation
            
            parameters[param_name] = (param_type, ...)
        
        return parameters
    
    def get_tool(self, tool_id: str) -> Optional[DynamicTool]:
        """Get tool by ID"""
        return self._tools.get(tool_id)
    
    def create_alith_tool(self, tool_id: str) -> Optional[Tool]:
        """Create an Alith Tool instance from a dynamic tool"""
        dynamic_tool = self._tools.get(tool_id)
        if not dynamic_tool:
            return None
        
        # Create Pydantic model for parameters
        ParametersModel = create_model(
            f'{dynamic_tool.name}Parameters',
            **dynamic_tool.parameters
        )
        
        # Create Alith Tool
        return Tool(
            name=dynamic_tool.name,
            description=dynamic_tool.description,
            parameters=ParametersModel,
            handler=dynamic_tool.handler,
            version=dynamic_tool.version,
            author=dynamic_tool.author
        )
    
    def get_all_tools(self) -> Dict[str, DynamicTool]:
        """Get all registered tools"""
        return self._tools.copy()
    
    def to_frontend_format(self) -> List[Dict[str, Any]]:
        """Convert tools to frontend format"""
        result = []
        for tool in self._tools.values():
            result.append({
                'id': tool.id,
                'name': tool.name,
                'description': tool.description,
                'parameters': {
                    name: {
                        'type': str(type_info[0].__name__) if hasattr(type_info[0], '__name__') else 'string',
                        'required': type_info[1] == ...
                    }
                    for name, type_info in tool.parameters.items()
                },
                'version': tool.version,
                'author': tool.author
            })
        return result


# Global registry
tool_registry = DynamicToolRegistry()

