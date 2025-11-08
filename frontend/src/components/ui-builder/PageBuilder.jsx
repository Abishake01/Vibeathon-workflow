import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '../../theme';
import { useNavigation } from '../../router/AppRouter';
import PageBuilderToolbar from './PageBuilderToolbar';
import WidgetImportModal from './WidgetImportModal';
import CodeExportModal from './CodeExportModal';
import ProjectManager from './ProjectManager';
import './PageBuilder.css';

// Lazy load grapesjs to handle missing dependency
let grapesjs = null;
let grapesjsLoaded = false;

const loadGrapesJS = async () => {
  if (grapesjsLoaded) return grapesjs;
  try {
    const grapesjsModule = await import('grapesjs');
    await import('grapesjs/dist/css/grapes.min.css');
    grapesjs = grapesjsModule.default;
    grapesjsLoaded = true;
    return grapesjs;
  } catch (error) {
    return null;
  }
};

function PageBuilder() {
  const { theme, toggleTheme } = useTheme();
  const { navigateToBuilder } = useNavigation();
  const editorRef = useRef(null);
  const [editor, setEditor] = useState(null);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [activeDevice, setActiveDevice] = useState('Desktop');
  const [showWidgetImport, setShowWidgetImport] = useState(false);
  const [showCodeExport, setShowCodeExport] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [activePanel, setActivePanel] = useState('blocks'); // blocks, layers, styles
  const [activePropTab, setActivePropTab] = useState('properties'); // properties, styles-props
  const [hasChanges, setHasChanges] = useState(false);
  const [initError, setInitError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize GrapesJS
  useEffect(() => {
    if (editorRef.current) return;
    
    let timer = null;
    let cleanupTimer = null;
    
    setIsLoading(true);
    setInitError(null);
    
    // Helper function to initialize GrapesJS commands
    const setupGrapesJSCommands = (grapes) => {
      grapes.Commands.add('set-device-desktop', {
        run: editor => {
          editor.setDevice('Desktop');
          setActiveDevice('Desktop');
        }
      });
      
      grapes.Commands.add('set-device-tablet', {
        run: editor => {
          editor.setDevice('Tablet');
          setActiveDevice('Tablet');
        }
      });
      
      grapes.Commands.add('set-device-mobile', {
        run: editor => {
          editor.setDevice('Mobile');
          setActiveDevice('Mobile');
        }
      });
      
      grapes.Commands.add('show-blocks', {
        run: () => setActivePanel('blocks')
      });
      
      grapes.Commands.add('show-layers', {
        run: () => setActivePanel('layers')
      });
      
      // Track changes
      grapes.on('change', () => {
        setHasChanges(true);
      });
      
      // Global variable to track dragged block
      window.draggedBlockId = null;
      
      editorRef.current = grapes;
      setEditor(grapes);
      setIsLoading(false);
    };
    
    // Load grapesjs dynamically and initialize
    loadGrapesJS().then((grapesjsLib) => {
      if (!grapesjsLib) {
        setInitError('GrapesJS library not found. Please install it: npm install grapesjs');
        setIsLoading(false);
        return;
      }
      
      timer = setTimeout(async () => {
        try {
          const { getGrapesConfig } = await import('./grapesConfig');
          
          // Ensure all containers exist and are accessible
          const blocksContainer = document.getElementById('blocks-container');
          const traitsContainer = document.getElementById('traits-container');
          const layersContainer = document.getElementById('layers-container');
          const selectorsContainer = document.getElementById('selectors-container');
          const stylesSectorsContainer = document.getElementById('styles-sectors-container');
          const editorContainer = document.getElementById('gjs-editor');
          
          if (!blocksContainer || !traitsContainer || !layersContainer || !selectorsContainer || !stylesSectorsContainer || !editorContainer) {
            cleanupTimer = setTimeout(() => {
              try {
              const config = getGrapesConfig(theme);
              const grapes = grapesjsLib.init(config);
              setupGrapesJSCommands(grapes);
              } catch (error) {
                setInitError(`Initialization failed: ${error.message}`);
                setIsLoading(false);
              }
            }, 200);
            return;
          }
          
          // Ensure containers are valid DOM nodes
          if (!(blocksContainer instanceof HTMLElement) || 
              !(traitsContainer instanceof HTMLElement) || 
              !(layersContainer instanceof HTMLElement) || 
              !(selectorsContainer instanceof HTMLElement) || 
              !(stylesSectorsContainer instanceof HTMLElement) || 
              !(editorContainer instanceof HTMLElement)) {
            setInitError('Invalid container elements found');
            setIsLoading(false);
            return;
          }
          
          // Ensure containers are visible (at least for initialization)
          blocksContainer.style.display = 'block';
          layersContainer.style.display = 'block';
          
          const config = getGrapesConfig(theme);
          
          // Verify config before initialization
          if (!config || !config.container) {
            setInitError('Invalid GrapesJS configuration');
            setIsLoading(false);
            return;
          }
          
          // Validate blocks
          if (!config.blockManager?.blocks || !Array.isArray(config.blockManager.blocks)) {
            setInitError('Invalid blocks configuration');
            setIsLoading(false);
            return;
          }
          
          // Double-check that all appendTo containers exist
          const appendToSelectors = [
            config.blockManager?.appendTo,
            config.layerManager?.appendTo,
            config.traitManager?.appendTo,
            config.selectorManager?.appendTo,
            config.styleManager?.appendTo
          ];
          
          for (const selector of appendToSelectors) {
            if (selector) {
              const element = typeof selector === 'string' 
                ? document.querySelector(selector)
                : selector;
              if (!element || !(element instanceof HTMLElement)) {
                setInitError(`Container not found: ${selector}`);
                setIsLoading(false);
                return;
              }
            }
          }
          
          let grapes;
          try {
            grapes = grapesjsLib.init(config);
          } catch (initError) {
            setInitError(`GrapesJS init failed: ${initError.message}. Check console for details.`);
            setIsLoading(false);
            console.error('GrapesJS initialization error:', initError);
            console.error('Config:', config);
            return;
          }
          
          window.grapesjsEditor = grapes;
          
          grapes.on('load', () => {
            const canvas = grapes.Canvas;
            const canvasEl = canvas.getElement();
            const frameEl = canvas.getFrameEl();
            
            if (canvasEl) {
              canvasEl.style.pointerEvents = 'auto';
            }
            if (frameEl) {
              frameEl.style.pointerEvents = 'auto';
              
              // Inject Tailwind CSS after canvas loads
              setTimeout(() => {
                if (frameEl.contentDocument && frameEl.contentDocument.head) {
                  const existingTailwind = frameEl.contentDocument.head.querySelector('script[src*="tailwindcss"]');
                  if (!existingTailwind) {
                    const script = frameEl.contentDocument.createElement('script');
                    script.src = 'https://cdn.tailwindcss.com';
                    script.async = true;
                    frameEl.contentDocument.head.appendChild(script);
                  }
                }
              }, 100);
            }
          });
          
          setTimeout(() => {
            const blockElements = document.querySelectorAll('.gjs-block');
            if (blockElements.length > 0) {
              blockElements.forEach(block => {
                block.style.cursor = 'grab';
                block.draggable = true;
                block.setAttribute('draggable', 'true');
                
                block.addEventListener('mousedown', () => {
                  block.style.cursor = 'grabbing';
                });
                block.addEventListener('mouseup', () => {
                  block.style.cursor = 'grab';
                });
                block.addEventListener('dragend', () => {
                  block.style.cursor = 'grab';
                });
              });
              
              setTimeout(() => {
                const frame = grapes.Canvas.getFrameEl();
                if (frame && frame.contentDocument && frame.contentDocument.body) {
                  const frameBody = frame.contentDocument.body;
                  
                  if (!window.draggedBlockId) {
                    window.draggedBlockId = null;
                  }
                  
                  const blockContentMap = {
                    'Text': '<div class="text-base text-gray-700">Edit this text</div>',
                    'Heading': '<h1 class="text-4xl font-bold text-gray-900 mb-4">Heading</h1>',
                    'Paragraph': '<p class="text-base text-gray-600 leading-relaxed">This is a paragraph. Click to edit the text.</p>',
                    'Button': '<button class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer">Click Me</button>',
                    'Image': '<img src="https://via.placeholder.com/350x200" alt="Placeholder Image" class="w-full h-auto rounded-lg shadow-md">',
                    'Container': '<div class="p-5 border-2 border-dashed border-gray-300 rounded-lg min-h-[100px] bg-gray-50">Container - Drop elements here</div>',
                    '2 Columns': '<div class="flex flex-col md:flex-row gap-5"><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 1</div><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 2</div></div>',
                    '3 Columns': '<div class="flex flex-col md:flex-row gap-5"><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 1</div><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 2</div><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 3</div></div>',
                    'Section': '<section class="py-10 px-5 bg-gray-100 my-5 rounded-lg"><h2 class="text-3xl font-bold text-gray-900 mb-4">Section Title</h2><p class="text-gray-600">Section content goes here.</p></section>',
                    'Card': '<div class="border border-gray-200 rounded-xl p-6 shadow-lg bg-white"><h3 class="text-2xl font-bold text-gray-900 mb-3">Card Title</h3><p class="text-gray-600 mb-4">Card content goes here.</p><button class="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 cursor-pointer">Action</button></div>'
                  };
                  
                  frameBody.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'copy';
                  });
                  
                  frameBody.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (window.draggedBlockId) {
                      const content = blockContentMap[window.draggedBlockId];
                      if (content) {
                        grapes.addComponents(content);
                        window.draggedBlockId = null;
                      }
                    }
                  });
                  
                  frameBody.style.minHeight = '100vh';
                  frameBody.style.background = '#fff';
                  
                  blockElements.forEach((block) => {
                    const blockText = block.textContent.trim();
                    
                    block.addEventListener('dragstart', (e) => {
                      window.draggedBlockId = blockText;
                      if (e.dataTransfer) {
                        e.dataTransfer.effectAllowed = 'copy';
                        e.dataTransfer.setData('text/plain', blockText);
                      }
                    });
                    
                    block.addEventListener('dragend', () => {
                      setTimeout(() => {
                        if (window.draggedBlockId === blockText) {
                          window.draggedBlockId = null;
                        }
                      }, 100);
                    });
                  });
                } else {
                  setTimeout(() => {
                    const frame = grapes.Canvas.getFrameEl();
                    if (frame && frame.contentDocument && frame.contentDocument.body) {
                      const frameBody = frame.contentDocument.body;
                      
                      if (!window.draggedBlockId) {
                        window.draggedBlockId = null;
                      }
                      
                      const blockContentMap = {
                        'Text': '<div class="text-base text-gray-700">Edit this text</div>',
                        'Heading': '<h1 class="text-4xl font-bold text-gray-900 mb-4">Heading</h1>',
                        'Paragraph': '<p class="text-base text-gray-600 leading-relaxed">This is a paragraph. Click to edit the text.</p>',
                        'Button': '<button class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer">Click Me</button>',
                        'Image': '<img src="https://via.placeholder.com/350x200" alt="Placeholder Image" class="w-full h-auto rounded-lg shadow-md">',
                        'Container': '<div class="p-5 border-2 border-dashed border-gray-300 rounded-lg min-h-[100px] bg-gray-50">Container - Drop elements here</div>',
                        '2 Columns': '<div class="flex flex-col md:flex-row gap-5"><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 1</div><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 2</div></div>',
                        '3 Columns': '<div class="flex flex-col md:flex-row gap-5"><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 1</div><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 2</div><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 3</div></div>',
                        'Section': '<section class="py-10 px-5 bg-gray-100 my-5 rounded-lg"><h2 class="text-3xl font-bold text-gray-900 mb-4">Section Title</h2><p class="text-gray-600">Section content goes here.</p></section>',
                        'Card': '<div class="border border-gray-200 rounded-xl p-6 shadow-lg bg-white"><h3 class="text-2xl font-bold text-gray-900 mb-3">Card Title</h3><p class="text-gray-600 mb-4">Card content goes here.</p><button class="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 cursor-pointer">Action</button></div>'
                      };
                      
                      frameBody.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'copy';
                      });
                      
                      frameBody.addEventListener('drop', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.draggedBlockId) {
                          const content = blockContentMap[window.draggedBlockId];
                          if (content) {
                            grapes.addComponents(content);
                            window.draggedBlockId = null;
                          }
                        }
                      });
                      
                      const blockElements = document.querySelectorAll('.gjs-block');
                      blockElements.forEach((block) => {
                        const blockText = block.textContent.trim();
                        block.addEventListener('dragstart', (e) => {
                          window.draggedBlockId = blockText;
                          if (e.dataTransfer) {
                            e.dataTransfer.effectAllowed = 'copy';
                            e.dataTransfer.setData('text/plain', blockText);
                          }
                        });
                      });
                    }
                  }, 1000);
                }
              }, 1500);
            }
          }, 500);
          
          setupGrapesJSCommands(grapes);
          
          const savedProject = localStorage.getItem('gjsProject');
          if (savedProject) {
            try {
              const project = JSON.parse(savedProject);
              if (project.projectName) {
                setProjectName(project.projectName);
              }
            } catch (error) {
              // Silent fail
            }
          }
        } catch (error) {
          setInitError(`Initialization failed: ${error.message}`);
          setIsLoading(false);
          console.error('GrapesJS initialization error:', error);
        }
      }, 100);
    }).catch(error => {
      setInitError(`Failed to load GrapesJS: ${error.message}`);
      setIsLoading(false);
    });
    
    return () => {
      if (timer) clearTimeout(timer);
      if (cleanupTimer) clearTimeout(cleanupTimer);
      if (editorRef.current) {
        try {
        editorRef.current.destroy();
        } catch (error) {
          // Silent cleanup
        }
        editorRef.current = null;
      }
    };
  }, [theme]);

  // Update theme
  useEffect(() => {
    if (editor) {
      const editorEl = document.querySelector('#gjs-editor');
      if (editorEl) {
        editorEl.setAttribute('data-theme', theme);
      }
    }
  }, [theme, editor]);

  // Handle save
  const handleSave = useCallback(() => {
    if (editor) {
      const html = editor.getHtml();
      const css = editor.getCss();
      const components = editor.getComponents();
      const styles = editor.getStyle();
      
      const project = {
        projectName,
        html,
        css,
        components: components.toJSON(),
        styles: styles.toJSON(),
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem('gjsProject', JSON.stringify(project));
      localStorage.setItem(`gjsProject_${projectName}`, JSON.stringify(project));
      setHasChanges(false);
      
      // Show toast notification
      const toast = document.createElement('div');
      toast.className = 'toast-notification success';
      toast.textContent = '✅ Project saved successfully!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }, [editor, projectName]);

  // Handle device change
  const handleDeviceChange = useCallback((device) => {
    if (editor) {
      editor.setDevice(device);
      setActiveDevice(device);
    }
  }, [editor]);

  // Handle preview toggle
  const handlePreviewToggle = useCallback(() => {
    if (editor) {
      const commands = editor.Commands;
      if (isPreviewMode) {
        commands.stop('preview');
      } else {
        commands.run('preview');
      }
      setIsPreviewMode(!isPreviewMode);
    }
  }, [editor, isPreviewMode]);

  // Handle fullscreen
  const handleFullscreen = useCallback(() => {
    if (editor) {
      editor.Commands.run('fullscreen');
    }
  }, [editor]);

  // Handle undo/redo
  const handleUndo = useCallback(() => {
    if (editor) {
      editor.Commands.run('undo');
    }
  }, [editor]);

  const handleRedo = useCallback(() => {
    if (editor) {
      editor.Commands.run('redo');
    }
  }, [editor]);

  // Handle clear canvas
  const handleClear = useCallback(() => {
    if (editor) {
      const message = '⚠️ WARNING: This will delete ALL elements from the canvas!\n\nThis action cannot be undone.\n\nAre you sure you want to clear the entire canvas?';
      if (confirm(message)) {
        editor.DomComponents.clear();
        editor.CssComposer.clear();
        setHasChanges(true);
        
        // Show success notification
        const toast = document.createElement('div');
        toast.className = 'toast-notification success';
        toast.textContent = '🗑️ Canvas cleared successfully!';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    }
  }, [editor]);

  // Handle export
  const handleExport = useCallback(() => {
    setShowCodeExport(true);
  }, []);

  // Handle widget import
  const handleImportWidget = useCallback((widgetData) => {
    if (editor) {
      // Inject Tailwind CSS if needed
      if (widgetData.useTailwind) {
        const tailwindCDN = 'https://cdn.tailwindcss.com';
        const canvas = editor.Canvas;
        const frame = canvas.getFrameEl();
        
        if (frame && frame.contentDocument) {
          const doc = frame.contentDocument;
          const head = doc.head;
          
          // Check if Tailwind is already loaded
          const existingTailwind = head.querySelector('script[src*="tailwindcss"]');
          if (!existingTailwind) {
            const script = doc.createElement('script');
            script.src = tailwindCDN;
            script.async = true;
            head.appendChild(script);
          }
        }
      }

      // Inject external stylesheets
      if (widgetData.externalStyles && widgetData.externalStyles.length > 0) {
        const canvas = editor.Canvas;
        const frame = canvas.getFrameEl();
        
        if (frame && frame.contentDocument) {
          const doc = frame.contentDocument;
          const head = doc.head;
          
          widgetData.externalStyles.forEach(url => {
            // Check if already loaded
            const existing = head.querySelector(`link[href="${url}"]`);
            if (!existing) {
              const link = doc.createElement('link');
              link.rel = 'stylesheet';
              link.href = url;
              link.onload = () => {
                console.log(`✅ Stylesheet loaded: ${url}`);
                editor.refresh();
              };
              head.appendChild(link);
            }
          });
        }
      }

      // Inject external scripts
      if (widgetData.externalScripts && widgetData.externalScripts.length > 0) {
        const canvas = editor.Canvas;
        const frame = canvas.getFrameEl();
        
        if (frame && frame.contentDocument) {
          const doc = frame.contentDocument;
          const head = doc.head;
          
          widgetData.externalScripts.forEach(url => {
            // Check if already loaded
            const existing = head.querySelector(`script[src="${url}"]`);
            if (!existing) {
              const script = doc.createElement('script');
              script.src = url;
              script.async = true;
              script.onload = () => {
                console.log(`✅ Script loaded: ${url}`);
                editor.refresh();
              };
              script.onerror = () => {
                console.error(`❌ Failed to load script: ${url}`);
              };
              head.appendChild(script);
            }
          });
        }
      }

      // Add custom CSS if provided
      if (widgetData.css) {
        editor.CssComposer.addRules(widgetData.css);
      }

      // Add custom JS if provided
      if (widgetData.js) {
        const canvas = editor.Canvas;
        const frame = canvas.getFrameEl();
        if (frame && frame.contentWindow) {
          try {
            // Execute JS in the frame context
            frame.contentWindow.eval(widgetData.js);
          } catch (error) {
            console.warn('Error executing widget JS:', error);
          }
        }
      }

      // Add imported widget as a custom block
      editor.BlockManager.add(widgetData.id || `custom-${Date.now()}`, {
        label: widgetData.label || 'Custom Widget',
        category: 'Custom',
        content: widgetData.html,
        attributes: { class: 'custom-widget' }
      });
      
      setShowWidgetImport(false);
      
      // Show success notification
      const toast = document.createElement('div');
      toast.className = 'toast-notification success';
      toast.textContent = '✅ Widget imported successfully!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }, [editor]);

  // Handle project load
  const handleLoadProject = useCallback((project) => {
    if (editor && project) {
      editor.setComponents(project.components);
      editor.setStyle(project.styles);
      setProjectName(project.projectName || 'Untitled Project');
      setHasChanges(false);
      setShowProjectManager(false);
    }
  }, [editor]);

  return (
    <div className={`page-builder ${theme}`} data-theme={theme}>
      {/* Loading State */}
      {isLoading && (
        <div className="page-builder-loading">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h3>Loading Page Builder...</h3>
            <p>Initializing GrapesJS editor</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {initError && !isLoading && (
        <div className="page-builder-error">
          <div className="error-content">
            <h2>❌ Page Builder Failed to Load</h2>
            <p className="error-message">{initError}</p>
            <div className="error-actions">
              <button 
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                🔄 Reload Page
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  localStorage.removeItem('gjsProject');
                  window.location.reload();
                }}
              >
                🗑️ Clear Data & Reload
              </button>
            </div>
            <div className="error-help">
              <h4>Troubleshooting:</h4>
              <ul>
                <li>Check browser console (F12) for detailed errors</li>
                <li>Ensure GrapesJS is installed: <code>npm install grapesjs</code></li>
                <li>Try clearing your browser cache</li>
                <li>Check that all block files exist in <code>blocks/</code> folder</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <PageBuilderToolbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        activeDevice={activeDevice}
        onDeviceChange={handleDeviceChange}
        onSave={handleSave}
        onExport={handleExport}
        onImportWidget={() => setShowWidgetImport(true)}
        onPreview={handlePreviewToggle}
        onFullscreen={handleFullscreen}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onProjectManager={() => setShowProjectManager(true)}
        hasChanges={hasChanges}
        isPreviewMode={isPreviewMode}
      />

      {/* Main Editor Layout */}
      <div className="page-builder-layout">
        {/* Left Panel - Blocks/Layers/Styles */}
        <div className="left-panel">
          <div className="panel-tabs">
            <button
              className={`panel-tab ${activePanel === 'blocks' ? 'active' : ''}`}
              onClick={() => setActivePanel('blocks')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
              </svg>
              <span>Blocks</span>
            </button>
            <button
              className={`panel-tab ${activePanel === 'layers' ? 'active' : ''}`}
              onClick={() => setActivePanel('layers')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <span>Layers</span>
            </button>
          </div>
          
          <div className="panel-content">
            <div 
              id="blocks-container" 
              style={{ 
                display: activePanel === 'blocks' ? 'block' : 'none',
                height: activePanel === 'blocks' ? '100%' : '0',
                overflow: activePanel === 'blocks' ? 'auto' : 'hidden',
                overflowY: activePanel === 'blocks' ? 'auto' : 'hidden',
                overflowX: 'hidden'
              }} 
            />
            <div 
              id="layers-container" 
              style={{ 
                display: activePanel === 'layers' ? 'block' : 'none',
                height: activePanel === 'layers' ? '100%' : '0',
                overflow: activePanel === 'layers' ? 'auto' : 'hidden',
                overflowY: activePanel === 'layers' ? 'auto' : 'hidden',
                overflowX: 'hidden'
              }} 
            />
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="center-panel">
          <div id="gjs-editor" />
        </div>

        {/* Right Panel - Properties */}
        <div className="right-panel">
          <div className="panel-header">
            <h3>Properties</h3>
          </div>
          <div className="properties-tabs">
            <button
              className={`prop-tab ${activePropTab === 'properties' ? 'active' : ''}`}
              onClick={() => setActivePropTab('properties')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 9h6M9 15h6"/>
              </svg>
              <span>Component</span>
            </button>
            <button
              className={`prop-tab ${activePropTab === 'styles-props' ? 'active' : ''}`}
              onClick={() => setActivePropTab('styles-props')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span>Styles</span>
            </button>
          </div>
          <div className="properties-content">
            <div 
              id="traits-container" 
              className={activePropTab === 'properties' ? 'prop-tab-content active' : 'prop-tab-content'}
            />
            <div 
              id="styles-container" 
              className={activePropTab === 'styles-props' ? 'prop-tab-content active' : 'prop-tab-content'}
            >
              {/* Selector Manager - for selecting which element/class to style */}
              <div className="selectors-wrapper">
                <div className="selectors-header">
                  <h4>Select Element</h4>
                  <span className="selectors-hint">Choose which element or class to style</span>
                </div>
                <div id="selectors-container" />
              </div>
              {/* Style Manager - CSS properties will be appended here by GrapesJS */}
              <div id="styles-sectors-container" />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showWidgetImport && (
        <WidgetImportModal
          isOpen={showWidgetImport}
          onClose={() => setShowWidgetImport(false)}
          onImport={handleImportWidget}
          editor={editor}
        />
      )}

      {showCodeExport && (
        <CodeExportModal
          isOpen={showCodeExport}
          onClose={() => setShowCodeExport(false)}
          editor={editor}
        />
      )}

      {showProjectManager && (
        <ProjectManager
          isOpen={showProjectManager}
          onClose={() => setShowProjectManager(false)}
          onLoadProject={handleLoadProject}
          currentProject={{ projectName, hasChanges }}
        />
      )}

      {/* Hidden panel containers */}
      <div style={{ display: 'none' }}>
        <div className="panel__switcher" />
      </div>
    </div>
  );
}

export default PageBuilder;

