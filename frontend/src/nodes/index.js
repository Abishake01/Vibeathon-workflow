/**
 * Node Type Registry
 * Central export for all node definitions
 */

import { triggerNodes } from './triggers';
import { aiNodes } from './ai';
import { chatModelNodes } from './chatModels';
import { memoryNodes } from './memory';
import { documentLoaderNodes } from './documentLoaders';
import { vectorStoreNodes } from './vectorStores';
import { toolNodes } from './tools';
import { flowNodes } from './flow';
import { dataNodes } from './data';
import { actionNodes } from './actions';
import { outputNodes } from './output';
import { getIcon } from './base/icons';

/**
 * Convert icon names to JSX components
 * @param {Object} nodes - Node definitions with icon names
 * @returns {Object} Node definitions with JSX icons
 */
const convertIconsToJSX = (nodes) => {
  const converted = {};
  for (const [key, node] of Object.entries(nodes)) {
    converted[key] = {
      ...node,
      icon: getIcon(node.icon)
    };
  }
  return converted;
};

/**
 * Combined node type definitions
 * All nodes are registered here for easy access
 */
export const nodeTypeDefinitions = {
  ...convertIconsToJSX(triggerNodes),
  ...convertIconsToJSX(aiNodes),
  ...convertIconsToJSX(chatModelNodes),
  ...convertIconsToJSX(memoryNodes),
  ...convertIconsToJSX(documentLoaderNodes),
  ...convertIconsToJSX(vectorStoreNodes),
  ...convertIconsToJSX(toolNodes),
  ...convertIconsToJSX(flowNodes),
  ...convertIconsToJSX(dataNodes),
  ...convertIconsToJSX(actionNodes),
  ...convertIconsToJSX(outputNodes)
};

// Export categories
export { categories } from './categories';

// Export factory functions for creating custom nodes
export * from './base/nodeFactory';
export * from './base/commonProperties';
