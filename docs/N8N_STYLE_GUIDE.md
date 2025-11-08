# n8n-Style Implementation Guide

## Visual Design System

### Node Anatomy

```
┌─────────────────────────────┐
│ ▪️ [Icon] Node Name         │
│    Category                 │
│    [▶] [⚙]                  │  ← Action buttons
└─────────────────────────────┘
  ↑                         ↑
Input Handle            Output Handle
(Square)                (Circle)
```

### Handle Types & Shapes

| Type | Position | Shape | Color | Use Case |
|------|----------|-------|-------|----------|
| Main Input | Left | Square (■) | Gray border | Standard workflow input |
| Main Output | Right | Circle (●) | Gray border | Standard workflow output |
| AI Input | Top | Diamond (◆) | Color-coded | AI Agent inputs (chat-model, memory, tools) |
| AI Output | Right | Circle (●) | Purple | Chat models, memory, tools outputs |
| Conditional True | Right | Circle (●) | Green | If/else true branch |
| Conditional False | Right | Circle (●) | Red | If/else false branch |

### Node Types & Styles

#### 1. Trigger Nodes (Pill Shape)
```css
border-radius: 20px;
/* No input handles */
/* Only output handles */
```
Examples: When Chat Received, Webhook, Schedule

#### 2. Regular Nodes (Rounded Rectangle)
```css
border-radius: 8px;
border-left: 4px solid [node-color];
/* Left input, right output */
```
Examples: HTTP Request, Filter, Edit Fields

#### 3. AI Agent Nodes (Large with Top Inputs)
```css
min-width: 240px;
border-radius: 8px;
/* Top handles for chat-model, memory, tools */
/* Left input, right output */
```

#### 4. AI Component Nodes (Pill Shape)
```css
border-radius: 50px;
/* Optional left input, right AI output */
```
Examples: GPT-4, Simple Memory, Calculator

#### 5. Flow Control Nodes (Standard with Multiple Outputs)
```css
border-radius: 8px;
/* Left input, multiple right outputs */
```
Examples: If/Else (true/false), Switch (output0-3)

## Connection Patterns

### Standard Workflow Connection
```
[Trigger] ─────> [Action] ─────> [Output]
(Circle)         (■)(●)         (Square)
```

### AI Agent Connection
```
[Chat Model] ──┐
     (●)       │  
               ├─> [AI Agent] ─────> [Action]
[Memory] ──────┤      (◆)(●)         (■)(●)
     (●)       │
[Tool] ────────┘
     (●)
```

### Conditional Flow
```
                  ┌─> [Action A] (True path)
[If] ─────────────┤    (■)(●)
(■)(● green)      │
  (● red)         └─> [Action B] (False path)
                       (■)(●)
```

## Color Coding

### Node Categories
- **Triggers**: Green (#10b981)
- **AI**: Purple (#8b5cf6)
- **Chat Models**: OpenAI Green (#10a37f) / Anthropic Orange (#d97757)
- **Memory**: Purple (#8b5cf6)
- **Tools**: Green (#10b981)
- **Flow**: Various (Purple #9C27B0, Pink #E91E63, Brown #795548)
- **Data**: Blues/Cyans (#06b6d4, #3b82f6)
- **Actions**: Greens (#4CAF50, #34a853)
- **Output**: Cyan (#06b6d4)

### Connection Colors
- **Standard**: Gray (#999)
- **AI Components**: Purple (#8b5cf6)
- **True Branch**: Green (#10b981)
- **False Branch**: Red (#ef4444)
- **Active/Selected**: Primary (#8b5cf6)

## Node Definition Template

```javascript
'node-id': {
  name: 'Display Name',
  category: 'Category Name',
  color: '#hexcolor',
  icon: <IconComponent />,
  description: 'Brief description',
  nodeType: 'trigger|regular|agent|chat-model|memory|tool',
  
  inputs: [
    {
      name: 'main',              // Handle ID
      type: 'main',              // main|ai
      required: true,            // Connection required?
      displayName: 'Input',      // Label shown on hover
      maxConnections: 1          // 1 or -1 (unlimited)
    }
  ],
  
  outputs: [
    {
      name: 'main',              // Handle ID
      type: 'main',              // main|ai
      displayName: 'Output'      // Label shown on hover
    }
  ],
  
  properties: {
    // Property schema (see Property Types below)
  }
}
```

## Property Types

```javascript
properties: {
  // Text input
  myText: {
    type: 'text',
    label: 'Text Field',
    default: '',
    placeholder: 'Enter text...',
    required: true
  },
  
  // Textarea
  myTextarea: {
    type: 'textarea',
    label: 'Long Text',
    default: '',
    rows: 4
  },
  
  // Number input
  myNumber: {
    type: 'number',
    label: 'Number',
    default: 0,
    min: 0,
    max: 100
  },
  
  // Select dropdown
  mySelect: {
    type: 'select',
    label: 'Choose Option',
    default: 'option1',
    options: ['option1', 'option2', 'option3']
    // Or with labels:
    // options: [
    //   { value: 'opt1', label: 'Option 1' },
    //   { value: 'opt2', label: 'Option 2' }
    // ]
  },
  
  // Multi-select checkboxes
  myMultiSelect: {
    type: 'multiselect',
    label: 'Choose Multiple',
    default: [],
    options: ['option1', 'option2', 'option3']
  },
  
  // Boolean toggle
  myBoolean: {
    type: 'boolean',
    label: 'Enable Feature',
    default: false
  },
  
  // Key-value pairs
  myKeyValue: {
    type: 'keyValue',
    label: 'Headers',
    default: []
  },
  
  // Code editor
  myCode: {
    type: 'code',
    label: 'JavaScript Code',
    default: '// Code here',
    language: 'javascript'
  },
  
  // JSON editor
  myJson: {
    type: 'json',
    label: 'JSON Data',
    default: '{}'
  },
  
  // Conditional field (show/hide based on another field)
  conditionalField: {
    type: 'text',
    label: 'Conditional Field',
    default: '',
    showIf: { mySelect: ['option2'] }  // Show only when mySelect is 'option2'
  }
}
```

## Example Workflows

### 1. Simple Chat Bot
```
When Chat Received → AI Agent → Respond to Chat
                        ↑
                    GPT-4 Turbo
```

### 2. Chat Bot with Memory
```
When Chat Received ─────┐
                        ├─> AI Agent → Respond to Chat
GPT-4 Turbo ────────────┤      ↑
                        │      │
Simple Memory ──────────┘      │
                               │
                        (All connected to AI Agent)
```

### 3. Conditional Response
```
When Chat Received → AI Agent → If ─┬─ True → Respond "Success"
                        ↑            └─ False → Respond "Error"
                    GPT-4 Turbo
```

### 4. AI Agent with Tools
```
When Chat Received ──────────────┐
                                 ├─> AI Agent → Respond
GPT-4 Turbo ─────────────────────┤      ↑
                                 │      │
Simple Memory ───────────────────┤      │
                                 │      │
Calculator Tool ─────────────────┤      │
Web Search Tool ─────────────────┘      │
                                        │
                                 (All connected)
```

## Best Practices

### Node Naming
- Use clear, descriptive names
- Follow n8n conventions (e.g., "When Chat Message Received")
- Use sentence case

### Handle Placement
- **Triggers**: Only right-side outputs
- **Regular nodes**: Left input, right output
- **AI Agents**: Left input, top special inputs, right output
- **Flow control**: Left input, multiple right outputs
- **Output nodes**: Only left inputs

### Color Selection
- Use category colors consistently
- High contrast for readability
- Avoid similar colors in same category

### Connection Logic
- AI outputs (chat-model, memory, tool) can only connect to AI inputs
- Main outputs connect to main inputs
- Respect maxConnections limits
- Validate required connections

## CSS Custom Properties

```css
--node-color: #hexcolor;      /* Set per node from definition */
--primary: #8b5cf6;           /* Primary brand color */
--surface: /* theme-based */   /* Node background */
--background: /* theme-based */ /* Canvas background */
--border: /* theme-based */    /* Borders and handles */
--text: /* theme-based */      /* Text color */
--textSecondary: /* theme-based */ /* Secondary text */
--hover: /* theme-based */     /* Hover state */
```

## Animation States

### Node States
- **Default**: Subtle shadow, border
- **Hover**: Lifted (translateY), enhanced shadow
- **Selected**: Primary border, glow effect
- **Running**: Yellow pulsing border
- **Completed**: Green border
- **Error**: Red border

### Connection States
- **Default**: Gray, solid
- **Hover**: Primary color, thicker
- **Selected**: Primary color, thick
- **Animated**: Dashed, moving
- **Connecting**: Dashed, animated, primary color

## Accessibility

- All handles have title attributes
- Keyboard navigation support
- High contrast in both themes
- Clear visual feedback for all states
- ARIA labels where appropriate

---

This guide provides the complete visual and technical specification for implementing n8n-style nodes and workflows.

