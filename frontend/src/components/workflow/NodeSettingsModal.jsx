import { useState, useEffect, useRef, useMemo } from "react";
import {
  FiX,
  FiPlus,
  FiTrash2,
  FiChevronDown,
  FiChevronRight,
  FiPlay,
  FiArrowLeft,
} from "react-icons/fi";
import { nodeTypeDefinitions } from "../../nodeTypes.jsx";
import { useDynamicNodes } from "../../hooks/useDynamicNodes";
import { credentialsManager, credentialTypes } from "../../credentialsManager";
import VariablesPanel from "./VariablesPanel.jsx";
import ExpressionEditor from "./ExpressionEditor.jsx";
import ResizablePanels from "./ResizablePanels.jsx";

const NodeSettingsModal = ({ node, onUpdate, onClose, isOpen, onExecute, workflowId, onRunPreviousNodes, edges = [], nodes = [] }) => {
  const { dynamicNodes } = useDynamicNodes();
  const [properties, setProperties] = useState(node?.data?.properties || {});
  const [nodeName, setNodeName] = useState(node?.data?.label || "");
  const [validationStates, setValidationStates] = useState({});
  const [testingKeys, setTestingKeys] = useState({});
  const [showApiKey, setShowApiKey] = useState({});
  const [inputValues, setInputValues] = useState({});
  const [apiTestResponses, setApiTestResponses] = useState({}); // Store API test responses
  const [activeTab, setActiveTab] = useState("parameters");
  const [promptModes, setPromptModes] = useState({}); // Store mode per property key
  const [promptExpressions, setPromptExpressions] = useState({});
  const [inputExpanded, setInputExpanded] = useState({
    manualExecution: false,
    variables: false,
  });
  const [outputTab, setOutputTab] = useState("output");
  const [outputView, setOutputView] = useState("json");
  const [activeExpressionKey, setActiveExpressionKey] = useState(null);
  const [nodeOutput, setNodeOutput] = useState(null); // Store current node's output
  const [isExecuting, setIsExecuting] = useState(false); // Track execution state
  const [expandedOutputGroups, setExpandedOutputGroups] = useState({}); // For schema view expand/collapse
  const expressionEditorRefs = useRef({});

  // Merge static and dynamic node definitions
  const allNodeDefinitions = useMemo(() => {
    return { ...nodeTypeDefinitions, ...dynamicNodes };
  }, [dynamicNodes]);

  // JSON data for expression editor (same as VariablesPanel)
  const jsonData = {
    $now: "2025-11-08T11:51:24.574+05:30",
    $today: "2025-11-08T00:00:00.000+05:30",
    $vars: {
      $execution: {
        id: "[filled at execution time]",
        mode: "test",
        resumeUrl: "The URL for resuming a 'Wait' node",
      },
      $workflow: {
        id: "pMq9FG26HN1m7pWb",
        name: "AI Agent workflow",
        active: false,
      },
    },
  };

  // Load node output from localStorage when node changes
  useEffect(() => {
    if (!node?.id) {
      setNodeOutput(null);
      return;
    }

    const loadNodeOutput = () => {
      try {
        const storedData = localStorage.getItem('workflow_execution_data');
        if (storedData) {
          const executionData = JSON.parse(storedData);
          const nodeState = executionData.node_states?.[node.id];
          
          if (nodeState && nodeState.output) {
            let output = nodeState.output;
            // Extract main data if it's structured
            if (typeof output === 'object' && 'main' in output) {
              output = output.main;
            }
            setNodeOutput(output);
          } else {
            setNodeOutput(null);
          }
        } else {
          setNodeOutput(null);
        }
      } catch (error) {
        console.error('Error loading node output:', error);
        setNodeOutput(null);
      }
    };

    loadNodeOutput();

    // Listen for execution updates
    const handleExecutionUpdate = () => {
      loadNodeOutput();
    };

    window.addEventListener('workflowExecutionUpdate', handleExecutionUpdate);
    window.addEventListener('storage', handleExecutionUpdate);

    return () => {
      window.removeEventListener('workflowExecutionUpdate', handleExecutionUpdate);
      window.removeEventListener('storage', handleExecutionUpdate);
    };
  }, [node?.id]);

  // Recursive function to render JSON data in schema view
  const renderOutputSchema = (data, prefix = '', parentKey = '') => {
    if (data === null || data === undefined) {
      return (
        <div className="output-variable-item">
          <span className="output-var-icon">null</span>
          <span className="output-var-name">{prefix || 'null'}</span>
          <span className="output-var-value">null</span>
        </div>
      );
    }

    if (typeof data === 'object' && !Array.isArray(data)) {
      return Object.entries(data).map(([key, value]) => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const groupKey = parentKey ? `${parentKey}_${key}` : key;
        const isExpanded = expandedOutputGroups[groupKey] !== false;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return (
            <div key={key} className="output-nested-group">
              <div 
                className="output-group-header clickable"
                onClick={() => setExpandedOutputGroups(prev => ({
                  ...prev,
                  [groupKey]: !isExpanded
                }))}
              >
                <span className="output-arrow-icon">{isExpanded ? "▼" : "▶"}</span>
                <span className="output-cube-icon">⧉</span>
                <span className="output-var-name">{key}</span>
              </div>
              {isExpanded && (
                <div className="output-group-content">
                  {renderOutputSchema(value, fullPath, groupKey)}
                </div>
              )}
            </div>
          );
        } else {
          return (
            <div key={key} className="output-variable-item">
              <span className="output-var-icon">
                {typeof value === "boolean" ? "□" : typeof value === "number" ? "#" : "T"}
              </span>
              <span className="output-var-name">{key}</span>
              <span className={`output-var-value ${typeof value === "boolean" ? "boolean" : ""}`}>
                {String(value).substring(0, 100)}{String(value).length > 100 ? '...' : ''}
              </span>
            </div>
          );
        }
      });
    } else if (Array.isArray(data)) {
      return data.map((item, index) => {
        const fullPath = `${prefix}[${index}]`;
        const groupKey = `${parentKey}_arr_${index}`;
        const isExpanded = expandedOutputGroups[groupKey] !== false;
        
        return (
          <div key={index} className="output-nested-group">
            <div 
              className="output-group-header clickable"
              onClick={() => setExpandedOutputGroups(prev => ({
                ...prev,
                [groupKey]: !isExpanded
              }))}
            >
              <span className="output-arrow-icon">{isExpanded ? "▼" : "▶"}</span>
              <span className="output-cube-icon">[</span>
              <span className="output-var-name">[{index}]</span>
            </div>
            {isExpanded && (
              <div className="output-group-content">
                {renderOutputSchema(item, fullPath, groupKey)}
              </div>
            )}
          </div>
        );
      });
    } else {
      return (
        <div className="output-variable-item">
          <span className="output-var-icon">T</span>
          <span className="output-var-name">{prefix || 'value'}</span>
          <span className="output-var-value">{String(data)}</span>
        </div>
      );
    }
  };

  // Render table rows from output data
  const renderOutputTable = (data, prefix = '') => {
    if (data === null || data === undefined) {
      return (
        <tr key={prefix || 'null'}>
          <td>{prefix || 'null'}</td>
          <td>null</td>
        </tr>
      );
    }

    if (typeof data === 'object' && !Array.isArray(data)) {
      return Object.entries(data).flatMap(([key, value]) => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return renderOutputTable(value, fullPath);
        } else {
          return (
            <tr key={fullPath}>
              <td>{fullPath}</td>
              <td>{String(value)}</td>
            </tr>
          );
        }
      });
    } else if (Array.isArray(data)) {
      return data.flatMap((item, index) => {
        const fullPath = `${prefix}[${index}]`;
        return renderOutputTable(item, fullPath);
      });
    } else {
      return (
        <tr key={prefix || 'value'}>
          <td>{prefix || 'value'}</td>
          <td>{String(data)}</td>
        </tr>
      );
    }
  };

  useEffect(() => {
    if (node && isOpen) {
      setProperties(node.data?.properties || {});
      setNodeName(node.data?.label || "");
      const nodeId = node.id;
      const savedInputs = JSON.parse(
        localStorage.getItem(`inputValues_${nodeId}`) || "{}"
      );
      const initialInputValues = {};
      const nodeTypeDef = allNodeDefinitions[node.data.type] || nodeTypeDefinitions[node.data.type];
      if (nodeTypeDef?.properties) {
        Object.keys(nodeTypeDef.properties).forEach((key) => {
          initialInputValues[key] =
            savedInputs[key] ||
            node.data.properties[key] ||
            nodeTypeDef.properties[key]?.default ||
            "";
        });
      }
      setInputValues(initialInputValues);
      if (Object.keys(savedInputs).length > 0) {
        const hasChanges = Object.keys(savedInputs).some(
          (key) =>
            savedInputs[key] !==
            (node.data.properties[key] ||
              nodeTypeDef.properties[key]?.default ||
              "")
        );
        if (hasChanges) {
          setTimeout(() => {
            restoreFromLocalStorage();
          }, 100);
        }
      }
    }
  }, [node, isOpen]);

  if (!isOpen || !node || !node.data) return null;

  const nodeTypeDef = allNodeDefinitions[node.data.type] || nodeTypeDefinitions[node.data.type];

  const handlePropertyChange = (propKey, value) => {
    if (!node?.id) return;
    const newProperties = { ...properties, [propKey]: value };
    setProperties(newProperties);
    const newInputValues = { ...inputValues, [propKey]: value };
    setInputValues(newInputValues);
    const nodeId = node.id;
    try {
      localStorage.setItem(
        `inputValues_${nodeId}`,
        JSON.stringify(newInputValues)
      );
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
    if (onUpdate) {
      onUpdate(node.id, { properties: newProperties });
    }
  };

  const handleNameChange = (newName) => {
    setNodeName(newName);
    onUpdate(node.id, { label: newName });
  };

  const handleClose = () => {
    if (node?.id && Object.keys(inputValues).length > 0) {
      try {
        localStorage.setItem(
          `inputValues_${node.id}`,
          JSON.stringify(inputValues)
        );
      } catch (error) {
        console.error("Error syncing to localStorage on close:", error);
      }
    }
    if (onClose) {
      onClose();
    }
  };

  const restoreFromLocalStorage = () => {
    if (node?.id) {
      const nodeId = node.id;
      try {
        const savedInputs = JSON.parse(
          localStorage.getItem(`inputValues_${nodeId}`) || "{}"
        );
        if (Object.keys(savedInputs).length > 0) {
          setInputValues(savedInputs);
          const newProperties = { ...properties, ...savedInputs };
          setProperties(newProperties);
          if (onUpdate && node.id) {
            onUpdate(node.id, { properties: newProperties });
          }
      }
    } catch (error) {
        console.error("Error restoring from localStorage:", error);
      }
    }
  };

  const validateApiKey = async (propKey, apiKey, nodeType) => {
    const cleanApiKey = apiKey.trim();
    if (!cleanApiKey || cleanApiKey.length < 10) {
      setValidationStates((prev) => ({ ...prev, [propKey]: "invalid" }));
      return;
    }
    const customTestMessage =
      properties.test_message || "test api key from agent flow";
    setTestingKeys((prev) => ({ ...prev, [propKey]: true }));
    setValidationStates((prev) => ({ ...prev, [propKey]: "testing" }));
    try {
      const response = await fetch("/api/test-api-key/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodeType,
          apiKey: cleanApiKey,
          testMessage: customTestMessage,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        // Store the response for display
        setApiTestResponses((prev) => ({
          ...prev,
          [propKey]: result
        }));
        
        if (result.valid === true) {
          setValidationStates((prev) => ({ ...prev, [propKey]: "valid" }));
          const newProperties = { ...properties };
          delete newProperties[`${propKey}_error`];
          setProperties(newProperties);
          onUpdate(node.id, { properties: newProperties });
        } else {
          setValidationStates((prev) => ({ ...prev, [propKey]: "invalid" }));
          const newProperties = {
            ...properties,
            [`${propKey}_error`]: result.error || "Invalid API key",
          };
          setProperties(newProperties);
          onUpdate(node.id, { properties: newProperties });
        }
      } else {
        setValidationStates((prev) => ({ ...prev, [propKey]: "invalid" }));
        setApiTestResponses((prev => ({
          ...prev,
          [propKey]: { status: 'inactive', error: 'Request failed' }
        })));
      }
    } catch (error) {
      setValidationStates((prev) => ({ ...prev, [propKey]: "invalid" }));
      setApiTestResponses((prev => ({
        ...prev,
        [propKey]: { status: 'inactive', error: error.message || 'Network error' }
      })));
    } finally {
      setTestingKeys((prev) => ({ ...prev, [propKey]: false }));
    }
  };

  const handleApiKeyChange = async (propKey, value) => {
    if (!node?.id) return;
    const cleanValue = value.replace(/[^a-zA-Z0-9_\-]/g, "").trim();
    const newInputValues = { ...inputValues, [propKey]: cleanValue };
    setInputValues(newInputValues);
    const nodeId = node.id;
    try {
      localStorage.setItem(
        `inputValues_${nodeId}`,
        JSON.stringify(newInputValues)
      );
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
    const newProperties = { ...properties, [propKey]: cleanValue };
    setProperties(newProperties);
    if (onUpdate) {
      onUpdate(node.id, { properties: newProperties });
    }
    if (propKey.includes("api_key") || propKey.includes("key")) {
      setTimeout(() => {
        validateApiKey(propKey, cleanValue, node.data.type);
      }, 1000);
    }
  };

  const renderPropertyInput = (propKey, propDef) => {
    const value =
      inputValues[propKey] ?? properties[propKey] ?? propDef.default;

    if (propDef.showIf) {
      const [condKey, condValues] = Object.entries(propDef.showIf)[0];
      const currentCondValue =
        properties[condKey] ?? nodeTypeDef.properties[condKey]?.default;
      if (!condValues.includes(currentCondValue)) {
        return null;
      }
    }

    switch (propDef.type) {
      case "text":
      case "password":
        const isApiKey = propKey.includes("api_key") || propKey.includes("key");
        const validationState = validationStates[propKey];
        const isTesting = testingKeys[propKey];
  return (
          <div className="api-key-input-container">
            <div className="api-key-input-wrapper">
              <input
                type={isApiKey && !showApiKey[propKey] ? "password" : "text"}
                value={value}
                onChange={(e) => {
                  if (isApiKey) {
                    handleApiKeyChange(propKey, e.target.value);
                  } else {
                    handlePropertyChange(propKey, e.target.value);
                  }
                }}
                onPaste={(e) => {
                  if (isApiKey) {
                    e.preventDefault();
                    const pastedText = e.clipboardData.getData("text");
                    handleApiKeyChange(propKey, pastedText);
                  }
                }}
                placeholder={propDef.placeholder}
                required={propDef.required}
                className={`property-input ${
                  validationState ? `api-key-${validationState}` : ""
                }`}
              />
              {isApiKey && (
                <button
                  type="button"
                  className="api-key-toggle-btn"
                  onClick={() => {
                    setShowApiKey((prev) => ({
                      ...prev,
                      [propKey]: !prev[propKey],
                    }));
                  }}
                >
                  {showApiKey[propKey] ? "👁️" : "👁️‍🗨️"}
          </button>
              )}
          </div>
            {isApiKey && (
              <div className="api-key-status">
                {isTesting && (
                  <div className="api-key-testing">Testing API key...</div>
                )}
                {validationState === "valid" && (
                  <>
                    <div className="api-key-valid">✅ API key is valid</div>
                    {apiTestResponses[propKey] && (
                      <div className="api-key-response">
                        <pre className="api-key-json">
                          {JSON.stringify({ status: apiTestResponses[propKey].status || 'active' }, null, 2)}
                        </pre>
        </div>
                    )}
                  </>
                )}
                {validationState === "invalid" && (
                  <>
                    <div className="api-key-invalid">❌ API key is invalid</div>
                    {apiTestResponses[propKey] && apiTestResponses[propKey].status && (
                      <div className="api-key-response">
                        <pre className="api-key-json">
                          {JSON.stringify({ status: apiTestResponses[propKey].status }, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );

      case "textarea":
        // Special handling for prompt textareas
        if (propKey.includes("prompt") || propKey.includes("message")) {
          return (
            <div className="prompt-editor">
              {/* Tip box */}
              <div
                className="tip-box mb-4 p-3 rounded"
                style={{
                  background: "rgba(59,130,246,0.1)",
                  border: "1px solid rgba(59,130,246,0.2)",
                }}
              >
                <span className="text-blue-200">
                  💡 <strong>Tip:</strong> Get a feel for agents with our quick{" "}
                  <a href="#" className="text-blue-400 underline">
                    tutorial
                  </a>{" "}
                  or see an{" "}
                  <a href="#" className="text-blue-400 underline">
                    example
                  </a>{" "}
                  of how this node works
                </span>
            </div>

              {/* Fixed/Expression Toggle */}
              <div className="flex mb-3">
                <div className="inline-flex rounded overflow-hidden border border-[#3d3d52]">
                    <button 
                    onClick={() => setPromptModes(prev => ({ ...prev, [propKey]: "fixed" }))}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      (promptModes[propKey] || "fixed") === "fixed"
                        ? "bg-[#ff6d5a] text-white"
                        : "bg-transparent text-[#aaa] hover:text-white"
                    }`}
                  >
                    Fixed
                  </button>
                  <button
                    onClick={() => setPromptModes(prev => ({ ...prev, [propKey]: "expression" }))}
                    className={`px-3 py-1.5 text-sm border-l border-[#3d3d52] transition-colors ${
                      promptModes[propKey] === "expression"
                        ? "bg-[#ff6d5a] text-white"
                        : "bg-transparent text-[#aaa] hover:text-white"
                    }`}
                  >
                    Expression
                    </button>
                  </div>
                </div>

              {(promptModes[propKey] || "fixed") === "fixed" ? (
                <textarea
                  value={value}
                  onChange={(e) =>
                    handlePropertyChange(propKey, e.target.value)
                  }
                  placeholder={propDef.placeholder}
                  rows={6}
                  className="property-textarea w-full rounded p-3 bg-[#1e1e2f] border border-[#3d3d52] text-white"
                />
              ) : (
                <div className="expression-editor space-y-3">
                  <div>
                    <div className="text-xs mb-1 text-[#aaa] font-medium">
                      Expression
                    </div>
                    <ExpressionEditor
                      ref={(el) => {
                        expressionEditorRefs.current[propKey] = el;
                      }}
                      value={promptExpressions[propKey] || properties[propKey] || ''}
                      onChange={(newExpression) => {
                        setPromptExpressions(prev => ({
                          ...prev,
                          [propKey]: newExpression
                        }));
                        handlePropertyChange(propKey, newExpression);
                      }}
                      onFocus={() => setActiveExpressionKey(propKey)}
                      jsonData={jsonData}
                      placeholder="Enter expression, e.g., {{ $json.content }}"
                    />
                  </div>
                  <div className="bg-[#1e1e2f] border border-[#3d3d52] rounded p-3">
                    <div className="text-xs font-medium text-white mb-2">
                      Result
                    </div>
                    <div className="bg-[#0b1220] text-[#e6eef8] rounded p-3 text-sm border border-[rgba(255,255,255,0.03)]">
                      {promptExpressions[propKey] || properties[propKey] || 'Enter an expression to see result'}
                    </div>
                    <div className="mt-3 text-xs text-[#aaa]">
                      <strong>Tip:</strong> Drag variables from the left panel or type expressions. Anything inside{" "}
                      <code className="px-1 rounded bg-[rgba(255,255,255,0.02)]">{`{{}}`}</code>{" "}
                      is JavaScript.{" "}
                      <a href="#" className="text-[#ff6d5a] underline">
                        Learn more
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }
        // Default textarea for non-prompt fields
        return (
          <textarea
            value={value}
            onChange={(e) => handlePropertyChange(propKey, e.target.value)}
            placeholder={propDef.placeholder}
            rows={6}
            className="property-textarea"
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) =>
              handlePropertyChange(propKey, parseInt(e.target.value))
            }
            min={propDef.min}
            max={propDef.max}
            className="property-input"
          />
        );

      case "select":
        return (
          <select
            value={value}
            onChange={(e) => handlePropertyChange(propKey, e.target.value)}
            className="property-select"
          >
            {propDef.options.map((opt, index) => {
              if (typeof opt === "string") {
                return (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                );
              } else if (typeof opt === "object" && opt.value && opt.label) {
                return (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                );
              } else {
                return (
                  <option key={index} value={opt}>
                    {opt}
                  </option>
                );
              }
            })}
          </select>
        );

      case "multiselect":
        return (
          <div className="multiselect">
            {propDef.options.map((opt, index) => {
              const optValue =
                typeof opt === "object" && opt.value ? opt.value : opt;
              const optLabel =
                typeof opt === "object" && opt.label ? opt.label : opt;
              const optKey =
                typeof opt === "object" && opt.value ? opt.value : opt;
              return (
                <label key={optKey} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={(value || []).includes(optValue)}
                    onChange={(e) => {
                      const current = value || [];
                      const newValue = e.target.checked
                        ? [...current, optValue]
                        : current.filter((v) => v !== optValue);
                      handlePropertyChange(propKey, newValue);
                    }}
                  />
                  {optLabel}
                </label>
              );
            })}
          </div>
        );

      case "boolean":
        return (
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handlePropertyChange(propKey, e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        );

      case "credentials":
        const credentials = credentialsManager.getCredentialsByType(
          propDef.credentialType
        );
        return (
          <select
            value={value || ""}
            onChange={(e) => handlePropertyChange(propKey, e.target.value)}
            className="property-select"
          >
            <option value="">-- Select Credential --</option>
            {credentials.map((cred) => (
              <option key={cred.id} value={cred.id}>
                {cred.name}
              </option>
            ))}
          </select>
        );

      case "keyValue":
        const kvPairs = value || [];
        return (
          <div className="key-value-list">
            {kvPairs.map((pair, idx) => (
              <div key={idx} className="key-value-pair">
                <input
                  type="text"
                  placeholder="Key"
                  value={pair.key || ""}
                  onChange={(e) => {
                    const newPairs = [...kvPairs];
                    newPairs[idx] = { ...pair, key: e.target.value };
                    handlePropertyChange(propKey, newPairs);
                  }}
                  className="property-input"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={pair.value || ""}
                  onChange={(e) => {
                    const newPairs = [...kvPairs];
                    newPairs[idx] = { ...pair, value: e.target.value };
                    handlePropertyChange(propKey, newPairs);
                  }}
                  className="property-input"
                />
                      <button 
                  className="btn-icon"
                  onClick={() => {
                    const newPairs = kvPairs.filter((_, i) => i !== idx);
                    handlePropertyChange(propKey, newPairs);
                  }}
                >
                  <FiTrash2 />
                      </button>
                          </div>
                        ))}
            <button
              className="btn-add"
              onClick={() =>
                handlePropertyChange(propKey, [
                  ...kvPairs,
                  { key: "", value: "" },
                ])
              }
            >
              <FiPlus /> Add Pair
            </button>
                      </div>
        );

      case "json":
      case "code":
        return (
          <textarea
            value={value}
            onChange={(e) => handlePropertyChange(propKey, e.target.value)}
            className="property-code"
            rows={8}
            spellCheck={false}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handlePropertyChange(propKey, e.target.value)}
            className="property-input"
          />
        );
    }
  };

  const handleExecuteClick = async () => {
    if (onExecute && node?.id) {
      setIsExecuting(true);
      try {
        await onExecute(node.id);
        // Wait a bit for the execution to complete and data to be stored
        setTimeout(() => {
          // Reload output after execution
          const storedData = localStorage.getItem('workflow_execution_data');
          if (storedData) {
            const executionData = JSON.parse(storedData);
            const nodeState = executionData.node_states?.[node.id];
            if (nodeState && nodeState.output) {
              let output = nodeState.output;
              if (typeof output === 'object' && 'main' in output) {
                output = output.main;
              }
              setNodeOutput(output);
            }
          }
          setIsExecuting(false);
        }, 500);
      } catch (error) {
        console.error('Execution error:', error);
        setIsExecuting(false);
      }
    }
  };

  return (
    <div className="n8n-settings-container">
      <ResizablePanels initialSizes={[280, 1, 400]} minSizes={[200, 300, 300]}>
        {/* Left Panel - INPUT */}
        <div className="settings-panel-left">
        <div className="panel-header">
          <button className="back-button" onClick={handleClose}>
            <FiArrowLeft /> Back to canvas
          </button>
        </div>
        <div className="panel-content">
          <div className="panel-title">INPUT</div>

          {/* Manual Execution Section */}
          <div className="collapsible-section">
                      <button 
              className="collapsible-header"
              onClick={() =>
                setInputExpanded((prev) => ({
                  ...prev,
                  manualExecution: !prev.manualExecution,
                }))
              }
            >
              {inputExpanded.manualExecution ? (
                <FiChevronDown />
              ) : (
                <FiChevronRight />
              )}
              <span>Manual execution</span>
                      </button>
            {inputExpanded.manualExecution && (
              <div className="collapsible-content">
                <div className="empty-state">
                  ⚡ No fields - node executed, but no items were sent on this
                  branch
                </div>
                    </div>
            )}
          </div>

          {/* Variables and context Section */}
          <VariablesPanel 
            workflowId={workflowId}
            nodeId={node?.id}
            edges={edges}
            nodes={nodes}
            onVariableSelect={(variablePath) => {
              // Insert variable into the active expression editor
              if (activeExpressionKey) {
                const activeExpressionRef = expressionEditorRefs.current[activeExpressionKey];
                if (activeExpressionRef && activeExpressionRef.insertVariable) {
                  activeExpressionRef.insertVariable(variablePath);
                }
              }
            }}
            onRunPreviousNodes={onRunPreviousNodes}
          />
            </div>
          </div>

        {/* Middle Panel - Node Configuration */}
        <div className="settings-panel-center">
          <div className="node-config-card">
            <div className="node-config-header">
            <div className="node-title-section">
              <span className="node-icon-large">{nodeTypeDef?.icon}</span>
              <div>
                <h2>{nodeName || nodeTypeDef?.name}</h2>
                <span className="node-subtitle">{nodeTypeDef?.category}</span>
              </div>
            </div>
            <div className="node-actions-header">
              <button className="execute-button" onClick={handleExecuteClick}>
                <FiPlay /> Execute step
              </button>
              <a href="#" className="docs-link">
                Docs
              </a>
            </div>
            </div>

          {/* Tabs */}
          <div className="config-tabs">
              <button 
              className={`config-tab ${
                activeTab === "parameters" ? "active" : ""
              }`}
              onClick={() => setActiveTab("parameters")}
              >
                Parameters
              </button>
              <button 
              className={`config-tab ${
                activeTab === "settings" ? "active" : ""
              }`}
              onClick={() => setActiveTab("settings")}
              >
                Settings
              </button>
              <button 
              className={`config-tab ${activeTab === "docs" ? "active" : ""}`}
              onClick={() => setActiveTab("docs")}
              >
                Docs
              </button>
            </div>

          {/* Tab Content */}
          <div className="config-content">
            {activeTab === "parameters" && (
              <div className="parameters-content">
                {/* Tip Box */}
                <div className="tip-box">
                  💡 <strong>Tip:</strong> Get a feel for agents with our quick{" "}
                  <a href="#">tutorial</a> or see an <a href="#">example</a> of
                  how this node works
                </div>

                {/* Source for Prompt */}
                {nodeTypeDef?.properties &&
                  Object.entries(nodeTypeDef.properties).map(
                    ([key, propDef]) => {
                      if (key === "prompt_source") {
                        return (
                          <div key={key} className="property-field">
                            <label className="property-label">
                              Source for Prompt (User Message)
                            </label>
                            {renderPropertyInput(key, propDef)}
                          </div>
                        );
                      }
                      return null;
                    }
                  )}

                {/* System Message (prompt) */}
                {nodeTypeDef?.properties &&
                  Object.entries(nodeTypeDef.properties).map(
                    ([key, propDef]) => {
                      if (key === "prompt" && node.data.type === "ai-agent") {
                        return (
                          <div key={key} className="property-field">
                            <label className="property-label">
                              {propDef.label || "System Message"}
                              {propDef.required && (
                                <span className="required">*</span>
                              )}
                            </label>
                            {renderPropertyInput(key, propDef)}
                            {propDef.description && (
                              <small className="field-description">
                                {propDef.description}
                              </small>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }
                  )}

                {/* User Message (Query) */}
                {nodeTypeDef?.properties &&
                  Object.entries(nodeTypeDef.properties).map(
                    ([key, propDef]) => {
                      if (
                        key === "user_message" ||
                        (key === "message" && node.data.type !== "ai-agent") ||
                        (key === "prompt" && node.data.type !== "ai-agent")
                      ) {
                        return (
                          <div key={key} className="property-field">
                            <div className="prompt-header">
                              <label className="property-label">
                                {propDef.label || "User Message (Query)"}
                                {propDef.required && (
                                  <span className="required">*</span>
                                )}
                              </label>
                              <div className="toggle-mode-buttons">
                                <button
                                  className={`mode-btn ${
                                    (promptModes[key] || "fixed") === "fixed" ? "active" : ""
                                  }`}
                                  onClick={() => setPromptModes(prev => ({ ...prev, [key]: "fixed" }))}
                                >
                                  Fixed
                                </button>
                                <button
                                  className={`mode-btn ${
                                    promptModes[key] === "expression" ? "active" : ""
                                  }`}
                                  onClick={() => setPromptModes(prev => ({ ...prev, [key]: "expression" }))}
                                >
                                  Expression
                                </button>
                              </div>
                            </div>
                            {promptModes[key] === "expression" ? (
                              <div className="prompt-editor">
                                <ExpressionEditor
                                  ref={(el) => {
                                    expressionEditorRefs.current[key] = el;
                                  }}
                                  value={promptExpressions[key] || properties[key] || ''}
                                  onChange={(newExpression) => {
                                    setPromptExpressions(prev => ({
                                      ...prev,
                                      [key]: newExpression
                                    }));
                                    handlePropertyChange(key, newExpression);
                                  }}
                                  onFocus={() => setActiveExpressionKey(key)}
                                  jsonData={jsonData}
                                  placeholder="Enter expression, e.g., {{ $json.content }}"
                  />
                </div>
                            ) : (
                              <div className="prompt-editor">
                                <div className="editor-icons">
                                  <span className="fx-icon">fx</span>
                                </div>
                                <textarea
                                  value={properties[key] || ""}
                                  onChange={(e) =>
                                    handlePropertyChange(key, e.target.value)
                                  }
                                  placeholder="Enter your prompt here..."
                                  className="prompt-textarea"
                                  rows={6}
                                />
                                <div className="editor-actions">
                                  <button
                                    className="editor-action-btn"
                                    title="Expand"
                                  >
                                    ⛶
                                  </button>
                                  <button
                                    className="editor-action-btn"
                                    title="Copy"
                                  >
                                    📋
                                  </button>
                                </div>
                              </div>
                            )}
                            <div className="result-section">
                              <label className="result-label">Result</label>
                              <div className="result-editor">
                                <textarea
                                  value={promptModes[key] === "expression" 
                                    ? (promptExpressions[key] || properties[key] || 'Enter an expression to see result')
                                    : (properties[key] || 'Enter your prompt here...')}
                                  readOnly
                                  className="result-textarea"
                                  rows={3}
                                />
                </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }
                  )}

                {/* Other Properties */}
                {nodeTypeDef?.properties &&
                  Object.entries(nodeTypeDef.properties).map(
                    ([key, propDef]) => {
                      if (
                        key !== "prompt_source" &&
                        !(key === "prompt" && node.data.type === "ai-agent") &&
                        key !== "user_message" &&
                        !(key === "message" && node.data.type !== "ai-agent") &&
                        !(key === "prompt" && node.data.type !== "ai-agent")
                      ) {
                        return (
                          <div key={key} className="property-field">
                            <label className="property-label">
                              {propDef.label}
                              {propDef.required && (
                                <span className="required">*</span>
                              )}
                            </label>
                            {renderPropertyInput(key, propDef)}
                            {propDef.description && (
                              <small className="field-description">
                                {propDef.description}
                              </small>
                            )}
                </div>
                        );
                      }
                      return null;
                    }
              )}

                {/* Options Section */}
                <div className="options-section">
                  <div className="section-label">Options</div>
                  <div className="empty-options">No properties</div>
            </div>

                {/* Chat Model */}
                {nodeTypeDef?.properties &&
                  Object.entries(nodeTypeDef.properties).find(
                    ([key]) =>
                      key.includes("model") || key.includes("chat_model")
                  ) && (
                    <div className="property-field">
                      <label className="property-label">
                        Chat Model <span className="required">*</span>
                      </label>
                      {renderPropertyInput(
                        Object.entries(nodeTypeDef.properties).find(
                          ([key]) =>
                            key.includes("model") || key.includes("chat_model")
                        )?.[0],
                        Object.entries(nodeTypeDef.properties).find(
                          ([key]) =>
                            key.includes("model") || key.includes("chat_model")
                        )?.[1]
                      )}
          </div>
                  )}

                {/* Memory and Tool Tabs */}
                <div className="sub-tabs">
                  <button className="sub-tab active">Memory</button>
                  <button className="sub-tab">Tool</button>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="settings-content">
                <div className="settings-section">
                  {/* Toggle Group */}
                  <div className="settings-group">
                    <div className="setting-row">
                      <label className="setting-label">
                        Always Output Data
                      </label>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={properties.alwaysOutput || false}
                          onChange={(e) =>
                            handlePropertyChange(
                              "alwaysOutput",
                              e.target.checked
                            )
                          }
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                    <div className="setting-row">
                      <label className="setting-label">Execute Once</label>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={properties.executeOnce || false}
                          onChange={(e) =>
                            handlePropertyChange(
                              "executeOnce",
                              e.target.checked
                            )
                          }
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                    <div className="setting-row">
                      <label className="setting-label">Retry On Fail</label>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={properties.retryOnFail || false}
                          onChange={(e) =>
                            handlePropertyChange(
                              "retryOnFail",
                              e.target.checked
                            )
                          }
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>

                  {/* Error Handling Dropdown */}
                  <div className="settings-group">
                    <div className="setting-field">
                      <label className="setting-label">On Error</label>
                      <select
                        className="settings-select"
                        value={properties.onError || "stop"}
                        onChange={(e) =>
                          handlePropertyChange("onError", e.target.value)
                        }
                      >
                        <option value="stop">Stop Workflow</option>
                        <option value="continue">Continue Workflow</option>
                        <option value="retry">Retry</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="settings-group">
                    <div className="setting-field">
                      <label className="setting-label">Notes</label>
                      <textarea
                        className="settings-textarea"
                        placeholder="Double-click to open"
                        value={properties.notes || ""}
                        onChange={(e) =>
                          handlePropertyChange("notes", e.target.value)
                        }
                        rows={4}
                      />
                    </div>
                  </div>

                  {/* Display Note Toggle */}
                  <div className="settings-group">
                    <div className="setting-row">
                      <label className="setting-label">
                        Display Note in Flow?
                      </label>
                      <label className="toggle-switch green">
                        <input
                          type="checkbox"
                          checked={properties.displayNote || true}
                          onChange={(e) =>
                            handlePropertyChange(
                              "displayNote",
                              e.target.checked
                            )
                          }
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Version Footer */}
                <div className="settings-footer">
                  <span className="version-text">
                    AI Agent node version 2.2 (Latest version: 3)
                  </span>
                </div>
              </div>
            )}

            {activeTab === "docs" && (
              <div className="docs-content">
                <h3>Documentation</h3>
                <p>Documentation for {nodeTypeDef?.name} will appear here.</p>
                {nodeTypeDef?.description && (
                  <div className="doc-content">
                    <p>{nodeTypeDef.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Right Panel - OUTPUT */}
        <div className="settings-panel-right">
          <div className="panel-header">
          <div className="output-tabs">
            <button
              className={`output-tab ${outputTab === "output" ? "active" : ""}`}
              onClick={() => setOutputTab("output")}
            >
              Output
            </button>
            <button
              className={`output-tab ${outputTab === "logs" ? "active" : ""}`}
              onClick={() => setOutputTab("logs")}
            >
              Logs
              </button>
            </div>
        </div>
        <div className="panel-content">
          {outputTab === "output" && (
            <div className="output-content">
              <div className="output-header">
                <span className="output-count">
                  {nodeOutput ? "1 item" : "No output"}
                </span>
                <div className="output-view-tabs">
                  <button
                    className={`output-view-tab ${
                      outputView === "schema" ? "active" : ""
                    }`}
                    onClick={() => setOutputView("schema")}
                  >
                    Schema
                  </button>
                  <button
                    className={`output-view-tab ${
                      outputView === "table" ? "active" : ""
                    }`}
                    onClick={() => setOutputView("table")}
                  >
                    Table
                  </button>
                  <button
                    className={`output-view-tab ${
                      outputView === "json" ? "active" : ""
                    }`}
                    onClick={() => setOutputView("json")}
                  >
                    JSON
                  </button>
                </div>
              </div>
              {/* Schema View */}
              {outputView === "schema" && (
                <div className="output-schema-view">
                  {isExecuting ? (
                    <div className="output-loading">
                      <span className="spinner"></span>
                      <p>Executing node...</p>
                    </div>
                  ) : nodeOutput ? (
                    <div className="output-schema-content">
                      {renderOutputSchema(nodeOutput)}
                    </div>
                  ) : (
                    <div className="empty-output">
                      <p>No output available. Execute this node to see results.</p>
                      <p className="empty-output-hint">
                        Click "Execute step" button to run this node and see its output here.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Table View */}
              {outputView === "table" && (
                <div className="output-table-view">
                  {isExecuting ? (
                    <div className="output-loading">
                      <span className="spinner"></span>
                      <p>Executing node...</p>
                    </div>
                  ) : nodeOutput ? (
                    <div className="table-view-content">
                      <table>
                        <thead>
                          <tr>
                            <th>Key</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {renderOutputTable(nodeOutput)}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-output">
                      <p>No output available. Execute this node to see results.</p>
                    </div>
                  )}
                </div>
              )}

              {/* JSON View */}
              {outputView === "json" && (
                <div className="json-viewer">
                  {isExecuting ? (
                    <div className="output-loading">
                      <span className="spinner"></span>
                      <p>Executing node...</p>
                    </div>
                  ) : nodeOutput ? (
                    <pre className="output-json-content">
                      {JSON.stringify(
                        typeof nodeOutput === 'object' ? nodeOutput : { output: nodeOutput },
                        null,
                        2
                      )}
                    </pre>
                  ) : (
                    <div className="empty-output">
                      <p>No output available. Execute this node to see results.</p>
                      <p className="empty-output-hint">
                        Click "Execute step" button to run this node and see its output here.
                      </p>
                    </div>
                  )}
                </div>
              )}
                    </div>
                  )}

          {outputTab === "logs" && (
            <div className="logs-content">
              <div className="empty-logs">No logs available</div>
                </div>
              )}
            </div>
          </div>
      </ResizablePanels>

      <style>{`
        .n8n-settings-container {
          position: fixed;
          inset: 0;
          background: var(--background);
          z-index: 1000;
          color: var(--text);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Left Panel */
        .settings-panel-left {
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          width: 100%;
          height: 100%;
          min-width: 0;
        }

        .panel-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
        }

        .back-button {
          background: none;
          border: none;
          color: var(--text);
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .back-button:hover {
          background: var(--hover);
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 16px;
          background: var(--background);
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .panel-title {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--textSecondary);
          margin-bottom: 16px;
          letter-spacing: 0.5px;
        }

        .collapsible-section {
          margin-bottom: 8px;
        }

        .collapsible-header {
          width: 100%;
          background: none;
          border: none;
          color: var(--text);
          cursor: pointer;
          padding: 10px 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .collapsible-header:hover {
          background: var(--hover);
        }

        .collapsible-content {
          padding: 8px 8px 8px 24px;
          font-size: 12px;
          color: var(--textSecondary);
        }

        .empty-state {
          color: var(--textSecondary);
          font-size: 12px;
          padding: 12px;
          background: var(--backgroundSecondary);
          border-radius: 4px;
        }

        /* Center Panel */
        .settings-panel-center {
          background: var(--surface);
          overflow-y: auto;
          overflow-x: hidden;
          padding: 20px;
          width: 100%;
          height: 100%;
          min-width: 0;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .node-config-card {
          background: var(--surface);
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          border: 1px solid var(--border);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .node-config-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: transparent;
        }

        .node-title-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .node-icon-large {
          font-size: 32px;
        }

        .node-title-section h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
        }

        .node-subtitle {
          font-size: 11px;
          color: var(--textSecondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-top: 2px;
        }

        .node-actions-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .execute-button {
          background: #ff6d5a;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .execute-button:hover:not(:disabled) {
          background: #ff5a45;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(255, 109, 90, 0.3);
        }
        .execute-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .execute-button.executing {
          background: #3b82f6;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .docs-link {
          color: var(--textSecondary);
          text-decoration: none;
          font-size: 13px;
          padding: 8px 12px;
          border-radius: 4px;
          transition: color 0.2s;
        }

        .docs-link:hover {
          color: #ddd;
        }

        .config-tabs {
          display: flex;
          border-bottom: 1px solid var(--border);
          background: transparent;
          padding: 0 24px;
        }

        .config-tab {
          background: none;
          border: none;
          padding: 14px 20px;
          color: var(--textSecondary);
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all 0.2s;
        }

        .config-tab:hover {
          color: var(--text);
        }

        .config-tab.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .config-content {
          padding: 24px;
          background: transparent;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .tip-box {
          background: rgba(59, 130, 246, 0.06);
          border: 1px solid rgba(59, 130, 246, 0.14);
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 24px;
          font-size: 13px;
          color: var(--text);
          line-height: 1.6;
        }

        .tip-box a {
          color: var(--primary);
          text-decoration: underline;
        }

        .property-field {
          margin-bottom: 20px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .property-label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
        }

        .required {
          color: #ff6d5a;
          margin-left: 4px;
        }

        .property-input,
        .property-select,
        .property-textarea,
        .property-code {
          width: 100%;
          max-width: 100%;
          padding: 10px 12px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 13px;
          font-family: inherit;
          transition: border-color 0.2s;
          box-sizing: border-box;
          min-width: 0;
        }

        .property-input:focus,
        .property-select:focus,
        .property-textarea:focus,
        .property-code:focus {
          outline: none;
          border-color: var(--primary);
        }

        .property-textarea {
          resize: vertical;
          min-height: 120px;
          font-family: inherit;
        }

        .property-code {
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }

        .prompt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .toggle-mode-buttons {
          display: flex;
          gap: 1px;
          background: var(--border);
          padding: 1px;
          border-radius: 4px;
        }

        .mode-btn {
          background: var(--surface);
          border: none;
          color: var(--textSecondary);
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-btn:first-child {
          border-top-left-radius: 3px;
          border-bottom-left-radius: 3px;
        }

        .mode-btn:last-child {
          border-top-right-radius: 3px;
          border-bottom-right-radius: 3px;
        }

        .mode-btn.active {
          background: var(--primary);
          color: white;
        }

        .prompt-editor {
          position: relative;
          margin-bottom: 16px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .editor-icons {
          position: absolute;
          left: 12px;
          top: 12px;
          z-index: 1;
        }

        .fx-icon {
          color: var(--textSecondary);
          font-size: 12px;
          font-family: monospace;
        }

        .prompt-textarea {
          width: 100%;
          max-width: 100%;
          padding: 12px 40px 12px 32px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 13px;
          font-family: monospace;
          resize: vertical;
          min-height: 120px;
          box-sizing: border-box;
          min-width: 0;
        }

        .prompt-textarea:focus {
          outline: none;
          border-color: var(--primary);
        }

        .editor-actions {
          position: absolute;
          right: 12px;
          top: 12px;
          display: flex;
          gap: 8px;
        }

        .editor-action-btn {
          background: none;
          border: none;
          color: var(--textSecondary);
          cursor: pointer;
          padding: 2px;
          font-size: 14px;
          transition: color 0.2s;
        }

        .editor-action-btn:hover {
          color: var(--text);
        }

        .result-section {
          margin-top: 16px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .result-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--textSecondary);
          margin-bottom: 8px;
        }

        .result-editor {
          position: relative;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .result-textarea {
          width: 100%;
          max-width: 100%;
          padding: 12px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 13px;
          font-family: monospace;
          resize: vertical;
          box-sizing: border-box;
          min-width: 0;
        }

        .result-textarea:focus {
          outline: none;
          border-color: var(--primary);
        }

        .field-description {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          color: var(--textSecondary);
        }

        .options-section {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
        }

        .section-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 12px;
        }

        .empty-options {
          color: var(--textSecondary);
          font-size: 12px;
          padding: 12px;
          background: var(--backgroundSecondary);
          border-radius: 4px;
        }

        .sub-tabs {
          display: flex;
          gap: 4px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
        }

        .sub-tab {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--textSecondary);
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sub-tab:hover {
          background: var(--hover);
          color: var(--text);
        }

        .sub-tab.active {
          background: var(--surface);
          color: var(--text);
          border-color: var(--primary);
        }

        .settings-content {
          padding: 24px;
          background: var(--background);
          height: calc(100vh - 160px);
          min-height: 600px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .settings-section {
          display: flex;
          flex-direction: column;
          gap: 32px;
          flex: 1;
          padding: 12px 0;
        }

        .settings-group {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 16px;
          background: var(--surface);
          border-radius: 8px;
          border: 1px solid var(--border);
        }

        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          min-height: 48px;
        }

        .setting-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
        }

        .setting-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .settings-select {
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 13px;
          padding: 8px 12px;
          width: 100%;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .settings-select:hover {
          border-color: var(--primary);
        }

        .settings-select:focus {
          outline: none;
          border-color: var(--primary);
        }

        .settings-textarea {
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 13px;
          padding: 16px;
          width: 100%;
          resize: vertical;
          min-height: 160px;
          transition: border-color 0.2s;
          line-height: 1.5;
          margin: 8px 0;
        }

        .settings-textarea:hover {
          border-color: var(--primary);
        }

        .settings-textarea:focus {
          outline: none;
          border-color: var(--primary);
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #3d3d52;
          transition: 0.3s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: #ddd;
          transition: 0.3s;
          border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider {
          background-color: #ff6d5a;
        }

        .toggle-switch.green input:checked + .toggle-slider {
          background-color: #10b981;
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }

        .settings-footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }

        .version-text {
          font-size: 12px;
          color: var(--textSecondary);
        }

        .docs-content h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: var(--text);
        }

        .docs-content p {
          color: var(--textSecondary);
          font-size: 13px;
          line-height: 1.6;
        }

        /* Right Panel */
        .settings-panel-right {
          background: var(--surface);
          border-left: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          width: 100%;
          height: 100%;
          min-width: 0;
        }

        .output-tabs {
          display: flex;
          border-bottom: 1px solid var(--border);
        }

        .output-tab {
          flex: 1;
          background: none;
          border: none;
          padding: 12px 16px;
          color: var(--textSecondary);
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .output-tab:hover {
          color: var(--text);
        }

        .output-tab.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .output-content {
          padding: 16px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .output-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .output-count {
          font-size: 12px;
          color: var(--textSecondary);
        }

        .output-view-tabs {
          display: flex;
          gap: 4px;
        }

        .output-view-tab {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--textSecondary);
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .output-view-tab:hover {
          background: var(--hover);
          color: var(--text);
        }

        .output-view-tab.active {
          background: var(--surface);
          color: var(--text);
          border-color: var(--primary);
        }

        .json-viewer {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 16px;
          overflow-x: auto;
          overflow-y: auto;
          max-height: calc(100vh - 200px);
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .json-viewer pre {
          margin: 0;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: var(--text);
          white-space: pre-wrap;
          word-wrap: break-word;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }
        .output-json-content {
          animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .empty-output {
          padding: 40px 20px;
          text-align: center;
          color: var(--textSecondary);
        }
        .empty-output p {
          margin: 8px 0;
          font-size: 13px;
        }
        .empty-output-hint {
          font-size: 12px;
          color: var(--textSecondary);
          opacity: 0.7;
        }
        .output-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          gap: 12px;
        }
        .output-loading .spinner {
          width: 32px;
          height: 32px;
          border-width: 3px;
        }
        .output-loading p {
          color: var(--textSecondary);
          font-size: 14px;
        }
        /* Schema View Styles */
        .output-schema-view {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 12px;
          overflow-y: auto;
          max-height: calc(100vh - 200px);
          animation: fadeIn 0.3s ease-in;
        }
        .output-schema-content {
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }
        .output-variable-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 8px;
          border-radius: 4px;
          margin-bottom: 4px;
          transition: background 0.2s;
        }
        .output-variable-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .output-var-icon {
          color: #aaa;
          font-size: 11px;
          width: 16px;
          text-align: center;
        }
        .output-var-name {
          min-width: 120px;
          color: var(--text);
          font-weight: 500;
        }
        .output-var-value {
          color: #ccc;
          flex: 1;
          word-break: break-word;
        }
        .output-var-value.boolean {
          color: #ff6d5a;
        }
        .output-nested-group {
          margin-left: 16px;
          margin-top: 4px;
        }
        .output-group-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .output-group-header.clickable:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .output-arrow-icon,
        .output-cube-icon {
          color: #888;
          font-size: 10px;
          width: 16px;
          text-align: center;
        }
        .output-group-content {
          margin-left: 24px;
          border-left: 1px dotted var(--border);
          padding-left: 8px;
          margin-top: 4px;
        }
        /* Table View Styles */
        .output-table-view {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 12px;
          overflow-y: auto;
          max-height: calc(100vh - 200px);
          animation: fadeIn 0.3s ease-in;
        }
        .table-view-content {
          width: 100%;
        }
        .table-view-content table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .table-view-content th,
        .table-view-content td {
          border: 1px solid var(--border);
          padding: 8px 12px;
          text-align: left;
          word-break: break-word;
        }
        .table-view-content th {
          background: var(--background);
          font-weight: 600;
          color: var(--text);
        }
        .table-view-content td {
          color: var(--textSecondary);
        }
        .table-view-content tr:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .logs-content {
          padding: 16px;
        }

        .empty-logs {
          color: var(--textSecondary);
          font-size: 12px;
          text-align: center;
          padding: 40px;
        }

        .api-key-input-container {
          position: relative;
        }

        .api-key-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .api-key-input-wrapper .property-input {
          padding-right: 40px;
        }

        .api-key-toggle-btn {
          position: absolute;
          right: 8px;
          background: none;
          border: none;
          color: var(--textSecondary);
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
        }

        .api-key-status {
          margin-top: 8px;
          font-size: 12px;
        }

        .api-key-testing {
          color: var(--primary);
        }

        .api-key-valid {
          color: #10b981;
        }

        .api-key-invalid {
          color: #ef4444;
        }
        .api-key-response {
          margin-top: 8px;
          padding: 8px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 4px;
        }
        .api-key-json {
          margin: 0;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: var(--text);
          white-space: pre-wrap;
          word-break: break-word;
        }

        .multiselect {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #ddd;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: auto;
        }

        .key-value-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .key-value-pair {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .key-value-pair .property-input {
          flex: 1;
        }

        .btn-icon {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          width: 32px;
          height: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .btn-icon:hover {
          background: #dc2626;
        }

        .btn-add {
          padding: 8px 12px;
          background: #3d3d52;
          color: #ddd;
          border: 1px solid #3d3d52;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          margin-top: 8px;
        }

        .btn-add:hover {
          background: #4a4a5f;
          border-color: #ff6d5a;
        }

        @media (max-width: 1400px) {
          .n8n-settings-container {
            grid-template-columns: 240px 1fr 350px;
          }
        }
      `}</style>
    </div>
  );
};

export default NodeSettingsModal;
