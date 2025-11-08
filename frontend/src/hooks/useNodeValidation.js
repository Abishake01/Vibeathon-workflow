/**
 * Node Validation Hook
 * Validates node configuration and properties
 */

import { useState, useEffect, useCallback } from 'react';
import { nodeTypeDefinitions } from '../nodes';

/**
 * Validation hook for workflow nodes
 * @param {Object} node - Node data
 * @param {Object} properties - Node properties
 * @returns {Object} - { isValid, errors, validate }
 */
export const useNodeValidation = (node, properties = {}) => {
  const [isValid, setIsValid] = useState(true);
  const [errors, setErrors] = useState([]);

  const validate = useCallback(() => {
    if (!node) {
      setIsValid(true);
      setErrors([]);
      return { valid: true, errors: [] };
    }

    const nodeTypeDef = nodeTypeDefinitions[node.data?.type || node.type];
    if (!nodeTypeDef) {
      return { valid: true, errors: [] };
    }

    const validationErrors = [];

    // Check required properties
    if (nodeTypeDef.properties) {
      Object.entries(nodeTypeDef.properties).forEach(([key, propDef]) => {
        if (propDef.required) {
          const value = properties[key];
          if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
            validationErrors.push({
              field: key,
              message: `${propDef.label} is required`
            });
          }
        }
      });
    }

    // Validate API keys
    const nodeType = node.data?.type || node.type;
    if (nodeType?.includes('groq') || nodeType?.includes('gpt') || nodeType?.includes('claude') || nodeType?.includes('openai')) {
      const apiKey = properties.api_key;
      if (!apiKey || apiKey.length < 10) {
        validationErrors.push({
          field: 'api_key',
          message: 'Valid API key is required'
        });
      }
    }

    const valid = validationErrors.length === 0;
    setIsValid(valid);
    setErrors(validationErrors);

    return { valid, errors: validationErrors };
  }, [node, properties]);

  useEffect(() => {
    validate();
  }, [validate]);

  return {
    isValid,
    errors,
    validate,
    hasErrors: errors.length > 0,
    errorMessage: errors.map(e => e.message).join(', ')
  };
};

