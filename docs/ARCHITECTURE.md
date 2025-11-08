# Architecture Documentation

## System Overview

The Workflow Builder is a React-based visual workflow editor built on top of React Flow. It provides a complete environment for creating, configuring, executing, and managing workflows with a drag-and-drop interface.

## Core Technologies

- **React 18.3.1** - Component-based UI framework
- **React Flow 12.3.2** - Visual graph/workflow engine
- **Vite 5.4.2** - Build tool and development server
- **Local Storage API** - Client-side data persistence

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                     Presentation Layer                   │
│  (React Components, UI, User Interactions)              │
├─────────────────────────────────────────────────────────┤
│                     Business Logic Layer                 │
│  (Execution Engine, Credentials Manager, Validators)    │
├─────────────────────────────────────────────────────────┤
│                     Data Layer                          │
│  (Node Definitions, State Management, Local Storage)    │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
workflow-builder/
│
├── src/
│   ├── components/              # React Components
│   │   ├── WorkflowNode.jsx    # Custom node renderer
│   │   ├── NodeLibrary.jsx     # Sidebar with available nodes
│   │   ├── PropertyPanel.jsx   # Node configuration panel
│   │   └── ExecutionViewer.jsx # Execution state display
│   │
│   ├── nodeTypes.js            # Node type definitions & schemas
│   ├── credentialsManager.js   # Credentials CRUD & storage
│   ├── executionEngine.js      # Workflow execution logic
│   │
│   ├── App.jsx                 # Main application component
│   ├── App.css                 # Application styles
│   ├── main.jsx                # Application entry point
│   └── index.css               # Global styles
│
├── public/                     # Static assets
├── examples/                   # Example workflows
├── index.html                  # HTML template
├── package.json                # Dependencies & scripts
├── vite.config.js             # Vite configuration
└── README.md                   # Documentation
```

## Component Architecture

### 1. App Component (`App.jsx`)

**Responsibilities:**
- Main application orchestration
- React Flow integration
- State management for nodes and edges
- Event handling (drag, drop, connect, click)
- Workflow operations (save, load, clear, execute)

**Key State:**
```javascript
- nodes: Array<Node>           // All workflow nodes
- edges: Array<Edge>           // All connections
- selectedNode: Node | null    // Currently selected node
- libraryOpen: boolean         // Library sidebar visibility
- execution: ExecutionState    // Current execution state
- reactFlowInstance: ReactFlow // React Flow instance
```

**Key Methods:**
- `onNodesChange()` - Handle node updates
- `onEdgesChange()` - Handle edge updates
- `onConnect()` - Create new connections
- `onDrop()` - Handle node drops from library
- `executeWorkflow()` - Start workflow execution
- `saveWorkflow()` - Export workflow as JSON
- `loadWorkflow()` - Import workflow from JSON

### 2. WorkflowNode Component (`components/WorkflowNode.jsx`)

**Responsibilities:**
- Render individual nodes on the canvas
- Display node icon, label, and type
- Show execution state visually
- Provide connection handles

**Props:**
```javascript
{
  data: {
    label: string,
    type: string,
    properties: Object,
    executionState: ExecutionState
  },
  selected: boolean,
  id: string
}
```

**Visual States:**
- Default: Type-specific color
- Running: Pulsing animation
- Completed: Green background
- Error: Red background
- Selected: Blue outline

### 3. NodeLibrary Component (`components/NodeLibrary.jsx`)

**Responsibilities:**
- Display available node types
- Category filtering
- Search functionality
- Drag and drop support
- Direct click to add

**Features:**
- Collapsible sidebar
- Category tabs
- Search input
- Scrollable node list
- Visual node cards with icons

### 4. PropertyPanel Component (`components/PropertyPanel.jsx`)

**Responsibilities:**
- Display and edit node properties
- Dynamic form generation based on node type
- Validation and required fields
- Conditional field visibility

**Field Types Supported:**
- Text, textarea, number
- Select, multiselect
- Boolean (toggle switch)
- Credentials selector
- Key-value pairs
- JSON/code editor

**Dynamic Rendering:**
```javascript
// Fields can show/hide based on other fields
showIf: { method: ['POST', 'PUT'] }
```

### 5. ExecutionViewer Component (`components/ExecutionViewer.jsx`)

**Responsibilities:**
- Display execution progress
- Show node-by-node execution state
- Display input/output data
- Show errors and timing

**Data Displayed:**
- Execution status (running, completed, error, stopped)
- Start/finish times
- Duration
- Per-node states
- Input/output data (expandable)

## Core Systems

### 1. Node Type System (`nodeTypes.js`)

**Structure:**
```javascript
{
  'node-id': {
    name: string,           // Display name
    category: string,       // Grouping category
    color: string,          // Visual color (hex)
    icon: string,           // Emoji icon
    description: string,    // Help text
    properties: {           // Configuration schema
      propName: {
        type: string,       // Field type
        label: string,      // Display label
        default: any,       // Default value
        required: boolean,  // Validation
        showIf: Object,     // Conditional display
        // ... type-specific options
      }
    },
    outputs: Array<string>  // Output port names
  }
}
```

**Property Types:**
- `text` - Single-line text input
- `textarea` - Multi-line text
- `number` - Numeric input with min/max
- `select` - Single selection dropdown
- `multiselect` - Multiple checkboxes
- `boolean` - Toggle switch
- `credentials` - Credential selector
- `keyValue` - Dynamic key-value pairs
- `json` - JSON editor
- `code` - Code editor with syntax
- `conditionGroup` - Condition builder
- `rulesList` - Rule configurations

### 2. Credentials Manager (`credentialsManager.js`)

**Class: CredentialsManager**

**Methods:**
```javascript
- loadCredentials()                    // Load from localStorage
- saveCredentials()                    // Persist to localStorage
- getAllCredentials()                  // Get all credentials
- getCredentialsByType(type)          // Filter by type
- getCredentialById(id)               // Get single credential
- createCredential(data)              // Create new
- updateCredential(id, updates)       // Update existing
- deleteCredential(id)                // Delete credential
- testCredential(data)                // Test connection (mock)
```

**Data Structure:**
```javascript
{
  id: string,              // Unique identifier
  name: string,            // Display name
  type: string,            // Credential type
  data: Object,            // Credential fields
  createdAt: string,       // ISO timestamp
  updatedAt: string        // ISO timestamp
}
```

**Supported Types:**
1. **httpAuth** - HTTP authentication
2. **smtp** - Email server
3. **database** - Database connections
4. **apiKey** - API key authentication

### 3. Execution Engine (`executionEngine.js`)

**Class: ExecutionEngine**

**Methods:**
```javascript
- executeWorkflow(nodes, edges, startNode)  // Run workflow
- executeNode(node, allNodes, edges, input) // Run single node
- mockNodeExecution(node, input)            // Mock execution
- stopExecution()                           // Cancel execution
- getExecutionState()                       // Get current state
- subscribe(listener)                       // Subscribe to updates
- notify()                                  // Notify listeners
```

**Execution Flow:**
1. Find start node (webhook or first node)
2. Execute node with mock data
3. Update node state (running → completed/error)
4. Find next nodes via edges
5. Pass output to next nodes
6. Repeat until all paths complete

**Node State Tracking:**
```javascript
{
  status: 'pending' | 'running' | 'completed' | 'error',
  startedAt: string,
  finishedAt: string,
  input: any,
  output: any,
  error: string
}
```

**Mock Execution:**
Each node type has a mock execution that returns simulated data:
- HTTP Request: Returns mock API response
- Webhook: Returns mock webhook payload
- If/Else: Random true/false
- Code: Returns input with processed flag
- etc.

## Data Flow

### 1. User Interaction Flow

```
User Action
    ↓
Event Handler (App.jsx)
    ↓
State Update (React setState)
    ↓
Re-render Components
    ↓
Visual Update
```

### 2. Node Configuration Flow

```
User clicks node
    ↓
onNodeClick event
    ↓
setSelectedNode(node)
    ↓
PropertyPanel receives node
    ↓
Renders dynamic form
    ↓
User changes property
    ↓
onUpdate callback
    ↓
updateNodeData(nodeId, newData)
    ↓
Node state updated
```

### 3. Execution Flow

```
User clicks Execute
    ↓
executeWorkflow()
    ↓
ExecutionEngine.executeWorkflow(nodes, edges)
    ↓
For each node:
  - Update state to 'running'
  - Notify subscribers
  - Execute mock logic
  - Update state to 'completed'/'error'
  - Notify subscribers
    ↓
Update nodes with execution states
    ↓
Visual feedback on canvas
    ↓
ExecutionViewer displays results
```

### 4. Save/Load Flow

```
SAVE:
User clicks Save
    ↓
Serialize workflow (nodes + edges)
    ↓
Create JSON blob
    ↓
Trigger download

LOAD:
User clicks Load
    ↓
File picker opens
    ↓
User selects JSON file
    ↓
Parse JSON
    ↓
Validate structure
    ↓
setNodes() and setEdges()
    ↓
Workflow rendered
```

## State Management

### React State

The application uses React's built-in state management:

**App Component State:**
- `nodes` - Managed by React Flow's `applyNodeChanges`
- `edges` - Managed by React Flow's `applyEdgeChanges`
- `selectedNode` - Simple useState
- `libraryOpen` - Simple useState
- `execution` - Updated via ExecutionEngine subscription

**Why not Redux/Context?**
- Application state is localized
- React Flow handles complex state updates
- No need for global state sharing
- Simpler architecture for this scope

### Persistent State

**Local Storage:**
- Credentials stored in localStorage
- Key: `workflow_credentials`
- Format: JSON array

**File System:**
- Workflows saved as JSON files
- User controls save/load locations
- No automatic persistence

## Event System

### React Flow Events

```javascript
- onNodesChange: (changes) => void      // Node updates
- onEdgesChange: (changes) => void      // Edge updates
- onConnect: (connection) => void       // New connection
- onNodeClick: (event, node) => void    // Node clicked
- onPaneClick: (event) => void          // Canvas clicked
- onDrop: (event) => void               // Node dropped
- onDragOver: (event) => void           // Drag over canvas
- onInit: (instance) => void            // Flow initialized
```

### Custom Events

**Execution Engine Subscription:**
```javascript
const unsubscribe = executionEngine.subscribe((state) => {
  // Handle execution state updates
});
```

**Observer Pattern:**
- ExecutionEngine maintains listener array
- Components subscribe to updates
- Engine notifies on state changes
- Components update UI reactively

## Performance Considerations

### Optimizations

1. **Component Memoization:**
   - WorkflowNode is memoized with `memo()`
   - Prevents unnecessary re-renders
   - Only updates when props change

2. **React Flow Optimization:**
   - Built-in viewport culling
   - Only renders visible nodes
   - Efficient edge routing

3. **Callback Memoization:**
   - Event handlers wrapped in `useCallback`
   - Prevents function recreation
   - Reduces child re-renders

4. **Lazy Loading:**
   - Components loaded on demand
   - No code splitting in current version
   - Opportunity for future optimization

### Potential Bottlenecks

1. **Large Workflows:**
   - Many nodes (>100) may slow rendering
   - Solution: Virtualization or pagination

2. **Complex Executions:**
   - Deep execution trees
   - Solution: Web Workers for execution

3. **Large Property Objects:**
   - JSON/Code fields with large data
   - Solution: Lazy loading of property values

## Extension Points

### Adding New Node Types

1. Define in `nodeTypes.js`:
```javascript
'my-node': {
  name: 'My Node',
  category: 'Custom',
  // ... configuration
}
```

2. Add execution logic in `executionEngine.js`:
```javascript
case 'my-node':
  return { success: true, output: {...} };
```

### Adding New Property Types

1. Add to PropertyPanel's `renderPropertyInput()`:
```javascript
case 'myCustomType':
  return <MyCustomInput ... />;
```

### Adding New Credential Types

1. Define in `credentialsManager.js`:
```javascript
myCredType: {
  name: 'My Credential',
  fields: [...]
}
```

## Security Considerations

### Current Implementation (Local Only)

- No authentication/authorization
- Credentials stored in localStorage (unencrypted)
- No server communication
- No user data collection

### Production Considerations

If deploying for real use:

1. **Credential Encryption:**
   - Encrypt credentials at rest
   - Use secure key management
   - Consider backend credential storage

2. **Authentication:**
   - User authentication system
   - Workflow access controls
   - API key management

3. **Execution Security:**
   - Sandbox code execution
   - Rate limiting
   - Resource constraints

4. **Data Validation:**
   - Sanitize user inputs
   - Validate workflow structures
   - Prevent XSS attacks

## Testing Strategy

### Current State
- No automated tests in initial version
- Manual testing during development

### Recommended Testing

1. **Unit Tests:**
   - CredentialsManager methods
   - ExecutionEngine logic
   - Property validators

2. **Component Tests:**
   - PropertyPanel rendering
   - NodeLibrary filtering
   - ExecutionViewer display

3. **Integration Tests:**
   - Workflow save/load
   - Execution flow
   - Node connections

4. **E2E Tests:**
   - Complete workflow creation
   - Execution scenarios
   - User workflows

## Future Architecture Improvements

1. **Backend Integration:**
   - REST API for workflows
   - Database storage
   - User authentication
   - Real execution engine

2. **State Management:**
   - Consider Redux/Zustand for complex state
   - Undo/Redo stack
   - Collaborative editing

3. **Performance:**
   - Code splitting
   - Web Workers for execution
   - Virtual scrolling

4. **Features:**
   - Workflow versioning
   - Template system
   - Plugin architecture
   - Custom node creator UI

---

This architecture provides a solid foundation for a scalable, maintainable workflow builder that can grow with additional features and complexity.

