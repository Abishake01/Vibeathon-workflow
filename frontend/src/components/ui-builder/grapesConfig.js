// GrapesJS Configuration

import { simpleBlocks } from './blocks/simpleBlocks';

export const getGrapesConfig = (theme) => {
  const isDark = theme === 'dark';
  
  return {
    // Container selector
    container: '#gjs-editor',
    
    // Size of the editor
    height: 'calc(100vh - 120px)',
    width: 'auto',
    
    // Disable storage manager initially (we'll handle it manually)
    storageManager: {
      type: 'local',
      autosave: true,
      autoload: true,
      stepsBeforeSave: 1,
      options: {
        local: {
          key: 'gjsProject'
        }
      }
    },
    
    // Canvas settings
    canvas: {
      styles: [],
      scripts: []
    },
    
    // Allow drop on canvas
    allowDrop: true,
    
    // Component defaults
    domComponents: {
      defaults: {
        editable: true,
        droppable: true,
        draggable: true,
        selectable: true,
        hoverable: true,
        highlightable: true,
        copyable: true,
        removable: true,
        resizable: {
          tl: 1,
          tc: 1,
          tr: 1,
          cl: 1,
          cr: 1,
          bl: 1,
          bc: 1,
          br: 1
        },
        badgable: true,
        stylable: true,
        traits: ['id', 'title', 'alt', 'href', 'target', 'rel']
      }
    },
    
    // Panels configuration - disabled (using custom UI)
    panels: {
      defaults: []
    },
    
    // Device Manager
    deviceManager: {
      devices: [
        {
          name: 'Desktop',
          width: ''
        },
        {
          name: 'Tablet',
          width: '768px',
          widthMedia: '992px'
        },
        {
          name: 'Mobile',
          width: '375px',
          widthMedia: '480px'
        }
      ]
    },
    
    // Block Manager
    blockManager: {
      appendTo: '#blocks-container',
      blocks: simpleBlocks
    },
    
    // Layer Manager
    layerManager: {
      appendTo: '#layers-container',
      showWrapper: true
    },
    
    // Trait Manager (Component Properties)
    traitManager: {
      appendTo: '#traits-container',
      labelContainer: 'Component Settings'
    },
    
    // Selector Manager (moved to right panel styles tab)
    selectorManager: {
      appendTo: '#selectors-container',
      componentFirst: true
    },
    
    // Style Manager (CSS Styles - in right panel)
    styleManager: {
      appendTo: '#styles-sectors-container',
      sectors: [
        {
          name: 'Layout',
          open: true,
          buildProps: ['display', 'position', 'top', 'right', 'left', 'bottom', 'float', 'clear', 'overflow', 'overflow-x', 'overflow-y']
        },
        {
          name: 'Dimension',
          open: false,
          buildProps: ['width', 'height', 'max-width', 'min-width', 'max-height', 'min-height', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
          properties: [
            {
              type: 'number',
              property: 'width',
              units: ['px', '%', 'vw', 'em', 'rem', 'auto'],
              defaults: 'auto',
              min: 0
            },
            {
              type: 'number',
              property: 'height',
              units: ['px', '%', 'vh', 'em', 'rem', 'auto'],
              defaults: 'auto',
              min: 0
            }
          ]
        },
        {
          name: 'Typography',
          open: false,
          buildProps: [
            'font-family',
            'font-size',
            'font-weight',
            'font-style',
            'letter-spacing',
            'color',
            'line-height',
            'text-align',
            'text-decoration',
            'text-transform',
            'text-shadow',
            'word-spacing',
            'white-space'
          ],
          properties: [
            {
              property: 'font-family',
              type: 'select',
              options: [
                { value: 'Inter, system-ui, sans-serif', name: 'Inter' },
                { value: 'Roboto, sans-serif', name: 'Roboto' },
                { value: 'Open Sans, sans-serif', name: 'Open Sans' },
                { value: 'Lato, sans-serif', name: 'Lato' },
                { value: 'Montserrat, sans-serif', name: 'Montserrat' },
                { value: 'Arial, sans-serif', name: 'Arial' },
                { value: 'Helvetica, sans-serif', name: 'Helvetica' },
                { value: 'Georgia, serif', name: 'Georgia' },
                { value: 'Times New Roman, serif', name: 'Times New Roman' },
                { value: 'Courier New, monospace', name: 'Courier New' },
                { value: 'system-ui, -apple-system, sans-serif', name: 'System UI' }
              ]
            },
            {
              property: 'font-size',
              type: 'number',
              units: ['px', 'em', 'rem', '%', 'vh', 'vw'],
              defaults: '16px',
              min: 0
            },
            {
              property: 'font-weight',
              type: 'select',
              options: [
                { value: '100', name: 'Thin' },
                { value: '200', name: 'Extra Light' },
                { value: '300', name: 'Light' },
                { value: '400', name: 'Normal' },
                { value: '500', name: 'Medium' },
                { value: '600', name: 'Semi-bold' },
                { value: '700', name: 'Bold' },
                { value: '800', name: 'Extra Bold' },
                { value: '900', name: 'Black' }
              ],
              defaults: '400'
            },
            {
              property: 'text-align',
              type: 'select',
              options: [
                { value: 'left', name: 'Left' },
                { value: 'center', name: 'Center' },
                { value: 'right', name: 'Right' },
                { value: 'justify', name: 'Justify' }
              ]
            }
          ]
        },
        {
          name: 'Background',
          open: false,
          buildProps: [
            'background-color',
            'background',
            'background-image',
            'background-repeat',
            'background-position',
            'background-attachment',
            'background-size'
          ]
        },
        {
          name: 'Border',
          open: false,
          buildProps: [
            'border-radius',
            'border',
            'border-width',
            'border-style',
            'border-color',
            'border-top',
            'border-right',
            'border-bottom',
            'border-left'
          ]
        },
        {
          name: 'Shadow',
          open: false,
          buildProps: [
            'box-shadow',
            'text-shadow'
          ]
        },
        {
          name: 'Flex',
          open: false,
          buildProps: [
            'flex-direction',
            'flex-wrap',
            'justify-content',
            'align-items',
            'align-content',
            'order',
            'flex-basis',
            'flex-grow',
            'flex-shrink',
            'align-self',
            'gap',
            'row-gap',
            'column-gap'
          ],
          properties: [
            {
              property: 'justify-content',
              type: 'select',
              options: [
                { value: 'flex-start', name: 'Start' },
                { value: 'flex-end', name: 'End' },
                { value: 'center', name: 'Center' },
                { value: 'space-between', name: 'Space Between' },
                { value: 'space-around', name: 'Space Around' },
                { value: 'space-evenly', name: 'Space Evenly' }
              ]
            },
            {
              property: 'align-items',
              type: 'select',
              options: [
                { value: 'flex-start', name: 'Start' },
                { value: 'flex-end', name: 'End' },
                { value: 'center', name: 'Center' },
                { value: 'baseline', name: 'Baseline' },
                { value: 'stretch', name: 'Stretch' }
              ]
            }
          ]
        },
        {
          name: 'Grid',
          open: false,
          buildProps: [
            'grid-template-columns',
            'grid-template-rows',
            'grid-column-gap',
            'grid-row-gap',
            'grid-gap',
            'justify-items',
            'align-items',
            'place-items'
          ]
        },
        {
          name: 'Effects',
          open: false,
          buildProps: [
            'transition',
            'transition-property',
            'transition-duration',
            'transition-timing-function',
            'transition-delay',
            'transform',
            'transform-origin',
            'perspective',
            'opacity',
            'filter',
            'backdrop-filter'
          ]
        },
        {
          name: 'Extra',
          open: false,
          buildProps: [
            'cursor',
            'z-index',
            'pointer-events',
            'user-select',
            'visibility',
            'object-fit',
            'object-position'
          ]
        }
      ]
    },
    
    // Commands
    commands: {
      defaults: [
        {
          id: 'clear-all',
          run(editor) {
            if (confirm('Are you sure you want to clear the canvas?')) {
              editor.DomComponents.clear();
              editor.CssComposer.clear();
            }
          }
        }
      ]
    },
    
    // Plugins
    plugins: [],
    pluginsOpts: {}
  };
};

export default getGrapesConfig;

