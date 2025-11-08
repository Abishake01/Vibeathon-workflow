# n8n Integration Guide - FlowPages

This guide explains how to use the n8n integration feature in FlowPages, which allows UI components to trigger n8n workflows and receive real-time updates.

## Overview

FlowPages now supports seamless integration with n8n workflows. You can:
- Add workflow trigger buttons to your pages
- Configure them to call n8n webhooks
- Receive real-time updates as workflows execute
- Collect form data and send it to workflows

## Architecture

### Components

1. **Backend Endpoints** (`backend/workflows/n8n_views.py`)
   - `/api/n8n/workflows/run/` - Trigger n8n workflows
   - `/api/n8n/workflows/updates/` - Receive callbacks from n8n
   - `/api/n8n/workflows/{run_id}/status/` - Get workflow status
   - `/api/n8n/workflows/{run_id}/stream/` - SSE stream for real-time updates

2. **Frontend Components**
   - `WorkflowTrigger.jsx` - React component for workflow triggers
   - Workflow trigger block in GrapesJS
   - Configuration modal for setting up workflows

3. **API Service** (`frontend/src/services/api.js`)
   - `runN8nWorkflow()` - Trigger a workflow
   - `getWorkflowStatus()` - Get status
   - `subscribeToWorkflowUpdates()` - Subscribe to SSE updates

## Usage

### 1. Adding a Workflow Trigger Button

1. Open the Page Builder
2. In the Blocks panel, find the "Automation" category
3. Drag the "Workflow Trigger" block onto your page
4. Select the button component
5. Configure it (see below)

### 2. Configuring a Workflow Trigger

When you select a workflow trigger button, you can configure it:

**Required:**
- **n8n Webhook URL**: The webhook URL from your n8n workflow trigger node
  - Example: `https://n8n.example.com/webhook/flows/hot-lead`

**Optional:**
- **Workflow ID**: An identifier for tracking (e.g., "hot-lead-workflow")
- **Shared Secret**: HMAC secret for webhook authentication
- **Button Text**: Custom text for the button
- **Wait for Result**: Enable real-time progress updates
- **Show Status**: Display status messages below the button

### 3. Setting up n8n Workflow

#### Pattern A: Quick & Direct (No Realtime)

1. Create a webhook trigger in n8n
2. Add your business logic nodes
3. Add a "Respond to Webhook" node to return `{status: "ok"}`

**n8n Workflow Example:**
```
Webhook Trigger → Process Data → Respond to Webhook
```

#### Pattern B: Robust & Realtime (Recommended)

1. Create a webhook trigger in n8n
2. Add your business logic nodes
3. At important steps, add HTTP Request nodes that POST to:
   ```
   https://your-app.com/api/n8n/workflows/updates/
   ```
   With body:
   ```json
   {
     "runId": "{{ $json.runId }}",
     "step": "processing",
     "state": "progress",
     "data": {...},
     "message": "Processing your request..."
   }
   ```
4. At the end, send final update:
   ```json
   {
     "runId": "{{ $json.runId }}",
     "step": "completed",
     "state": "done",
     "data": {...},
     "message": "Workflow completed successfully"
   }
   ```

**n8n Workflow Example:**
```
Webhook Trigger → Process Step 1 → HTTP Request (progress) → 
Process Step 2 → HTTP Request (progress) → 
Final Processing → HTTP Request (done)
```

### 4. Collecting Form Data

The workflow trigger automatically collects:
- All form inputs (`<input>`, `<select>`, `<textarea>`) in the same form
- Elements with `data-workflow-field` attribute

Example:
```html
<form>
  <input name="email" type="email" />
  <input name="name" type="text" />
  <div data-workflow-field="customField">Custom Value</div>
  <button class="workflow-trigger-btn" ...>Submit</button>
</form>
```

The workflow will receive:
```json
{
  "formData": {
    "email": "user@example.com",
    "name": "John Doe",
    "customField": "Custom Value"
  },
  "componentId": "workflow-trigger",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## API Reference

### Trigger Workflow

```javascript
const response = await apiService.runN8nWorkflow(
  webhookUrl,
  {
    formData: {...},
    componentId: 'button-123',
    timestamp: new Date().toISOString()
  },
  {
    workflowId: 'my-workflow',
    secret: 'hmac-secret',
    waitForResult: true
  }
);
```

### Subscribe to Updates

```javascript
const eventSource = apiService.subscribeToWorkflowUpdates(runId, (update) => {
  console.log('Update:', update);
  // update.state: 'progress' | 'done' | 'error'
  // update.step: step name
  // update.data: workflow data
  // update.message: status message
});
```

## Security

### HMAC Authentication

To secure your webhooks:

1. Set a shared secret in your workflow configuration
2. The backend will generate an HMAC signature:
   ```
   X-Signature: sha256=<signature>
   ```
3. In n8n, verify the signature in your webhook trigger

### JWT Authentication

All API endpoints require JWT authentication (except the callback endpoint which uses a shared secret).

## Example: Lead Capture Form

1. **Create the Form in Page Builder:**
   - Add form inputs (name, email, phone)
   - Add a workflow trigger button
   - Configure button with n8n webhook URL

2. **Create n8n Workflow:**
   - Webhook Trigger (receives form data)
   - HTTP Request to CRM (create lead)
   - HTTP Request to Email Service (send notification)
   - HTTP Request to your backend `/api/n8n/workflows/updates/` (send progress)
   - Final HTTP Request with `state: "done"`

3. **User Experience:**
   - User fills form and clicks button
   - Button shows "Running..." with progress updates
   - When done, shows "Completed" with success message

## Troubleshooting

### Button doesn't trigger workflow
- Check that webhook URL is configured
- Verify n8n workflow is active
- Check browser console for errors

### No real-time updates
- Ensure "Wait for Result" is enabled
- Verify n8n workflow sends updates to `/api/n8n/workflows/updates/`
- Check that `runId` matches in all requests

### Authentication errors
- Verify JWT token is valid
- Check that shared secret matches between frontend and n8n

## Next Steps

- Add more workflow trigger components (forms, cards, etc.)
- Support for workflow templates
- Visual workflow builder integration
- Workflow execution history dashboard

