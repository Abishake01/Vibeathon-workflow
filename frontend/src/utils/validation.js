/**
 * Validation Utilities
 * Common validation functions
 */

/**
 * Validate API key format
 */
export const validateApiKey = (apiKey, provider = 'generic') => {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'API key is required' };
  }

  const cleaned = apiKey.trim();

  if (cleaned.length < 10) {
    return { valid: false, error: 'API key is too short' };
  }

  // Provider-specific validation
  const validators = {
    groq: (key) => key.startsWith('gsk_'),
    openai: (key) => key.startsWith('sk-'),
    anthropic: (key) => key.startsWith('sk-ant-'),
    google: (key) => key.length > 20
  };

  const validator = validators[provider.toLowerCase()];
  if (validator && !validator(cleaned)) {
    return { 
      valid: false, 
      error: `Invalid ${provider} API key format` 
    };
  }

  return { valid: true };
};

/**
 * Validate required field
 */
export const validateRequired = (value, fieldName = 'Field') => {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (Array.isArray(value) && value.length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }

  return { valid: true };
};

/**
 * Validate number range
 */
export const validateRange = (value, min, max, fieldName = 'Value') => {
  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  if (min !== undefined && num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { valid: false, error: `${fieldName} must be at most ${max}` };
  }

  return { valid: true };
};

/**
 * Validate URL
 */
export const validateUrl = (url, fieldName = 'URL') => {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: `${fieldName} must be a valid URL` };
  }
};

/**
 * Validate JSON string
 */
export const validateJson = (jsonString, fieldName = 'JSON') => {
  if (!jsonString) {
    return { valid: true }; // Empty is okay
  }

  try {
    JSON.parse(jsonString);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: `${fieldName} must be valid JSON: ${error.message}` };
  }
};

/**
 * Validate email
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || !emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email address' };
  }

  return { valid: true };
};

/**
 * Sanitize input (remove potentially harmful characters)
 */
export const sanitizeInput = (input, options = {}) => {
  if (typeof input !== 'string') return input;

  const {
    allowHtml = false,
    maxLength = null
  } = options;

  let sanitized = input;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove HTML if not allowed
  if (!allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Trim
  sanitized = sanitized.trim();

  // Limit length
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

/**
 * Validate multiple fields
 */
export const validateFields = (fields, definitions) => {
  const errors = {};
  let isValid = true;

  Object.entries(definitions).forEach(([fieldName, rules]) => {
    const value = fields[fieldName];

    if (rules.required) {
      const result = validateRequired(value, rules.label || fieldName);
      if (!result.valid) {
        errors[fieldName] = result.error;
        isValid = false;
        return;
      }
    }

    if (rules.type === 'email') {
      const result = validateEmail(value);
      if (!result.valid) {
        errors[fieldName] = result.error;
        isValid = false;
      }
    }

    if (rules.type === 'url') {
      const result = validateUrl(value, rules.label || fieldName);
      if (!result.valid) {
        errors[fieldName] = result.error;
        isValid = false;
      }
    }

    if (rules.type === 'number' && (rules.min !== undefined || rules.max !== undefined)) {
      const result = validateRange(value, rules.min, rules.max, rules.label || fieldName);
      if (!result.valid) {
        errors[fieldName] = result.error;
        isValid = false;
      }
    }

    if (rules.type === 'json') {
      const result = validateJson(value, rules.label || fieldName);
      if (!result.valid) {
        errors[fieldName] = result.error;
        isValid = false;
      }
    }

    if (rules.custom && typeof rules.custom === 'function') {
      const result = rules.custom(value);
      if (result && !result.valid) {
        errors[fieldName] = result.error;
        isValid = false;
      }
    }
  });

  return { valid: isValid, errors };
};

