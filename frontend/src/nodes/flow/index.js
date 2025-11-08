import { createConditionalNode, createNode } from '../base/nodeFactory';

export const flowNodes = {
  'if-else': createConditionalNode({
    name: 'If',
    category: 'Flow',
    color: '#9C27B0',
    icon: 'FiGitBranch',
    description: 'Route items to different branches (true/false)',
    properties: {
      conditions: {
        type: 'conditionGroup',
        label: 'Conditions',
        default: [{
          field: '',
          operator: 'equals',
          value: ''
        }]
      },
      combineOperation: {
        type: 'select',
        label: 'Combine',
        default: 'AND',
        options: ['AND', 'OR']
      }
    }
  }),

  'switch': createNode({
    name: 'Switch',
    category: 'Flow',
    color: '#E91E63',
    icon: 'BiNetworkChart',
    description: 'Route items depending on defined expression or rules',
    inputs: [
      { name: 'main', type: 'main', required: true, displayName: 'Input' }
    ],
    outputs: [
      { name: 'output0', type: 'main', displayName: 'Output 0' },
      { name: 'output1', type: 'main', displayName: 'Output 1' },
      { name: 'output2', type: 'main', displayName: 'Output 2' },
      { name: 'output3', type: 'main', displayName: 'Output 3' }
    ],
    properties: {
      mode: {
        type: 'select',
        label: 'Mode',
        default: 'rules',
        options: ['rules', 'expression']
      }
    }
  }),

  'merge': createNode({
    name: 'Merge',
    category: 'Flow',
    color: '#795548',
    icon: 'FiGitMerge',
    description: 'Merges data of multiple streams once data from both is available',
    inputs: [
      { name: 'input1', type: 'main', required: true, displayName: 'Input 1' },
      { name: 'input2', type: 'main', required: true, displayName: 'Input 2' }
    ],
    outputs: [
      { name: 'main', type: 'main', displayName: 'Output' }
    ],
    properties: {
      mode: {
        type: 'select',
        label: 'Mode',
        default: 'append',
        options: ['append', 'merge', 'choose']
      }
    }
  })
};
