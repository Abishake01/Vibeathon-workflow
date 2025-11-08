import { useState } from 'react';
import { FiX, FiCheckCircle, FiAlertCircle, FiClock, FiCode, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import './ExecutionResultModal.css';

const ExecutionResultModal = ({ isOpen, onClose, result }) => {
  const [expandedNodes, setExpandedNodes] = useState({});

  if (!isOpen || !result) return null;

  const { execution, execution_id, status } = result;
  const isSuccess = execution?.status === 'completed';
  const isError = execution?.status === 'error';

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const formatDuration = (duration) => {
    if (!duration) return '0ms';
    
    // Handle different duration formats (seconds or milliseconds)
    const durationMs = duration < 100 ? duration * 1000 : duration;
    
    if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
    return `${Math.round(durationMs / 1000)}s`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="status-icon success" />;
      case 'error':
        return <FiAlertCircle className="status-icon error" />;
      case 'running':
        return <FiClock className="status-icon running" />;
      default:
        return <FiClock className="status-icon" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'running':
        return 'running';
      default:
        return '';
    }
  };

  return (
    <div className="execution-result-overlay" onClick={onClose}>
      <div className="execution-result-modal" onClick={(e) => e.stopPropagation()}>
        <div className="execution-result-header">
          <div className="execution-result-title">
            {getStatusIcon(execution?.status)}
            <div>
              <h2>Execution Result</h2>
              <span className="execution-id">ID: {execution_id?.slice(0, 8)}...</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="execution-result-content">
          {/* Summary Section */}
          <div className="result-section">
            <h3>Summary</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Status</span>
                <span className={`summary-value status-badge ${getStatusClass(execution?.status)}`}>
                  {execution?.status || 'Unknown'}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Duration</span>
                <span className="summary-value">
                  {execution?.duration ? formatDuration(execution.duration) : 'N/A'}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Nodes Executed</span>
                <span className="summary-value">
                  {execution?.execution_order?.length || 0}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Errors</span>
                <span className="summary-value">
                  {Object.keys(execution?.errors || {}).length}
                </span>
              </div>
            </div>
          </div>

          {/* Chat Response Section */}
          {execution?.chat_response && (
            <div className="result-section chat-response-section">
              <h3>Chat Response</h3>
              <div className="chat-response-box">
                <p>{execution.chat_response}</p>
              </div>
            </div>
          )}

          {/* Node States Section */}
          {execution?.node_states && Object.keys(execution.node_states).length > 0 && (
            <div className="result-section">
              <h3>Node Execution Details</h3>
              <div className="node-states-list">
                {Object.entries(execution.node_states).map(([nodeId, nodeState]) => (
                  <div key={nodeId} className="node-state-item">
                    <div 
                      className="node-state-header"
                      onClick={() => toggleNode(nodeId)}
                    >
                      <div className="node-state-info">
                        {expandedNodes[nodeId] ? <FiChevronDown /> : <FiChevronRight />}
                        {getStatusIcon(nodeState.status)}
                        <span className="node-id">Node {nodeId}</span>
                      </div>
                      <span className={`node-status ${getStatusClass(nodeState.status)}`}>
                        {nodeState.status}
                      </span>
                    </div>
                    
                    {expandedNodes[nodeId] && (
                      <div className="node-state-details">
                        {nodeState.error && (
                          <div className="node-error">
                            <FiAlertCircle />
                            <span>{nodeState.error}</span>
                          </div>
                        )}
                        
                        {nodeState.output && (
                          <div className="node-output">
                            <div className="output-label">
                              <FiCode />
                              Output
                            </div>
                            <pre className="output-content">
                              {JSON.stringify(nodeState.output, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {nodeState.timestamp && (
                          <div className="node-timestamp">
                            <FiClock />
                            <span>{new Date(nodeState.timestamp).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors Section */}
          {execution?.errors && Object.keys(execution.errors).length > 0 && (
            <div className="result-section errors-section">
              <h3>Errors</h3>
              <div className="errors-list">
                {Object.entries(execution.errors).map(([nodeId, error]) => (
                  <div key={nodeId} className="error-item">
                    <FiAlertCircle />
                    <div>
                      <strong>Node {nodeId}:</strong>
                      <p>{error}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="execution-result-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutionResultModal;

