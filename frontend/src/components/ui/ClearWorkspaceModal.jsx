import React from 'react';
import { FiX, FiTrash2, FiAlertTriangle } from 'react-icons/fi';

const ClearWorkspaceModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content clear-workspace-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FiAlertTriangle className="warning-icon" />
            <span>Clear Workspace</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="warning-message">
            <p className="warning-text">
              This will remove <strong>ALL nodes and edges</strong> from the current workspace.
            </p>
            <p className="warning-subtext">
              This action cannot be undone. Make sure you have exported your workflow if you want to save it.
            </p>
          </div>
          
          <div className="workspace-preview">
            <div className="preview-icon">
              <FiTrash2 />
            </div>
            <div className="preview-text">
              <p>Current workspace will be completely cleared</p>
              <p className="preview-subtext">All nodes, connections, and execution history will be removed</p>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            <FiTrash2 />
            Clear Workspace
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClearWorkspaceModal;
