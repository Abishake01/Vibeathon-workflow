/**
 * Enhanced API service with JWT token authentication
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    // Load tokens from localStorage on initialization
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    this.isRefreshing = false;
    this.refreshPromise = null;
    
    if (this.accessToken) {
      console.log('🔑 Loaded access token from localStorage');
    }
  }

  /**
   * Get access token from localStorage
   */
  getAccessToken() {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('accessToken');
    }
    return this.accessToken;
  }

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken() {
    if (!this.refreshToken) {
      this.refreshToken = localStorage.getItem('refreshToken');
    }
    return this.refreshToken;
  }

  /**
   * Set tokens in localStorage and memory
   */
  setTokens(access, refresh) {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (access) {
      localStorage.setItem('accessToken', access);
    }
    if (refresh) {
      localStorage.setItem('refreshToken', refresh);
    }
  }

  /**
   * Clear tokens from localStorage and memory
   */
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    // Prevent multiple simultaneous refresh requests
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._refreshTokenInternal();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Internal refresh token implementation
   */
  async _refreshTokenInternal() {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      if (data.access) {
        this.setTokens(data.access, refresh); // Keep the same refresh token
        return data.access;
      }
      throw new Error('No access token in refresh response');
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokens();
      throw error;
    }
  }

  /**
   * Get default headers with JWT token
   */
  async getHeaders(includeContentType = true, isFormData = false) {
    const headers = {};

    if (includeContentType && !isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    // Add JWT token if available
    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔑 Adding JWT token to request');
    } else {
      console.warn('⚠️ No JWT token available for request');
    }

    return {
      ...headers,
      'X-Requested-With': 'XMLHttpRequest',
    };
  }

  /**
   * Enhanced request method with automatic token refresh and retry
   */
  async request(endpoint, options = {}, retryCount = 0) {
    const maxRetries = 2;
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    const isFormData = options.body instanceof FormData;
    const method = options.method || 'GET';

    try {
      // Get headers with JWT token
      const headers = await this.getHeaders(
        options.body && typeof options.body === 'string' && !isFormData,
        isFormData
      );

      const config = {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        credentials: 'include', // Include cookies for session fallback
      };

      // Debug logging
      if (method !== 'GET') {
        console.log(`📤 ${method} ${endpoint}`, {
          hasToken: !!this.getAccessToken(),
          headers: Object.keys(config.headers)
        });
      }

      const response = await fetch(url, config);

      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401 && retryCount < maxRetries) {
        console.warn('⚠️ 401 Unauthorized - attempting token refresh...');
        
        try {
          // Try to refresh the token
          await this.refreshAccessToken();
          
          // Retry the request with new token
          console.log('🔄 Retrying request with refreshed token...');
          return this.request(endpoint, options, retryCount + 1);
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          // Clear tokens and redirect to login
          this.clearTokens();
          localStorage.removeItem('authUser');
          
          // Dispatch event for auth context
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          
          const error = new Error('Authentication failed - Please login again');
          error.status = 401;
          throw error;
        }
      }

      // Handle 403 Forbidden
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({ error: 'Forbidden' }));
        const error = new Error(errorData.error || errorData.message || 'Access forbidden');
        error.response = errorData;
        error.status = 403;
        throw error;
      }

      // Handle 500 Internal Server Error - might be temporary
      if (response.status === 500 && retryCount < maxRetries) {
        console.warn('⚠️ 500 Internal Server Error - retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.request(endpoint, options, retryCount + 1);
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `Request failed with status ${response.status}`,
        }));

        const errorMessage =
          errorData.message ||
          errorData.error ||
          errorData.detail ||
          `Request failed with status ${response.status}`;

        const error = new Error(errorMessage);
        error.response = errorData;
        error.status = response.status;
        throw error;
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        if (!text || text.trim() === '') {
          return null;
        }
        try {
          return JSON.parse(text);
        } catch (e) {
          console.warn('Failed to parse JSON response:', e);
          return text;
        }
      }

      return await response.text();
    } catch (error) {
      // Network errors - retry with exponential backoff
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        if (retryCount < maxRetries) {
          console.warn(`⚠️ Network error - retrying (${retryCount + 1}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));
          return this.request(endpoint, options, retryCount + 1);
        }
      }

      console.error('❌ API request error:', {
        endpoint,
        method,
        error: error.message,
        status: error.status,
        response: error.response,
      });

      throw error;
    }
  }

  // Authentication methods
  async signup(userData) {
    const response = await this.request('/auth/signup/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    // Store tokens if provided
    if (response.access && response.refresh) {
      this.setTokens(response.access, response.refresh);
    }
    
    return response;
  }

  async signin(credentials) {
    const response = await this.request('/auth/signin/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // Store tokens if provided
    if (response.access && response.refresh) {
      this.setTokens(response.access, response.refresh);
    }
    
    return response;
  }

  async signout() {
    try {
      const refresh = this.getRefreshToken();
      await this.request('/auth/signout/', {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      });
    } finally {
      // Always clear tokens on logout
      this.clearTokens();
      localStorage.removeItem('authUser');
    }
  }

  async getCurrentUser() {
    return this.request('/auth/me/');
  }

  async checkAuth() {
    return this.request('/auth/check/');
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
      
      if (response.ok) {
        const data = await response.json();
        return data.csrfToken || data.csrftoken || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      return null;
    }
  }

  // JWT token management
  async refreshToken() {
    return await this.refreshAccessToken();
  }

  async verifyToken(token) {
    return this.request('/auth/token/verify/', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
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
