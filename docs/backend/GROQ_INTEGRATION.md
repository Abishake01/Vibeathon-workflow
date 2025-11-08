# Groq API Integration Guide

This guide explains how to use Groq API models in your workflow system.

## 🚀 Quick Setup

### 1. Get Groq API Key

1. Visit [Groq Console](https://console.groq.com/)
2. Sign up for an account
3. Generate an API key
4. Copy your API key (starts with `gsk_`)

### 2. Configure Backend

Create `agent_flow_backend/.env` file:

```env
# Groq API Configuration
GROQ_API_KEY=gsk_your_api_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1
```

### 3. Start Backend

```bash
cd agent_flow_backend
python manage.py runserver
```

## 🎯 Available Groq Models

### Llama Models
- **llama-3.1-70b-versatile** - Most capable Llama model
- **llama-3.1-8b-instant** - Fast and efficient
- **llama-3.1-405b-versatile** - Largest model (when available)
- **llama-3-70b-8192** - Llama 3 70B
- **llama-3-8b-8192** - Llama 3 8B

### Mixtral Models
- **mixtral-8x7b-32768** - Mixture of Experts model

### Gemma Models
- **gemma-7b-it** - Google Gemma 7B
- **gemma-2-9b-it** - Gemma 2 9B
- **gemma-2-27b-it** - Gemma 2 27B

## 🎨 Using Groq in Workflows

### Method 1: Direct Groq Nodes

1. **Add Groq Llama Node**
   - Drag "Groq Llama" from Chat Models category
   - Select model from dropdown (e.g., "Llama 3.1 70B Versatile")
   - Configure temperature and max tokens

2. **Add Groq Gemma Node**
   - Drag "Groq Gemma" from Chat Models category
   - Select Gemma model from dropdown
   - Configure parameters

### Method 2: AI Agent with Groq

1. **Create AI Agent Node**
2. **Connect Groq Chat Model**
   - Drag "Groq Llama" or "Groq Gemma" node
   - Connect its output to AI Agent's "Chat Model" input
3. **Configure AI Agent**
   - Set system prompt
   - Add memory and tools if needed

## 📊 Example Workflows

### Example 1: Simple Groq Chat

```
Nodes:
1. Manual Trigger
2. Groq Llama (llama-3.1-70b-versatile)
3. Respond to Chat

Connections:
Manual Trigger → Groq Llama → Respond to Chat
```

### Example 2: AI Agent with Groq

```
Nodes:
1. Manual Trigger
2. Groq Llama (Chat Model)
3. AI Agent
4. Respond to Chat

Connections:
Manual Trigger → AI Agent
Groq Llama → AI Agent (Chat Model input)
AI Agent → Respond to Chat
```

### Example 3: Fast vs Powerful Comparison

```
Nodes:
1. Manual Trigger
2. Groq Llama (llama-3.1-8b-instant) - Fast
3. Groq Llama (llama-3.1-70b-versatile) - Powerful
4. Merge
5. Respond to Chat

Connections:
Manual Trigger → [Fast Groq, Powerful Groq]
[Fast Groq, Powerful Groq] → Merge → Respond to Chat
```

## ⚙️ Configuration Options

### Groq Llama Node Properties

- **Model**: Select from Llama/Mixtral models
- **Temperature**: 0.0 to 2.0 (default: 0.7)
- **Max Tokens**: 1 to 8192 (default: 1024)

### Groq Gemma Node Properties

- **Model**: Select from Gemma models
- **Temperature**: 0.0 to 2.0 (default: 0.7)
- **Max Tokens**: 1 to 8192 (default: 1024)

## 🔧 Advanced Usage

### Using with AI Agent

When connecting Groq models to AI Agent:

1. **Groq Llama/Gemma** → **AI Agent** (Chat Model input)
2. AI Agent will automatically use Groq API
3. Supports all AI Agent features (memory, tools, etc.)

### API Credentials

You can pass credentials in execution requests:

```javascript
// Frontend API call
const result = await workflowApi.executeWorkflow(
  workflowId,
  { message: 'Hello Groq!' },
  { 
    groq_api_key: 'gsk-your-key-here'
  }
);
```

### Environment Variables

Set in your system or `.env` file:

```bash
export GROQ_API_KEY=gsk-your-key-here
export GROQ_BASE_URL=https://api.groq.com/openai/v1
```

## 🚀 Performance Benefits

### Why Use Groq?

1. **Speed**: Groq is optimized for fast inference
2. **Cost**: More affordable than OpenAI
3. **Models**: Access to Llama, Mixtral, and Gemma models
4. **Reliability**: High uptime and consistent performance

### Model Selection Guide

- **For Speed**: `llama-3.1-8b-instant`
- **For Quality**: `llama-3.1-70b-versatile`
- **For Code**: `mixtral-8x7b-32768`
- **For Multilingual**: `gemma-7b-it`

## 🐛 Troubleshooting

### Common Issues

**Error: "Groq API key not found"**
- Check `.env` file has `GROQ_API_KEY=gsk-...`
- Verify API key is valid
- Restart backend server

**Error: "Model not found"**
- Check model name is correct
- Verify model is available in your Groq plan
- Try a different model

**Error: "Rate limit exceeded"**
- Groq has rate limits
- Wait a moment and retry
- Consider using a different model

### Debug Mode

Enable detailed logging:

```python
# In settings.py
LOGGING = {
    'loggers': {
        'workflows': {
            'level': 'DEBUG',
        },
    },
}
```

## 📈 Best Practices

### Model Selection

1. **Development**: Use `llama-3.1-8b-instant` for fast iteration
2. **Production**: Use `llama-3.1-70b-versatile` for quality
3. **Code Tasks**: Use `mixtral-8x7b-32768`
4. **Multilingual**: Use `gemma-7b-it`

### Parameter Tuning

- **Temperature 0.0-0.3**: Factual, deterministic
- **Temperature 0.7**: Balanced creativity
- **Temperature 1.0-2.0**: Creative, varied

### Cost Optimization

- Use smaller models for simple tasks
- Set appropriate max_tokens limits
- Cache responses when possible

## 🔗 Integration Examples

### Python API Call

```python
import requests

response = requests.post(
    'http://localhost:8000/api/workflows/{id}/execute/',
    json={
        'trigger_data': {'message': 'Hello Groq!'},
        'credentials': {
            'groq_api_key': 'gsk-your-key'
        }
    }
)
```

### JavaScript Integration

```javascript
// Using the workflow API
const result = await workflowApi.executeWorkflow(
  workflowId,
  { message: 'What is AI?' },
  { groq_api_key: 'gsk-your-key' }
);

console.log(result.execution.chat_response);
```

## 🎯 Next Steps

1. **Test Different Models**: Try various Groq models for your use case
2. **Optimize Parameters**: Tune temperature and max_tokens
3. **Build Workflows**: Create complex workflows with Groq models
4. **Monitor Performance**: Track execution times and costs

## 📚 Resources

- [Groq Console](https://console.groq.com/)
- [Groq Documentation](https://console.groq.com/docs)
- [Model Comparison](https://console.groq.com/docs/models)
- [API Reference](https://console.groq.com/docs/api)

---

**Happy Groq-ing! 🚀**
