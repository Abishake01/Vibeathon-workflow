import React from 'react';
import { FiBook, FiCode, FiFileText, FiGitBranch } from 'react-icons/fi';

const AIChatbotDemo = () => {
  const demoMessages = [
    {
      role: 'assistant',
      content: `# Workflow Builder Documentation

## Project Overview
This is a powerful workflow builder application with AI capabilities.

## Key Features
- **Visual Workflow Design**: Drag-and-drop interface for creating workflows
- **AI Integration**: Built-in AI assistant for help and documentation
- **Node Types**: Support for various node types including triggers, actions, and AI nodes
- **Real-time Execution**: Execute workflows and see results in real-time

## Getting Started

### Backend Setup
\`\`\`bash
cd backend
pip install -r requirements.txt
python manage.py runserver 8000
\`\`\`

### Frontend Setup
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

## API Endpoints
- \`/api/workflows/\` - Workflow management
- \`/api/ai-chat/\` - AI chatbot endpoint
- \`/api/test-api-key/\` - API key validation

## File Structure
\`\`\`
workflow-builder/
├── backend/
│   ├── workflows/
│   └── agent_flow_backend/
├── frontend/
│   ├── src/
│   └── components/
└── docs/
\`\`\`

This documentation is automatically generated and can be read by the AI assistant!`,
      timestamp: new Date().toISOString()
    }
  ];

  return (
    <div className="ai-chatbot-demo">
      <div className="demo-header">
        <h3>🤖 AI Assistant Demo</h3>
        <p>Enhanced with markdown rendering and documentation reading capabilities</p>
      </div>
      
      <div className="demo-features">
        <div className="feature-card">
          <FiBook className="feature-icon" />
          <h4>Documentation Reading</h4>
          <p>AI can read and explain project files, READMEs, and documentation</p>
        </div>
        
        <div className="feature-card">
          <FiCode className="feature-icon" />
          <h4>Code Formatting</h4>
          <p>Syntax highlighting for code blocks and proper markdown rendering</p>
        </div>
        
        <div className="feature-card">
          <FiFileText className="feature-icon" />
          <h4>File Content</h4>
          <p>Special formatting for file content with headers and proper styling</p>
        </div>
        
        <div className="feature-card">
          <FiGitBranch className="feature-icon" />
          <h4>Project Structure</h4>
          <p>Understand and explain project architecture and file organization</p>
        </div>
      </div>
      
      <div className="demo-actions">
        <h4>Try These Commands:</h4>
        <div className="demo-commands">
          <button className="demo-command">📚 "Show me the README files"</button>
          <button className="demo-command">📋 "List all documentation"</button>
          <button className="demo-command">🏗️ "Explain the project structure"</button>
          <button className="demo-command">🔧 "Show backend API docs"</button>
        </div>
      </div>
    </div>
  );
};

export default AIChatbotDemo;
