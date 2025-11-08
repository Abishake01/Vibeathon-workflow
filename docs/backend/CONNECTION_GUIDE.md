# 🔗 Node Connection Guide

## ✅ How to Connect Nodes Properly

### **Step 1: Add Nodes to Canvas**

1. **Drag "Manual Trigger"** from Triggers category
2. **Drag "Groq Llama"** from Chat Models category  
3. **Drag "AI Agent"** from AI category
4. **Drag "Respond to Chat"** from Output category

### **Step 2: Configure Groq Node**

1. **Click the ⚙️ (settings) icon** on the Groq Llama node
2. **Enter API Key**: `gsk_your_api_key_here`
3. **Select Model**: "Llama 3.1 8B Instant (Fast)"
4. **Set Temperature**: 0.7
5. **Set Max Tokens**: 200
6. **Close the settings panel**

### **Step 3: Connect Nodes (IMPORTANT!)**

**Correct Connection Pattern:**

```
Manual Trigger ──┐
                 ├──> AI Agent ──> Respond to Chat
Groq Llama ──────┘
```

**Step-by-step connections:**

1. **Connect Groq to AI Agent:**
   - Hover over the **Groq Llama** node
   - You'll see a small circle on the right edge (output handle)
   - Click and drag from this circle
   - Drag to the **AI Agent** node
   - Look for the **"Chat Model"** input (purple circle on top)
   - Connect to the **purple "Chat Model"** input, NOT the gray "Input"

2. **Connect Trigger to AI Agent:**
   - Hover over the **Manual Trigger** node
   - Click and drag from the output circle
   - Drag to the **AI Agent** node
   - Connect to the **gray "Input"** (main input)

3. **Connect AI Agent to Response:**
   - Hover over the **AI Agent** node
   - Click and drag from the output circle
   - Drag to the **Respond to Chat** node
   - Connect to the input circle

### **Step 4: Visual Connection Guide**

**✅ CORRECT CONNECTIONS:**
- Groq Llama → AI Agent (purple line to "Chat Model")
- Manual Trigger → AI Agent (gray line to "Input") 
- AI Agent → Respond to Chat (gray line)

**❌ WRONG CONNECTIONS:**
- Manual Trigger → Groq Llama (this makes Groq execute instead of providing config)
- Groq Llama → Respond to Chat (bypasses AI Agent)

### **Step 5: Execute Workflow**

1. Click the **▶ Execute** button in the toolbar
2. Wait for execution to complete
3. View results in the popup modal

## 🔧 Troubleshooting Connection Issues

### **Issue 1: Can't Connect Groq to AI Agent**

**Problem**: Connection is rejected or doesn't work

**Solutions**:
1. **Check Handle Types**: Make sure you're connecting to the purple "Chat Model" input, not the gray "Input"
2. **Check Connection Limit**: The "Chat Model" input only accepts 1 connection
3. **Remove Existing Connection**: If already connected, remove the old connection first

### **Issue 2: Connection Validation Error**

**Problem**: "Invalid Connection" error message

**Solutions**:
1. **Check Types**: AI output (purple) must connect to AI input (purple)
2. **Check Handles**: Make sure you're connecting the right handles
3. **Refresh Page**: Sometimes the UI needs a refresh

### **Issue 3: Respond to Chat Not Working**

**Problem**: Response node doesn't accept connections

**Solutions**:
1. **Check Node Type**: Make sure you're using "Respond to Chat" from Output category
2. **Check Input**: It should accept "main" type connections
3. **Check Execution**: Make sure the AI Agent is working first

## 📊 Connection Types Reference

| Source Node | Output Handle | Target Node | Input Handle | Connection Type |
|-------------|---------------|-------------|--------------|-----------------|
| Groq Llama | main (ai) | AI Agent | chat-model (ai) | Purple |
| Manual Trigger | main (main) | AI Agent | main (main) | Gray |
| AI Agent | main (main) | Respond to Chat | main (main) | Gray |

## 🎯 Visual Connection Map

```
┌─────────────────┐    ┌─────────────────┐
│ Manual Trigger  │    │   Groq Llama    │
│                 │    │                 │
│        ●────────┼────┼─●               │
└─────────────────┘    └─────────────────┘
         │                       │
         │ Gray                  │ Purple
         │ (main)                │ (ai)
         ▼                       ▼
┌─────────────────────────────────────────┐
│              AI Agent                   │
│                                         │
│  ● Input (main)    ● Chat Model (ai)   │
│                                         │
│                    ●                   │
└─────────────────────────────────────────┘
                    │
                    │ Gray
                    │ (main)
                    ▼
┌─────────────────────────────────────────┐
│           Respond to Chat               │
│                                         │
│              ● Input                    │
└─────────────────────────────────────────┘
```

## 🚀 Quick Test

1. **Add all 4 nodes** to canvas
2. **Configure Groq** with API key
3. **Connect in this order**:
   - Groq → AI Agent (purple to "Chat Model")
   - Trigger → AI Agent (gray to "Input")
   - AI Agent → Response (gray to "Input")
4. **Execute** ▶️

If you still have issues, check the browser console for any JavaScript errors!

---

**Need Help?** Check the browser console (F12) for any error messages when trying to make connections.
