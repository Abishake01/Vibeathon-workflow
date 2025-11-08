import { useState } from 'react';
import {
  FiSave,
  FiDownload,
  FiUpload,
  FiEye,
  FiMaximize,
  FiRotateCcw,
  FiRotateCw,
  FiTrash2,
  FiMonitor,
  FiTablet,
  FiSmartphone,
  FiFolder,
  FiGrid,
  FiLayout,
  FiSun,
  FiMoon
} from 'react-icons/fi';
import { useTheme } from '../../theme';
import { useNavigation } from '../../router/AppRouter';
import './PageBuilderToolbar.css';

function PageBuilderToolbar({
  projectName,
  onProjectNameChange,
  activeDevice,
  onDeviceChange,
  onSave,
  onExport,
  onImportWidget,
  onPreview,
  onFullscreen,
  onUndo,
  onRedo,
  onClear,
  onProjectManager,
  hasChanges,
  isPreviewMode
}) {
  const { theme, toggleTheme } = useTheme();
  const { navigateToBuilder } = useNavigation();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);

  const handleNameSubmit = () => {
    if (tempName.trim()) {
      onProjectNameChange(tempName.trim());
    } else {
      setTempName(projectName);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setTempName(projectName);
      setIsEditingName(false);
    }
  };

  return (
    <div className="page-builder-toolbar">
      {/* Left Section - Navigation Tabs & Project Name */}
      <div className="toolbar-section toolbar-left">
        {/* Navigation Tabs */}
        <div className="builder-nav-tabs">
          <button
            className="builder-nav-tab"
            onClick={() => navigateToBuilder('workflow')}
            title="Workflow Builder"
          >
            <FiGrid />
            <span>Workflow Builder</span>
          </button>
          <button
            className="builder-nav-tab active"
            onClick={() => navigateToBuilder('page-builder')}
            title="Page Builder"
          >
            <FiLayout />
            <span>Page Builder</span>
          </button>
        </div>
        
        {isEditingName ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleNameKeyDown}
            className="project-name-input"
            autoFocus
          />
        ) : (
          <button
            className="project-name-btn"
            onClick={() => setIsEditingName(true)}
            title="Click to edit project name"
          >
            <span className="project-name">{projectName}</span>
            {hasChanges && <span className="unsaved-indicator">●</span>}
          </button>
        )}
      </div>

      {/* Center Section - Device Switcher */}
      <div className="toolbar-section toolbar-center">
        <div className="device-switcher">
          <button
            className={`device-btn ${activeDevice === 'Desktop' ? 'active' : ''}`}
            onClick={() => onDeviceChange('Desktop')}
            title="Desktop View"
          >
            <FiMonitor />
            <span>Desktop</span>
          </button>
          <button
            className={`device-btn ${activeDevice === 'Tablet' ? 'active' : ''}`}
            onClick={() => onDeviceChange('Tablet')}
            title="Tablet View"
          >
            <FiTablet />
            <span>Tablet</span>
          </button>
          <button
            className={`device-btn ${activeDevice === 'Mobile' ? 'active' : ''}`}
            onClick={() => onDeviceChange('Mobile')}
            title="Mobile View"
          >
            <FiSmartphone />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="toolbar-section toolbar-right">
        <div className="toolbar-actions">
          {/* Undo/Redo */}
          <button className="toolbar-btn" onClick={onUndo} title="Undo (Ctrl+Z)">
            <FiRotateCcw />
          </button>
          <button className="toolbar-btn" onClick={onRedo} title="Redo (Ctrl+Y)">
            <FiRotateCw />
          </button>

          <div className="toolbar-divider" />

          {/* Preview */}
          <button
            className={`toolbar-btn ${isPreviewMode ? 'active' : ''}`}
            onClick={onPreview}
            title="Preview Mode"
          >
            <FiEye />
          </button>

          {/* Fullscreen */}
          <button className="toolbar-btn" onClick={onFullscreen} title="Fullscreen">
            <FiMaximize />
          </button>

          <div className="toolbar-divider" />

          {/* Import Widget */}
          <button className="toolbar-btn" onClick={onImportWidget} title="Import Widget">
            <FiUpload />
            <span>Import</span>
          </button>

          {/* Export */}
          <button className="toolbar-btn" onClick={onExport} title="Export Code">
            <FiDownload />
            <span>Export</span>
          </button>

          {/* Projects */}
          <button className="toolbar-btn" onClick={onProjectManager} title="Manage Projects">
            <FiFolder />
            <span>Projects</span>
          </button>

          <div className="toolbar-divider" />

          {/* Theme Toggle */}
          <button 
            className="toolbar-btn icon-only" 
            onClick={toggleTheme} 
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <FiMoon /> : <FiSun />}
          </button>

          {/* Save */}
          <button
            className={`toolbar-btn primary ${hasChanges ? 'has-changes' : ''}`}
            onClick={onSave}
            title="Save Project (Ctrl+S)"
          >
            <FiSave />
            <span>Save</span>
          </button>

          {/* Clear Canvas */}
          <button 
            className="toolbar-btn danger clear-canvas-btn" 
            onClick={onClear} 
            title="Clear Entire Canvas (Delete All)"
          >
            <FiTrash2 />
            <span>Clear Canvas</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default PageBuilderToolbar;

