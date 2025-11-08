/**
 * API service with authentication support
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Get CSRF token from cookies
   */
  getCsrfToken() {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === name && value) {
        console.log('CSRF token found in cookies');
        return decodeURIComponent(value);
      }
    }
    console.log('CSRF token not found in cookies');
    return null;
  }

  /**
   * Fetch CSRF token from backend
   */
  async fetchCsrfToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/csrf-token/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      // CSRF token might be in response header or body
      let csrfToken = response.headers.get('X-CSRFToken');
      if (!csrfToken) {
        try {
          const data = await response.json();
          csrfToken = data.csrfToken;
        } catch (e) {
          // Ignore JSON parse error
        }
      }
      
      // Wait a bit for cookie to be set by browser
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Always try to get from cookies after fetching (most reliable)
      const cookieToken = this.getCsrfToken();
      if (cookieToken) {
        csrfToken = cookieToken;
      }
      
      console.log('CSRF token fetched:', csrfToken ? 'Token available' : 'No token');
      return csrfToken;
    } catch (error) {
      console.warn('Failed to fetch CSRF token:', error);
      // Try to get from cookies as fallback
      return this.getCsrfToken();
    }
  }

  /**
   * Get default headers with credentials and CSRF token
   */
  async getHeaders(includeContentType = true, isFormData = false, method = 'GET') {
    const headers = {};
    if (includeContentType && !isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Include CSRF token for state-changing methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      // Always try to get from cookies first (most reliable)
      let csrfToken = this.getCsrfToken();
      if (!csrfToken) {
        // Try to fetch if not available
        csrfToken = await this.fetchCsrfToken();
        // After fetching, try cookies again
        if (!csrfToken) {
          csrfToken = this.getCsrfToken();
        }
      }
      if (csrfToken) {
        // Django expects X-CSRFTOKEN (all caps) based on CSRF_HEADER_NAME = 'HTTP_X_CSRFTOKEN'
        // The HTTP_ prefix is added automatically by Django
        headers['X-CSRFTOKEN'] = csrfToken;
        headers['X-CSRFToken'] = csrfToken; // Also try alternative for compatibility
        console.log('Adding CSRF token to headers');
      } else {
        console.warn('No CSRF token available for', method, 'request');
      }
    }
    
    // Include credentials for session-based auth
    return {
      ...headers,
      'X-Requested-With': 'XMLHttpRequest',
    };
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    const isFormData = options.body instanceof FormData;
    const method = options.method || 'GET';
    
    // Get headers with CSRF token
    const headers = await this.getHeaders(
      options.body && typeof options.body === 'string' && !isFormData, 
      isFormData,
      method
    );
    
    const config = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      credentials: 'include', // Include cookies for session auth
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized - user needs to login
      if (response.status === 401) {
        // Clear any stored auth state
        localStorage.removeItem('authUser');
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        throw new Error('Unauthorized - Please login');
      }

      // Handle 403 Forbidden - CSRF token issue
      if (response.status === 403) {
        // Try to get CSRF token and retry once
        const csrfToken = await this.fetchCsrfToken();
        if (csrfToken && method !== 'GET') {
          console.log('Retrying request with CSRF token...');
          // Retry the request with CSRF token (Django expects X-CSRFTOKEN)
          config.headers['X-CSRFTOKEN'] = csrfToken;
          config.headers['X-CSRFToken'] = csrfToken; // Also try alternative
          const retryResponse = await fetch(url, config);
          if (retryResponse.ok) {
            return await retryResponse.json();
          }
        }
        const errorData = await response.json().catch(() => ({ error: 'CSRF verification failed' }));
        const error = new Error(errorData.error || errorData.message || 'CSRF verification failed. Please refresh the page.');
        error.response = errorData;
        error.status = response.status;
        throw error;
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        // Create a more detailed error message
        const errorMessage = errorData.message || errorData.error || `Request failed with status ${response.status}`;
        const error = new Error(errorMessage);
        error.response = errorData; // Attach full response for detailed error handling
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Authentication methods
  async signup(userData) {
    return this.request('/auth/signup/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async signin(credentials) {
    return this.request('/auth/signin/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async signout() {
    return this.request('/auth/signout/', {
      method: 'POST',
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me/');
  }

  async checkAuth() {
    return this.request('/auth/check/');
  }

  async getCsrfToken() {
    return this.request('/auth/csrf-token/');
  }

  // Workflow methods
  async getWorkflows() {
    return this.request('/workflows/');
  }

  async getWorkflow(id) {
    return this.request(`/workflows/${id}/`);
  }

  async createWorkflow(workflowData) {
    return this.request('/workflows/', {
      method: 'POST',
      body: JSON.stringify(workflowData),
    });
  }

  async updateWorkflow(id, workflowData) {
    return this.request(`/workflows/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(workflowData),
    });
  }

  async deleteWorkflow(id) {
    return this.request(`/workflows/${id}/`, {
      method: 'DELETE',
    });
  }

  async executeWorkflow(id, executionData) {
    return this.request(`/workflows/${id}/execute/`, {
      method: 'POST',
      body: JSON.stringify(executionData),
    });
  }

  // UI Builder Project methods
  async getUIProjects() {
    return this.request('/ui-projects/');
  }

  async getUIProject(id) {
    return this.request(`/ui-projects/${id}/`);
  }

  async createUIProject(projectData) {
    return this.request('/ui-projects/', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async updateUIProject(id, projectData) {
    return this.request(`/ui-projects/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  }

  async deleteUIProject(id) {
    return this.request(`/ui-projects/${id}/`, {
      method: 'DELETE',
    });
  }

  // Credential methods
  async getCredentials() {
    return this.request('/credentials/');
  }

  async createCredential(credentialData) {
    return this.request('/credentials/', {
      method: 'POST',
      body: JSON.stringify(credentialData),
    });
  }

  // AI Chat (public endpoint)
  async aiChat(message, conversationHistory, settings) {
    return this.request('/ai-chat/', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_history: conversationHistory,
        settings,
      }),
    });
  }
}

export const apiService = new ApiService();
export default apiService;

