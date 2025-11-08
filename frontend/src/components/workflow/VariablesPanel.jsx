import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

const VariablesPanel = ({ onVariableSelect, workflowId, nodeId, onRunPreviousNodes, edges, nodes = [] }) => {
  const [outputView, setOutputView] = useState("schema");
  const [isExpanded, setIsExpanded] = useState(true);
  const [jsonData, setJsonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [previousNodes, setPreviousNodes] = useState([]);
  const [panelHeight, setPanelHeight] = useState(400); // Default height
  const [isResizing, setIsResizing] = useState(false);
  const [expandedNodeGroups, setExpandedNodeGroups] = useState({}); // Track which node groups are expanded
  const resizeRef = useRef(null);
  const containerRef = useRef(null);

  // Default/empty data structure - use useMemo to avoid recreating on every render
  const defaultJsonData = useMemo(() => ({
    $now: new Date().toISOString(),
    $today: new Date().toISOString().split('T')[0] + "T00:00:00.000Z",
    $vars: {
      $execution: {
        id: "[filled at execution time]",
        mode: "test",
        resumeUrl: "The URL for resuming a 'Wait' node",
      },
      $workflow: {
        id: workflowId || "unknown",
        name: "Workflow",
        active: false,
      },
    },
  }), [workflowId]);

  // Removed API call - only using localStorage now

  const loadExecutionData = useCallback(() => {
    if (!nodeId) {
      setJsonData(null);
      setHasData(false);
      setPreviousNodes([]);
      return;
    }
    
    setLoading(true);
    
    try {
      // Get data from localStorage
      const storedData = localStorage.getItem('workflow_execution_data');
      
      if (storedData) {
        const executionData = JSON.parse(storedData);
        console.log('📦 Loaded execution data from localStorage:', {
          nodeId,
          nodeStates: Object.keys(executionData.node_states || {}),
          executionOrder: executionData.execution_order
        });
        
        const nodeStates = executionData.node_states || {};
        const executionOrder = executionData.execution_order || [];
        
        // Get previous nodes from edges if available, otherwise use execution order
        let previousNodeIds = [];
        
        if (edges && edges.length > 0) {
          // Use edges to find actual previous nodes
          previousNodeIds = edges
            .filter(edge => edge.target === nodeId)
            .map(edge => edge.source)
            .filter(sourceId => nodeStates[sourceId]); // Only include nodes that have execution data
        } else {
          // Fallback: use execution order to find previous nodes
          const currentNodeIndex = executionOrder.indexOf(nodeId);
          previousNodeIds = executionOrder.slice(0, currentNodeIndex);
        }
        
        setPreviousNodes(previousNodeIds);
        
        // Collect data from ALL previous nodes
        let mainData = null;
        let nodeResults = {};
        let nodeDataByNodeId = {}; // Store each node's data by its ID
        
        // Collect all previous node results
        previousNodeIds.forEach(prevNodeId => {
          const prevNodeState = nodeStates[prevNodeId];
          if (prevNodeState && prevNodeState.output) {
            const output = prevNodeState.output;
            nodeResults[prevNodeId] = output;
            
            // Extract main data from each node
            let nodeMainData = null;
            if (typeof output === 'object' && 'main' in output) {
              nodeMainData = output.main;
            } else {
              nodeMainData = output;
            }
            
            // Store by node ID for direct access
            nodeDataByNodeId[prevNodeId] = nodeMainData;
            
            // Use the last node's main data as the primary $json (fallback)
            if (!mainData && nodeMainData) {
              mainData = nodeMainData;
            }
          }
        });
        
        // If we have multiple previous nodes, merge their outputs
        if (previousNodeIds.length > 1) {
          const allMerged = {};
          previousNodeIds.forEach(prevNodeId => {
            const nodeData = nodeDataByNodeId[prevNodeId];
            if (nodeData && typeof nodeData === 'object' && !Array.isArray(nodeData)) {
              Object.assign(allMerged, nodeData);
            }
          });
          if (Object.keys(allMerged).length > 0) {
            mainData = allMerged;
          }
        }
        
        if (mainData || Object.keys(nodeResults).length > 0) {
          setHasData(true);
          // Merge mainData with defaultJsonData, but don't duplicate $now and $today at root
          const mergedJsonData = {
            ...defaultJsonData,
            $json: {
              ...defaultJsonData, // Include $now, $today, $vars in $json
              ...(mainData || {}),
            },
            json: {
              ...defaultJsonData,
              ...(mainData || {}),
            },
            // Add all node results by their node IDs
            ...nodeResults,
            // Also add individual node data by their IDs
            ...nodeDataByNodeId,
          };
          setJsonData(mergedJsonData);
          console.log('✅ Found execution data for node:', nodeId, {
            previousNodes: previousNodeIds,
            mainData,
            nodeResults: Object.keys(nodeResults)
          });
        } else {
          setHasData(false);
          setJsonData(null);
          console.log('⚠️ No execution data found for previous nodes of:', nodeId);
        }
      } else {
        // No data in localStorage
        console.log('⚠️ No execution data in localStorage for node:', nodeId);
        setHasData(false);
        setJsonData(null);
        setPreviousNodes([]);
      }
      
      setLoading(false);
      
    } catch (error) {
      console.error("Error loading execution data from localStorage:", error);
      setHasData(false);
      setJsonData(null);
      setPreviousNodes([]);
      setLoading(false);
    }
  }, [nodeId, edges, defaultJsonData]);

  // Load execution data when nodeId is provided
  useEffect(() => {
    if (nodeId) {
      loadExecutionData();
    } else {
      setJsonData(null);
      setHasData(false);
      setPreviousNodes([]);
      setLoading(false);
    }
  }, [nodeId, loadExecutionData]);
  
  // Listen for storage events and custom events (when execution data is updated)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'workflow_execution_data' && nodeId) {
        loadExecutionData();
      }
    };
    
    // Listen for custom event (for same-tab updates)
    const handleExecutionUpdate = () => {
      if (nodeId) {
        loadExecutionData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('workflowExecutionUpdate', handleExecutionUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('workflowExecutionUpdate', handleExecutionUpdate);
    };
  }, [nodeId, loadExecutionData]);

  const handleRunPreviousNodes = async () => {
    if (onRunPreviousNodes) {
      await onRunPreviousNodes();
      // Refresh data after execution
      setTimeout(() => {
        loadExecutionData();
      }, 1000);
    }
  };

  // Use actual data if available, otherwise use default
  const displayData = jsonData || defaultJsonData;

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(displayData, null, 2));
    alert("✅ JSON copied to clipboard!");
  };

  // Resize handlers
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newHeight = e.clientY - containerRect.top;
        // Min height: 200px, Max height: 80vh
        const minHeight = 200;
        const maxHeight = window.innerHeight * 0.8;
        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
        setPanelHeight(clampedHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Recursive function to render JSON data with expand/collapse
  const renderJsonData = (data, prefix = '', parentKey = '') => {
    if (data === null || data === undefined) {
      return (
        <div className="variable-item">
          <span className="var-icon">null</span>
          <span className="var-name">{prefix}</span>
          <span className="var-value">null</span>
        </div>
      );
    }

    if (typeof data === 'object' && !Array.isArray(data)) {
      // Always create expandable groups for objects
      return Object.entries(data).map(([key, value]) => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const groupKey = parentKey ? `${parentKey}_${key}` : key;
        const isExpanded = expandedNodeGroups[groupKey] !== false; // Default to expanded
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return (
            <div key={key} className="nested-group">
              <div 
                className="group-header clickable"
                onClick={() => setExpandedNodeGroups(prev => ({
                  ...prev,
                  [groupKey]: !isExpanded
                }))}
              >
                <span className="arrow-icon">{isExpanded ? "▼" : "▶"}</span>
                <span className="cube-icon">⧉</span>
                <span className="var-name">{key}</span>
              </div>
              {isExpanded && (
                <div className="group-content">
                  {renderJsonData(value, fullPath, groupKey)}
                </div>
              )}
            </div>
          );
        } else {
          const jsonPath = fullPath.replace('$json.', '');
          const expressionPath = '${{ $json.' + jsonPath + ' }}';
          
          return (
            <div 
              key={key}
              className="variable-item draggable"
              draggable="true"
              onDragStart={(e) => e.dataTransfer.setData('text/plain', expressionPath)}
              onClick={() => onVariableSelect && onVariableSelect(expressionPath)}
              title="Click or drag to expression editor"
            >
              <span className="var-icon">
                {typeof value === "boolean" ? "□" : typeof value === "number" ? "#" : "T"}
              </span>
              <span className="var-name">{key}</span>
              <span className={`var-value ${typeof value === "boolean" ? "boolean" : ""}`}>
                {String(value).substring(0, 50)}{String(value).length > 50 ? '...' : ''}
              </span>
            </div>
          );
        }
      });
    } else if (Array.isArray(data)) {
      return data.map((item, index) => {
        const fullPath = `${prefix}[${index}]`;
        const groupKey = `${parentKey}_arr_${index}`;
        const isExpanded = expandedNodeGroups[groupKey] !== false;
        
        return (
          <div key={index} className="nested-group">
            <div 
              className="group-header clickable"
              onClick={() => setExpandedNodeGroups(prev => ({
                ...prev,
                [groupKey]: !isExpanded
              }))}
            >
              <span className="arrow-icon">{isExpanded ? "▼" : "▶"}</span>
              <span className="cube-icon">[</span>
              <span className="var-name">[{index}]</span>
            </div>
            {isExpanded && (
              <div className="group-content">
                {renderJsonData(item, fullPath, groupKey)}
              </div>
            )}
          </div>
        );
      });
    } else {
      return (
        <div className="variable-item">
          <span className="var-icon">T</span>
          <span className="var-name">{prefix}</span>
          <span className="var-value">{String(data)}</span>
        </div>
      );
    }
  };

  return (
    <div className="variables-panel-container" ref={containerRef}>
      <button
        className="collapsible-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? "▼" : "▶"} Variables and context
      </button>
      {isExpanded && (
        <div 
          className="collapsible-content"
          style={{ height: `${panelHeight}px`, minHeight: '200px', maxHeight: '80vh' }}
        >
          {!hasData && previousNodes.length > 0 && (
            <div className="empty-state-action">
              <p className="empty-message">No execution data available</p>
              <button 
                className="run-previous-btn"
                onClick={handleRunPreviousNodes}
                disabled={loading}
              >
                {loading ? "⏳ Running..." : "▶ Run Previous Nodes"}
              </button>
            </div>
          )}
          {!hasData && previousNodes.length === 0 && (
            <div className="empty-state">
              <p>No previous nodes connected. Execute the workflow to see data here.</p>
            </div>
          )}
          {loading && (
            <div className="loading-state">Loading execution data...</div>
          )}
          {hasData && (
            <div className="variables-content-wrapper">
              {/* Tabs */}
              <div className="view-tabs">
            <button
              className={`view-tab ${outputView === "schema" ? "active" : ""}`}
              onClick={() => setOutputView("schema")}
            >
              Schema
            </button>
            <button
              className={`view-tab ${outputView === "table" ? "active" : ""}`}
              onClick={() => setOutputView("table")}
            >
              Table
            </button>
            <button
              className={`view-tab ${outputView === "json" ? "active" : ""}`}
              onClick={() => setOutputView("json")}
            >
              JSON
            </button>
          </div>

          {/* Schema View */}
          {outputView === "schema" && (
            <div className="variables-box scrollable">
              {/* Show previous nodes with their names and outputs */}
              {hasData && previousNodes.length > 0 && previousNodes.map(prevNodeId => {
                const node = nodes.find(n => n.id === prevNodeId);
                const nodeName = node?.data?.label || node?.data?.type || prevNodeId;
                const nodeOutput = displayData[prevNodeId];
                const isExpanded = expandedNodeGroups[prevNodeId] !== false; // Default to expanded
                
                if (!nodeOutput) return null;
                
                // Extract main data from node output
                let nodeMainData = null;
                if (typeof nodeOutput === 'object' && 'main' in nodeOutput) {
                  nodeMainData = nodeOutput.main;
                } else {
                  nodeMainData = nodeOutput;
                }
                
                return (
                  <div key={prevNodeId} className="variable-group node-output-group">
                    <div 
                      className="group-header clickable"
                      onClick={() => setExpandedNodeGroups(prev => ({
                        ...prev,
                        [prevNodeId]: !isExpanded
                      }))}
                    >
                      <span className="arrow-icon">{isExpanded ? "▼" : "▶"}</span>
                      <span className="cube-icon">📦</span>
                      <span className="var-name node-name">{nodeName}</span>
                      <span className="node-id">({prevNodeId.substring(0, 8)}...)</span>
                    </div>
                    {isExpanded && (
                      <div className="group-content">
                        {nodeMainData ? (
                          renderJsonData(nodeMainData, `$json.${prevNodeId}`, prevNodeId)
                        ) : (
                          <div className="variable-item">
                            <span className="var-icon">T</span>
                            <span className="var-name">No output data</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Show $json if we have execution data (merged data) */}
              {hasData && displayData.$json && Object.keys(displayData.$json).length > 0 && (
                <div className="variable-group">
                  <div 
                    className="group-header clickable"
                    onClick={() => setExpandedNodeGroups(prev => ({
                      ...prev,
                      '$json': prev['$json'] === false ? true : false // Toggle: if false, set to true; otherwise set to false
                    }))}
                  >
                    <span className="arrow-icon">{(expandedNodeGroups['$json'] !== false) ? "▼" : "▶"}</span>
                    <span className="cube-icon">⧉</span>
                    <span className="var-name">$json (Merged)</span>
                  </div>
                  {(expandedNodeGroups['$json'] !== false) && (
                    <div className="group-content">
                      {renderJsonData(displayData.$json, '$json', '$json')}
                    </div>
                  )}
                </div>
              )}
              
              {/* Render $vars with expandable header */}
              {displayData.$vars && (() => {
                const varsGroupKey = '$vars';
                const varsIsExpanded = expandedNodeGroups[varsGroupKey] !== false;
                return (
                  <div className="variable-group">
                    <div 
                      className="group-header clickable"
                      onClick={() => setExpandedNodeGroups(prev => ({
                        ...prev,
                        [varsGroupKey]: !varsIsExpanded
                      }))}
                    >
                      <span className="arrow-icon">{varsIsExpanded ? "▼" : "▶"}</span>
                      <span className="cube-icon">⧉</span>
                      <span className="var-name">$vars</span>
                    </div>
                    {varsIsExpanded && (
                      <div className="group-content">
                        {renderJsonData(displayData.$vars, '$vars', '$vars')}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Table View */}
          {outputView === "table" && (
            <div className="table-view scrollable" style={{ flex: 1, minHeight: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {hasData && displayData.$json && (
                    <tr>
                      <td>$json</td>
                      <td>{JSON.stringify(displayData.$json).substring(0, 100)}...</td>
                    </tr>
                  )}
                  <tr>
                    <td>$now</td>
                    <td>{displayData.$now}</td>
                  </tr>
                  <tr>
                    <td>$today</td>
                    <td>{displayData.$today}</td>
                  </tr>
                  {Object.entries(displayData.$vars.$execution).map(([k, v]) => (
                    <tr key={`exec-${k}`}>
                      <td>$execution.{k}</td>
                      <td>{v}</td>
                    </tr>
                  ))}
                  {Object.entries(displayData.$vars.$workflow).map(([k, v]) => (
                    <tr key={`wf-${k}`}>
                      <td>$workflow.{k}</td>
                      <td>{v.toString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* JSON View */}
          {outputView === "json" && (
            <div className="json-view scrollable">
              <div className="json-header">
                <button className="copy-btn" onClick={handleCopyJSON}>
                  📋 Copy JSON
                </button>
              </div>
              <pre className="json-content">
                {JSON.stringify(displayData, null, 2)}
              </pre>
            </div>
          )}
            </div>
          )}
          {/* Resize Handle */}
          <div 
            className="resize-handle"
            ref={resizeRef}
            onMouseDown={handleMouseDown}
          />
        </div>
      )}

      <style>{`
        .variables-panel-container {
          background-color: #1f1f1f;
          color: #fff;
          font-family: "Inter", sans-serif;
          padding: 10px;
          width: 100%;
          border-radius: 6px;
          font-size: 13px;
          overflow: hidden;
        }
        .scrollable {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
        }
        .collapsible-header {
          background: none;
          border: none;
          color: #fff;
          font-weight: 500;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          margin-bottom: 8px;
        }
        .collapsible-content {
          position: relative;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 6px;
        }
        .resize-handle {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 8px;
          cursor: row-resize;
          background: transparent;
          z-index: 10;
          transition: background 0.2s;
        }
        .resize-handle:hover {
          background: rgba(255, 109, 90, 0.3);
        }
        .resize-handle::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .resize-handle:hover::after {
          opacity: 1;
        }
        .variables-content-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          padding-bottom: 8px;
        }
        .view-tabs {
          display: flex;
          gap: 6px;
          margin-bottom: 10px;
        }
        .view-tab {
          background: #2a2a2a;
          border: 1px solid #3c3c3c;
          color: #aaa;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: 0.2s;
        }
        .view-tab.active {
          background: #ff6d5a;
          color: #fff;
        }
        .variables-box {
          background: #252525;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 10px;
          overflow-wrap: break-word;
          word-break: break-word;
          height: 100%;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .variable-item {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .variable-item.draggable {
          cursor: grab;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .variable-item.draggable:hover {
          background: rgba(255, 109, 90, 0.1);
        }
        .variable-item.draggable:active {
          cursor: grabbing;
        }
        .var-icon {
          color: #aaa;
        }
        .var-name {
          min-width: 90px;
          color: #fff;
          word-break: break-word;
        }
        .var-value {
          color: #ccc;
          font-family: monospace;
          word-break: break-word;
          flex: 1;
        }
        .boolean {
          color: #ff6d5a;
        }
        .variable-group,
        .nested-group {
          margin-left: 16px;
          margin-top: 6px;
        }
        .group-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
          color: #fff;
        }
        .group-header.clickable {
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .group-header.clickable:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .arrow-icon,
        .cube-icon {
          color: #888;
          font-size: 10px;
          width: 16px;
          text-align: center;
        }
        .node-output-group {
          margin-bottom: 12px;
          border-left: 2px solid rgba(255, 109, 90, 0.3);
          padding-left: 8px;
        }
        .node-name {
          font-weight: 600;
          color: #ff6d5a;
        }
        .node-id {
          font-size: 10px;
          color: #888;
          font-family: monospace;
          margin-left: 4px;
        }
        .table-view {
          background: #252525;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 8px;
          overflow-x: auto;
          height: 100%;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .table-view table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .table-view th,
        .table-view td {
          border: 1px solid #333;
          padding: 6px 8px;
          color: #ddd;
          text-align: left;
          word-break: break-word;
        }
        .table-view th {
          background-color: #2d2d2d;
          font-weight: 600;
        }
        .json-view {
          background: #252525;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 8px;
          overflow-x: auto;
          height: 100%;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .json-header {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 6px;
        }
        .copy-btn {
          background: #ff6d5a;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 5px 8px;
          cursor: pointer;
          font-size: 12px;
        }
        .copy-btn:hover {
          background: #ff563f;
        }
        .json-content {
          font-family: monospace;
          font-size: 12px;
          color: #ccc;
          background: #1b1b1b;
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-word;
          flex: 1;
          min-height: 0;
        }
        .empty-state-action {
          padding: 16px;
          text-align: center;
          background: #2a2a2a;
          border-radius: 6px;
          margin-bottom: 12px;
        }
        .empty-message {
          color: #aaa;
          font-size: 12px;
          margin-bottom: 12px;
        }
        .run-previous-btn {
          background: #ff6d5a;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .run-previous-btn:hover:not(:disabled) {
          background: #ff5a45;
        }
        .run-previous-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .empty-state {
          padding: 16px;
          text-align: center;
          color: #aaa;
          font-size: 12px;
        }
        .loading-state {
          padding: 16px;
          text-align: center;
          color: #ff6d5a;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default VariablesPanel;

