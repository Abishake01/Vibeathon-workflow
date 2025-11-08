# Frontend Architecture

## 📁 Project Structure

```
src/
├── animations/          # Animation system
│   ├── nodeAnimations.js
│   └── index.js
│
├── api/                 # API communication
│   └── workflowApi.js
│
├── components/          # React components
│   ├── ui/              # Reusable UI components
│   │   ├── Toast.jsx
│   │   ├── ChatBox.jsx
│   │   └── index.js
│   ├── workflow/        # Workflow building components
│   │   ├── WorkflowNode.jsx
│   │   ├── NodeLibrary.jsx
│   │   ├── PropertyPanel.jsx
│   │   └── index.js
│   ├── execution/       # Execution monitoring components
│   │   ├── ExecutionStatusBar.jsx
│   │   ├── ExecutionViewer.jsx
│   │   ├── ExecutionResultModal.jsx
│   │   └── index.js
│   └── index.js         # Central export
│
├── execution/           # Execution engine
│   ├── executionLogger.js
│   ├── workflowExecutor.js
│   └── index.js
│
├── hooks/               # Custom React hooks
│   ├── useLocalStorage.js
│   ├── useNodeValidation.js
│   ├── useNodeExecution.js
│   └── index.js
│
├── nodes/               # Node definitions
│   ├── base/
│   │   ├── nodeFactory.js
│   │   ├── commonProperties.js
│   │   └── icons.jsx
│   ├── triggers/
│   ├── chatModels/
│   ├── ai/
│   ├── memory/
│   ├── tools/
│   ├── flow/
│   ├── data/
│   ├── actions/
│   ├── output/
│   ├── categories.js
│   └── index.js
│
├── utils/               # Utility functions
│   ├── validation.js
│   ├── formatters.js
│   └── index.js
│
├── App.jsx              # Main application
├── main.jsx             # Entry point
├── theme.jsx            # Theme system
└── nodeTypes.jsx        # Legacy export (for compatibility)
```

## 🎯 Key Concepts

### 1. **Modular Architecture**
Each module has a specific responsibility and can be used independently.

### 2. **Node Registration System**
New nodes automatically inherit:
- ✨ Animations (from `animations/nodeAnimations.js`)
- 🔄 Execution flow (from `execution/workflowExecutor.js`)
- 📝 Logging (from `execution/executionLogger.js`)
- ✅ Validation (from `hooks/useNodeValidation.js`)

### 3. **Reusable Hooks**
Custom hooks for common patterns:
- `useLocalStorage` - Persistent storage
- `useNodeValidation` - Node validation
- `useNodeExecution` - Execution state management

## 📝 Adding a New Node

### Step 1: Create Node Definition

```javascript
// src/nodes/myCategory/index.js
import { createNode } from '../base/nodeFactory';
import { textProperty, apiKeyProperty } from '../base/commonProperties';

export const myCategoryNodes = {
  'my-new-node': createNode({
    name: 'My New Node',
    category: 'My Category',
    color: '#3b82f6',
    icon: 'FiStar', // Icon name from base/icons.jsx
    description: 'Does something awesome',
    inputs: [
      { name: 'main', type: 'main', required: true, displayName: 'Input' }
    ],
    outputs: [
      { name: 'main', type: 'main', displayName: 'Output' }
    ],
    properties: {
      myProperty: textProperty('My Property', true),
      apiKey: apiKeyProperty('My Service')
    }
  })
};
```

### Step 2: Register in Main Index

```javascript
// src/nodes/index.js
import { myCategoryNodes } from './myCategory';

export const nodeTypeDefinitions = {
  ...existingNodes,
  ...myCategoryNodes  // Add your nodes here
};
```

### Step 3: Add Category (if new)

```javascript
// src/nodes/categories.js
export const categories = [
  // ... existing categories
  {
    key: 'My Category',
    label: 'My Category',
    description: 'My awesome category description'
  }
];
```

**That's it!** Your node now has:
- ✅ Automatic validation
- ✅ Execution animations
- ✅ Logging
- ✅ Error handling
- ✅ Storage persistence

## 🎨 Using Animations

Animations are automatically applied based on execution state:

```javascript
import { getExecutionStateClass, nodeStateStyles } from './animations';

// In your component
const className = getExecutionStateClass(executionState.status);
const styles = nodeStateStyles[executionState.status];
```

Available states:
- `running` - Pulsing orange animation
- `completed` - Success green pulse
- `error` - Error red pulse
- `invalid` - Validation shake

## 📊 Using the Execution Logger

```javascript
import { executionLogger } from './execution';

// Log node execution
executionLogger.logNodeExecution(nodeId, nodeName, 'running');

// Log workflow execution
executionLogger.logWorkflowExecution(workflowId, 'completed', { duration: 1500 });

// Custom logging
executionLogger.info('Custom message', { data: 'value' });
executionLogger.error('Error occurred', { error: 'details' });

// Subscribe to log updates
const unsubscribe = executionLogger.subscribe((logEntry) => {
  console.log('New log:', logEntry);
});
```

## 🔍 Validation System

```javascript
import { useNodeValidation } from './hooks';
import { validateApiKey, validateRequired } from './utils';

// In your component
const { isValid, errors, errorMessage } = useNodeValidation(node, properties);

// Manual validation
const result = validateApiKey(apiKey, 'groq');
if (!result.valid) {
  console.error(result.error);
}
```

## 💾 Storage Management

```javascript
import { useNodeProperties } from './hooks';

// In your component
const {
  properties,
  updateProperty,
  updateProperties,
  clearProperties
} = useNodeProperties(nodeId);

// Update single property
updateProperty('apiKey', 'new-value');

// Update multiple properties
updateProperties({ apiKey: 'value', model: 'gpt-4' });

// Clear all
clearProperties();
```

## 🎭 Execution Flow

```javascript
import { createWorkflowExecutor } from './execution';

const executor = createWorkflowExecutor({
  apiBaseUrl: '/api',
  animationDelay: 200,
  onNodeStart: (nodeId, state) => {
    // Handle node start
  },
  onNodeComplete: (nodeId, state) => {
    // Handle node completion
  },
  onWorkflowComplete: (result) => {
    // Handle workflow completion
  }
});

// Execute workflow
const result = await executor.executeWorkflow(
  workflowId,
  nodes,
  edges,
  triggerData
);

// Execute single node
const result = await executor.executeNode(
  nodeId,
  nodeType,
  properties,
  testMessage
);
```

## 🎨 Formatting Utilities

```javascript
import { 
  formatDuration, 
  formatTime, 
  formatExecutionOutput,
  getStatusColor 
} from './utils';

// Format duration
formatDuration(1500); // "1.50s"

// Format time
formatTime(new Date()); // "14:30"

// Format output
const output = formatExecutionOutput(nodeOutput);

// Get status color
const color = getStatusColor('running'); // "#f59e0b"
```

## 🔧 Best Practices

### 1. **Component Organization**
- UI components go in `components/ui/`
- Workflow-specific components in `components/workflow/`
- Execution-related components in `components/execution/`

### 2. **Import Organization**
```javascript
// 1. External imports
import { useState } from 'react';
import { FiStar } from 'react-icons/fi';

// 2. Internal absolute imports
import { useNodeValidation } from './hooks';
import { executionLogger } from './execution';

// 3. Internal relative imports
import { nodeTypeDefinitions } from './nodeTypes';
```

### 3. **Node Properties**
Always use property factories from `commonProperties.js`:
```javascript
import { 
  textProperty, 
  apiKeyProperty, 
  modelSelectProperty 
} from '../base/commonProperties';
```

### 4. **Error Handling**
Always use the execution logger for errors:
```javascript
try {
  // ... code
} catch (error) {
  executionLogger.error('Operation failed', { error: error.message });
}
```

## 📚 API Reference

### Node Factory

```javascript
createNode(config)           // Standard node
createTriggerNode(config)    // Trigger (no inputs)
createAgentNode(config)      // AI Agent
createChatModelNode(config)  // Chat Model
createMemoryNode(config)     // Memory
createToolNode(config)       // Tool
createConditionalNode(config) // If/Switch
createProcessingNode(config)  // Data processing
```

### Common Properties

```javascript
textProperty(label, required)
apiKeyProperty(provider, prefix)
temperatureProperty
maxTokensProperty(default)
modelSelectProperty(models, default)
booleanProperty(label, default)
urlProperty(required)
filePathProperty(required)
// ... and many more
```

## 🚀 Performance

- **Lazy Loading**: Components are code-split
- **Memoization**: Expensive components use `React.memo`
- **Debouncing**: API calls are debounced
- **Caching**: localStorage caches node properties

## 🐛 Debugging

Enable debug logging:
```javascript
localStorage.setItem('debug', 'true');
```

View execution logs:
```javascript
import { executionLogger } from './execution';
console.log(executionLogger.export());
```

## 📦 Build

```bash
npm run build
```

The modular structure ensures:
- ✅ Tree-shaking removes unused code
- ✅ Code splitting for better performance
- ✅ Smaller bundle sizes

