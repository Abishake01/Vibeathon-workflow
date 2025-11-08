import { createNode } from '../base/nodeFactory';
import { messageProperty } from '../base/commonProperties';

export const outputNodes = {
  'respond-to-chat': createNode({
    name: 'Respond to Chat',
    category: 'Output',
    color: '#06b6d4',
    icon: 'FiMessageSquare',
    description: 'Send a response back to the chat',
    inputs: [
      { name: 'main', type: 'main', required: true, displayName: 'Input' }
    ],
    outputs: [],
    properties: {
      message: {
        ...messageProperty(false),
        label: 'Message'
      }
    }
  }),

  'readme-viewer': createNode({
    name: 'README Viewer',
    category: 'Output',
    color: '#10b981',
    icon: 'FiFileText',
    description: 'Display text content in a formatted viewer',
    inputs: [
      { name: 'main', type: 'main', required: true, displayName: 'Input' }
    ],
    outputs: [],
    properties: {
      title: {
        type: 'text',
        label: 'Title',
        default: 'Content Viewer',
        placeholder: 'Enter a title for the content',
        description: 'Title to display above the content'
      }
    }
  })
};
