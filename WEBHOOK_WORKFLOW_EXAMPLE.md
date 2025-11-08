# Complete Webhook Workflow Example

This guide shows you how to create a simple webhook-triggered workflow and connect it to the Page Builder.

## Step 1: Create a Simple Webhook Workflow

### Example Workflow: "Hello Webhook"

This workflow receives a webhook, processes the data, and returns a response.

#### Workflow Structure:
```
[Webhook Trigger] → [Text Transform] → [Output]
```

### Step-by-Step Instructions:

1. **Open Workflow Builder**
   - Click on "Workflow Builder" tab
   - Create a new workflow or open existing one

2. **Add Webhook Trigger Node**
   - Click the "+" button or open Node Library
   - Find "Webhook" in the "Triggers" category
   - Drag it to the canvas

3. **Configure Webhook Trigger**
   - Click on the Webhook node to open settings
   - **Webhook Path**: Enter `/hello` (or any path you want)
   - **HTTP Methods**: Select `POST` (or multiple methods)
   - Click outside to save

4. **Add Text Transform Node** (Optional - for processing)
   - Add a "Text Transform" node from "Data" category
   - Connect it from Webhook node
   - Configure it:
     - **Operation:** Select "Template (with expressions)"
     - **Template:** Enter:
       ```
       Hello! You sent: {{ $json.data.body.message || 'No message' }}
       
       From: {{ $json.data.body.name || 'Anonymous' }}
       Time: {{ $json.data.timestamp || 'N/A' }}
       ```
     - Click outside to save

5. **Add Output Node** (Optional)
   - Add an "Output" node
   - Connect it from Text Transform
   - This will be the response sent back

6. **Save the Workflow**
   - Click "Save" button in the header
   - Give it a name like "Hello Webhook Workflow"
   - The workflow will be saved with an ID

7. **Get Your Webhook URL**
   - After saving, click the "Webhook URL" button in the header
   - Or click on the Webhook node again - the URL will appear below
   - Copy the URL (it will look like: `http://localhost:8000/api/workflows/{id}/webhook/hello/`)

## Step 2: Test Your Webhook

### Using curl:
```bash
curl -X POST http://localhost:8000/api/workflows/{workflow-id}/webhook/hello/ \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from curl!"}'
```

### Using Postman:
1. Create a new POST request
2. Enter your webhook URL
3. Set Body to `raw` and `JSON`
4. Add JSON: `{"message": "Hello from Postman!"}`
5. Send request

## Step 3: Connect to Page Builder

### Option A: Use Backend Workflow (Recommended)

1. **Open Page Builder**
   - Click "Page Builder" tab
   - Create or open a project

2. **Add Workflow Trigger Button**
   - Drag "Workflow Trigger" from the Automation category
   - Place it on your page

3. **Configure the Button**
   - Click on the button to select it
   - Click the settings icon or double-click
   - In the modal:
     - Select **"Backend Workflow"** tab
     - Choose your workflow from the dropdown
     - The webhook URL will auto-populate
     - Set button text: "Say Hello"
     - Click "Save Configuration"

4. **Test in Preview**
   - Click the button
   - The workflow will execute
   - Status will show below the button

### Option B: Use External n8n URL

1. **Configure Button**
   - Select "External (n8n)" tab
   - Paste your n8n webhook URL
   - Add optional secret for HMAC
   - Save

## Complete Example Workflow JSON

Here's a complete example workflow you can import:

```json
{
  "name": "Hello Webhook Workflow",
  "description": "A simple webhook that responds with a greeting",
  "nodes": [
    {
      "id": "node_1",
      "type": "webhook",
      "position": { "x": 100, "y": 100 },
      "data": {
        "type": "webhook",
        "label": "Webhook",
        "properties": {
          "path": "/hello",
          "method": ["POST"]
        }
      }
    },
    {
      "id": "node_2",
      "type": "text-transform",
      "position": { "x": 300, "y": 100 },
      "data": {
        "type": "text-transform",
        "label": "Format Response",
        "properties": {
          "operation": "template",
          "template": "Hello! You sent: {{ $json.data.body.message || 'No message received' }}\n\nFrom: {{ $json.data.body.name || 'Anonymous' }}\nTimestamp: {{ $json.data.timestamp || 'N/A' }}",
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
      "position": { "x": 500, "y": 100 },
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

## Advanced Example: Form Submission Handler

### Workflow Structure:
```
[Webhook Trigger] → [Extract Data] → [HTTP Request] → [Format Response] → [Output]
```

This workflow:
1. Receives form data via webhook
2. Extracts email and name
3. Sends data to external API
4. Returns formatted response

### Example JSON:
```json
{
  "name": "Form Submission Handler",
  "nodes": [
    {
      "id": "node_1",
      "type": "webhook",
      "position": { "x": 100, "y": 100 },
      "data": {
        "type": "webhook",
        "label": "Form Webhook",
        "properties": {
          "path": "/submit-form",
          "method": ["POST"]
        }
      }
    },
    {
      "id": "node_2",
      "type": "extract-data",
      "position": { "x": 300, "y": 100 },
      "data": {
        "type": "extract-data",
        "label": "Extract Form Data",
        "properties": {
          "fields": {
            "email": "{{ $json.body.email }}",
            "name": "{{ $json.body.name }}",
            "message": "{{ $json.body.message }}"
          }
        }
      }
    },
    {
      "id": "node_3",
      "type": "http-request",
      "position": { "x": 500, "y": 100 },
      "data": {
        "type": "http-request",
        "label": "Send to API",
        "properties": {
          "url": "https://api.example.com/submit",
          "method": "POST",
          "headers": {
            "Content-Type": "application/json"
          },
          "body": "{{ $json }}"
        }
      }
    },
    {
      "id": "node_4",
      "type": "output",
      "position": { "x": 700, "y": 100 },
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
    },
    {
      "id": "e3",
      "source": "node_3",
      "target": "node_4",
      "sourceHandle": "main",
      "targetHandle": "main"
    }
  ]
}
```

## Troubleshooting

### Webhook URL not showing?
1. **Make sure the workflow is saved** - Click "Save" button first
2. **Check webhook path is set** - The path field must have a value (e.g., `/hello`)
3. **Refresh the node settings** - Click away and click back on the webhook node

### Webhook not triggering?
1. **Check the URL format** - Should be: `/api/workflows/{id}/webhook/{path}/`
2. **Verify HTTP method** - Make sure you're using the correct method (POST, GET, etc.)
3. **Check workflow is active** - Make sure the workflow is saved and active
4. **Check backend logs** - Look for errors in Django console

### Page Builder button not working?
1. **Verify webhook URL** - Check the URL in button configuration
2. **Check browser console** - Look for JavaScript errors
3. **Test webhook directly** - Use curl or Postman to test the webhook URL first
4. **Check authentication** - Make sure you're logged in

## Quick Reference

### Webhook URL Format:
```
{base_url}/api/workflows/{workflow_id}/webhook/{path}/
```

### Example URLs:
- Local: `http://localhost:8000/api/workflows/abc123/webhook/hello/`
- Production: `https://yourdomain.com/api/workflows/abc123/webhook/hello/`

### Supported HTTP Methods:
- GET
- POST
- PUT
- PATCH
- DELETE

### Webhook Data Structure:
When a webhook is triggered, the workflow receives:
```json
{
  "method": "POST",
  "path": "/hello",
  "headers": {...},
  "body": {...},
  "query_params": {...},
  "timestamp": 1234567890
}
```

Access in nodes using: `{{ $json.body.message }}` or `{{ $json.query_params.id }}`

