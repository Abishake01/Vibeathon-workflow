/**
 * Workflow API Service
 * Handles all communication with the Django backend
 * Now uses the centralized apiService for authentication
 */

import apiService from '../services/api';

class WorkflowAPI {
  /**
   * Generic request handler - uses apiService
   */
  async request(endpoint, options = {}) {
    return apiService.request(endpoint, options);
  }

  // ==================== Workflow Operations ====================

  /**
   * Get all workflows
   */
  async getWorkflows() {
    return this.request('/workflows/');
  }

  /**
   * Get a single workflow by ID
   */
  async getWorkflow(workflowId) {
    return this.request(`/workflows/${workflowId}/`);
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow) {
    return this.request('/workflows/', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(workflowId, workflow) {
    return this.request(`/workflows/${workflowId}/`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId) {
    return this.request(`/workflows/${workflowId}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Validate workflow structure
   */
  async validateWorkflow(nodes, edges) {
    return this.request('/workflows/validate/', {
      method: 'POST',
      body: JSON.stringify({ nodes, edges }),
    });
  }

  // ==================== Execution Operations ====================

  /**
   * Execute entire workflow
   */
  async executeWorkflow(workflowId, triggerData = {}, credentials = {}) {
    return this.request(`/workflows/${workflowId}/execute/`, {
      method: 'POST',
      body: JSON.stringify({
        trigger_data: triggerData,
        credentials: {
          openai_api_key: credentials.openai_api_key,
          anthropic_api_key: credentials.anthropic_api_key,
          google_api_key: credentials.google_api_key,
          groq_api_key: credentials.groq_api_key,
          ...credentials
        },
      }),
    });
  }

  /**
   * Execute a single node in the workflow
   */
  async executeNode(workflowId, nodeId, triggerData = {}, credentials = {}) {
    return this.request(`/workflows/${workflowId}/execute_node/`, {
      method: 'POST',
      body: JSON.stringify({
        node_id: nodeId,
        trigger_data: triggerData,
        credentials: {
          openai_api_key: credentials.openai_api_key,
          anthropic_api_key: credentials.anthropic_api_key,
          google_api_key: credentials.google_api_key,
          groq_api_key: credentials.groq_api_key,
          ...credentials
        },
      }),
    });
  }

  /**
   * Get execution history for a workflow
   */
  async getExecutions(workflowId) {
    return this.request(`/workflows/${workflowId}/executions/`);
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId) {
    return this.request(`/executions/${executionId}/status/`);
  }

  /**
   * Trigger workflow from chat message
   */
  async triggerChat(workflowId, message, user = 'anonymous', channel = '') {
    return this.request('/trigger/chat/', {
      method: 'POST',
      body: JSON.stringify({
        workflow_id: workflowId,
        message: message,
        user: user,
        channel: channel,
      }),
    });
  }

  // ==================== Credential Operations ====================

  /**
   * Get all credentials
   */
  async getCredentials() {
    return this.request('/credentials/');
  }

  /**
   * Create a new credential
   */
  async createCredential(credential) {
    return this.request('/credentials/', {
      method: 'POST',
      body: JSON.stringify(credential),
    });
  }

  /**
   * Update a credential
   */
  async updateCredential(credentialId, credential) {
    return this.request(`/credentials/${credentialId}/`, {
      method: 'PUT',
      body: JSON.stringify(credential),
    });
  }

  /**
   * Delete a credential
   */
  async deleteCredential(credentialId) {
    return this.request(`/credentials/${credentialId}/`, {
      method: 'DELETE',
    });
  }

  // ==================== AI Chat Operations ====================

  /**
   * Send message to AI chatbot
   */
  async sendAIChat(message, conversationHistory = []) {
    return this.request('/ai-chat/', {
      method: 'POST',
      body: JSON.stringify({
        message: message,
        conversation_history: conversationHistory,
      }),
    });
  }

  // ==================== Memory Operations ====================

  /**
   * Get available memory types from Alith SDK
   */
  async getAvailableMemoryTypes() {
    return this.request('/memory/types/');
  }

  /**
   * Test memory connection and configuration
   */
  async testMemoryConnection(memoryType, config = {}) {
    return this.request('/memory/test-connection/', {
      method: 'POST',
      body: JSON.stringify({
        memory_type: memoryType,
        config: config,
      }),
    });
  }

  /**
   * Get memory usage statistics
   */
  async getMemoryStatistics() {
    return this.request('/memory/statistics/');
  }
}

// Export singleton instance
export const workflowApi = new WorkflowAPI();
export default workflowApi;

