# Backend Setup Guide

This guide will help you set up and run the Django backend for the workflow execution system.

## Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- Virtual environment (recommended)

## Installation

### 1. Navigate to Backend Directory

```bash
cd agent_flow_backend
```

### 2. Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the `agent_flow_backend` directory:

```env
# Django settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# AI API Keys
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
GOOGLE_API_KEY=your-google-api-key-here
```

### 5. Run Database Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. Create Superuser (Optional)

```bash
python manage.py createsuperuser
```

### 7. Run Development Server

```bash
python manage.py runserver
```

The backend API will be available at `http://localhost:8000`

## API Endpoints

### Workflows

- `GET /api/workflows/` - List all workflows
- `POST /api/workflows/` - Create workflow
- `GET /api/workflows/{id}/` - Get workflow details
- `PUT /api/workflows/{id}/` - Update workflow
- `DELETE /api/workflows/{id}/` - Delete workflow
- `POST /api/workflows/{id}/execute/` - Execute workflow
- `POST /api/workflows/{id}/execute_node/` - Execute single node
- `GET /api/workflows/{id}/executions/` - Get execution history
- `POST /api/workflows/validate/` - Validate workflow structure

### Executions

- `GET /api/executions/` - List all executions
- `GET /api/executions/{id}/` - Get execution details
- `GET /api/executions/{id}/status/` - Get execution status

### Credentials

- `GET /api/credentials/` - List all credentials
- `POST /api/credentials/` - Create credential
- `PUT /api/credentials/{id}/` - Update credential
- `DELETE /api/credentials/{id}/` - Delete credential

### Triggers

- `POST /api/trigger/chat/` - Trigger workflow from chat message

## Testing the API

### Execute a Workflow

```bash
curl -X POST http://localhost:8000/api/workflows/{workflow_id}/execute/ \
  -H "Content-Type: application/json" \
  -d '{
    "trigger_data": {
      "message": "Hello, world!"
    },
    "credentials": {
      "openai_api_key": "sk-..."
    }
  }'
```

### Execute a Single Node

```bash
curl -X POST http://localhost:8000/api/workflows/{workflow_id}/execute_node/ \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "node-123",
    "trigger_data": {
      "text": "Input text"
    }
  }'
```

### Trigger from Chat

```bash
curl -X POST http://localhost:8000/api/trigger/chat/ \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "workflow-id",
    "message": "Hello AI!",
    "user": "john_doe",
    "channel": "general"
  }'
```

## Frontend Integration

### 1. Update Frontend Environment

Create `.env` file in the frontend root:

```env
VITE_API_URL=http://localhost:8000/api
```

### 2. Configure API Keys in Backend

You can configure API keys in two ways:

**Option 1: Environment Variables (Recommended)**

Set environment variables in your `.env` file or system:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...
GOOGLE_API_KEY=...
```

**Option 2: Via API Requests**

Pass credentials in the execution request:

```javascript
await workflowApi.executeWorkflow(workflowId, triggerData, {
  openai_api_key: 'sk-...',
  anthropic_api_key: '...',
  google_api_key: '...'
});
```

## Node Types and Executors

### Supported Node Categories

1. **Trigger Nodes**
   - When Chat Message Received
   - Webhook
   - Schedule
   - Manual Trigger

2. **AI Nodes**
   - AI Agent (uses Alith SDK)
   - OpenAI
   - Anthropic (Claude)
   - Google Gemini
   - Question & Answer Chain
   - Summarization Chain
   - Information Extractor
   - Text Classifier
   - Sentiment Analysis

3. **Chat Models**
   - GPT-4 Turbo
   - GPT-3.5 Turbo
   - Claude 3 Opus
   - Claude 3 Sonnet

4. **Memory**
   - Simple Memory
   - Vector Memory

5. **Tools**
   - Calculator
   - Web Search
   - API Caller

6. **Flow Control**
   - If/Else
   - Switch
   - Merge

7. **Data Transformation**
   - Filter
   - Edit Fields
   - Code (Python)

8. **Actions**
   - HTTP Request
   - Google Sheets (requires setup)
   - Respond to Chat

## Development

### Project Structure

```
agent_flow_backend/
├── agent_flow_backend/         # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── workflows/                   # Main app
│   ├── models.py               # Database models
│   ├── views.py                # API views
│   ├── serializers.py          # DRF serializers
│   ├── urls.py                 # URL routing
│   ├── execution_engine.py     # Workflow execution engine
│   └── node_executors/         # Node executor implementations
│       ├── base.py
│       ├── ai_nodes.py
│       ├── trigger_nodes.py
│       ├── flow_nodes.py
│       ├── data_nodes.py
│       └── action_nodes.py
├── manage.py
└── requirements.txt
```

### Adding New Node Types

1. Create executor in appropriate file in `node_executors/`
2. Implement `execute()` method
3. Register in `execution_engine.py`'s `_get_node_executor()` method
4. Add node definition to frontend `nodeTypes.jsx`

### Logging

Logs are output to console. Configure logging in `settings.py`:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'workflows': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

## Production Deployment

### Database

Replace SQLite with PostgreSQL:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'agent_flow_db',
        'USER': 'postgres',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### Security

1. Set `DEBUG = False`
2. Update `SECRET_KEY`
3. Configure `ALLOWED_HOSTS`
4. Use environment variables for sensitive data
5. Enable HTTPS
6. Configure CORS properly

### Web Server

Use Gunicorn + Nginx:

```bash
pip install gunicorn
gunicorn agent_flow_backend.wsgi:application --bind 0.0.0.0:8000
```

## Troubleshooting

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8000 | xargs kill -9
```

### Module Not Found

Make sure virtual environment is activated and dependencies are installed:

```bash
pip install -r requirements.txt
```

### CORS Errors

Check `CORS_ALLOWED_ORIGINS` in `settings.py` includes your frontend URL.

### Database Migrations

If you encounter migration issues:

```bash
python manage.py makemigrations
python manage.py migrate --run-syncdb
```

## Support

For issues and questions:
- Check the logs in the console
- Review the API response error messages
- Ensure all environment variables are set correctly
- Verify API keys are valid

## License

[Your License Here]

