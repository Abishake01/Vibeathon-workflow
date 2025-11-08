import { useState, useEffect } from 'react';
import './ProjectManager.css';

function ProjectManager({ isOpen, onClose, onLoadProject, currentProject }) {
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');

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

    // Also check for default gjsProject
    const defaultProject = localStorage.getItem('gjsProject');
    if (defaultProject) {
      try {
        const projectData = JSON.parse(defaultProject);
        savedProjects.push({
          ...projectData,
          id: 'gjsProject',
          name: projectData.projectName || 'Default Project'
        });
      } catch (error) {
        console.error('Error loading default project:', error);
      }
    }

    // Sort projects
    savedProjects.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.savedAt || 0) - new Date(a.savedAt || 0);
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
    
    const exportFileDefaultName = `${project.name || 'project'}_${Date.now()}.json`;
    
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
        <div className="modal-header">
          <div className="modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <h2>Project Manager</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Import
              </button>
            </div>
          </div>

          <div className="projects-list">
            {filteredProjects.length === 0 ? (
              <div className="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="empty-icon">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
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
                    <h3 className="project-name">{project.name || 'Untitled Project'}</h3>
                    <div className="project-meta">
                      <span className="project-date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {project.savedAt ? new Date(project.savedAt).toLocaleDateString() : 'No date'}
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      title="Delete Project"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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

