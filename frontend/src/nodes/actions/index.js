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
  }),

  'google-sheets': createProcessingNode({
    name: 'Google Sheets',
    category: 'Actions',
    color: '#34a853',
    icon: 'SiGooglesheets',
    description: 'Read, update and write data to Google Sheets',
    properties: {
      operation: operationProperty(['append', 'update', 'read', 'delete'], 'append'),
      spreadsheetId: textProperty('Spreadsheet ID', true),
      range: textProperty('Range', true)
    }
  })
};
