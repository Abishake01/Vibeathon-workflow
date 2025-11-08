/**
 * Common Property Definitions
 * Reusable property configurations for nodes
 */

// API Key properties
export const apiKeyProperty = (provider = 'API', prefix = '') => ({
  type: 'password',
  label: `${provider} API Key`,
  default: '',
  placeholder: prefix ? `${prefix}...` : 'Enter your API key',
  required: true,
  description: `Your ${provider} API key for authentication`
});

// Temperature property (common in AI models)
export const temperatureProperty = {
  type: 'number',
  label: 'Temperature',
  default: 0.7,
  min: 0,
  max: 2,
  description: 'Controls randomness. Lower values are more focused, higher values are more creative.'
};

// Max tokens property
export const maxTokensProperty = (defaultValue = 1024) => ({
  type: 'number',
  label: 'Max Tokens',
  default: defaultValue,
  min: 1,
  max: 8192,
  description: 'Maximum number of tokens to generate'
});

// Model selection property
export const modelSelectProperty = (options, defaultValue) => ({
  type: 'select',
  label: 'Model',
  default: defaultValue,
  options,
  required: true,
  description: 'Select the AI model to use'
});

// Test message property
export const testMessageProperty = {
  type: 'text',
  label: 'Test Message',
  default: 'test api key from agent flow',
  placeholder: 'Enter custom test message for API validation',
  description: 'Custom message to test API key validation'
};

// Text/Message input property
export const messageProperty = (required = true) => ({
  type: 'textarea',
  label: 'Message',
  default: '',
  required,
  placeholder: 'Enter your message...',
  description: 'The message or prompt to send'
});

// URL property
export const urlProperty = (required = true) => ({
  type: 'text',
  label: 'URL',
  default: '',
  required,
  placeholder: 'https://example.com',
  description: 'The URL endpoint'
});

// HTTP Method property
export const httpMethodProperty = (defaultValue = 'GET') => ({
  type: 'select',
  label: 'HTTP Method',
  default: defaultValue,
  options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  required: true
});

// Key-value pairs property
export const keyValueProperty = (label = 'Key-Value Pairs') => ({
  type: 'keyValue',
  label,
  default: [],
  description: 'Add key-value pairs'
});

// File path property
export const filePathProperty = (required = true) => ({
  type: 'text',
  label: 'File Path',
  default: '',
  required,
  placeholder: '/path/to/file',
  description: 'Path to the file'
});

// System prompt property (for AI agents)
export const systemPromptProperty = {
  type: 'textarea',
  label: 'System Message',
  default: '# AI Agent System Prompt\n\nYou are a helpful AI assistant.',
  required: true,
  placeholder: 'Enter your system prompt here...',
  description: 'System instructions for the AI agent'
};

// Operation type property
export const operationProperty = (options, defaultValue) => ({
  type: 'select',
  label: 'Operation',
  default: defaultValue,
  options,
  description: 'Select the operation to perform'
});

// Interval property (for scheduling)
export const intervalProperty = {
  type: 'select',
  label: 'Interval',
  default: 'hours',
  options: ['minutes', 'hours', 'days', 'weeks'],
  description: 'Time interval for scheduling'
};

// Value property (for numeric inputs)
export const valueProperty = (defaultValue = 1, min = 1, max = null, label = 'Value', description = 'Numeric value') => ({
  type: 'number',
  label,
  default: defaultValue,
  min,
  ...(max && { max }),
  description
});

// Boolean toggle property
export const booleanProperty = (label, defaultValue = true) => ({
  type: 'boolean',
  label,
  default: defaultValue
});

// Text field property
export const textProperty = (label, required = false, placeholder = '') => ({
  type: 'text',
  label,
  default: '',
  required,
  placeholder,
  description: `Enter ${label.toLowerCase()}`
});

// Select property
export const selectProperty = (label, defaultValue, options, required = false) => ({
  type: 'select',
  label,
  default: defaultValue,
  options,
  required,
  description: `Select ${label.toLowerCase()}`
});

// Code editor property
export const codeProperty = (language = 'javascript') => ({
  type: 'code',
  label: 'Code',
  default: language === 'javascript' 
    ? '// Access input data with $input\nreturn $input;'
    : '# Access input data with $input\nreturn $input',
  language,
  description: `Write ${language} code to process data`
});

// JSON property
export const jsonProperty = (label = 'JSON', defaultValue = '{}') => ({
  type: 'json',
  label,
  default: defaultValue,
  description: 'Enter valid JSON'
});

// Channel property (for chat triggers)
export const channelProperty = {
  type: 'text',
  label: 'Channel ID',
  default: '',
  placeholder: 'Enter channel identifier',
  description: 'Channel or room identifier'
};

// Webhook path property
export const webhookPathProperty = {
  type: 'text',
  label: 'Webhook Path',
  default: '/webhook',
  placeholder: '/my-webhook',
  required: true,
  description: 'URL path for the webhook'
};

// Multi-select HTTP methods
export const httpMethodsMultiProperty = {
  type: 'multiselect',
  label: 'HTTP Methods',
  default: ['POST'],
  options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  description: 'Allowed HTTP methods'
};

// Groq model options
export const groqLlamaModels = [
  { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Fast)' },
  { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile (Powerful)' },
  { value: 'llama-3.1-405b-versatile', label: 'Llama 3.1 405B Versatile (Largest)' },
  { value: 'gemma-7b-it', label: 'Gemma 7B IT' },
  { value: 'gemma-2-9b-it', label: 'Gemma 2 9B IT' },
  { value: 'gemma-2-27b-it', label: 'Gemma 2 27B IT' }
];

export const groqGemmaModels = [
  { value: 'gemma-7b-it', label: 'Gemma 7B IT (Fast)' },
  { value: 'gemma-2-9b-it', label: 'Gemma 2 9B IT (Balanced)' },
  { value: 'gemma-2-27b-it', label: 'Gemma 2 27B IT (Powerful)' }
];

// Claude model options
export const claudeModels = [
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku'
];

