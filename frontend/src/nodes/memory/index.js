import { createMemoryNode } from '../base/nodeFactory';
import { valueProperty, textProperty, selectProperty } from '../base/commonProperties';

export const memoryNodes = {
  'window-buffer-memory': createMemoryNode({
    name: 'Window Buffer Memory',
    category: 'Memory',
    color: '#8b5cf6',
    icon: 'FiDatabase',
    description: 'Maintains a sliding window of recent messages using Alith SDK',
    properties: {
      windowSize: valueProperty(20, 1, 1000, 'Window Size', 'Number of messages to keep in memory')
    }
  }),

  'agent-flow-db-memory': createMemoryNode({
    name: 'Agent Flow DB Memory',
    category: 'Memory',
    color: '#10b981',
    icon: 'FiDatabase',
    description: 'Persistent memory storage using Django database - survives server restarts',
    properties: {
      windowSize: valueProperty(20, 1, 1000, 'Window Size', 'Number of messages to keep in memory')
    }
  }),

  'simple-memory': createMemoryNode({
    name: 'Simple Memory',
    category: 'Memory',
    color: '#8b5cf6',
    icon: 'FiDatabase',
    description: 'Simple memory storage for conversation context (legacy)',
    properties: {
      maxMessages: valueProperty(10, 1, 100, 'Max Messages', 'Maximum number of messages to store')
    }
  }),

  'vector-memory': createMemoryNode({
    name: 'Vector Memory',
    category: 'Memory',
    color: '#8b5cf6',
    icon: 'FiDatabase',
    description: 'Store and retrieve information using vector embeddings (legacy)',
    properties: {
      collection: textProperty('Collection Name', true, 'default')
    }
  })
};
