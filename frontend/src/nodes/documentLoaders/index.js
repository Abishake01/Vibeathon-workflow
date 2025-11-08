import { createProcessingNode } from '../base/nodeFactory';
import { filePathProperty, booleanProperty, urlProperty, textProperty } from '../base/commonProperties';

export const documentLoaderNodes = {
  'pdf-loader': createProcessingNode({
    name: 'PDF Loader',
    category: 'Document Loaders',
    color: '#ef4444',
    icon: 'FiFile',
    description: 'Load and parse PDF documents',
    properties: {
      filePath: filePathProperty(true),
      splitPages: booleanProperty('Split by Pages', true)
    }
  }),

  'text-loader': createProcessingNode({
    name: 'Text File Loader',
    category: 'Document Loaders',
    color: '#ef4444',
    icon: 'FiFileText',
    description: 'Load text files',
    properties: {
      filePath: filePathProperty(true),
      encoding: {
        type: 'select',
        label: 'Encoding',
        default: 'utf-8',
        options: ['utf-8', 'ascii', 'latin1']
      }
    }
  }),

  'web-loader': createProcessingNode({
    name: 'Web Page Loader',
    category: 'Document Loaders',
    color: '#ef4444',
    icon: 'FiGlobe',
    description: 'Load content from web pages',
    properties: {
      url: urlProperty(true),
      selector: textProperty('CSS Selector (optional)', false, 'article, .content')
    }
  })
};
