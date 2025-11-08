import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiX, FiMessageCircle, FiMove } from 'react-icons/fi';

const ChatBox = ({ isOpen, onClose, onExecutionStart, onExecuteWorkflow }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you with your workflow today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatBoxRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Track execution in logs
    if (onExecutionStart) {
      onExecutionStart({
        nodeType: 'chat-assistant',
        nodeName: 'Chat Assistant',
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        source: 'chat',
        input: inputValue.trim(),
        output: inputValue.trim(),
        duration: 1
      });
    }
    
    // Execute workflow with chat message
    if (onExecuteWorkflow) {
      try {
        setIsLoading(true);
        const result = await onExecuteWorkflow(inputValue.trim());
        
        // Add AI response to messages
        if (result && result.response) {
          const aiMessage = {
            id: Date.now() + 1,
            type: 'assistant',
            content: result.response,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
        }
      } catch (error) {
        console.error('Workflow execution failed:', error);
        const errorMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: `Error: ${error.message}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
    
    setInputValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.chat-input-container') || e.target.closest('.chat-messages')) {
      return; // Don't drag if clicking on input or messages
    }
    
    setIsDragging(true);
    const rect = chatBoxRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - 350;
    const maxY = window.innerHeight - 500;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={chatBoxRef}
      className={`chat-box ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="chat-header">
        <div className="chat-title">
          <FiMessageCircle style={{ marginRight: '8px' }} />
          AI Assistant
          <FiMove className="drag-handle" style={{ marginLeft: '8px', opacity: 0.7 }} />
        </div>
        <button className="chat-close" onClick={onClose}>
          <FiX />
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`chat-message ${message.type}`}>
            <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
              {message.content}
            </div>
            <div style={{ 
              fontSize: '11px', 
              opacity: 0.7, 
              marginTop: '4px',
              textAlign: message.type === 'user' ? 'right' : 'left'
            }}>
              {formatTime(message.timestamp)}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="chat-message assistant">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '14px',
              opacity: 0.7
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid var(--border)',
                borderTop: '2px solid var(--primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              AI is thinking...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          ref={inputRef}
          className="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything about your workflow..."
          rows={1}
          disabled={isLoading}
        />
        <button
          className="chat-send"
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
        >
          <FiSend />
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
