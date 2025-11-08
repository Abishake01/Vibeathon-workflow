# 🔑 Node-Level API Keys - Complete!

## ✅ What Changed

### **Removed Global Settings**
- ❌ Removed global settings modal (⚙️ button)
- ❌ Removed `SettingsModal.jsx` and `SettingsModal.css`
- ❌ Removed global API key management
- ✅ API keys are now configured per-node

### **Added API Key to Chat Model Nodes**
Each chat model node now has its own API key field:
- **Groq Llama** - Configure Groq API key in node settings
- **Groq Gemma** - Configure Groq API key in node settings
- Other models can be extended similarly

### **Backend Updates**
- Backend now reads API key from node properties
- Falls back to context/environment if not in node
- API key is passed through chat model connections to AI Agent

## 🎯 How to Use

### Step 1: Add a Chat Model Node

Drag "Groq Llama" or "Groq Gemma" from the node library.

### Step 2: Configure API Key in Node Settings

1. Click the ⚙️ (settings) icon on the Groq node
2. Enter your API key in the "Groq API Key" field:
   ```
   gsk_your_api_key_here
   ```
3. Select the model (e.g., "Llama 3.1 8B Instant")
4. Adjust temperature and max tokens as needed
5. Close the settings panel

### Step 3: Connect to AI Agent

**Correct Connection Pattern:**
```
When Chat Message Received
         │
         ├──────────────┐
         │              │
         ▼              ▼
    Groq Llama ──────> AI Agent ──────> Respond to Chat
    (Model Config)     (Processes)       (Output)
```

**Important:** 
- ✅ Connect Groq directly to AI Agent's "Chat Model" input (purple connection)
- ✅ Connect Trigger to AI Agent's "Main" input (gray connection)
- ❌ Don't connect Trigger to Groq (it will execute instead of providing config)

### Step 4: Execute Workflow

Click the **▶ Execute** button. The API key from the Groq node will be used automatically!

## 📊 Node Properties

### Groq Llama / Groq Gemma

| Property | Type | Description |
|----------|------|-------------|
| **API Key** | Password | Your Groq API key (gsk_...) |
| **Model** | Select | Choose the model to use |
| **Temperature** | Number | 0.0 to 2.0 (default: 0.7) |
| **Max Tokens** | Number | 1 to 8192 (default: 1024) |

## 🔧 Technical Details

### How It Works

1. **Node Properties**: API key is stored in node's `properties.api_key`
2. **Configuration Mode**: When Groq node has no input, it returns model configuration including API key
3. **AI Agent**: Receives model config via "Chat Model" input and uses the API key from there
4. **Fallback**: If no API key in node, falls back to environment variables

### Backend Flow

```python
# In Groq node executor
api_key = self.get_property('api_key', '') or context.get('groq_api_key') or os.getenv('GROQ_API_KEY')

# Output includes API key
return {
    'main': {
        'model': model,
        'api_key': api_key,  # Passed to AI Agent
        'temperature': temperature,
        'max_tokens': max_tokens
    }
}
```

```python
# In AI Agent executor
if chat_model_input and 'api_key' in chat_model_input:
    api_key = chat_model_input['api_key']  # Use key from chat model
```

## ✅ Benefits

1. **Per-Node Configuration**: Each node can use a different API key
2. **Better Security**: API keys are scoped to specific nodes
3. **Easier Management**: No global settings to configure
4. **Team Workflows**: Different team members can use their own keys
5. **Multi-Account**: Use different accounts for different models

## 🎨 UI Updates

### Property Panel
- Added support for `password` input type
- API key fields show as password (hidden characters)
- All chat model nodes can have API key fields

### Removed Components
- `SettingsModal.jsx` - Global settings modal
- `SettingsModal.css` - Settings modal styles
- Settings button from toolbar

## 🚀 Example Workflow

```json
{
  "nodes": [
    {
      "type": "when-chat-received",
      "properties": {}
    },
    {
      "type": "groq-llama",
      "properties": {
        "api_key": "gsk_...",
        "model": "llama-3.1-8b-instant",
        "temperature": 0.7,
        "max_tokens": 200
      }
    },
    {
      "type": "ai-agent",
      "properties": {
        "systemPrompt": "You are a helpful assistant."
      }
    },
    {
      "type": "respond-to-chat",
      "properties": {}
    }
  ],
  "edges": [
    { "source": "groq", "target": "ai-agent", "targetHandle": "chat-model" },
    { "source": "trigger", "target": "ai-agent", "targetHandle": "main" },
    { "source": "ai-agent", "target": "respond" }
  ]
}
```

## 📝 Migration Guide

### If You Were Using Global Settings

**Before:**
1. Configure API key in global settings (⚙️ button)
2. Add nodes to workflow
3. Execute

**Now:**
1. Add Groq node to workflow
2. Click ⚙️ on the Groq node
3. Enter API key in node settings
4. Execute

### Updating Existing Workflows

1. Open your workflow
2. Click ⚙️ on each Groq node
3. Add your API key to each node
4. Save workflow

## 🔐 Security Notes

- API keys are stored in node properties (part of workflow data)
- Keys are sent to backend only during execution
- Use password input type to hide keys in UI
- Consider using environment variables for shared deployments

## ✨ Future Enhancements

Possible additions:
- Credential vault for storing API keys separately
- API key templates/presets
- Key rotation support
- Usage tracking per key

---

**All done! 🎉**

Your workflow system now uses node-level API keys. Just configure the API key in each chat model node's settings!

