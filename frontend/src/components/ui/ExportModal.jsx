import React, { useState } from 'react';
import { FiX, FiDownload, FiServer, FiShield, FiShieldOff } from 'react-icons/fi';

const ExportModal = ({ isOpen, onClose, onExport }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingType, setExportingType] = useState(null);

  const handleExport = async (exportType) => {
    setIsExporting(true);
    setExportingType(exportType);
    try {
      await onExport(exportType);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <h2>Export Workflow</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="export-modal-content">
          <p className="export-description">
            Choose how you want to export your workflow:
          </p>

          <div className="export-options">
            <div 
              className={`export-option ${isExporting ? 'disabled' : ''} ${exportingType === 'with-credentials' ? 'exporting' : ''}`}
              onClick={isExporting ? null : () => handleExport('with-credentials')}
            >
              <div className="export-option-icon">
                {exportingType === 'with-credentials' ? (
                  <div className="spinner"></div>
                ) : (
                  <FiShield />
                )}
              </div>
              <div className="export-option-content">
                <h3>Download with Credentials Stored</h3>
                <p>Includes API keys and sensitive data. Use for personal backups or trusted environments.</p>
              </div>
              <div className="export-option-action">
                <FiDownload />
              </div>
            </div>

            <div 
              className={`export-option ${isExporting ? 'disabled' : ''} ${exportingType === 'without-credentials' ? 'exporting' : ''}`}
              onClick={isExporting ? null : () => handleExport('without-credentials')}
            >
              <div className="export-option-icon">
                {exportingType === 'without-credentials' ? (
                  <div className="spinner"></div>
                ) : (
                  <FiShieldOff />
                )}
              </div>
              <div className="export-option-content">
                <h3>Download without Credentials</h3>
                <p>Excludes API keys and sensitive data. Safe for sharing or public repositories.</p>
              </div>
              <div className="export-option-action">
                <FiDownload />
              </div>
            </div>

            <div 
              className={`export-option ${isExporting ? 'disabled' : ''} ${exportingType === 'save-to-server' ? 'exporting' : ''}`}
              onClick={isExporting ? null : () => handleExport('save-to-server')}
            >
              <div className="export-option-icon">
                {exportingType === 'save-to-server' ? (
                  <div className="spinner"></div>
                ) : (
                  <FiServer />
                )}
              </div>
              <div className="export-option-content">
                <h3>Save to Server</h3>
                <p>Save workflow to the backend server for later retrieval and sharing.</p>
              </div>
              <div className="export-option-action">
                <FiServer />
              </div>
            </div>
          </div>

          {isExporting && (
            <div className="export-loading">
              <div className="spinner"></div>
              <p>Exporting workflow...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
