import { createTriggerNode } from '../base/nodeFactory';
import {
  channelProperty,
  webhookPathProperty,
  httpMethodsMultiProperty,
  intervalProperty,
  valueProperty,
  textProperty
} from '../base/commonProperties';

export const triggerNodes = {
  'when-chat-received': createTriggerNode({
    name: 'When Chat Message Received',
    category: 'Triggers',
    color: '#10b981',
    icon: 'FiMessageSquare',
    description: 'Triggers when a chat message is received',
    outputs: [
      { name: 'main', type: 'ai', displayName: 'Output' }
    ],
    properties: {
      channel: channelProperty
    }
  }),

  'webhook': createTriggerNode({
    name: 'Webhook',
    category: 'Triggers',
    color: '#FF9800',
    icon: 'FiSend',
    description: 'Starts the workflow when a webhook is called',
    outputs: [
      { name: 'main', type: 'main', displayName: 'Output' }
    ],
    properties: {
      path: webhookPathProperty,
      method: httpMethodsMultiProperty
    }
  }),

  'schedule': createTriggerNode({
    name: 'Schedule',
    category: 'Triggers',
    color: '#f59e0b',
    icon: 'FiCalendar',
    description: 'Runs the flow every day, hour, or custom interval',
    outputs: [
      { name: 'main', type: 'main', displayName: 'Output' }
    ],
    properties: {
      interval: intervalProperty,
      value: valueProperty(1, 1)
    }
  }),

  'manual-trigger': createTriggerNode({
    name: 'Manual Trigger',
    category: 'Triggers',
    color: '#8b5cf6',
    icon: 'FiUsers',
    description: 'Runs the flow on clicking a button',
    outputs: [
      { name: 'main', type: 'ai', displayName: 'Output' }
    ],
    properties: {
      message: textProperty('Message', false, 'Enter test message')
    }
  })
};
