// Render UI Component Node - Displays page builder components in workflows

export const renderUIComponentNode = {
  name: 'Render UI Component',
  description: 'Display a page builder component or page',
  category: 'UI',
  color: '#ec4899',
  icon: '🎨',
  nodeType: 'action',
  
  inputs: [
    {
      name: 'main',
      type: 'main',
      displayName: 'Trigger',
      required: true
    },
    {
      name: 'component_data',
      type: 'main',
      displayName: 'Component Data',
      required: false
    }
  ],
  
  outputs: [
    {
      name: 'main',
      type: 'main',
      displayName: 'Output'
    }
  ],
  
  properties: {
    component_id: {
      type: 'text',
      label: 'Component ID',
      required: true,
      placeholder: 'Enter component or page ID',
      description: 'ID of the component or page to render'
    },
    render_mode: {
      type: 'select',
      label: 'Render Mode',
      required: true,
      defaultValue: 'inline',
      options: [
        { value: 'inline', label: 'Inline' },
        { value: 'modal', label: 'Modal' },
        { value: 'fullscreen', label: 'Fullscreen' }
      ],
      description: 'How to display the component'
    },
    width: {
      type: 'text',
      label: 'Width',
      required: false,
      defaultValue: '100%',
      placeholder: '100%',
      description: 'Component width (CSS value)'
    },
    height: {
      type: 'text',
      label: 'Height',
      required: false,
      defaultValue: 'auto',
      placeholder: 'auto',
      description: 'Component height (CSS value)'
    }
  }
};

export default renderUIComponentNode;

