import { useState, useEffect, useRef } from "react";
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
import { credentialsManager, credentialTypes } from "../../credentialsManager";
import VariablesPanel from "./VariablesPanel.jsx";
import ExpressionEditor from "./ExpressionEditor.jsx";

const NodeSettingsModal = ({ node, onUpdate, onClose, isOpen, onExecute }) => {
  const [properties, setProperties] = useState(node?.data?.properties || {});
  const [nodeName, setNodeName] = useState(node?.data?.label || "");
  const [validationStates, setValidationStates] = useState({});
  const [testingKeys, setTestingKeys] = useState({});
  const [showApiKey, setShowApiKey] = useState({});
  const [inputValues, setInputValues] = useState({});
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
  const expressionEditorRefs = useRef({});

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

  useEffect(() => {
    if (node && isOpen) {
      setProperties(node.data?.properties || {});
      setNodeName(node.data?.label || "");
      const nodeId = node.id;
      const savedInputs = JSON.parse(
        localStorage.getItem(`inputValues_${nodeId}`) || "{}"
      );
      const initialInputValues = {};
      const nodeTypeDef = nodeTypeDefinitions[node.data.type];
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

  const nodeTypeDef = nodeTypeDefinitions[node.data.type];

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
      }
    } catch (error) {
      setValidationStates((prev) => ({ ...prev, [propKey]: "invalid" }));
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
                  <div className="api-key-valid">✅ API key is valid</div>
                )}
                {validationState === "invalid" && (
                  <div className="api-key-invalid">❌ API key is invalid</div>
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

  const handleExecuteClick = () => {
    if (onExecute && node?.id) {
      onExecute(node.id);
    }
  };

  return (
    <div className="n8n-settings-container">
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
            onVariableSelect={(variablePath) => {
              // Insert variable into the active expression editor
              if (activeExpressionKey) {
                const activeExpressionRef = expressionEditorRefs.current[activeExpressionKey];
                if (activeExpressionRef && activeExpressionRef.insertVariable) {
                  activeExpressionRef.insertVariable(variablePath);
                }
              }
            }}
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

                {/* Prompt (User Message) */}
                {nodeTypeDef?.properties &&
                  Object.entries(nodeTypeDef.properties).map(
                    ([key, propDef]) => {
                      if (
                        key === "prompt" ||
                        key === "message" ||
                        key === "user_message"
                      ) {
                        return (
                          <div key={key} className="property-field">
                            <div className="prompt-header">
                              <label className="property-label">
                                Prompt (User Message) *
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
                        key !== "prompt" &&
                        key !== "message" &&
                        key !== "user_message"
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
                <span className="output-count">1 item</span>
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
              <div className="json-viewer">
                <pre>
                  {JSON.stringify(
                    {
                      output:
                        "World news:\n• Breaking: Major development in international relations\n• Global economy shows signs of recovery\n\nTech news:\n• New AI breakthrough announced\n• Tech companies report strong quarterly results\n• Cybersecurity threats on the rise\n• Cloud computing adoption accelerates\n• Mobile technology innovations continue",
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}

          {outputTab === "logs" && (
            <div className="logs-content">
              <div className="empty-logs">No logs available</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .n8n-settings-container {
          position: fixed;
          inset: 0;
          background: var(--background);
          display: grid;
          grid-template-columns: 280px 1fr 400px;
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
          padding: 16px;
          background: var(--background);
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
          padding: 20px;
        }

        .node-config-card {
          background: var(--surface);
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid var(--border);
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
          transition: background 0.2s;
        }

        .execute-button:hover {
          background: #ff5a45;
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
          padding: 10px 12px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 13px;
          font-family: inherit;
          transition: border-color 0.2s;
          box-sizing: border-box;
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
          padding: 12px 40px 12px 32px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 13px;
          font-family: monospace;
          resize: vertical;
          min-height: 120px;
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
        }

        .result-textarea {
          width: 100%;
          padding: 12px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 13px;
          font-family: monospace;
          resize: vertical;
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
          max-height: calc(100vh - 200px);
          overflow-y: auto;
        }

        .json-viewer pre {
          margin: 0;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: var(--text);
          white-space: pre-wrap;
          word-wrap: break-word;
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
