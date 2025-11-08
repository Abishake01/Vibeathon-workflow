// Export all blocks

import { basicBlocks } from './basicBlocks';
import { layoutBlocks } from './layoutBlocks';
import { formBlocks } from './formBlocks';
import { mediaBlocks } from './mediaBlocks';
import { advancedBlocks } from './advancedBlocks';

export const allBlocks = [
  ...basicBlocks,
  ...layoutBlocks,
  ...formBlocks,
  ...mediaBlocks,
  ...advancedBlocks
];

export {
  basicBlocks,
  layoutBlocks,
  formBlocks,
  mediaBlocks,
  advancedBlocks
};

