import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../../theme';
import { useNavigation } from '../../router/AppRouter';
import { 
  FiMenu, 
  FiGrid, 
  FiLayout, 
  FiSave, 
  FiPower, 
  FiMoreVertical, 
  FiSun, 
  FiMoon,
  FiFile,
  FiImage
} from 'react-icons/fi';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';
import { 
  dialogComponent, 
  tableComponent, 
  listPagesComponent,
  fsLightboxComponent 
} from "@grapesjs/studio-sdk-plugins";
import ProjectManager from './ProjectManager';
import './PageBuilder.css';

function PageBuilder() {
  const { theme } = useTheme();
  const { navigateToBuilder, activeTab } = useNavigation();
  const [editor, setEditor] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [importHtml, setImportHtml] = useState('');
  const [currentProject, setCurrentProject] = useState(null);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isSaved, setIsSaved] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { toggleTheme } = useTheme();

  // Load project data from localStorage on mount
  useEffect(() => {
    const savedProject = localStorage.getItem('gjsProject');
    if (savedProject) {
      try {
        const project = JSON.parse(savedProject);
        if (project.pages) {
          setProjectData(project);
        }
              } catch (error) {
        console.error('Error loading project:', error);
      }
    }
  }, []);

  // Save project data to localStorage when it changes
  const handleEditorReady = useCallback((editorInstance) => {
    setEditor(editorInstance);
    
    // Set current project
    const savedProject = localStorage.getItem('gjsProject');
    if (savedProject) {
      try {
        const project = JSON.parse(savedProject);
        setCurrentProject({ projectName: project.projectName || 'Untitled Project', hasChanges: false });
        setProjectName(project.projectName || 'Untitled Project');
      } catch (error) {
        console.error('Error loading project:', error);
      }
    }
    
    // Auto-save on changes
    editorInstance.on('update', () => {
      if (autoSaveEnabled) {
        try {
          const projectData = editorInstance.getProjectData();
          localStorage.setItem('gjsProject', JSON.stringify(projectData));
          setCurrentProject(prev => prev ? { ...prev, hasChanges: true } : { projectName: 'Untitled Project', hasChanges: true });
          setIsSaved(false);
        } catch (error) {
          console.error('Error saving project:', error);
        }
      } else {
        setIsSaved(false);
      }
    });
  }, [autoSaveEnabled]);

  const handleLoadProject = useCallback((project) => {
    if (currentProject?.hasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to load a different project?')) {
        return;
      }
    }
    
    setProjectData(project);
    setCurrentProject({ projectName: project.name || project.projectName || 'Untitled Project', hasChanges: false });
    setShowProjectManager(false);
    
    // Reload the page to apply new project
    window.location.reload();
  }, [currentProject]);

  // Get theme colors based on current theme
  const getThemeColors = () => {
    if (theme === 'dark') {
      return {
        global: {
          background1: '#3f3f3f',
          background2: '#272727',
          background3: '#181818',
          backgroundHover: '#373737',
          text: '#a3a3a3',
          border: '#3f3f3f',
          focus: 'hsl(252 95% 85% / 80%)',
          placeholder: '#a3a3a3'
        },
        primary: {
          background1: 'hsl(258 90% 66%)',
          background2: 'hsl(250 95% 92%)',
          background3: '#272727',
          backgroundHover: 'hsl(263 69% 42%)',
          text: '#ffffff'
        },
        component: {
          background1: 'hsl(210 71% 53%)',
          background2: 'hsl(201 90% 27%)',
          background3: 'hsl(215 28% 17%)',
          backgroundHover: 'hsl(210 75% 60%)',
          text: '#ffffff'
        }
      };
    }
    
    // Light theme
    return {
      global: {
        background1: '#f4f4f4',
        background2: '#fdfdfd',
        background3: '#ffffff',
        backgroundHover: '#f4f4f4',
        text: '#181818',
        border: '#d2d2d2',
        focus: 'hsl(252 95% 85% / 80%)',
        placeholder: '#a3a3a3'
      },
      primary: {
        background1: 'hsl(258 90% 66%)',
        background2: 'hsl(250 95% 92%)',
        background3: 'hsl(250 100% 97%)',
        backgroundHover: 'hsl(263 69% 42%)',
        text: '#ffffff'
      },
      component: {
        background1: 'hsl(210 75% 50%)',
        background2: 'hsl(210 75% 70%)',
        background3: 'hsl(210 75% 90%)',
        backgroundHover: 'hsl(210 75% 60%)',
        text: '#ffffff'
      }
    };
  };

  // Handle import HTML
  const handleImportHtml = useCallback(() => {
    if (!editor || !importHtml.trim()) return;

    try {
      // Add the HTML as a custom block
      const blockId = `custom-widget-${Date.now()}`;
      editor.Blocks.add(blockId, {
        label: 'Imported Widget',
        category: 'Custom',
        media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
        content: importHtml,
        attributes: { class: 'custom-imported-widget' }
      });

      // Optionally add it to the canvas immediately
      editor.addComponents(importHtml);

      // Show success notification
      const notification = document.createElement('div');
      notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;';
      notification.textContent = '✓ Widget imported successfully!';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);

      // Reset and close modal
      setImportHtml('');
      setShowImportModal(false);
    } catch (error) {
      console.error('Error importing HTML:', error);
      alert('Error importing HTML. Please check the console for details.');
    }
  }, [editor, importHtml]);

  // Save project handler
  const handleSaveProject = useCallback(() => {
    if (!editor) return;
    
    try {
      const projectData = editor.getProjectData();
      localStorage.setItem('gjsProject', JSON.stringify(projectData));
      setIsSaved(true);
      
      // Show success notification
      const notification = document.createElement('div');
      notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;';
      notification.textContent = '✓ Project saved successfully!';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    } catch (error) {
      console.error('Error saving project:', error);
    }
  }, [editor]);

  // Get page and component stats
  const [stats, setStats] = useState({ pages: 0, components: 0 });
  
  useEffect(() => {
    if (!editor) return;
    
    const updateStats = () => {
      try {
        const pages = editor.Pages.getAll();
        let componentCount = 0;
        pages.forEach(page => {
          try {
            const components = page.getMainComponent().components();
            componentCount += components.length;
          } catch (e) {
            // Ignore errors for individual pages
          }
        });
        setStats({ pages: pages.length, components: componentCount });
      } catch (error) {
        setStats({ pages: 0, components: 0 });
      }
    };
    
    updateStats();
    
    // Update stats when editor changes
    const interval = setInterval(updateStats, 2000);
    editor.on('update', updateStats);
    
    return () => {
      clearInterval(interval);
      editor.off('update', updateStats);
    };
  }, [editor]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update project name from current project
  useEffect(() => {
    if (currentProject?.projectName) {
      setProjectName(currentProject.projectName);
    }
  }, [currentProject]);

  return (
    <div className="app" style={{ width: '100%', height: '100vh' }}>
      <div className="main-content">
        {/* Navigation Header */}
        <div className="workflow-header">
          <div className="header-top">
            <div className="header-left">
              <div className="workflow-breadcrumb">
                <span className="workflow-owner">Personal</span>
                <span className="breadcrumb-separator">/</span>
                <input
                  type="text"
                  className="workflow-name-input"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={handleSaveProject}
                />
              </div>
            </div>

            <div className="header-center">
              <div className="header-tabs">
                <button
                  className={`header-tab ${activeTab === 'workflow' ? 'active' : ''}`}
                  style={{ backgroundColor: activeTab === 'workflow' ? 'black' : '#2a2b2b' }}
                  onClick={() => navigateToBuilder('workflow')}
                >
                  <FiGrid style={{ fontSize: '16px' }} />
                  Workflow Builder
                </button>
                <button
                  className={`header-tab ${activeTab === 'page-builder' ? 'active' : ''}`}
                  style={{ backgroundColor: activeTab === 'page-builder' ? 'black' : '#2a2b2b' }}
                  onClick={() => navigateToBuilder('page-builder')}
                >
                  <FiLayout style={{ fontSize: '16px' }} />
                  Page Builder
                </button>
              </div>
            </div>

            <div className="header-right">
              <div className="header-stats">
                <div className="header-stat">
                  <FiFile />
                  <span>{stats.pages}</span>
                  <span className="stat-label">PAGES</span>
                </div>
                <div className="header-stat">
                  <FiImage />
                  <span>{stats.components}</span>
                  <span className="stat-label">COMPONENTS</span>
                </div>
              </div>
              
              {/* Auto-save Toggle */}
              <button
                className={`header-btn ${autoSaveEnabled ? 'active' : ''}`}
                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                title={autoSaveEnabled ? 'Auto-save: ON' : 'Auto-save: OFF'}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '8px 12px'
                }}
              >
                <FiPower style={{ color: autoSaveEnabled ? '#10b981' : '#6b7280', fontSize: '16px' }} />
                <span style={{ fontSize: '12px', fontWeight: 500 }}>
                  {autoSaveEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
              
              <button
                className="header-btn save-btn"
                onClick={handleSaveProject}
                title="Save project"
              >
                <FiSave />
                {isSaved ? 'Saved' : 'Save'}
              </button>
              
              <div className="header-menu-container" ref={menuRef}>
                <button
                  className="header-btn icon-only"
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  title="More options"
                >
                  <FiMoreVertical />
                </button>
                {moreMenuOpen && (
                  <div className="header-dropdown-menu">
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowImportModal(true);
                        setMoreMenuOpen(false);
                      }}
                    >
                      <FiSave /> Import HTML
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowProjectManager(true);
                        setMoreMenuOpen(false);
                      }}
                    >
                      <FiFile /> Projects
                    </button>
                  </div>
                )}
              </div>
              
              <button
                className="header-btn icon-only"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <FiMoon /> : <FiSun />}
              </button>
            </div>
          </div>
        </div>

        {/* Studio Editor */}
        <div className={`page-builder-studio ${theme}`} style={{ width: '100%', height: 'calc(100vh - 60px)' }}>
          {/* Import HTML Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-container import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Import Custom HTML/Widget</h2>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                Paste your HTML code below. It will be added as a custom block and inserted into the canvas.
              </p>
              <textarea
                className="import-textarea"
                placeholder="<div>Your HTML code here...</div>"
                value={importHtml}
                onChange={(e) => setImportHtml(e.target.value)}
                rows={15}
              />
              <div className="import-examples">
                <p><strong>Examples:</strong></p>
                <button 
                  className="example-btn"
                  onClick={() => setImportHtml('<div class="bg-blue-500 text-white p-8 rounded-lg text-center">\n  <h2 class="text-3xl font-bold mb-4">Custom Widget</h2>\n  <p class="text-lg">This is a custom imported widget</p>\n</div>')}
                >
                  Load Example 1
                </button>
                <button 
                  className="example-btn"
                  onClick={() => setImportHtml('<section class="py-16 px-4 bg-gradient-to-r from-purple-500 to-pink-500">\n  <div class="container mx-auto text-center text-white">\n    <h1 class="text-5xl font-bold mb-4">Gradient Section</h1>\n    <p class="text-xl">Beautiful gradient background</p>\n  </div>\n</section>')}
                >
                  Load Example 2
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleImportHtml}
                disabled={!importHtml.trim()}
              >
                Import Widget
              </button>
            </div>
          </div>
        </div>
      )}

      <StudioEditor
        options={{
          // Theme configuration
          theme: theme === 'dark' ? 'dark' : 'light',
          customTheme: {
            default: {
              colors: getThemeColors()
            }
          },

          // Project configuration
          project: projectData || {
            type: 'web',
            default: {
              pages: [
                {
                  id: 'home-page',
                  name: 'Home',
                  component: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>Welcome</title>
                      <script src="https://cdn.tailwindcss.com"></script>
                      <style>
                        /* Ensure Tailwind utilities are available */
                        * {
                          box-sizing: border-box;
                        }
                        body {
                          margin: 0;
                          padding: 0;
                        }
                      </style>
                    </head>
                    <body class="bg-gray-50">
                      <div class="container mx-auto px-4 py-16">
                        <div class="text-center">
                          <h1 class="text-5xl font-bold text-gray-900 mb-4">Welcome to Studio SDK</h1>
                          <p class="text-xl text-gray-600 mb-8">Start building your amazing website by dragging blocks from the left panel.</p>
                          <div class="flex justify-center gap-4">
                            <a href="#" class="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">Get Started</a>
                            <a href="#" class="px-8 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition">Learn More</a>
                          </div>
                        </div>
                        <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div class="bg-white p-6 rounded-lg shadow-lg">
                            <h3 class="text-xl font-bold mb-2">Feature One</h3>
                            <p class="text-gray-600">Description of your first amazing feature goes here.</p>
                          </div>
                          <div class="bg-white p-6 rounded-lg shadow-lg">
                            <h3 class="text-xl font-bold mb-2">Feature Two</h3>
                            <p class="text-gray-600">Description of your second amazing feature goes here.</p>
                          </div>
                          <div class="bg-white p-6 rounded-lg shadow-lg">
                            <h3 class="text-xl font-bold mb-2">Feature Three</h3>
                            <p class="text-gray-600">Description of your third amazing feature goes here.</p>
                          </div>
                        </div>
                      </div>
                    </body>
                    </html>
                  `
                }
              ]
            }
          },

          // Layout configuration with tabs
          layout: {
            default: {
              type: 'row',
              style: { height: '100%' },
              children: [
                {
                  type: 'sidebarLeft',
                  children: {
                    type: 'tabs',
                    value: 'blocks',
                    tabs: [
                      {
                        id: 'blocks',
                        label: 'Blocks',
                        children: { type: 'panelBlocks', style: { height: '100%' } },
                      },
                      {
                        id: 'layers',
                        label: 'Layers',
                        children: { type: 'panelLayers', style: { height: '100%' } },
                      },
                    ],
                  },
                },
                {
                  type: 'canvasSidebarTop',
                  sidebarTop: { 
                    leftContainer: { 
                      buttons: ({ items }) => [
                        ...items,
                        {
                          id: 'save-project',
                          label: 'Save',
                          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
                          onClick: ({ editor }) => {
                            try {
                              const projectData = editor.getProjectData();
                              localStorage.setItem('gjsProject', JSON.stringify(projectData));
                              
                              // Show success notification
                              const notification = document.createElement('div');
                              notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;';
                              notification.textContent = '✓ Project saved successfully!';
                              document.body.appendChild(notification);
                              setTimeout(() => notification.remove(), 3000);
            } catch (error) {
                              console.error('Error saving project:', error);
                            }
                          }
                        },
                        {
                          id: 'import-widget',
                          label: 'Import HTML',
                          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
                          onClick: () => {
                            setShowImportModal(true);
                          }
                        },
                        {
                          id: 'workflow-builder',
                          label: 'Workflow',
                          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
                          onClick: () => {
                            navigateToBuilder('workflow');
                          }
                        },
                        {
                          id: 'project-manager',
                          label: 'Projects',
                          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
                          onClick: () => {
                            setShowProjectManager(true);
                          }
                        }
                      ]
                    } 
                  },
                },
                {
                  type: 'sidebarRight',
                  children: {
                    type: 'tabs',
                    value: 'styles',
                    tabs: [
                      {
                        id: 'styles',
                        label: 'Styles',
                        children: {
                          type: 'column',
                          style: { height: '100%' },
                          children: [
                            { type: 'panelSelectors', style: { padding: 5 } },
                            { type: 'panelStyles' },
                          ],
                        },
                      },
                      {
                        id: 'props',
                        label: 'Properties',
                        children: { type: 'panelProperties', style: { padding: 5, height: '100%' } },
                      },
                    ],
                  },
                },
              ],
            },
          },

          // Custom blocks - Modern web components
          blocks: {
            default: [
              // Hero Section
              {
                id: 'hero-section-modern',
                label: 'Hero Section',
                category: 'Sections',
                media: '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
                content: `
                  <section class="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white py-32 px-4">
                    <div class="container mx-auto text-center">
                      <h1 class="text-5xl md:text-6xl font-bold mb-6">Build Amazing Websites</h1>
                      <p class="text-xl md:text-2xl mb-8 opacity-90">Create stunning web experiences with our powerful page builder</p>
                      <div class="flex flex-col sm:flex-row gap-4 justify-center">
                        <a href="#" class="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition">Get Started</a>
                        <a href="#" class="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-blue-600 transition">Learn More</a>
                      </div>
                    </div>
                  </section>
                `,
                select: true,
                full: true
              },
              
              // Feature Grid
              {
                id: 'feature-grid',
                label: 'Feature Grid',
                category: 'Sections',
                media: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
                content: `
                  <section class="py-16 px-4 bg-gray-50">
                    <div class="container mx-auto">
                      <h2 class="text-4xl font-bold text-center mb-12">Our Features</h2>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
                          <div class="w-16 h-16 bg-blue-600 rounded-lg mb-4 flex items-center justify-center">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                          </div>
                          <h3 class="text-2xl font-bold mb-3">Fast Performance</h3>
                          <p class="text-gray-600">Lightning-fast load times and optimized code for the best user experience.</p>
                        </div>
                        <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
                          <div class="w-16 h-16 bg-purple-600 rounded-lg mb-4 flex items-center justify-center">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                          </div>
                          <h3 class="text-2xl font-bold mb-3">Easy to Use</h3>
                          <p class="text-gray-600">Intuitive drag-and-drop interface that anyone can master quickly.</p>
                        </div>
                        <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition">
                          <div class="w-16 h-16 bg-green-600 rounded-lg mb-4 flex items-center justify-center">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                          </div>
                          <h3 class="text-2xl font-bold mb-3">Secure & Reliable</h3>
                          <p class="text-gray-600">Enterprise-grade security and 99.9% uptime guarantee.</p>
                        </div>
                      </div>
                    </div>
                  </section>
                `,
                select: true,
                full: true
              },

              // CTA Section
              {
                id: 'cta-section',
                label: 'Call to Action',
                category: 'Sections',
                media: '<svg viewBox="0 0 24 24"><path d="M21 3H3c-.6 0-1 .4-1 1v6c0 .6.4 1 1 1h18c.6 0 1-.4 1-1V4c0-.6-.4-1-1-1Z"/></svg>',
                content: `
                  <section class="py-20 px-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white">
                    <div class="container mx-auto text-center">
                      <h2 class="text-4xl md:text-5xl font-bold mb-6">Ready to Get Started?</h2>
                      <p class="text-xl mb-8 opacity-90">Join thousands of satisfied users building amazing websites</p>
                      <a href="#" class="inline-block px-12 py-4 bg-white text-pink-500 font-bold rounded-full hover:bg-gray-100 transition transform hover:scale-105">Start Building Now</a>
                    </div>
                  </section>
                `,
                select: true,
                full: true
              },

              // Card Component
              {
                id: 'pricing-card',
                label: 'Pricing Card',
                category: 'Components',
                media: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 15h6"/></svg>',
                content: `
                  <div class="max-w-sm bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-100 hover:border-blue-500 transition">
                    <div class="text-center mb-6">
                      <h3 class="text-2xl font-bold mb-2">Pro Plan</h3>
                      <div class="text-5xl font-bold text-blue-600 mb-2">$49<span class="text-lg text-gray-600">/mo</span></div>
                      <p class="text-gray-600">Perfect for professionals</p>
                    </div>
                    <ul class="space-y-4 mb-8">
                      <li class="flex items-center">
                        <svg class="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        <span>Unlimited projects</span>
                      </li>
                      <li class="flex items-center">
                        <svg class="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        <span>Priority support</span>
                      </li>
                      <li class="flex items-center">
                        <svg class="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        <span>Advanced analytics</span>
                      </li>
                    </ul>
                    <button class="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">Get Started</button>
                  </div>
                `
              },

              // Testimonial
              {
                id: 'testimonial',
                label: 'Testimonial',
                category: 'Components',
                media: '<svg viewBox="0 0 24 24"><path d="M14 9.5V14h4.5L14 9.5zM5.5 14H10V9.5L5.5 14z"/></svg>',
                content: `
                  <div class="bg-white rounded-2xl shadow-xl p-8 max-w-2xl">
                    <div class="flex items-center mb-6">
                      <img src="https://i.pravatar.cc/100?img=1" alt="User" class="w-16 h-16 rounded-full mr-4">
                      <div>
                        <h4 class="font-bold text-lg">John Doe</h4>
                        <p class="text-gray-600">CEO at TechCorp</p>
                      </div>
                    </div>
                    <p class="text-gray-700 text-lg leading-relaxed mb-4">"This page builder has transformed the way we create websites. It's intuitive, powerful, and saves us countless hours of development time."</p>
                    <div class="flex text-yellow-400">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    </div>
                  </div>
                `
              }
            ]
          },

          // Global styles
          globalStyles: {
            default: [
              {
                id: 'primaryColor',
                property: 'color',
                field: 'color',
                defaultValue: '#3b82f6',
                selector: ':root',
                label: 'Primary Color',
                category: { id: 'colors', label: 'Colors', open: true }
              },
              {
                id: 'h1Color',
                property: 'color',
                field: 'color',
                defaultValue: '#111827',
                selector: 'h1',
                label: 'H1 Color',
                category: { id: 'typography', label: 'Typography' }
              },
              {
                id: 'h1Size',
                property: 'font-size',
                field: { type: 'number', min: 0.5, max: 10, step: 0.1, units: ['rem'] },
                defaultValue: '2.5rem',
                selector: 'h1',
                label: 'H1 Size',
                category: { id: 'typography' }
              },
              {
                id: 'bodyBg',
                property: 'background-color',
                field: 'color',
                selector: 'body',
                label: 'Body Background',
                defaultValue: '#ffffff',
                category: { id: 'colors' }
              }
            ]
          },

          // Templates configuration
          templates: {
            onLoad: async () => [
              {
                id: 'template-landing',
                name: 'Landing Page',
                  thumbnail: 'https://picsum.photos/400/300?random=1',
                data: {
                  pages: [
                    {
                      name: 'Home',
                      component: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <script src="https://cdn.tailwindcss.com"></script>
                        </head>
                        <body class="bg-gray-50">
                          <section class="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white py-32 px-4">
                            <div class="container mx-auto text-center">
                              <h1 class="text-6xl font-bold mb-6">Landing Page Template</h1>
                              <p class="text-2xl mb-8">Start with this beautiful template</p>
                              <a href="#" class="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition">Get Started</a>
                            </div>
                          </section>
                        </body>
                        </html>
                      `
                    }
                  ]
                }
              },
              {
                id: 'template-business',
                name: 'Business Site',
                  thumbnail: 'https://picsum.photos/400/300?random=2',
                data: {
                  pages: [
                    {
                      name: 'Home',
                      component: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <script src="https://cdn.tailwindcss.com"></script>
                        </head>
                        <body class="bg-white">
                          <section class="py-20 px-4">
                            <div class="container mx-auto">
                              <h1 class="text-5xl font-bold text-center mb-12">Business Template</h1>
                              <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div class="bg-gray-50 p-8 rounded-xl">
                                  <h3 class="text-2xl font-bold mb-4">Service 1</h3>
                                  <p class="text-gray-600">Professional service description</p>
                                </div>
                                <div class="bg-gray-50 p-8 rounded-xl">
                                  <h3 class="text-2xl font-bold mb-4">Service 2</h3>
                                  <p class="text-gray-600">Professional service description</p>
                                </div>
                                <div class="bg-gray-50 p-8 rounded-xl">
                                  <h3 class="text-2xl font-bold mb-4">Service 3</h3>
                                  <p class="text-gray-600">Professional service description</p>
                                </div>
                              </div>
                            </div>
                          </section>
                        </body>
                        </html>
                      `
                    }
                  ]
                }
              }
            ]
          },

          // Pages configuration
          pages: {
            add: ({ editor, rename }) => {
              const page = editor.Pages.add({
                name: 'New Page',
                component: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <script src="https://cdn.tailwindcss.com"></script>
                  </head>
                  <body class="bg-gray-50">
                    <div class="container mx-auto px-4 py-16">
                      <h1 class="text-4xl font-bold">New Page</h1>
                      <p class="text-gray-600 mt-4">Start building your page here</p>
                    </div>
                  </body>
                  </html>
                `
              }, {
                select: true
              });
              rename(page);
            },
            duplicate: ({ editor, page, rename }) => {
              const root = page.getMainComponent();
              const newPage = editor.Pages.add({
                name: `${page.getName()} (Copy)`,
                component: root.clone(),
              }, { select: true });
              rename(newPage);
            }
          },

          // Assets configuration
          assets: {
            storageType: 'self',
            onUpload: async ({ files }) => {
              return files.map(file => ({
                id: URL.createObjectURL(file),
                src: URL.createObjectURL(file),
                name: file.name,
                mimeType: file.type,
                size: file.size
              }));
            },
            onDelete: async ({ assets }) => {
              console.log('Deleting assets:', assets.map(a => a.getSrc()));
            }
          },

          // CSS configuration - ensure CSS is properly loaded
          css: {
            // Allow external stylesheets
            allowExternal: true,
            // Don't clear CSS on updates
            clear: false
          },

          // Plugins configuration
          plugins: [
            dialogComponent.init({
              block: { category: 'Advanced', label: 'Dialog' }
            }),
            tableComponent.init({
              block: { category: 'Advanced', label: 'Table' }
            }),
            listPagesComponent?.init({
              block: { category: 'Advanced', label: 'Navigation' }
            }),
            fsLightboxComponent?.init({
              block: { category: 'Advanced', label: 'Image Gallery' }
            }),
            // Plugin to ensure Tailwind CSS and all styles are loaded in all pages and canvas
            (editor) => {
              // Function to inject Tailwind CSS and ensure all styles are loaded
              const injectStylesIntoCanvas = () => {
                try {
                  const canvas = editor.Canvas.getFrameEl();
                  if (canvas && canvas.contentDocument) {
                    const doc = canvas.contentDocument;
                    const head = doc.head || doc.getElementsByTagName('head')[0];
                    
                    if (!head) return;
                    
                    // Inject Tailwind CSS script - always check and inject if missing
                    let existingTailwindScript = doc.querySelector('script[src*="tailwindcss"]');
                    
                    // If script exists, verify Tailwind is actually loaded and working
                    if (existingTailwindScript) {
                      try {
                        // Test if Tailwind is actually working by checking if window.tailwind exists
                        const window = doc.defaultView || doc.parentWindow;
                        if (!window || !window.tailwind) {
                          // Tailwind script exists but not loaded yet, wait a bit more
                          // Don't remove it, just ensure it loads
                          setTimeout(() => {
                            injectStylesIntoCanvas();
                          }, 500);
                        }
                      } catch (e) {
                        // If test fails, might be CORS or other issue, but script is there
                        console.warn('Could not verify Tailwind:', e);
                      }
                    }
                    
                    if (!existingTailwindScript) {
                      const script = doc.createElement('script');
                      script.src = 'https://cdn.tailwindcss.com';
                      script.async = false; // Load synchronously to ensure it's available
                      script.onload = () => {
                        console.log('✅ Tailwind CSS loaded in canvas');
                        // Force a re-render after Tailwind loads
                        setTimeout(() => {
                          try {
                            // Trigger editor to refresh the canvas
                            editor.refresh();
                            // Also update all components to force re-render
                            const pages = editor.Pages.getAll();
                            pages.forEach(page => {
                              try {
                                const component = page.getMainComponent();
                                component.set('style', component.getStyle());
                              } catch (e) {
                                // Ignore errors for individual pages
                              }
                            });
                          } catch (e) {
                            console.warn('Error refreshing canvas:', e);
                          }
                        }, 200);
                      };
                      script.onerror = () => {
                        console.error('❌ Failed to load Tailwind CSS from CDN');
                        // Try alternative CDN
                        const altScript = doc.createElement('script');
                        altScript.src = 'https://unpkg.com/tailwindcss@3/dist/tailwind.min.js';
                        altScript.async = false;
                        head.appendChild(altScript);
                      };
                      head.appendChild(script);
                      console.log('✅ Tailwind CSS script injected into canvas');
                    } else {
                      // Script exists, but ensure it's loaded
                      const window = doc.defaultView || doc.parentWindow;
                      if (window && window.tailwind) {
                        // Tailwind is loaded, trigger refresh
                        setTimeout(() => {
                          try {
                            editor.refresh();
                          } catch (e) {
                            console.warn('Error refreshing editor:', e);
                          }
                        }, 100);
                      }
                    }
                    
                    // Ensure base styles are present
                    const existingBaseStyle = doc.querySelector('style[data-gjs-base]');
                    if (!existingBaseStyle) {
                      const baseStyle = doc.createElement('style');
                      baseStyle.setAttribute('data-gjs-base', 'true');
                      baseStyle.textContent = `
                        * {
                          box-sizing: border-box;
                        }
                        body {
                          margin: 0;
                          padding: 0;
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                          -webkit-font-smoothing: antialiased;
                          -moz-osx-font-smoothing: grayscale;
                        }
                      `;
                      head.appendChild(baseStyle);
                      console.log('✅ Base styles injected into canvas');
                    }
                  }
                } catch (error) {
                  console.warn('Could not inject styles into canvas:', error);
                }
              };

              // Inject styles when editor is ready
              editor.onReady(() => {
                console.log('Studio Editor Ready!');
                handleEditorReady(editor);
                
                // Inject styles into canvas with multiple attempts
                setTimeout(() => {
                  injectStylesIntoCanvas();
                }, 500);
                
                setTimeout(() => {
                  injectStylesIntoCanvas();
                }, 1000);
                
                setTimeout(() => {
                  injectStylesIntoCanvas();
                }, 2000);
              });

              // Inject styles when canvas is loaded/updated
              editor.on('canvas:frame:load', () => {
                setTimeout(() => {
                  injectStylesIntoCanvas();
                }, 100);
                
                setTimeout(() => {
                  injectStylesIntoCanvas();
                }, 500);
              });
              
              // Also listen for canvas frame ready
              editor.on('canvas:frame:ready', () => {
                setTimeout(() => {
                  injectStylesIntoCanvas();
                }, 100);
              });

              // Ensure Tailwind is in page components
              editor.on('load', () => {
                const pages = editor.Pages.getAll();
                pages.forEach(page => {
                  try {
                    const component = page.getMainComponent();
                    const head = component.find('head')[0];
                    
                    if (head) {
                      const existingScript = head.find('script[src*="tailwindcss"]')[0];
                      if (!existingScript) {
                        head.append(`<script src="https://cdn.tailwindcss.com"></script>`);
                      }
                    }
                  } catch (error) {
                    console.warn('Error adding Tailwind to page:', error);
                  }
                });
              });

              // Ensure Tailwind is added to new pages
              editor.on('page:add', (page) => {
                setTimeout(() => {
                  try {
                    const component = page.getMainComponent();
                    const head = component.find('head')[0];
                    if (head) {
                      const existingScript = head.find('script[src*="tailwindcss"]')[0];
                      if (!existingScript) {
                        head.append(`<script src="https://cdn.tailwindcss.com"></script>`);
                      }
                    }
                  } catch (error) {
                    console.warn('Error adding Tailwind to new page:', error);
                  }
                }, 100);
              });

              // Re-inject on component update
              editor.on('component:update', () => {
                setTimeout(() => {
                  injectStylesIntoCanvas();
                }, 200);
              });
              
              // Re-inject on page change
              editor.on('page:select', () => {
                setTimeout(() => {
                  injectStylesIntoCanvas();
                }, 300);
              });
              
              // Re-inject on any update
              editor.on('update', () => {
                setTimeout(() => {
                  injectStylesIntoCanvas();
                }, 100);
              });
            }
          ],

          // I18n configuration
          i18n: {
            locales: {
              en: {
                blockManager: {
                  notFound: "No blocks found",
                  blocks: "Blocks",
                  search: "Search blocks...",
                },
                pageManager: {
                  pages: 'Pages',
                  newPage: 'New Page',
                  add: 'Add Page',
                }
              }
            }
          }
        }}
      />

          {/* Project Manager Modal */}
          <ProjectManager
            isOpen={showProjectManager}
            onClose={() => setShowProjectManager(false)}
            onLoadProject={handleLoadProject}
            currentProject={currentProject}
          />
        </div>
      </div>
    </div>
  );
}

export default PageBuilder;
