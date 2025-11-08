import { useState, useEffect } from 'react';
import { FiX, FiPlay, FiArrowLeft, FiEdit2 } from 'react-icons/fi';
import { nodeTypeDefinitions } from '../../nodeTypes.jsx';
import PropertyPanel from './PropertyPanel';
import '../../App.css';

const NodeSettingsModal = ({ node, nodes, edges, onUpdate, onClose, onExecuteNode }) => {
  const [activeTab, setActiveTab] = useState('parameters');
  const [inputData, setInputData] = useState(null);
  const [outputData, setOutputData] = useState(null);
  const [mockOutputData, setMockOutputData] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  if (!node || !node.data) return null;

  const nodeTypeDef = nodeTypeDefinitions[node.data.type];
  const isTriggerNode = node.data.type === 'manual-trigger' || 
                       node.data.type === 'when-chat-received' || 
                       node.data.type === 'webhook' || 
                       node.data.type === 'schedule';

  // Get input data from previous nodes
  useEffect(() => {
    if (isTriggerNode) {
      setInputData(null);
      return;
    }

    // Find nodes that connect to this node
    const inputEdges = edges.filter(edge => edge.target === node.id);
    if (inputEdges.length === 0) {
      setInputData(null);
      return;
    }

    // For now, just indicate that input data would come from previous nodes
    setInputData({
      hasInput: true,
      sourceNodes: inputEdges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        return {
          id: edge.source,
          label: sourceNode?.data?.label || 'Unknown',
          handle: edge.sourceHandle || 'main'
        };
      })
    });
  }, [node, nodes, edges, isTriggerNode]);

  const handleExecutePreviousNodes = async () => {
    if (!inputData || !inputData.sourceNodes) return;
    
    setIsExecuting(true);
    try {
      // Execute nodes from the earliest one
      const sourceNodeIds = inputData.sourceNodes.map(s => s.id);
      // This would execute the workflow up to this node
      // For now, just show a message
      console.log('Executing previous nodes:', sourceNodeIds);
      // TODO: Implement execution of previous nodes
    } catch (error) {
      console.error('Error executing previous nodes:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteTrigger = async () => {
    if (!isTriggerNode) return;
    
    setIsExecuting(true);
    try {
      if (onExecuteNode) {
        await onExecuteNode(node.id);
      }
    } catch (error) {
      console.error('Error executing trigger:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteNode = async () => {
    setIsExecuting(true);
    try {
      if (onExecuteNode) {
        const result = await onExecuteNode(node.id);
        setOutputData(result);
      }
    } catch (error) {
      console.error('Error executing node:', error);
      setOutputData({ error: error.message });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="node-settings-modal-overlay" onClick={onClose}>
      <div className="node-settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Top Bar */}
        <div className="node-settings-top-bar">
          <button className="back-to-canvas-btn" onClick={onClose}>
            <FiArrowLeft /> Back to canvas
          </button>
          <div className="node-settings-trial-info">
            <span>1 day left in your non trial</span>
            <span>1000/1000 Executions</span>
          </div>
          <button className="upgrade-btn">
            Upgrade now
            <FiX onClick={onClose} style={{ marginLeft: '8px', cursor: 'pointer' }} />
          </button>
        </div>

        {/* Main Content - Three Columns */}
        <div className="node-settings-content">
          {/* Left Column - INPUT */}
          <div className="node-settings-column node-settings-input">
            <div className="node-settings-column-header">
              <h2>INPUT</h2>
            </div>
            <div className="node-settings-column-body">
              {isTriggerNode ? (
                <div className="node-settings-trigger-view">
                  <div className="trigger-execute-section">
                    <p className="trigger-description">Execute the trigger to see output data</p>
                    <button 
                      className="execute-trigger-btn"
                      onClick={handleExecuteTrigger}
                      disabled={isExecuting}
                    >
                      <FiPlay /> {isExecuting ? 'Executing...' : 'Execute Trigger'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {!inputData || !inputData.hasInput ? (
                    <div className="node-settings-empty-state">
                      <p>No input data yet</p>
                      <button 
                        className="execute-previous-btn"
                        onClick={handleExecutePreviousNodes}
                        disabled={isExecuting}
                      >
                        Execute previous nodes
                      </button>
                      <small>(From the earliest node that needs it Ⓒ)</small>
                    </div>
                  ) : (
                    <div className="node-settings-input-data">
                      <div className="input-sources">
                        {inputData.sourceNodes.map((source, idx) => (
                          <div key={idx} className="input-source-item">
                            <span className="source-label">{source.label}</span>
                            <span className="source-handle">{source.handle}</span>
                          </div>
                        ))}
                      </div>
                      <button 
                        className="execute-previous-btn"
                        onClick={handleExecutePreviousNodes}
                        disabled={isExecuting}
                      >
                        Execute previous nodes
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Center Column - NODE SETTINGS */}
          <div className="node-settings-column node-settings-center">
            <div className="node-settings-column-header">
              <div className="node-settings-title">
                <span className="node-icon">{nodeTypeDef?.icon}</span>
                <h2>{node.data.label || nodeTypeDef?.name}</h2>
              </div>
              <button 
                className="execute-step-btn"
                onClick={handleExecuteNode}
                disabled={isExecuting}
              >
                <FiPlay /> Execute step
              </button>
            </div>

            <div className="node-settings-tabs">
              <button 
                className={`node-settings-tab ${activeTab === 'parameters' ? 'active' : ''}`}
                onClick={() => setActiveTab('parameters')}
              >
                Parameters
              </button>
              <button 
                className={`node-settings-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </button>
              <button 
                className={`node-settings-tab ${activeTab === 'docs' ? 'active' : ''}`}
                onClick={() => setActiveTab('docs')}
              >
                Docs
              </button>
            </div>

            <div className="node-settings-column-body">
              {activeTab === 'parameters' && (
                <div className="node-settings-properties">
                  <PropertyPanel 
                    node={node}
                    onUpdate={onUpdate}
                    onClose={() => {}} // Don't close modal, just update
                  />
                </div>
              )}
              {activeTab === 'settings' && (
                <div className="node-settings-settings">
                  <p>Settings tab content</p>
                </div>
              )}
              {activeTab === 'docs' && (
                <div className="node-settings-docs">
                  <p>{nodeTypeDef?.description || 'No documentation available'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - OUTPUT */}
          <div className="node-settings-column node-settings-output">
            <div className="node-settings-column-header">
              <h2>OUTPUT</h2>
              <button className="edit-mock-btn" title="Set mock data">
                <FiEdit2 />
              </button>
            </div>
            <div className="node-settings-column-body">
              {isTriggerNode ? (
                <div className="node-settings-output-content">
                  {outputData ? (
                    <pre className="output-data-display">
                      {JSON.stringify(outputData, null, 2)}
                    </pre>
                  ) : (
                    <div className="node-settings-empty-state">
                      <p>Execute the trigger to view output data</p>
                      <span className="mock-data-hint">or <span className="mock-link">set mock data</span></span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="node-settings-output-content">
                  {outputData ? (
                    <pre className="output-data-display">
                      {JSON.stringify(outputData, null, 2)}
                    </pre>
                  ) : (
                    <div className="node-settings-empty-state">
                      <p>Execute this node to view data</p>
                      <span className="mock-data-hint">or <span className="mock-link">set mock data</span></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeSettingsModal;

