// Page Event Trigger Node - Triggers workflows from page builder events

export const pageEventTriggerNode = {
  name: 'Page Event Trigger',
  description: 'Trigger workflow from page builder events (button clicks, form submissions, etc.)',
  category: 'Triggers',
  color: '#f59e0b',
  icon: '⚡',
  nodeType: 'trigger',
  
  inputs: [],
  
  outputs: [
    {
      name: 'main',
      type: 'main',
      displayName: 'Event Data'
    }
  ],
  
  properties: {
    event_type: {
      type: 'select',
      label: 'Event Type',
      required: true,
      defaultValue: 'button_click',
      options: [
        { value: 'button_click', label: 'Button Click' },
        { value: 'form_submit', label: 'Form Submit' },
        { value: 'page_load', label: 'Page Load' },
        { value: 'element_click', label: 'Element Click' },
        { value: 'custom_event', label: 'Custom Event' }
      ],
      description: 'Type of event to listen for'
    },
    element_id: {
      type: 'text',
      label: 'Element ID',
      required: false,
      placeholder: 'button-1',
      description: 'ID of the element to listen to (leave empty for page-level events)'
    },
    custom_event_name: {
      type: 'text',
      label: 'Custom Event Name',
      required: false,
      placeholder: 'myCustomEvent',
      description: 'Name of custom event (only for custom event type)'
    },
    debounce_ms: {
      type: 'number',
      label: 'Debounce (ms)',
      required: false,
      defaultValue: 0,
      min: 0,
      max: 5000,
      description: 'Delay before triggering workflow (milliseconds)'
    },
    extract_data: {
      type: 'toggle',
      label: 'Extract Form Data',
      required: false,
      defaultValue: true,
      description: 'Extract form data from event (for form submissions)'
    }
  }
};

export default pageEventTriggerNode;

