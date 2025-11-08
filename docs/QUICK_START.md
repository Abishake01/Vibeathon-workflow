# Quick Start Guide

## 🚀 Getting Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The app will automatically open in your browser at `http://localhost:3000`

### 3. Build Your First Workflow!

## 📖 Your First Workflow

Let's create a simple workflow that receives a webhook, processes data, and sends an email:

### Step 1: Add a Webhook Trigger
1. Open the **Node Library** (left sidebar)
2. Click on the **Webhook** node or drag it to the canvas
3. Click on the node to see its properties on the right
4. Set the webhook path (e.g., `/my-webhook`)

### Step 2: Add an HTTP Request
1. From the Node Library, add an **HTTP Request** node
2. Configure it:
   - Method: `GET`
   - URL: `https://api.example.com/data`

### Step 3: Connect the Nodes
1. Drag from the **right handle** of the Webhook node
2. Drop on the **left handle** of the HTTP Request node
3. You'll see an animated connection between them!

### Step 4: Add Logic
1. Add an **If/Else** node to check conditions
2. Add a **Set Variable** node to store data
3. Connect them in sequence

### Step 5: Execute!
1. Click the **▶️ Execute** button in the toolbar
2. Watch your workflow execute in real-time!
3. See execution details in the bottom panel

## 🎯 Key Features to Try

### Node Management
- **Add Nodes**: Click or drag from the library
- **Select Node**: Click to edit properties
- **Delete Node**: Select and click "Delete" button
- **Move Nodes**: Drag nodes around the canvas

### Canvas Controls
- **Pan**: Click and drag on empty space
- **Zoom**: Mouse wheel or pinch gesture
- **Fit View**: Use the controls in bottom-left
- **Mini Map**: Navigate large workflows easily

### Workflow Operations
- **Save**: Export workflow as JSON file
- **Load**: Import previously saved workflows
- **Clear**: Start fresh with empty canvas
- **Execute**: Run your workflow with mock data

### Property Configuration
- **Text Fields**: Enter URLs, emails, etc.
- **Dropdowns**: Select from predefined options
- **Toggles**: Enable/disable features
- **Code Editor**: Write custom JavaScript
- **Key-Value Pairs**: Add headers, variables, etc.

## 🔧 Available Node Types

### Core Nodes
- **HTTP Request** 🌐 - Make API calls
- **Webhook** 📨 - Receive external data

### Logic Nodes
- **If/Else** 🔀 - Conditional branching
- **Switch** 🎯 - Multi-way routing
- **Merge** 🔗 - Combine data sources

### Data Nodes
- **Set Variable** 📝 - Store/modify data
- **Code** 💻 - Custom JavaScript
- **Function** ⚡ - Transform data

### Flow Control
- **Wait** ⏱️ - Add delays

### Communication
- **Email** 📧 - Send notifications

## 💡 Pro Tips

1. **Use the Search**: Filter nodes in the library
2. **Category Filters**: Quickly find node types
3. **Property Validation**: Required fields are marked with *
4. **Visual Feedback**: Nodes light up during execution
5. **Execution States**: 
   - ⏳ Running (yellow pulse)
   - ✅ Completed (green)
   - ❌ Error (red)

## 🎨 Customization

### Adding Custom Nodes
Edit `src/nodeTypes.js` to add your own node types with custom properties and behavior.

### Credentials
The system includes a mock credentials manager supporting:
- HTTP Authentication (Basic, Bearer, OAuth2)
- SMTP Configuration
- Database Connections
- API Keys

### Execution Logic
Modify `src/executionEngine.js` to customize how nodes execute and handle data.

## 🐛 Troubleshooting

### Canvas Not Showing
- Make sure the dev server is running
- Check browser console for errors
- Verify all dependencies installed correctly

### Nodes Not Connecting
- Drag from the right handle (source)
- Drop on the left handle (target)
- Make sure handles are visible

### Execution Not Working
- Add at least one node to the workflow
- Check that nodes are properly connected
- View execution details in the bottom panel

## 📚 Next Steps

- Explore all 10 node types
- Create complex multi-branch workflows
- Test different execution scenarios
- Save and load your workflows
- Customize node types for your needs

## 🌟 Example Workflows

### Simple API Chain
```
Webhook → HTTP Request → Set Variable → Email
```

### Conditional Logic
```
Webhook → If/Else → [True: Email] / [False: Wait → HTTP Request]
```

### Data Processing
```
Webhook → Code → Function → Merge → Email
```

---

Happy workflow building! 🎉

