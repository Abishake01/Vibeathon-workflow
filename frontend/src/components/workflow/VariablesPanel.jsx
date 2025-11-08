import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { nodeTypeDefinitions } from "../../nodeTypes.jsx";

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
          executionOrder: executionData.execution_order,
          nodeResults: Object.keys(executionData.node_results || {})
        });
        
        const nodeStates = executionData.node_states || {};
        const nodeResults = executionData.node_results || {};
        const executionOrder = executionData.execution_order || [];
        
        // Find all previous nodes (nodes that executed before current node)
        const currentNodeIndex = executionOrder.indexOf(nodeId);
        const previousNodeIds = currentNodeIndex > 0 ? executionOrder.slice(0, currentNodeIndex) : [];
        setPreviousNodes(previousNodeIds);
        
        // Build comprehensive JSON data with ALL node outputs
        const allNodeData = {
          ...defaultJsonData,
          $json: {},
        };
        
        // Collect all node outputs into $json for easy access
        // This allows drag-and-drop of any field from any previous node
        let hasAnyData = false;
        
        // Add all previous nodes' outputs to $json
        previousNodeIds.forEach(prevNodeId => {
          const prevNodeState = nodeStates[prevNodeId];
          const prevNodeResult = nodeResults[prevNodeId];
          
          if (prevNodeState?.output || prevNodeResult) {
            hasAnyData = true;
            // Extract main data from output
            let mainData = null;
            if (prevNodeResult) {
              if (typeof prevNodeResult === 'object' && 'main' in prevNodeResult) {
                mainData = prevNodeResult.main;
              } else {
                mainData = prevNodeResult;
              }
            } else if (prevNodeState?.output) {
              if (typeof prevNodeState.output === 'object' && 'main' in prevNodeState.output) {
                mainData = prevNodeState.output.main;
              } else {
                mainData = prevNodeState.output;
              }
            }
            
            if (mainData) {
              // Add node data by node ID
              allNodeData[prevNodeId] = {
                output: prevNodeState?.output || prevNodeResult,
                main: mainData
              };
              
              // Also merge main data directly into $json for easy access
              // This allows {{ $json.field }} to work directly
              if (typeof mainData === 'object' && !Array.isArray(mainData)) {
                Object.assign(allNodeData.$json, mainData);
              }
            }
          }
        });
        
        // Add current node's data
        const currentNodeState = nodeStates[nodeId];
        if (currentNodeState) {
          hasAnyData = true;
          
          // Add current node's output
          if (currentNodeState.output) {
            let mainData = null;
            if (typeof currentNodeState.output === 'object' && 'main' in currentNodeState.output) {
              mainData = currentNodeState.output.main;
            } else {
              mainData = currentNodeState.output;
            }
            
            allNodeData[nodeId] = {
              output: currentNodeState.output,
              main: mainData
            };
            
            // Merge current node's main data into $json
            if (mainData && typeof mainData === 'object' && !Array.isArray(mainData)) {
              Object.assign(allNodeData.$json, mainData);
            }
          }
          
          // Add current node's input
          if (currentNodeState.input) {
            allNodeData[`${nodeId}_input`] = currentNodeState.input;
          }
        }
        
        if (hasAnyData) {
          setHasData(true);
          setJsonData(allNodeData);
          console.log('✅ Loaded all execution data:', {
            previousNodes: previousNodeIds,
            currentNode: nodeId,
            allNodeKeys: Object.keys(allNodeData),
            $jsonKeys: Object.keys(allNodeData.$json)
          });
        } else {
          setHasData(false);
          setJsonData(null);
          console.log('⚠️ No execution data found');
        }
      } else {
        // No data in localStorage
        console.log('⚠️ No execution data in localStorage');
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
              {/* Show $json with ALL data from previous nodes - this is the main data source for drag-and-drop */}
              {hasData && displayData.$json && Object.keys(displayData.$json).length > 0 && (() => {
                const jsonGroupKey = '$json';
                const jsonIsExpanded = expandedNodeGroups[jsonGroupKey] !== false;
                return (
                  <div className="variable-group" style={{ marginBottom: '16px' }}>
                    <div 
                      className="group-header clickable"
                      onClick={() => setExpandedNodeGroups(prev => ({
                        ...prev,
                        [jsonGroupKey]: !jsonIsExpanded
                      }))}
                    >
                      <span className="arrow-icon">{jsonIsExpanded ? "▼" : "▶"}</span>
                      <span className="cube-icon">📋</span>
                      <span className="var-name" style={{ fontWeight: 600, color: '#10b981' }}>$json</span>
                      <span className="var-value" style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>
                        (All data from previous nodes - drag & drop any field)
                      </span>
                    </div>
                    {jsonIsExpanded && (
                      <div className="group-content">
                        {renderJsonData(displayData.$json, '$json', jsonGroupKey)}
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* Show all previous nodes' outputs grouped by node */}
              {hasData && previousNodes.length > 0 && previousNodes.map(prevNodeId => {
                const prevNodeData = displayData[prevNodeId];
                if (!prevNodeData) return null;
                
                const prevNode = nodes.find(n => n.id === prevNodeId);
                const prevNodeName = prevNode?.data?.label || prevNode?.data?.type || prevNodeId;
                const prevNodeExpanded = expandedNodeGroups[`prev_${prevNodeId}`] !== false;
                
                return (
                  <div key={`prev_${prevNodeId}`} className="variable-group node-output-group" style={{ marginBottom: '12px' }}>
                    <div 
                      className="group-header clickable"
                      onClick={() => setExpandedNodeGroups(prev => ({
                        ...prev,
                        [`prev_${prevNodeId}`]: !prevNodeExpanded
                      }))}
                    >
                      <span className="arrow-icon">{prevNodeExpanded ? "▼" : "▶"}</span>
                      <span className="cube-icon">📦</span>
                      <span className="var-name node-name">{prevNodeName}</span>
                      <span className="node-id">({prevNodeId.substring(0, 8)}...)</span>
                    </div>
                    {prevNodeExpanded && (
                      <div className="group-content">
                        {prevNodeData.main ? (
                          renderJsonData(prevNodeData.main, `$json.${prevNodeId}`, `prev_${prevNodeId}`)
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
              
              {/* Show current node input and output if it has been executed */}
              {hasData && (() => {
                const storedData = localStorage.getItem('workflow_execution_data');
                if (!storedData) return null;
                
                const executionData = JSON.parse(storedData);
                const currentNodeState = executionData.node_states?.[nodeId];
                
                if (!currentNodeState) {
                  return null;
                }
                
                const node = nodes.find(n => n.id === nodeId);
                if (!node) {
                  return null;
                }
                
                const nodeName = node?.data?.label || node?.data?.type || nodeId;
                
                // Show Input section
                const nodeInput = currentNodeState.input;
                const inputExpanded = expandedNodeGroups[`${nodeId}_input`] !== false;
                
                // Show Output section
                const nodeOutput = currentNodeState.output;
                const outputExpanded = expandedNodeGroups[`${nodeId}_output`] !== false;
                
                // Extract main data from current node output
                let nodeMainData = null;
                if (nodeOutput) {
                  if (typeof nodeOutput === 'object' && 'main' in nodeOutput) {
                    nodeMainData = nodeOutput.main;
                  } else {
                    nodeMainData = nodeOutput;
                  }
                }
                
                // Extract main data from current node input
                let nodeInputData = null;
                if (nodeInput) {
                  if (typeof nodeInput === 'object' && 'main' in nodeInput) {
                    nodeInputData = nodeInput.main;
                  } else {
                    nodeInputData = nodeInput;
                  }
                }
                
                return (
                  <>
                    {/* Input Section */}
                    {nodeInput && (
                      <div key={`${nodeId}_input`} className="variable-group node-output-group current-node-input">
                        <div 
                          className="group-header clickable"
                          onClick={() => setExpandedNodeGroups(prev => ({
                            ...prev,
                            [`${nodeId}_input`]: !inputExpanded
                          }))}
                        >
                          <span className="arrow-icon">{inputExpanded ? "▼" : "▶"}</span>
                          <span className="cube-icon">📥</span>
                          <span className="var-name node-name current-node-label">{nodeName} - Input</span>
                        </div>
                        {inputExpanded && (
                          <div className="group-content">
                            {nodeInputData ? (
                              renderJsonData(nodeInputData, `$json.${nodeId}.input`, `${nodeId}_input`)
                            ) : (
                              <div className="variable-item">
                                <span className="var-icon">T</span>
                                <span className="var-name">No input data</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Output Section */}
                    {nodeOutput && (
                      <div key={`${nodeId}_output`} className="variable-group node-output-group current-node-output">
                        <div 
                          className="group-header clickable"
                          onClick={() => setExpandedNodeGroups(prev => ({
                            ...prev,
                            [`${nodeId}_output`]: !outputExpanded
                          }))}
                        >
                          <span className="arrow-icon">{outputExpanded ? "▼" : "▶"}</span>
                          <span className="cube-icon">📦</span>
                          <span className="var-name node-name current-node-label">{nodeName} - Output</span>
                        </div>
                        {outputExpanded && (
                          <div className="group-content">
                            {nodeMainData ? (
                              renderJsonData(nodeMainData, `$json.${nodeId}`, `${nodeId}_output`)
                            ) : (
                              <div className="variable-item">
                                <span className="var-icon">T</span>
                                <span className="var-name">No output data</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
              
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
        .current-node-label {
          color: #10b981 !important;
        }
        .current-node-output {
          border-left: 3px solid #10b981;
          background: rgba(16, 185, 129, 0.05);
        }
        .current-node-input {
          border-left: 3px solid #3b82f6;
          background: rgba(59, 130, 246, 0.05);
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

