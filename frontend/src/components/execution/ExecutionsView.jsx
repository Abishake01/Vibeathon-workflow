import React, { useState, useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FiCheckCircle, FiXCircle, FiClock, FiInfo, FiRefreshCw } from 'react-icons/fi';
import { nodeTypeDefinitions } from '../../nodeTypes.jsx';
import WorkflowNode from '../workflow/WorkflowNode';

const ExecutionsView = ({ 
  executionHistory, 
  nodes, 
  edges, 
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  reactFlowInstance,
  setReactFlowInstance,
  handleSettingsClick,
  handleExecutionClick,
  deleteNode,
  duplicateNode,
  handleChatClick,
  handleChatExecution
}) => {
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Group executions by workflow execution ID
  const workflowExecutions = useMemo(() => {
    const grouped = {};
    executionHistory.forEach(exec => {
      // Use nodeId or nodeName to identify which node this execution belongs to
      const nodeId = exec.nodeId || exec.nodeName;
      const workflowId = exec.workflowExecutionId || exec.id || 'default';
      
      if (!grouped[workflowId]) {
        grouped[workflowId] = {
          id: workflowId,
          startTime: exec.startTime || exec.start_time || exec.timestamp,
          endTime: exec.endTime || exec.end_time,
          duration: exec.duration || exec.durationMs,
          status: exec.status,
          nodeExecutions: [],
          nodeStates: {}
        };
      }
      grouped[workflowId].nodeExecutions.push(exec);
      
      // Map node executions by node ID or name
      if (nodeId) {
        // Find the actual node ID from the nodes array
        const actualNode = nodes.find(n => n.id === nodeId || n.data.label === nodeId);
        const actualNodeId = actualNode?.id || nodeId;
        
        grouped[workflowId].nodeStates[actualNodeId] = {
          status: exec.status,
          output: exec.output,
          error: exec.error
        };
      }
    });
    
    // Determine overall workflow status
    Object.values(grouped).forEach(exec => {
      const hasError = exec.nodeExecutions.some(n => n.status === 'error');
      const allCompleted = exec.nodeExecutions.every(n => n.status === 'completed');
      exec.status = hasError ? 'error' : (allCompleted ? 'completed' : 'running');
    });
    
    return Object.values(grouped).sort((a, b) => {
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();
      return timeB - timeA; // Most recent first
    });
  }, [executionHistory, nodes]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const execDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (execDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + 
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDuration = (durationMs) => {
    if (!durationMs) return '0ms';
    if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
    return `${Math.round(durationMs / 1000)}s`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle style={{ color: '#10b981' }} />;
      case 'error':
        return <FiXCircle style={{ color: '#ef4444' }} />;
      default:
        return <FiClock style={{ color: '#6b7280' }} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Success';
      case 'error':
        return 'Error';
      default:
        return 'Running';
    }
  };

  // Get nodes with execution status indicators
  const nodesWithStatus = useMemo(() => {
    if (!selectedExecution) return nodes;
    
    return nodes.map(node => {
      const nodeState = selectedExecution.nodeStates[node.id];
      const hasError = nodeState?.status === 'error';
      const hasSuccess = nodeState?.status === 'completed';
      
      return {
        ...node,
        data: {
          ...node.data,
          executionStatus: nodeState?.status,
          executionError: nodeState?.error,
          showStatusIndicator: hasError || hasSuccess,
          statusIndicator: hasError ? 'error' : (hasSuccess ? 'success' : null),
          onSettingsClick: handleSettingsClick,
          onExecutionClick: handleExecutionClick,
          onDelete: deleteNode,
          onDuplicate: duplicateNode,
          onChatClick: handleChatClick,
          onTrackExecution: handleChatExecution
        }
      };
    });
  }, [nodes, selectedExecution, handleSettingsClick, handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution]);

  return (
    <div className="executions-view-container">
      {/* Left Sidebar - Execution List */}
      <div className="executions-sidebar">
        <div className="executions-sidebar-header">
          <h3>Executions</h3>
          <div className="executions-controls">
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span>Auto refresh</span>
            </label>
          </div>
        </div>
        
        {workflowExecutions.length === 0 ? (
          <div className="no-executions">
            <FiInfo />
            <p>No active executions</p>
            <p className="no-executions-subtitle">Start a workflow to see execution history</p>
          </div>
        ) : (
          <div className="executions-list">
            {workflowExecutions.map((exec) => {
              const isSelected = selectedExecution?.id === exec.id;
              return (
                <div
                  key={exec.id}
                  className={`execution-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedExecution(exec)}
                >
                  <div className="execution-item-header">
                    <div className="execution-status-icon">
                      {getStatusIcon(exec.status)}
                    </div>
                    <div className="execution-item-content">
                      <div className="execution-date">
                        {formatDate(exec.startTime)}
                      </div>
                      <div className="execution-status">
                        {getStatusText(exec.status)} in {formatDuration(exec.duration)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Side - Workflow Canvas */}
      <div className="executions-workflow-area">
        {selectedExecution ? (
          <>
            <div className="execution-details-header">
              <div className="execution-details-left">
                <span className="execution-details-date">{formatDate(selectedExecution.startTime)}</span>
                <span className="execution-details-status">
                  {getStatusText(selectedExecution.status)} in {formatDuration(selectedExecution.duration)} | ID#{selectedExecution.id}
                </span>
              </div>
            </div>
            <div className="executions-workflow-canvas">
              <ReactFlow
                nodes={nodesWithStatus}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onInit={setReactFlowInstance}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-left"
                style={{ width: '100%', height: '100%' }}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  animated: false,
                  style: { 
                    stroke: '#999', 
                    strokeWidth: 2,
                    strokeOpacity: 1
                  },
                  markerEnd: {
                    type: 'arrowclosed',
                    color: '#999',
                    width: 20,
                    height: 20
                  }
                }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
                minZoom={0.1}
                maxZoom={4}
              >
                <Background variant="dots" gap={16} size={1} />
                <Controls />
                <MiniMap
                  nodeColor={(node) => {
                    const nodeDef = nodeTypeDefinitions[node.data.type];
                    return nodeDef?.color || '#666';
                  }}
                  maskColor="rgba(0, 0, 0, 0.1)"
                />
              </ReactFlow>
            </div>
          </>
        ) : (
          <div className="no-execution-selected">
            <FiInfo />
            <p>Select an execution to view the workflow</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionsView;

