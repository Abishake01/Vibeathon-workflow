# 🤖 AI Agent Node - Handle Guide

## ✅ Updated Handle Colors & Positions

The AI Agent node now has **color-coded handles** that are easy to identify:

### **Visual Layout**

```
        Chat Model*    Memory      Tools
           (Green)    (Purple)   (Green)
              ◆          ◆          ◆
              │          │          │
┌─────────────┴──────────┴──────────┴─────┐
│                                          │
│  ■                                    ●  │
│ Input        AI Agent                Output
│ (Gray)                              (Gray)
│                                          │
└──────────────────────────────────────────┘
```

### **Handle Details**

| Position | Shape | Color | Name | Purpose |
|----------|-------|-------|------|---------|
| **Left** | ■ Square | Gray | Input | Main workflow input (from trigger) |
| **Top Left** | ◆ Diamond | 🟢 Green | Chat Model* | Connect Groq/GPT/Claude here |
| **Top Center** | ◆ Diamond | 🟣 Purple | Memory | Connect memory nodes here |
| **Top Right** | ◆ Diamond | 🟢 Green | Tools | Connect tool nodes here |
| **Right** | ● Circle | Gray | Output | Main workflow output |

## 🎨 Color Meanings

- **🟢 Green** = AI Model/Tool connections
- **🟣 Purple** = Memory connections
- **Gray** = Workflow data flow

## 🔗 How to Connect

### **1. Connect Groq to AI Agent**

```
┌─────────────────┐
│   Groq Llama    │
│              ●──┼─── Purple circle (AI output)
└─────────────────┘
         │
         │ Drag this to...
         ▼
    ◆ Chat Model* (Green diamond at top)
```

**Steps:**
1. Hover over **Groq Llama** node (right side)
2. See the **purple circle** glow
3. Click and drag to **AI Agent**
4. Connect to the **GREEN diamond** labeled "Chat Model*" (top left)
5. Release - purple line appears!

### **2. Connect Trigger to AI Agent**

```
┌─────────────────┐
│ Manual Trigger  │
│              ●──┼─── Gray circle (main output)
└─────────────────┘
         │
         │ Drag this to...
         ▼
    ■ Input (Gray square on left)
```

**Steps:**
1. Hover over **Manual Trigger** node (right side)
2. See the **gray circle** glow
3. Click and drag to **AI Agent**
4. Connect to the **GRAY square** on the left side
5. Release - gray line appears!

### **3. Connect AI Agent to Response**

```
┌─────────────────┐
│    AI Agent     │
│              ●──┼─── Gray circle (output)
└─────────────────┘
         │
         │ Drag this to...
         ▼
┌─────────────────┐
│ Respond to Chat │
│  ■              │ Gray square (input)
└─────────────────┘
```

**Steps:**
1. Hover over **AI Agent** node (right side)
2. See the **gray circle** glow
3. Click and drag to **Respond to Chat**
4. Connect to the **GRAY square** on the left side
5. Release - gray line appears!

## 🎯 Complete Workflow Pattern

```
Manual Trigger ──────────┐
                         │
                         ▼
                    ■ Input (Left)
                         │
Groq Llama ──────────────┼──> ◆ Chat Model* (Top, Green)
                         │
                    AI Agent
                         │
                         ▼
                    ● Output (Right)
                         │
                         ▼
                 Respond to Chat
```

## 💡 Quick Tips

1. **Green diamonds** = Connect your AI models and tools here
2. **Purple diamond** = Connect memory nodes (optional)
3. **Gray square (left)** = Main input from trigger
4. **Gray circle (right)** = Main output to next node
5. **Labels are color-coded** = Match the handle color!

## 🔍 Visual Identification

When you hover over the AI Agent node, you'll see:

- **Left side**: Gray square that glows (Input)
- **Top**: Three diamonds in a row:
  - First (left): **GREEN** = Chat Model*
  - Middle: **PURPLE** = Memory
  - Last (right): **GREEN** = Tools
- **Right side**: Gray circle that glows (Output)

## 🚀 Try It Now!

1. **Refresh your browser** to see the new colors
2. **Hover over AI Agent** - see the colored diamonds at the top
3. **Connect Groq** to the **GREEN "Chat Model*"** diamond
4. **Connect Trigger** to the **GRAY square** on the left
5. **Connect Output** to the **Response node**

The handles are now **color-coded and labeled** for easy identification! 🎨✨

