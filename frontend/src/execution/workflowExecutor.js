/**
 * Workflow Executor
 * Handles workflow execution with animations and logging
 */

import { executionLogger } from './executionLogger';

/**
 * Workflow Executor Class
 */
export class WorkflowExecutor {
  constructor(config = {}) {
    this.apiBaseUrl = config.apiBaseUrl || '/api';
    this.animationDelay = config.animationDelay || 200;
    this.onNodeStart = config.onNodeStart || null;
    this.onNodeComplete = config.onNodeComplete || null;
    this.onWorkflowComplete = config.onWorkflowComplete || null;
    this.onError = config.onError || null;
  }

  /**
   * Execute a single node (for testing)
   */
  async executeNode(nodeId, nodeType, properties = {}, testMessage = 'test') {
    executionLogger.logNodeExecution(nodeId, nodeType, 'start', { properties });

    try {
      // Notify node start
      if (this.onNodeStart) {
        this.onNodeStart(nodeId, { status: 'running' });
      }

      // Create test workflow
      const testWorkflow = {
        nodes: [
          {
            id: 'test-trigger',
            type: 'manual-trigger',
            data: { 
              type: 'manual-trigger', 
              label: 'Test Trigger',
              properties: { message: testMessage }
            }
          },
          {
            id: nodeId,
            type: nodeType,
            data: { 
              type: nodeType, 
              label: nodeType,
              properties
            }
          }
        ],
        edges: [
          {
            id: 'test-edge',
            source: 'test-trigger',
            target: nodeId,
            sourceHandle: 'main',
            targetHandle: 'main'
          }
        ]
      };

      // Create workflow in backend
      const createResponse = await fetch(`${this.apiBaseUrl}/workflows/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Workflow',
          description: 'Test workflow for node execution',
          nodes: testWorkflow.nodes,
          edges: testWorkflow.edges
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create test workflow: ${createResponse.status}`);
      }

      const createdWorkflow = await createResponse.json();
      executionLogger.debug('Created test workflow', { workflowId: createdWorkflow.id });

      // Execute the workflow
      const response = await fetch(`${this.apiBaseUrl}/workflows/${createdWorkflow.id}/execute/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger_data: { message: testMessage },
          credentials: {}
        })
      });

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.status}`);
      }

      const result = await response.json();
      executionLogger.debug('Execution result', result);

      // Extract node result
      const nodeResult = result.execution?.node_states?.[nodeId];
      
      // Clean up test workflow
      try {
        await fetch(`${this.apiBaseUrl}/workflows/${createdWorkflow.id}/`, { 
          method: 'DELETE' 
        });
      } catch (cleanupError) {
        executionLogger.warning('Failed to cleanup test workflow', { error: cleanupError.message });
      }

      // Check for errors
      if (result.status === 'error' || result.error) {
        throw new Error(result.error || 'Workflow execution failed');
      }

      if (nodeResult?.status === 'error' || nodeResult?.error) {
        throw new Error(nodeResult.error || 'Node execution failed');
      }

      // Extract output
      let output = 'Execution completed';
      if (nodeResult?.output) {
        if (typeof nodeResult.output === 'string') {
          output = nodeResult.output;
        } else if (nodeResult.output.response) {
          output = nodeResult.output.response;
        } else if (nodeResult.output.text) {
          output = nodeResult.output.text;
        } else {
          output = JSON.stringify(nodeResult.output, null, 2);
        }
      }

      executionLogger.logNodeExecution(nodeId, nodeType, 'completed', { output });

      // Notify completion
      if (this.onNodeComplete) {
        this.onNodeComplete(nodeId, { status: 'completed', output });
      }

      return { success: true, output };

    } catch (error) {
      executionLogger.logNodeExecution(nodeId, nodeType, 'error', { error: error.message });
      
      if (this.onNodeComplete) {
        this.onNodeComplete(nodeId, { status: 'error', error: error.message });
      }

      if (this.onError) {
        this.onError(nodeId, error);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Execute full workflow with animations
   */
  async executeWorkflow(workflowId, nodes, edges, triggerData = {}) {
    executionLogger.logWorkflowExecution(workflowId, 'start', { 
      nodeCount: nodes.length,
      edgeCount: edges.length
    });

    try {
      // Create or update workflow
      const workflowData = {
        name: 'Workflow Execution',
        description: 'Workflow execution',
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.data.type,
          data: {
            type: node.data.type,
            label: node.data.label,
            properties: node.data.properties || {}
          },
          position: node.position
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle || 'main',
          targetHandle: edge.targetHandle || 'main'
        }))
      };

      // Update workflow
      await fetch(`${this.apiBaseUrl}/workflows/${workflowId}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });

      // Execute workflow
      const response = await fetch(`${this.apiBaseUrl}/workflows/${workflowId}/execute/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger_data: triggerData,
          credentials: {}
        })
      });

      if (!response.ok) {
        throw new Error(`Workflow execution failed: ${response.status}`);
      }

      const result = await response.json();

      // Process node states with animations
      if (result.execution && result.execution.node_states) {
        const nodeStates = result.execution.node_states;
        const executionOrder = result.execution.execution_order || Object.keys(nodeStates);

        for (const nodeId of executionOrder) {
          const nodeState = nodeStates[nodeId];
          const node = nodes.find(n => n.id === nodeId);

          if (node && nodeState) {
            // Set to running
            executionLogger.logNodeExecution(nodeId, node.data.label, 'running');
            
            if (this.onNodeStart) {
              this.onNodeStart(nodeId, { status: 'running' });
            }

            // Animation delay
            await new Promise(resolve => setTimeout(resolve, this.animationDelay));

            // Complete
            executionLogger.logNodeExecution(
              nodeId, 
              node.data.label, 
              nodeState.status,
              { output: nodeState.output, error: nodeState.error }
            );

            if (this.onNodeComplete) {
              this.onNodeComplete(nodeId, nodeState);
            }
          }
        }
      }

      executionLogger.logWorkflowExecution(workflowId, result.status === 'error' ? 'error' : 'completed', {
        duration: result.execution?.duration,
        nodeCount: result.execution?.execution_order?.length
      });

      if (this.onWorkflowComplete) {
        this.onWorkflowComplete(result);
      }

      return { success: true, result };

    } catch (error) {
      executionLogger.logWorkflowExecution(workflowId, 'error', { error: error.message });
      
      if (this.onError) {
        this.onError(null, error);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Validate nodes before execution
   */
  validateNodes(nodes, nodeTypeDefinitions) {
    const invalidNodes = [];

    for (const node of nodes) {
      const nodeTypeDef = nodeTypeDefinitions[node.data.type];
      const properties = node.data.properties || {};

      // Check required properties
      if (nodeTypeDef?.properties) {
        const requiredProps = Object.entries(nodeTypeDef.properties)
          .filter(([key, prop]) => prop.required);

        for (const [key, prop] of requiredProps) {
          if (!properties[key] || properties[key] === '') {
            invalidNodes.push({ 
              id: node.id, 
              label: node.data.label, 
              error: `Missing: ${prop.label}` 
            });
            break;
          }
        }
      }

      // Check API keys
      if (node.data.type?.includes('groq') || node.data.type?.includes('gpt') || node.data.type?.includes('claude')) {
        const apiKey = properties.api_key;
        if (!apiKey || apiKey.length < 10) {
          invalidNodes.push({ 
            id: node.id, 
            label: node.data.label, 
            error: 'API key required' 
          });
        }
      }
    }

    if (invalidNodes.length > 0) {
      executionLogger.warning('Validation failed', { invalidNodes });
    }

    return {
      valid: invalidNodes.length === 0,
      invalidNodes
    };
  }
}

/**
 * Create executor instance
 */
export const createWorkflowExecutor = (config) => {
  return new WorkflowExecutor(config);
};

