# Quick Start: Simple Webhook Workflow with Text Transform

## 🎯 Goal
Create a workflow that receives webhook data and returns a formatted response.

## 📋 Step-by-Step Instructions

### Step 1: Create the Workflow

1. **Open Workflow Builder**
   - Click "Workflow Builder" tab
   - You'll see an empty canvas

2. **Add Webhook Trigger**
   - Click the **"+"** button or open Node Library (left sidebar)
   - Find **"Webhook"** in the **"Triggers"** category
   - Drag it to the canvas

3. **Configure Webhook**
   - Click on the Webhook node
   - In the settings panel:
     - **Webhook Path:** Enter `/hello` (or any path like `/api/test`)
     - **HTTP Methods:** Select `POST` (you can select multiple)
   - The webhook URL will appear below (preview until you save)
   - Click outside the node to close settings

4. **Add Text Transform Node**
   - Open Node Library
   - Find **"Text Transform"** in the **"Data"** category
   - Drag it to the canvas (to the right of Webhook)
   - Connect: Click the Webhook node's output handle (right side) and drag to Text Transform's input handle (left side)

5. **Configure Text Transform**
   - Click on the Text Transform node
   - In settings:
     - **Operation:** Select `Template (with expressions)`
     - **Template:** Enter this:
       ```
       ✅ Request Received!
       
       Hello {{ $json.data.body.name || 'Guest' }}!
       
       Your message: {{ $json.data.body.message || 'No message' }}
       
       Received at: {{ $json.data.timestamp || 'Just now' }}
       ```
   - Click outside to save

6. **Add Output Node** (Optional but recommended)
   - Find **"Output"** in the **"Output"** category
   - Drag it to the canvas
   - Connect Text Transform → Output

7. **Save Your Workflow**
   - Click **"Save"** button in the header
   - Enter a name: `Hello Webhook Workflow`
   - Wait for "Saved" confirmation
   - **Important:** After saving, click on the Webhook node again to see the actual webhook URL!

### Step 2: Test Your Workflow

#### Option A: Using curl (Terminal)
```bash
# Replace {workflow-id} with your actual workflow ID from the webhook URL
curl -X POST http://localhost:8000/api/workflows/{workflow-id}/webhook/hello/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "message": "Hello from the API!"
  }'
```

#### Option B: Using Postman
1. Create new POST request
2. URL: `http://localhost:8000/api/workflows/{workflow-id}/webhook/hello/`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "name": "John Doe",
     "message": "Hello from Postman!"
   }
   ```
5. Click Send

#### Option C: Using Browser Console
```javascript
fetch('http://localhost:8000/api/workflows/{workflow-id}/webhook/hello/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    message: 'Hello from browser!'
  })
})
.then(r => r.json())
.then(console.log);
```

### Step 3: Connect to Page Builder

1. **Open Page Builder**
   - Click "Page Builder" tab
   - Create or open a project

2. **Add Workflow Trigger Button**
   - In the component library, find **"Workflow Trigger"** in **"Automation"** category
   - Drag it onto your page

3. **Configure the Button**
   - Click on the button to select it
   - Click the settings icon (or double-click)
   - In the modal:
     - Select **"Backend Workflow"** tab
     - Choose your workflow from dropdown: `Hello Webhook Workflow`
     - The webhook URL will auto-populate
     - **Button Text:** `Say Hello`
     - **Show Status:** ✓ (checked)
     - Click **"Save Configuration"**

4. **Test in Preview**
   - Click the **"Preview"** button
   - Click your "Say Hello" button
   - You should see the formatted response!

## 📝 Complete Example Workflow

Here's the complete JSON you can import:

```json
{
  "name": "Hello Webhook Workflow",
  "description": "Simple webhook that formats a greeting response",
  "nodes": [
    {
      "id": "node_1",
      "type": "webhook",
      "position": { "x": 100, "y": 100 },
      "data": {
        "type": "webhook",
        "label": "Webhook Trigger",
        "properties": {
          "path": "/hello",
          "method": ["POST"]
        }
      }
    },
    {
      "id": "node_2",
      "type": "text-transform",
      "position": { "x": 350, "y": 100 },
      "data": {
        "type": "text-transform",
        "label": "Format Response",
        "properties": {
          "operation": "template",
          "template": "✅ Request Received!\n\nHello {{ $json.data.body.name || 'Guest' }}!\n\nYour message: {{ $json.data.body.message || 'No message' }}\n\nReceived at: {{ $json.data.timestamp || 'Just now' }}",
          "text": "",
          "find": "",
          "replace": "",
          "pattern": "",
          "fields": []
        }
      }
    },
    {
      "id": "node_3",
      "type": "output",
      "position": { "x": 600, "y": 100 },
      "data": {
        "type": "output",
        "label": "Response",
        "properties": {}
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "node_1",
      "target": "node_2",
      "sourceHandle": "main",
      "targetHandle": "main"
    },
    {
      "id": "e2",
      "source": "node_2",
      "target": "node_3",
      "sourceHandle": "main",
      "targetHandle": "main"
    }
  ]
}
```

## 🔍 Understanding Webhook Data Structure

When a webhook is triggered, the data flows like this:

**Request Body:**
```json
{
  "name": "John",
  "message": "Hello!"
}
```

**Webhook Node Output:**
```json
{
  "data": {
    "body": {
      "name": "John",
      "message": "Hello!"
    },
    "method": "POST",
    "path": "/hello",
    "headers": {...},
    "query_params": {...},
    "timestamp": 1234567890
  },
  "path": "/hello",
  "methods": ["POST"]
}
```

**So in your template, use:**
- `{{ $json.data.body.name }}` - Access request body fields
- `{{ $json.data.body.message }}` - Access request body fields
- `{{ $json.data.timestamp }}` - Access metadata
- `{{ $json.data.body.name || 'Guest' }}` - With default value

## 🎨 Text Transform Operations Cheat Sheet

| Operation | When to Use | Example |
|-----------|-------------|---------|
| **Template** | Format text with data | `Hello {{ $json.data.body.name }}!` |
| **Uppercase** | Convert to uppercase | `"hello"` → `"HELLO"` |
| **Lowercase** | Convert to lowercase | `"HELLO"` → `"hello"` |
| **Capitalize** | First letter uppercase | `"hello"` → `"Hello"` |
| **Replace** | Find and replace | Find: `"old"`, Replace: `"new"` |
| **Extract** | Extract with regex | Pattern: `\d+` extracts numbers |
| **Trim** | Remove whitespace | `"  hello  "` → `"hello"` |
| **Concatenate** | Combine fields | Combine name + email |

## 🐛 Troubleshooting

### Webhook URL not showing?
- ✅ Make sure you **saved the workflow** (click "Save" button)
- ✅ Check that webhook **path is set** (e.g., `/hello`)
- ✅ Click on the Webhook node again after saving

### Template not working?
- ✅ Use `{{ $json.data.body.field }}` for webhook data
- ✅ Add default values: `{{ $json.data.body.name || 'Guest' }}`
- ✅ Check the Output tab in node settings to see actual data structure

### Text Transform not showing?
- ✅ Refresh the page
- ✅ Check Node Library - it should be in "Data" category
- ✅ Look for green icon with "Text Transform" label

### Workflow not executing?
- ✅ Make sure all nodes are connected (lines between them)
- ✅ Check webhook URL is correct
- ✅ Verify HTTP method matches (POST, GET, etc.)
- ✅ Check browser console for errors

## ✅ Success Checklist

- [ ] Webhook node added and configured
- [ ] Text Transform node added and connected
- [ ] Template configured with `{{ $json.data.body.field }}` syntax
- [ ] Workflow saved successfully
- [ ] Webhook URL visible and copied
- [ ] Tested with curl/Postman - got response
- [ ] Connected to Page Builder button
- [ ] Button works in preview

## 🚀 Next Steps

1. **Add more nodes:**
   - HTTP Request node to call external APIs
   - Filter node to validate data
   - Code node for custom logic

2. **Enhance the template:**
   - Add more fields
   - Use conditional logic
   - Format dates and numbers

3. **Connect to real services:**
   - Send emails
   - Save to database
   - Trigger other workflows

Happy building! 🎉

