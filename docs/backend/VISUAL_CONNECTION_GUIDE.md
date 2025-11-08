# 🎨 Visual Connection Guide - Updated!

## ✅ Handle Improvements

I've just made the connection handles **BIGGER and MORE VISIBLE**:

- **Handles are now 14px** (was 12px)
- **Handles glow when you hover** over them
- **AI handles are highlighted** with purple glow
- **Cursor changes to crosshair** when hovering over handles

## 🔗 How to Connect Nodes

### **Step 1: Identify the Handles**

Each node has connection points (handles):

**Input Handles** (Left side or Top):
- **Square** = Main input (gray)
- **Diamond** = AI input (purple, at top)

**Output Handles** (Right side):
- **Circle** = Output
- **Purple Circle** = AI output (for chat models)

### **Step 2: Connect Groq to AI Agent**

1. **Hover over Groq Llama node**
   - Look at the **RIGHT SIDE**
   - You'll see a **PURPLE CIRCLE** (AI output)
   - It will **GLOW** when you hover

2. **Click and HOLD** on the purple circle

3. **Drag** to the AI Agent node

4. **Look at the TOP** of AI Agent
   - You'll see **DIAMOND shapes** (AI inputs)
   - The first diamond is **"Chat Model"**
   - It will **GLOW GREEN** when you're near it

5. **Release** on the "Chat Model" diamond
   - A **PURPLE LINE** will appear

### **Step 3: Connect Trigger to AI Agent**

1. **Hover over Manual Trigger node**
   - Look at the **RIGHT SIDE**
   - You'll see a **GRAY CIRCLE** (main output)

2. **Click and HOLD** on the gray circle

3. **Drag** to the AI Agent node

4. **Look at the LEFT SIDE** of AI Agent
   - You'll see a **GRAY SQUARE** (main input)
   - It will **GLOW** when you're near it

5. **Release** on the gray square
   - A **GRAY LINE** will appear

### **Step 4: Connect AI Agent to Response**

1. **Hover over AI Agent node**
   - Look at the **RIGHT SIDE**
   - You'll see a **GRAY CIRCLE** (main output)

2. **Click and HOLD** on the gray circle

3. **Drag** to the Respond to Chat node

4. **Look at the LEFT SIDE** of Respond to Chat
   - You'll see a **GRAY SQUARE** (input)

5. **Release** on the gray square
   - A **GRAY LINE** will appear

## 🎯 Visual Reference

```
┌─────────────────┐    ┌─────────────────┐
│ Manual Trigger  │    │   Groq Llama    │
│                 │    │                 │
│              ●─────┐ │              ●  │ ← Purple Circle (AI Output)
└─────────────────┘ │ └─────────────────┘
                    │         │
                    │ Gray    │ Purple Line
                    │         │
                    │         ▼
                    │    ◆ Chat Model (Diamond, Top)
                    │    │
                    ▼    │
┌─────────────────────────────────────────┐
│              AI Agent                   │
│  ■ Input (Square, Left)                │
│                                         │
│                                      ●  │ ← Gray Circle (Output)
└─────────────────────────────────────────┘
                                      │
                                      │ Gray Line
                                      │
                                      ▼
┌─────────────────────────────────────────┐
│           Respond to Chat               │
│  ■ Input (Square, Left)                │
└─────────────────────────────────────────┘
```

## 🔍 Troubleshooting

### **Problem: I can't see the handles**

**Solutions:**
1. **Zoom in** - Use mouse wheel or zoom controls
2. **Hover over the node** - Handles glow when you hover
3. **Look at the edges** - Handles are on the left/right/top edges
4. **Refresh the page** - Sometimes helps with rendering

### **Problem: Connection won't attach**

**Solutions:**
1. **Check the colors**:
   - Purple → Purple (AI connections)
   - Gray → Gray (Main connections)
2. **Get closer** - Drag until the target handle glows
3. **Release on the handle** - Not just near it
4. **Check connection limit** - Chat Model only accepts 1 connection

### **Problem: Wrong connection type error**

**Solutions:**
1. **Match the types**:
   - AI output (purple) → AI input (diamond)
   - Main output (gray) → Main input (square)
2. **Check the alert message** - It tells you what's wrong
3. **Remove old connections** - Delete and try again

## 📊 Handle Legend

| Shape | Color | Type | Location | Purpose |
|-------|-------|------|----------|---------|
| ■ Square | Gray | Main Input | Left | Receives workflow data |
| ● Circle | Gray | Main Output | Right | Sends workflow data |
| ◆ Diamond | Purple | AI Input | Top | Receives AI components |
| ● Circle | Purple | AI Output | Right | Sends AI components |

## 🚀 Quick Checklist

Before executing:
- [ ] Groq node has API key configured
- [ ] Purple line from Groq to AI Agent (top diamond)
- [ ] Gray line from Trigger to AI Agent (left square)
- [ ] Gray line from AI Agent to Response (left square)
- [ ] All handles are connected (no loose ends)

## 💡 Pro Tips

1. **Zoom Level**: Work at 100-150% zoom for easier connections
2. **Handle Glow**: Wait for the glow before releasing
3. **Connection Colors**: Purple = AI, Gray = Data flow
4. **Delete Connections**: Click on a line and press Delete
5. **Rearrange**: Move nodes to make connections clearer

---

**The handles are now BIGGER and EASIER to see!** 🎉

Just hover over the nodes and you'll see the glowing connection points!

