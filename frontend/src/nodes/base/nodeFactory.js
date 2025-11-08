/**
 * Node Factory
 * Creates standardized node definitions with consistent structure
 */

/**
 * Create a base node definition
 * @param {Object} config - Node configuration
 * @returns {Object} Complete node definition
 */
export const createNode = ({
  name,
  category,
  color,
  icon,
  description,
  nodeType = 'standard',
  inputs = [],
  outputs = [],
  properties = {}
}) => {
  return {
    name,
    category,
    color,
    icon,
    description,
    nodeType,
    inputs,
    outputs,
    properties
  };
};

/**
 * Create a trigger node (no inputs)
 */
export const createTriggerNode = (config) => {
  return createNode({
    ...config,
    nodeType: 'trigger',
    inputs: []
  });
};

/**
 * Create an AI agent node
 */
export const createAgentNode = (config) => {
  return createNode({
    ...config,
    nodeType: 'agent',
    inputs: [
      { name: 'main', type: 'main', required: true, displayName: 'Input' },
      { name: 'chat-model', type: 'ai', required: false, displayName: 'Chat Model*', maxConnections: 1 },
      { name: 'memory', type: 'ai', required: false, displayName: 'Memory', maxConnections: 1 },
      { name: 'tools', type: 'ai', required: false, displayName: 'Tools', maxConnections: -1 }
    ],
    outputs: [
      { name: 'main', type: 'main', displayName: 'Output' }
    ]
  });
};

/**
 * Create a chat model node
 */
export const createChatModelNode = (config) => {
  return createNode({
    ...config,
    nodeType: 'chat-model',
    inputs: [
      { name: 'main', type: 'ai', required: false, displayName: 'Input' }
    ],
    outputs: [
      { name: 'main', type: 'ai', displayName: 'Model' }
    ]
  });
};

/**
 * Create a memory node
 */
export const createMemoryNode = (config) => {
  return createNode({
    ...config,
    nodeType: 'memory',
    inputs: [
      { name: 'main', type: 'main', required: false, displayName: 'Input' }
    ],
    outputs: [
      { name: 'main', type: 'ai', displayName: 'Memory' }
    ]
  });
};

/**
 * Create a tool node
 */
export const createToolNode = (config) => {
  return createNode({
    ...config,
    nodeType: 'tool',
    inputs: [
      { name: 'main', type: 'main', required: false, displayName: 'Input' }
    ],
    outputs: [
      { name: 'main', type: 'ai', displayName: 'Tool' }
    ]
  });
};

/**
 * Create a standard processing node
 */
export const createProcessingNode = (config) => {
  return createNode({
    ...config,
    inputs: [
      { name: 'main', type: 'main', required: true, displayName: 'Input' }
    ],
    outputs: [
      { name: 'main', type: 'main', displayName: 'Output' }
    ]
  });
};

/**
 * Create a conditional node (true/false outputs)
 */
export const createConditionalNode = (config) => {
  return createNode({
    ...config,
    inputs: [
      { name: 'main', type: 'main', required: true, displayName: 'Input' }
    ],
    outputs: [
      { name: 'true', type: 'main', displayName: 'True' },
      { name: 'false', type: 'main', displayName: 'False' }
    ]
  });
};

