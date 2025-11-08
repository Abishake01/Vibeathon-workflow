"""
Base node executor class that all node executors inherit from
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class NodeExecutionError(Exception):
    """Custom exception for node execution errors"""
    pass


class BaseNodeExecutor(ABC):
    """Base class for all node executors"""
    
    def __init__(self, node_id: str, node_type: str, node_data: Dict[str, Any]):
        self.node_id = node_id
        self.node_type = node_type
        self.node_data = node_data
        self.properties = node_data.get('properties', {})
        self.label = node_data.get('label', node_type)
        
    @abstractmethod
    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the node with given inputs
        
        Args:
            inputs: Dictionary of input data from connected nodes
            context: Execution context containing workflow state, credentials, etc.
            
        Returns:
            Dictionary containing execution results
        """
        pass
    
    def validate_inputs(self, inputs: Dict[str, Any], required_inputs: List[str]) -> None:
        """Validate that all required inputs are present"""
        missing = [inp for inp in required_inputs if inp not in inputs or inputs[inp] is None]
        if missing:
            raise NodeExecutionError(
                f"Node '{self.label}' ({self.node_id}) is missing required inputs: {', '.join(missing)}"
            )
    
    def get_property(self, key: str, default: Any = None) -> Any:
        """Get a property value with optional default"""
        return self.properties.get(key, default)
    
    def log_execution(self, message: str, level: str = 'info'):
        """Log execution message"""
        log_func = getattr(logger, level, logger.info)
        log_func(f"[{self.node_id}] {self.label}: {message}")

