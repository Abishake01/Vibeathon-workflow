# Webhook Testing Guide

This guide explains how to test your workflow webhook endpoints using the provided Python script.

## Prerequisites

1. **Python 3.6+** installed
2. **requests** library installed:
   ```bash
   pip install requests
   ```
3. **Django backend server running** (usually on `http://localhost:8000`)

## Quick Start

### 1. Start Your Django Server

```bash
cd backend
python manage.py runserver
```

You should see output like:
```
Starting development server at http://127.0.0.1:8000/
```

### 2. Get Your Webhook URL

From the Workflow Builder UI:
1. Open your workflow
2. Click the "Webhook URL" button in the header
3. Copy the webhook URL

Or from the Node Settings:
1. Click on the webhook trigger node
2. The webhook URL is displayed in the properties panel

The URL format is:
```
http://localhost:8000/api/workflows/{workflow-id}/webhook/{path}/
```

### 3. Run the Test Script

#### Interactive Mode (Recommended)

```bash
python test_webhook.py
```

The script will prompt you for:
- Base URL (default: `http://localhost:8000`)
- Workflow ID (UUID)
- Webhook path (e.g., `/hello`)
- HTTP method (default: `POST`)
- Custom data (optional)

#### Command Line Mode

```bash
python test_webhook.py \
  --url http://localhost:8000 \
  --workflow-id "your-workflow-uuid-here" \
  --path "/hello" \
  --method POST \
  --data '{"name": "Test User", "message": "Hello!"}'
```

#### Using a JSON File

```bash
python test_webhook.py \
  --url http://localhost:8000 \
  --workflow-id "your-workflow-uuid-here" \
  --path "/hello" \
  --method POST \
  --file test_webhook_example.json
```

## Example Workflow Test

### Step 1: Create a Simple Workflow

1. Open Workflow Builder
2. Add a **Webhook** trigger node
   - Set path: `/hello`
   - Set method: `POST`
3. Add a **Text Transform** node
   - Operation: `template`
   - Template: `Hello {{ $json.data.body.name || 'Guest' }}! Your message: {{ $json.data.body.message || 'No message' }}`
4. Add an **Output** node
   - Output data: `{{ $json.text }}`
5. Connect the nodes: Webhook → Text Transform → Output
6. Save the workflow
7. Copy the workflow ID from the URL or the webhook URL modal

### Step 2: Test the Webhook

```bash
python test_webhook.py
```

Enter:
- Base URL: `http://localhost:8000`
- Workflow ID: `[your-workflow-id]`
- Webhook path: `/hello`
- Method: `POST`
- Custom data: `{"name": "Alice", "message": "Testing webhook!"}`

### Expected Output

```
============================================================
                    Testing Webhook Endpoint
============================================================

ℹ URL: http://localhost:8000/api/workflows/.../webhook/hello/
ℹ Method: POST
ℹ Time: 2025-11-09 03:30:00

Request Body:
{
  "name": "Alice",
  "message": "Testing webhook!"
}

Sending request...

============================================================
                    Response Received
============================================================

✓ Status Code: 200
ℹ Response Time: 0.523s
ℹ Content-Type: application/json

Response Data:
{
  "execution_id": "...",
  "status": "completed",
  "data": {
    "text": "Hello Alice! Your message: Testing webhook!",
    "content": "Hello Alice! Your message: Testing webhook!",
    "output": "Hello Alice! Your message: Testing webhook!"
  },
  "execution": {
    ...
  }
}

Execution Details:
  Execution ID: ...
  Status: completed
  Duration: 0.523s

Node States:
  node_1: completed
  node_2: completed
  node_3: completed

Workflow Output Data:
{
  "text": "Hello Alice! Your message: Testing webhook!",
  "content": "Hello Alice! Your message: Testing webhook!",
  "output": "Hello Alice! Your message: Testing webhook!"
}

✓ Test completed successfully!
```

## Testing Different HTTP Methods

### GET Request

```bash
python test_webhook.py \
  --workflow-id "your-uuid" \
  --path "/hello" \
  --method GET
```

Note: For GET requests, data is sent as query parameters.

### POST with Custom Headers

Modify the script or use Python directly:

```python
import requests

url = "http://localhost:8000/api/workflows/{workflow-id}/webhook/hello/"
headers = {
    'Content-Type': 'application/json',
    'X-Custom-Header': 'custom-value'
}
data = {"name": "Test", "message": "Hello"}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

## Troubleshooting

### Connection Error

```
✗ Could not connect to http://localhost:8000
ℹ Make sure the server is running!
```

**Solution:** Start the Django server:
```bash
cd backend
python manage.py runserver
```

### 404 Not Found

```
✗ Status Code: 404
Error: Webhook trigger not found for path "/hello" and method "POST"
```

**Solutions:**
1. Check that the webhook path matches exactly (case-sensitive)
2. Verify the HTTP method matches (POST, GET, etc.)
3. Ensure the workflow has a webhook trigger node configured

### 500 Internal Server Error

```
✗ Status Code: 500
Error: Internal error: ...
```

**Solutions:**
1. Check the Django server logs for detailed error messages
2. Verify all nodes in the workflow are properly configured
3. Check that required properties are set on each node

### Timeout

```
✗ Request timed out after 30 seconds
```

**Solutions:**
1. Check if the workflow is taking too long to execute
2. Verify there are no infinite loops in the workflow
3. Check server logs for errors

## Advanced Usage

### Continuous Testing

Create a loop to test multiple times:

```python
import time
import requests

for i in range(10):
    response = requests.post(
        "http://localhost:8000/api/workflows/{id}/webhook/hello/",
        json={"name": f"Test {i}", "message": f"Message {i}"}
    )
    print(f"Test {i+1}: {response.status_code}")
    time.sleep(1)
```

### Testing with cURL

You can also test using cURL:

```bash
curl -X POST http://localhost:8000/api/workflows/{workflow-id}/webhook/hello/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "message": "Hello!"}'
```

### Testing from Page Builder

1. Create a button component in Page Builder
2. Configure it to trigger a workflow
3. Set the webhook URL to your backend workflow URL
4. Click the button in preview mode
5. Check the browser console for results

## Integration with Page Builder Widgets

The webhook endpoint can be called from Page Builder widgets. The widget JavaScript can use `fetch` or `XMLHttpRequest` to call the endpoint:

```javascript
async function triggerWorkflow() {
  const response = await fetch('http://localhost:8000/api/workflows/{id}/webhook/hello/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Widget User',
      message: 'Triggered from Page Builder!'
    })
  });
  
  const data = await response.json();
  console.log('Workflow result:', data);
  return data;
}
```

## Next Steps

- Test different workflow configurations
- Integrate webhooks into your Page Builder components
- Set up real-time updates using WebSockets/SSE
- Add authentication/authorization if needed

