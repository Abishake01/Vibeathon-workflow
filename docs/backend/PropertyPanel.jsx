import { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { nodeTypeDefinitions } from '../nodeTypes.jsx';
import { credentialsManager, credentialTypes } from '../credentialsManager';

const PropertyPanel = ({ node, onUpdate, onClose }) => {
  const [properties, setProperties] = useState(node?.data?.properties || {});
  const [nodeName, setNodeName] = useState(node?.data?.label || '');
  const [validationStates, setValidationStates] = useState({});
  const [testingKeys, setTestingKeys] = useState({});
  const [showApiKey, setShowApiKey] = useState({});
  const [inputValues, setInputValues] = useState({});

  useEffect(() => {
    if (node) {
      setProperties(node.data?.properties || {});
      setNodeName(node.data?.label || '');
      
      // Initialize input values from localStorage first, then properties
      const nodeId = node.id;
      const savedInputs = JSON.parse(localStorage.getItem(`inputValues_${nodeId}`) || '{}');
      const initialInputValues = {};
      
      // Get all property keys from node definition
      const nodeTypeDef = nodeTypeDefinitions[node.data.type];
      if (nodeTypeDef?.properties) {
        Object.keys(nodeTypeDef.properties).forEach(key => {
          // Priority: localStorage > node properties > default
          initialInputValues[key] = savedInputs[key] || node.data.properties[key] || nodeTypeDef.properties[key]?.default || '';
        });
      }
      
      setInputValues(initialInputValues);
      
      // Only restore from localStorage if there's actually saved data and it's different from current properties
      if (Object.keys(savedInputs).length > 0) {
        const hasChanges = Object.keys(savedInputs).some(key => 
          savedInputs[key] !== (node.data.properties[key] || nodeTypeDef.properties[key]?.default || '')
        );
        
        if (hasChanges) {
          setTimeout(() => {
            restoreFromLocalStorage();
          }, 100);
        }
      }
    }
  }, [node]);

  if (!node || !node.data) return null;

  const nodeTypeDef = nodeTypeDefinitions[node.data.type];

  const handlePropertyChange = (propKey, value) => {
    if (!node?.id) return;
    
    const newProperties = { ...properties, [propKey]: value };
    setProperties(newProperties);
    
    // Update input values and save to localStorage
    const newInputValues = { ...inputValues, [propKey]: value };
    setInputValues(newInputValues);
    
    // Save to localStorage
    const nodeId = node.id;
    try {
      localStorage.setItem(`inputValues_${nodeId}`, JSON.stringify(newInputValues));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
    
    if (onUpdate) {
      onUpdate(node.id, { properties: newProperties });
    }
  };

  const handleNameChange = (newName) => {
    setNodeName(newName);
    onUpdate(node.id, { label: newName });
  };

  // Function to restore input values from localStorage
  const restoreFromLocalStorage = () => {
    if (node?.id) {
      const nodeId = node.id;
      try {
        const savedInputs = JSON.parse(localStorage.getItem(`inputValues_${nodeId}`) || '{}');
        
        if (Object.keys(savedInputs).length > 0) {
          setInputValues(savedInputs);
          
          // Also update properties to keep them in sync
          const newProperties = { ...properties, ...savedInputs };
          setProperties(newProperties);
          if (onUpdate && node.id) {
            onUpdate(node.id, { properties: newProperties });
          }
        }
      } catch (error) {
        console.error('Error restoring from localStorage:', error);
      }
    }
  };

  const validateApiKey = async (propKey, apiKey, nodeType) => {
    // Clean and validate the API key
    const cleanApiKey = apiKey.trim();
    
    if (!cleanApiKey || cleanApiKey.length < 10) {
      setValidationStates(prev => ({ ...prev, [propKey]: 'invalid' }));
      return;
    }

    // Check if it looks like a valid Groq API key
    if (nodeType.includes('groq') && !cleanApiKey.startsWith('gsk_')) {
      console.warn(`⚠️ API key doesn't start with 'gsk_': ${cleanApiKey.substring(0, 10)}...`);
    }

    // Get custom test message from properties or use default
    const customTestMessage = properties.test_message || 'test api key from agent flow';
    
    console.log(`🔍 Testing API key for ${nodeType}:`, cleanApiKey.substring(0, 10) + '...');
    console.log(`🔍 Full API key length:`, cleanApiKey.length);
    console.log(`🔍 API key starts with:`, cleanApiKey.substring(0, 20));
    console.log(`🔍 API key ends with:`, cleanApiKey.substring(cleanApiKey.length - 10));
    console.log(`📝 Custom test message: "${customTestMessage}"`);
    setTestingKeys(prev => ({ ...prev, [propKey]: true }));
    setValidationStates(prev => ({ ...prev, [propKey]: 'testing' }));

    try {
      // Create a test workflow with the API key
      const testWorkflow = {
        nodes: [
          {
            id: 'test-trigger',
            type: 'manual-trigger',
            data: { type: 'manual-trigger', label: 'Test Trigger' }
          },
          {
            id: 'test-model',
            type: nodeType,
            data: { 
              type: nodeType, 
              label: 'Test Model',
              properties: { ...properties, [propKey]: apiKey }
            }
          }
        ],
        edges: [
          {
            id: 'test-edge',
            source: 'test-trigger',
            target: 'test-model',
            sourceHandle: 'main',
            targetHandle: 'main'
          }
        ]
      };

      // Test the API key by making a simple request
      const response = await fetch('/api/test-api-key/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeType,
          apiKey: cleanApiKey,
          testMessage: customTestMessage
        })
      });

      console.log(`📡 API Response status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`📡 API Response data:`, result);
        
        // Check the actual 'valid' field in the response
        if (result.valid === true) {
          setValidationStates(prev => ({ ...prev, [propKey]: 'valid' }));
          // Clear any previous error
          const newProperties = { ...properties };
          delete newProperties[`${propKey}_error`];
          setProperties(newProperties);
          onUpdate(node.id, { properties: newProperties });
          console.log(`✅ API Key validation successful for ${nodeType}:`, result);
        } else {
          setValidationStates(prev => ({ ...prev, [propKey]: 'invalid' }));
          // Store the error message
          const newProperties = { ...properties, [`${propKey}_error`]: result.error || 'Invalid API key' };
          setProperties(newProperties);
          onUpdate(node.id, { properties: newProperties });
          console.error(`❌ API Key validation failed for ${nodeType}:`, result);
        }
      } else {
        let error;
        try {
          error = await response.json();
        } catch (e) {
          error = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        setValidationStates(prev => ({ ...prev, [propKey]: 'invalid' }));
        console.error(`❌ API Key validation failed for ${nodeType}:`, error);
      }
    } catch (error) {
      setValidationStates(prev => ({ ...prev, [propKey]: 'invalid' }));
      console.error(`❌ API Key validation error for ${nodeType}:`, error);
    } finally {
      setTestingKeys(prev => ({ ...prev, [propKey]: false }));
    }
  };

  const handleApiKeyChange = async (propKey, value) => {
    if (!node?.id) return;
    
    // Clean the value to remove any DOM artifacts and keep only valid API key characters
    const cleanValue = value.replace(/[^a-zA-Z0-9_\-]/g, '').trim();
    
    console.log(`🧹 Cleaning API key input: "${value}" -> "${cleanValue}"`);
    
    // Update input values state
    const newInputValues = { ...inputValues, [propKey]: cleanValue };
    setInputValues(newInputValues);
    
    // Save to localStorage immediately
    const nodeId = node.id;
    try {
      localStorage.setItem(`inputValues_${nodeId}`, JSON.stringify(newInputValues));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
    
    // Update properties and node
    const newProperties = { ...properties, [propKey]: cleanValue };
    setProperties(newProperties);
    if (onUpdate) {
      onUpdate(node.id, { properties: newProperties });
    }
    
    // Auto-validate API keys
    if (propKey.includes('api_key') || propKey.includes('key')) {
      // Debounce validation
      setTimeout(() => {
        validateApiKey(propKey, cleanValue, node.data.type);
      }, 1000);
    }
  };

  const executeApiTest = async (propKey) => {
    if (!node?.id) return;
    
    const apiKey = inputValues[propKey] || properties[propKey];
    const testMessage = inputValues.test_message || properties.test_message || 'test api key from agent flow';
    
    if (!apiKey) {
      console.error('❌ No API key found for testing');
      return;
    }
    
    console.log(`🚀 Executing API test for ${node.data.type}...`);
    console.log(`📝 Test message: "${testMessage}"`);
    
    setTestingKeys(prev => ({ ...prev, [propKey]: true }));
    
    try {
      // Create a test workflow with the API key
      const testWorkflow = {
        nodes: [
          {
            id: 'test-trigger',
            type: 'manual-trigger',
            data: { 
              type: 'manual-trigger', 
              label: 'Test Trigger',
              properties: { message: testMessage }
            }
          },
          {
            id: 'test-model',
            type: node.data.type,
            data: { 
              type: node.data.type, 
              label: 'Test Model',
              properties: { ...properties, [propKey]: apiKey }
            }
          }
        ],
        edges: [
          {
            id: 'test-edge',
            source: 'test-trigger',
            target: 'test-model',
            sourceHandle: 'main',
            targetHandle: 'main'
          }
        ]
      };

      // First create the workflow in the backend
      const createResponse = await fetch('/api/workflows/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Workflow',
          description: 'Test workflow for API key validation',
          nodes: testWorkflow.nodes,
          edges: testWorkflow.edges
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create test workflow: ${createResponse.status}`);
      }

      const createdWorkflow = await createResponse.json();
      console.log(`📝 Created test workflow: ${createdWorkflow.id}`);

      // Execute the test workflow
      const response = await fetch(`/api/workflows/${createdWorkflow.id}/execute/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trigger_data: { message: testMessage },
          credentials: {}
        })
      });

      console.log(`📡 API Test Response status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`📡 API Test Response data:`, result);
        
        // Log the execution results
        if (result.execution_results) {
          console.log(`🎯 Execution Results:`, result.execution_results);
          
          // Find the model node result
          const modelResult = result.execution_results.find(r => r.node_id === 'test-model');
          if (modelResult) {
            console.log(`🤖 Model Response:`, modelResult.output);
            console.log(`📊 Model Status:`, modelResult.status);
            
            if (modelResult.output && modelResult.output.response) {
              console.log(`💬 Chat Response:`, modelResult.output.response);
            }
          }
        }
        
        console.log(`✅ API test completed successfully!`);
        
        // Clean up: delete the test workflow
        try {
          await fetch(`/api/workflows/${createdWorkflow.id}/`, {
            method: 'DELETE'
          });
          console.log(`🗑️ Cleaned up test workflow`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup test workflow:`, cleanupError);
        }
      } else {
        let error;
        try {
          error = await response.json();
        } catch (e) {
          error = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error(`❌ API test failed:`, error);
        
        // Clean up on error too
        try {
          await fetch(`/api/workflows/${createdWorkflow.id}/`, {
            method: 'DELETE'
          });
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup test workflow:`, cleanupError);
        }
      }
    } catch (error) {
      console.error(`❌ API test error:`, error);
    } finally {
      setTestingKeys(prev => ({ ...prev, [propKey]: false }));
    }
  };

  const renderPropertyInput = (propKey, propDef) => {
    const value = inputValues[propKey] ?? properties[propKey] ?? propDef.default;

    // Check showIf condition
    if (propDef.showIf) {
      const [condKey, condValues] = Object.entries(propDef.showIf)[0];
      const currentCondValue = properties[condKey] ?? nodeTypeDef.properties[condKey]?.default;
      if (!condValues.includes(currentCondValue)) {
        return null;
      }
    }

    switch (propDef.type) {
      case 'text':
      case 'password':
        const isApiKey = propKey.includes('api_key') || propKey.includes('key');
        const validationState = validationStates[propKey];
        const isTesting = testingKeys[propKey];
        
        return (
          <div className="api-key-input-container">
            <div className="api-key-input-wrapper">
              <input
                type={isApiKey && !showApiKey[propKey] ? 'password' : 'text'}
                value={value}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  console.log(`📝 Input event: "${inputValue}"`);
                  if (isApiKey) {
                    handleApiKeyChange(propKey, inputValue);
                  } else {
                    handlePropertyChange(propKey, inputValue);
                  }
                }}
                onPaste={(e) => {
                  if (isApiKey) {
                    e.preventDefault();
                    const pastedText = e.clipboardData.getData('text');
                    console.log(`📋 Paste event: "${pastedText}"`);
                    handleApiKeyChange(propKey, pastedText);
                  }
                }}
                placeholder={propDef.placeholder}
                required={propDef.required}
                className={`api-key-input ${validationState ? `api-key-${validationState}` : ''}`}
              />
              {isApiKey && (
                <button
                  type="button"
                  className="api-key-toggle-btn"
                  onClick={() => {
                    setShowApiKey(prev => ({
                      ...prev,
                      [propKey]: !prev[propKey]
                    }));
                  }}
                  title={showApiKey[propKey] ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey[propKey] ? '👁️' : '👁️‍🗨️'}
                </button>
              )}
            </div>
             {isApiKey && (
               <div className="api-key-status">
                 {isTesting && (
                   <div className="api-key-testing">
                     <div className="spinner"></div>
                     <span>Testing API key...</span>
                   </div>
                 )}
                 {validationState === 'valid' && (
                   <div className="api-key-valid">
                     ✅ API key is valid
                   </div>
                 )}
                 {validationState === 'invalid' && (
                   <div className="api-key-invalid">
                     ❌ API key is invalid
                     {properties[propKey]?.error && (
                       <div className="api-key-error-details">
                         {properties[propKey].error}
                       </div>
                     )}
                   </div>
                 )}
                 {validationState === 'valid' && (
                   <button
                     type="button"
                     className="execute-test-btn"
                     onClick={() => executeApiTest(propKey)}
                     disabled={isTesting}
                   >
                     🚀 Execute Test
                   </button>
                 )}
               </div>
             )}
          </div>
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handlePropertyChange(propKey, e.target.value)}
            placeholder={propDef.placeholder}
            rows={4}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handlePropertyChange(propKey, parseInt(e.target.value))}
            min={propDef.min}
            max={propDef.max}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handlePropertyChange(propKey, e.target.value)}
          >
            {propDef.options.map((opt, index) => {
              // Handle both string options and object options
              if (typeof opt === 'string') {
                return <option key={opt} value={opt}>{opt}</option>;
              } else if (typeof opt === 'object' && opt.value && opt.label) {
                return <option key={opt.value} value={opt.value}>{opt.label}</option>;
              } else {
                return <option key={index} value={opt}>{opt}</option>;
              }
            })}
          </select>
        );

      case 'multiselect':
        return (
          <div className="multiselect">
            {propDef.options.map((opt, index) => {
              const optValue = typeof opt === 'object' && opt.value ? opt.value : opt;
              const optLabel = typeof opt === 'object' && opt.label ? opt.label : opt;
              const optKey = typeof opt === 'object' && opt.value ? opt.value : opt;
              
              return (
                <label key={optKey} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={(value || []).includes(optValue)}
                    onChange={(e) => {
                      const current = value || [];
                      const newValue = e.target.checked
                        ? [...current, optValue]
                        : current.filter(v => v !== optValue);
                      handlePropertyChange(propKey, newValue);
                    }}
                  />
                  {optLabel}
                </label>
              );
            })}
          </div>
        );

      case 'boolean':
        return (
          <label className="switch">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handlePropertyChange(propKey, e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        );

      case 'credentials':
        const credentials = credentialsManager.getCredentialsByType(propDef.credentialType);
        return (
          <div className="credentials-field">
            <select
              value={value || ''}
              onChange={(e) => handlePropertyChange(propKey, e.target.value)}
            >
              <option value="">-- Select Credential --</option>
              {credentials.map(cred => (
                <option key={cred.id} value={cred.id}>{cred.name}</option>
              ))}
            </select>
          </div>
        );

      case 'keyValue':
        const kvPairs = value || [];
        return (
          <div className="key-value-list">
            {kvPairs.map((pair, idx) => (
              <div key={idx} className="key-value-pair">
                <input
                  type="text"
                  placeholder="Key"
                  value={pair.key || ''}
                  onChange={(e) => {
                    const newPairs = [...kvPairs];
                    newPairs[idx] = { ...pair, key: e.target.value };
                    handlePropertyChange(propKey, newPairs);
                  }}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={pair.value || ''}
                  onChange={(e) => {
                    const newPairs = [...kvPairs];
                    newPairs[idx] = { ...pair, value: e.target.value };
                    handlePropertyChange(propKey, newPairs);
                  }}
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
              onClick={() => handlePropertyChange(propKey, [...kvPairs, { key: '', value: '' }])}
            >
              <FiPlus /> Add Pair
            </button>
          </div>
        );

      case 'json':
      case 'code':
        return (
          <textarea
            value={value}
            onChange={(e) => handlePropertyChange(propKey, e.target.value)}
            className="code-editor"
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
          />
        );
    }
  };

  return (
    <div className="property-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="node-icon-large">{nodeTypeDef?.icon}</span>
          <div>
            <h3>{nodeTypeDef?.name}</h3>
            <p className="node-category">{nodeTypeDef?.category}</p>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          <FiX />
        </button>
      </div>

      <div className="panel-body">
        <div className="property-group">
          <label className="property-label">Node Name</label>
          <input
            type="text"
            value={nodeName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={nodeTypeDef?.name}
          />
        </div>

        {nodeTypeDef?.properties && Object.entries(nodeTypeDef.properties).map(([key, propDef]) => (
          <div key={key} className="property-group">
            <label className="property-label">
              {propDef.label}
              {propDef.required && <span className="required">*</span>}
            </label>
            {renderPropertyInput(key, propDef)}
            {propDef.description && (
              <small className="property-description">{propDef.description}</small>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .property-panel {
          position: fixed;
          right: 0;
          top: 0;
          width: 360px;
          height: 100vh;
          background: var(--surface);
          border-left: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 10;
        }

        .panel-header {
          padding: 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .panel-title {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .node-icon-large {
          font-size: 28px;
        }

        .panel-title h3 {
          margin: 0;
          font-size: 18px;
          color: var(--text);
        }

        .node-category {
          margin: 4px 0 0 0;
          font-size: 11px;
          color: var(--textSecondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--textSecondary);
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          color: var(--text);
          background: var(--hover);
        }

        .panel-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .property-group {
          margin-bottom: 20px;
        }

        .property-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          font-size: 14px;
          color: var(--text);
        }

        .required {
          color: #ef4444;
          margin-left: 4px;
        }

        .property-description {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: var(--textSecondary);
        }

        input[type="text"],
        input[type="number"],
        input[type="password"],
        select,
        textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          background: var(--background);
          color: var(--text);
          transition: all 0.2s;
        }

        input:focus,
        select:focus,
        textarea:focus {
          outline: none;
          border-color: var(--text);
        }

        textarea {
          resize: vertical;
        }

        .code-editor {
          font-family: 'Courier New', monospace;
          font-size: 13px;
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 26px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--border);
          transition: 0.3s;
          border-radius: 26px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 4px;
          bottom: 4px;
          background-color: var(--background);
          transition: 0.3s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: var(--text);
        }

        input:checked + .slider:before {
          transform: translateX(24px);
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
          font-size: 14px;
          cursor: pointer;
          color: var(--text);
        }

        .checkbox-label input[type="checkbox"] {
          width: auto;
        }

        .credentials-field {
          display: flex;
          gap: 8px;
        }

        .credentials-field select {
          flex: 1;
        }

        .btn-add {
          padding: 8px 12px;
          background: var(--text);
          color: var(--background);
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          font-weight: 500;
        }

        .btn-add:hover {
          opacity: 0.9;
        }

        .key-value-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .key-value-pair {
          display: flex;
          gap: 8px;
        }

        .key-value-pair input {
          flex: 1;
        }

        .btn-icon {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          width: 36px;
          height: 36px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

         .btn-icon:hover {
           background: #dc2626;
         }

         .execute-test-btn {
           margin-top: 8px;
           padding: 8px 16px;
           background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
           color: white;
           border: none;
           border-radius: 6px;
           cursor: pointer;
           font-size: 13px;
           font-weight: 500;
           display: flex;
           align-items: center;
           gap: 6px;
           transition: all 0.2s;
           width: 100%;
           justify-content: center;
         }

         .execute-test-btn:hover:not(:disabled) {
           transform: translateY(-1px);
           box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
         }

         .execute-test-btn:disabled {
           opacity: 0.6;
           cursor: not-allowed;
           transform: none;
         }

         @media (max-width: 768px) {
           .property-panel {
             width: 100%;
           }
         }
      `}</style>
    </div>
  );
};

export default PropertyPanel;
