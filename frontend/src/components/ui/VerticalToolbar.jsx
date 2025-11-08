import React from 'react';
import { FiDownload, FiUpload, FiEdit3, FiTrash2, FiZap } from 'react-icons/fi';

const VerticalToolbar = ({ onExport, onImport, onAddNotes, onOpenAI, onClearWorkspace, onMagic }) => {
  return (
    <div className="vertical-toolbar">
      <div className="toolbar-button" title="Export Workflow" onClick={onExport}>
        <FiDownload />
      </div>
      
      <div className="toolbar-button" title="Import Workflow" onClick={onImport}>
        <FiUpload />
      </div>
      
      <div className="toolbar-button" title="Clear Workspace" onClick={onClearWorkspace}>
        <FiTrash2 />
      </div>

      <div className="toolbar-button" title="Add Notes" onClick={onAddNotes}>
        <FiEdit3 />
      </div>
      
      <div className="toolbar-button" title="AI/Magic features" onClick={onMagic}>
        <FiZap />
      </div>
    </div>
  );
};

export default VerticalToolbar;
