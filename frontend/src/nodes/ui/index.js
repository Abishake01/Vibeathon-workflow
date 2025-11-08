// UI Integration Nodes

import { renderUIComponentNode } from './renderUIComponent';
import { pageEventTriggerNode } from './pageEventTrigger';

export const uiNodes = {
  'render-ui-component': renderUIComponentNode,
  'page-event-trigger': pageEventTriggerNode
};

export {
  renderUIComponentNode,
  pageEventTriggerNode
};

export default uiNodes;

