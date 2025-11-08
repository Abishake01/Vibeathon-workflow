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
  FiMoreVertical, FiUpload, FiType, FiPower, FiLayout
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
import { executionEngine } from '../../executionEngine';
import { workflowApi } from '../../api/workflowApi';
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

  // Create a universal node type mapper - all node types use WorkflowNode component
  const nodeTypes = useMemo(() => {
    const types = Object.keys(nodeTypeDefinitions).reduce((acc, nodeType) => {
      acc[nodeType] = WorkflowNode;
      return acc;
    }, {});

    // Add special node types
    types['notes'] = NotesNode;
    types['readme-viewer'] = READMEViewerNode;

    console.log('📝 Node types registered:', Object.keys(types));
    console.log('📝 Notes node type:', types['notes']);
    
    return types;
  }, []); // Empty dependency array since nodeTypeDefinitions and components don't change
  const [selectedNodeForSettings, setSelectedNodeForSettings] = useState(null);
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
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSaveEnabled');
    return saved !== null ? saved === 'true' : true; // Default ON
  });
  const menuRef = useRef(null);
  const hasLoadedWorkflow = useRef(false);
  const savedWorkflowData = useRef(null);
  
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
    if (!handlersRef.current.handleSettingsClick) {
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
      
      const loadedNodes = workflow.nodes.map(node => {
        // Restore properties to localStorage
        if (node.data && node.data.properties && Object.keys(node.data.properties).length > 0) {
          try {
            localStorage.setItem(`inputValues_${node.id}`, JSON.stringify(node.data.properties));
            console.log(`📥 Restored properties for node ${node.id}:`, Object.keys(node.data.properties));
          } catch (error) {
            console.error(`Error saving to localStorage for node ${node.id}:`, error);
          }
        }
        
        return {
          id: node.id,
          type: node.type,
          position: node.position || { x: 0, y: 0 },
          data: {
            label: node.data?.label || 'Node',
            type: node.data?.type || node.type,
            properties: node.data?.properties || {},
            onSettingsClick: handlersRef.current.handleSettingsClick,
            onExecutionClick: handlersRef.current.handleExecutionClick,
            onDelete: handlersRef.current.deleteNode,
            onDuplicate: handlersRef.current.duplicateNode,
            onChatClick: handlersRef.current.handleChatClick,
            onTrackExecution: handlersRef.current.handleChatExecution
          }
        };
      });
      
      setNodes(loadedNodes);
      setEdges(workflow.edges || []);
      setIsSaved(true);
      hasLoadedWorkflow.current = false; // Mark as processed to prevent re-loading
      console.log('✅ Restored workflow from localStorage:', { 
        nodes: loadedNodes.length, 
        edges: (workflow.edges || []).length 
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

  const handleSettingsClick = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    setSelectedNodeForSettings(node);
  }, [nodes]);
  
  // Update handlers ref when handlers are defined
  useEffect(() => {
    handlersRef.current.handleSettingsClick = handleSettingsClick;
  }, [handleSettingsClick]);

  const handleExecutionClick = useCallback(async (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    
    // For chat nodes, open chat UI
    if (node?.data?.type === 'when-chat-received') {
      setChatOpen(true);
      return;
    }
    
    // For chat model nodes, execute a real test
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
          properties: Object.keys(nodeProperties)
        });
        
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
            const errorMessage = result.error || 'Workflow execution failed';
            
            console.log('❌ Workflow execution failed:', errorMessage);
            
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
            
            if (nodeResult?.output) {
              if (typeof nodeResult.output === 'string') {
                output = nodeResult.output;
              } else if (nodeResult.output.response) {
                output = nodeResult.output.response;
              } else if (nodeResult.output.text) {
                output = nodeResult.output.text;
              } else if (nodeResult.output.main?.text) {
                output = nodeResult.output.main.text;
              } else if (nodeResult.output.main?.response) {
                output = nodeResult.output.main.response;
              } else {
                // If it's still an object, stringify it
                output = JSON.stringify(nodeResult.output, null, 2);
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
          throw new Error(`Execution failed: ${response.status}`);
        }
      } catch (error) {
        console.error('Node execution failed:', error);
        const endTime = new Date();
        
        const nodeExecution = {
          id: Date.now() + Math.random(),
          nodeType: node.data.type,
          nodeName: node.data.label,
          status: 'error',
          startTime,
          endTime,
          source: 'test',
          output: `Execution failed: ${error.message}`,
          duration: endTime - startTime
        };
        
        setExecutionHistory(prev => [nodeExecution, ...prev.slice(0, 49)]);
        showToast(`❌ Test execution failed: ${error.message}`, 'error', 4000);
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
    if (selectedNodeForSettings?.id === nodeId) {
      setSelectedNodeForSettings(null);
    }
  }, [nodes, edges, selectedNodeForSettings, saveToHistory]);

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
        onSettingsClick: handleSettingsClick,
        onExecutionClick: handleExecutionClick,
        onDelete: deleteNode,
        onDuplicate: duplicateNode,
        onChatClick: handleChatClick,
        onTrackExecution: handleChatExecution
      }
    };

    setNodes((nds) => [...nds, newNode]);
  }, [nodes, handleSettingsClick, handleExecutionClick, deleteNode, handleChatExecution]);

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
              onSettingsClick: handleSettingsClick,
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
  }, [handleSettingsClick, handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution]);

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
            onSettingsClick: handleSettingsClick,
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
  }, [handleSettingsClick, handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution, showToast]);
  
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
            onSettingsClick: handleSettingsClick,
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
  }, [handleSettingsClick, handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution, showToast]);

  // Update all handlers ref when they're all defined
  useEffect(() => {
    handlersRef.current.handleSettingsClick = handleSettingsClick;
    handlersRef.current.handleExecutionClick = handleExecutionClick;
    handlersRef.current.deleteNode = deleteNode;
    handlersRef.current.duplicateNode = duplicateNode;
    handlersRef.current.handleChatClick = handleChatClick;
    handlersRef.current.handleChatExecution = handleChatExecution;
  }, [handleSettingsClick, handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution]);
  
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
          onSettingsClick: handleSettingsClick,
          onExecutionClick: handleExecutionClick,
          onDelete: deleteNode,
          onDuplicate: duplicateNode,
          onChatClick: handleChatClick,
          onTrackExecution: handleChatExecution
        }
      }))
    );
  }, [handleSettingsClick, handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution]);

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
          onSettingsClick: handleSettingsClick,
          onExecutionClick: handleExecutionClick,
          onDelete: deleteNode,
          onDuplicate: duplicateNode,
          onChatClick: handleChatClick
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [nodes, edges, reactFlowInstance, handleSettingsClick, handleExecutionClick, deleteNode, duplicateNode, handleChatClick, hasExistingTrigger, saveToHistory]
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
        onSettingsClick: handleSettingsClick,
        onExecutionClick: handleExecutionClick,
        onDelete: deleteNode,
        onDuplicate: duplicateNode,
        onChatClick: handleChatClick,
        onTrackExecution: handleChatExecution
      },
    };

    setNodes((nds) => nds.concat(newNode));
  }, [nodes, edges, handleSettingsClick, handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution, hasExistingTrigger, saveToHistory]);

  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
    
    // Update selected node as well
    if (selectedNodeForSettings?.id === nodeId) {
      setSelectedNodeForSettings(prev => {
        if (!prev) return null;
        return {
          ...prev,
          data: { ...prev.data, ...newData }
        };
      });
    }
  }, [selectedNodeForSettings]);

  const deleteSelectedNode = useCallback(() => {
    if (selectedNodeForSettings) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNodeForSettings.id));
      setEdges((eds) => eds.filter(
        (edge) => edge.source !== selectedNodeForSettings.id && edge.target !== selectedNodeForSettings.id
      ));
      setSelectedNodeForSettings(null);
    }
  }, [selectedNodeForSettings]);

  const executeWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      showToast('Add some nodes to the workflow first!', 'warning');
      return;
    }

    // Find manual trigger node
    const manualTrigger = nodes.find(node => node.data.type === 'manual-trigger');
    if (!manualTrigger) {
      showToast('No manual trigger found! Add a manual trigger to execute the workflow.', 'warning');
      return;
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
            trigger_data: { text: 'Manual trigger execution' },
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
          
          // Animate nodes sequentially based on execution order
          for (const nodeId of (result.execution.execution_order || Object.keys(nodeStates))) {
            const nodeState = nodeStates[nodeId];
            const node = nodes.find(n => n.id === nodeId);
            
            if (node && nodeState) {
              // Set node to running state
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
              
              // Wait a bit for animation (shorter for better UX)
              await new Promise(resolve => setTimeout(resolve, 200));
              
              // Set node to completed/error state
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
              
              // Add to execution history for logs
              const nodeExecution = {
                id: Date.now() + Math.random(),
                nodeType: node.data.type,
                nodeName: node.data.label,
                status: nodeState.status,
                startTime: new Date(),
                endTime: new Date(),
                source: 'workflow',
                output: typeof nodeState.output === 'string' ? nodeState.output : JSON.stringify(nodeState.output, null, 2),
                duration: 100
              };
              
              setExecutionHistory(prev => [nodeExecution, ...prev.slice(0, 49)]);
              
              // Show toast for node completion
              if (nodeState.status === 'completed') {
                showToast(`✅ ${node.data.label} completed`, 'success', 2000);
              } else if (nodeState.status === 'error') {
                showToast(`❌ ${node.data.label} failed: ${nodeState.error}`, 'error', 4000);
              }
            }
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
          // Restore properties to localStorage
          if (node.data.properties && Object.keys(node.data.properties).length > 0) {
            try {
              localStorage.setItem(`inputValues_${node.id}`, JSON.stringify(node.data.properties));
              console.log(`📥 Restored properties for node ${node.id}:`, Object.keys(node.data.properties));
            } catch (error) {
              console.error(`Error saving to localStorage for node ${node.id}:`, error);
            }
          }

          return {
            ...node,
            data: {
              ...node.data,
              onSettingsClick: handleSettingsClick,
              onExecutionClick: handleExecutionClick,
              onDelete: deleteNode,
              onDuplicate: duplicateNode,
              onChatClick: handleChatClick,
              onTrackExecution: handleChatExecution
            }
          };
        });

        // Process imported edges
        const processedEdges = (importedEdges || []).map(edge => ({
          ...edge,
          id: edge.id || `e${edge.source}-${edge.target}-${edge.sourceHandle || 'main'}-${edge.targetHandle || 'main'}`,
          sourceHandle: edge.sourceHandle || 'main',
          targetHandle: edge.targetHandle || 'main'
        }));

        setNodes(processedNodes);
        setEdges(processedEdges);
        
        showToast('✅ Workflow imported successfully!', 'success');
        console.log('📂 Imported workflow:', {
          nodes: processedNodes.length,
          edges: processedEdges.length,
          properties: processedNodes.map(n => Object.keys(n.data.properties || {}))
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
          
          // Restore properties to localStorage
          if (node.data.properties && Object.keys(node.data.properties).length > 0) {
            try {
              localStorage.setItem(`inputValues_${node.id}`, JSON.stringify(node.data.properties));
              console.log(`📥 Restored properties for node ${node.id}:`, Object.keys(node.data.properties));
            } catch (error) {
              console.error(`Error saving to localStorage for node ${node.id}:`, error);
            }
          }

          return {
            ...node,
            data: {
              ...node.data,
              onSettingsClick: handleSettingsClick,
              onExecutionClick: handleExecutionClick,
              onDelete: deleteNode,
              onDuplicate: duplicateNode,
              onChatClick: handleChatClick,
              onTrackExecution: handleChatExecution
            }
          };
        });

        // Process server edges
        const processedEdges = (serverEdges || []).map(edge => ({
          ...edge,
          id: edge.id || `e${edge.source}-${edge.target}-${edge.sourceHandle || 'main'}-${edge.targetHandle || 'main'}`,
          sourceHandle: edge.sourceHandle || 'main',
          targetHandle: edge.targetHandle || 'main'
        }));

        setNodes(processedNodes);
        setEdges(processedEdges);
        
        showToast('✅ Exported workflow imported successfully!', 'success');
        console.log('📂 Imported exported workflow:', {
          nodes: processedNodes.length,
          edges: processedEdges.length,
          properties: processedNodes.map(n => Object.keys(n.data.properties || {}))
        });
      }
    } catch (error) {
      console.error('Import failed:', error);
      showToast(`❌ Import failed: ${error.message}`, 'error');
      throw error;
    }
  }, [handleSettingsClick, handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution, showToast]);

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
        onSettingsClick: handleSettingsClick,
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
  }, [nodes, edges, handleSettingsClick, handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution, showToast, saveToHistory]);

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
          const loadedNodes = (workflow.nodes || []).map(node => {
            // Restore properties to localStorage
            if (node.data.properties && Object.keys(node.data.properties).length > 0) {
              try {
                localStorage.setItem(`inputValues_${node.id}`, JSON.stringify(node.data.properties));
                console.log(`📥 Restored properties for node ${node.id}:`, Object.keys(node.data.properties));
              } catch (error) {
                console.error(`Error saving to localStorage for node ${node.id}:`, error);
              }
            }
            
            return {
              ...node,
              data: {
                ...node.data,
                onSettingsClick: handleSettingsClick,
                onExecutionClick: handleExecutionClick,
                onDelete: deleteNode,
                onDuplicate: duplicateNode,
                onChatClick: handleChatClick,
                onTrackExecution: handleChatExecution
              }
            };
          });
          
          setNodes(loadedNodes);
          setEdges(workflow.edges || []);
          setSelectedNodeForSettings(null);
          
          console.log('📂 Loaded workflow with properties:', loadedNodes.map(n => ({
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
  }, [handleSettingsClick, handleExecutionClick, deleteNode, duplicateNode, handleChatClick, handleChatExecution]);

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

      {selectedNodeForSettings && (
        <PropertyPanel
          node={selectedNodeForSettings}
          onUpdate={updateNodeData}
          onClose={() => setSelectedNodeForSettings(null)}
        />
      )}

      {nodeSettingsModalOpen && selectedNodeForModal && (
        <NodeSettingsModal
          node={selectedNodeForModal}
          nodes={nodes}
          edges={edges}
          onUpdate={updateNodeData}
          onClose={() => {
            setNodeSettingsModalOpen(false);
            setSelectedNodeForModal(null);
          }}
          onExecuteNode={handleExecutionClick}
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
    </div>
  );
}

export default WorkflowBuilder;

