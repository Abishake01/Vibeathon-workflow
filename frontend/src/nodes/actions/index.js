import { createProcessingNode } from '../base/nodeFactory';
import { 
  httpMethodProperty, 
  urlProperty, 
  keyValueProperty, 
  jsonProperty,
  operationProperty,
  textProperty
} from '../base/commonProperties';

export const actionNodes = {
  'http-request': createProcessingNode({
    name: 'HTTP Request',
    category: 'Actions',
    color: '#4CAF50',
    icon: 'FiGlobe',
    description: 'Makes an HTTP request and returns the response data',
    properties: {
      method: httpMethodProperty('GET'),
      url: urlProperty(true),
      headers: keyValueProperty('Headers'),
      body: {
        ...jsonProperty('Body', '{}'),
        showIf: { method: ['POST', 'PUT', 'PATCH'] }
      }
    }
  })
  // Removed google-sheets - not fully implemented in backend (placeholder only)
};
