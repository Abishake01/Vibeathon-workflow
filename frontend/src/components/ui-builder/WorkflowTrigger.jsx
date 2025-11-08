/**
 * WorkflowTrigger Component
 * A React component that can be embedded in GrapesJS pages to trigger n8n workflows
 */
import { useState, useEffect, useRef } from 'react';
import apiService from '../../services/api';

function WorkflowTrigger({ 
  webhookUrl, 
  workflowId, 
  secret,
  buttonText = 'Run Workflow',
  buttonStyle = {},
  onSuccess,
  onError,
  onUpdate,
  showStatus = true,
  waitForResult = false
}) {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [runId, setRunId] = useState(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleTrigger = async () => {
    if (!webhookUrl) {
      setStatus('error');
      setMessage('Webhook URL is not configured');
      if (onError) onError(new Error('Webhook URL is not configured'));
      return;
    }

    setStatus('loading');
    setMessage('Triggering workflow...');

    try {
      // Collect form data from the page
      const formData = collectFormData();
      
      const response = await apiService.runN8nWorkflow(
        webhookUrl,
        {
          formData,
          componentId: 'workflow-trigger',
          timestamp: new Date().toISOString()
        },
        {
          workflowId,
          secret,
          waitForResult
        }
      );

      setRunId(response.run_id);
      setStatus(response.status === 'accepted' ? 'success' : 'loading');
      setMessage(response.message || 'Workflow triggered successfully');

      if (onSuccess) {
        onSuccess(response);
      }

      // If waitForResult is true, subscribe to updates
      if (waitForResult && response.run_id) {
        subscribeToUpdates(response.run_id);
      } else if (response.status === 'accepted') {
        // Quick response - workflow accepted
        setStatus('success');
        setMessage('Workflow triggered successfully');
      }

    } catch (error) {
      console.error('Error triggering workflow:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to trigger workflow');
      if (onError) onError(error);
    }
  };

  const collectFormData = () => {
    // Collect data from form inputs on the page
    const formData = {};
    const form = document.querySelector('form');
    
    if (form) {
      const formElements = form.elements;
      for (let element of formElements) {
        if (element.name && element.value) {
          formData[element.name] = element.value;
        }
      }
    }

    // Also collect data from elements with data-workflow-field attribute
    const workflowFields = document.querySelectorAll('[data-workflow-field]');
    workflowFields.forEach(field => {
      const fieldName = field.getAttribute('data-workflow-field');
      const fieldValue = field.value || field.textContent || field.innerText;
      if (fieldName && fieldValue) {
        formData[fieldName] = fieldValue;
      }
    });

    return formData;
  };

  const subscribeToUpdates = (runId) => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Subscribe to real-time updates
    const eventSource = apiService.subscribeToWorkflowUpdates(runId, (update) => {
      setMessage(update.message || `Step: ${update.step} - ${update.state}`);
      
      if (onUpdate) {
        onUpdate(update);
      }

      if (update.state === 'done') {
        setStatus('success');
        setMessage('Workflow completed successfully');
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      } else if (update.state === 'error') {
        setStatus('error');
        setMessage(update.message || 'Workflow failed');
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      }
    });

    eventSourceRef.current = eventSource;
  };

  const defaultButtonStyle = {
    padding: '12px 24px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: status === 'loading' ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.2s',
    opacity: status === 'loading' ? 0.7 : 1,
    ...buttonStyle
  };

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        onClick={handleTrigger}
        disabled={status === 'loading'}
        style={defaultButtonStyle}
        onMouseEnter={(e) => {
          if (status !== 'loading') {
            e.target.style.backgroundColor = '#5568d3';
          }
        }}
        onMouseLeave={(e) => {
          if (status !== 'loading') {
            e.target.style.backgroundColor = defaultButtonStyle.backgroundColor;
          }
        }}
      >
        {status === 'loading' ? '⏳ Running...' : buttonText}
      </button>
      
      {showStatus && message && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          backgroundColor: 
            status === 'success' ? '#d1fae5' :
            status === 'error' ? '#fee2e2' :
            '#e0e7ff',
          color:
            status === 'success' ? '#065f46' :
            status === 'error' ? '#991b1b' :
            '#3730a3'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

export default WorkflowTrigger;

