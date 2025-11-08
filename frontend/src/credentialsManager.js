// Credentials Management System with Local Storage
const STORAGE_KEY = 'workflow_credentials';

export const credentialTypes = {
  httpAuth: {
    name: 'HTTP Authentication',
    icon: '🔐',
    fields: [
      { name: 'type', label: 'Auth Type', type: 'select', options: ['Basic', 'Bearer', 'OAuth2'], default: 'Basic' },
      { name: 'username', label: 'Username', type: 'text', showIf: { type: 'Basic' } },
      { name: 'password', label: 'Password', type: 'password', showIf: { type: 'Basic' } },
      { name: 'token', label: 'Token', type: 'password', showIf: { type: 'Bearer' } },
      { name: 'clientId', label: 'Client ID', type: 'text', showIf: { type: 'OAuth2' } },
      { name: 'clientSecret', label: 'Client Secret', type: 'password', showIf: { type: 'OAuth2' } },
      { name: 'accessTokenUrl', label: 'Access Token URL', type: 'text', showIf: { type: 'OAuth2' } }
    ]
  },
  smtp: {
    name: 'SMTP',
    icon: '📧',
    fields: [
      { name: 'host', label: 'Host', type: 'text', required: true, placeholder: 'smtp.gmail.com' },
      { name: 'port', label: 'Port', type: 'number', required: true, default: 587 },
      { name: 'secure', label: 'Secure', type: 'boolean', default: false },
      { name: 'user', label: 'User', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true }
    ]
  },
  database: {
    name: 'Database',
    icon: '🗄️',
    fields: [
      { name: 'type', label: 'Database Type', type: 'select', options: ['MySQL', 'PostgreSQL', 'MongoDB'], default: 'PostgreSQL' },
      { name: 'host', label: 'Host', type: 'text', required: true },
      { name: 'port', label: 'Port', type: 'number', required: true },
      { name: 'database', label: 'Database', type: 'text', required: true },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true }
    ]
  },
  apiKey: {
    name: 'API Key',
    icon: '🔑',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'headerName', label: 'Header Name', type: 'text', default: 'X-API-Key' }
    ]
  }
};

class CredentialsManager {
  constructor() {
    this.credentials = this.loadCredentials();
  }

  loadCredentials() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load credentials:', error);
      return [];
    }
  }

  saveCredentials() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.credentials));
    } catch (error) {
      console.error('Failed to save credentials:', error);
    }
  }

  getAllCredentials() {
    return this.credentials;
  }

  getCredentialsByType(type) {
    return this.credentials.filter(cred => cred.type === type);
  }

  getCredentialById(id) {
    return this.credentials.find(cred => cred.id === id);
  }

  createCredential(credentialData) {
    const newCredential = {
      id: `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: credentialData.name,
      type: credentialData.type,
      data: credentialData.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.credentials.push(newCredential);
    this.saveCredentials();
    return newCredential;
  }

  updateCredential(id, updates) {
    const index = this.credentials.findIndex(cred => cred.id === id);
    if (index !== -1) {
      this.credentials[index] = {
        ...this.credentials[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveCredentials();
      return this.credentials[index];
    }
    return null;
  }

  deleteCredential(id) {
    const index = this.credentials.findIndex(cred => cred.id === id);
    if (index !== -1) {
      this.credentials.splice(index, 1);
      this.saveCredentials();
      return true;
    }
    return false;
  }

  // Test credential connection (mock implementation)
  async testCredential(credentialData) {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'Connection successful' });
      }, 1000);
    });
  }
}

export const credentialsManager = new CredentialsManager();

