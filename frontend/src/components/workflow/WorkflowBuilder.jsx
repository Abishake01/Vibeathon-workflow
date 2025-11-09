import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  FiMenu, FiPlay, FiSquare, FiSave, FiFolder, FiTrash2, 
  FiSun, FiMoon, FiEdit3, FiMessageCircle, FiGrid, FiLink2, FiSettings, FiDownload,
  FiMoreVertical, FiUpload, FiType, FiPower, FiLayout, FiCopy, FiCheck, FiX, FiPause, FiRadio
} from 'react-icons/fi';

import {
  WorkflowNode,
  NodeLibrary,
  PropertyPanel,
  ChatBox,
  ExecutionViewer,
  ExecutionStatusBar,
  ExecutionResultModal,
  ToastContainer,
  VerticalToolbar
} from '../';
import NodeSettingsModal from './NodeSettingsModal';
import AIChatbot from '../ui/AIChatbot';
import SettingsModal from '../ui/SettingsModal';
import ExportModal from '../ui/ExportModal';
import ImportModal from '../ui/ImportModal';
import ClearWorkspaceModal from '../ui/ClearWorkspaceModal';
import ExecutionsView from '../execution/ExecutionsView';
import { nodeTypeDefinitions } from '../../nodeTypes.jsx';
import { useDynamicNodes } from '../../hooks/useDynamicNodes';
import { executionEngine } from '../../executionEngine';
import { workflowApi } from '../../api/workflowApi';
import apiService from '../../services/api';
import { useTheme } from '../../theme.jsx';
import { useNavigation } from '../../router/AppRouter';
import NotesNode from './NotesNode';
import READMEViewerNode from './READMEViewerNode';
import '../../App.css';

// Node types will be defined inside the component

const initialNodes = [];
const initialEdges = [];

function WorkflowBuilder() {
  const { theme, toggleTheme } = useTheme();
  const { navigateToBuilder } = useNavigation();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  // Fetch dynamic nodes
  const { dynamicNodes } = useDynamicNodes();

  // Create a universal node type mapper - all node types use WorkflowNode component
  const nodeTypes = useMemo(() => {
    // Merge static and dynamic nodes
    const allNodeDefs = { ...nodeTypeDefinitions, ...dynamicNodes };
    
    const types = Object.keys(allNodeDefs).reduce((acc, nodeType) => {
      acc[nodeType] = WorkflowNode;
      return acc;
    }, {});

    // Add special node types
    types['notes'] = NotesNode;
    types['readme-viewer'] = READMEViewerNode;

    console.log('📝 Node types registered:', Object.keys(types));
    console.log('📝 Notes node type:', types['notes']);
    console.log('📝 Dynamic nodes:', Object.keys(dynamicNodes));
    
    return types;
  }, [dynamicNodes]); // Include dynamicNodes in dependency
  const [nodeSettingsModalOpen, setNodeSettingsModalOpen] = useState(false);
  const [selectedNodeForModal, setSelectedNodeForModal] = useState(null);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [execution, setExecution] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentExecution, setCurrentExecution] = useState(null);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const nodeIdCounter = useRef(0);
  const [executionResult, setExecutionResult] = useState(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);
  const [edgeDebugInfo, setEdgeDebugInfo] = useState([]);
  const [executingNodes, setExecutingNodes] = useState(new Set());
  const [toasts, setToasts] = useState([]);
  const [nodeExecutionStates, setNodeExecutionStates] = useState({});
  const [logsExpanded, setLogsExpanded] = useState(false);

  // Utility function to extract numeric ID from node ID string
  const extractNodeIdNumber = useCallback((nodeId) => {
    if (typeof nodeId !== 'string') return 0;
    const match = nodeId.match(/node_(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, []);

  // Utility function to ensure unique node IDs and update counter
  const ensureUniqueNodeIds = useCallback((nodes, edges = []) => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return { nodes: [], edges: edges || [], idMap: new Map() };
    }

    // Track used IDs and find max counter value
    let maxCounter = nodeIdCounter.current;

    // First pass: extract existing IDs and find max
    nodes.forEach(node => {
      if (node.id) {
        const numId = extractNodeIdNumber(node.id);
        if (numId > maxCounter) {
          maxCounter = numId;
        }
      }
    });

    // Update counter to be higher than any existing ID
    nodeIdCounter.current = maxCounter + 1;

    // Second pass: fix any duplicate IDs
    const idMap = new Map(); // Maps old ID to new ID
    const seenIds = new Set();
    const processedNodes = nodes.map((node, index) => {
      if (!node.id) {
        // Generate new ID if missing
        const newId = `node_${++nodeIdCounter.current}`;
        idMap.set(`missing_${index}`, newId);
        seenIds.add(newId);
        return { ...node, id: newId };
      }

      // Check if this ID was already seen in this batch
      if (seenIds.has(node.id)) {
        // This is a duplicate, assign new ID
        const newId = `node_${++nodeIdCounter.current}`;
        idMap.set(node.id, newId);
        seenIds.add(newId);
        return { ...node, id: newId };
      }

      // ID is unique in this batch, keep it
      seenIds.add(node.id);
      idMap.set(node.id, node.id);
      return node;
    });

    // Update edges to use new node IDs if they were changed
    const processedEdges = (edges || []).map(edge => {
      const newSource = idMap.get(edge.source) || edge.source;
      const newTarget = idMap.get(edge.target) || edge.target;
      
      if (newSource !== edge.source || newTarget !== edge.target) {
        return {
          ...edge,
          source: newSource,
          target: newTarget,
          id: `e${newSource}-${newTarget}-${edge.sourceHandle || 'main'}-${edge.targetHandle || 'main'}`
        };
      }
      return edge;
    });

    return { nodes: processedNodes, edges: processedEdges, idMap };
  }, [extractNodeIdNumber]);
  const [aiChatbotOpen, setAiChatbotOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [clearWorkspaceModalOpen, setClearWorkspaceModalOpen] = useState(false);
  const [flowKey, setFlowKey] = useState(0);
  const [activeTab, setActiveTab] = useState('workflow'); // 'workflow' or 'page-builder'
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [isSaved, setIsSaved] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [webhookUrlModalOpen, setWebhookUrlModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(null);
  const [webhookUrlLoading, setWebhookUrlLoading] = useState(false);
  const [webhookUrlCopied, setWebhookUrlCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState(null);
  
  // Webhook Listener state
  const [listenerId, setListenerId] = useState(null);
  const [listenerStatus, setListenerStatus] = useState('stopped'); // stopped, running, paused
  const [listenerEvents, setListenerEvents] = useState([]);
  const [listenerRequestCount, setListenerRequestCount] = useState(0);
  const [listenerEventSource, setListenerEventSource] = useState(null);
  const [listenerPanelOpen, setListenerPanelOpen] = useState(false);
  const [lastExecutionTimestamp, setLastExecutionTimestamp] = useState(null);
  const pollingIntervalRef = useRef(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSaveEnabled');
    return saved !== null ? saved === 'true' : true; // Default ON
  });
  const menuRef = useRef(null);
  const hasLoadedWorkflow = useRef(false);
  const savedWorkflowData = useRef(null);
  
  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      if (listenerEventSource) {
        listenerEventSource.close();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [listenerEventSource]);

  // Poll for latest workflow executions when listener is active
  // NOTE: Polling is a fallback - real-time updates come via SSE
  useEffect(() => {
    // Only poll if listener is running and we have a workflow ID
    // But skip polling if SSE is connected (to avoid duplicate updates)
    if (listenerStatus === 'running' && currentWorkflowId && !listenerEventSource) {
      console.log('🔄 Starting execution polling for workflow:', currentWorkflowId);
      
      const pollExecutions = async () => {
        try {
          // Fetch latest executions
          const executions = await apiService.request(`/workflows/${currentWorkflowId}/executions/`);
          
          if (executions && executions.length > 0) {
            // Get the most recent execution
            const latestExecution = executions[0];
            const executionTimestamp = latestExecution.started_at || latestExecution.finished_at;
            
            // Only update if this is a new execution
            if (!lastExecutionTimestamp || executionTimestamp > lastExecutionTimestamp) {
              console.log('📥 Polling: New execution detected:', latestExecution.id);
              setLastExecutionTimestamp(executionTimestamp);
              
              // First, set nodes to running state if execution is in progress
              if (latestExecution.status === 'running' || latestExecution.status === 'completed') {
                console.log('▶️ Polling: Setting workflow to running state');
                setNodes((nds) =>
                  nds.map((n) => {
                    // Find if this node will be executed
                    const willExecute = latestExecution.node_states?.[n.id] || 
                                       latestExecution.execution_order?.includes(n.id);
                    if (willExecute && latestExecution.status === 'running') {
                      return {
                        ...n,
                        data: {
                          ...n.data,
                          executionState: {
                            status: 'running',
                            output: null,
                            startTime: new Date(latestExecution.started_at)
                          }
                        }
                      };
                    }
                    return n;
                  })
                );
              }
              
              // Update nodes with execution results
              if (latestExecution.node_states) {
                console.log('🔄 Polling: Updating nodes with execution results');
                console.log('   Execution node_states:', Object.keys(latestExecution.node_states));
                console.log('   Current workflow node IDs:', nodes.map(n => n.id));
                
                setNodes((nds) => {
                  console.log('   Polling: Current nodes in state:', nds.map(n => n.id));
                  return nds.map((n) => {
                    const nodeState = latestExecution.node_states[n.id];
                    if (nodeState) {
                      console.log(`   Polling: Processing node ${n.id} (${n.data.type}):`, {
                        status: nodeState.status,
                        has_output: !!nodeState.output,
                        has_node_result: !!(latestExecution.node_results?.[n.id]),
                        output_type: nodeState.output ? typeof nodeState.output : 'none',
                        nodeState_keys: Object.keys(nodeState)
                      });
                      
                      // Extract output for display
                      let formattedOutput = '';
                      const nodeResult = nodeState.output || latestExecution.node_results?.[n.id];
                      
                      if (nodeResult) {
                        if (typeof nodeResult === 'string') {
                          formattedOutput = nodeResult;
                        } else if (nodeResult.main) {
                          if (typeof nodeResult.main === 'string') {
                            formattedOutput = nodeResult.main;
                          } else if (nodeResult.main.content) {
                            formattedOutput = nodeResult.main.content;
                          } else if (nodeResult.main.text) {
                            formattedOutput = nodeResult.main.text;
                          } else {
                            // For webhook trigger, show the full structure
                            formattedOutput = JSON.stringify(nodeResult.main, null, 2);
                          }
                        } else if (nodeResult.content) {
                          formattedOutput = nodeResult.content;
                        } else if (nodeResult.text) {
                          formattedOutput = nodeResult.text;
                        } else {
                          // For webhook trigger node, show the full output structure
                          formattedOutput = JSON.stringify(nodeResult, null, 2);
                        }
                      }
                      
                      // Special handling for webhook trigger node - show webhook data
                      if (n.data.type === 'webhook' && nodeResult && typeof nodeResult === 'object') {
                        if (nodeResult.main && typeof nodeResult.main === 'object') {
                          // Show webhook payload in a readable format
                          const webhookData = nodeResult.main.data || nodeResult.main;
                          if (webhookData && webhookData.body) {
                            formattedOutput = `Webhook received:\n${JSON.stringify(webhookData.body, null, 2)}`;
                          } else {
                            formattedOutput = JSON.stringify(nodeResult.main, null, 2);
                          }
                        }
                      }
                      
                      console.log(`   Polling: Node ${n.id} formatted output length:`, formattedOutput.length);
                      
                      // Update node with execution state
                      const executionState = {
                        status: nodeState.status || (latestExecution.status === 'completed' ? 'completed' : 'running'),
                        output: formattedOutput || nodeResult,
                        startTime: nodeState.startTime ? new Date(nodeState.startTime) : new Date(latestExecution.started_at),
                        endTime: nodeState.endTime ? new Date(nodeState.endTime) : (latestExecution.finished_at ? new Date(latestExecution.finished_at) : null)
                      };
                      
                      console.log(`   Polling: Updating node ${n.id} with execution state:`, executionState.status);
                      
                      return {
                        ...n,
                        data: {
                          ...n.data,
                          executionState: executionState
                        }
                      };
                    } else {
                      // Log if node is not in execution results
                      if (n.data.type === 'webhook') {
                        console.warn(`⚠️ Polling: Webhook trigger node ${n.id} not found in execution node_states`);
                        console.warn(`   Available node IDs in execution:`, Object.keys(latestExecution.node_states));
                      }
                    }
                    return n;
                  });
                });
                
                // Update localStorage for README viewer
                try {
                  const executionData = {
                    workflow_id: currentWorkflowId,
                    execution_id: latestExecution.id,
                    node_states: latestExecution.node_states,
                    node_results: latestExecution.node_results || {},
                    execution_order: latestExecution.execution_order || [],
                    timestamp: new Date().toISOString()
                  };
                  
                  localStorage.setItem('workflow_execution_data', JSON.stringify(executionData));
                  console.log('💾 Polling: Updated localStorage with execution data');
                } catch (e) {
                  console.error('Error updating localStorage:', e);
                }
              }
            }
          }
        } catch (err) {
          console.error('Error polling executions:', err);
        }
      };
      
      // Poll immediately, then every 2 seconds
      pollExecutions();
      pollingIntervalRef.current = setInterval(pollExecutions, 2000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    } else {
      // Stop polling if listener is not running
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [listenerStatus, currentWorkflowId, lastExecutionTimestamp]);
  
  // Undo/Redo history
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const maxHistorySize = 50;

  // Utility function to load all properties from localStorage for nodes
  const loadNodesWithProperties = useCallback((nodesToEnhance) => {
    return nodesToEnhance.map(node => {
      const nodeData = { ...node.data };
      
      // Try to load properties from localStorage
      try {
        const savedInputs = localStorage.getItem(`inputValues_${node.id}`);
        if (savedInputs) {
          const parsedInputs = JSON.parse(savedInputs);
          // Merge with existing properties, localStorage takes priority
          nodeData.properties = { ...nodeData.properties, ...parsedInputs };
          console.log(`✅ Loaded properties for node ${node.id} (${node.data.type}):`, nodeData.properties);
        } else {
          console.log(`ℹ️ No saved inputs for node ${node.id} (${node.data.type}), using defaults`);
          // Ensure properties object exists
          nodeData.properties = nodeData.properties || {};
        }
      } catch (error) {
        console.error(`❌ Error loading localStorage for node ${node.id}:`, error);
        nodeData.properties = nodeData.properties || {};
      }
      
      return {
        ...node,
        data: nodeData
      };
    });
  }, []);

  // Toast notification management
  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const closeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Load saved workflow from localStorage on mount (only once)
  useEffect(() => {
    if (hasLoadedWorkflow.current) return;
    
    try {
      const savedWorkflow = localStorage.getItem('savedWorkflow');
      const savedName = localStorage.getItem('workflowName');
      
      if (savedName) {
        setWorkflowName(savedName);
      }
      
      if (savedWorkflow) {
        savedWorkflowData.current = JSON.parse(savedWorkflow);
        hasLoadedWorkflow.current = true;
        console.log('📂 Loaded workflow data from localStorage');
      }
    } catch (error) {
      console.error('Error loading workflow:', error);
    }
  }, []);

  // Store handlers in refs so they can be accessed before definition
  const handlersRef = useRef({
    handleSettingsClick: null,
    handleExecutionClick: null,
    deleteNode: null,
    duplicateNode: null,
    handleChatClick: null,
    handleChatExecution: null
  });

  // Process saved workflow data after handlers are defined
  useEffect(() => {
    // Only process if we have saved data and haven't loaded yet
    if (!hasLoadedWorkflow.current || !savedWorkflowData.current) return;
    
    // If nodes already exist, don't overwrite (user might have started working)
    if (nodes.length > 0) {
      hasLoadedWorkflow.current = false; // Mark as processed
      return;
    }
    
    // Wait for handlers to be defined
    if (!handlersRef.current.handleExecutionClick) {
      return; // Handlers not ready yet
    }
    
    try {
      const workflow = savedWorkflowData.current;
      if (!workflow || !workflow.nodes || workflow.nodes.length === 0) {
        hasLoadedWorkflow.current = false;
        return;
      }
      
      console.log('📂 Processing saved workflow:', { 
        nodesCount: workflow.nodes.length, 
        edgesCount: (workflow.edges || []).length 
      });
      
      // Process nodes and ensure unique IDs
      const processedNodes = workflow.nodes.map(node => {
        return {
          id: node.id,
          type: node.type,
          position: node.position || { x: 0, y: 0 },
          data: {
            label: node.data?.label || 'Node',
            type: node.data?.type || node.type,
            properties: node.data?.properties || {},
            onSettingsClick: undefined,
            onExecutionClick: handlersRef.current.handleExecutionClick,
            onDelete: handlersRef.current.deleteNode,
            onDuplicate: handlersRef.current.duplicateNode,
            onChatClick: handlersRef.current.handleChatClick,
            onTrackExecution: handlersRef.current.handleChatExecution
          }
        };
      });

      // Ensure unique node IDs and update edges accordingly
      const { nodes: uniqueNodes, edges: updatedEdges, idMap } = ensureUniqueNodeIds(processedNodes, workflow.edges || []);
      
      // Update localStorage keys for properties if IDs changed
      uniqueNodes.forEach((node, index) => {
        const originalNode = processedNodes[index];
        if (originalNode && originalNode.id !== node.id && originalNode.data?.properties) {
          // Move properties to new ID
          try {
            const oldKey = `inputValues_${originalNode.id}`;
            const newKey = `inputValues_${node.id}`;
            const oldProperties = localStorage.getItem(oldKey);
            if (oldProperties) {
              localStorage.setItem(newKey, oldProperties);
              localStorage.removeItem(oldKey);
            }
            // Also check if properties are in node.data
            if (originalNode.data.properties && Object.keys(originalNode.data.properties).length > 0) {
              localStorage.setItem(newKey, JSON.stringify(originalNode.data.properties));
            }
          } catch (error) {
            console.error(`Error updating localStorage for node ${originalNode.id} -> ${node.id}:`, error);
          }
        } else if (node.data?.properties && Object.keys(node.data.properties).length > 0) {
          // Save properties with current ID
          try {
            localStorage.setItem(`inputValues_${node.id}`, JSON.stringify(node.data.properties));
          } catch (error) {
            console.error(`Error saving to localStorage for node ${node.id}:`, error);
          }
        }
      });
      
      setNodes(uniqueNodes);
      setEdges(updatedEdges);
      setIsSaved(true);
      hasLoadedWorkflow.current = false; // Mark as processed to prevent re-loading
      console.log('✅ Restored workflow from localStorage:', { 
        nodes: uniqueNodes.length, 
        edges: updatedEdges.length 
      });
    } catch (error) {
      console.error('❌ Error processing saved workflow:', error);
      hasLoadedWorkflow.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  // Save auto-save preference
  useEffect(() => {
    localStorage.setItem('autoSaveEnabled', autoSaveEnabled.toString());
  }, [autoSaveEnabled]);

  // Auto-save workflow to localStorage whenever nodes or edges change (debounced)
  useEffect(() => {
    if (!autoSaveEnabled) {
      // If auto-save is disabled, don't save
      return;
    }
    
    // Don't auto-save if we're still in the initial loading phase
    // (wait a bit to ensure we're not saving during initial load)
    if (hasLoadedWorkflow.current && savedWorkflowData.current && nodes.length === 0) {
      return;
    }
    
    const autoSaveTimer = setTimeout(() => {
      try {
        // Load all properties from localStorage before saving
        const enhancedNodes = loadNodesWithProperties(nodes);
        
        const workflowToSave = {
          nodes: enhancedNodes.map(node => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: {
              label: node.data.label,
              type: node.data.type,
              properties: node.data.properties || {},
              // Remove function references
              onSettingsClick: undefined,
              onExecutionClick: undefined,
              onDelete: undefined,
              onDuplicate: undefined,
              onChatClick: undefined,
              onTrackExecution: undefined
            }
          })),
          edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            type: edge.type,
            animated: edge.animated,
            style: edge.style,
            markerEnd: edge.markerEnd
          })),
          version: '1.0.0',
          savedAt: new Date().toISOString()
        };
        
        localStorage.setItem('savedWorkflow', JSON.stringify(workflowToSave));
        localStorage.setItem('workflowName', workflowName);
        setIsSaved(true);
        console.log('💾 Auto-saved workflow to localStorage:', { 
          nodes: workflowToSave.nodes.length, 
          edges: workflowToSave.edges.length 
        });
      } catch (error) {
        console.error('Error auto-saving workflow:', error);
      }
    }, 1000); // Debounce by 1 second
    
    return () => clearTimeout(autoSaveTimer);
  }, [nodes, edges, workflowName, loadNodesWithProperties, autoSaveEnabled]);
  
  // Save state to history for undo/redo
  const saveToHistory = useCallback((nodesState, edgesState) => {
    const state = {
      nodes: JSON.parse(JSON.stringify(nodesState)),
      edges: JSON.parse(JSON.stringify(edgesState)),
      timestamp: Date.now()
    };
    
    // Remove future history if we're not at the end
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }
    
    historyRef.current.push(state);
    
    // Limit history size
    if (historyRef.current.length > maxHistorySize) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
  }, []);

  // Load execution history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('executionHistory');
      if (savedHistory) {
        setExecutionHistory(JSON.parse(savedHistory));
        console.log('📂 Loaded execution history from localStorage');
      }
    } catch (error) {
      console.error('Error loading execution history:', error);
    }
  }, []);

  // Save execution history to localStorage whenever it changes
  useEffect(() => {
    if (executionHistory.length > 0) {
      try {
        localStorage.setItem('executionHistory', JSON.stringify(executionHistory.slice(0, 50)));
        console.log('💾 Saved execution history to localStorage');
      } catch (error) {
        console.error('Error saving execution history:', error);
      }
    }
  }, [executionHistory]);

  // Check if manual trigger exists
  const hasManualTrigger = nodes.some(node => node.data.type === 'manual-trigger');

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => {
      // Save current state to history before connecting
      saveToHistory(nodes, edges);
      
      // Determine edge style based on connection type
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      const sourceTypeDef = nodeTypeDefinitions[sourceNode?.data?.type];
      const targetTypeDef = nodeTypeDefinitions[targetNode?.data?.type];
      
      // Check if connecting AI components (chat models, memory, tools)
      const sourceOutput = sourceTypeDef?.outputs?.find(o => o.name === (params.sourceHandle || 'main'));
      const targetInput = targetTypeDef?.inputs?.find(i => i.name === (params.targetHandle || 'main'));
      
      // Validation: Check connection types match
      if (sourceOutput && targetInput) {
        // Allow flexible connections: main/main, ai/ai, and ai/main for AI Agent main input
        const isValidConnection = sourceOutput.type === targetInput.type || 
                                 (sourceOutput.type === 'ai' && targetInput.type === 'ai') ||
                                 (sourceOutput.type === 'main' && targetInput.type === 'ai') ||
                                 (sourceOutput.type === 'ai' && targetInput.type === 'main' && targetInput.name === 'main') ||
                                 (sourceOutput.type === 'ai' && targetInput.type === 'main') ||
                                 // Allow chat model outputs to connect to any AI input
                                 (sourceOutput.type === 'ai' && targetInput.type === 'ai') ||
                                 // Allow any output to connect to main inputs
                                 (targetInput.type === 'main');
        
        if (!isValidConnection) {
          // Show error toast/notification with color hints
          const colorHint = targetInput.type === 'ai' ? 
            '\n\n🎨 Tip: Look for colored handles:\n• 🟢 Green = Chat Models & Tools\n• 🟣 Purple = Memory\n• Gray = Workflow Data' :
            '\n\n🎨 Tip: Gray handles connect to gray handles (workflow data)';
          alert(`❌ Invalid Connection!\n\nCannot connect ${sourceOutput.type} output to ${targetInput.type} input.\n\nValid connections:\n• main → main (gray)\n• main → ai (triggers to AI)\n• ai → ai (colored)${colorHint}`);
          return;
        }
      }
      
      // Validation: Check maxConnections
      if (targetInput && targetInput.maxConnections && targetInput.maxConnections > 0) {
        const existingConnections = edges.filter(e => 
          e.target === params.target && e.targetHandle === params.targetHandle
        );
        if (existingConnections.length >= targetInput.maxConnections) {
          alert(`❌ Connection Limit Reached!\n\nThis input (${targetInput.displayName}) can only accept ${targetInput.maxConnections} connection(s).\n\nPlease remove existing connection first.`);
          return;
        }
      }
      
      const isAIConnection = sourceOutput?.type === 'ai' || targetInput?.type === 'ai';
      
      const newEdge = {
        id: `e${params.source}-${params.target}-${params.sourceHandle || 'main'}-${params.targetHandle || 'main'}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        animated: true, 
        type: 'smoothstep',
        style: { 
          stroke: isAIConnection ? '#8b5cf6' : '#999', 
          strokeWidth: 3,
          strokeOpacity: 1
        },
        markerEnd: {
          type: 'arrowclosed',
          color: isAIConnection ? '#8b5cf6' : '#999',
          width: 20,
          height: 20
        }
      };
      
      // Check if edge already exists to prevent duplicates
      const existingEdge = edges.find(edge => 
        edge.source === newEdge.source && 
        edge.target === newEdge.target && 
        edge.sourceHandle === newEdge.sourceHandle && 
        edge.targetHandle === newEdge.targetHandle
      );
      
      if (existingEdge) {
        console.log('Edge already exists, skipping:', existingEdge.id);
        return;
      }
      
      console.log('Creating edge:', newEdge);
      console.log('Source node:', sourceNode?.data?.type, 'Output:', sourceOutput);
      console.log('Target node:', targetNode?.data?.type, 'Input:', targetInput);
      setEdges((eds) => {
        const newEdges = addEdge(newEdge, eds);
        console.log('Updated edges:', newEdges);
        
        // Force re-render by updating the edges array reference
        setTimeout(() => {
          setEdges(prev => [...prev]);
        }, 0);
        
        // Debug: Log edge information
        setEdgeDebugInfo(prev => [...prev, {
          id: newEdge.id,
          source: newEdge.source,
          target: newEdge.target,
          timestamp: new Date().toLocaleTimeString()
        }]);
        
        return newEdges;
      });
    },
    [nodes, edges, saveToHistory]
  );

  // Update handlers ref when handlers are defined
  useEffect(() => {
    handlersRef.current.handleSettingsClick = null;
  }, []);

  const handleRunPreviousNodes = useCallback(async (nodeId) => {
    if (!currentWorkflowId) {
      showToast('Please save the workflow first', 'error', 3000);
      return;
    }

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setIsExecuting(true);
    setExecutingNodes(new Set([nodeId]));

    try {
      const response = await fetch(`/api/workflows/${currentWorkflowId}/execute_node/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          node_id: nodeId,
          trigger_data: {
            message: 'Hello, how can I help you today?',
            text: 'Hello, how can I help you today?',
            user: 'anonymous',
            channel: '',
            timestamp: new Date().toISOString()
          },
          credentials: {},
        }),
      });

      if (response.ok) {
        const result = await response.json();
        showToast('✅ Previous nodes executed successfully', 'success', 2000);
        
        // Update node execution states
        if (result.execution?.node_states) {
          setNodeExecutionStates(result.execution.node_states);
          
          // Load existing execution data and merge with new data
          const existingDataStr = localStorage.getItem('workflow_execution_data');
          const existingData = existingDataStr ? JSON.parse(existingDataStr) : null;
          let executionData = existingData || {
            workflow_id: currentWorkflowId || 'local',
            execution_id: result.execution_id || Date.now().toString(),
            node_states: {},
            node_results: {},
            execution_order: [],
            timestamp: new Date().toISOString()
          };
          
          const existingNodeCount = Object.keys(executionData.node_states || {}).length;
          
          // Merge node_states - preserve existing data, only update newly executed nodes
          executionData.node_states = {
            ...executionData.node_states,
            ...result.execution.node_states
          };
          
          // Merge node_results if available
          if (result.execution?.node_results) {
            executionData.node_results = {
              ...(executionData.node_results || {}),
              ...result.execution.node_results
            };
          }
          
          // Merge execution_order - keep unique node IDs
          const newExecutionOrder = result.execution.execution_order || Object.keys(result.execution.node_states);
          const combinedOrder = [...new Set([...executionData.execution_order, ...newExecutionOrder])];
          executionData.execution_order = combinedOrder;
          
          executionData.workflow_id = currentWorkflowId || executionData.workflow_id || 'local';
          executionData.execution_id = result.execution_id || executionData.execution_id || Date.now().toString();
          executionData.timestamp = new Date().toISOString();
          
          try {
            localStorage.setItem('workflow_execution_data', JSON.stringify(executionData));
            console.log('💾 Stored execution data in localStorage (run previous nodes) - merged:', {
              existing_nodes: existingNodeCount,
              new_nodes: Object.keys(result.execution.node_states).length,
              total_nodes: Object.keys(executionData.node_states).length
            });
            // Dispatch custom event to notify VariablesPanel
            window.dispatchEvent(new Event('workflowExecutionUpdate'));
          } catch (error) {
            console.error('Error storing execution data:', error);
          }
        }
      } else {
        const error = await response.json();
        showToast(`Error: ${error.error || 'Failed to execute previous nodes'}`, 'error', 3000);
      }
    } catch (error) {
      console.error('Error executing previous nodes:', error);
      showToast('Failed to execute previous nodes', 'error', 3000);
    } finally {
      setIsExecuting(false);
      setExecutingNodes(new Set());
    }
  }, [currentWorkflowId, nodes, showToast]);

  const handleExecutionClick = useCallback(async (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    
    if (!node) {
      console.error('❌ Node not found:', nodeId);
      showToast('Node not found', 'error', 2000);
      return;
    }
    
    // For chat nodes, open chat UI
    if (node?.data?.type === 'when-chat-received') {
      setChatOpen(true);
      return;
    }
    
    // Execute single node - create workflow if not saved
    if (!currentWorkflowId) {
      console.log('⚠️ No workflow ID, creating workflow first...');
      try {
        const enhancedNodes = loadNodesWithProperties(nodes);
        const createResponse = await fetch('/api/workflows/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: workflowName || 'Untitled Workflow',
            nodes: enhancedNodes,
            edges: edges
          })
        });
        
        if (createResponse.ok) {
          const created = await createResponse.json();
          setCurrentWorkflowId(created.id);
          console.log('✅ Created workflow:', created.id);
        } else {
          throw new Error('Failed to create workflow');
        }
      } catch (error) {
        console.error('Error creating workflow:', error);
        showToast('Failed to create workflow. Please save the workflow first.', 'error', 3000);
        return;
      }
    }
    
    // Execute single node if workflow is saved
    if (currentWorkflowId) {
      setIsExecuting(true);
      setExecutingNodes(prev => new Set([...prev, nodeId]));
      
      // Update node execution state to show loading
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  executionState: {
                    status: 'running',
                    output: 'Executing...',
                    startTime: new Date(),
                    endTime: null
                  }
                }
              }
            : n
        )
      );
      
      try {
        // Load properties from localStorage
        const enhancedNodes = loadNodesWithProperties(nodes);
        
        // Log the properties being sent
        const targetNode = enhancedNodes.find(n => n.id === nodeId);
        if (targetNode) {
          console.log('🔍 Executing node with properties:', {
            nodeId: targetNode.id,
            type: targetNode.data.type,
            properties: targetNode.data.properties,
            user_message: targetNode.data.properties?.user_message
          });
        }
        
        // Update workflow with current node properties
        const updateResponse = await fetch(`/api/workflows/${currentWorkflowId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodes: enhancedNodes,
            edges: edges
          })
        });
        
        if (!updateResponse.ok) {
          throw new Error('Failed to update workflow with latest properties');
        }
        
        // Wait a bit to ensure database is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Prepare trigger data based on node type
        let triggerData = {
          message: 'Hello, how can I help you today?',
          text: 'Hello, how can I help you today?',
          user: 'anonymous',
          channel: '',
          timestamp: new Date().toISOString()
        };
        
        // If this is a webhook node, check for test_json in properties
        if (targetNode && targetNode.data.type === 'webhook') {
          const properties = targetNode.data.properties || {};
          if (properties.test_json && properties.test_json.trim()) {
            try {
              const testBody = JSON.parse(properties.test_json);
              triggerData = {
                method: 'POST',
                path: properties.path || '/webhook',
                headers: {},
                body: testBody,
                query_params: {},
                timestamp: Date.now() / 1000
              };
              console.log('✅ Using test JSON for webhook node:', testBody);
            } catch (e) {
              console.error('❌ Invalid test JSON:', e);
              showToast('Invalid JSON in test field. Please check the format.', 'error', 3000);
              setIsExecuting(false);
              setExecutingNodes(prev => {
                const newSet = new Set(prev);
                newSet.delete(nodeId);
                return newSet;
              });
              return;
            }
          }
        }
        
        // Execute the single node
        const response = await fetch(`/api/workflows/${currentWorkflowId}/execute_node/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node_id: nodeId,
            trigger_data: triggerData,
            credentials: {},
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          const endTime = new Date();
          
          console.log('✅ Node execution result:', result);
          
          // Check if this is a trigger node - if so, process like full workflow execution
          const nodeType = node?.data?.type || '';
          const isTriggerNode = ['webhook', 'manual-trigger', 'when-chat-received', 'schedule'].includes(nodeType);
          
          if (isTriggerNode && result.execution?.node_states) {
            // This is a trigger node - execute full workflow like chat trigger
            console.log('🔄 Trigger node detected - processing full workflow execution');
            const nodeStates = result.execution.node_states;
            const nodeResults = result.execution?.node_results || {};
            
            // Load existing execution data and merge with new data
            const existingDataStr = localStorage.getItem('workflow_execution_data');
            const existingData = existingDataStr ? JSON.parse(existingDataStr) : null;
            let executionData = existingData || {
              workflow_id: currentWorkflowId || 'local',
              execution_id: result.execution_id || Date.now().toString(),
              node_states: {},
              node_results: {},
              execution_order: [],
              timestamp: new Date().toISOString()
            };
            
            // Merge node_states
            executionData.node_states = {
              ...executionData.node_states,
              ...nodeStates
            };
            
            // Merge node_results
            if (result.execution?.node_results) {
              executionData.node_results = {
                ...(executionData.node_results || {}),
                ...result.execution.node_results
              };
            }
            
            // Merge execution_order
            const newExecutionOrder = result.execution.execution_order || Object.keys(nodeStates);
            const combinedOrder = [...new Set([...executionData.execution_order, ...newExecutionOrder])];
            executionData.execution_order = combinedOrder;
            
            executionData.workflow_id = currentWorkflowId || executionData.workflow_id || 'local';
            executionData.execution_id = result.execution_id || executionData.execution_id || Date.now().toString();
            executionData.timestamp = new Date().toISOString();
            
            try {
              localStorage.setItem('workflow_execution_data', JSON.stringify(executionData));
              console.log('💾 Stored full workflow execution data (trigger node):', {
                triggerNode: nodeId,
                nodeStates: Object.keys(executionData.node_states),
                executionOrder: executionData.execution_order
              });
              window.dispatchEvent(new Event('workflowExecutionUpdate'));
            } catch (error) {
              console.error('Error storing execution data:', error);
            }
            
            // Update ALL nodes in the workflow (like chat trigger does)
            const executionOrder = result.execution.execution_order || Object.keys(nodeStates);
            const allNodesToUpdate = executionOrder.filter(nId => {
              const nState = nodeStates[nId];
              const n = nodes.find(nd => nd.id === nId);
              return n && nState;
            });
            
            // Set all nodes to running at once
            setNodes((nds) =>
              nds.map((n) => {
                if (allNodesToUpdate.includes(n.id)) {
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      executionState: {
                        status: 'running',
                        output: 'Executing...',
                        timestamp: new Date().toISOString()
                      }
                    }
                  };
                }
                return n;
              })
            );
            
            // Wait a bit for running animation
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Now update all nodes to completed/error state with proper output extraction
            setNodes((nds) =>
              nds.map((n) => {
                const nState = nodeStates[n.id];
                const nResult = nodeResults[n.id];
                
                if (nState && allNodesToUpdate.includes(n.id)) {
                  // Extract output properly
                  let formattedOutput = nState.output;
                  
                  // Use nodeResult if available, otherwise nodeState.output
                  let outputToFormat = nState.output || nResult || nState;
                  
                  if (n.data.type === 'readme-viewer' && outputToFormat) {
                    if (typeof outputToFormat === 'object') {
                      if (outputToFormat.main && typeof outputToFormat.main === 'object') {
                        formattedOutput = outputToFormat.main.content || outputToFormat.main.text || JSON.stringify(outputToFormat.main, null, 2);
                      } else if (outputToFormat.content) {
                        formattedOutput = outputToFormat.content;
                      } else {
                        formattedOutput = JSON.stringify(outputToFormat, null, 2);
                      }
                    }
                  } else if (typeof outputToFormat === 'object' && outputToFormat !== null) {
                    if (outputToFormat.main) {
                      if (typeof outputToFormat.main === 'string') {
                        formattedOutput = outputToFormat.main;
                      } else if (outputToFormat.main.content) {
                        formattedOutput = outputToFormat.main.content;
                      } else if (outputToFormat.main.text) {
                        formattedOutput = outputToFormat.main.text;
                      } else {
                        formattedOutput = JSON.stringify(outputToFormat.main, null, 2);
                      }
                    } else if (outputToFormat.content) {
                      formattedOutput = outputToFormat.content;
                    } else if (outputToFormat.text) {
                      formattedOutput = outputToFormat.text;
                    } else {
                      formattedOutput = JSON.stringify(outputToFormat, null, 2);
                    }
                  }
                  
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      executionState: {
                        status: nState.status || (result.status === 'error' ? 'error' : 'completed'),
                        output: formattedOutput || 'Execution completed',
                        error: nState.error,
                        timestamp: nState.timestamp || new Date().toISOString(),
                        startTime: new Date(),
                        endTime: new Date()
                      }
                    }
                  };
                }
                return n;
              })
            );
            
            // Show toast for workflow completion
            const completedNodes = allNodesToUpdate.filter(id => nodeStates[id]?.status === 'completed').length;
            const errorNodes = allNodesToUpdate.filter(id => nodeStates[id]?.status === 'error').length;
            if (completedNodes > 0) {
              showToast(`✅ Workflow executed: ${completedNodes} node(s) completed`, 'success', 3000);
            }
            if (errorNodes > 0) {
              showToast(`❌ ${errorNodes} node(s) failed`, 'error', 4000);
            }
            
            // Add all nodes to execution history
            allNodesToUpdate.forEach(nId => {
              const nState = nodeStates[nId];
              const n = nodes.find(nd => nd.id === nId);
              if (n && nState) {
                const nodeExecution = {
                  id: Date.now() + Math.random() + nId,
                  nodeType: n.data.type,
                  nodeName: n.data.label,
                  status: nState.status,
                  startTime: new Date(),
                  endTime: new Date(),
                  source: 'trigger-workflow',
                  output: typeof nState.output === 'string' ? nState.output : JSON.stringify(nState.output, null, 2),
                  duration: 100
                };
                setExecutionHistory(prev => [nodeExecution, ...prev.slice(0, 49)]);
              }
            });
            
          } else {
            // Single node execution (non-trigger node)
            console.log('📌 Single node execution (non-trigger)');
            
            // Get node result from execution
            const nodeState = result.execution?.node_states?.[nodeId];
            const nodeResult = nodeState?.output || result.execution?.node_results?.[nodeId];
            
            // Debug: Log node result structure for wallet connection detection
            console.log('🔍 Wallet Connect Debug - nodeResult:', nodeResult);
            console.log('🔍 Wallet Connect Debug - nodeResult.main:', nodeResult?.main);
            
            // Extract formatted output
            let formattedOutput = 'Execution completed';
            if (nodeResult) {
              if (typeof nodeResult === 'string') {
                formattedOutput = nodeResult;
              } else if (nodeResult.response) {
                formattedOutput = nodeResult.response;
              } else if (nodeResult.output) {
                formattedOutput = nodeResult.output;
              } else if (nodeResult.text) {
                formattedOutput = nodeResult.text;
              } else if (nodeResult.main) {
                if (typeof nodeResult.main === 'string') {
                  formattedOutput = nodeResult.main;
                } else if (nodeResult.main.response) {
                  formattedOutput = nodeResult.main.response;
                } else if (nodeResult.main.output) {
                  formattedOutput = nodeResult.main.output;
                } else if (nodeResult.main.text) {
                  formattedOutput = nodeResult.main.text;
                } else if (nodeResult.main.sentiment) {
                  const sentiment = nodeResult.main.sentiment;
                  const confidence = nodeResult.main.confidence || 0.5;
                  formattedOutput = `Sentiment: ${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} (Confidence: ${confidence.toFixed(2)})`;
                } else if (nodeResult.main.category) {
                  formattedOutput = `Category: ${nodeResult.main.category}`;
                } else {
                  formattedOutput = JSON.stringify(nodeResult.main, null, 2);
                }
              } else {
                formattedOutput = JSON.stringify(nodeResult, null, 2);
              }
            }
            
            // Update node execution state
            setNodes((nds) =>
              nds.map((n) =>
                n.id === nodeId
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        executionState: {
                          status: result.status === 'error' ? 'error' : 'completed',
                          output: formattedOutput,
                          startTime: nodeState?.startTime ? new Date(nodeState.startTime) : new Date(),
                          endTime: endTime
                        }
                      }
                    }
                  : n
              )
            );
            
            // Store execution data in localStorage
            const existingData = localStorage.getItem('workflow_execution_data');
            let executionData = existingData ? JSON.parse(existingData) : {
              workflow_id: currentWorkflowId,
              execution_id: result.execution_id || Date.now().toString(),
              node_states: {},
              execution_order: [],
              timestamp: new Date().toISOString()
            };
            
            // Merge new execution data
            if (result.execution?.node_states) {
              executionData.node_states = {
                ...executionData.node_states,
                ...result.execution.node_states
              };
            }
            
            // Also check node_results if available
            if (result.execution?.node_results) {
              Object.entries(result.execution.node_results).forEach(([nId, nResult]) => {
                if (!executionData.node_states[nId]) {
                  executionData.node_states[nId] = {
                    status: 'completed',
                    output: nResult
                  };
                } else if (!executionData.node_states[nId].output) {
                  executionData.node_states[nId].output = nResult;
                }
              });
              // Also store node_results separately for easier access
              if (!executionData.node_results) {
                executionData.node_results = {};
              }
              executionData.node_results = {
                ...executionData.node_results,
                ...result.execution.node_results
              };
            }
            
            if (result.execution?.execution_order) {
              // Merge execution order, keeping unique nodes
              const existingOrder = executionData.execution_order || [];
              const newOrder = result.execution.execution_order || [];
              executionData.execution_order = [...new Set([...existingOrder, ...newOrder])];
            }
            
            executionData.execution_id = result.execution_id || executionData.execution_id;
            executionData.timestamp = new Date().toISOString();
            
            try {
              localStorage.setItem('workflow_execution_data', JSON.stringify(executionData));
              console.log('💾 Stored single node execution data in localStorage:', {
                nodeId,
                nodeStates: Object.keys(executionData.node_states),
                nodeResults: Object.keys(executionData.node_results || {}),
                executionOrder: executionData.execution_order
              });
              window.dispatchEvent(new Event('workflowExecutionUpdate'));
            } catch (error) {
              console.error('Error storing execution data:', error);
            }
            
            // Add to execution history
            const nodeExecution = {
              id: Date.now() + Math.random(),
              nodeType: node.data.type,
              nodeName: node.data.label,
              status: result.status === 'error' ? 'error' : 'completed',
              startTime: nodeState?.startTime ? new Date(nodeState.startTime) : new Date(),
              endTime: endTime,
              source: 'single-node',
              output: formattedOutput,
              duration: endTime - (nodeState?.startTime ? new Date(nodeState.startTime).getTime() : Date.now())
            };
            setExecutionHistory(prev => [nodeExecution, ...prev.slice(0, 49)]);
            
            if (result.status === 'error') {
              showToast(`❌ Node execution failed: ${result.error || 'Unknown error'}`, 'error', 3000);
            } else {
              // Check if node requires frontend action (e.g., wallet connection)
              // nodeResult should be the output object with a 'main' property
              const mainOutput = nodeResult?.main;
              
              console.log('🔍 Wallet Connect Check:', {
                hasNodeResult: !!nodeResult,
                hasMain: !!mainOutput,
                requiresFrontend: mainOutput?.requires_frontend,
                action: mainOutput?.action,
                walletType: mainOutput?.wallet_type,
                chain: mainOutput?.chain
              });
              
              if (mainOutput && mainOutput.requires_frontend && mainOutput.action === 'connect_wallet') {
                console.log('✅ Wallet connection detected! Triggering connection...');
                
                // Use dynamic import for wallet utilities
                (async () => {
                  try {
                    const walletModule = await import('../../utils/wallet');
                    const { connectWallet } = walletModule;
                    
                    const walletType = mainOutput.wallet_type || 'metamask';
                    const chain = mainOutput.chain || 'ethereum';
                    
                    console.log(`🔗 Attempting to connect to ${walletType} on ${chain}...`);
                    
                    // Show prominent notification
                    showToast(`🔗 Please approve the ${walletType} connection in the popup`, 'info', 5000);
                    
                    // Small delay to ensure toast is visible before popup
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    const walletInfo = await connectWallet(walletType, chain);
                    
                    console.log('✅ Wallet connected successfully:', walletInfo);
                    const shortAddress = walletInfo.address.length > 10 
                      ? `${walletInfo.address.substring(0, 6)}...${walletInfo.address.substring(walletInfo.address.length - 4)}`
                      : walletInfo.address;
                    
                    const connectionMessage = walletInfo.alreadyConnected 
                      ? `✅ Wallet already connected: ${shortAddress}`
                      : `✅ Wallet connected: ${shortAddress}`;
                    
                    showToast(connectionMessage, 'success', 4000);
                    
                    // Update node output with wallet address
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === nodeId
                          ? {
                              ...n,
                              data: {
                                ...n.data,
                                executionState: {
                                  ...n.data.executionState,
                                  output: `Wallet connected: ${walletInfo.address}`
                                }
                              }
                            }
                          : n
                      )
                    );
                  } catch (error) {
                    console.error('❌ Wallet connection error:', error);
                    showToast(`❌ Wallet connection failed: ${error.message}`, 'error', 4000);
                  }
                })();
              } else {
                // Show formatted output in toast
                const shortOutput = formattedOutput.length > 100 ? formattedOutput.substring(0, 100) + '...' : formattedOutput;
                showToast(`✅ ${node.data.label}: ${shortOutput}`, 'success', 3000);
              }
            }
          }
        } else {
          const error = await response.json();
          showToast(`❌ Execution failed: ${error.error || 'Unknown error'}`, 'error', 3000);
          
          // Update node execution state to show error
          setNodes((nds) =>
            nds.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      executionState: {
                        status: 'error',
                        output: `❌ ${error.error || 'Execution failed'}`,
                        startTime: new Date(),
                        endTime: new Date()
                      }
                    }
                  }
                : n
            )
          );
        }
      } catch (error) {
        console.error('Error executing single node:', error);
        showToast('❌ Failed to execute node', 'error', 3000);
        
        // Update node execution state to show error
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    executionState: {
                      status: 'error',
                      output: `❌ ${error.message || 'Execution failed'}`,
                      startTime: new Date(),
                      endTime: new Date()
                    }
                  }
                }
              : n
          )
        );
      } finally {
        setIsExecuting(false);
        setExecutingNodes(prev => {
          const newSet = new Set(prev);
          newSet.delete(nodeId);
          return newSet;
        });
      }
      
      return;
    }
    
    // For chat model nodes, execute a real test (fallback for unsaved workflows)
    if (node?.data?.type?.includes('groq') || node?.data?.type?.includes('openai') || node?.data?.type?.includes('anthropic')) {
      const startTime = new Date();
      showToast(`🔄 Testing ${node.data.label}...`, 'info', 2000);
      
      // Show loading animation immediately
      setExecutingNodes(prev => new Set([...prev, nodeId]));
      
      // Update node execution state to show loading
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  executionState: {
                    status: 'running',
                    output: 'Executing...',
                    startTime,
                    endTime: null
                  }
                }
              }
            : n
        )
      );
      
      try {
        // Load properties from localStorage
        const enhancedNodes = loadNodesWithProperties([node]);
        const enhancedNode = enhancedNodes[0];
        const nodeProperties = enhancedNode.data.properties || {};
        
        console.log('🔍 Executing test for node:', {
          id: nodeId,
          type: node.data.type,
          properties: Object.keys(nodeProperties),
          hasApiKey: !!(nodeProperties.api_key || nodeProperties.apiKey)
        });
        
        // Validate API key for chat model nodes
        if (node.data.type?.includes('groq') || node.data.type?.includes('openai') || node.data.type?.includes('anthropic')) {
          const apiKey = nodeProperties.api_key || nodeProperties.apiKey;
          if (!apiKey || apiKey.trim().length < 10) {
            const endTime = new Date();
            const errorMessage = 'API key is required. Please configure it in the node settings.';
            
            setNodes((nds) =>
              nds.map((n) =>
                n.id === nodeId
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        executionState: {
                          status: 'error',
                          output: `❌ ${errorMessage}`,
                          startTime,
                          endTime
                        }
                      }
                    }
                  : n
              )
            );
            
            showToast(`❌ ${errorMessage}`, 'error', 4000);
            setExecutingNodes(prev => {
              const newSet = new Set(prev);
              newSet.delete(nodeId);
              return newSet;
            });
            return;
          }
        }
        
        const testWorkflow = {
          nodes: [
            {
              id: 'test-trigger',
              type: 'manual-trigger',
              data: { 
                type: 'manual-trigger', 
                label: 'Test Trigger',
                properties: { message: 'test api key from agent flow' }
              }
            },
            {
              id: nodeId,
              type: node.data.type,
              data: { 
                type: node.data.type, 
                label: node.data.label,
                properties: nodeProperties
              }
            }
          ],
          edges: [
            {
              id: 'test-edge',
              source: 'test-trigger',
              target: nodeId,
              sourceHandle: 'main',
              targetHandle: 'main'
            }
          ]
        };

        // Create workflow in backend
        const createResponse = await fetch('/api/workflows/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Workflow',
            description: 'Test workflow for node execution',
            nodes: testWorkflow.nodes,
            edges: testWorkflow.edges
          })
        });

        if (!createResponse.ok) {
          throw new Error(`Failed to create test workflow: ${createResponse.status}`);
        }

        const createdWorkflow = await createResponse.json();

        // Execute the test workflow
        const response = await fetch(`/api/workflows/${createdWorkflow.id}/execute/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trigger_data: { message: 'test api key from agent flow' },
            credentials: {}
          })
        });

        if (response.ok) {
          const result = await response.json();
          const endTime = new Date();
          
          console.log('🔍 Full backend response:', result);
          console.log('🔍 Execution object:', result.execution);
          console.log('🔍 Node states:', result.execution?.node_states);
          
          // Find the node result from node_states
          const nodeResult = result.execution?.node_states?.[nodeId];
          console.log('🔍 Node result:', nodeResult);
          
          // Check if the workflow execution failed
          if (result.status === 'error' || result.error) {
            // Try to get detailed error from node states first
            let errorMessage = result.error || 'Workflow execution failed';
            
            // Check node states for more specific error
            if (result.execution?.node_states?.[nodeId]) {
              const nodeState = result.execution.node_states[nodeId];
              if (nodeState.error) {
                errorMessage = nodeState.error;
              } else if (nodeState.status === 'error') {
                errorMessage = nodeState.output?.error || nodeState.output || errorMessage;
              }
            }
            
            // Check execution details for more context
            if (result.execution?.error) {
              errorMessage = result.execution.error;
            }
            
            console.log('❌ Workflow execution failed:', {
              status: result.status,
              error: result.error,
              executionError: result.execution?.error,
              nodeState: result.execution?.node_states?.[nodeId],
              fullResult: result
            });
            
            const nodeExecution = {
              id: Date.now() + Math.random(),
              nodeType: node.data.type,
              nodeName: node.data.label,
              status: 'error',
              startTime,
              endTime,
              source: 'test',
              output: `❌ ${errorMessage}`,
              duration: endTime - startTime
            };
            
            // Update node execution state to show error
            setNodes((nds) =>
              nds.map((n) =>
                n.id === nodeId
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        executionState: {
                          status: 'error',
                          output: `❌ ${errorMessage}`,
                          startTime,
                          endTime
                        }
                      }
                    }
                  : n
              )
            );
            
            // Add to execution history
            setExecutionHistory(prev => [nodeExecution, ...prev.slice(0, 49)]);
            showToast(`❌ ${node.data.label} test failed: ${errorMessage}`, 'error', 5000);
          }
          // Check if the specific node execution failed
          else if (nodeResult?.status === 'error' || nodeResult?.error) {
            const errorMessage = nodeResult.error || nodeResult.output?.error || 'Node execution failed';
            
            console.log('❌ Node execution failed:', errorMessage);
            
            const nodeExecution = {
              id: Date.now() + Math.random(),
              nodeType: node.data.type,
              nodeName: node.data.label,
              status: 'error',
              startTime,
              endTime,
              source: 'test',
              output: `❌ ${errorMessage}`,
              duration: endTime - startTime
            };
            
            // Update node execution state to show error
            setNodes((nds) =>
              nds.map((n) =>
                n.id === nodeId
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        executionState: {
                          status: 'error',
                          output: `❌ ${errorMessage}`,
                          startTime,
                          endTime
                        }
                      }
                    }
                  : n
              )
            );
            
            // Add to execution history
            setExecutionHistory(prev => [nodeExecution, ...prev.slice(0, 49)]);
            showToast(`❌ ${node.data.label} test failed: ${errorMessage}`, 'error', 4000);
          } else {
            // Success case - extract text from output object
            let output = 'Execution completed';
            
            // Check nodeResult structure - it might be the output directly or nested
            const resultData = nodeResult?.output || nodeResult;
            
            if (resultData) {
              // First check for direct string
              if (typeof resultData === 'string') {
                output = resultData;
              }
              // Check top-level response/output fields (new format)
              else if (resultData.response) {
                output = resultData.response;
              } else if (resultData.output) {
                output = resultData.output;
              } else if (resultData.text) {
                output = resultData.text;
              }
              // Check main object fields
              else if (resultData.main) {
                if (typeof resultData.main === 'string') {
                  output = resultData.main;
                } else if (resultData.main.response) {
                  output = resultData.main.response;
                } else if (resultData.main.output) {
                  output = resultData.main.output;
                } else if (resultData.main.text) {
                  output = resultData.main.text;
                } else if (resultData.main.sentiment) {
                  // Format sentiment analysis result
                  const sentiment = resultData.main.sentiment;
                  const confidence = resultData.main.confidence || 0.5;
                  output = `Sentiment: ${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} (Confidence: ${confidence.toFixed(2)})`;
                } else if (resultData.main.category) {
                  // Format text classifier result
                  output = `Category: ${resultData.main.category}`;
                } else {
                  // Fallback to stringify main object
                  output = JSON.stringify(resultData.main, null, 2);
                }
              } else {
                // If it's still an object, stringify it
                output = JSON.stringify(resultData, null, 2);
              }
            }
            
            console.log('✅ Node execution successful:', output);
            console.log('✅ Node result details:', nodeResult);
            
            const nodeExecution = {
              id: Date.now() + Math.random(),
              nodeType: node.data.type,
              nodeName: node.data.label,
              status: 'completed',
              startTime,
              endTime,
              source: 'test',
              output: output,
              duration: endTime - startTime
            };
            
            // Update node execution state
            setNodes((nds) =>
              nds.map((n) =>
                n.id === nodeId
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        executionState: {
                          status: 'completed',
                          output: output,
                          startTime,
                          endTime
                        }
                      }
                    }
                  : n
              )
            );
            
            // Add to execution history
            setExecutionHistory(prev => [nodeExecution, ...prev.slice(0, 49)]);
            
            // Show success toast with truncated output
            const shortOutput = output.length > 100 ? output.substring(0, 100) + '...' : output;
            showToast(`✅ ${node.data.label} test completed`, 'success', 3000);
          }
          
          // Clean up test workflow
          try {
            await fetch(`/api/workflows/${createdWorkflow.id}/`, { method: 'DELETE' });
          } catch (cleanupError) {
            console.warn('Failed to cleanup test workflow:', cleanupError);
          }
        } else {
          // Try to get error details from response
          let errorMessage = `Execution failed: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            console.error('❌ Backend error response:', errorData);
          } catch (parseError) {
            // If response is not JSON, try to get text
            try {
              const errorText = await response.text();
              if (errorText) {
                errorMessage = errorText.substring(0, 200); // Limit length
              }
            } catch (textError) {
              console.error('Could not parse error response:', textError);
            }
          }
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error('❌ Node execution failed:', {
          error: error.message,
          stack: error.stack,
          nodeId,
          nodeType: node.data.type
        });
        const endTime = new Date();
        
        const nodeExecution = {
          id: Date.now() + Math.random(),
          nodeType: node.data.type,
          nodeName: node.data.label,
          status: 'error',
          startTime,
          endTime,
          source: 'test',
          output: `❌ ${error.message || 'Execution failed'}`,
          duration: endTime - startTime
        };
        
        // Update node execution state to show error
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    executionState: {
                      status: 'error',
                      output: `❌ ${error.message || 'Execution failed'}`,
                      startTime,
                      endTime
                    }
                  }
                }
              : n
          )
        );
        
        setExecutionHistory(prev => [nodeExecution, ...prev.slice(0, 49)]);
        showToast(`❌ ${node.data.label} test failed: ${error.message || 'Execution failed'}`, 'error', 5000);
      } finally {
        // Clear loading state
        setExecutingNodes(prev => {
          const newSet = new Set(prev);
          newSet.delete(nodeId);
          return newSet;
        });
      }
    }
    // For other nodes, no dummy execution - only real backend execution
  }, [nodes, loadNodesWithProperties, setExecutingNodes, showToast]);

  const deleteNode = useCallback((nodeId) => {
    // Save current state to history before deletion
    saveToHistory(nodes, edges);
    
    // Clean up localStorage
    try {
      localStorage.removeItem(`inputValues_${nodeId}`);
      console.log(`🗑️ Cleaned up localStorage for deleted node ${nodeId}`);
    } catch (error) {
      console.error('Error cleaning up localStorage:', error);
    }
    
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId
    ));
    if (selectedNodeForModal?.id === nodeId) {
      setSelectedNodeForModal(null);
      setNodeSettingsModalOpen(false);
    }
  }, [nodes, edges, selectedNodeForModal, saveToHistory]);

  const handleChatExecution = useCallback((executionData) => {
    const newExecution = {
      ...executionData,
      id: Date.now(),
      timestamp: new Date(),
      output: executionData.input || executionData.output, // Show user input as output
      duration: executionData.duration || 1
    };
    
    setExecutionHistory(prev => [newExecution, ...prev.slice(0, 49)]); // Keep last 50 executions
  }, []);

  const executeWorkflowWithMessage = useCallback(async (message) => {
    if (nodes.length === 0) {
      throw new Error('No nodes in workflow');
    }

    // Find chat trigger node
    const chatTrigger = nodes.find(node => node.data.type === 'when-chat-received');
    if (!chatTrigger) {
      throw new Error('No "When Chat Message Received" trigger found in workflow');
    }
    
    // Check if respond-to-chat node exists
    const hasRespondNode = nodes.some(node => node.data.type === 'respond-to-chat');

    // Validate nodes before execution
    const invalidNodes = [];
    for (const node of nodes) {
      try {
        const savedInputs = localStorage.getItem(`inputValues_${node.id}`);
        const properties = savedInputs ? JSON.parse(savedInputs) : (node.data.properties || {});
        const nodeTypeDef = nodeTypeDefinitions[node.data.type];
        
        if (nodeTypeDef?.properties) {
          const requiredProps = Object.entries(nodeTypeDef.properties)
            .filter(([key, prop]) => prop.required);
          
          for (const [key, prop] of requiredProps) {
            // Special case for AI Agent: if System Message (prompt) has content, don't show error
            if (node.data.type === 'ai-agent' && key === 'prompt' && properties[key] && properties[key].trim() !== '') {
              continue; // Skip validation if prompt has content
            }
            
            if (!properties[key] || properties[key] === '') {
              invalidNodes.push({ id: node.id, label: node.data.label, error: `Missing: ${prop.label}` });
              break;
            }
          }
        }
        
        if (node.data.type?.includes('groq') || node.data.type?.includes('gpt') || node.data.type?.includes('claude')) {
          const apiKey = properties.api_key;
          if (!apiKey || apiKey.length < 10) {
            invalidNodes.push({ id: node.id, label: node.data.label, error: 'API key required' });
          }
        }
      } catch (error) {
        invalidNodes.push({ id: node.id, label: node.data.label, error: 'Configuration error' });
      }
    }
    
    if (invalidNodes.length > 0) {
      const errorList = invalidNodes.map(n => `• ${n.label}: ${n.error}`).join('\n');
      showToast(`Cannot execute. Fix these issues:\n${errorList}`, 'error', 8000);
      throw new Error('Workflow validation failed');
    }

    // Clear previous execution states
    setNodeExecutionStates({});
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: { ...node.data, executionState: null }
      }))
    );

    // Create or update workflow with proper properties
    let workflowId = currentWorkflowId;
    
    // Load all node properties from localStorage
    const enhancedNodes = loadNodesWithProperties(nodes);
    
    console.log('🚀 Executing chat workflow with enhanced nodes:', enhancedNodes.map(n => ({
      id: n.id,
      type: n.data.type,
      properties: Object.keys(n.data.properties || {})
    })));
    
    showToast('💬 Processing your message...', 'info', 2000);
    
    if (!workflowId) {
      const workflowData = {
        name: 'Chat Workflow',
        description: 'Workflow triggered by chat messages',
        nodes: enhancedNodes,
        edges: edges
      };
      
      const response = await fetch('/api/workflows/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create workflow: ${response.status}`);
      }
      
      const createdWorkflow = await response.json();
      workflowId = createdWorkflow.id;
      setCurrentWorkflowId(workflowId);
    } else {
      // Update existing workflow
      const workflowData = {
        name: 'Chat Workflow',
        description: 'Workflow triggered by chat messages',
        nodes: enhancedNodes,
        edges: edges
      };
      
      await fetch(`/api/workflows/${workflowId}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });
    }

    // Execute workflow with chat message
    const response = await fetch(`/api/workflows/${workflowId}/execute/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger_data: { message: message, text: message },
        credentials: {}
      })
    });

    if (!response.ok) {
      throw new Error(`Workflow execution failed: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('🔍 Full workflow execution result:', result);
    console.log('🔍 Execution node states:', result.execution?.node_states);
    
    // Process node states with animations
    if (result.execution && result.execution.node_states) {
      const nodeStates = result.execution.node_states;
      
          // Load existing execution data and merge with new data
          const existingDataStr = localStorage.getItem('workflow_execution_data');
          const existingData = existingDataStr ? JSON.parse(existingDataStr) : null;
          let executionData = existingData || {
            workflow_id: currentWorkflowId || 'local',
            execution_id: result.execution_id || Date.now().toString(),
            node_states: {},
            node_results: {},
            execution_order: [],
            timestamp: new Date().toISOString()
          };
          
          const existingNodeCount = Object.keys(executionData.node_states || {}).length;
          
          // Merge node_states - preserve existing data, only update newly executed nodes
          executionData.node_states = {
            ...executionData.node_states,
            ...nodeStates
          };
          
          // Merge node_results if available
          if (result.execution?.node_results) {
            executionData.node_results = {
              ...(executionData.node_results || {}),
              ...result.execution.node_results
            };
          }
          
          // Merge execution_order - keep unique node IDs
          const newExecutionOrder = result.execution.execution_order || Object.keys(nodeStates);
          const combinedOrder = [...new Set([...executionData.execution_order, ...newExecutionOrder])];
          executionData.execution_order = combinedOrder;
          
          executionData.workflow_id = currentWorkflowId || executionData.workflow_id || 'local';
          executionData.execution_id = result.execution_id || executionData.execution_id || Date.now().toString();
          executionData.timestamp = new Date().toISOString();
          
          try {
            localStorage.setItem('workflow_execution_data', JSON.stringify(executionData));
            console.log('💾 Stored execution data in localStorage (chat) - merged:', {
              existing_nodes: existingNodeCount,
              new_nodes: Object.keys(nodeStates).length,
              total_nodes: Object.keys(executionData.node_states).length
            });
            // Dispatch custom event to notify VariablesPanel
            window.dispatchEvent(new Event('workflowExecutionUpdate'));
          } catch (error) {
            console.error('Error storing execution data:', error);
          }
      
      // Animate nodes sequentially
      for (const nodeId of (result.execution.execution_order || Object.keys(nodeStates))) {
        const nodeState = nodeStates[nodeId];
        const node = nodes.find(n => n.id === nodeId);
        
        if (node && nodeState) {
          // Set node to running
          setNodeExecutionStates(prev => ({
            ...prev,
            [nodeId]: { status: 'running', startTime: Date.now() }
          }));
          
          setNodes((nds) =>
            nds.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      executionState: {
                        status: 'running',
                        output: 'Executing...',
                        timestamp: new Date().toISOString()
                      }
                    }
                  }
                : n
            )
          );
          
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Set node to completed/error
          setNodeExecutionStates(prev => ({
            ...prev,
            [nodeId]: { 
              status: nodeState.status,
              output: nodeState.output,
              error: nodeState.error,
              endTime: Date.now()
            }
          }));
          
          setNodes((nds) =>
            nds.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      executionState: {
                        status: nodeState.status,
                        output: nodeState.output,
                        error: nodeState.error,
                        timestamp: nodeState.timestamp
                      }
                    }
                  }
                : n
            )
          );
          
          // Add to execution history
          const nodeExecution = {
            id: Date.now() + Math.random(),
            nodeType: node.data.type,
            nodeName: node.data.label,
            status: nodeState.status,
            startTime: new Date(),
            endTime: new Date(),
            source: 'chat',
            output: typeof nodeState.output === 'string' ? nodeState.output : JSON.stringify(nodeState.output, null, 2),
            duration: 100
          };
          
          setExecutionHistory(prev => [nodeExecution, ...prev.slice(0, 49)]);
        }
      }
    }
    
    // Only return response if respond-to-chat node exists
    if (hasRespondNode) {
      const respondNode = nodes.find(node => node.data.type === 'respond-to-chat');
      console.log('🔍 Respond node:', respondNode);
      
      if (respondNode && result.execution?.node_states?.[respondNode.id]?.output) {
        const output = result.execution.node_states[respondNode.id].output;
        console.log('🔍 Respond node output:', output);
        
        const response = typeof output === 'string' ? output : 
                         output?.response || output?.text || 
                         output?.main?.text || output?.main?.response ||
                         JSON.stringify(output);
        
        console.log('🔍 Extracted response:', response);
        showToast('✅ Chat response generated', 'success', 2000);
        return { response };
      }
      
      // Try AI Agent if respond node didn't work
      const aiAgentNode = nodes.find(node => node.data.type === 'ai-agent');
      if (aiAgentNode && result.execution?.node_states?.[aiAgentNode.id]?.output) {
        const output = result.execution.node_states[aiAgentNode.id].output;
        const response = typeof output === 'string' ? output : 
                         output?.response || output?.text || 
                         output?.main?.text || output?.main?.response ||
                         JSON.stringify(output);
        showToast('✅ AI response generated', 'success', 2000);
        return { response };
      }
    } else {
      // No respond node - workflow executed but no chat response
      showToast('✅ Workflow executed. Add "Respond to Chat" node to see response in chat.', 'info', 4000);
      console.log('ℹ️ No respond-to-chat node found. Workflow executed without chat response.');
      return { response: null }; // Don't add message to chat
    }
    
    showToast('⚠️ Workflow executed but no response generated', 'warning', 3000);
    return { response: null };
  }, [nodes, edges, currentWorkflowId, loadNodesWithProperties, showToast]);

  const handleChatClick = useCallback((nodeId) => {
    setChatOpen(true);
  }, []);

  const duplicateNode = useCallback((nodeId) => {
    const nodeToDuplicate = nodes.find(n => n.id === nodeId);
    if (!nodeToDuplicate) return;

    const newNodeId = `node_${++nodeIdCounter.current}`;
    
    // Duplicate properties in localStorage
    try {
      const savedInputs = localStorage.getItem(`inputValues_${nodeId}`);
      if (savedInputs) {
        localStorage.setItem(`inputValues_${newNodeId}`, savedInputs);
        console.log(`📋 Duplicated properties from ${nodeId} to ${newNodeId}`);
      }
    } catch (error) {
      console.error('Error duplicating localStorage:', error);
    }

    const newNode = {
      ...nodeToDuplicate,
      id: newNodeId,
      position: { 
        x: nodeToDuplicate.position.x + 50,
        y: nodeToDuplicate.position.y + 50
      },
      data: {
        ...nodeToDuplicate.data,
        label: `${nodeToDuplicate.data.label} (Copy)`,
        onSettingsClick: undefined,
        onExecutionClick: handleExecutionClick,
        onDelete: deleteNode,
        onDuplicate: duplicateNode,
        onChatClick: handleChatClick,
        onTrackExecution: handleChatExecution
      }
    };

    setNodes((nds) => [...nds, newNode]);
  }, [nodes, handleExecutionClick, deleteNode, handleChatExecution]);

  const handleClearHistory = useCallback(() => {
    setExecutionHistory([]);
    try {
      localStorage.removeItem('executionHistory');
      showToast('🗑️ Execution history cleared', 'info', 2000);
    } catch (error) {
      console.error('Error clearing execution history:', error);
    }
  }, [showToast]);

  // Check if a trigger node of the same type already exists
  const hasExistingTrigger = useCallback((nodeType) => {
    const nodeDef = nodeTypeDefinitions[nodeType];
    if (nodeDef?.nodeType !== 'trigger') return false;
    
    return nodes.some(node => {
      const existingNodeDef = nodeTypeDefinitions[node.data.type];
      return existingNodeDef?.nodeType === 'trigger' && node.data.type === nodeType;
    });
  }, [nodes]);


  // Subscribe to execution updates
  useEffect(() => {
    const unsubscribe = executionEngine.subscribe((executionState) => {
      setExecution(executionState);
      
      // Update node states based on execution
      if (executionState?.nodeStates) {
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            data: {
              ...node.data,
              executionState: executionState.nodeStates[node.id],
              onSettingsClick: undefined,
              onExecutionClick: handleExecutionClick,
              onDelete: deleteNode,
              onDuplicate: duplicateNode,
              onChatClick: handleChatClick
            }
          }))
        );
      }

      // Track execution state
      if (executionState.isExecuting !== undefined) {
        setIsExecuting(executionState.isExecuting);
      }

      if (executionState.currentExecution) {
        setCurrentExecution(executionState.currentExecution);
      }

      // Add to execution history when execution completes
      if (executionState.completedExecution) {
        const newExecution = {
          ...executionState.completedExecution,
          id: Date.now(),
          timestamp: new Date()
        };
        
        setExecutionHistory(prev => [newExecution, ...prev.slice(0, 49)]); // Keep last 50 executions
      }
    });

    return unsubscribe;
  }, [handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution]);

  // Undo function - defined after all handlers
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const previousState = historyRef.current[historyIndexRef.current];
      
      if (previousState) {
        const restoredNodes = previousState.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onSettingsClick: undefined,
            onExecutionClick: handleExecutionClick,
            onDelete: deleteNode,
            onDuplicate: duplicateNode,
            onChatClick: handleChatClick,
            onTrackExecution: handleChatExecution
          }
        }));
        
        setNodes(restoredNodes);
        setEdges(previousState.edges);
        showToast('↶ Undone', 'info', 1500);
      }
    }
  }, [handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution, showToast]);
  
  // Redo function - defined after all handlers
  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const nextState = historyRef.current[historyIndexRef.current];
      
      if (nextState) {
        const restoredNodes = nextState.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onSettingsClick: undefined,
            onExecutionClick: handleExecutionClick,
            onDelete: deleteNode,
            onDuplicate: duplicateNode,
            onChatClick: handleChatClick,
            onTrackExecution: handleChatExecution
          }
        }));
        
        setNodes(restoredNodes);
        setEdges(nextState.edges);
        showToast('↷ Redone', 'info', 1500);
      }
    }
  }, [handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution, showToast]);

  // Update all handlers ref when they're all defined
  useEffect(() => {
    handlersRef.current.handleExecutionClick = handleExecutionClick;
    handlersRef.current.deleteNode = deleteNode;
    handlersRef.current.duplicateNode = duplicateNode;
    handlersRef.current.handleChatClick = handleChatClick;
    handlersRef.current.handleChatExecution = handleChatExecution;
  }, [handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution]);
  
  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
      if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
  
  // Initialize history with current state (only once on mount)
  useEffect(() => {
    if (historyRef.current.length === 0) {
      saveToHistory(nodes, edges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Ensure all nodes have the required handlers
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onExecutionClick: handleExecutionClick,
          onDelete: deleteNode,
          onDuplicate: duplicateNode,
          onChatClick: handleChatClick,
          onTrackExecution: handleChatExecution
        }
      }))
    );
  }, [handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution]);

  // Validate node IDs for duplicates (development only - logging)
  useEffect(() => {
    if (nodes.length === 0) return;

    // Check for duplicate IDs
    const idCounts = new Map();
    nodes.forEach(node => {
      if (node.id) {
        idCounts.set(node.id, (idCounts.get(node.id) || 0) + 1);
      }
    });

    const duplicates = Array.from(idCounts.entries()).filter(([_, count]) => count > 1);
    
    if (duplicates.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Found duplicate node IDs (this should be fixed automatically):', duplicates.map(([id]) => id));
      console.warn('⚠️ This may cause React key warnings. Duplicates should be fixed on load/import.');
    }
  }, [nodes.length]); // Only check when node count changes

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const nodeData = event.dataTransfer.getData('application/reactflow');
      if (!nodeData || !reactFlowInstance) return;

      const { type, label } = JSON.parse(nodeData);
      
      // Check for duplicate trigger nodes
      if (hasExistingTrigger(type)) {
        const nodeDef = nodeTypeDefinitions[type];
        alert(`❌ Duplicate Trigger Node!\n\nOnly one '${nodeDef?.name || label}' node is allowed in a workflow.\n\nPlease remove the existing trigger node first before adding a new one.`);
        return;
      }

      // Save current state to history before adding node
      saveToHistory(nodes, edges);

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `node_${++nodeIdCounter.current}`,
        type: type,
        position,
        data: {
          label: label,
          type: type,
          properties: {},
          onSettingsClick: undefined,
          onExecutionClick: handleExecutionClick,
          onDelete: deleteNode,
          onDuplicate: duplicateNode,
          onChatClick: handleChatClick
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [nodes, edges, reactFlowInstance, handleExecutionClick, deleteNode, duplicateNode, handleChatClick, hasExistingTrigger, saveToHistory]
  );

  const addNodeFromLibrary = useCallback((nodeType, nodeDef) => {
    // Check for duplicate trigger nodes
    if (hasExistingTrigger(nodeType)) {
      alert(`❌ Duplicate Trigger Node!\n\nOnly one '${nodeDef.name}' node is allowed in a workflow.\n\nPlease remove the existing trigger node first before adding a new one.`);
      return;
    }

    // Save current state to history before adding
    saveToHistory(nodes, edges);

    const newNode = {
      id: `node_${++nodeIdCounter.current}`,
      type: nodeType,
      position: { x: 250, y: 100 + nodes.length * 80 },
      data: {
        label: nodeDef.name,
        type: nodeType,
        properties: {},
        onSettingsClick: undefined,
        onExecutionClick: handleExecutionClick,
        onDelete: deleteNode,
        onDuplicate: duplicateNode,
        onChatClick: handleChatClick,
        onTrackExecution: handleChatExecution
      },
    };

    setNodes((nds) => nds.concat(newNode));
  }, [nodes, edges, handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution, hasExistingTrigger, saveToHistory]);

  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
    
    // Update selected node in modal as well
    if (selectedNodeForModal?.id === nodeId) {
      setSelectedNodeForModal(prev => {
        if (!prev) return null;
        return {
          ...prev,
          data: { ...prev.data, ...newData }
        };
      });
    }
  }, [selectedNodeForModal]);

  const deleteSelectedNode = useCallback(() => {
    if (selectedNodeForModal) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNodeForModal.id));
      setEdges((eds) => eds.filter(
        (edge) => edge.source !== selectedNodeForModal.id && edge.target !== selectedNodeForModal.id
      ));
      setSelectedNodeForModal(null);
      setNodeSettingsModalOpen(false);
    }
  }, [selectedNodeForModal]);

  const executeWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      showToast('Add some nodes to the workflow first!', 'warning');
      return;
    }

    // Find trigger node (manual trigger or webhook)
    const manualTrigger = nodes.find(node => node.data.type === 'manual-trigger');
    const webhookTrigger = nodes.find(node => node.data.type === 'webhook');
    
    if (!manualTrigger && !webhookTrigger) {
      showToast('No trigger found! Add a manual trigger or webhook trigger to execute the workflow.', 'warning');
      return;
    }
    
    // Determine trigger type and prepare trigger data
    let triggerData = { text: 'Manual trigger execution' };
    const triggerNode = manualTrigger || webhookTrigger;
    
    if (webhookTrigger) {
      // Load webhook trigger properties
      const savedInputs = localStorage.getItem(`inputValues_${webhookTrigger.id}`);
      const properties = savedInputs ? JSON.parse(savedInputs) : (webhookTrigger.data.properties || {});
      
      // Parse test JSON if provided
      let testBody = {};
      if (properties.test_json && properties.test_json.trim()) {
        try {
          testBody = JSON.parse(properties.test_json);
          console.log('✅ Using test JSON from webhook trigger:', testBody);
        } catch (e) {
          console.error('❌ Invalid test JSON:', e);
          showToast('Invalid JSON in test field. Please check the format.', 'error', 3000);
          return;
        }
      } else {
        // Default test data if no JSON provided
        testBody = {
          name: 'Test User',
          message: 'Hello from workflow test',
          timestamp: new Date().toISOString()
        };
      }
      
      // Prepare webhook trigger data
      triggerData = {
        method: 'POST',
        path: properties.path || '/webhook',
        headers: {},
        body: testBody,
        query_params: {},
        timestamp: Date.now() / 1000
      };
      
      console.log('🚀 Executing workflow with webhook trigger data:', triggerData);
    } else if (manualTrigger) {
      // Use manual trigger message if provided
      const savedInputs = localStorage.getItem(`inputValues_${manualTrigger.id}`);
      const properties = savedInputs ? JSON.parse(savedInputs) : (manualTrigger.data.properties || {});
      if (properties.message) {
        triggerData = { text: properties.message, message: properties.message };
      }
    }

    // Validate all nodes before execution
    const invalidNodes = [];
    for (const node of nodes) {
      try {
        const savedInputs = localStorage.getItem(`inputValues_${node.id}`);
        const properties = savedInputs ? JSON.parse(savedInputs) : (node.data.properties || {});
        const nodeTypeDef = nodeTypeDefinitions[node.data.type];
        
        // Check required properties
        if (nodeTypeDef?.properties) {
          const requiredProps = Object.entries(nodeTypeDef.properties)
            .filter(([key, prop]) => prop.required);
          
          for (const [key, prop] of requiredProps) {
            // Special case for AI Agent: if System Message (prompt) has content, don't show error
            if (node.data.type === 'ai-agent' && key === 'prompt' && properties[key] && properties[key].trim() !== '') {
              continue; // Skip validation if prompt has content
            }
            
            if (!properties[key] || properties[key] === '') {
              invalidNodes.push({ id: node.id, label: node.data.label, error: `Missing: ${prop.label}` });
              break;
            }
          }
        }
        
        // Check API keys
        if (node.data.type?.includes('groq') || node.data.type?.includes('gpt') || node.data.type?.includes('claude')) {
          const apiKey = properties.api_key;
          if (!apiKey || apiKey.length < 10) {
            invalidNodes.push({ id: node.id, label: node.data.label, error: 'API key required' });
          }
        }
      } catch (error) {
        invalidNodes.push({ id: node.id, label: node.data.label, error: 'Configuration error' });
      }
    }
    
    if (invalidNodes.length > 0) {
      const errorList = invalidNodes.map(n => `• ${n.label}: ${n.error}`).join('\n');
      showToast(`Cannot execute. Fix these issues:\n${errorList}`, 'error', 8000);
      return;
    }

    // Clear previous execution states
    setNodeExecutionStates({});
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: { ...node.data, executionState: null }
      }))
    );

    setIsExecuting(true);
    showToast('🚀 Starting workflow execution...', 'info', 3000);

    try {
      // Load all node properties from localStorage
      const enhancedNodes = loadNodesWithProperties(nodes);
      
      console.log('🚀 Executing manual workflow with enhanced nodes:', enhancedNodes.map(n => ({
        id: n.id,
        type: n.data.type,
        properties: Object.keys(n.data.properties || {})
      })));
      
      // Create or update workflow in backend with enhanced nodes
      const workflowData = {
        name: 'Current Workflow',
        description: 'Workflow execution',
        nodes: enhancedNodes.map(node => ({
          id: node.id,
          type: node.data.type,
          data: {
            type: node.data.type,
            label: node.data.label,
            properties: node.data.properties || {}
          },
          position: node.position
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle || 'main',
          targetHandle: edge.targetHandle || 'main'
        }))
      };

      let workflowId = currentWorkflowId;
      
      if (!workflowId) {
        // Create new workflow
        const createdWorkflow = await workflowApi.createWorkflow(workflowData);
        workflowId = createdWorkflow.id;
        setCurrentWorkflowId(workflowId);
      } else {
        // Update existing workflow
        await workflowApi.updateWorkflow(workflowId, workflowData);
      }

      // Execute workflow with real-time updates
      const executionStartTime = Date.now();
      
      try {
        const response = await fetch(`/api/workflows/${workflowId}/execute/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trigger_data: triggerData,
            credentials: {}
          })
        });

        if (!response.ok) {
          throw new Error(`Execution failed: ${response.status}`);
        }

        const result = await response.json();
        
        // Process node states with animations
        if (result.execution && result.execution.node_states) {
          const nodeStates = result.execution.node_states;
          
          // Load existing execution data and merge with new data
          const existingDataStr = localStorage.getItem('workflow_execution_data');
          const existingData = existingDataStr ? JSON.parse(existingDataStr) : null;
          let executionData = existingData || {
            workflow_id: workflowId || currentWorkflowId || 'local',
            execution_id: result.execution_id || Date.now().toString(),
            node_states: {},
            node_results: {},
            execution_order: [],
            timestamp: new Date().toISOString()
          };
          
          const existingNodeCount = Object.keys(executionData.node_states || {}).length;
          
          // Merge node_states - preserve existing data, only update newly executed nodes
          executionData.node_states = {
            ...executionData.node_states,
            ...nodeStates
          };
          
          // Merge node_results if available
          if (result.execution?.node_results) {
            executionData.node_results = {
              ...(executionData.node_results || {}),
              ...result.execution.node_results
            };
          }
          
          // Merge execution_order - keep unique node IDs
          const newExecutionOrder = result.execution.execution_order || Object.keys(nodeStates);
          const combinedOrder = [...new Set([...executionData.execution_order, ...newExecutionOrder])];
          executionData.execution_order = combinedOrder;
          
          executionData.workflow_id = workflowId || currentWorkflowId || executionData.workflow_id || 'local';
          executionData.execution_id = result.execution_id || executionData.execution_id || Date.now().toString();
          executionData.timestamp = new Date().toISOString();
          
          try {
            localStorage.setItem('workflow_execution_data', JSON.stringify(executionData));
            console.log('💾 Stored execution data in localStorage (manual trigger) - merged:', {
              existing_nodes: existingNodeCount,
              new_nodes: Object.keys(nodeStates).length,
              total_nodes: Object.keys(executionData.node_states).length,
              workflow_id: executionData.workflow_id,
              execution_order: executionData.execution_order
            });
            // Dispatch custom event to notify VariablesPanel and NodeSettingsModal
            window.dispatchEvent(new Event('workflowExecutionUpdate'));
          } catch (error) {
            console.error('Error storing execution data:', error);
          }
          
          // First, set all nodes to running state simultaneously
          const executionOrder = result.execution.execution_order || Object.keys(nodeStates);
          const allNodesToUpdate = executionOrder.filter(nodeId => {
            const nodeState = nodeStates[nodeId];
            const node = nodes.find(n => n.id === nodeId);
            return node && nodeState;
          });
          
          // Set all nodes to running at once
          setNodes((nds) =>
            nds.map((n) => {
              if (allNodesToUpdate.includes(n.id)) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    executionState: {
                      status: 'running',
                      output: 'Executing...',
                      timestamp: new Date().toISOString()
                    }
                  }
                };
              }
              return n;
            })
          );
          
          // Update execution states
          allNodesToUpdate.forEach(nodeId => {
            setNodeExecutionStates(prev => ({
              ...prev,
              [nodeId]: { status: 'running', startTime: Date.now() }
            }));
          });
          
          // Wait a bit for running animation
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Now update all nodes to completed/error state with proper output extraction
          // Also check node_results if available (backend returns both node_states and node_results)
          const nodeResults = result.execution?.node_results || {};
          
          console.log('🔄 Updating all nodes with execution results:', {
            nodeStates: Object.keys(nodeStates),
            nodeResults: Object.keys(nodeResults),
            executionOrder: executionOrder
          });
          
          setNodes((nds) =>
            nds.map((n) => {
              const nodeState = nodeStates[n.id];
              const nodeResult = nodeResults[n.id];
              
              if (nodeState && allNodesToUpdate.includes(n.id)) {
                // Extract output properly based on node type
                // Priority: nodeState.output > nodeResult > nodeState
                let outputToFormat = nodeState.output || nodeResult || nodeState;
                let formattedOutput = outputToFormat;
                
                console.log(`📊 Processing node ${n.id} (${n.data.type}):`, {
                  hasNodeState: !!nodeState,
                  hasNodeResult: !!nodeResult,
                  nodeStateOutput: nodeState.output ? typeof nodeState.output : 'none',
                  nodeResultType: nodeResult ? typeof nodeResult : 'none'
                });
                
                // For readme-viewer and other output nodes, extract content from nested structure
                if (n.data.type === 'readme-viewer' && outputToFormat) {
                  if (typeof outputToFormat === 'object') {
                    // Try to get content from main.content or main.text
                    if (outputToFormat.main) {
                      formattedOutput = outputToFormat.main.content || 
                                       outputToFormat.main.text || 
                                       JSON.stringify(outputToFormat.main, null, 2);
                    } else if (outputToFormat.content) {
                      formattedOutput = outputToFormat.content;
                    } else if (outputToFormat.text) {
                      formattedOutput = outputToFormat.text;
                    } else {
                      formattedOutput = JSON.stringify(outputToFormat, null, 2);
                    }
                  }
                } else if (typeof outputToFormat === 'object' && outputToFormat !== null) {
                  // For other nodes, try to extract meaningful output
                  if (outputToFormat.main) {
                    if (typeof outputToFormat.main === 'string') {
                      formattedOutput = outputToFormat.main;
                    } else if (outputToFormat.main.content) {
                      formattedOutput = outputToFormat.main.content;
                    } else if (outputToFormat.main.text) {
                      formattedOutput = outputToFormat.main.text;
                    } else {
                      formattedOutput = JSON.stringify(outputToFormat.main, null, 2);
                    }
                  } else if (outputToFormat.content) {
                    formattedOutput = outputToFormat.content;
                  } else if (outputToFormat.text) {
                    formattedOutput = outputToFormat.text;
                  } else {
                    formattedOutput = JSON.stringify(outputToFormat, null, 2);
                  }
                }
                
                return {
                  ...n,
                  data: {
                    ...n.data,
                    executionState: {
                      status: nodeState.status,
                      output: formattedOutput,
                      error: nodeState.error,
                      timestamp: nodeState.timestamp || new Date().toISOString(),
                      startTime: new Date(),
                      endTime: new Date()
                    }
                  }
                };
              }
              return n;
            })
          );
          
          // Update execution states to completed
          allNodesToUpdate.forEach(nodeId => {
            const nodeState = nodeStates[nodeId];
            setNodeExecutionStates(prev => ({
              ...prev,
              [nodeId]: { 
                status: nodeState.status,
                output: nodeState.output,
                error: nodeState.error,
                endTime: Date.now()
              }
            }));
          });
          
          // Add all nodes to execution history
          allNodesToUpdate.forEach(nodeId => {
            const nodeState = nodeStates[nodeId];
            const node = nodes.find(n => n.id === nodeId);
            if (node && nodeState) {
              // Use nodeResult if available, otherwise nodeState.output
              const nodeResult = nodeResults[nodeId];
              const outputToLog = nodeResult || nodeState.output;
              
              let outputStr = '';
              if (node.data.type === 'readme-viewer' && outputToLog) {
                if (typeof outputToLog === 'object' && outputToLog.main) {
                  outputStr = outputToLog.main.content || 
                             outputToLog.main.text || 
                             JSON.stringify(outputToLog.main, null, 2);
                } else {
                  outputStr = typeof outputToLog === 'string' ? outputToLog : JSON.stringify(outputToLog, null, 2);
                }
              } else {
                outputStr = typeof outputToLog === 'string' ? outputToLog : JSON.stringify(outputToLog, null, 2);
              }
              
              const nodeExecution = {
                id: Date.now() + Math.random() + nodeId,
                nodeType: node.data.type,
                nodeName: node.data.label,
                status: nodeState.status,
                startTime: new Date(),
                endTime: new Date(),
                source: 'workflow',
                output: outputStr,
                duration: 100
              };
              
              setExecutionHistory(prev => [nodeExecution, ...prev.slice(0, 49)]);
            }
          });
          
          // Show toast for workflow completion
          const completedNodes = allNodesToUpdate.filter(id => nodeStates[id]?.status === 'completed').length;
          const errorNodes = allNodesToUpdate.filter(id => nodeStates[id]?.status === 'error').length;
          if (completedNodes > 0) {
            showToast(`✅ ${completedNodes} node(s) completed successfully`, 'success', 3000);
          }
          if (errorNodes > 0) {
            showToast(`❌ ${errorNodes} node(s) failed`, 'error', 4000);
          }
        }

        const executionDuration = Date.now() - executionStartTime;
        
        // Show final result
        if (result.status === 'completed') {
          showToast(`✅ Workflow completed successfully in ${(executionDuration / 1000).toFixed(1)}s`, 'success', 4000);
        } else if (result.status === 'error') {
          showToast(`❌ Workflow failed: ${result.error || 'Unknown error'}`, 'error', 5000);
        }
        
        setExecutionResult(result);

      } catch (error) {
        showToast(`❌ Execution failed: ${error.message}`, 'error', 5000);
        throw error;
      }

    } catch (error) {
      console.error('Workflow execution failed:', error);
      showToast(`Execution failed: ${error.message}`, 'error');
    } finally {
      setIsExecuting(false);
      setNodeExecutionStates({});
    }
  }, [nodes, edges, currentWorkflowId, loadNodesWithProperties, showToast]);

  const stopExecution = useCallback(() => {
    executionEngine.stopExecution();
  }, []);

  const clearWorkflow = useCallback(() => {
    if (confirm('Are you sure you want to clear the entire workflow?')) {
      // Clean up localStorage for all nodes
      nodes.forEach(node => {
        try {
          localStorage.removeItem(`inputValues_${node.id}`);
        } catch (error) {
          console.error(`Error cleaning up localStorage for node ${node.id}:`, error);
        }
      });
      console.log(`🗑️ Cleaned up localStorage for ${nodes.length} nodes`);
      
      setNodes([]);
      setEdges([]);
      setSelectedNodeForSettings(null);
      setCurrentWorkflowId(null);
    }
  }, [nodes]);

  const handleExport = useCallback(async (exportType) => {
    if (nodes.length === 0) {
      showToast('No workflow to export! Add some nodes first.', 'warning');
      return;
    }

    // Load all properties from localStorage before exporting
    const enhancedNodes = loadNodesWithProperties(nodes);
    
    const workflow = {
      nodes: enhancedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          // Remove function references but keep properties
          onSettingsClick: undefined,
          onExecutionClick: undefined,
          onDelete: undefined,
          onDuplicate: undefined,
          onChatClick: undefined,
          onTrackExecution: undefined
        }
      })),
      edges,
      version: '1.0.0',
      savedAt: new Date().toISOString()
    };
    
    if (exportType === 'with-credentials') {
      // Export with all credentials and sensitive data
      console.log('💾 Exporting workflow with credentials:', workflow.nodes.map(n => ({
      id: n.id,
      type: n.data.type,
      properties: Object.keys(n.data.properties || {})
    })));
    
    const dataStr = JSON.stringify(workflow, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
      const exportFileDefaultName = `workflow_with_credentials_${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
      
      showToast('✅ Workflow exported with credentials', 'success');
    } else if (exportType === 'without-credentials') {
      // Export without credentials - remove sensitive data
      const sanitizedWorkflow = {
        ...workflow,
        nodes: workflow.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            properties: Object.fromEntries(
              Object.entries(node.data.properties || {}).filter(([key, value]) => {
                // Remove API keys and sensitive data
                const sensitiveKeys = ['api_key', 'apiKey', 'secret', 'password', 'token'];
                return !sensitiveKeys.some(sensitive => 
                  key.toLowerCase().includes(sensitive.toLowerCase())
                );
              })
            )
          }
        }))
      };
      
      console.log('💾 Exporting workflow without credentials:', sanitizedWorkflow.nodes.map(n => ({
        id: n.id,
        type: n.data.type,
        properties: Object.keys(n.data.properties || {})
      })));
      
      const dataStr = JSON.stringify(sanitizedWorkflow, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `workflow_safe_${Date.now()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showToast('✅ Workflow exported without credentials (safe for sharing)', 'success');
    } else if (exportType === 'save-to-server') {
      // Save to exported workflows database
      try {
        const workflowData = {
          name: 'Exported Workflow',
          description: 'Workflow exported from frontend',
          version: '1.0.0',
          export_type: 'template',
          nodes: workflow.nodes.map(node => ({
            id: node.id,
            type: node.data.type,
            data: {
              type: node.data.type,
              label: node.data.label,
              properties: node.data.properties || {}
            },
            position: node.position
          })),
          edges: workflow.edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle || 'main',
            targetHandle: edge.targetHandle || 'main'
          })),
          tags: ['exported', 'frontend'],
          category: 'General',
          author: 'User',
          is_public: false,
          is_featured: false
        };

        const response = await fetch('/api/export-workflow/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflowData)
        });

        if (!response.ok) {
          throw new Error(`Failed to save exported workflow: ${response.status}`);
        }

        const savedWorkflow = await response.json();
        showToast(`✅ Workflow exported to database (ID: ${savedWorkflow.id})`, 'success');
      } catch (error) {
        console.error('Failed to save exported workflow:', error);
        showToast(`❌ Failed to save to database: ${error.message}`, 'error');
        throw error;
      }
    }
  }, [nodes, edges, loadNodesWithProperties, showToast]);

  const saveWorkflow = useCallback(() => {
    try {
      // Load all properties from localStorage before saving
      const enhancedNodes = loadNodesWithProperties(nodes);
      
      const workflowToSave = {
        nodes: enhancedNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            // Remove function references
            onSettingsClick: undefined,
            onExecutionClick: undefined,
            onDelete: undefined,
            onDuplicate: undefined,
            onChatClick: undefined,
            onTrackExecution: undefined
          }
        })),
        edges: edges,
        version: '1.0.0',
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem('savedWorkflow', JSON.stringify(workflowToSave));
      localStorage.setItem('workflowName', workflowName);
      setIsSaved(true);
      showToast('✅ Workflow saved successfully!', 'success', 2000);
      console.log('💾 Saved workflow to localStorage');
    } catch (error) {
      console.error('Error saving workflow:', error);
      showToast('❌ Failed to save workflow', 'error', 3000);
    }
  }, [nodes, edges, workflowName, loadNodesWithProperties, showToast]);

  const handleImport = useCallback(async (importType, data) => {
    try {
      if (importType === 'local') {
        // Import from local JSON file
        const { nodes: importedNodes, edges: importedEdges } = data;
        
        if (!importedNodes || !Array.isArray(importedNodes)) {
          throw new Error('Invalid workflow file format');
        }

        // Clear current workflow
        setNodes([]);
        setEdges([]);
        setSelectedNodeForSettings(null);
        setCurrentWorkflowId(null);

        // Process imported nodes
        const processedNodes = importedNodes.map(node => {
          return {
            ...node,
            data: {
              ...node.data,
              onSettingsClick: undefined,
              onExecutionClick: handleExecutionClick,
              onDelete: deleteNode,
              onDuplicate: duplicateNode,
              onChatClick: handleChatClick,
              onTrackExecution: handleChatExecution
            }
          };
        });

        // Ensure unique node IDs and update edges accordingly
        const { nodes: uniqueNodes, edges: updatedEdges, idMap } = ensureUniqueNodeIds(processedNodes, importedEdges || []);
        
        // Update localStorage keys for properties if IDs changed
        uniqueNodes.forEach((node, index) => {
          const originalNode = processedNodes[index];
          if (originalNode && originalNode.id !== node.id && originalNode.data?.properties) {
            // Move properties to new ID
            try {
              const oldKey = `inputValues_${originalNode.id}`;
              const newKey = `inputValues_${node.id}`;
              const oldProperties = localStorage.getItem(oldKey);
              if (oldProperties) {
                localStorage.setItem(newKey, oldProperties);
                localStorage.removeItem(oldKey);
              }
              // Also check if properties are in node.data
              if (originalNode.data.properties && Object.keys(originalNode.data.properties).length > 0) {
                localStorage.setItem(newKey, JSON.stringify(originalNode.data.properties));
              }
            } catch (error) {
              console.error(`Error updating localStorage for node ${originalNode.id} -> ${node.id}:`, error);
            }
          } else if (node.data?.properties && Object.keys(node.data.properties).length > 0) {
            // Save properties with current ID
            try {
              localStorage.setItem(`inputValues_${node.id}`, JSON.stringify(node.data.properties));
              console.log(`📥 Restored properties for node ${node.id}:`, Object.keys(node.data.properties));
            } catch (error) {
              console.error(`Error saving to localStorage for node ${node.id}:`, error);
            }
          }
        });

        // Update edge IDs to include sourceHandle and targetHandle
        const finalEdges = updatedEdges.map(edge => ({
          ...edge,
          id: edge.id || `e${edge.source}-${edge.target}-${edge.sourceHandle || 'main'}-${edge.targetHandle || 'main'}`,
          sourceHandle: edge.sourceHandle || 'main',
          targetHandle: edge.targetHandle || 'main'
        }));

        setNodes(uniqueNodes);
        setEdges(finalEdges);
        
        showToast('✅ Workflow imported successfully!', 'success');
        console.log('📂 Imported workflow:', {
          nodes: uniqueNodes.length,
          edges: finalEdges.length,
          properties: uniqueNodes.map(n => Object.keys(n.data.properties || {}))
        });

      } else if (importType === 'server') {
        // Import from exported workflow
        console.log('🔍 Server workflow data structure:', data);
        
        // Handle both old server workflow format and new exported workflow format
        let serverNodes, serverEdges;
        
        if (data.nodes && data.edges) {
          // New exported workflow format
          serverNodes = data.nodes;
          serverEdges = data.edges;
          console.log('✅ Using new exported workflow format');
        } else if (data.workflow && data.workflow.nodes && data.workflow.edges) {
          // Nested workflow format
          serverNodes = data.workflow.nodes;
          serverEdges = data.workflow.edges;
          console.log('✅ Using nested workflow format');
        } else {
          console.error('❌ Invalid server workflow format - data structure:', Object.keys(data));
          throw new Error('Invalid server workflow format - missing nodes or edges');
        }
        
        if (!serverNodes || !Array.isArray(serverNodes)) {
          console.error('❌ Invalid server workflow format - nodes:', serverNodes);
          throw new Error('Invalid server workflow format - nodes must be an array');
        }

        // Clear current workflow
        setNodes([]);
        setEdges([]);
        setSelectedNodeForSettings(null);
        setCurrentWorkflowId(null);

        // Process server nodes
        const processedNodes = serverNodes.map(node => {
          // Ensure node has required structure
          if (!node.data) {
            console.warn(`⚠️ Node ${node.id} missing data property, creating default`);
            node.data = { type: 'unknown', label: 'Unknown Node', properties: {} };
          }

          return {
            ...node,
            data: {
              ...node.data,
              onSettingsClick: undefined,
              onExecutionClick: handleExecutionClick,
              onDelete: deleteNode,
              onDuplicate: duplicateNode,
              onChatClick: handleChatClick,
              onTrackExecution: handleChatExecution
            }
          };
        });

        // Ensure unique node IDs and update edges accordingly
        const { nodes: uniqueNodes, edges: updatedEdges, idMap } = ensureUniqueNodeIds(processedNodes, serverEdges || []);
        
        // Update localStorage keys for properties if IDs changed
        uniqueNodes.forEach((node, index) => {
          const originalNode = processedNodes[index];
          if (originalNode && originalNode.id !== node.id && originalNode.data?.properties) {
            // Move properties to new ID
            try {
              const oldKey = `inputValues_${originalNode.id}`;
              const newKey = `inputValues_${node.id}`;
              const oldProperties = localStorage.getItem(oldKey);
              if (oldProperties) {
                localStorage.setItem(newKey, oldProperties);
                localStorage.removeItem(oldKey);
              }
              // Also check if properties are in node.data
              if (originalNode.data.properties && Object.keys(originalNode.data.properties).length > 0) {
                localStorage.setItem(newKey, JSON.stringify(originalNode.data.properties));
              }
            } catch (error) {
              console.error(`Error updating localStorage for node ${originalNode.id} -> ${node.id}:`, error);
            }
          } else if (node.data?.properties && Object.keys(node.data.properties).length > 0) {
            // Save properties with current ID
            try {
              localStorage.setItem(`inputValues_${node.id}`, JSON.stringify(node.data.properties));
              console.log(`📥 Restored properties for node ${node.id}:`, Object.keys(node.data.properties));
            } catch (error) {
              console.error(`Error saving to localStorage for node ${node.id}:`, error);
            }
          }
        });

        // Update edge IDs to include sourceHandle and targetHandle
        const finalEdges = updatedEdges.map(edge => ({
          ...edge,
          id: edge.id || `e${edge.source}-${edge.target}-${edge.sourceHandle || 'main'}-${edge.targetHandle || 'main'}`,
          sourceHandle: edge.sourceHandle || 'main',
          targetHandle: edge.targetHandle || 'main'
        }));

        setNodes(uniqueNodes);
        setEdges(finalEdges);
        
        showToast('✅ Exported workflow imported successfully!', 'success');
        console.log('📂 Imported exported workflow:', {
          nodes: uniqueNodes.length,
          edges: finalEdges.length,
          properties: uniqueNodes.map(n => Object.keys(n.data.properties || {}))
        });
      }
    } catch (error) {
      console.error('Import failed:', error);
      showToast(`❌ Import failed: ${error.message}`, 'error');
      throw error;
    }
  }, [handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution, showToast]);

  const openImportModal = useCallback(() => {
    setImportModalOpen(true);
  }, []);

  const handleClearWorkspace = useCallback(() => {
    setClearWorkspaceModalOpen(true);
  }, []);

  const confirmClearWorkspace = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setExecutionHistory([]);
    setCurrentExecution(null);
    setExecutionResult(null);
    setSelectedNodeForSettings(null);
    setExecutingNodes(new Set());
    setNodeExecutionStates({});
    setFlowKey(prev => prev + 1); // Force re-render
    setClearWorkspaceModalOpen(false);
    showToast('🗑️ Workspace cleared successfully!', 'success', 3000);
  }, [showToast]);

  const addNotesNode = useCallback(() => {
    // Save current state to history before adding notes node
    saveToHistory(nodes, edges);

    const newNode = {
      id: `node_${++nodeIdCounter.current}`,
      type: 'notes',
      position: { x: 250, y: 100 + nodes.length * 80 },
      data: {
        label: 'Notes',
        type: 'notes',
        content: '# Notes\n\nAdd your notes here...\n\n## Features\n- Markdown support\n- Edit inline\n- Save automatically',
        onSettingsClick: undefined,
        onExecutionClick: handleExecutionClick,
        onDelete: deleteNode,
        onDuplicate: duplicateNode,
        onChatClick: handleChatClick,
        onTrackExecution: handleChatExecution,
        onUpdate: (newData) => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === newNode.id
                ? { ...n, data: { ...n.data, ...newData } }
                : n
            )
          );
        }
      },
    };

    setNodes((nds) => {
      const updatedNodes = [...nds, newNode];
      return updatedNodes;
    });
    setFlowKey(prev => prev + 1); // Force re-render
    showToast('📝 Notes node added! Click to edit content.', 'success', 3000);
  }, [nodes, edges, handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution, showToast, saveToHistory]);

  const loadWorkflow = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const workflow = JSON.parse(event.target.result);
          const processedNodes = (workflow.nodes || []).map(node => {
            return {
              ...node,
              data: {
                ...node.data,
                onSettingsClick: undefined,
                onExecutionClick: handleExecutionClick,
                onDelete: deleteNode,
                onDuplicate: duplicateNode,
                onChatClick: handleChatClick,
                onTrackExecution: handleChatExecution
              }
            };
          });

          // Ensure unique node IDs and update edges accordingly
          const { nodes: uniqueNodes, edges: updatedEdges, idMap } = ensureUniqueNodeIds(processedNodes, workflow.edges || []);
          
          // Update localStorage keys for properties if IDs changed
          uniqueNodes.forEach((node, index) => {
            const originalNode = processedNodes[index];
            if (originalNode && originalNode.id !== node.id && originalNode.data?.properties) {
              // Move properties to new ID
              try {
                const oldKey = `inputValues_${originalNode.id}`;
                const newKey = `inputValues_${node.id}`;
                const oldProperties = localStorage.getItem(oldKey);
                if (oldProperties) {
                  localStorage.setItem(newKey, oldProperties);
                  localStorage.removeItem(oldKey);
                }
                // Also check if properties are in node.data
                if (originalNode.data.properties && Object.keys(originalNode.data.properties).length > 0) {
                  localStorage.setItem(newKey, JSON.stringify(originalNode.data.properties));
                }
              } catch (error) {
                console.error(`Error updating localStorage for node ${originalNode.id} -> ${node.id}:`, error);
              }
            } else if (node.data?.properties && Object.keys(node.data.properties).length > 0) {
              // Save properties with current ID
              try {
                localStorage.setItem(`inputValues_${node.id}`, JSON.stringify(node.data.properties));
                console.log(`📥 Restored properties for node ${node.id}:`, Object.keys(node.data.properties));
              } catch (error) {
                console.error(`Error saving to localStorage for node ${node.id}:`, error);
              }
            }
          });
          
          setNodes(uniqueNodes);
          setEdges(updatedEdges);
          setSelectedNodeForSettings(null);
          
          console.log('📂 Loaded workflow with properties:', uniqueNodes.map(n => ({
            id: n.id,
            type: n.data.type,
            properties: Object.keys(n.data.properties || {})
          })));
        } catch (error) {
          alert('Failed to load workflow: ' + error.message);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }, [handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution]);

  return (
    <div className={`app ${logsExpanded ? 'logs-expanded' : ''} ${aiChatbotOpen ? 'ai-chatbot-open' : ''}`}>
      <NodeLibrary
        onAddNode={addNodeFromLibrary}
        isOpen={libraryOpen}
        onToggle={() => setLibraryOpen(!libraryOpen)}
        nodes={nodes}
        logsExpanded={logsExpanded}
      />

      <div className="main-content" style={{ marginLeft: libraryOpen ? '380px' : '0' }}>
        {/* n8n-style Header */}
        <div className="workflow-header">
          <div className="header-top">
            <div className="header-left">
              <button
                className="header-btn toggle-library"
                onClick={() => setLibraryOpen(!libraryOpen)}
                title="Toggle Node Library"
              >
                <FiMenu />
              </button>
              <div className="workflow-breadcrumb">
                <span className="workflow-owner">Personal</span>
                <span className="breadcrumb-separator">/</span>
                <input
                  type="text"
                  className="workflow-name-input"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  onBlur={saveWorkflow}
                />
              </div>
            </div>

            <div className="header-center">
              <div className="header-tabs" >
                <button
                  className={`header-tab ${activeTab === 'workflow' ? 'active' : ''}`}
                  style={{ backgroundColor: 'black' }}
                  onClick={() => setActiveTab('workflow')}
                >
                  <FiGrid style={{ fontSize: '16px', }} />
                  Workflow Builder
                </button>
                <button
                  className={`header-tab ${activeTab === 'page-builder' ? 'active' : ''}`}
                  style={{ backgroundColor: '#2a2b2b' }}
                  onClick={() => navigateToBuilder('page-builder')}
                >
                  <FiLayout style={{ fontSize: '16px' }} />
                  Page Builder
                </button>
              </div>
            </div>

            <div className="header-right">
              <div className="header-stats">
                <div className="header-stat">
                  <FiGrid />
                  <span>{nodes.length}</span>
                  <span className="stat-label">NODES</span>
                </div>
                <div className="header-stat">
                  <FiLink2 />
                  <span>{edges.length}</span>
                  <span className="stat-label">CONNECTIONS</span>
                </div>
              </div>
              
              {hasManualTrigger && (
                <button
                  className="header-btn primary"
                  onClick={executeWorkflow}
                  disabled={execution?.status === 'running' || nodes.length === 0}
                >
                  <FiPlay /> Execute
                </button>
              )}
              
              {/* Auto-save Toggle - Next to Save button */}
              <button
                className={`header-btn ${autoSaveEnabled ? 'active' : ''}`}
                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                title={autoSaveEnabled ? 'Auto-save: ON' : 'Auto-save: OFF'}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '8px 12px'
                }}
              >
                <FiPower style={{ color: autoSaveEnabled ? '#10b981' : '#6b7280', fontSize: '16px' }} />
                <span style={{ fontSize: '12px', fontWeight: 500 }}>
                  {autoSaveEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
              
              <button
                className="header-btn save-btn"
                onClick={saveWorkflow}
                title="Save workflow"
              >
                <FiSave />
                {isSaved ? 'Saved' : 'Save'}
              </button>
              
              {/* Get Webhook URL Button - Show if workflow has webhook trigger */}
              {nodes.some(n => n.data?.type === 'webhook') && currentWorkflowId && (
                <>
                  <button
                    className="header-btn"
                    onClick={async () => {
                      setWebhookUrlModalOpen(true);
                      setWebhookUrlLoading(true);
                      try {
                        // Get base URL
                        const baseUrlData = await apiService.getBaseUrl();
                        setBaseUrl(baseUrlData.base_url);
                        
                        // Get webhook URL
                        const webhookData = await apiService.getWebhookUrl(currentWorkflowId);
                        if (webhookData.webhook_url) {
                          setWebhookUrl(webhookData);
                        } else {
                          setWebhookUrl(null);
                        }
                      } catch (err) {
                        console.error('Error fetching webhook URL:', err);
                        setWebhookUrl(null);
                      } finally {
                        setWebhookUrlLoading(false);
                      }
                    }}
                    title="Get Webhook URL"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white'
                    }}
                  >
                    <FiLink2 /> Webhook URL
                  </button>
                  
                  {/* Webhook Listener Button */}
                  <button
                    className="header-btn"
                    disabled={!currentWorkflowId}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (!currentWorkflowId) {
                        alert('Please save the workflow first before starting a listener');
                        return;
                      }
                      
                      if (listenerStatus === 'stopped') {
                        // Start listener
                        try {
                          console.log('🚀 Starting webhook listener for workflow:', currentWorkflowId);
                          const result = await apiService.startWebhookListener(currentWorkflowId);
                          console.log('✅ Listener started:', result);
                          setListenerId(result.listener_id);
                          setListenerStatus('running');
                          setListenerPanelOpen(true);
                          setListenerEvents([]);
                          setListenerRequestCount(0);
                          
                          // Small delay before connecting SSE to ensure listener is ready
                          setTimeout(() => {
                            // Subscribe to SSE updates
                            const eventSource = apiService.subscribeToWebhookListener(result.listener_id, (update) => {
                              console.log('📡 Webhook listener update received:', update);
                              
                              if (update.type === 'webhook_request') {
                                console.log('📥 New webhook request received:', update);
                                console.log('   Full update object:', JSON.stringify(update, null, 2));
                                
                                // Show toast notification
                                const toastExecutionStatus = update.execution?.status || update.execution?.execution?.status || 'processing';
                                if (toastExecutionStatus === 'completed') {
                                  showToast('✅ Webhook request processed successfully', 'success', 3000);
                                } else if (toastExecutionStatus === 'error') {
                                  showToast('❌ Webhook request failed', 'error', 4000);
                                } else {
                                  showToast('🔄 Processing webhook request...', 'info', 2000);
                                }
                                
                                // Update listener events and count first
                                setListenerEvents(prev => {
                                  const newEvents = [update, ...prev].slice(0, 50);
                                  console.log('📋 Updated events list, count:', newEvents.length);
                                  return newEvents;
                                });
                                setListenerRequestCount(prev => {
                                  const newCount = prev + 1;
                                  console.log('🔢 Request count updated to:', newCount);
                                  return newCount;
                                });
                                
                                // Get execution data - check both update.execution and update.execution.execution
                                const executionData = update.execution || {};
                                const nodeStates = executionData.node_states || executionData.execution?.node_states || {};
                                const nodeResults = executionData.node_results || executionData.execution?.node_results || {};
                                const executionOrder = executionData.execution_order || executionData.execution?.execution_order || [];
                                const executionStatus = executionData.status || executionData.execution?.status || 'completed';
                                
                                console.log('🔄 SSE: Execution data available, updating nodes immediately');
                                console.log('   Execution node_states keys:', Object.keys(nodeStates));
                                console.log('   Execution node_results keys:', Object.keys(nodeResults));
                                console.log('   Execution status:', executionStatus);
                                console.log('   Execution execution_order:', executionOrder);
                                console.log('   Full node_states:', JSON.stringify(nodeStates, null, 2));
                                
                                // Update nodes with execution results from webhook
                                if (Object.keys(nodeStates).length > 0) {
                                  const nodesToUpdate = Object.keys(nodeStates);
                                  const isAlreadyCompleted = executionStatus === 'completed';
                                  
                                  // If execution is already completed, update directly
                                  // Otherwise, show running animation first
                                  const updateNodesWithResults = () => {
                                    // Use a single setNodes call to update all nodes at once
                                    setNodes((nds) => {
                                      console.log('   SSE: Current nodes in state:', nds.map(n => ({ id: n.id, type: n.data.type })));
                                      console.log('   SSE: Node states to match:', Object.keys(nodeStates));
                                      
                                      const updatedNodes = nds.map((n) => {
                                      const nodeState = nodeStates[n.id];
                                      const nodeResult = nodeResults[n.id];
                                      
                                      if (nodeState) {
                                        console.log(`   ✅ SSE: Found matching node ${n.id} (${n.data.type}):`, {
                                          status: nodeState.status,
                                          has_output: !!nodeState.output,
                                          has_node_result: !!nodeResult,
                                          output_type: nodeState.output ? typeof nodeState.output : 'none',
                                          nodeState_keys: Object.keys(nodeState)
                                        });
                                        
                                        // Extract output for display - priority: nodeState.output > nodeResult > nodeState
                                        let formattedOutput = '';
                                        const outputToFormat = nodeState.output || nodeResult || nodeState;
                                        
                                        if (outputToFormat) {
                                          if (typeof outputToFormat === 'string') {
                                            formattedOutput = outputToFormat;
                                          } else if (outputToFormat.main) {
                                            if (typeof outputToFormat.main === 'string') {
                                              formattedOutput = outputToFormat.main;
                                            } else if (outputToFormat.main.content) {
                                              formattedOutput = outputToFormat.main.content;
                                            } else if (outputToFormat.main.text) {
                                              formattedOutput = outputToFormat.main.text;
                                            } else {
                                              // For webhook trigger, show the full structure
                                              formattedOutput = JSON.stringify(outputToFormat.main, null, 2);
                                            }
                                          } else if (outputToFormat.content) {
                                            formattedOutput = outputToFormat.content;
                                          } else if (outputToFormat.text) {
                                            formattedOutput = outputToFormat.text;
                                          } else {
                                            // For webhook trigger node, show the full output structure
                                            formattedOutput = JSON.stringify(outputToFormat, null, 2);
                                          }
                                        }
                                        
                                        // Special handling for webhook trigger node - show webhook data
                                        if (n.data.type === 'webhook' && outputToFormat && typeof outputToFormat === 'object') {
                                          if (outputToFormat.main && typeof outputToFormat.main === 'object') {
                                            // Show webhook payload in a readable format
                                            const webhookData = outputToFormat.main.data || outputToFormat.main;
                                            if (webhookData && webhookData.body) {
                                              formattedOutput = `Webhook received:\n${JSON.stringify(webhookData.body, null, 2)}`;
                                            } else {
                                              formattedOutput = JSON.stringify(outputToFormat.main, null, 2);
                                            }
                                          }
                                        }
                                        
                                        // Determine status - use nodeState.status if available, otherwise infer from execution status
                                        let nodeStatus = nodeState.status;
                                        if (!nodeStatus) {
                                          nodeStatus = executionStatus === 'completed' ? 'completed' : 
                                                      executionStatus === 'error' ? 'error' : 'running';
                                        }
                                        
                                        // Parse timestamps - handle both milliseconds and ISO strings
                                        let startTime = new Date();
                                        let endTime = new Date();
                                        
                                        if (nodeState.startTime) {
                                          startTime = typeof nodeState.startTime === 'number' 
                                            ? new Date(nodeState.startTime) 
                                            : new Date(nodeState.startTime);
                                        }
                                        
                                        if (nodeState.endTime) {
                                          endTime = typeof nodeState.endTime === 'number' 
                                            ? new Date(nodeState.endTime) 
                                            : new Date(nodeState.endTime);
                                        } else if (executionData.finished_at || executionData.execution?.finished_at) {
                                          const finishedAt = executionData.finished_at || executionData.execution?.finished_at;
                                          endTime = typeof finishedAt === 'string' ? new Date(finishedAt) : new Date(finishedAt);
                                        }
                                        
                                        // Create execution state object
                                        const executionState = {
                                          status: nodeStatus,
                                          output: formattedOutput || outputToFormat || '',
                                          startTime: startTime,
                                          endTime: endTime,
                                          error: nodeState.error || null
                                        };
                                        
                                        console.log(`   ✅ SSE: Updating node ${n.id} with execution state:`, {
                                          status: executionState.status,
                                          hasOutput: !!executionState.output,
                                          outputLength: executionState.output ? executionState.output.length : 0,
                                          startTime: executionState.startTime.toISOString(),
                                          endTime: executionState.endTime.toISOString()
                                        });
                                        
                                        // Return updated node with execution state
                                        return {
                                          ...n,
                                          data: {
                                            ...n.data,
                                            executionState: executionState
                                          }
                                        };
                                      } else {
                                        // Node not in execution - check if it should be cleared
                                        // Only clear if it was previously executing
                                        if (n.data.executionState && n.data.executionState.status === 'running') {
                                          console.log(`   ⚠️ SSE: Node ${n.id} was running but not in execution results - clearing state`);
                                          return {
                                            ...n,
                                            data: {
                                              ...n.data,
                                              executionState: null
                                            }
                                          };
                                        }
                                      }
                                      return n;
                                    });
                                    
                                      console.log('   ✅ SSE: Updated nodes:', updatedNodes.map(n => ({
                                        id: n.id,
                                        hasExecutionState: !!n.data.executionState,
                                        status: n.data.executionState?.status
                                      })));
                                      
                                      return updatedNodes;
                                    });
                                    
                                    // Force React Flow to update by triggering a re-render
                                    setFlowKey(prev => prev + 1);
                                  };
                                  
                                  if (isAlreadyCompleted) {
                                    // Execution already completed - update directly
                                    console.log('   ✅ SSE: Execution already completed, updating nodes directly');
                                    updateNodesWithResults();
                                  } else {
                                    // First, set nodes to running state briefly for animation
                                    console.log('   🎬 SSE: Setting nodes to running state for animation:', nodesToUpdate);
                                    
                                    setNodes((nds) => {
                                      return nds.map((n) => {
                                        if (nodesToUpdate.includes(n.id)) {
                                          return {
                                            ...n,
                                            data: {
                                              ...n.data,
                                              executionState: {
                                                status: 'running',
                                                output: 'Executing...',
                                                startTime: new Date()
                                              }
                                            }
                                          };
                                        }
                                        return n;
                                      });
                                    });
                                    
                                    // Then after a short delay, update with actual results
                                    setTimeout(updateNodesWithResults, 300); // 300ms delay for running animation
                                  }
                                  
                                  // Also update localStorage for README viewer
                                  try {
                                    const existingData = localStorage.getItem('workflow_execution_data');
                                    let executionDataForStorage = existingData ? JSON.parse(existingData) : {
                                      workflow_id: currentWorkflowId,
                                      execution_id: executionData.execution_id || executionData.execution?.execution_id || Date.now().toString(),
                                      node_states: {},
                                      node_results: {},
                                      execution_order: [],
                                      timestamp: new Date().toISOString()
                                    };
                                    
                                    if (nodeStates) {
                                      executionDataForStorage.node_states = {
                                        ...executionDataForStorage.node_states,
                                        ...nodeStates
                                      };
                                    }
                                    
                                    if (nodeResults) {
                                      executionDataForStorage.node_results = {
                                        ...executionDataForStorage.node_results,
                                        ...nodeResults
                                      };
                                    }
                                    
                                    if (executionOrder.length > 0) {
                                      executionDataForStorage.execution_order = [...new Set([...executionDataForStorage.execution_order, ...executionOrder])];
                                    }
                                    
                                    executionDataForStorage.execution_id = executionData.execution_id || executionData.execution?.execution_id || executionDataForStorage.execution_id;
                                    executionDataForStorage.timestamp = new Date().toISOString();
                                    
                                    localStorage.setItem('workflow_execution_data', JSON.stringify(executionDataForStorage));
                                    console.log('💾 SSE: Updated localStorage with execution data');
                                    window.dispatchEvent(new Event('workflowExecutionUpdate'));
                                  } catch (e) {
                                    console.error('Error updating localStorage:', e);
                                  }
                                }
                              } else if (update.type === 'status_changed') {
                                console.log('🔄 Status changed:', update.status);
                                setListenerStatus(update.status);
                              } else if (update.type === 'status') {
                                console.log('📊 Status update:', update);
                                setListenerStatus(update.status);
                                if (update.request_count !== undefined) {
                                  setListenerRequestCount(update.request_count);
                                }
                              } else if (update.type === 'connected') {
                                console.log('✅ Connected to listener stream');
                              } else {
                                console.log('📨 Other event type:', update.type, update);
                              }
                            });
                            
                            // Add error handler
                            eventSource.addEventListener('error', (error) => {
                              console.error('❌ SSE connection error:', error);
                              console.error('EventSource readyState:', eventSource.readyState);
                            });
                            
                            // Log connection states
                            eventSource.addEventListener('open', () => {
                              console.log('✅ SSE connection opened, readyState:', eventSource.readyState);
                            });
                            
                            setListenerEventSource(eventSource);
                            console.log('🔌 SSE EventSource created and stored');
                          }, 500);
                        } catch (err) {
                          console.error('Error starting listener:', err);
                          alert('Failed to start webhook listener: ' + (err.message || 'Unknown error'));
                        }
                      } else if (listenerStatus === 'running') {
                        // Pause listener
                        try {
                          await apiService.pauseWebhookListener(listenerId);
                          setListenerStatus('paused');
                        } catch (err) {
                          console.error('Error pausing listener:', err);
                        }
                      } else if (listenerStatus === 'paused') {
                        // Resume listener
                        try {
                          await apiService.resumeWebhookListener(listenerId);
                          setListenerStatus('running');
                        } catch (err) {
                          console.error('Error resuming listener:', err);
                        }
                      }
                    }}
                    title={listenerStatus === 'stopped' ? 'Start Webhook Listener' : listenerStatus === 'running' ? 'Pause Listener' : 'Resume Listener'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: listenerStatus === 'running' 
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : listenerStatus === 'paused'
                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      cursor: currentWorkflowId ? 'pointer' : 'not-allowed',
                      opacity: currentWorkflowId ? 1 : 0.6
                    }}
                  >
                    {listenerStatus === 'stopped' ? (
                      <>
                        <FiRadio /> Start Listener
                      </>
                    ) : listenerStatus === 'running' ? (
                      <>
                        <FiPause /> Pause
                      </>
                    ) : (
                      <>
                        <FiPlay /> Resume
                      </>
                    )}
                  </button>
                  
                  {/* Stop Listener Button - Show when running or paused */}
                  {(listenerStatus === 'running' || listenerStatus === 'paused') && (
                    <button
                      className="header-btn"
                      onClick={async () => {
                        try {
                          await apiService.stopWebhookListener(listenerId);
                          setListenerStatus('stopped');
                          if (listenerEventSource) {
                            listenerEventSource.close();
                            setListenerEventSource(null);
                          }
                          setListenerPanelOpen(false);
                        } catch (err) {
                          console.error('Error stopping listener:', err);
                        }
                      }}
                      title="Stop Listener"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#ef4444',
                        color: 'white'
                      }}
                    >
                      <FiSquare /> Stop
                    </button>
                  )}
                </>
              )}
              
              <div className="header-menu-container" ref={menuRef}>
                <button
                  className="header-btn icon-only"
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  title="More options"
                >
                  <FiMoreVertical />
                </button>
                {moreMenuOpen && (
                  <div className="header-dropdown-menu">
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        handleExport('without-credentials');
                        setMoreMenuOpen(false);
                      }}
                    >
                      <FiDownload /> Download
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        openImportModal();
                        setMoreMenuOpen(false);
                      }}
                    >
                      <FiUpload /> Import from File...
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setRenameModalOpen(true);
                        setMoreMenuOpen(false);
                      }}
                    >
                      <FiType /> Rename
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setSettingsOpen(true);
                        setMoreMenuOpen(false);
                      }}
                    >
                      <FiSettings /> Settings
                    </button>
                  </div>
                )}
              </div>
              
              <button
                className="header-btn icon-only"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <FiMoon /> : <FiSun />}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area - Workflow Builder */}
        {activeTab === 'workflow' ? (

        <div className="workflow-canvas" ref={reactFlowWrapper}>
          <ReactFlow
            key={`flow-${flowKey}-${nodes.length}-${edges.length}`}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            style={{ width: '100%', height: '100%' }}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { 
                stroke: '#999', 
                strokeWidth: 3,
                strokeOpacity: 1
              },
              markerEnd: {
                type: 'arrowclosed',
                color: '#999',
                width: 20,
                height: 20
              }
            }}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            minZoom={0.1}
            maxZoom={4}
            onNodeClick={(event, node) => {
              // Handle node click for deletion
              if (event.ctrlKey || event.metaKey) {
                deleteNode(node.id);
              }
            }}
            onNodeDoubleClick={(event, node) => {
              // Open node settings modal on double click
              event.preventDefault();
              setSelectedNodeForModal(node);
              setNodeSettingsModalOpen(true);
            }}
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
        ) : null}
      </div>

      {selectedNodeForModal && (
        <NodeSettingsModal
          node={selectedNodeForModal}
          isOpen={nodeSettingsModalOpen}
          onUpdate={updateNodeData}
          onClose={() => {
            setNodeSettingsModalOpen(false);
            setSelectedNodeForModal(null);
          }}
          onExecute={handleExecutionClick}
          workflowId={currentWorkflowId}
          onRunPreviousNodes={selectedNodeForModal ? () => handleRunPreviousNodes(selectedNodeForModal.id) : undefined}
          edges={edges}
          nodes={nodes}
        />
      )}

      {execution && <ExecutionViewer execution={execution} onClose={() => setExecution(null)} />}

      <ChatBox 
        isOpen={chatOpen} 
        onClose={() => setChatOpen(false)}
        onExecutionStart={handleChatExecution}
        onExecuteWorkflow={executeWorkflowWithMessage}
      />
      
      <ExecutionStatusBar 
        executionHistory={executionHistory}
        isExecuting={isExecuting}
        currentExecution={currentExecution}
        onClearHistory={handleClearHistory}
        isExpanded={logsExpanded}
        onToggleExpanded={setLogsExpanded}
      />

            <ExecutionResultModal 
              isOpen={!!executionResult}
              onClose={() => setExecutionResult(null)}
              result={executionResult}
            />
            
            {/* Debug Panel */}
            {edgeDebugInfo.length > 0 && (
              <div style={{
                position: 'fixed',
                top: '70px',
                right: '20px',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '10px',
                borderRadius: '5px',
                fontSize: '12px',
                zIndex: 1000,
                maxWidth: '300px'
              }}>
                <div><strong>Edge Debug Info:</strong></div>
                <div>Total Edges: {edges.length}</div>
                <div>Debug Logs: {edgeDebugInfo.length}</div>
                {edgeDebugInfo.slice(-3).map((info, idx) => (
                  <div key={idx}>
                    {info.timestamp}: {info.id}
                  </div>
                ))}
                <button 
                  onClick={() => setEdgeDebugInfo([])}
                  style={{ marginTop: '5px', padding: '2px 5px' }}
                >
                  Clear
                </button>
              </div>
            )}
      
      {/* Vertical Toolbar - Hidden when logsExpanded is open */}
      {!logsExpanded && (
        <VerticalToolbar 
          onExport={saveWorkflow}
          onImport={openImportModal}
          onAddNotes={addNotesNode}
          onOpenAI={() => setChatOpen(true)}
          onClearWorkspace={handleClearWorkspace}
          onMagic={() => {
            console.log('AI/Magic features');
            setAiChatbotOpen(true);
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={closeToast} />
      
      {/* AI Chatbot */}
      <AIChatbot 
        isOpen={aiChatbotOpen} 
        onClose={() => setAiChatbotOpen(false)} 
      />
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
        showToast={showToast}
      />
      
      {/* Export Modal */}
      <ExportModal 
        isOpen={exportModalOpen} 
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
      />
      
          {/* Import Modal */}
          <ImportModal 
            isOpen={importModalOpen} 
            onClose={() => setImportModalOpen(false)}
            onImport={handleImport}
          />
          
          {/* Clear Workspace Modal */}
          <ClearWorkspaceModal 
            isOpen={clearWorkspaceModalOpen} 
            onClose={() => setClearWorkspaceModalOpen(false)}
            onConfirm={confirmClearWorkspace}
          />
          
          {/* Rename Modal */}
          {renameModalOpen && (
            <div className="modal-overlay" onClick={() => setRenameModalOpen(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Rename Workflow</h3>
                  <button className="modal-close" onClick={() => setRenameModalOpen(false)}>
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  <input
                    type="text"
                    className="rename-input"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveWorkflow();
                        setRenameModalOpen(false);
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div className="modal-footer">
                  <button 
                    className="modal-btn secondary" 
                    onClick={() => setRenameModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="modal-btn primary" 
                    onClick={() => {
                      saveWorkflow();
                      setRenameModalOpen(false);
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Webhook Listener Panel */}
          {listenerPanelOpen && (listenerStatus === 'running' || listenerStatus === 'paused') && (
            <div style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              width: '500px',
              maxHeight: '600px',
              backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff',
              border: `2px solid ${listenerStatus === 'running' ? '#10b981' : '#f59e0b'}`,
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '16px',
                borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#e5e7eb'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: listenerStatus === 'running' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiRadio style={{ 
                    color: listenerStatus === 'running' ? '#10b981' : '#f59e0b',
                    fontSize: '18px',
                    animation: listenerStatus === 'running' ? 'pulse 2s infinite' : 'none'
                  }} />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: theme === 'dark' ? '#fff' : '#333' }}>
                    Webhook Listener {listenerStatus === 'running' ? '(Active)' : '(Paused)'}
                  </h3>
                </div>
                <button
                  onClick={() => setListenerPanelOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme === 'dark' ? '#fff' : '#333',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <FiX />
                </button>
              </div>
              
              <div style={{
                padding: '12px',
                fontSize: '12px',
                color: theme === 'dark' ? '#aaa' : '#666',
                borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#e5e7eb'}`
              }}>
                <div style={{ marginBottom: '4px' }}>
                  Requests received: <strong style={{ color: theme === 'dark' ? '#10b981' : '#059669' }}>{listenerRequestCount}</strong>
                </div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>
                  Workflow: {currentWorkflowId?.substring(0, 8)}... | Listener: {listenerId?.substring(0, 8)}...
                </div>
              </div>
              
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px'
              }}>
                {listenerEvents.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: theme === 'dark' ? '#666' : '#999'
                  }}>
                    <FiRadio style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }} />
                    <p>Waiting for webhook requests...</p>
                    <p style={{ fontSize: '11px', marginTop: '8px' }}>
                      Send a POST request to your webhook URL to see it here
                    </p>
                    <p style={{ fontSize: '10px', marginTop: '8px', color: theme === 'dark' ? '#444' : '#ccc' }}>
                      Listener ID: {listenerId?.substring(0, 8)}...
                    </p>
                  </div>
                ) : (
                  listenerEvents.map((event, index) => {
                    return (
                    <div
                      key={event.request_id || index}
                      style={{
                        marginBottom: '12px',
                        padding: '12px',
                        backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                        border: `1px solid ${theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          fontSize: '11px',
                          color: theme === 'dark' ? '#93c5fd' : '#3b82f6',
                          fontWeight: 600
                        }}>
                          {new Date(event.timestamp * 1000).toLocaleTimeString()}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          backgroundColor: (event.execution?.status || event.execution?.execution?.status) === 'completed' ? '#10b981' : 
                                         (event.execution?.status || event.execution?.execution?.status) === 'error' ? '#ef4444' : '#f59e0b',
                          color: 'white',
                          borderRadius: '4px'
                        }}>
                          {event.execution?.status || event.execution?.execution?.status || 'processing'}
                        </div>
                      </div>
                      
                      {event.request && (
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: theme === 'dark' ? '#fff' : '#333' }}>
                            Request: {event.request.method} {event.request.path}
                          </div>
                          {event.request.body && Object.keys(event.request.body).length > 0 && (
                            <pre style={{
                              fontSize: '10px',
                              padding: '8px',
                              backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                              borderRadius: '4px',
                              overflow: 'auto',
                              maxHeight: '100px',
                              margin: 0,
                              color: '#fff'
                            }}>
                              {JSON.stringify(event.request.body, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                      
                      {(event.execution?.data || event.execution?.execution?.node_states) && (
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: theme === 'dark' ? '#fff' : '#333' }}>
                            Execution Results:
                          </div>
                          {event.execution?.execution?.node_states && (
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ fontSize: '10px', color: theme === 'dark' ? '#aaa' : '#666', marginBottom: '4px' }}>
                                Nodes executed: {Object.keys(event.execution.execution.node_states).length}
                              </div>
                              {Object.entries(event.execution.execution.node_states).slice(0, 3).map(([nodeId, nodeState]) => (
                                <div key={nodeId} style={{
                                  fontSize: '10px',
                                  padding: '4px 8px',
                                  backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                                  borderRadius: '4px',
                                  marginBottom: '4px'
                                }}>
                                  <strong>{nodeId.substring(0, 8)}...</strong>: {nodeState.status || 'completed'}
                                </div>
                              ))}
                            </div>
                          )}
                          {event.execution?.data && Object.keys(event.execution.data).length > 0 && (
                            <pre style={{
                              fontSize: '10px',
                              padding: '8px',
                              backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                              borderRadius: '4px',
                              overflow: 'auto',
                              maxHeight: '150px',
                              margin: 0
                            }}>
                              {JSON.stringify(event.execution.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                  })
                )}
              </div>
            </div>
          )}

          {/* Webhook URL Modal */}
          {webhookUrlModalOpen && (
            <div className="modal-overlay" onClick={() => setWebhookUrlModalOpen(false)}>
              <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiLink2 /> Webhook URL
                  </h2>
                  <button className="close-btn" onClick={() => setWebhookUrlModalOpen(false)}>
                    <FiX />
                  </button>
                </div>
                <div className="modal-body">
                  {webhookUrlLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>
                      <div style={{
                        display: 'inline-block',
                        width: '40px',
                        height: '40px',
                        border: '4px solid #444',
                        borderTopColor: '#3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginBottom: '12px'
                      }}></div>
                      <p>Loading webhook URL...</p>
                    </div>
                  ) : webhookUrl?.webhook_url ? (
                    <div>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: '8px', 
                          fontWeight: 600, 
                          fontSize: '14px',
                          color: '#fff'
                        }}>
                          Your Webhook URL
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={webhookUrl.webhook_url}
                            readOnly
                            style={{
                              flex: 1,
                              padding: '12px',
                              backgroundColor: 'rgba(0, 0, 0, 0.3)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              borderRadius: '6px',
                              color: '#fff',
                              fontSize: '13px',
                              fontFamily: 'monospace'
                            }}
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(webhookUrl.webhook_url);
                              setWebhookUrlCopied(true);
                              setTimeout(() => setWebhookUrlCopied(false), 2000);
                            }}
                            style={{
                              padding: '12px 20px',
                              backgroundColor: webhookUrlCopied ? '#10b981' : '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: '500',
                              transition: 'all 0.2s'
                            }}
                            title="Copy webhook URL"
                          >
                            {webhookUrlCopied ? (
                              <>
                                <FiCheck /> Copied!
                              </>
                            ) : (
                              <>
                                <FiCopy /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div style={{
                        padding: '16px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ marginBottom: '12px' }}>
                          <strong style={{ color: '#3b82f6', fontSize: '13px' }}>Workflow Info:</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.8' }}>
                          <div><strong>Workflow:</strong> {webhookUrl.workflow_name}</div>
                          <div><strong>Method:</strong> {webhookUrl.method || 'POST'}</div>
                          <div><strong>Path:</strong> {webhookUrl.webhook_path}</div>
                          {baseUrl && (
                            <div><strong>Base URL:</strong> {baseUrl}</div>
                          )}
                        </div>
                      </div>
                      
                      <div style={{
                        padding: '12px',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#6ee7b7'
                      }}>
                        <strong>💡 Usage:</strong> Use this URL to trigger your workflow from:
                        <ul style={{ marginTop: '8px', marginLeft: '20px', lineHeight: '1.8' }}>
                          <li>External services (n8n, Zapier, etc.)</li>
                          <li>Page Builder workflow trigger buttons</li>
                          <li>API clients (Postman, curl, etc.)</li>
                          <li>Custom integrations</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: '#fca5a5'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                      <h3 style={{ marginBottom: '8px', color: '#fff' }}>No Webhook Trigger Found</h3>
                      <p style={{ color: '#aaa', fontSize: '14px' }}>
                        This workflow does not have a webhook trigger node. 
                        Add a "Webhook" trigger node to get a webhook URL.
                      </p>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button 
                    className="modal-btn primary" 
                    onClick={() => setWebhookUrlModalOpen(false)}
                    style={{ width: '100%' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
    </div>
  );
}

export default WorkflowBuilder;


