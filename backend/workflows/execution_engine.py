"""
Workflow Execution Engine
Orchestrates the execution of workflow nodes in the correct order
"""
from typing import Dict, Any, List, Optional, Set
import asyncio
import logging
from datetime import datetime
from .node_executors import (
    BaseNodeExecutor,
    AINodeExecutor,
    TriggerNodeExecutor,
    FlowNodeExecutor,
    DataNodeExecutor,
    ActionNodeExecutor,
    OutputNodeExecutor
)
from .node_executors.ai_nodes import ChatModelExecutor, MemoryExecutor, ToolExecutor
from .node_executors.dynamic_node_executor import DynamicNodeExecutor
from .expression_evaluator import evaluate_expression
from .dynamic_nodes import node_registry, DynamicNode

logger = logging.getLogger(__name__)

# Global memory storage for persistent memory across executions
_global_memory_storage = {}


class ExecutionContext:
    """Stores execution state and results"""
    
    def __init__(self, workflow_id: str, execution_id: str):
        self.workflow_id = workflow_id
        self.execution_id = execution_id
        self.node_results: Dict[str, Any] = {}
        self.node_states: Dict[str, Dict[str, Any]] = {}
        self.execution_order: List[str] = []
        self.errors: Dict[str, str] = {}
        self.start_time = datetime.now()
        self.end_time: Optional[datetime] = None
        self.status = 'running'
        self.trigger_data: Dict[str, Any] = {}
        self.credentials: Dict[str, Any] = {}
        self.chat_response: Optional[str] = None
        self.persistent_memory: Dict[str, Any] = {}  # Store persistent memory instances
    
    def set_node_state(self, node_id: str, status: str, **kwargs):
        """Update node execution state"""
        current_time = datetime.now()
        
        # Get existing node state or create new one
        existing_state = self.node_states.get(node_id, {})
        
        # Update the state
        self.node_states[node_id] = {
            **existing_state,
            'status': status,
            'timestamp': current_time.isoformat(),
            'endTime': current_time.timestamp() * 1000,  # Convert to milliseconds
            **kwargs
        }
        
        # If this is the first time we're setting this node, record start time
        if 'startTime' not in existing_state:
            self.node_states[node_id]['startTime'] = current_time.timestamp() * 1000
    
    def set_node_result(self, node_id: str, result: Any):
        """Store node execution result"""
        self.node_results[node_id] = result
    
    def get_node_duration(self, node_id: str) -> float:
        """Get duration for a specific node in milliseconds"""
        node_state = self.node_states.get(node_id, {})
        start_time = node_state.get('startTime')
        end_time = node_state.get('endTime')
        
        if start_time and end_time:
            return end_time - start_time
        return 0
    
    def set_node_error(self, node_id: str, error: str):
        """Store node execution error"""
        self.errors[node_id] = error
        self.set_node_state(node_id, 'error', error=error)
    
    def get_node_result(self, node_id: str) -> Any:
        """Get result from previously executed node"""
        return self.node_results.get(node_id)
    
    def complete(self, status: str = 'completed'):
        """Mark execution as complete"""
        self.status = status
        self.end_time = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        duration = None
        if self.end_time and self.start_time:
            duration = (self.end_time - self.start_time).total_seconds()
        
        # Add timing information to each node state
        enhanced_node_states = {}
        for node_id, node_state in self.node_states.items():
            node_duration = self.get_node_duration(node_id)
            enhanced_node_states[node_id] = {
                **node_state,
                'duration': node_duration,
                'durationMs': node_duration,
                'durationSeconds': node_duration / 1000 if node_duration > 0 else 0
            }
        
        return {
            'execution_id': self.execution_id,
            'workflow_id': self.workflow_id,
            'status': self.status,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration': duration,
            'execution_order': self.execution_order,
            'node_states': enhanced_node_states,
            'node_results': self.node_results,  # Include node results for frontend
            'errors': self.errors,
            'chat_response': self.chat_response
        }


class WorkflowExecutionEngine:
    """Engine for executing workflows"""
    
    def __init__(self):
        self.active_executions: Dict[str, ExecutionContext] = {}
    
    def _get_node_executor(self, node: Dict[str, Any]) -> BaseNodeExecutor:
        """Get appropriate executor for node type"""
        node_id = node['id']
        node_type = node['data']['type']
        node_data = node['data']
        
        # Check if it's a dynamic node
        dynamic_node = node_registry.get_node(node_type)
        if dynamic_node:
            return DynamicNodeExecutor(node_id, node_type, node_data, dynamic_node)
        
        # Determine executor based on node type
        executor_class = None
        
        # Trigger nodes
        if node_type in ['when-chat-received', 'webhook', 'schedule', 'manual-trigger']:
            executor_class = TriggerNodeExecutor
        
        # AI nodes
        elif node_type in ['ai-agent', 'openai', 'anthropic', 'google-gemini', 'groq-llama', 'groq-gemma',
                          'question-answer-chain', 'summarization-chain', 
                          'information-extractor', 'text-classifier', 'sentiment-analysis']:
            executor_class = AINodeExecutor
        
        # Chat model nodes
        elif node_type in ['gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']:
            executor_class = ChatModelExecutor
        
        # Memory nodes
        elif node_type in ['simple-memory', 'vector-memory', 'window-buffer-memory', 'agent-flow-db-memory']:
            executor_class = MemoryExecutor
        
        # Tool nodes
        elif node_type in ['calculator', 'web-search', 'duckduckgo-search', 'api-caller']:
            executor_class = ToolExecutor
        
        # Flow control nodes
        elif node_type in ['if-else', 'switch', 'merge']:
            executor_class = FlowNodeExecutor
        
        # Data transformation nodes
        elif node_type in ['filter', 'edit-fields', 'code']:
            executor_class = DataNodeExecutor
        
        # Action nodes
        elif node_type in ['http-request', 'google-sheets']:
            executor_class = ActionNodeExecutor
        
        # Output nodes
        elif node_type in ['respond-to-chat', 'readme-viewer']:
            executor_class = OutputNodeExecutor
        
        else:
            raise ValueError(f"Unknown node type: {node_type}")
        
        return executor_class(node_id, node_type, node_data)
    
    def _build_execution_graph(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """Build adjacency list of node dependencies"""
        graph = {node['id']: [] for node in nodes}
        
        for edge in edges:
            source = edge['source']
            target = edge['target']
            graph[target].append(source)
        
        return graph
    
    def _topological_sort(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> List[str]:
        """Get execution order using topological sort"""
        # Build adjacency lists
        in_degree = {node['id']: 0 for node in nodes}
        adjacency = {node['id']: [] for node in nodes}
        
        for edge in edges:
            source = edge['source']
            target = edge['target']
            adjacency[source].append(target)
            in_degree[target] += 1
        
        # Find nodes with no dependencies (triggers and standalone nodes)
        queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
        execution_order = []
        
        while queue:
            current = queue.pop(0)
            execution_order.append(current)
            
            # Reduce in-degree for connected nodes
            for neighbor in adjacency[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        # Check for cycles
        if len(execution_order) != len(nodes):
            raise ValueError("Workflow contains cycles or unreachable nodes")
        
        return execution_order
    
    def _get_node_inputs(self, node_id: str, edges: List[Dict[str, Any]], context: ExecutionContext) -> Dict[str, Any]:
        """Collect inputs for a node from its predecessors"""
        inputs = {}
        main_inputs = []  # Collect all inputs going to 'main' handle
        
        for edge in edges:
            if edge['target'] == node_id:
                source_id = edge['source']
                source_output = edge.get('sourceHandle', 'main')
                target_input = edge.get('targetHandle', 'main')
                
                # Get result from source node
                source_result = context.get_node_result(source_id)
                
                if source_result:
                    # Extract the specific output handle
                    if isinstance(source_result, dict) and source_output in source_result:
                        output_data = source_result[source_output]
                    else:
                        output_data = source_result
                    
                    # If multiple nodes connect to 'main', collect them all
                    if target_input == 'main':
                        main_inputs.append({
                            'source_id': source_id,
                            'data': output_data
                        })
                        # Also store by source node ID for direct access
                        inputs[source_id] = output_data
                    else:
                        # Store in inputs under the target handle name
                        inputs[target_input] = output_data
        
        # Handle multiple inputs to 'main' - merge them
        if len(main_inputs) > 1:
            # Merge all main inputs into a single object
            merged_main = {}
            for main_input in main_inputs:
                data = main_input['data']
                if isinstance(data, dict):
                    merged_main.update(data)
                else:
                    # If not a dict, store by source node ID
                    merged_main[main_input['source_id']] = data
            inputs['main'] = merged_main
        elif len(main_inputs) == 1:
            # Single input to main
            inputs['main'] = main_inputs[0]['data']
        
        # Add main input as 'json' for expression evaluation
        if 'main' in inputs:
            inputs['json'] = inputs['main']
        
        return inputs
    
    async def execute_node(
        self, 
        node: Dict[str, Any], 
        edges: List[Dict[str, Any]], 
        context: ExecutionContext
    ) -> Dict[str, Any]:
        """Execute a single node"""
        node_id = node['id']
        node_type = node['data']['type']
        
        try:
            # Mark node as running
            context.set_node_state(node_id, 'running')
            
            # Get inputs from connected nodes
            inputs = self._get_node_inputs(node_id, edges, context)
            
            # Debug logging for node data
            logger.info(f"Node data for {node_id}: {node}")
            logger.info(f"Node properties: {node.get('data', {}).get('properties', {})}")
            
            # Evaluate expressions in node properties BEFORE creating executor
            # This ensures the executor has access to the latest evaluated properties
            node_properties = node['data'].get('properties', {}).copy()
            eval_context = {
                'node_results': context.node_results,
                'json': inputs.get('main', {}),
                '$vars': {
                    '$execution': {
                        'id': context.execution_id,
                        'mode': 'test'
                    },
                    '$workflow': {
                        'id': context.workflow_id,
                        'name': 'Workflow'
                    }
                }
            }
            
            # Evaluate all property values that might contain expressions
            for key, value in node_properties.items():
                if isinstance(value, str) and '${{' in value:
                    try:
                        node_properties[key] = evaluate_expression(value, eval_context)
                    except Exception as e:
                        logger.warning(f"Failed to evaluate expression for {key}: {e}")
            
            # Update node data with evaluated properties
            node['data']['properties'] = node_properties
            
            # Get node executor AFTER properties are evaluated
            # This ensures executor has access to evaluated properties
            executor = self._get_node_executor(node)
            
            # Build execution context dict
            exec_context = {
                'execution_id': context.execution_id,
                'workflow_id': context.workflow_id,
                'trigger_data': context.trigger_data,
                'openai_api_key': context.credentials.get('openai_api_key'),
                'anthropic_api_key': context.credentials.get('anthropic_api_key'),
                'google_api_key': context.credentials.get('google_api_key'),
                'groq_api_key': context.credentials.get('groq_api_key'),
                'node_results': context.node_results,  # For expression evaluation
                'json': inputs.get('main', {}),  # Current node input
            }
            
            logger.info(f"Executing node {node_id} ({node_type})")
            
            # Execute node
            result = await executor.execute(inputs, exec_context)
            
            # Ensure result is structured JSON
            if not isinstance(result, dict):
                result = {'main': result}
            elif 'main' not in result:
                # If result is dict but no 'main' key, wrap it
                result = {'main': result}
            
            # Store result
            context.set_node_result(node_id, result)
            context.set_node_state(node_id, 'completed', output=result, input=inputs)
            context.execution_order.append(node_id)
            
            # Check for chat response
            if 'chat_response' in exec_context:
                context.chat_response = exec_context['chat_response']
            
            logger.info(f"Node {node_id} completed successfully")
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Node {node_id} failed: {error_msg}")
            context.set_node_error(node_id, error_msg)
            raise
    
    async def execute_workflow(
        self, 
        workflow_id: str,
        execution_id: str,
        nodes: List[Dict[str, Any]], 
        edges: List[Dict[str, Any]],
        trigger_data: Optional[Dict[str, Any]] = None,
        credentials: Optional[Dict[str, Any]] = None,
        start_node_id: Optional[str] = None,
        progress_callback: Optional[callable] = None
    ) -> ExecutionContext:
        """Execute entire workflow or from a specific node"""
        
        # Create execution context with default trigger_data if not provided
        default_trigger_data = trigger_data or {
            'message': 'Hello, how can I help you today?',
            'text': 'Hello, how can I help you today?',
            'user': 'anonymous',
            'channel': '',
            'timestamp': ''
        }
        
        context = ExecutionContext(workflow_id, execution_id)
        context.trigger_data = default_trigger_data
        context.credentials = credentials or {}
        
        self.active_executions[execution_id] = context
        
        try:
            if start_node_id:
                # Execute single node and its dependencies (not downstream nodes)
                await self._execute_from_node(start_node_id, nodes, edges, context, progress_callback, include_downstream=False)
            else:
                # Execute entire workflow
                execution_order = self._topological_sort(nodes, edges)
                
                for idx, node_id in enumerate(execution_order):
                    node = next(n for n in nodes if n['id'] == node_id)
                    
                    # Call progress callback
                    if progress_callback:
                        await progress_callback({
                            'type': 'node_start',
                            'node_id': node_id,
                            'progress': (idx / len(execution_order)) * 100
                        })
                    
                    await self.execute_node(node, edges, context)
                    
                    # Call progress callback after node completion
                    if progress_callback:
                        await progress_callback({
                            'type': 'node_complete',
                            'node_id': node_id,
                            'result': context.get_node_result(node_id),
                            'progress': ((idx + 1) / len(execution_order)) * 100
                        })
            
            context.complete('completed')
            
            if progress_callback:
                await progress_callback({
                    'type': 'workflow_complete',
                    'context': context.to_dict()
                })
            
        except Exception as e:
            logger.error(f"Workflow execution failed: {str(e)}")
            context.complete('error')
            
            if progress_callback:
                await progress_callback({
                    'type': 'workflow_error',
                    'error': str(e)
                })
        
        return context
    
    async def execute_single_node(
        self,
        node_id: str,
        workflow_id: str,
        execution_id: str,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        credentials: Optional[Dict[str, Any]] = None,
        progress_callback: Optional[callable] = None
    ) -> ExecutionContext:
        """Execute a single node with its dependencies"""
        return await self.execute_workflow(
            workflow_id=workflow_id,
            execution_id=execution_id,
            nodes=nodes,
            edges=edges,
            credentials=credentials,
            start_node_id=node_id,
            progress_callback=progress_callback
        )
    
    async def _execute_from_node(
        self,
        start_node_id: str,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        context: ExecutionContext,
        progress_callback: Optional[callable] = None,
        include_downstream: bool = False
    ):
        """Execute workflow starting from a specific node"""
        # Find all nodes that need to be executed (dependencies + target, optionally downstream)
        nodes_to_execute = self._get_execution_subgraph(start_node_id, nodes, edges, include_downstream)
        
        # Execute in topological order
        execution_order = self._topological_sort(
            [n for n in nodes if n['id'] in nodes_to_execute],
            [e for e in edges if e['source'] in nodes_to_execute and e['target'] in nodes_to_execute]
        )
        
        for idx, node_id in enumerate(execution_order):
            if progress_callback:
                await progress_callback({
                    'type': 'node_start',
                    'node_id': node_id,
                    'progress': (idx / len(execution_order)) * 100
                })
            
            node = next(n for n in nodes if n['id'] == node_id)
            await self.execute_node(node, edges, context)
            
            if progress_callback:
                await progress_callback({
                    'type': 'node_complete',
                    'node_id': node_id,
                    'result': context.get_node_result(node_id),
                    'progress': ((idx + 1) / len(execution_order)) * 100
                })
    
    def _get_execution_subgraph(
        self,
        node_id: str,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        include_downstream: bool = False
    ) -> Set[str]:
        """Get all nodes that should be executed when executing from a specific node"""
        # Get dependencies (upstream nodes)
        dependencies = self._get_dependencies(node_id, edges)
        
        # Start with dependencies and the target node
        result = dependencies | {node_id}
        
        # Optionally include downstream nodes (for full workflow execution)
        if include_downstream:
            downstream = self._get_downstream(node_id, edges)
            result = result | downstream
        
        return result
    
    def _get_dependencies(self, node_id: str, edges: List[Dict[str, Any]]) -> Set[str]:
        """Get all upstream dependencies of a node"""
        dependencies = set()
        queue = [node_id]
        
        while queue:
            current = queue.pop(0)
            for edge in edges:
                if edge['target'] == current and edge['source'] not in dependencies:
                    dependencies.add(edge['source'])
                    queue.append(edge['source'])
        
        return dependencies
    
    def _get_downstream(self, node_id: str, edges: List[Dict[str, Any]]) -> Set[str]:
        """Get all downstream nodes"""
        downstream = set()
        queue = [node_id]
        
        while queue:
            current = queue.pop(0)
            for edge in edges:
                if edge['source'] == current and edge['target'] not in downstream:
                    downstream.add(edge['target'])
                    queue.append(edge['target'])
        
        return downstream
    
    def get_execution(self, execution_id: str) -> Optional[ExecutionContext]:
        """Get execution context by ID"""
        return self.active_executions.get(execution_id)


# Global engine instance
execution_engine = WorkflowExecutionEngine()

