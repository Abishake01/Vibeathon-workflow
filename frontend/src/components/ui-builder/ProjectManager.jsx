import { useState, useEffect } from 'react';
import { FiX, FiFolder, FiTrash2, FiDownload, FiUpload, FiPlus, FiClock } from 'react-icons/fi';
import './ProjectManager.css';

function ProjectManager({ isOpen, onClose, onLoadProject, currentProject }) {
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // date, name

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = () => {
    const savedProjects = [];
    
    // Load all projects from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('gjsProject_')) {
        try {
          const projectData = JSON.parse(localStorage.getItem(key));
          savedProjects.push({
            ...projectData,
            id: key,
            name: projectData.projectName || key.replace('gjsProject_', '')
          });
        } catch (error) {
          console.error('Error loading project:', key, error);
        }
      }
    }

    // Sort projects
    savedProjects.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.savedAt) - new Date(a.savedAt);
      } else {
        return a.name.localeCompare(b.name);
      }
    });

    setProjects(savedProjects);
  };

  const handleLoadProject = (project) => {
    if (currentProject?.hasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to load a different project?')) {
        return;
      }
    }

    onLoadProject(project);
  };

  const handleDeleteProject = (projectId, e) => {
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      localStorage.removeItem(projectId);
      loadProjects();
    }
  };

  const handleExportProject = (project, e) => {
    e.stopPropagation();
    
    const dataStr = JSON.stringify(project, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${project.name}_${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const project = JSON.parse(event.target.result);
          const projectId = `gjsProject_${project.projectName || Date.now()}`;
          
          localStorage.setItem(projectId, JSON.stringify(project));
          loadProjects();
          
          // Show success notification
          const toast = document.createElement('div');
          toast.className = 'toast-notification success';
          toast.textContent = '✅ Project imported successfully!';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 3000);
        } catch (error) {
          alert('Failed to import project: ' + error.message);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container project-manager-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <FiFolder />
            <h2>Project Manager</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Toolbar */}
          <div className="project-toolbar">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            
            <div className="toolbar-actions">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  loadProjects();
                }}
                className="sort-select"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
              </select>
              
              <button className="btn btn-secondary" onClick={handleImportProject}>
                <FiUpload />
                Import
              </button>
            </div>
          </div>

          {/* Projects List */}
          <div className="projects-list">
            {filteredProjects.length === 0 ? (
              <div className="empty-state">
                <FiFolder className="empty-icon" />
                <h3>No Projects Found</h3>
                <p>Create your first project or import an existing one</p>
              </div>
            ) : (
              filteredProjects.map(project => (
                <div
                  key={project.id}
                  className={`project-card ${currentProject?.projectName === project.name ? 'active' : ''}`}
                  onClick={() => handleLoadProject(project)}
                >
                  <div className="project-info">
                    <h3 className="project-name">{project.name}</h3>
                    <div className="project-meta">
                      <span className="project-date">
                        <FiClock />
                        {new Date(project.savedAt).toLocaleDateString()}
                      </span>
                      {currentProject?.projectName === project.name && (
                        <span className="current-badge">Current</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="project-actions">
                    <button
                      className="action-btn export-btn"
                      onClick={(e) => handleExportProject(project, e)}
                      title="Export Project"
                    >
                      <FiDownload />
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      title="Delete Project"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="footer-info">
            <span>{filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}</span>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectManager;

