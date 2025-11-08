import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FiSettings, FiLoader, FiPlay, FiTrash2, FiCopy, FiMessageCircle } from 'react-icons/fi';
import { BsCheckCircle, BsXCircle } from 'react-icons/bs';
import { nodeTypeDefinitions } from '../../nodeTypes.jsx';

const WorkflowNode = ({ data, selected, id }) => {
  const [showActions, setShowActions] = useState(false);
  const nodeTypeDef = nodeTypeDefinitions[data.type];
  const executionState = data.executionState;
  const executionStatus = data.executionStatus; // From ExecutionsView
  const showStatusIndicator = data.showStatusIndicator; // From ExecutionsView
  const statusIndicator = data.statusIndicator; // 'error' or 'success'
  
  // Determine if this is a trigger node (no inputs)
  const isTrigger = nodeTypeDef?.nodeType === 'trigger';
  const isAgent = nodeTypeDef?.nodeType === 'agent';
  const isChatModel = nodeTypeDef?.nodeType === 'chat-model';
  const isMemory = nodeTypeDef?.nodeType === 'memory';
  const isTool = nodeTypeDef?.nodeType === 'tool';
  const isChatTrigger = data.type === 'when-chat-received';
  
  // Validate node configuration
  const validateNode = () => {
    try {
      const savedInputs = localStorage.getItem(`inputValues_${id}`);
      const properties = savedInputs ? JSON.parse(savedInputs) : (data.properties || {});
      
      // Check for required properties
      if (nodeTypeDef?.properties) {
        const requiredProps = Object.entries(nodeTypeDef.properties)
          .filter(([key, prop]) => prop.required);
        
        for (const [key, prop] of requiredProps) {
          if (!properties[key] || properties[key] === '') {
            return { valid: false, error: `Missing: ${prop.label}` };
          }
        }
      }
      
      // Check API key for AI nodes
      if (data.type?.includes('groq') || data.type?.includes('gpt') || data.type?.includes('claude')) {
        const apiKey = properties.api_key;
        if (!apiKey || apiKey.length < 10) {
          return { valid: false, error: 'API key required' };
        }
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Config error' };
    }
  };
  
  const validation = validateNode();
  
  // Get node color
  const nodeColor = nodeTypeDef?.color || '#666666';

  const getStatusIcon = () => {
    // Status indicator from ExecutionsView takes highest priority
    if (showStatusIndicator && statusIndicator) {
      if (statusIndicator === 'error') {
        return (
          <div className="execution-status-indicator error" title="Error in execution">
            <BsXCircle style={{ color: '#ef4444', fontSize: '20px' }} />
          </div>
        );
      }
      if (statusIndicator === 'success') {
        return (
          <div className="execution-status-indicator success" title="Success in execution">
            <BsCheckCircle style={{ color: '#10b981', fontSize: '20px' }} />
          </div>
        );
      }
    }
    
    // Execution state takes priority
    if (executionState?.status === 'running') {
      return <FiLoader className="status-icon spin" style={{ color: '#f59e0b' }} />;
    }
    if (executionState?.status === 'completed') {
      return <BsCheckCircle className="status-icon success" style={{ color: '#10b981' }} />;
    }
    if (executionState?.status === 'error') {
      return <BsXCircle className="status-icon error" style={{ color: '#ef4444' }} />;
    }
    
    // Show validation status when not executing
    if (!validation.valid) {
      return (
        <div className="validation-icon" title={validation.error}>
          <BsXCircle style={{ color: '#ef4444', fontSize: '16px' }} />
        </div>
      );
    }
    
    // Show checkmark for valid nodes
    return (
      <div className="validation-icon" title="Ready">
        <BsCheckCircle style={{ color: '#10b981', fontSize: '16px' }} />
      </div>
    );
  };

  const getProcessingAnimation = () => {
    if (executionState?.status === 'running') {
      return (
        <div className="processing-overlay">
          <div className="processing-spinner"></div>
          <div className="processing-text">Processing...</div>
        </div>
      );
    }
    return null;
  };

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    if (data.onSettingsClick) {
      data.onSettingsClick(id);
    }
  };

  const handleExecutionClick = (e) => {
    e.stopPropagation();
    
    // If this is a manual trigger, just trigger execution
    if (data.type === 'manual-trigger') {
      if (data.onExecutionClick) {
        data.onExecutionClick(id);
      }
      return;
    }
    
    // For other nodes, show output
    if (data.onExecutionClick) {
      data.onExecutionClick(id);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  const handleDuplicateClick = (e) => {
    e.stopPropagation();
    if (data.onDuplicate) {
      data.onDuplicate(id);
    }
  };

  const handleInputClick = (e) => {
    e.stopPropagation();
    // If this is a chat input, open chat box
    if (isChatTrigger && data.onChatClick) {
      data.onChatClick(id);
    }
  };

  const handleChatClick = (e) => {
    e.stopPropagation();
    if (data.onChatClick) {
      data.onChatClick(id);
    }
  };

  const nodeClass = `workflow-node ${isTrigger ? 'trigger-node' : ''} ${isAgent ? 'agent-node' : ''} ${isChatModel ? 'chat-model-node' : ''} ${selected ? 'selected' : ''} ${executionState?.status || ''} ${!validation.valid && !executionState ? 'node-invalid' : ''}`;

  // Get inputs and outputs from node definition
  const inputs = nodeTypeDef?.inputs || [];
  const outputs = nodeTypeDef?.outputs || [];

  return (
    <div 
      className={nodeClass} 
      style={{
        borderLeft: `4px solid ${nodeColor}`,
        '--node-color': nodeColor
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Hover Action Menu - Only for non-AI agent nodes */}
      {showActions && !isAgent && (
        <div className="node-actions-menu">
          <button 
            className="action-menu-btn action-execute" 
            onClick={handleExecutionClick}
            title="Execute Node"
          >
            <FiPlay />
          </button>
          <button 
            className="action-menu-btn action-duplicate" 
            onClick={handleDuplicateClick}
            title="Duplicate Node"
          >
            <FiCopy />
          </button>
          <button 
            className="action-menu-btn action-delete" 
            onClick={handleDeleteClick}
            title="Delete Node"
          >
            <FiTrash2 />
          </button>
        </div>
      )}

      {/* AI Agent Bottom Action Menu */}
      {showActions && isAgent && (
        <div className="ai-agent-bottom-actions">
          <button 
            className="action-menu-btn action-execute" 
            onClick={handleExecutionClick}
            title="Execute Node"
          >
            <FiPlay />
          </button>
          <button 
            className="action-menu-btn action-duplicate" 
            onClick={handleDuplicateClick}
            title="Duplicate Node"
          >
            <FiCopy />
          </button>
          <button 
            className="action-menu-btn action-delete" 
            onClick={handleDeleteClick}
            title="Delete Node"
          >
            <FiTrash2 />
          </button>
        </div>
      )}

      {/* Chat Hover Button - Only for Chat Trigger */}
      {showActions && isChatTrigger && (
        <button 
          className="chat-hover-btn" 
          onClick={handleChatClick}
          title="Open Chat"
        >
          <FiMessageCircle />
        </button>
      )}
      
      {/* Render Input Handles */}
      {!isTrigger && inputs.length > 0 && (
        <>
          {inputs.map((input, index) => {
            const isAIInput = input.type === 'ai';
            const isMainInput = input.type === 'main';
            
            if (isAgent && isAIInput) {
              // AI Agent special inputs (chat-model, memory, tools) at the top
              const leftPosition = input.name === 'chat-model' ? '25%' : 
                                  input.name === 'memory' ? '50%' : 
                                  input.name === 'tools' ? '75%' : '50%';
              
              // Get color for label based on input type
              const labelColor = input.name === 'chat-model' ? '#10b981' : 
                                input.name === 'memory' ? '#a855f7' : 
                                input.name === 'tools' ? '#10b981' : '#8b5cf6';
              
              return (
                <div key={input.name}>
                  <Handle
                    type="target"
                    position={Position.Top}
                    id={input.name}
                    className={`node-handle input-handle ai-input ai-input-${input.name}`}
                    style={{ 
                      left: leftPosition,
                      top: '-8px'
                    }}
                    isConnectable={true}
                    title={input.displayName}
                    onClick={handleInputClick}
                  />
                  <div className="input-label" style={{
                    position: 'absolute',
                    top: '-32px',
                    left: leftPosition,
                    transform: 'translateX(-50%)',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: labelColor,
                    whiteSpace: 'nowrap',
                    zIndex: 15,
                    textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                    background: 'rgba(0,0,0,0.1)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backdropFilter: 'blur(4px)'
                  }}>
                    {input.displayName}
                  </div>
                </div>
              );
            } else if (isMainInput) {
              // Standard left-side input
              const topPosition = inputs.length === 1 ? '50%' : 
                                 `${((index + 1) / (inputs.length + 1)) * 100}%`;
              
              return (
                <Handle
                  key={input.name}
                  type="target"
                  position={Position.Left}
                  id={input.name}
                  className="node-handle input-handle main-input"
                  style={{ top: topPosition }}
                  isConnectable={true}
                  title={input.displayName}
                  onClick={handleInputClick}
                />
              );
            }
            return null;
          })}
        </>
      )}

      {/* Execution Status Indicator (from ExecutionsView) */}
      {showStatusIndicator && statusIndicator && (
        <div className="execution-status-indicator-wrapper">
          {getStatusIcon()}
        </div>
      )}
      
      {/* Node Content */}
      <div className="node-header">
        <div className="node-icon" style={{
          background: `linear-gradient(135deg, ${nodeColor}20, ${nodeColor}10)`
        }}>
          {nodeTypeDef?.icon || '📦'}
        </div>
        <div className="node-info">
          <div className="node-label">{data.label || nodeTypeDef?.name || data.type || 'Unknown Node'}</div>
          <div className="node-type">{nodeTypeDef?.category || 'Unknown'}</div>
        </div>
      </div>
      
      {/* Error Message */}
      {(executionState?.status === 'error' || (!executionState && !validation.valid)) && (
        <div className="node-error-message">
          {executionState?.error || validation.error}
        </div>
      )}
      
      {/* Node Actions */}
      <div className="node-actions">
        {getStatusIcon()}
        <button 
          className="node-action-btn" 
          onClick={handleExecutionClick}
          title="View Output"
        >
          <FiPlay />
        </button>
        <button 
          className="node-action-btn" 
          onClick={handleSettingsClick}
          title="Settings"
        >
          <FiSettings />
        </button>
      </div>

      {/* Render Output Handles */}
      {outputs.length > 0 && (
        <>
          {outputs.map((output, index) => {
            const isAIOutput = output.type === 'ai';
            
            if (isAIOutput) {
              // AI outputs (chat models, memory, tools) - circle shape on right
              return (
                <Handle
                  key={output.name}
                  type="source"
                  position={Position.Right}
                  id={output.name}
                  className="node-handle output-handle ai-output"
                  style={{ top: '50%' }}
                  isConnectable={true}
                  title={output.displayName}
                />
              );
            } else {
              // Standard outputs
              const topPosition = outputs.length === 1 ? '50%' : 
                                 outputs.length === 2 ? (index === 0 ? '35%' : '65%') :
                                 `${((index + 1) / (outputs.length + 1)) * 100}%`;
              
              return (
                <div key={output.name}>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={output.name}
                    className={`node-handle output-handle main-output ${output.name === 'true' ? 'handle-true' : ''} ${output.name === 'false' ? 'handle-false' : ''}`}
                    style={{ top: topPosition }}
                    isConnectable={true}
                    title={output.displayName}
                  />
                  {/* Label for conditional outputs */}
                  {(output.name === 'true' || output.name === 'false') && (
                    <div className="output-label" style={{
                      position: 'absolute',
                      top: topPosition,
                      right: '-50px',
                      transform: 'translateY(-50%)',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: output.name === 'true' ? '#10b981' : '#ef4444',
                      whiteSpace: 'nowrap'
                    }}>
                      {output.displayName}
                    </div>
                  )}
                </div>
              );
            }
          })}
        </>
      )}

      <style>{`
        .workflow-node {
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: 8px;
          min-width: 200px;
          padding: 16px;
          transition: all 0.2s ease;
          position: relative;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .workflow-node:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }
        
        .execution-status-indicator-wrapper {
          position: absolute;
          top: -12px;
          right: -12px;
          z-index: 1000;
        }

        /* Hover Action Menu */
        .node-actions-menu {
          position: absolute;
          top: -12px;
          right: -12px;
          display: flex;
          gap: 4px;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .action-menu-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid var(--border);
          background: var(--surface);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .action-menu-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        .action-execute {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }

        .action-execute:hover {
          background: #7c3aed;
          border-color: #7c3aed;
        }

        .action-duplicate {
          background: #06b6d4;
          border-color: #06b6d4;
          color: white;
        }

        .action-duplicate:hover {
          background: #0891b2;
          border-color: #0891b2;
        }

        .action-delete {
          background: #ef4444;
          border-color: #ef4444;
          color: white;
        }

        .action-delete:hover {
          background: #dc2626;
          border-color: #dc2626;
        }

        /* AI Agent Bottom Actions */
        .ai-agent-bottom-actions {
          position: absolute;
          bottom: -12px;
          right: -12px;
          display: flex;
          gap: 4px;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        .workflow-node.selected {
          border-color: var(--node-color, var(--primary));
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
        }

        .workflow-node.trigger-node {
          border-radius: 20px;
          background: linear-gradient(135deg, var(--surface), var(--background));
        }

        .workflow-node.agent-node {
          min-width: 260px;
          min-height: 120px;
          padding: 20px;
        }

        .workflow-node.chat-model-node,
        .workflow-node[data-type="memory"],
        .workflow-node[data-type="tool"] {
          border-radius: 50px;
          min-width: 160px;
          padding: 12px 20px;
        }

        .workflow-node.running {
          border-color: #f59e0b;
          box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.2);
          animation: pulse-running 1.5s ease-in-out infinite;
        }

        @keyframes pulse-running {
          0%, 100% { 
            border-color: #f59e0b;
            box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.2);
          }
          50% { 
            border-color: #fbbf24;
            box-shadow: 0 0 0 8px rgba(251, 191, 36, 0.3);
          }
        }

        .workflow-node.completed {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
          animation: pulse-completed 0.5s ease;
        }

        @keyframes pulse-completed {
          0% { 
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          }
          100% { 
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
          }
        }

        .workflow-node.error {
          border-color: #ef4444;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), var(--surface));
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }

        .workflow-node.node-invalid {
          border-color: #ef4444;
          opacity: 0.9;
        }

        .validation-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .node-error-message {
          background: rgba(239, 68, 68, 0.1);
          border-left: 3px solid #ef4444;
          padding: 6px 10px;
          margin: 8px 0;
          border-radius: 4px;
          font-size: 11px;
          color: #ef4444;
          font-weight: 500;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .node-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .node-icon {
          font-size: 20px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: var(--hover);
        }

        .node-icon svg {
          color: var(--text);
        }

        .node-info {
          flex: 1;
          min-width: 0;
        }

        .node-label {
          font-weight: 600;
          font-size: 13px;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .node-type {
          font-size: 10px;
          color: var(--textSecondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .node-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          justify-content: flex-end;
        }

        .node-action-btn {
          background: var(--background);
          border: 1px solid var(--border);
          color: var(--textSecondary);
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        .node-action-btn:hover {
          background: var(--hover);
          color: var(--text);
          border-color: var(--text);
        }

        .status-icon {
          font-size: 14px;
        }

        .status-icon.success {
          color: #10b981;
        }

        .status-icon.error {
          color: #ef4444;
        }

        .status-icon.spin {
          color: #fbbf24;
          animation: spin 1s linear infinite;
        }

        /* Handle Styles */
        .node-handle {
          width: 14px;
          height: 14px;
          background: var(--surface);
          border: 3px solid var(--border);
          transition: all 0.2s ease;
          z-index: 10;
          cursor: crosshair;
        }

        .node-handle:hover {
          width: 18px;
          height: 18px;
          border-color: var(--node-color, var(--primary));
          background: var(--node-color, var(--primary));
          box-shadow: 0 0 0 6px rgba(139, 92, 246, 0.3);
          z-index: 20;
        }

        /* Input Handles - Square */
        .node-handle.input-handle.main-input {
          border-radius: 2px;
        }

        /* Output Handles - Circle */
        .node-handle.output-handle.main-output {
          border-radius: 50%;
        }

        /* AI Input Handles - Diamond */
        .node-handle.ai-input {
          width: 14px;
          height: 14px;
          background: var(--primary);
          border: 3px solid var(--primary);
          transform: rotate(45deg);
          border-radius: 2px;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
          z-index: 20;
        }
        
        .node-handle.ai-input:hover {
          width: 18px;
          height: 18px;
          box-shadow: 0 0 0 6px rgba(139, 92, 246, 0.4);
          z-index: 30;
        }

        .node-handle.ai-input-chat-model {
          background: #10b981;
          border-color: #10b981;
        }

        .node-handle.ai-input-memory {
          background: #a855f7;
          border-color: #a855f7;
        }

        .node-handle.ai-input-tools {
          background: #10b981;
          border-color: #10b981;
          width: 16px;
          height: 16px;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.3);
        }
        
        .node-handle.ai-input-tools:hover {
          width: 20px;
          height: 20px;
          box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.5);
        }

        /* AI Output Handles - Circle */
        .node-handle.ai-output {
          border-radius: 50%;
          background: var(--node-color, var(--primary));
          border-color: var(--node-color, var(--primary));
          width: 16px;
          height: 16px;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
        }
        
        .node-handle.ai-output:hover {
          width: 20px;
          height: 20px;
          box-shadow: 0 0 0 6px rgba(139, 92, 246, 0.4);
        }

        /* Conditional Handles */
        .handle-true {
          border-color: #10b981;
          background: #10b981;
        }

        .handle-false {
          border-color: #ef4444;
          background: #ef4444;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .processing-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(245, 158, 11, 0.08);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 100;
          backdrop-filter: blur(1px);
          animation: fadeIn 0.3s ease;
        }

        .processing-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(245, 158, 11, 0.3);
          border-top: 2px solid #f59e0b;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 6px;
        }

        .processing-text {
          font-size: 11px;
          font-weight: 600;
          color: #f59e0b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>
      
      {getProcessingAnimation()}
    </div>
  );
};

export default memo(WorkflowNode);
