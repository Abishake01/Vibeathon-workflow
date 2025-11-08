import { useState } from 'react';
import { FiChevronDown, FiChevronRight, FiX } from 'react-icons/fi';
import { BsCheckCircle, BsXCircle, BsPlayCircle, BsStopCircle } from 'react-icons/bs';

const ExecutionViewer = ({ execution, onClose }) => {
  const [selectedNode, setSelectedNode] = useState(null);

  if (!execution) return null;

  const nodeStates = Object.entries(execution.nodeStates || {});

  const getStatusBadge = () => {
    const statusConfig = {
      running: { icon: <BsPlayCircle />, label: 'Running', class: 'running' },
      completed: { icon: <BsCheckCircle />, label: 'Completed', class: 'completed' },
      error: { icon: <BsXCircle />, label: 'Error', class: 'error' },
      stopped: { icon: <BsStopCircle />, label: 'Stopped', class: 'stopped' },
    };

    const config = statusConfig[execution.status] || statusConfig.stopped;

    return (
      <span className={`status-badge ${config.class}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  return (
    <div className="execution-viewer">
      <div className="viewer-header">
        <div>
          <h3>Execution Details</h3>
          <p className="execution-id">{execution.id}</p>
        </div>
        <div className="header-actions">
          <div className="execution-status">
            {getStatusBadge()}
          </div>
          <button className="close-btn" onClick={onClose} title="Close">
            <FiX />
          </button>
        </div>
      </div>

      <div className="viewer-body">
        <div className="execution-info">
          <div className="info-item">
            <span className="info-label">Started</span>
            <span className="info-value">
              {new Date(execution.startedAt).toLocaleTimeString()}
            </span>
          </div>
          {execution.finishedAt && (
            <>
              <div className="info-item">
                <span className="info-label">Finished</span>
                <span className="info-value">
                  {new Date(execution.finishedAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Duration</span>
                <span className="info-value">
                  {(() => {
                    const start = new Date(execution.startedAt);
                    const end = new Date(execution.finishedAt);
                    const duration = end.getTime() - start.getTime();
                    
                    if (duration < 1000) return `${Math.round(duration)}ms`;
                    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
                    return `${Math.round(duration / 1000)}s`;
                  })()}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="node-states">
          <h4>Node States</h4>
          {nodeStates.length === 0 && (
            <p className="empty-state">No execution data yet</p>
          )}
          {nodeStates.map(([nodeId, state]) => (
            <div
              key={nodeId}
              className={`node-state-item ${selectedNode === nodeId ? 'active' : ''}`}
              onClick={() => setSelectedNode(selectedNode === nodeId ? null : nodeId)}
            >
              <div className="node-state-header">
                <span className="expand-icon">
                  {selectedNode === nodeId ? <FiChevronDown /> : <FiChevronRight />}
                </span>
                <span className={`state-icon ${state.status}`}>
                  {state.status === 'running' && <BsPlayCircle />}
                  {state.status === 'completed' && <BsCheckCircle />}
                  {state.status === 'error' && <BsXCircle />}
                </span>
                <span className="node-id">{nodeId}</span>
                <span className={`status-text ${state.status}`}>{state.status}</span>
              </div>

              {selectedNode === nodeId && (
                <div className="node-state-details">
                  {state.input && (
                    <div className="detail-section">
                      <strong>Input:</strong>
                      <pre>{JSON.stringify(state.input, null, 2)}</pre>
                    </div>
                  )}
                  {state.output && (
                    <div className="detail-section">
                      <strong>Output:</strong>
                      <pre>{JSON.stringify(state.output, null, 2)}</pre>
                    </div>
                  )}
                  {state.error && (
                    <div className="detail-section error">
                      <strong>Error:</strong>
                      <pre>{state.error}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .execution-viewer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 300px;
          background: var(--surface);
          border-top: 2px solid var(--border);
          z-index: 20;
          display: flex;
          flex-direction: column;
        }

        .viewer-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 18px;
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

        .viewer-header h3 {
          margin: 0;
          font-size: 16px;
          color: var(--text);
        }

        .execution-id {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: var(--textSecondary);
          font-family: monospace;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-badge.running {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.completed {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.error {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-badge.stopped {
          background: var(--hover);
          color: var(--text);
        }

        .viewer-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
        }

        .execution-info {
          display: flex;
          gap: 24px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-label {
          font-size: 11px;
          color: var(--textSecondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
        }

        .info-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }

        .node-states h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: var(--text);
        }

        .empty-state {
          color: var(--textSecondary);
          font-size: 14px;
          text-align: center;
          padding: 20px;
        }

        .node-state-item {
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .node-state-item:hover {
          border-color: var(--text);
        }

        .node-state-item.active {
          border-color: var(--text);
        }

        .node-state-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .expand-icon {
          color: var(--textSecondary);
          display: flex;
          align-items: center;
        }

        .state-icon {
          font-size: 16px;
          display: flex;
          align-items: center;
        }

        .state-icon.running {
          color: #f59e0b;
        }

        .state-icon.completed {
          color: #10b981;
        }

        .state-icon.error {
          color: #ef4444;
        }

        .node-id {
          flex: 1;
          font-weight: 500;
          font-size: 13px;
          color: var(--text);
          font-family: monospace;
        }

        .status-text {
          font-size: 12px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-text.running {
          background: #fef3c7;
          color: #92400e;
        }

        .status-text.completed {
          background: #d1fae5;
          color: #065f46;
        }

        .status-text.error {
          background: #fee2e2;
          color: #991b1b;
        }

        .node-state-details {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }

        .detail-section {
          margin-bottom: 12px;
        }

        .detail-section strong {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          color: var(--textSecondary);
        }

        .detail-section pre {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 8px;
          font-size: 11px;
          overflow-x: auto;
          max-height: 150px;
          margin: 0;
          color: var(--text);
        }

        .detail-section.error pre {
          background: #fee2e2;
          border-color: #ef4444;
          color: #991b1b;
        }

        @media (max-width: 768px) {
          .execution-viewer {
            height: 250px;
          }

          .execution-info {
            flex-wrap: wrap;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default ExecutionViewer;
