import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiX, FiUser, FiLoader, FiMessageCircle, FiClock, FiPlus, FiTrash2 } from 'react-icons/fi';
import { workflowApi } from '../../api/workflowApi';
import MessageRenderer from './MessageRenderer';

const AIChatbot = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant for the workflow builder. I can help you with creating workflows, understanding nodes, and answering questions about the platform. How can I assist you today?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showConversationManager, setShowConversationManager] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversations from localStorage
  const loadConversations = () => {
    try {
      const saved = localStorage.getItem('ai-chatbot-conversations');
      if (saved) {
        const conversations = JSON.parse(saved);
        setConversations(conversations);
        return conversations;
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
    return [];
  };

  // Save conversations to localStorage
  const saveConversations = (conversations) => {
    try {
      localStorage.setItem('ai-chatbot-conversations', JSON.stringify(conversations));
      setConversations(conversations);
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  };

  // Save current conversation
  const saveCurrentConversation = () => {
    if (messages.length <= 1) return; // Don't save if only initial message
    
    const conversationId = currentConversationId || `conv_${Date.now()}`;
    const conversation = {
      id: conversationId,
      title: messages.find(m => m.role === 'user')?.content?.substring(0, 50) + '...' || 'New Conversation',
      messages: messages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const allConversations = loadConversations();
    const existingIndex = allConversations.findIndex(c => c.id === conversationId);
    
    if (existingIndex >= 0) {
      allConversations[existingIndex] = conversation;
    } else {
      allConversations.unshift(conversation);
    }

    // Keep only last 20 conversations
    const limitedConversations = allConversations.slice(0, 20);
    saveConversations(limitedConversations);
    setCurrentConversationId(conversationId);
  };

  // Load a specific conversation
  const loadConversation = (conversationId) => {
    const allConversations = loadConversations();
    const conversation = allConversations.find(c => c.id === conversationId);
    if (conversation) {
      setMessages(conversation.messages);
      setCurrentConversationId(conversationId);
      setShowConversationManager(false);
    }
  };

  // Start new conversation
  const startNewConversation = () => {
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: 'Hello! I\'m your AI assistant for the workflow builder. I can help you with creating workflows, configuring nodes, and answering questions about the platform. How can I assist you today?',
        timestamp: new Date().toISOString()
      }
    ]);
    setCurrentConversationId(null);
    setShowConversationManager(false);
  };

  // Delete conversation
  const deleteConversation = (conversationId) => {
    const allConversations = loadConversations();
    const updatedConversations = allConversations.filter(c => c.id !== conversationId);
    saveConversations(updatedConversations);
    
    if (conversationId === currentConversationId) {
      startNewConversation();
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Save conversation when messages change (but not on initial load)
  useEffect(() => {
    if (messages.length > 1) {
      const timeoutId = setTimeout(() => {
        saveCurrentConversation();
      }, 1000); // Debounce saving
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

  // Check if API key is configured when component mounts
  useEffect(() => {
    const settings = JSON.parse(localStorage.getItem('ai-chatbot-settings') || '{}');
    if (!settings.apiKey || !settings.apiKey.trim()) {
      const configMessage = {
        id: Date.now(),
        role: 'assistant',
        content: '⚠️ Please configure your AI settings first. Click the Settings button (⚙️) to set up your API key and model.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, configMessage]);
    }
    // Don't add the help message automatically to avoid duplicate assistant messages
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get settings from localStorage
      const settings = JSON.parse(localStorage.getItem('ai-chatbot-settings') || '{}');
      
      if (!settings.apiKey || !settings.apiKey.trim()) {
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Please configure your AI settings first. Click the settings button to set up your API key and model.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Prepare conversation history (exclude the initial assistant message and ensure proper alternation)
      const conversationHistory = messages
        .filter(msg => msg.id !== 1) // Exclude initial assistant message
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Ensure conversation history alternates properly (remove consecutive messages of same role)
      const cleanedHistory = [];
      let lastRole = null;
      
      for (const msg of conversationHistory) {
        if (lastRole !== msg.role) {
          cleanedHistory.push(msg);
          lastRole = msg.role;
        }
      }

      // Use direct API call with settings and retry logic
      let response;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          response = await fetch('http://localhost:8000/api/ai-chat/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: inputMessage.trim(),
              conversation_history: cleanedHistory,
              settings: settings
            }),
          });
          
          // If successful, break out of retry loop
          if (response.ok || response.status === 503) {
            break;
          }
          
          // If not successful and we have retries left, wait and try again
          if (retryCount < maxRetries) {
            // Show retry message to user
            const retryMessage = {
              id: Date.now() + retryCount,
              role: 'assistant',
              content: `🔄 Retrying... (attempt ${retryCount + 1}/${maxRetries + 1})`,
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, retryMessage]);
            
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            retryCount++;
          } else {
            break;
          }
        } catch (error) {
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            retryCount++;
          } else {
            throw error;
          }
        }
      }

      const data = await response.json();
      
      // Log timing information to console for debugging
      if (data.execution_time_ms || data.total_request_time_ms) {
        console.log('🤖 AI Response Timing:', {
          executionTime: data.execution_time_ms ? `${Math.round(data.execution_time_ms)}ms` : 'N/A',
          totalRequestTime: data.total_request_time_ms ? `${Math.round(data.total_request_time_ms)}ms` : 'N/A',
          responseLength: data.response ? data.response.length : 0
        });
      }

      if (response.ok) {
        // Add timing information to the response
        let responseContent = data.response;
        if (data.execution_time_ms) {
          const executionTime = Math.round(data.execution_time_ms);
          responseContent += `\n\n⏱️ *Response time: ${executionTime}ms*`;
        }
        
        const aiMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: responseContent,
          timestamp: new Date().toISOString(),
          executionTime: data.execution_time_ms,
          totalRequestTime: data.total_request_time_ms
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        let errorContent = 'Sorry, I encountered an error. Please check your settings and try again.';
        
        if (response.status === 503) {
          if (data.response && data.response.includes('API key')) {
            errorContent = 'AI service is unavailable. Please check your API key in Settings and make sure it\'s valid.';
          } else {
            errorContent = 'AI service is temporarily unavailable. Please try again in a moment.';
          }
        } else if (data.response) {
          errorContent = data.response;
        } else if (data.error) {
          errorContent = `Error: ${data.error}`;
        }
        
        // Add timing information to error messages too
        if (data.total_request_time_ms) {
          const requestTime = Math.round(data.total_request_time_ms);
          errorContent += `\n\n⏱️ *Request time: ${requestTime}ms*`;
        }
        
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: errorContent,
          timestamp: new Date().toISOString(),
          executionTime: data.execution_time_ms,
          totalRequestTime: data.total_request_time_ms
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting. The AI service may not be configured yet. Please try again later or contact support.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: 'Hello! I\'m your AI assistant for the workflow builder. I can help you with creating workflows, configuring nodes, and answering questions about the platform. How can I assist you today?',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  return (
    <div className={`ai-chatbot ${isOpen ? 'open' : ''}`}>
      <div className="chatbot-header">
        <div className="chatbot-title">
          <FiMessageCircle className="chatbot-icon" />
          <span>AI Assistant</span>
        </div>
        <div className="chatbot-actions">
          <button 
            className="conversation-btn" 
            onClick={() => setShowConversationManager(!showConversationManager)}
            title="Conversation history"
          >
            <FiClock />
          </button>
          <button 
            className="new-conversation-btn" 
            onClick={startNewConversation}
            title="New conversation"
          >
            <FiPlus />
          </button>
          <button 
            className="clear-btn" 
            onClick={clearChat}
            title="Clear conversation"
          >
            Clear
          </button>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
      </div>

      <div className="chatbot-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-avatar">
              {message.role === 'user' ? <FiUser /> : <FiMessageCircle />}
            </div>
            <div className="message-content">
              <MessageRenderer content={message.content} role={message.role} />
              <div className="message-time">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">
              <FiMessageCircle />
            </div>
            <div className="message-content">
              <div className="message-text loading">
                <FiLoader className="spinner" />
                AI is thinking...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input">
        <div className="quick-actions">
          <button 
            className="quick-action-btn"
            onClick={() => setInputMessage("What is a workflow?")}
            title="Learn about workflows"
          >
            🔄 What is a Workflow?
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => setInputMessage("How do I create a workflow?")}
            title="Get help creating workflows"
          >
            🛠️ Create Workflow
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => setInputMessage("What types of nodes are available?")}
            title="Learn about node types"
          >
            📦 Node Types
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => setInputMessage("How do I connect nodes?")}
            title="Learn about connections"
          >
            🔗 Connect Nodes
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => setInputMessage("How do I execute a workflow?")}
            title="Learn about execution"
          >
            ▶️ Execute Workflow
          </button>
        </div>
        <div className="input-container">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about workflows, nodes, or how to use this platform..."
            rows="1"
            disabled={isLoading}
          />
          <button 
            className="send-btn" 
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
          >
            <FiSend />
          </button>
        </div>
      </div>

      {/* Conversation Manager Popup */}
      {showConversationManager && (
        <div className="conversation-manager">
          <div className="conversation-manager-header">
            <h3>Conversation History</h3>
            <button 
              className="close-manager-btn"
              onClick={() => setShowConversationManager(false)}
            >
              <FiX />
            </button>
          </div>
          <div className="conversation-list">
            {conversations.length === 0 ? (
              <div className="no-conversations">
                <p>No conversations yet. Start chatting to create your first conversation!</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div 
                  key={conversation.id} 
                  className={`conversation-item ${conversation.id === currentConversationId ? 'active' : ''}`}
                >
                  <div 
                    className="conversation-content"
                    onClick={() => loadConversation(conversation.id)}
                  >
                    <div className="conversation-title">{conversation.title}</div>
                    <div className="conversation-date">
                      {new Date(conversation.updatedAt).toLocaleDateString()} at{' '}
                      {new Date(conversation.updatedAt).toLocaleTimeString()}
                    </div>
                    <div className="conversation-preview">
                      {conversation.messages.length} messages
                    </div>
                  </div>
                  <button 
                    className="delete-conversation-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conversation.id);
                    }}
                    title="Delete conversation"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatbot;
