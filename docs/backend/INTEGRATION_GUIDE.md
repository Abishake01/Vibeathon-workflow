# Complete Integration Guide - Frontend + Backend

This guide will help you set up and run the complete workflow execution system with both frontend and backend.

## 🎯 Overview

This system consists of:
- **Frontend**: React + Vite application for visual workflow design
- **Backend**: Django REST API with Alith SDK for workflow execution

## 🚀 Quick Start (5 Minutes)

### Option 1: Automated Setup (Recommended)

**On Windows:**
```bash
# Start Backend
cd agent_flow_backend
start_backend.bat

# In a new terminal, start Frontend
cd ..
npm install
npm run dev
```

**On Mac/Linux:**
```bash
# Start Backend
cd agent_flow_backend
chmod +x start_backend.sh
./start_backend.sh

# In a new terminal, start Frontend
cd ..
npm install
npm run dev
```

### Option 2: Manual Setup

**Backend Setup:**
```bash
cd agent_flow_backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

**Frontend Setup:**
```bash
npm install
npm run dev
```

## ⚙️ Configuration

### 1. Backend Configuration

Create `agent_flow_backend/.env`:

```env
# Required for AI nodes
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_API_KEY=your-google-key

# Optional
DEBUG=True
SECRET_KEY=your-secret-key
```

### 2. Frontend Configuration

Create `.env` in project root:

```env
VITE_API_URL=http://localhost:8000/api
```

## 🎨 Using the System

### 1. Create a Workflow

1. Open http://localhost:5173 (or your Vite dev server URL)
2. Click the "+" button to open Node Library
3. Drag nodes onto the canvas
4. Connect nodes by dragging from output handles to input handles
5. Click nodes to configure properties

### 2. Execute Workflow

**Option A: Execute Entire Workflow**
- Click the "▶ Execute" button in the top toolbar
- Watch execution progress in real-time
- View results in the Logs panel at the bottom

**Option B: Execute Single Node**
- Hover over any node
- Click the "▶" button that appears
- The node and its dependencies will execute

### 3. View Execution Results

- Click "Logs" at the bottom to see execution history
- Select an execution to view detailed output
- Check for errors in the logs panel
- View chat responses (if using chat nodes)

## 📊 Example Workflows

### Example 1: Simple AI Chat

```
Nodes:
1. Manual Trigger
2. AI Agent (GPT-4)
3. Respond to Chat

Connections:
Manual Trigger → AI Agent → Respond to Chat

Configuration:
- AI Agent: Set system prompt
- Configure OpenAI API key in backend .env
```

### Example 2: HTTP API Integration

```
Nodes:
1. Manual Trigger
2. HTTP Request
3. Edit Fields
4. AI Agent

Connections:
Manual Trigger → HTTP Request → Edit Fields → AI Agent

Configuration:
- HTTP Request: Set URL and method
- Edit Fields: Transform API response
- AI Agent: Analyze the data
```

### Example 3: Conditional Flow

```
Nodes:
1. Webhook Trigger
2. If/Else
3a. AI Agent (True branch)
3b. HTTP Request (False branch)

Connections:
Webhook → If/Else → [AI Agent, HTTP Request]

Configuration:
- If/Else: Set conditions
- True/False outputs connect to different nodes
```

### Example 4: Chat with RAG

```
Nodes:
1. When Chat Received
2. Question & Answer Chain
3. Respond to Chat

Connections:
Chat Trigger → QA Chain → Respond to Chat

Usage:
- Use ChatBox component (message icon)
- Send message
- AI responds using document knowledge
```

## 🔧 Node Types Guide

### Trigger Nodes (Start Workflow)

**When Chat Message Received**
- Triggers when chat message arrives
- Outputs: message, user, channel

**Manual Trigger**
- Triggers when you click Execute
- Outputs: trigger data

**Webhook**
- Triggers on HTTP request
- Outputs: request data

**Schedule**
- Triggers at intervals
- Outputs: timestamp

### AI Nodes

**AI Agent**
- Main AI node using Alith SDK
- Requires: Chat Model input (optional)
- Supports: Memory, Tools
- Outputs: AI response

**OpenAI**
- Direct OpenAI API calls
- Operations: chat, image, audio
- Outputs: API response

**Anthropic (Claude)**
- Claude 3 models
- Outputs: Claude response

**Question & Answer Chain**
- RAG (Retrieval Augmented Generation)
- Requires: documents input
- Outputs: answer

**Summarization Chain**
- Summarizes text
- Outputs: summary

### Data Nodes

**Filter**
- Filters data based on conditions
- Outputs: filtered data or null

**Edit Fields**
- Add/modify/remove fields
- Outputs: modified data

**Code**
- Execute Python code
- Outputs: code result

### Flow Control

**If/Else**
- Conditional routing
- Outputs: True or False branch

**Switch**
- Multi-way routing
- Outputs: Multiple outputs

**Merge**
- Combines multiple inputs
- Outputs: Merged data

### Actions

**HTTP Request**
- Makes HTTP calls
- Methods: GET, POST, PUT, DELETE
- Outputs: response

**Respond to Chat**
- Sends chat response
- Requires: message input

## 🐛 Troubleshooting

### Backend Issues

**Problem: Port 8000 already in use**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8000 | xargs kill -9
```

**Problem: Alith SDK not installed**
```bash
cd agent_flow_backend
pip install alith
```

**Problem: CORS errors**
- Check `CORS_ALLOWED_ORIGINS` in settings.py
- Should include `http://localhost:5173`

### Frontend Issues

**Problem: Cannot connect to backend**
- Verify backend is running on http://localhost:8000
- Check `.env` file has correct `VITE_API_URL`
- Check browser console for errors

**Problem: Node execution fails**
- Check backend logs for detailed error
- Verify API keys are set in backend `.env`
- Ensure nodes have required inputs

### Execution Issues

**Problem: Node shows "missing required inputs"**
- Connect predecessor nodes
- Ensure data flows from trigger to target node
- Check edge connections in canvas

**Problem: AI nodes fail**
- Verify API keys in backend `.env`
- Check API key validity
- Review backend console for specific error

**Problem: No execution logs**
- Click "Logs" button at bottom of screen
- Check if execution actually ran (green checkmarks on nodes)
- Verify backend is responding

## 📈 Performance Tips

1. **Development**
   - Use Chrome DevTools Network tab to monitor API calls
   - Check backend console for execution logs
   - Enable DEBUG=True in backend for detailed errors

2. **Production**
   - Set DEBUG=False in backend
   - Use PostgreSQL instead of SQLite
   - Deploy backend with Gunicorn + Nginx
   - Enable caching for API responses
   - Use environment variables for all secrets

## 🔐 Security Best Practices

1. **API Keys**
   - Never commit `.env` files
   - Use environment variables
   - Rotate keys regularly

2. **CORS**
   - Restrict `CORS_ALLOWED_ORIGINS` in production
   - Use HTTPS in production

3. **Database**
   - Encrypt credential data
   - Use strong SECRET_KEY
   - Regular backups

## 📚 API Integration Examples

### Execute from JavaScript

```javascript
import { workflowApi } from './api/workflowApi';

// Execute workflow
const result = await workflowApi.executeWorkflow(
  workflowId,
  { message: 'Hello' },  // trigger data
  { openai_api_key: 'sk-...' }  // credentials (optional)
);

// Execute single node
const nodeResult = await workflowApi.executeNode(
  workflowId,
  nodeId,
  { text: 'Input' },
  { openai_api_key: 'sk-...' }
);

// Trigger from chat
const chatResult = await workflowApi.triggerChat(
  workflowId,
  'What is AI?',
  'john_doe',
  'general'
);
```

### Execute from Python

```python
import requests

# Execute workflow
response = requests.post(
    'http://localhost:8000/api/workflows/{workflow_id}/execute/',
    json={
        'trigger_data': {'message': 'Hello'},
        'credentials': {'openai_api_key': 'sk-...'}
    }
)

result = response.json()
print(result['execution']['node_states'])
```

### Execute from cURL

```bash
# Execute workflow
curl -X POST http://localhost:8000/api/workflows/{id}/execute/ \
  -H "Content-Type: application/json" \
  -d '{
    "trigger_data": {"message": "Hello"},
    "credentials": {"openai_api_key": "sk-..."}
  }'

# Execute single node
curl -X POST http://localhost:8000/api/workflows/{id}/execute_node/ \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "node-123",
    "trigger_data": {"text": "Input"}
  }'
```

## 🎓 Next Steps

1. **Learn More**
   - Read [Backend Setup Guide](./BACKEND_SETUP.md)
   - Study [Alith SDK Documentation](./agent_flow_backend/AlithDocs.md)
   - Explore [Node Types](./src/nodeTypes.jsx)

2. **Build Custom Nodes**
   - Create custom executor in `node_executors/`
   - Register in execution engine
   - Add to frontend nodeTypes

3. **Deploy to Production**
   - Use PostgreSQL database
   - Set up Gunicorn + Nginx
   - Configure SSL/HTTPS
   - Set environment variables
   - Enable monitoring

## 💡 Tips & Tricks

1. **Use Chat for Testing**
   - Click message icon on "When Chat Received" nodes
   - Test workflows interactively
   - View responses in chat window

2. **Duplicate Nodes**
   - Hover over node
   - Click copy icon
   - Saves time configuring similar nodes

3. **View Node Output**
   - Click play icon on node
   - View output in logs panel
   - Debug data flow

4. **Keyboard Shortcuts**
   - Delete: Remove selected node
   - Ctrl+C/V: Copy/paste nodes (coming soon)
   - Ctrl+Z: Undo (coming soon)

## 🤝 Support

For issues and questions:
- Check logs in browser console (F12)
- Check backend logs in terminal
- Review this guide's troubleshooting section
- Verify all environment variables are set

## 📄 License

[Your License Here]

---

**Happy Workflow Building! 🚀**

