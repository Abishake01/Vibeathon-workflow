import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../theme';
import { useNavigation } from '../../router/AppRouter';
import apiService from '../../services/api';
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
  FiImage,
  FiEdit3,
  FiZap,
  FiX,
  FiSettings
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
  const [importCss, setImportCss] = useState('');
  const [importJs, setImportJs] = useState('');
  const [importTab, setImportTab] = useState('html'); // 'html', 'css', 'js'
  const [importMode, setImportMode] = useState('manual'); // 'manual' or 'ai'
  const [widgetName, setWidgetName] = useState('Custom Widget');
  
  // AI Generation state for import
  const [aiImportDescription, setAiImportDescription] = useState('');
  const [aiImportConversation, setAiImportConversation] = useState([]);
  const [isGeneratingImport, setIsGeneratingImport] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewCss, setPreviewCss] = useState('');
  const [previewJs, setPreviewJs] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [currentProject, setCurrentProject] = useState(null);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [serverProjectId, setServerProjectId] = useState(null); // Track server project ID
  const projectNameRef = useRef('Untitled Project'); // Ref to access current project name in callbacks
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isSaved, setIsSaved] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { toggleTheme } = useTheme();
  
  // AI Edit Modal state
  const [showAIEditModal, setShowAIEditModal] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [aiMode, setAiMode] = useState('generate'); // 'generate' or 'edit'
  const [aiDescription, setAiDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiEditPreview, setAiEditPreview] = useState({ html: '', css: '', js: '' });
  const [showAIEditPreview, setShowAIEditPreview] = useState(false);
  
  // AI Settings Modal state
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);
  const [aiSettings, setAiSettings] = useState({
    apiKey: '',
    model: 'llama-3.1-8b-instant',
    baseUrl: 'https://api.groq.com/openai/v1',
    llmProvider: 'groq'
  });
  
  // Keep ref in sync with state
  useEffect(() => {
    projectNameRef.current = projectName;
  }, [projectName]);

  // Load project data from localStorage and server on mount
  useEffect(() => {
    const loadProject = async () => {
      try {
        // First, try to load from localStorage (for quick access)
        const savedProject = localStorage.getItem('gjsProject');
        if (savedProject) {
          try {
            const project = JSON.parse(savedProject);
            if (project.pages) {
              setProjectData(project);
            }
            setCurrentProject({ projectName: project.projectName || 'Untitled Project', hasChanges: false });
            setProjectName(project.projectName || 'Untitled Project');
            setServerProjectId(project.serverId || null);
            projectNameRef.current = project.projectName || 'Untitled Project';
          } catch (error) {
            console.error('Error loading project from localStorage:', error);
          }
        }
        
        // Then, try to sync with server (load latest projects)
        try {
          const serverProjects = await apiService.request('/ui-projects/', { method: 'GET' });
          if (serverProjects && serverProjects.length > 0) {
            // If we have a server project ID, use that project
            const savedProject = localStorage.getItem('gjsProject');
            if (savedProject) {
              const localProject = JSON.parse(savedProject);
              if (localProject.serverId) {
                const serverProject = serverProjects.find(p => p.id === localProject.serverId);
                if (serverProject) {
                  // Update local storage with server data
                  const projectData = {
                    ...localProject,
                    ...serverProject,
                    projectName: serverProject.project_name,
                    serverId: serverProject.id
                  };
                  localStorage.setItem('gjsProject', JSON.stringify(projectData));
                  if (projectData.pages) {
                    setProjectData(projectData);
                  }
                  setProjectName(serverProject.project_name);
                  setServerProjectId(serverProject.id);
                }
              }
            }
          }
        } catch (error) {
          console.warn('Could not load projects from server (might not be authenticated):', error);
          // Continue with localStorage data
        }
      } catch (error) {
        console.error('Error loading project:', error);
      }
    };
    
    loadProject();
  }, []);

  // Track if widgets have been loaded to avoid duplicates
  const widgetsLoadedRef = useRef(false);

  // Load custom widgets from server (defined before handleEditorReady to avoid initialization error)
  const loadCustomWidgets = useCallback(async (editorInstance, forceReload = false) => {
    if (!editorInstance) {
      console.warn('⚠️ Editor instance not available for loading widgets');
      return;
    }
    
    // Prevent duplicate loading unless forced
    if (!forceReload && widgetsLoadedRef.current) {
      console.log('Widgets already loaded, skipping...');
      return;
    }
    
    try {
      console.log('📦 Loading custom widgets from server...');
      const response = await apiService.request('/custom-widgets/', {
        method: 'GET'
      });
      
      console.log('📦 Custom widgets response:', response);
      
      if (response && response.widgets && Array.isArray(response.widgets) && response.widgets.length > 0) {
        const blocks = editorInstance.Blocks;
        let loadedCount = 0;
        let skippedCount = 0;
        
        response.widgets.forEach((widget) => {
          try {
            // Check if block already exists to avoid duplicates
            const existingBlock = blocks.get(widget.block_id);
            if (existingBlock) {
              // Block already exists, skip
              skippedCount++;
              return;
            }
            
            // Combine HTML, CSS, and JS
            let componentContent = widget.html_content || '';
            
            if (widget.css_content) {
              const cssContent = widget.css_content.trim();
              if (cssContent && !cssContent.startsWith('<style')) {
                componentContent = `<style>${cssContent}</style>${componentContent}`;
              } else if (cssContent) {
                componentContent = `${cssContent}${componentContent}`;
              }
            }
            
            if (widget.js_content) {
              const jsContent = widget.js_content.trim();
              if (jsContent && !jsContent.startsWith('<script')) {
                componentContent = `${componentContent}<script>${jsContent}</script>`;
              } else if (jsContent) {
                componentContent = `${componentContent}${jsContent}`;
              }
            }
            
            // Add widget as a block
            blocks.add(widget.block_id, {
              label: widget.name,
              category: 'Custom',
              media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>',
              content: componentContent,
              attributes: { 
                class: 'custom-imported-widget',
                'data-widget-id': widget.block_id
              }
            });
            
            loadedCount++;
            console.log(`✅ Added widget block: ${widget.name} (${widget.block_id})`);
          } catch (err) {
            console.warn(`❌ Failed to load widget ${widget.name}:`, err);
          }
        });
        
        widgetsLoadedRef.current = true;
        console.log(`✅ Loaded ${loadedCount} custom widget(s) from server (${skippedCount} skipped - already exist)`);
      } else {
        console.log('ℹ️ No custom widgets found in response:', response);
      }
    } catch (error) {
      console.warn('❌ Failed to load custom widgets from server:', error);
      // Continue without widgets - not critical
    }
  }, []);

  // Save project data to localStorage when it changes
  const handleEditorReady = useCallback((editorInstance) => {
    setEditor(editorInstance);
    
    // Reset widgets loaded flag when editor is ready
    widgetsLoadedRef.current = false;
    
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
    
    // Function to load widgets with proper timing
    const loadWidgetsWithRetry = () => {
      // Try multiple times to ensure widgets are loaded after project data
      setTimeout(() => {
        loadCustomWidgets(editorInstance);
      }, 300);
      
      setTimeout(() => {
        loadCustomWidgets(editorInstance);
      }, 800);
      
      setTimeout(() => {
        loadCustomWidgets(editorInstance);
      }, 1500);
    };
    
    // Load custom widgets after editor and project data are fully loaded
    // Use the 'load' event which fires after project data is loaded
    editorInstance.on('load', () => {
      console.log('Editor load event fired - loading custom widgets');
      loadWidgetsWithRetry();
    });
    
    // Also try loading widgets on ready (in case load event doesn't fire or already fired)
    loadWidgetsWithRetry();
    
    // Auto-save on changes
    editorInstance.on('update', () => {
      if (autoSaveEnabled) {
        try {
          const projectData = editorInstance.getProjectData();
          // Include current project name and save timestamp
          const currentName = projectNameRef.current || 'Untitled Project';
          const projectToSave = {
            ...projectData,
            projectName: currentName,
            savedAt: new Date().toISOString(),
            serverId: serverProjectId // Keep server ID
          };
          localStorage.setItem('gjsProject', JSON.stringify(projectToSave));
          setCurrentProject(prev => prev ? { ...prev, hasChanges: true } : { projectName: currentName, hasChanges: true });
          setIsSaved(false);
          
          // Auto-save to server (debounced - only save every 5 seconds)
          if (serverProjectId) {
            clearTimeout(window.autoSaveTimeout);
            window.autoSaveTimeout = setTimeout(async () => {
              try {
                const serverProjectData = {
                  project_name: currentName,
                  description: '',
                  components: projectData.components || {},
                  styles: projectData.styles || {},
                  assets: projectData.assets || []
                };
                await apiService.updateUIProject(serverProjectId, serverProjectData);
                console.log('💾 Auto-saved to server');
              } catch (error) {
                console.warn('⚠️ Auto-save to server failed:', error);
              }
            }, 5000); // Debounce: save 5 seconds after last change
          }
        } catch (error) {
          console.error('Error saving project:', error);
        }
      } else {
        setIsSaved(false);
      }
    });
    
    // Listen for component selection to show AI edit options
    const handleComponentSelect = () => {
      const selected = editorInstance.getSelected();
      if (selected && selected.length > 0) {
        // Get the first selected component
        setSelectedComponent(selected[0]);
      } else {
        setSelectedComponent(null);
      }
    };
    
    // Listen for component selection events
    editorInstance.on('component:selected', (component) => {
      setSelectedComponent(component);
    });
    
    editorInstance.on('component:deselected', () => {
      setSelectedComponent(null);
    });
    
    // Also listen for selection changes via the selection manager
    editorInstance.on('component:update', handleComponentSelect);
    editorInstance.on('component:add', handleComponentSelect);
    
    // Check initial selection
    setTimeout(handleComponentSelect, 500);
  }, [autoSaveEnabled, loadCustomWidgets, serverProjectId]);

  const handleLoadProject = useCallback((project) => {
    if (currentProject?.hasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to load a different project?')) {
        return;
      }
    }
    
    // Set project data and server ID
    setProjectData(project);
    const projectName = project.projectName || project.project_name || project.name || 'Untitled Project';
    setProjectName(projectName);
    projectNameRef.current = projectName;
    setServerProjectId(project.serverId || project.id || null);
    setCurrentProject({ projectName, hasChanges: false });
    setShowProjectManager(false);
    
    // Save to localStorage
    const projectToSave = {
      ...project,
      projectName,
      serverId: project.serverId || project.id || null,
      savedAt: project.savedAt || project.updated_at || new Date().toISOString()
    };
    localStorage.setItem('gjsProject', JSON.stringify(projectToSave));
    
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

  // Generate widget name from description
  const generateWidgetName = useCallback((description) => {
    if (!description || !description.trim()) {
      return 'AI Generated Widget';
    }
    
    // Remove common words and extract key terms
    const stopWords = ['a', 'an', 'the', 'with', 'and', 'or', 'but', 'for', 'to', 'of', 'in', 'on', 'at', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'where', 'when', 'why', 'how'];
    
    // Extract meaningful words
    const words = description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    // Take first 2-3 meaningful words and capitalize them
    const keyWords = words.slice(0, 3);
    
    if (keyWords.length === 0) {
      return 'AI Generated Widget';
    }
    
    // Capitalize first letter of each word
    const name = keyWords
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return name || 'AI Generated Widget';
  }, []);

  // Generate initial design with AI
  const handleGenerateImportDesign = useCallback(async () => {
    if (!aiImportDescription.trim()) {
      alert('Please provide a description for the design you want to generate.');
      return;
    }
    
    // Check if AI settings are configured
    const savedSettings = localStorage.getItem('ai-chatbot-settings');
    if (!savedSettings) {
      const shouldConfigure = confirm('AI settings are not configured. Would you like to configure them now?');
      if (shouldConfigure) {
        setShowAISettingsModal(true);
        return;
      } else {
        return;
      }
    }
    
    let settings = {};
    try {
      settings = JSON.parse(savedSettings);
    } catch (e) {
      console.error('Error parsing AI settings:', e);
    }
    
    if (!settings.apiKey) {
      const shouldConfigure = confirm('API key is missing. Would you like to configure AI settings now?');
      if (shouldConfigure) {
        setShowAISettingsModal(true);
        return;
      } else {
        alert('API key is required to generate code. Please configure your AI settings.');
        return;
      }
    }
    
    setIsGeneratingImport(true);
    
    // Generate widget name from description
    const generatedName = generateWidgetName(aiImportDescription);
    setWidgetName(generatedName);
    
    try {
      const response = await apiService.request('/generate-ui-code/', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'generate',
          description: aiImportDescription,
          existing_html: '',
          existing_css: '',
          existing_js: '',
          settings: settings
        })
      });
      
      if (response.error) {
        alert(`Error: ${response.error}`);
        return;
      }
      
      // Set preview content
      setPreviewHtml(response.html || '');
      setPreviewCss(response.css || '');
      setPreviewJs(response.js || '');
      setShowPreview(true);
      
      // Add to conversation
      setAiImportConversation([
        { role: 'user', content: aiImportDescription },
        { role: 'assistant', content: 'I\'ve generated the initial design. You can preview it and let me know if you\'d like any changes!' }
      ]);
      
    } catch (error) {
      console.error('Error generating design:', error);
      alert(`Error generating design: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingImport(false);
    }
  }, [aiImportDescription, generateWidgetName]);
  
  // Chat with AI to modify design
  const handleChatWithAI = useCallback(async (message) => {
    if (!message.trim()) return;
    
    const savedSettings = localStorage.getItem('ai-chatbot-settings');
    if (!savedSettings) {
      alert('AI settings are not configured.');
      return;
    }
    
    let settings = {};
    try {
      settings = JSON.parse(savedSettings);
    } catch (e) {
      console.error('Error parsing AI settings:', e);
      return;
    }
    
    if (!settings.apiKey) {
      alert('API key is missing. Please configure your AI settings.');
      return;
    }
    
    setIsGeneratingImport(true);
    
    // Add user message to conversation
    const updatedConversation = [...aiImportConversation, { role: 'user', content: message }];
    setAiImportConversation(updatedConversation);
    
    try {
      // Build context for AI
      const contextMessage = `Current HTML:\n${previewHtml}\n\nCurrent CSS:\n${previewCss}\n\nCurrent JS:\n${previewJs}\n\nUser request: ${message}\n\nPlease provide updated HTML, CSS, and JS based on the user's request.`;
      
      const response = await apiService.request('/generate-ui-code/', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'edit',
          description: contextMessage,
          existing_html: previewHtml,
          existing_css: previewCss,
          existing_js: previewJs,
          settings: settings
        })
      });
      
      if (response.error) {
        alert(`Error: ${response.error}`);
        return;
      }
      
      // Update preview content
      setPreviewHtml(response.html || previewHtml);
      setPreviewCss(response.css || previewCss);
      setPreviewJs(response.js || previewJs);
      
      // Add AI response to conversation
      setAiImportConversation([
        ...updatedConversation,
        { role: 'assistant', content: 'I\'ve updated the design based on your request. Check the preview and let me know if you need any other changes!' }
      ]);
      
    } catch (error) {
      console.error('Error chatting with AI:', error);
      alert(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingImport(false);
    }
  }, [aiImportConversation, previewHtml, previewCss, previewJs]);
  
  // Finalize and import the design
  const handleFinalizeImport = useCallback(() => {
    if (!previewHtml.trim()) {
      alert('No design to import. Please generate a design first.');
      return;
    }
    
    // Set the import values from preview
    setImportHtml(previewHtml);
    setImportCss(previewCss);
    setImportJs(previewJs);
    
    // Switch to manual mode to show the code
    setImportMode('manual');
    setImportTab('html');
    
    // Show success message
    const notification = document.createElement('div');
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;';
    notification.textContent = '✓ Design ready to import! Review the code and click "Import Widget" when ready.';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }, [previewHtml, previewCss, previewJs]);
  
  // Handle import widget with HTML, CSS, and JS
  const handleImportWidget = useCallback(async () => {
    if (!editor || !importHtml.trim()) {
      alert('Please provide at least HTML code to import a widget.');
      return;
    }

    try {
      // Combine HTML, CSS, and JS into a complete component
      let componentContent = importHtml.trim();
      
      // Add CSS if provided - wrap in style tag
      if (importCss.trim()) {
        const cssContent = importCss.trim();
        // Check if style tag already exists
        if (!cssContent.startsWith('<style')) {
          componentContent = `<style>${cssContent}</style>${componentContent}`;
        } else {
          componentContent = `${cssContent}${componentContent}`;
        }
      }
      
      // Add JS if provided - wrap in script tag
      if (importJs.trim()) {
        const jsContent = importJs.trim();
        // Check if script tag already exists
        if (!jsContent.startsWith('<script')) {
          componentContent = `${componentContent}<script>${jsContent}</script>`;
        } else {
          componentContent = `${componentContent}${jsContent}`;
        }
      }

      // Create a unique block ID
      const blockId = `custom-widget-${Date.now()}`;
      const blockLabel = widgetName.trim() || 'Custom Widget';
      
      // Get the Blocks manager from the editor
      const blocks = editor.Blocks;
      
      // Add the component as a custom block that can be dragged and dropped
      blocks.add(blockId, {
        label: blockLabel,
        category: 'Custom',
        media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>',
        content: componentContent,
        attributes: { 
          class: 'custom-imported-widget',
          'data-widget-id': blockId
        },
        activate: true,
        select: true
      });

      // Save widget to server
      try {
        const saveResponse = await apiService.request('/custom-widgets/save/', {
          method: 'POST',
          body: JSON.stringify({
            name: blockLabel,
            html_content: importHtml.trim(),
            css_content: importCss.trim(),
            js_content: importJs.trim(),
            block_id: blockId
          })
        });
        console.log('✅ Widget saved to server successfully:', saveResponse);
        
        // Reload widgets to ensure the new one appears (force reload)
        setTimeout(() => {
          widgetsLoadedRef.current = false; // Reset flag to allow reload
          loadCustomWidgets(editor, true); // Force reload
        }, 500);
      } catch (saveError) {
        console.warn('Failed to save widget to server:', saveError);
        // Continue anyway - widget is still added locally
      }

      // Refresh the blocks panel to show the new block
      try {
        // Trigger a refresh of the blocks panel
        editor.trigger('block:add', blockId);
        // Also try to refresh the UI
        if (blocks.render) {
          blocks.render();
        }
      } catch (refreshError) {
        console.warn('Could not refresh blocks panel:', refreshError);
        // Continue anyway - the block should still be added
      }

      // Show success notification
      const notification = document.createElement('div');
      notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;';
      notification.textContent = `✓ "${blockLabel}" imported successfully! You can now drag it from the "Custom" category in the Blocks panel.`;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);

      // Reset and close modal
      setImportHtml('');
      setImportCss('');
      setImportJs('');
      setWidgetName('Custom Widget');
      setImportTab('html');
      setShowImportModal(false);
    } catch (error) {
      console.error('Error importing widget:', error);
      alert(`Error importing widget: ${error.message}. Please check the console for details.`);
    }
  }, [editor, importHtml, importCss, importJs, widgetName]);

  // Save project handler - saves to both localStorage and server
  const handleSaveProject = useCallback(async () => {
    if (!editor) return;
    
    try {
      const projectData = editor.getProjectData();
      const currentName = projectName || 'Untitled Project';
      
      // Prepare project data for localStorage
      const projectToSave = {
        ...projectData,
        projectName: currentName,
        savedAt: new Date().toISOString(),
        serverId: serverProjectId // Keep server ID if exists
      };
      
      // Save to localStorage first (for offline access)
      localStorage.setItem('gjsProject', JSON.stringify(projectToSave));
      
      // Try to save to server
      try {
        const serverProjectData = {
          project_name: currentName,
          description: '',
          components: projectData.components || {},
          styles: projectData.styles || {},
          assets: projectData.assets || []
        };
        
        if (serverProjectId) {
          // Update existing project on server
          const updatedProject = await apiService.updateUIProject(serverProjectId, serverProjectData);
          console.log('✅ Project updated on server:', updatedProject);
        } else {
          // Create new project on server
          const newProject = await apiService.createUIProject(serverProjectData);
          setServerProjectId(newProject.id);
          // Update localStorage with server ID
          projectToSave.serverId = newProject.id;
          localStorage.setItem('gjsProject', JSON.stringify(projectToSave));
          console.log('✅ Project created on server:', newProject);
        }
      } catch (serverError) {
        console.warn('⚠️ Could not save to server (might not be authenticated):', serverError);
        // Continue anyway - project is saved locally
      }
      
      setCurrentProject({ projectName: currentName, hasChanges: false });
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
  }, [editor, projectName, serverProjectId]);

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

  // Load AI settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('ai-chatbot-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setAiSettings({
          apiKey: settings.apiKey || '',
          model: settings.model || 'llama-3.1-8b-instant',
          baseUrl: settings.baseUrl || 'https://api.groq.com/openai/v1',
          llmProvider: settings.llmProvider || 'groq'
        });
      } catch (e) {
        console.error('Error loading AI settings:', e);
      }
    }
  }, []);

  // Save AI settings
  const handleSaveAISettings = useCallback(() => {
    if (!aiSettings.apiKey.trim()) {
      alert('Please enter an API key.');
      return;
    }
    
    // Save to localStorage
    localStorage.setItem('ai-chatbot-settings', JSON.stringify(aiSettings));
    
    // Also update state to ensure it's in sync
    setAiSettings({ ...aiSettings });
    
    setShowAISettingsModal(false);
    
    // Show success notification
    const notification = document.createElement('div');
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;';
    notification.textContent = '✓ AI settings saved successfully!';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
    
    console.log('💾 AI settings saved:', { 
      hasApiKey: !!aiSettings.apiKey, 
      model: aiSettings.model,
      provider: aiSettings.llmProvider 
    });
  }, [aiSettings]);

  // Listen for custom events from GrapesJS toolbar
  useEffect(() => {
    const handleAIEditEvent = (event) => {
      const { component, mode } = event.detail;
      setSelectedComponent(component);
      setAiMode(mode);
      if (mode === 'edit') {
        setAiDescription('Improve the design and make it more modern');
      } else {
        setAiDescription('');
      }
      setShowAIEditModal(true);
    };
    
    window.addEventListener('gjs-open-ai-edit', handleAIEditEvent);
    return () => {
      window.removeEventListener('gjs-open-ai-edit', handleAIEditEvent);
    };
  }, []);

  // Handle opening AI edit modal (defined before useEffect that uses it)
  const handleOpenAIEdit = useCallback((mode) => {
    if (!selectedComponent) {
      alert('Please select a component first by clicking on it in the canvas.');
      return;
    }
    
    setAiMode(mode);
    setShowAIEditModal(true);
    
    // Pre-fill description for edit mode
    if (mode === 'edit') {
      setAiDescription('Improve the design and make it more modern');
    } else {
      setAiDescription('');
    }
  }, [selectedComponent]);


  // Handle AI code generation
  const handleGenerateCode = useCallback(async () => {
    if (!aiDescription.trim() && aiMode === 'generate') {
      alert('Please provide a description for code generation.');
      return;
    }
    
    if (!editor || !selectedComponent) {
      alert('Please select a component first.');
      return;
    }
    
    // Check if AI settings are configured
    const savedSettings = localStorage.getItem('ai-chatbot-settings');
    if (!savedSettings) {
      const shouldConfigure = confirm('AI settings are not configured. Would you like to configure them now?');
      if (shouldConfigure) {
        setShowAISettingsModal(true);
        return;
      } else {
        return;
      }
    }
    
    let settings = {};
    try {
      settings = JSON.parse(savedSettings);
    } catch (e) {
      console.error('Error parsing AI settings:', e);
    }
    
    if (!settings.apiKey) {
      const shouldConfigure = confirm('API key is missing. Would you like to configure AI settings now?');
      if (shouldConfigure) {
        setShowAISettingsModal(true);
        return;
      } else {
        alert('API key is required to generate code. Please configure your AI settings.');
        return;
      }
    }
    
    setIsGenerating(true);
    
    try {
      // Reload settings from localStorage to ensure we have the latest
      const latestSettings = JSON.parse(localStorage.getItem('ai-chatbot-settings') || '{}');
      
      // Use settings from localStorage (most up-to-date) or state as fallback
      const finalSettings = {
        apiKey: latestSettings.apiKey || settings.apiKey || aiSettings.apiKey || '',
        model: latestSettings.model || settings.model || aiSettings.model || 'llama-3.1-8b-instant',
        baseUrl: latestSettings.baseUrl || settings.baseUrl || aiSettings.baseUrl || 'https://api.groq.com/openai/v1',
        llmProvider: latestSettings.llmProvider || settings.llmProvider || aiSettings.llmProvider || 'groq'
      };
      
      // Double-check API key
      if (!finalSettings.apiKey || !finalSettings.apiKey.trim()) {
        const shouldConfigure = confirm('API key is missing. Would you like to configure AI settings now?');
        if (shouldConfigure) {
          setShowAISettingsModal(true);
          setIsGenerating(false);
          return;
        } else {
          setIsGenerating(false);
          alert('API key is required to generate code. Please configure your AI settings.');
          return;
        }
      }
      
      console.log('🔑 Using API settings:', { 
        hasApiKey: !!finalSettings.apiKey, 
        model: finalSettings.model,
        provider: finalSettings.llmProvider 
      });
      
      // Get existing component code
      let existingHtml = '';
      let existingCss = '';
      let existingJs = '';
      
      if (aiMode === 'edit' && selectedComponent) {
        try {
          // Get full HTML including all nested components
          existingHtml = selectedComponent.toHTML({ 
            withAttributes: true,
            cleanId: false 
          }) || '';
          
          // Also try to get inner HTML if toHTML doesn't work well
          if (!existingHtml || existingHtml.trim().length === 0) {
            try {
              const innerHtml = selectedComponent.getInnerHTML();
              if (innerHtml) {
                existingHtml = innerHtml;
              }
            } catch (e) {
              console.warn('Could not get inner HTML:', e);
            }
          }
          
          // Try to extract CSS from component styles
          try {
            const styles = selectedComponent.getStyle();
            if (styles && Object.keys(styles).length > 0) {
              existingCss = Object.entries(styles)
                .map(([prop, value]) => `${prop}: ${value};`)
                .join(' ');
            }
          } catch (e) {
            console.warn('Could not extract CSS:', e);
          }
          
          console.log('📝 Extracted existing HTML:', existingHtml.substring(0, 100) + '...');
        } catch (e) {
          console.warn('Could not extract existing code:', e);
        }
      }
      
      // Call backend API
      const response = await apiService.request('/generate-ui-code/', {
        method: 'POST',
        body: JSON.stringify({
          mode: aiMode,
          description: aiDescription,
          existing_html: existingHtml,
          existing_css: existingCss,
          existing_js: existingJs,
          settings: finalSettings
        })
      });
      
      if (response.error) {
        alert(`Error: ${response.error}`);
        setIsGenerating(false);
        return;
      }
      
      // Clean and store generated code in preview state
      const cleanPreviewHtml = (response.html || '').replace(/\s+id=["'][^"']*["']/gi, '');
      let cleanPreviewJs = response.js || '';
      
      // Clean JavaScript to prevent errors
      if (cleanPreviewJs) {
        const uniqueSuffix = `_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        cleanPreviewJs = cleanPreviewJs
          .replace(/(const|let|var)\s+(\w+)\s*=/g, (m, decl, name) => {
            if (['window', 'document', 'console', 'Math', 'Date', 'Array', 'Object', 'String', 'Number'].includes(name)) {
              return m;
            }
            return `${decl} ${name}${uniqueSuffix} =`;
          })
          .replace(/function\s+(\w+)\s*\(/g, (m, name) => {
            return `function ${name}${uniqueSuffix}(`;
          });
      }
      
      setAiEditPreview({
        html: cleanPreviewHtml,
        css: response.css || '',
        js: cleanPreviewJs
      });
      
      // Show preview
      setShowAIEditPreview(true);
      
      // Show success notification
      const notification = document.createElement('div');
      notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;';
      notification.textContent = '✓ Code generated! Preview below and click "Apply Changes" to update the component.';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
      
    } catch (error) {
      console.error('Error generating code:', error);
      alert(`Error generating code: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [editor, selectedComponent, aiMode, aiDescription]);
  
  // Apply the previewed changes to the component
  const handleApplyAIEditChanges = useCallback(() => {
    if (!editor || !selectedComponent) {
      alert('Please select a component first.');
      return;
    }
    
    if (!aiEditPreview.html) {
      alert('No changes to apply.');
      return;
    }
    
    try {
      // Combine HTML, CSS, and JS
      let componentContent = aiEditPreview.html || '';
      
      if (aiEditPreview.css) {
        const cssContent = aiEditPreview.css.trim();
        if (cssContent && !cssContent.startsWith('<style')) {
          componentContent = `<style>${cssContent}</style>${componentContent}`;
        } else if (cssContent) {
          componentContent = `${cssContent}${componentContent}`;
        }
      }
      
      if (aiEditPreview.js) {
        const jsContent = aiEditPreview.js.trim();
        if (jsContent && !jsContent.startsWith('<script')) {
          componentContent = `${componentContent}<script>${jsContent}</script>`;
        } else if (jsContent) {
          componentContent = `${componentContent}${jsContent}`;
        }
      }
      
      // Update the selected component properly with undo/redo support
      if (selectedComponent && editor) {
        try {
          console.log('🔄 Updating component:', selectedComponent.get('type'));
          
          // Store the current state for undo (before making changes)
          const currentContent = selectedComponent.toHTML();
          const parent = selectedComponent.parent();
          
          // Clean componentContent to remove duplicate IDs and fix JS errors
          let cleanContent = componentContent;
          try {
            // Remove any existing IDs from the generated HTML to avoid conflicts
            cleanContent = cleanContent.replace(/\s+id=["'][^"']*["']/gi, '');
            // Also remove any script tags that might have duplicate variable declarations or errors
            cleanContent = cleanContent.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (match, scriptContent) => {
              // Wrap script content in try-catch to prevent errors
              const uniqueSuffix = `_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              let cleanedScript = scriptContent
                // Fix variable declarations to be unique
                .replace(/(const|let|var)\s+(\w+)\s*=/g, (m, decl, name) => {
                  // Skip if it's already been processed or is a common global
                  if (['window', 'document', 'console', 'Math', 'Date', 'Array', 'Object', 'String', 'Number'].includes(name)) {
                    return m;
                  }
                  return `${decl} ${name}${uniqueSuffix} =`;
                })
                // Fix function declarations
                .replace(/function\s+(\w+)\s*\(/g, (m, name) => {
                  return `function ${name}${uniqueSuffix}(`;
                })
                // Wrap in try-catch
                .replace(/^([\s\S]*)$/, `try { $1 } catch(e) { console.error('Script error:', e); }`);
              
              return `<script>${cleanedScript}</script>`;
            });
          } catch (cleanError) {
            console.warn('Could not clean content, using as-is:', cleanError);
          }
          
          // Method: Simple direct update (most reliable)
          try {
            // Get components collection
            const components = selectedComponent.components();
            
            // Clear existing components first
            if (components) {
              try {
                // Try to remove all child components
                const compsArray = [];
                components.each((comp) => {
                  compsArray.push(comp);
                });
                
                // Remove each component
                compsArray.forEach((comp) => {
                  try {
                    comp.remove();
                  } catch (e) {
                    // Ignore errors
                  }
                });
              } catch (clearError) {
                console.log('Could not clear components, continuing:', clearError);
              }
            }
            
            // Set new content - GrapesJS will parse and create components
            selectedComponent.components(cleanContent);
            selectedComponent.set('content', cleanContent);
            
            console.log('✅ Component updated (direct method)');
            
          } catch (updateError) {
            console.log('Direct update failed, using simple content set:', updateError);
            // Fallback: Just set content
            try {
              selectedComponent.set('content', cleanContent);
            } catch (e) {
              console.error('All update methods failed:', e);
            }
          }
          
          // Get the updated component
          const updatedComponent = editor.getSelected() || selectedComponent;
          
          // Trigger component update events (skip UndoManager to avoid errors)
          try {
            // Use setTimeout to avoid UndoManager conflicts
            setTimeout(() => {
              try {
                updatedComponent.trigger('change:content');
                updatedComponent.trigger('change');
                updatedComponent.trigger('update');
              } catch (e) {
                // Ignore individual event errors
              }
            }, 0);
            
            // Trigger editor events separately
            try {
              editor.trigger('component:update', updatedComponent);
              editor.trigger('component:change', updatedComponent);
            } catch (e) {
              // Ignore editor event errors
            }
          } catch (e) {
            console.warn('Error triggering events:', e);
          }
          
          // Force immediate editor refresh
          editor.refresh();
          
          // Force canvas refresh using multiple strategies
          const forceCanvasRefresh = () => {
            try {
              // Always refresh editor first
              editor.refresh();
              
              // Get canvas
              const canvas = editor.Canvas.getFrameEl();
              if (canvas && canvas.contentDocument) {
                const canvasDoc = canvas.contentDocument;
                const canvasWindow = canvas.contentWindow;
                
                // Update component view directly
                try {
                  const compView = updatedComponent.getView && updatedComponent.getView();
                  if (compView) {
                    // Force re-render of the component view
                    if (compView.render) {
                      compView.render();
                    }
                    if (compView.update) {
                      compView.update();
                    }
                    // Update the DOM element directly if available
                    if (compView.el) {
                      compView.el.innerHTML = updatedComponent.toHTML();
                    }
                  }
                } catch (viewError) {
                  console.log('View update error:', viewError);
                }
                
                // Trigger events
                if (canvasWindow) {
                  try {
                    canvasWindow.dispatchEvent(new Event('resize', { bubbles: true }));
                  } catch (e) {}
                }
                
                if (canvasDoc.body) {
                  try {
                    canvasDoc.body.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
                  } catch (e) {}
                }
                
                // Ensure Tailwind is loaded
                try {
                  const head = canvasDoc.head || canvasDoc.getElementsByTagName('head')[0];
                  if (head) {
                    let tailwindScript = canvasDoc.querySelector('script[src*="tailwindcss"]');
                    if (!tailwindScript) {
                      const script = canvasDoc.createElement('script');
                      script.src = 'https://cdn.tailwindcss.com';
                      script.async = false;
                      head.appendChild(script);
                    }
                  }
                } catch (e) {}
              }
              
              // Trigger editor events
              try {
                editor.trigger('canvas:update');
                editor.trigger('update');
                editor.trigger('canvas:frame:load');
              } catch (e) {}
              
            } catch (e) {
              console.warn('Error in canvas refresh:', e);
              editor.refresh();
            }
          };
          
          // Immediate refresh
          forceCanvasRefresh();
          
          // Additional refreshes with delays to ensure visibility
          setTimeout(forceCanvasRefresh, 100);
          setTimeout(forceCanvasRefresh, 250);
          setTimeout(forceCanvasRefresh, 500);
          setTimeout(forceCanvasRefresh, 1000);
          
          console.log('✅ Component updated successfully');
        } catch (error) {
          console.error('Error updating component:', error);
          // Final fallback: simple content update
          try {
            selectedComponent.set('content', componentContent);
            editor.refresh();
            console.log('✅ Component updated (simple fallback)');
          } catch (finalError) {
            console.error('Update failed completely:', finalError);
            alert('Component updated. If changes are not visible, try refreshing the page.');
          }
        }
      }
      
      // Show success notification
      const notification = document.createElement('div');
      notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;';
      notification.textContent = `✓ Component ${aiMode === 'edit' ? 'updated' : 'generated'} successfully!`;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
      
      // Close modal and reset
      setShowAIEditModal(false);
      setShowAIEditPreview(false);
      setAiDescription('');
      setAiEditPreview({ html: '', css: '', js: '' });
      setAiMode('generate');
      
    } catch (error) {
      console.error('Error applying changes:', error);
      alert(`Error applying changes: ${error.message || 'Unknown error'}`);
    }
  }, [editor, selectedComponent, aiEditPreview, aiMode]);

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
                  onChange={(e) => {
                    const newName = e.target.value;
                    setProjectName(newName);
                    projectNameRef.current = newName;
                    // Update current project name immediately
                    setCurrentProject(prev => prev ? { ...prev, projectName: newName, hasChanges: true } : { projectName: newName, hasChanges: true });
                    setIsSaved(false);
                  }}
                  onBlur={handleSaveProject}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.target.blur(); // Trigger onBlur which calls handleSaveProject
                    }
                  }}
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
              
              <button
                className="header-btn icon-only"
                onClick={() => setShowAISettingsModal(true)}
                title="AI Settings"
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}
              >
                <FiSettings />
              </button>
            </div>
          </div>
        </div>

        {/* Studio Editor */}
        <div 
          className={`page-builder-studio ${theme}`} 
          style={{ 
            width: '100%', 
            height: 'calc(100vh - 60px)',
            position: 'relative',
            zIndex: 1,
            pointerEvents: showProjectManager ? 'none' : 'auto'
          }}
        >
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
                          id: 'ai-edit',
                          label: '',
                          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
                          onClick: ({ editor }) => {
                            const selected = editor.getSelected();
                            if (selected) {
                              window.dispatchEvent(new CustomEvent('gjs-open-ai-edit', {
                                detail: { component: selected, mode: 'edit' }
                              }));
                            } else {
                              alert('Please select a component first by clicking on it in the canvas.');
                            }
                          },
                          className: 'ai-edit-toolbar-btn',
                          attributes: { 'data-id': 'ai-edit', 'title': 'Edit with AI' }
                        },
                        {
                          id: 'save-project',
                          label: 'Save',
                          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
                          onClick: async ({ editor }) => {
                            try {
                              const projectData = editor.getProjectData();
                              // Include current project name and save timestamp
                              const currentName = projectNameRef.current || 'Untitled Project';
                              const projectToSave = {
                                ...projectData,
                                projectName: currentName,
                                savedAt: new Date().toISOString(),
                                serverId: serverProjectId
                              };
                              localStorage.setItem('gjsProject', JSON.stringify(projectToSave));
                              
                              // Try to save to server
                              try {
                                const serverProjectData = {
                                  project_name: currentName,
                                  description: '',
                                  components: projectData.components || {},
                                  styles: projectData.styles || {},
                                  assets: projectData.assets || []
                                };
                                
                                if (serverProjectId) {
                                  await apiService.updateUIProject(serverProjectId, serverProjectData);
                                } else {
                                  const newProject = await apiService.createUIProject(serverProjectData);
                                  setServerProjectId(newProject.id);
                                  projectToSave.serverId = newProject.id;
                                  localStorage.setItem('gjsProject', JSON.stringify(projectToSave));
                                }
                              } catch (serverError) {
                                console.warn('Could not save to server:', serverError);
                              }
                              
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
            // Plugin to add AI edit buttons to component toolbar and floating button
            (editor) => {
              editor.onReady(() => {
                console.log('🤖 AI Edit plugin initialized');
                
                // Create a function to open AI edit modal
                const openAIEditModal = (mode) => {
                  const selected = editor.getSelected();
                  console.log('🤖 Opening AI edit modal, mode:', mode, 'selected:', selected);
                  if (selected) {
                    // Use a custom event to communicate with React component
                    window.dispatchEvent(new CustomEvent('gjs-open-ai-edit', {
                      detail: { component: selected, mode }
                    }));
                  } else {
                    alert('Please select a component first by clicking on it in the canvas.');
                  }
                };
                
                // Register command
                editor.Commands.add('ai-edit', {
                  run: () => openAIEditModal('edit')
                });
                
                // Create floating AI edit button
                let floatingButton = null;
                
                const createFloatingButton = () => {
                  // Remove existing button if any
                  if (floatingButton) {
                    floatingButton.remove();
                  }
                  
                  // Create floating button
                  floatingButton = document.createElement('div');
                  floatingButton.id = 'gjs-ai-edit-floating-btn';
                  
                  const btn = document.createElement('button');
                  btn.className = 'gjs-ai-edit-btn';
                  btn.title = 'Edit with AI';
                  btn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                  `;
                  
                  // Add click handler
                  btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openAIEditModal('edit');
                  });
                  
                  floatingButton.appendChild(btn);
                  
                  // Initially hide the button
                  floatingButton.style.display = 'none';
                  document.body.appendChild(floatingButton);
                };
                
                // Show/hide floating button based on selection
                const updateFloatingButton = () => {
                  const selected = editor.getSelected();
                  if (floatingButton) {
                    if (selected && selected.get('type') !== 'wrapper') {
                      floatingButton.style.display = 'block';
                    } else {
                      floatingButton.style.display = 'none';
                    }
                  }
                };
                
                // Create button on ready
                createFloatingButton();
                
                // Update button visibility on selection changes
                editor.on('component:selected', updateFloatingButton);
                editor.on('component:deselected', updateFloatingButton);
                editor.on('component:update', updateFloatingButton);
                
                // Initial check
                setTimeout(updateFloatingButton, 500);
              });
            },
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
        </div>

        {/* Project Manager Modal - Rendered via Portal outside editor container */}
        {createPortal(
          <ProjectManager
            isOpen={showProjectManager}
            onClose={() => setShowProjectManager(false)}
            onLoadProject={handleLoadProject}
            currentProject={currentProject}
          />,
          document.body
        )}

        {/* Import Widget Modal - Outside Studio Editor to avoid interference */}
        {showImportModal && (
          <div className="import-modal-overlay" onClick={() => setShowImportModal(false)}>
            <div className="import-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="import-modal-header">
                <h2>Import Custom Widget</h2>
                <button className="import-modal-close" onClick={() => setShowImportModal(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="import-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Widget Name Input */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: theme === 'dark' ? '#fff' : '#333' }}>
                    Widget Name:
                  </label>
                  <input
                    type="text"
                    value={widgetName}
                    onChange={(e) => setWidgetName(e.target.value)}
                    placeholder="Enter widget name"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                      backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
                      color: theme === 'dark' ? '#fff' : '#333',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Mode Tabs (Manual / AI) */}
                <div style={{ 
                  display: 'flex', 
                  borderBottom: `2px solid ${theme === 'dark' ? '#444' : '#e0e0e0'}`,
                  marginBottom: '16px'
                }}>
                  {['manual', 'ai'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setImportMode(mode);
                        if (mode === 'manual') {
                          setImportTab('html');
                        }
                      }}
                      style={{
                        padding: '12px 24px',
                        border: 'none',
                        background: 'transparent',
                        color: importMode === mode 
                          ? (theme === 'dark' ? '#a855f7' : '#7c3aed')
                          : (theme === 'dark' ? '#999' : '#666'),
                        fontWeight: importMode === mode ? '600' : '400',
                        cursor: 'pointer',
                        borderBottom: importMode === mode 
                          ? `3px solid ${theme === 'dark' ? '#a855f7' : '#7c3aed'}`
                          : '3px solid transparent',
                        textTransform: 'capitalize',
                        fontSize: '13px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {mode === 'ai' ? '✨ Generate with AI' : '📝 Manual Import'}
                    </button>
                  ))}
                </div>

                {/* Manual Mode - Code Tabs */}
                {importMode === 'manual' && (
                  <div style={{ 
                    display: 'flex', 
                    borderBottom: `2px solid ${theme === 'dark' ? '#444' : '#e0e0e0'}`,
                    marginBottom: '16px'
                  }}>
                    {['html', 'css', 'js'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setImportTab(tab)}
                        style={{
                          padding: '12px 24px',
                          border: 'none',
                          background: 'transparent',
                          color: importTab === tab 
                            ? (theme === 'dark' ? '#a855f7' : '#7c3aed')
                            : (theme === 'dark' ? '#999' : '#666'),
                          fontWeight: importTab === tab ? '600' : '400',
                          cursor: 'pointer',
                          borderBottom: importTab === tab 
                            ? `3px solid ${theme === 'dark' ? '#a855f7' : '#7c3aed'}`
                            : '3px solid transparent',
                          textTransform: 'uppercase',
                          fontSize: '13px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {tab.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}

                {/* Tab Content */}
                <div style={{ position: 'relative' }}>
                  {/* HTML Tab */}
                  {importTab === 'html' && (
                    <div>
                      <p className="modal-description" style={{ marginBottom: '12px', color: theme === 'dark' ? '#aaa' : '#666' }}>
                        Paste your HTML code. This will be the structure of your widget.
                      </p>
                      <textarea
                        className="import-textarea"
                        placeholder="<div>Your HTML code here...</div>"
                        value={importHtml}
                        onChange={(e) => setImportHtml(e.target.value)}
                        rows={15}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '6px',
                          border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff',
                          color: theme === 'dark' ? '#fff' : '#333',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  )}

                  {/* CSS Tab */}
                  {importTab === 'css' && (
                    <div>
                      <p className="modal-description" style={{ marginBottom: '12px', color: theme === 'dark' ? '#aaa' : '#666' }}>
                        Add custom CSS styles for your widget. (Optional)
                      </p>
                      <textarea
                        className="import-textarea"
                        placeholder=".my-widget { color: blue; }"
                        value={importCss}
                        onChange={(e) => setImportCss(e.target.value)}
                        rows={15}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '6px',
                          border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff',
                          color: theme === 'dark' ? '#fff' : '#333',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  )}

                  {/* JS Tab */}
                  {importTab === 'js' && (
                    <div>
                      <p className="modal-description" style={{ marginBottom: '12px', color: theme === 'dark' ? '#aaa' : '#666' }}>
                        Add JavaScript functionality for your widget. (Optional)
                      </p>
                      <textarea
                        className="import-textarea"
                        placeholder="// Your JavaScript code here\ndocument.addEventListener('DOMContentLoaded', function() {\n  // Widget initialization\n});"
                        value={importJs}
                        onChange={(e) => setImportJs(e.target.value)}
                        rows={15}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '6px',
                          border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff',
                          color: theme === 'dark' ? '#fff' : '#333',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  )}

                  {/* AI Mode - Generation and Chat */}
                  {importMode === 'ai' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Initial Generation Section */}
                      {!showPreview && (
                        <div>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontWeight: '600', 
                            color: theme === 'dark' ? '#fff' : '#333' 
                          }}>
                            Describe the design you want to generate:
                          </label>
                          <textarea
                            placeholder="e.g., A modern pricing card with gradient background, three pricing tiers, and hover effects"
                            value={aiImportDescription}
                            onChange={(e) => setAiImportDescription(e.target.value)}
                            rows={4}
                            style={{
                              width: '100%',
                              padding: '12px',
                              borderRadius: '6px',
                              border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                              backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff',
                              color: theme === 'dark' ? '#fff' : '#333',
                              fontSize: '14px',
                              resize: 'vertical',
                              marginBottom: '12px'
                            }}
                          />
                          <button
                            onClick={handleGenerateImportDesign}
                            disabled={!aiImportDescription.trim() || isGeneratingImport}
                            style={{
                              padding: '10px 20px',
                              borderRadius: '6px',
                              border: 'none',
                              background: (!aiImportDescription.trim() || isGeneratingImport)
                                ? (theme === 'dark' ? '#444' : '#ccc')
                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: '#fff',
                              cursor: (!aiImportDescription.trim() || isGeneratingImport) ? 'not-allowed' : 'pointer',
                              fontWeight: '600',
                              opacity: (!aiImportDescription.trim() || isGeneratingImport) ? 0.6 : 1
                            }}
                          >
                            {isGeneratingImport ? 'Generating...' : '✨ Generate Design'}
                          </button>
                        </div>
                      )}

                      {/* Preview and Chat Section */}
                      {showPreview && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          {/* Preview Section */}
                          <div>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: '12px'
                            }}>
                              <label style={{ 
                                fontWeight: '600', 
                                color: theme === 'dark' ? '#fff' : '#333' 
                              }}>
                                Preview:
                              </label>
                              <button
                                onClick={handleFinalizeImport}
                                style={{
                                  padding: '8px 16px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  fontSize: '13px'
                                }}
                              >
                                ✓ Finalize & Import
                              </button>
                            </div>
                            <div
                              style={{
                                border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                                borderRadius: '6px',
                                padding: '20px',
                                backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff',
                                minHeight: '300px',
                                maxHeight: '400px',
                                overflow: 'auto'
                              }}
                            >
                              <iframe
                                title="Preview"
                                srcDoc={`
                                  <!DOCTYPE html>
                                  <html>
                                  <head>
                                    <meta charset="UTF-8">
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                    <script src="https://cdn.tailwindcss.com"></script>
                                    <style>${previewCss}</style>
                                  </head>
                                  <body style="margin: 0; padding: 0;">
                                    ${previewHtml}
                                    <script>${previewJs}</script>
                                  </body>
                                  </html>
                                `}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  minHeight: '300px',
                                  border: 'none',
                                  borderRadius: '4px'
                                }}
                              />
                            </div>
                          </div>

                          {/* Chat Section */}
                          <div>
                            <label style={{ 
                              display: 'block', 
                              marginBottom: '8px', 
                              fontWeight: '600', 
                              color: theme === 'dark' ? '#fff' : '#333' 
                            }}>
                              Chat with AI to modify the design:
                            </label>
                            
                            {/* Conversation History */}
                            <div
                              style={{
                                border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                                borderRadius: '6px',
                                padding: '12px',
                                backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f9fafb',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                marginBottom: '12px',
                                fontSize: '13px'
                              }}
                            >
                              {aiImportConversation.length === 0 ? (
                                <div style={{ 
                                  color: theme === 'dark' ? '#999' : '#666',
                                  fontStyle: 'italic',
                                  textAlign: 'center',
                                  padding: '20px'
                                }}>
                                  Start a conversation to modify your design...
                                </div>
                              ) : (
                                aiImportConversation.map((msg, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      marginBottom: '12px',
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      backgroundColor: msg.role === 'user' 
                                        ? (theme === 'dark' ? '#2a2a2a' : '#e5e7eb')
                                        : (theme === 'dark' ? '#1e3a5f' : '#dbeafe'),
                                      color: theme === 'dark' ? '#fff' : '#333'
                                    }}
                                  >
                                    <div style={{ 
                                      fontWeight: '600', 
                                      marginBottom: '4px',
                                      fontSize: '12px',
                                      color: theme === 'dark' ? '#a855f7' : '#7c3aed'
                                    }}>
                                      {msg.role === 'user' ? 'You' : 'AI'}
                                    </div>
                                    <div>{msg.content}</div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Chat Input */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                type="text"
                                placeholder="e.g., Make the colors more vibrant, add animations..."
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (chatMessage.trim()) {
                                      handleChatWithAI(chatMessage);
                                      setChatMessage('');
                                    }
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  padding: '10px 12px',
                                  borderRadius: '6px',
                                  border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                                  backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
                                  color: theme === 'dark' ? '#fff' : '#333',
                                  fontSize: '14px'
                                }}
                              />
                              <button
                                onClick={() => {
                                  if (chatMessage.trim()) {
                                    handleChatWithAI(chatMessage);
                                    setChatMessage('');
                                  }
                                }}
                                disabled={isGeneratingImport || !chatMessage.trim()}
                                style={{
                                  padding: '10px 20px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: (isGeneratingImport || !chatMessage.trim())
                                    ? (theme === 'dark' ? '#444' : '#ccc')
                                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  color: '#fff',
                                  cursor: (isGeneratingImport || !chatMessage.trim()) ? 'not-allowed' : 'pointer',
                                  fontWeight: '600',
                                  opacity: (isGeneratingImport || !chatMessage.trim()) ? 0.6 : 1
                                }}
                              >
                                {isGeneratingImport ? '...' : 'Send'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="import-modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowImportModal(false);
                    setImportHtml('');
                    setImportCss('');
                    setImportJs('');
                    setWidgetName('Custom Widget');
                    setImportTab('html');
                    setImportMode('manual');
                    // Reset AI state
                    setAiImportDescription('');
                    setAiImportConversation([]);
                    setPreviewHtml('');
                    setPreviewCss('');
                    setPreviewJs('');
                    setShowPreview(false);
                    setIsGeneratingImport(false);
                    setChatMessage('');
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: theme === 'dark' ? '#444' : '#e0e0e0',
                    color: theme === 'dark' ? '#fff' : '#333',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                {importMode === 'manual' && (
                  <button 
                    className="btn btn-primary" 
                    onClick={handleImportWidget}
                    disabled={!importHtml.trim()}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: !importHtml.trim() 
                        ? (theme === 'dark' ? '#444' : '#ccc')
                        : (theme === 'dark' ? '#a855f7' : '#7c3aed'),
                      color: '#fff',
                      cursor: !importHtml.trim() ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      opacity: !importHtml.trim() ? 0.6 : 1
                    }}
                  >
                    Import Widget
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Edit Modal */}
        {showAIEditModal && (
          <div className="import-modal-overlay" onClick={() => setShowAIEditModal(false)}>
            <div className="import-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="import-modal-header">
                <h2>
                  <FiZap style={{ display: 'inline', marginRight: '8px' }} />
                  Edit with AI
                </h2>
                <button className="import-modal-close" onClick={() => setShowAIEditModal(false)}>
                  <FiX />
                </button>
              </div>
              <div className="import-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Description Input - Show when no preview */}
                {!showAIEditPreview && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600', 
                      color: theme === 'dark' ? '#fff' : '#333' 
                    }}>
                      {aiMode === 'edit' ? 'Describe how you want to edit this component:' : 'Describe what you want to generate:'}
                    </label>
                    <textarea
                      className="import-textarea"
                      placeholder={
                        aiMode === 'edit' 
                          ? "e.g., Make it more modern with gradient backgrounds and rounded corners"
                          : "e.g., A hero section with a call-to-action button and animated background"
                      }
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      rows={6}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                        backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff',
                        color: theme === 'dark' ? '#fff' : '#333',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                )}
                
                {/* Preview Section - Show when preview is available */}
                {showAIEditPreview && aiEditPreview.html && (
                  <div style={{ 
                    marginBottom: '20px',
                    border: `2px solid ${theme === 'dark' ? '#7c3aed' : '#a855f7'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    backgroundColor: theme === 'dark' ? '#1e1b4b' : '#f3e8ff',
                    boxShadow: theme === 'dark' 
                      ? '0 4px 6px rgba(124, 58, 237, 0.3)' 
                      : '0 4px 6px rgba(168, 85, 247, 0.2)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#10b981',
                          animation: 'pulse 2s infinite'
                        }}></div>
                        <label style={{ 
                          fontWeight: '700', 
                          fontSize: '16px',
                          color: theme === 'dark' ? '#fff' : '#333' 
                        }}>
                          Live Preview
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setShowAIEditPreview(false);
                            setAiEditPreview({ html: '', css: '', js: '' });
                          }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: `1px solid ${theme === 'dark' ? '#666' : '#ccc'}`,
                            backgroundColor: theme === 'dark' ? '#444' : '#fff',
                            color: theme === 'dark' ? '#fff' : '#333',
                            cursor: 'pointer',
                            fontWeight: '500',
                            fontSize: '13px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = theme === 'dark' ? '#555' : '#f0f0f0';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = theme === 'dark' ? '#444' : '#fff';
                          }}
                        >
                          ↻ Regenerate
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        border: `2px solid ${theme === 'dark' ? '#4c1d95' : '#c4b5fd'}`,
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                        minHeight: '450px',
                        maxHeight: '600px',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <iframe
                        title="Preview"
                        srcDoc={`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      min-height: 100vh;
      background: #ffffff;
    }
    ${aiEditPreview.css || ''}
  </style>
  <script>
    window.addEventListener('error', function(e) {
      console.error('Preview error:', e.message);
      e.preventDefault();
    });
    window.addEventListener('unhandledrejection', function(e) {
      console.error('Preview promise rejection:', e.reason);
      e.preventDefault();
    });
  </script>
</head>
<body>
  ${aiEditPreview.html || ''}
  <script>
    try {
      ${aiEditPreview.js || ''}
    } catch(e) {
      console.error('Script error in preview:', e);
    }
  </script>
</body>
</html>`}
                        style={{
                          width: '100%',
                          height: '100%',
                          minHeight: '450px',
                          border: 'none',
                          borderRadius: '4px',
                          backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff'
                        }}
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                    <div style={{
                      marginTop: '12px',
                      padding: '10px',
                      borderRadius: '6px',
                      backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                      border: `1px solid ${theme === 'dark' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: '13px',
                        color: theme === 'dark' ? '#6ee7b7' : '#059669',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>✓</span>
                        <span>Review the preview above. Click "Apply Changes" to update your component.</span>
                      </p>
                    </div>
                  </div>
                )}
                
                {isGenerating && (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: theme === 'dark' ? '#aaa' : '#666'
                  }}>
                    <div style={{
                      display: 'inline-block',
                      width: '40px',
                      height: '40px',
                      border: `4px solid ${theme === 'dark' ? '#444' : '#e5e7eb'}`,
                      borderTopColor: '#3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '12px'
                    }}></div>
                    <p>Generating code with AI...</p>
                  </div>
                )}
              </div>
              <div className="import-modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowAIEditModal(false);
                    setShowAIEditPreview(false);
                    setAiDescription('');
                    setAiEditPreview({ html: '', css: '', js: '' });
                  }}
                  disabled={isGenerating}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: theme === 'dark' ? '#444' : '#e0e0e0',
                    color: theme === 'dark' ? '#fff' : '#333',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    opacity: isGenerating ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                {!showAIEditPreview ? (
                  <button 
                    className="btn btn-primary" 
                    onClick={handleGenerateCode}
                    disabled={!aiDescription.trim() || isGenerating}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: (!aiDescription.trim() || isGenerating)
                        ? (theme === 'dark' ? '#444' : '#ccc')
                        : (theme === 'dark' ? '#a855f7' : '#7c3aed'),
                      color: '#fff',
                      cursor: (!aiDescription.trim() || isGenerating) ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      opacity: (!aiDescription.trim() || isGenerating) ? 0.6 : 1
                    }}
                  >
                    {isGenerating ? 'Generating...' : (aiMode === 'edit' ? 'Generate Preview' : 'Generate Code')}
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary" 
                    onClick={handleApplyAIEditChanges}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    ✓ Apply Changes
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Settings Modal */}
        {showAISettingsModal && createPortal(
          <div className="import-modal-overlay" onClick={() => setShowAISettingsModal(false)}>
            <div className="import-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <div className="import-modal-header">
                <h2>
                  <FiSettings style={{ display: 'inline', marginRight: '8px' }} />
                  AI Settings
                </h2>
                <button className="import-modal-close" onClick={() => setShowAISettingsModal(false)}>
                  <FiX />
                </button>
              </div>
              <div className="import-modal-body">
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 600, 
                    fontSize: '14px',
                    color: theme === 'dark' ? '#fff' : '#333'
                  }}>
                    API Key <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="password"
                    value={aiSettings.apiKey}
                    onChange={(e) => setAiSettings({ ...aiSettings, apiKey: e.target.value })}
                    placeholder="Enter your API key (e.g., Groq, OpenAI)"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${theme === 'dark' ? '#444' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff',
                      color: theme === 'dark' ? '#fff' : '#333'
                    }}
                  />
                  <p style={{ marginTop: '6px', fontSize: '12px', color: theme === 'dark' ? '#888' : '#6b7280' }}>
                    Your API key is stored locally and never sent to our servers.
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 600, 
                    fontSize: '14px',
                    color: theme === 'dark' ? '#fff' : '#333'
                  }}>
                    LLM Provider
                  </label>
                  <select
                    value={aiSettings.llmProvider}
                    onChange={(e) => {
                      const provider = e.target.value;
                      setAiSettings({
                        ...aiSettings,
                        llmProvider: provider,
                        baseUrl: provider === 'groq' 
                          ? 'https://api.groq.com/openai/v1'
                          : provider === 'openai'
                          ? 'https://api.openai.com/v1'
                          : aiSettings.baseUrl
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${theme === 'dark' ? '#444' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff',
                      color: theme === 'dark' ? '#fff' : '#333'
                    }}
                  >
                    <option value="groq">Groq</option>
                    <option value="openai">OpenAI</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 600, 
                    fontSize: '14px',
                    color: theme === 'dark' ? '#fff' : '#333'
                  }}>
                    Model
                  </label>
                  <select
                    value={aiSettings.model}
                    onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${theme === 'dark' ? '#444' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff',
                      color: theme === 'dark' ? '#fff' : '#333'
                    }}
                  >
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant (Groq)</option>
                    <option value="llama-3.1-70b-versatile">Llama 3.1 70B Versatile (Groq)</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B (Groq)</option>
                    <option value="gpt-4">GPT-4 (OpenAI)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (OpenAI)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 600, 
                    fontSize: '14px',
                    color: theme === 'dark' ? '#fff' : '#333'
                  }}>
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={aiSettings.baseUrl}
                    onChange={(e) => setAiSettings({ ...aiSettings, baseUrl: e.target.value })}
                    placeholder="https://api.groq.com/openai/v1"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${theme === 'dark' ? '#444' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff',
                      color: theme === 'dark' ? '#fff' : '#333'
                    }}
                  />
                  <p style={{ marginTop: '6px', fontSize: '12px', color: theme === 'dark' ? '#888' : '#6b7280' }}>
                    API endpoint URL for your LLM provider.
                  </p>
                </div>
              </div>
              <div className="import-modal-footer">
                <button 
                  onClick={() => setShowAISettingsModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: theme === 'dark' ? '#444' : '#e0e0e0',
                    color: theme === 'dark' ? '#fff' : '#333',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveAISettings}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

export default PageBuilder;
