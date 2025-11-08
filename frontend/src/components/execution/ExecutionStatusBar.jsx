import React, { useState, useEffect } from 'react';
import { FiPlay, FiPause, FiSquare, FiCheckCircle, FiXCircle, FiClock, FiMessageCircle, FiTrash2, FiSearch, FiFilter, FiGrid, FiCode, FiMoreHorizontal, FiChevronDown, FiInfo } from 'react-icons/fi';
import { nodeTypeDefinitions } from '../../nodeTypes.jsx';
import TimingDisplay from './TimingDisplay';

const ExecutionStatusBar = ({ executionHistory, isExecuting, currentExecution, onClearHistory, isExpanded, onToggleExpanded }) => {
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid, json
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <FiPlay className="status-icon running" />;
      case 'completed':
        return <FiCheckCircle className="status-icon completed" />;
      case 'error':
        return <FiXCircle className="status-icon error" />;
      case 'paused':
        return <FiPause className="status-icon paused" />;
      default:
        return <FiClock className="status-icon pending" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'paused':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const formatDuration = (startTime, endTime, durationMs) => {
    // If duration is provided directly, use it
    if (durationMs !== undefined && durationMs !== null && durationMs > 0) {
      if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
      if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
      return `${Math.round(durationMs / 1000)}s`;
    }
    
    if (!startTime) return '0ms';
    
    // Handle different time formats
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    const end = endTime ? (endTime instanceof Date ? endTime : new Date(endTime)) : new Date();
    
    const duration = end.getTime() - start.getTime();
    
    if (duration < 0) return '0ms';
    if (duration < 1000) return `${Math.round(duration)}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${Math.round(duration / 1000)}s`;
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const filteredHistory = executionHistory.filter(execution => 
    execution.nodeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    execution.nodeType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClearHistory = () => {
    if (onClearHistory) {
      onClearHistory();
    }
  };

  return (
    <div className={`logs-interface ${isExpanded ? 'expanded' : ''}`}>
      {/* Top Bar */}
      <div className="logs-top-bar">
        <div className="logs-left">
          <div className="logs-title">Logs</div>
          {executionHistory.length > 0 && (
            <div className="logs-status">
              {executionHistory[0].status === 'completed' ? 'Success' : executionHistory[0].status} in {formatDuration(executionHistory[0].startTime, executionHistory[0].endTime, executionHistory[0].durationMs || executionHistory[0].duration)}
            </div>
          )}
        </div>
        
        <div className="logs-center">
          {currentExecution && (
            <div className="current-execution">
              {currentExecution.nodeName} {currentExecution.status === 'completed' ? 'Success' : currentExecution.status} in {formatDuration(currentExecution.startTime, currentExecution.endTime, currentExecution.durationMs || currentExecution.duration)}
            </div>
          )}
        </div>
        
        <div className="logs-right">
          <button className="clear-btn" onClick={handleClearHistory} title="Clear execution">
            <FiTrash2 />
            Clear execution
          </button>
          <button className="menu-btn" title="More options">
            <FiMoreHorizontal />
          </button>
          <button className="expand-btn" onClick={() => onToggleExpanded(!isExpanded)} title="Expand logs">
            <FiChevronDown className={isExpanded ? 'expanded' : ''} />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="logs-content">
          <div className="logs-sidebar">
            <div className="logs-list">
              {filteredHistory.length === 0 ? (
                <div className="no-logs">
                  <FiInfo />
                  <p>No executions yet. Start a workflow to see execution history.</p>
                </div>
              ) : (
                filteredHistory.map((execution, index) => {
                  const nodeDef = nodeTypeDefinitions[execution.nodeType];
                  const isSelected = selectedExecution?.id === execution.id;
                  
                  return (
                    <div 
                      key={execution.id || index} 
                      className={`log-entry ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedExecution(execution)}
                    >
                      <div className="log-entry-icon">
                        {nodeDef?.icon}
                      </div>
                      <div className="log-entry-content">
                        <div className="log-entry-title">
                          {execution.nodeName}
                        </div>
                        <div className="log-entry-status">
                          {execution.status === 'completed' ? 'Success' : execution.status} in {formatDuration(execution.startTime || execution.start_time, execution.endTime || execution.end_time, execution.durationMs || execution.duration)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="logs-main">
            <div className="logs-main-header">
              <div className="logs-main-title">OUTPUT</div>
              <div className="logs-toolbar">
                <div className="search-box">
                  <FiSearch />
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="view-controls">
                  <button 
                    className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid view"
                  >
                    <FiGrid />
                  </button>
                  <button 
                    className={`view-btn ${viewMode === 'json' ? 'active' : ''}`}
                    onClick={() => setViewMode('json')}
                    title="JSON view"
                  >
                    <FiCode />
                  </button>
                </div>
                <div className="item-count">
                  {filteredHistory.length} item{filteredHistory.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <div className="logs-output">
              {selectedExecution ? (
                <div className="output-content">
                  {viewMode === 'grid' ? (
                    <div className="output-grid">
                      <div className="output-item">
                        <FiCheckCircle style={{ color: '#10b981' }} />
                        <div>
                          <div style={{ fontWeight: 500, marginBottom: '4px' }}>Component: {selectedExecution.nodeName}</div>
                          <div style={{ fontWeight: 500, marginBottom: '4px' }}>Output:</div>
                          <div>{typeof selectedExecution.output === 'object' 
                            ? JSON.stringify(selectedExecution.output, null, 2)
                            : selectedExecution.output || 'This is an item, but it\'s empty.'}</div>
                        </div>
                      </div>
                      {selectedExecution.input && (
                        <div className="output-item">
                          <FiMessageCircle style={{ color: '#3b82f6' }} />
                          <div>
                            <div style={{ fontWeight: 500, marginBottom: '4px' }}>Input:</div>
                            <div>{typeof selectedExecution.input === 'object' 
                              ? JSON.stringify(selectedExecution.input, null, 2)
                              : selectedExecution.input}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="output-json">
                      <pre>{JSON.stringify(selectedExecution, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-selection">
                  <FiInfo />
                  <p>Select an execution to view its output.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionStatusBar;
