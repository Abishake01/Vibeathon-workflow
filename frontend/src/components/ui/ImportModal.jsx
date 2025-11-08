import React, { useState, useEffect } from 'react';
import { FiX, FiUpload, FiServer, FiFile, FiRefreshCw } from 'react-icons/fi';

const ImportModal = ({ isOpen, onClose, onImport }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [serverWorkflows, setServerWorkflows] = useState([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  // Load server workflows when modal opens
  useEffect(() => {
    if (isOpen) {
      loadServerWorkflows();
    }
  }, [isOpen]);

  const loadServerWorkflows = async () => {
    setLoadingServer(true);
    try {
      const response = await fetch('/api/exported-workflows/');
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response format
        const workflows = data.results || data;
        // Ensure workflows is always an array
        setServerWorkflows(Array.isArray(workflows) ? workflows : []);
      } else if (response.status === 404) {
        console.log('No exported workflows API endpoint found - backend may not be running');
        setServerWorkflows([]);
      } else {
        console.error('Failed to load exported workflows:', response.status, response.statusText);
        setServerWorkflows([]);
      }
    } catch (error) {
      console.error('Error loading exported workflows:', error);
      // If it's a network error, the backend might not be running
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.log('Backend server may not be running');
      }
      setServerWorkflows([]);
    } finally {
      setLoadingServer(false);
    }
  };

  const handleLocalImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const workflowData = JSON.parse(e.target.result);
          setIsImporting(true);
          await onImport('local', workflowData);
          onClose();
        } catch (error) {
          console.error('Error parsing workflow file:', error);
          alert('Error parsing workflow file. Please check the file format.');
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleServerImport = async (workflow) => {
    setIsImporting(true);
    try {
      // Fetch the full workflow data (including nodes and edges)
      const response = await fetch(`/api/exported-workflows/${workflow.id}/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch workflow details: ${response.status} ${response.statusText}`);
      }
      
      const fullWorkflowData = await response.json();
      console.log('🔍 Full workflow data fetched:', fullWorkflowData);
      
      // Validate that we have the required data
      if (!fullWorkflowData.nodes || !fullWorkflowData.edges) {
        throw new Error('Workflow data is incomplete - missing nodes or edges');
      }
      
      // Increment import count on server
      await fetch(`/api/exported-workflows/${workflow.id}/import_workflow/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      await onImport('server', fullWorkflowData);
      onClose();
    } catch (error) {
      console.error('Error importing server workflow:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="import-modal-overlay" onClick={onClose}>
      <div className="import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="import-modal-header">
          <h2>Import Workflow</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="import-modal-content">
          <div className="import-options">
            {/* Local File Import */}
            <div className="import-option">
              <div className="import-option-icon">
                <FiUpload />
              </div>
              <div className="import-option-content">
                <h3>Import from Local File</h3>
                <p>Upload a workflow JSON file from your computer</p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleLocalImport}
                  style={{ display: 'none' }}
                  id="local-file-input"
                />
                <label htmlFor="local-file-input" className="file-input-label">
                  <FiFile />
                  Choose JSON File
                </label>
              </div>
            </div>

            {/* Server Workflows */}
            <div className="import-option">
              <div className="import-option-icon">
                <FiServer />
              </div>
              <div className="import-option-content">
                <div className="server-header">
                  <h3>Import from Exported Workflows</h3>
                  <button 
                    className="refresh-btn" 
                    onClick={loadServerWorkflows}
                    disabled={loadingServer}
                  >
                    <FiRefreshCw className={loadingServer ? 'spinning' : ''} />
                  </button>
                </div>
                <p>Import workflows from the exported workflows database</p>
                
                {loadingServer ? (
                  <div className="loading-server">
                    <div className="spinner"></div>
                    <span>Loading exported workflows...</span>
                  </div>
                ) : !Array.isArray(serverWorkflows) || serverWorkflows.length === 0 ? (
                  <div className="no-workflows">
                    <p>No exported workflows found</p>
                    <p className="server-hint">Export some workflows first or make sure the backend server is running</p>
                  </div>
                ) : (
                  <div className="server-workflows">
                    {serverWorkflows.map((workflow) => (
                      <div 
                        key={workflow.id} 
                        className={`workflow-item ${selectedWorkflow?.id === workflow.id ? 'selected' : ''}`}
                        onClick={() => setSelectedWorkflow(workflow)}
                      >
                        <div className="workflow-info">
                          <h4>{workflow.name}</h4>
                          <p className="workflow-description">{workflow.description}</p>
                          <p className="workflow-meta">
                            Created: {formatDate(workflow.exported_at)} • 
                            Nodes: {workflow.nodes?.length || 0} • 
                            Type: {workflow.export_type} • 
                            Downloads: {workflow.download_count || 0}
                          </p>
                          {workflow.category && (
                            <p className="workflow-category">Category: {workflow.category}</p>
                          )}
                        </div>
                        <button 
                          className="import-workflow-btn"
                          onClick={() => handleServerImport(workflow)}
                          disabled={isImporting}
                        >
                          Import
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isImporting && (
            <div className="import-loading">
              <div className="spinner"></div>
              <p>Importing workflow...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
