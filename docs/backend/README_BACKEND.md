# Workflow Execution System - Backend

A powerful Django-based backend for executing AI workflow diagrams, similar to n8n, with deep integration of the Alith SDK for decentralized AI operations.

## 🚀 Features

- **Visual Workflow Execution**: Execute complex workflow diagrams with various node types
- **AI Integration**: Supports OpenAI, Anthropic, Google Gemini via Alith SDK
- **Real-time Execution**: Track node execution status in real-time
- **Error Handling**: Comprehensive error tracking with detailed logs
- **Flexible Architecture**: Easy to extend with custom node types
- **REST API**: Full RESTful API for workflow management and execution
- **Chat Integration**: Trigger workflows from chat messages
- **Credential Management**: Secure storage of API keys and credentials

## 📋 Node Types Supported

### Triggers
- Chat Message Received
- Webhook
- Schedule
- Manual Trigger

### AI & Language Models
- AI Agent (Alith SDK)
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3)
- Google Gemini
- Question & Answer Chain (RAG)
- Summarization Chain
- Information Extractor
- Text Classifier
- Sentiment Analysis

### Flow Control
- If/Else Conditions
- Switch
- Merge

### Data Transformation
- Filter
- Edit Fields
- Code Execution (Python)

### Actions
- HTTP Request
- Google Sheets
- Respond to Chat

### Support Components
- Chat Models (GPT-4 Turbo, Claude 3, etc.)
- Memory (Simple, Vector)
- Tools (Calculator, Web Search, API Caller)

## 🛠️ Quick Start

### 1. Install Dependencies

```bash
cd agent_flow_backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Create `.env` file:

```env
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=your-key
GOOGLE_API_KEY=your-key
```

### 3. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Start Server

```bash
python manage.py runserver
```

Backend runs at `http://localhost:8000`

## 📡 API Endpoints

### Workflows

```
GET    /api/workflows/              # List workflows
POST   /api/workflows/              # Create workflow
GET    /api/workflows/{id}/         # Get workflow
PUT    /api/workflows/{id}/         # Update workflow
DELETE /api/workflows/{id}/         # Delete workflow
POST   /api/workflows/{id}/execute/ # Execute workflow
POST   /api/workflows/{id}/execute_node/ # Execute single node
GET    /api/workflows/{id}/executions/   # Get execution history
POST   /api/workflows/validate/    # Validate workflow
```

### Example: Execute Workflow

```javascript
// Using the frontend API client
import { workflowApi } from './api/workflowApi';

const result = await workflowApi.executeWorkflow(
  workflowId,
  { message: 'Hello AI!' },  // trigger data
  { openai_api_key: 'sk-...' }  // credentials
);

console.log(result.execution.node_states);
console.log(result.execution.chat_response);
```

## 🏗️ Architecture

```
agent_flow_backend/
├── workflows/
│   ├── models.py              # Database models
│   ├── views.py               # API endpoints
│   ├── serializers.py         # Data serialization
│   ├── execution_engine.py    # Workflow orchestration
│   └── node_executors/        # Node implementations
│       ├── base.py            # Base executor class
│       ├── ai_nodes.py        # AI node executors
│       ├── trigger_nodes.py   # Trigger executors
│       ├── flow_nodes.py      # Flow control
│       ├── data_nodes.py      # Data transformation
│       └── action_nodes.py    # Action executors
```

## 🔧 Extending the System

### Adding a New Node Type

1. **Create Node Executor**

```python
# workflows/node_executors/custom_nodes.py
from .base import BaseNodeExecutor

class MyCustomExecutor(BaseNodeExecutor):
    async def execute(self, inputs, context):
        # Your logic here
        return {'main': {'result': 'success'}}
```

2. **Register in Execution Engine**

```python
# workflows/execution_engine.py
def _get_node_executor(self, node):
    # ... existing code ...
    elif node_type == 'my-custom-node':
        executor_class = MyCustomExecutor
```

3. **Add to Frontend**

```javascript
// src/nodeTypes.jsx
'my-custom-node': {
  name: 'My Custom Node',
  category: 'Custom',
  icon: <FiStar />,
  // ... configuration
}
```

## 🔐 Security

- API keys stored in environment variables
- CORS configured for frontend access
- Django's built-in security features
- Credential encryption recommended for production

## 📊 Monitoring & Logs

Execution logs are available in console:

```python
# View detailed execution logs
LOGGING = {
    'loggers': {
        'workflows': {
            'level': 'DEBUG',
        },
    },
}
```

## 🐛 Troubleshooting

### Common Issues

**Import Error: No module named 'alith'**
```bash
pip install alith
```

**CORS Error**
- Check `CORS_ALLOWED_ORIGINS` in settings.py
- Ensure frontend URL is listed

**API Key Not Found**
- Set environment variables in `.env`
- Or pass via API: `credentials={'openai_api_key': 'sk-...'}`

**Node Execution Failed**
- Check backend logs for detailed error
- Verify node has required inputs
- Check API key validity

## 📚 Documentation

- [Backend Setup Guide](./BACKEND_SETUP.md)
- [Alith SDK Documentation](./AlithDocs.md)
- [API Reference](http://localhost:8000/api/) (when running)

## 🤝 Contributing

1. Create feature branch
2. Add node executor in `node_executors/`
3. Add tests
4. Submit pull request

## 📝 License

[Your License Here]

## 🎯 Roadmap

- [ ] WebSocket support for real-time updates
- [ ] More AI model integrations
- [ ] Workflow templates
- [ ] Enhanced error recovery
- [ ] Workflow versioning
- [ ] Performance optimizations
- [ ] Distributed execution
- [ ] Workflow marketplace

## 💡 Examples

### Simple AI Chat Workflow

```javascript
const workflow = {
  nodes: [
    {
      id: '1',
      type: 'when-chat-received',
      data: { properties: { channel: 'general' } }
    },
    {
      id: '2',
      type: 'ai-agent',
      data: { 
        properties: { 
          prompt: 'You are a helpful assistant.' 
        }
      }
    },
    {
      id: '3',
      type: 'respond-to-chat',
      data: { properties: {} }
    }
  ],
  edges: [
    { source: '1', target: '2' },
    { source: '2', target: '3' }
  ]
};

const result = await workflowApi.executeWorkflow(workflowId, {
  message: 'What is AI?'
});
```

### RAG (Retrieval Augmented Generation)

```javascript
const workflow = {
  nodes: [
    {
      id: '1',
      type: 'manual-trigger',
    },
    {
      id: '2',
      type: 'question-answer-chain',
      data: {
        properties: {
          question: 'What are the key features?'
        }
      }
    }
  ],
  edges: [
    { source: '1', target: '2' }
  ]
};

const result = await workflowApi.executeWorkflow(workflowId, {
  documents: ['Document 1 text...', 'Document 2 text...']
});
```

## 🌟 Powered By

- **Django** - Web framework
- **Django REST Framework** - API framework
- **Alith SDK** - Decentralized AI operations
- **httpx** - Async HTTP client

---

Built with ❤️ for the AI automation community

