import { createProcessingNode } from '../base/nodeFactory';
import { textProperty, keyValueProperty, codeProperty } from '../base/commonProperties';

export const dataNodes = {
  'filter': createProcessingNode({
    name: 'Filter',
    category: 'Data',
    color: '#06b6d4',
    icon: 'FiFilter',
    description: 'Remove items matching a condition',
    properties: {
      field: textProperty('Field', true),
      operator: {
        type: 'select',
        label: 'Operator',
        default: 'equals',
        options: ['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan']
      },
      value: textProperty('Value', false)
    }
  }),

  'edit-fields': createProcessingNode({
    name: 'Edit Fields',
    category: 'Data',
    color: '#3b82f6',
    icon: 'FiEdit3',
    description: 'Modify, add, or remove item fields',
    properties: {
      fields: keyValueProperty('Fields')
    }
  }),

  'code': createProcessingNode({
    name: 'Code',
    category: 'Data',
    color: '#607D8B',
    icon: 'FiCode',
    description: 'Run custom JavaScript or Python code',
    properties: {
      language: {
        type: 'select',
        label: 'Language',
        default: 'javascript',
        options: ['javascript', 'python']
      },
      code: codeProperty('javascript')
    }
  }),

  'notes': createProcessingNode({
    name: 'Notes',
    category: 'Data',
    color: '#8b5cf6',
    icon: 'FiFileText',
    description: 'Add notes and documentation (Markdown supported)',
    properties: {
      content: {
        type: 'textarea',
        label: 'Notes Content',
        default: '',
        placeholder: 'Enter your notes here... (Markdown supported)',
        required: false
      }
    }
  })
};
