# Text Transform Node - Complete Guide

## Overview

The **Text Transform** node allows you to transform text data using various operations like templates, case conversion, replacements, and more. It's perfect for formatting responses, processing user input, or preparing data for output.

## Location

**Category:** Data  
**Icon:** Type (FiType)  
**Color:** Green (#10b981)

## Available Operations

### 1. Template (with expressions)
**Best for:** Creating formatted text with dynamic data

**How it works:**
- Use `{{ $json.field }}` to access data from previous nodes
- Supports nested fields: `{{ $json.user.name }}`
- Can use JavaScript expressions

**Example Template:**
```
Hello {{ $json.name }}! You sent: {{ $json.message }}
Timestamp: {{ $json.timestamp }}
```

**Input Data:**
```json
{
  "name": "John",
  "message": "Hello world",
  "timestamp": "2025-01-15"
}
```

**Output:**
```
Hello John! You sent: Hello world
Timestamp: 2025-01-15
```

**For Webhook Data:**
When using with webhook trigger, the data structure is:
```json
{
  "data": {
    "body": {
      "name": "John",
      "message": "Hello"
    }
  }
}
```

**Template for Webhook:**
```
Hello {{ $json.data.body.name }}! You sent: {{ $json.data.body.message }}
```

**Or with default values:**
```
Hello {{ $json.data.body.name || 'Guest' }}! 
Message: {{ $json.data.body.message || 'No message' }}
```

### 2. Uppercase
**Best for:** Converting text to uppercase

**Configuration:**
- **Text:** The text to transform (or leave empty to use input data)

**Example:**
- Input: `"hello world"`
- Output: `"HELLO WORLD"`

### 3. Lowercase
**Best for:** Converting text to lowercase

**Configuration:**
- **Text:** The text to transform

**Example:**
- Input: `"HELLO WORLD"`
- Output: `"hello world"`

### 4. Capitalize
**Best for:** Capitalizing first letter

**Configuration:**
- **Text:** The text to transform

**Example:**
- Input: `"hello world"`
- Output: `"Hello world"`

### 5. Replace Text
**Best for:** Finding and replacing text

**Configuration:**
- **Text:** Source text
- **Find:** Text to find
- **Replace:** Replacement text

**Example:**
- Text: `"Hello John"`
- Find: `"John"`
- Replace: `"Jane"`
- Output: `"Hello Jane"`

### 6. Extract Pattern
**Best for:** Extracting text using regex patterns

**Configuration:**
- **Text:** Source text
- **Pattern:** Regex pattern (e.g., `\d+` for numbers, `[A-Z]+` for uppercase letters)

**Example:**
- Text: `"Order #12345 confirmed"`
- Pattern: `#\d+`
- Output: `"#12345"`

### 7. Trim Whitespace
**Best for:** Removing leading/trailing whitespace

**Configuration:**
- **Text:** Text to trim

**Example:**
- Input: `"  hello world  "`
- Output: `"hello world"`

### 8. Concatenate
**Best for:** Combining multiple fields into one text

**Configuration:**
- **Fields:** Key-value pairs to concatenate
  - Key: Field name from input data
  - Value: Static text or field reference

**Example:**
- Fields:
  - Key: `name`, Value: (empty - uses input data)
  - Key: (empty), Value: `" - "`
  - Key: `status`, Value: (empty)
- Input: `{"name": "John", "status": "Active"}`
- Output: `"John - Active"`

## Step-by-Step: Creating a Simple Workflow

### Example: Webhook Response Formatter

**Goal:** Create a workflow that receives webhook data and formats a nice response.

#### Step 1: Add Webhook Trigger
1. Drag **Webhook** node from Triggers
2. Set path: `/format-response`
3. Set method: `POST`

#### Step 2: Add Text Transform Node
1. Drag **Text Transform** from Data category
2. Connect it from Webhook node
3. Configure:
   - **Operation:** `Template (with expressions)`
   - **Template:**
     ```
     ✅ Request Received!
     
     From: {{ $json.body.name || 'Anonymous' }}
     Message: {{ $json.body.message }}
     Time: {{ $json.body.timestamp || 'N/A' }}
     
     Thank you for your submission!
     ```

#### Step 3: Add Output Node (Optional)
1. Drag **Output** node
2. Connect from Text Transform
3. This will be the response sent back

#### Step 4: Save and Test
1. Save the workflow
2. Get the webhook URL
3. Test with curl:
   ```bash
   curl -X POST http://localhost:8000/api/workflows/{id}/webhook/format-response/ \
     -H "Content-Type: application/json" \
     -d '{
       "name": "John Doe",
       "message": "Hello from API!",
       "timestamp": "2025-01-15 10:30:00"
     }'
   ```

## Advanced Examples

### Example 1: Email Template

**Template:**
```
Subject: New Contact Form Submission

Dear Team,

A new contact form has been submitted:

Name: {{ $json.body.name }}
Email: {{ $json.body.email }}
Phone: {{ $json.body.phone }}
Message: {{ $json.body.message }}

Submitted at: {{ $json.body.timestamp }}

Best regards,
Automated System
```

### Example 2: Data Extraction

**Operation:** Extract Pattern  
**Text:** `{{ $json.body.text }}`  
**Pattern:** `\b\d{4}-\d{2}-\d{2}\b` (extracts dates in YYYY-MM-DD format)

### Example 3: Multi-field Concatenation

**Operation:** Concatenate  
**Fields:**
- Key: `firstName`, Value: (empty)
- Key: (empty), Value: `" "`
- Key: `lastName`, Value: (empty)
- Key: (empty), Value: `" ("`
- Key: `email`, Value: (empty)
- Key: (empty), Value: `")"`

**Input:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com"
}
```

**Output:**
```
John Doe (john@example.com)
```

## Template Expression Syntax

### Accessing Data
- `{{ $json.field }}` - Access top-level field
- `{{ $json.user.name }}` - Access nested field
- `{{ $json.items[0].title }}` - Access array item

### Conditional Logic
- `{{ $json.status || 'Unknown' }}` - Default value if field is empty
- `{{ $json.count > 0 ? 'Active' : 'Inactive' }}` - Ternary operator

### Common Patterns
```javascript
// Default values
{{ $json.name || 'Guest' }}

// Conditional
{{ $json.verified ? 'Verified' : 'Unverified' }}

// Math operations
{{ $json.price * 1.1 }} // Add 10% tax

// String operations
{{ $json.email.split('@')[0] }} // Extract username
```

## Tips & Best Practices

1. **Always use default values** for optional fields:
   ```
   {{ $json.name || 'Anonymous' }}
   ```

2. **Test your templates** with sample data before deploying

3. **Use Extract Pattern** for structured data extraction (emails, phone numbers, etc.)

4. **Combine operations** - Chain multiple Text Transform nodes for complex transformations

5. **Use Concatenate** for building structured output from multiple fields

## Troubleshooting

### Template not working?
- Check field names match exactly (case-sensitive)
- Use `{{ $json.field || 'fallback' }}` for optional fields
- Verify input data structure in previous node output

### Extract Pattern not finding matches?
- Test your regex pattern separately
- Use online regex testers to verify
- Remember: Python regex syntax (not JavaScript)

### Concatenate not working?
- Make sure field keys exist in input data
- Use empty value fields for separators (spaces, dashes, etc.)
- Check that fields are not null/undefined

## Complete Example Workflow JSON

```json
{
  "name": "Text Transform Example",
  "nodes": [
    {
      "id": "node_1",
      "type": "webhook",
      "position": { "x": 100, "y": 100 },
      "data": {
        "type": "webhook",
        "label": "Webhook",
        "properties": {
          "path": "/format",
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
          "template": "Hello {{ $json.body.name }}! Your message '{{ $json.body.message }}' has been received."
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

## Quick Reference

| Operation | Use Case | Key Properties |
|-----------|----------|---------------|
| Template | Dynamic text with data | `template` |
| Uppercase | Convert to uppercase | `text` |
| Lowercase | Convert to lowercase | `text` |
| Capitalize | First letter uppercase | `text` |
| Replace | Find and replace | `text`, `find`, `replace` |
| Extract | Regex extraction | `text`, `pattern` |
| Trim | Remove whitespace | `text` |
| Concatenate | Combine fields | `fields` (key-value pairs) |

## Next Steps

1. **Create your workflow** with Webhook → Text Transform → Output
2. **Test with sample data** using the Execute button
3. **Save your workflow** to get the webhook URL
4. **Connect to Page Builder** using the workflow trigger button
5. **Test end-to-end** by clicking the button in your page

Happy transforming! 🚀

