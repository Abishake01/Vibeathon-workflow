// Execution Engine - Integrated with Django Backend
import { workflowApi } from './api/workflowApi';

export class ExecutionEngine {
  constructor() {
    this.executions = [];
    this.currentExecution = null;
    this.listeners = [];
    this.workflowId = null;
    this.credentials = {};
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.currentExecution));
  }

  setWorkflowId(workflowId) {
    this.workflowId = workflowId;
  }

  setCredentials(credentials) {
    this.credentials = credentials;
  }

  /**
   * Execute entire workflow or from a specific node
   */
  async executeWorkflow(nodes, edges, startNodeId = null, triggerData = {}) {
    try {
      // First, save/update workflow if needed
      if (!this.workflowId) {
        const workflow = await workflowApi.createWorkflow({
          name: 'Untitled Workflow',
          description: '',
          nodes: nodes,
          edges: edges,
        });
        this.workflowId = workflow.id;
      } else {
        // Update existing workflow
        await workflowApi.updateWorkflow(this.workflowId, {
          nodes: nodes,
          edges: edges,
        });
      }

      // Initialize execution state
      this.currentExecution = {
        id: null,
        status: 'running',
        startedAt: new Date().toISOString(),
        nodeStates: {},
        data: {},
        currentNodeId: null
      };
      this.notify();

      let result;
      
      if (startNodeId) {
        // Execute from specific node
        result = await workflowApi.executeNode(
          this.workflowId,
          startNodeId,
          triggerData,
          this.credentials
        );
      } else {
        // Execute entire workflow
        result = await workflowApi.executeWorkflow(
          this.workflowId,
          triggerData,
          this.credentials
        );
      }

      // Update execution state with backend response
      this.currentExecution = {
        id: result.execution_id,
        status: result.execution.status,
        startedAt: result.execution.start_time,
        finishedAt: result.execution.end_time,
        nodeStates: this.formatNodeStates(result.execution.node_states),
        executionOrder: result.execution.execution_order,
        errors: result.execution.errors,
        chatResponse: result.execution.chat_response,
      };
      
      this.notify();
      return this.currentExecution;

    } catch (error) {
      console.error('Workflow execution failed:', error);
      
      this.currentExecution = {
        ...this.currentExecution,
        status: 'error',
        error: error.message,
        finishedAt: new Date().toISOString(),
      };
      
      this.notify();
      throw error;
    }
  }

  /**
   * Execute a single node
   */
  async executeNode(nodeId, nodes, edges, triggerData = {}) {
    return this.executeWorkflow(nodes, edges, nodeId, triggerData);
  }

  /**
   * Format node states from backend response for frontend consumption
   */
  formatNodeStates(nodeStates) {
    const formatted = {};
    
    for (const [nodeId, state] of Object.entries(nodeStates)) {
      formatted[nodeId] = {
        status: state.status,
        startedAt: state.timestamp,
        input: state.input,
        output: state.output,
        error: state.error,
      };
    }
    
    return formatted;
  }

  /**
   * Trigger workflow from chat
   */
  async triggerFromChat(nodes, edges, message, user = 'anonymous', channel = '') {
    try {
      // Ensure workflow is saved
      if (!this.workflowId) {
        const workflow = await workflowApi.createWorkflow({
          name: 'Chat Workflow',
          description: 'Triggered from chat',
          nodes: nodes,
          edges: edges,
        });
        this.workflowId = workflow.id;
      }

      // Initialize execution state
      this.currentExecution = {
        id: null,
        status: 'running',
        startedAt: new Date().toISOString(),
        nodeStates: {},
        data: {},
      };
      this.notify();

      // Trigger via chat API
      const result = await workflowApi.triggerChat(
        this.workflowId,
        message,
        user,
        channel
      );

      // Update execution state
      this.currentExecution = {
        id: result.execution_id,
        status: result.execution.status,
        startedAt: result.execution.start_time,
        finishedAt: result.execution.end_time,
        nodeStates: this.formatNodeStates(result.execution.node_states),
        executionOrder: result.execution.execution_order,
        errors: result.execution.errors,
        chatResponse: result.chat_response,
      };
      
      this.notify();
      return this.currentExecution;

    } catch (error) {
      console.error('Chat trigger failed:', error);
      
      this.currentExecution = {
        ...this.currentExecution,
        status: 'error',
        error: error.message,
        finishedAt: new Date().toISOString(),
      };
      
      this.notify();
      throw error;
    }
  }

  /**
   * Get execution history
   */
  async getExecutionHistory() {
    if (!this.workflowId) return [];
    
    try {
      const executions = await workflowApi.getExecutions(this.workflowId);
      return executions;
    } catch (error) {
      console.error('Failed to fetch execution history:', error);
      return [];
    }
  }

  /**
   * Get execution status (for polling)
   */
  async pollExecutionStatus(executionId, onUpdate) {
    const maxPolls = 60; // 60 seconds max
    let polls = 0;
    
    const poll = async () => {
      try {
        const status = await workflowApi.getExecutionStatus(executionId);
        
        if (onUpdate) {
          onUpdate(status);
        }
        
        // Continue polling if still running
        if (status.status === 'running' && polls < maxPolls) {
          polls++;
          setTimeout(poll, 1000);
        }
      } catch (error) {
        console.error('Polling failed:', error);
      }
    };
    
    poll();
  }

  stopExecution() {
    if (this.currentExecution) {
      this.currentExecution.status = 'stopped';
      this.currentExecution.finishedAt = new Date().toISOString();
      this.notify();
    }
  }

  getExecutionState() {
    return this.currentExecution;
  }

  // Utility delay function (still useful for UI animations)
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const executionEngine = new ExecutionEngine();
