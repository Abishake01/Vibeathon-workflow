import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../../theme";
import { useNavigation } from "../../router/AppRouter";
import apiService from "../../services/api";
import WorkflowTrigger from "./WorkflowTrigger";
import { uploadToIPFS as uploadToIPFSUtil } from "../../utils/ipfs";
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
  FiSettings,
  FiLink2,
  FiCopy,
  FiUpload,
  FiDownload,
  FiLock,
  FiUnlock,
  FiClock,
  FiExternalLink,
  FiEye,
} from "react-icons/fi";
import StudioEditor from "@grapesjs/studio-sdk/react";
import "@grapesjs/studio-sdk/style";
import {
  dialogComponent,
  tableComponent,
  listPagesComponent,
  fsLightboxComponent,
} from "@grapesjs/studio-sdk-plugins";
import ProjectManager from "./ProjectManager";
import "./PageBuilder.css";

function PageBuilder() {
  const { theme } = useTheme();
  const { navigateToBuilder, activeTab } = useNavigation();
  const [editor, setEditor] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [importHtml, setImportHtml] = useState("");
  const [importCss, setImportCss] = useState("");
  const [importJs, setImportJs] = useState("");
  const [importTab, setImportTab] = useState("preview"); // 'preview', 'html', 'css', 'js'
  const [widgetName, setWidgetName] = useState("Custom Widget");
  const [importMode, setImportMode] = useState("paste"); // 'paste', 'ai-generate', 'import-without-saving'
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [currentProject, setCurrentProject] = useState(null);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [serverProjectId, setServerProjectId] = useState(null); // Track server project ID
  const projectNameRef = useRef("Untitled Project"); // Ref to access current project name in callbacks
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
  const [activePreviewTab, setActivePreviewTab] = useState('Preview');
  
  // AI Settings Modal state
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);
  const [aiSettings, setAiSettings] = useState({
    apiKey: '',
    model: 'llama-3.1-8b-instant',
    baseUrl: 'https://api.groq.com/openai/v1',
    llmProvider: 'groq'
  });
  
  // Workflow Trigger Modal state
  const [showWorkflowConfigModal, setShowWorkflowConfigModal] = useState(false);
  const [workflowConfig, setWorkflowConfig] = useState({
    webhookUrl: '',
    workflowId: '',
    secret: '',
    buttonText: 'Run Workflow',
    waitForResult: false,
    showStatus: true,
    useBackendUrl: false,
    customUrl: ''
  });
  const [selectedComponentForWorkflow, setSelectedComponentForWorkflow] = useState(null);
  const [baseUrl, setBaseUrl] = useState(null);
  const [availableWorkflows, setAvailableWorkflows] = useState([]);
  const [workflowUrlLoading, setWorkflowUrlLoading] = useState(false);

  // Contribute modal state
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showProComponentsModal, setShowProComponentsModal] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [componentType, setComponentType] = useState("header");
  const [isUploading, setIsUploading] = useState(false);
  const [ipfsHash, setIpfsHash] = useState("");
  const [hasEditorChanges, setHasEditorChanges] = useState(false);
  const [contributionHistory, setContributionHistory] = useState([]);
  const [proComponents, setProComponents] = useState([]);
  // Keep ref in sync with state
  useEffect(() => {
    projectNameRef.current = projectName;
  }, [projectName]);

  // Load project data from localStorage and server on mount
  useEffect(() => {
    const loadProject = async () => {
      try {
        // First, try to load from localStorage (for quick access)
        const savedProject = localStorage.getItem("gjsProject");
        if (savedProject) {
          try {
            const project = JSON.parse(savedProject);
            if (project.pages) {
              setProjectData(project);
            }
            setCurrentProject({
              projectName: project.projectName || "Untitled Project",
              hasChanges: false,
            });
            setProjectName(project.projectName || "Untitled Project");
            setServerProjectId(project.serverId || null);
            projectNameRef.current = project.projectName || "Untitled Project";
          } catch (error) {
            console.error("Error loading project from localStorage:", error);
          }
        }

        // Then, try to sync with server (load latest projects)
        try {
          const serverProjects = await apiService.request("/ui-projects/", {
            method: "GET",
          });
          if (serverProjects && serverProjects.length > 0) {
            // If we have a server project ID, use that project
            const savedProject = localStorage.getItem("gjsProject");
            if (savedProject) {
              const localProject = JSON.parse(savedProject);
              if (localProject.serverId) {
                const serverProject = serverProjects.find(
                  (p) => p.id === localProject.serverId
                );
                if (serverProject) {
                  // Update local storage with server data
                  const projectData = {
                    ...localProject,
                    ...serverProject,
                    projectName: serverProject.project_name,
                    serverId: serverProject.id,
                  };
                  localStorage.setItem(
                    "gjsProject",
                    JSON.stringify(projectData)
                  );
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
          console.warn(
            "Could not load projects from server (might not be authenticated):",
            error
          );
          // Continue with localStorage data
        }
      } catch (error) {
        console.error("Error loading project:", error);
      }
    };

    loadProject();
  }, []);

  // Track if widgets have been loaded to avoid duplicates
  const widgetsLoadedRef = useRef(false);

  // Load custom widgets from server (defined before handleEditorReady to avoid initialization error)
  const loadCustomWidgets = useCallback(
    async (editorInstance, forceReload = false) => {
      if (!editorInstance) {
        console.warn("⚠️ Editor instance not available for loading widgets");
        return;
      }

      // Prevent duplicate loading unless forced
      if (!forceReload && widgetsLoadedRef.current) {
        console.log("Widgets already loaded, skipping...");
        return;
      }

      try {
        console.log("📦 Loading custom widgets from server...");
        const response = await apiService.request("/custom-widgets/", {
          method: "GET",
        });

        console.log("📦 Custom widgets response:", response);

        if (
          response &&
          response.widgets &&
          Array.isArray(response.widgets) &&
          response.widgets.length > 0
        ) {
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
              let componentContent = widget.html_content || "";

              if (widget.css_content) {
                const cssContent = widget.css_content.trim();
                if (cssContent && !cssContent.startsWith("<style")) {
                  componentContent = `<style>${cssContent}</style>${componentContent}`;
                } else if (cssContent) {
                  componentContent = `${cssContent}${componentContent}`;
                }
              }

              if (widget.js_content) {
                const jsContent = widget.js_content.trim();
                if (jsContent && !jsContent.startsWith("<script")) {
                  componentContent = `${componentContent}<script>${jsContent}</script>`;
                } else if (jsContent) {
                  componentContent = `${componentContent}${jsContent}`;
                }
              }

              // Add widget as a block
              blocks.add(widget.block_id, {
                label: widget.name,
                category: "Custom",
                media:
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>',
                content: componentContent,
                attributes: {
                  class: "custom-imported-widget",
                  "data-widget-id": widget.block_id,
                },
              });

              loadedCount++;
              console.log(
                `✅ Added widget block: ${widget.name} (${widget.block_id})`
              );
            } catch (err) {
              console.warn(`❌ Failed to load widget ${widget.name}:`, err);
            }
          });

          widgetsLoadedRef.current = true;
          console.log(
            `✅ Loaded ${loadedCount} custom widget(s) from server (${skippedCount} skipped - already exist)`
          );
        } else {
          console.log("ℹ️ No custom widgets found in response:", response);
        }
      } catch (error) {
        console.warn("❌ Failed to load custom widgets from server:", error);
        // Continue without widgets - not critical
      }
    },
    []
  );

  // Save project data to localStorage when it changes
  const handleEditorReady = useCallback(
    (editorInstance) => {
      setEditor(editorInstance);

      // Reset widgets loaded flag when editor is ready
      widgetsLoadedRef.current = false;

      // Set current project
      const savedProject = localStorage.getItem("gjsProject");
      if (savedProject) {
        try {
          const project = JSON.parse(savedProject);
          setCurrentProject({
            projectName: project.projectName || "Untitled Project",
            hasChanges: false,
          });
          setProjectName(project.projectName || "Untitled Project");
        } catch (error) {
          console.error("Error loading project:", error);
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
      editorInstance.on("load", () => {
        console.log("Editor load event fired - loading custom widgets");
        loadWidgetsWithRetry();
      });

      // Also try loading widgets on ready (in case load event doesn't fire or already fired)
      loadWidgetsWithRetry();

      // Auto-save on changes
      editorInstance.on("update", () => {
        if (autoSaveEnabled) {
          try {
            const projectData = editorInstance.getProjectData();
            // Include current project name and save timestamp
            const currentName = projectNameRef.current || "Untitled Project";
            const projectToSave = {
              ...projectData,
              projectName: currentName,
              savedAt: new Date().toISOString(),
              serverId: serverProjectId, // Keep server ID
            };
            localStorage.setItem("gjsProject", JSON.stringify(projectToSave));
            setCurrentProject((prev) =>
              prev
                ? { ...prev, hasChanges: true }
                : { projectName: currentName, hasChanges: true }
            );
            setIsSaved(false);

            // Auto-save to server (debounced - only save every 5 seconds)
            if (serverProjectId) {
              clearTimeout(window.autoSaveTimeout);
              window.autoSaveTimeout = setTimeout(async () => {
                try {
                  const serverProjectData = {
                    project_name: currentName,
                    description: "",
                    components: projectData.components || {},
                    styles: projectData.styles || {},
                    assets: projectData.assets || [],
                  };
                  await apiService.updateUIProject(
                    serverProjectId,
                    serverProjectData
                  );
                  console.log("💾 Auto-saved to server");
                } catch (error) {
                  console.warn("⚠️ Auto-save to server failed:", error);
                }
              }, 5000); // Debounce: save 5 seconds after last change
            }
          } catch (error) {
            console.error("Error saving project:", error);
          }
        } else {
          setIsSaved(false);
        }
      });
    },
    [autoSaveEnabled, loadCustomWidgets, serverProjectId]
  );

  const handleLoadProject = useCallback(
    (project) => {
      if (currentProject?.hasChanges) {
        if (
          !confirm(
            "You have unsaved changes. Are you sure you want to load a different project?"
          )
        ) {
          return;
        }
      }

      // Set project data and server ID
      setProjectData(project);
      const projectName =
        project.projectName ||
        project.project_name ||
        project.name ||
        "Untitled Project";
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
        savedAt:
          project.savedAt || project.updated_at || new Date().toISOString(),
      };
      localStorage.setItem("gjsProject", JSON.stringify(projectToSave));

      // Reload the page to apply new project
      window.location.reload();
    },
    [currentProject]
  );

  // Get theme colors based on current theme
  const getThemeColors = () => {
    if (theme === "dark") {
      return {
        global: {
          background1: "#3f3f3f",
          background2: "#272727",
          background3: "#181818",
          backgroundHover: "#373737",
          text: "#a3a3a3",
          border: "#3f3f3f",
          focus: "hsl(252 95% 85% / 80%)",
          placeholder: "#a3a3a3",
        },
        primary: {
          background1: "hsl(258 90% 66%)",
          background2: "hsl(250 95% 92%)",
          background3: "#272727",
          backgroundHover: "hsl(263 69% 42%)",
          text: "#ffffff",
        },
        component: {
          background1: "hsl(210 71% 53%)",
          background2: "hsl(201 90% 27%)",
          background3: "hsl(215 28% 17%)",
          backgroundHover: "hsl(210 75% 60%)",
          text: "#ffffff",
        },
      };
    }

    // Light theme
    return {
      global: {
        background1: "#f4f4f4",
        background2: "#fdfdfd",
        background3: "#ffffff",
        backgroundHover: "#f4f4f4",
        text: "#181818",
        border: "#d2d2d2",
        focus: "hsl(252 95% 85% / 80%)",
        placeholder: "#a3a3a3",
      },
      primary: {
        background1: "hsl(258 90% 66%)",
        background2: "hsl(250 95% 92%)",
        background3: "hsl(250 100% 97%)",
        backgroundHover: "hsl(263 69% 42%)",
        text: "#ffffff",
      },
      component: {
        background1: "hsl(210 75% 50%)",
        background2: "hsl(210 75% 70%)",
        background3: "hsl(210 75% 90%)",
        backgroundHover: "hsl(210 75% 60%)",
        text: "#ffffff",
      },
    };
  };

  // Generate widget title from HTML using AI
  const generateTitleFromHTML = useCallback(async (htmlCode) => {
    if (!htmlCode || !htmlCode.trim()) {
      return "Custom Widget";
    }

    // Load AI settings
    let settingsToUse = { ...aiSettings };
    if (!settingsToUse.apiKey || !settingsToUse.apiKey.trim()) {
      try {
        let savedSettings = localStorage.getItem('aiSettings');
        if (!savedSettings) {
          savedSettings = localStorage.getItem('ai-chatbot-settings');
        }
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          settingsToUse = { ...settingsToUse, ...parsed };
        }
      } catch (e) {
        console.error('Error loading AI settings:', e);
      }
    }

    if (!settingsToUse.apiKey || !settingsToUse.apiKey.trim()) {
      return "Custom Widget"; // Return default if no API key
    }

    try {
      setIsGeneratingTitle(true);
      
      // Extract a sample of the HTML (first 500 chars) for analysis
      const htmlSample = htmlCode.substring(0, 500).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      
      const response = await apiService.request('/generate-ui-code/', {
        method: 'POST',
        body: JSON.stringify({
          description: `Based on this HTML code, generate a short, descriptive widget name (2-4 words max). HTML sample: ${htmlSample}`,
          mode: 'generate',
          existing_html: '',
          existing_css: '',
          existing_js: '',
          settings: {
            apiKey: settingsToUse.apiKey.trim(),
            model: settingsToUse.model || 'llama-3.1-8b-instant',
            baseUrl: settingsToUse.baseUrl || 'https://api.groq.com/openai/v1'
          }
        }),
      });

      if (response && response.html) {
        // Extract title from response (it might be wrapped in HTML)
        let title = response.html.replace(/<[^>]*>/g, '').trim();
        // Clean up common prefixes/suffixes
        title = title.replace(/^(widget|component|name|title):?\s*/i, '').trim();
        title = title.replace(/\s*(widget|component)$/i, '').trim();
        
        // Limit to 30 characters and capitalize first letter
        if (title.length > 30) {
          title = title.substring(0, 30).trim();
        }
        if (title) {
          title = title.charAt(0).toUpperCase() + title.slice(1);
          return title;
        }
      }
    } catch (error) {
      console.warn('Error generating title from HTML:', error);
    } finally {
      setIsGeneratingTitle(false);
    }

    return "Custom Widget";
  }, [aiSettings]);

  // Handle import widget with HTML, CSS, and JS
  const handleImportWidget = useCallback(async (saveToServer = true) => {
    if (!editor || !importHtml.trim()) {
      alert("Please provide at least HTML code to import a widget.");
      return;
    }

    try {
      // Combine HTML, CSS, and JS into a complete component
      let componentContent = importHtml.trim();

      // Add CSS if provided - wrap in style tag
      if (importCss.trim()) {
        const cssContent = importCss.trim();
        // Check if style tag already exists
        if (!cssContent.startsWith("<style")) {
          componentContent = `<style>${cssContent}</style>${componentContent}`;
        } else {
          componentContent = `${cssContent}${componentContent}`;
        }
      }

      // Add JS if provided - wrap in script tag
      if (importJs.trim()) {
        const jsContent = importJs.trim();
        // Check if script tag already exists
        if (!jsContent.startsWith("<script")) {
          componentContent = `${componentContent}<script>${jsContent}</script>`;
        } else {
          componentContent = `${componentContent}${jsContent}`;
        }
      }

      // Create a unique block ID
      const blockId = `custom-widget-${Date.now()}`;
      const blockLabel = widgetName.trim() || "Custom Widget";

      // Get the Blocks manager from the editor
      const blocks = editor.Blocks;

      // Add the component as a custom block that can be dragged and dropped
      blocks.add(blockId, {
        label: blockLabel,
        category: "Custom",
        media:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>',
        content: componentContent,
        attributes: {
          class: "custom-imported-widget",
          "data-widget-id": blockId,
        },
        activate: true,
        select: true,
      });

      // Save widget to server only if saveToServer is true
      if (saveToServer) {
        try {
          const saveResponse = await apiService.request("/custom-widgets/save/", {
            method: "POST",
            body: JSON.stringify({
              name: blockLabel,
              html_content: importHtml.trim(),
              css_content: importCss.trim(),
              js_content: importJs.trim(),
              block_id: blockId,
            }),
          });
          console.log("✅ Widget saved to server successfully:", saveResponse);

          // Reload widgets to ensure the new one appears (force reload)
          setTimeout(() => {
            widgetsLoadedRef.current = false; // Reset flag to allow reload
            loadCustomWidgets(editor, true); // Force reload
          }, 500);
        } catch (saveError) {
          console.warn("Failed to save widget to server:", saveError);
          // Continue anyway - widget is still added locally
        }
      }

      // Refresh the blocks panel to show the new block
      try {
        // Trigger a refresh of the blocks panel
        editor.trigger("block:add", blockId);
        // Also try to refresh the UI
        if (blocks.render) {
          blocks.render();
        }
      } catch (refreshError) {
        console.warn("Could not refresh blocks panel:", refreshError);
        // Continue anyway - the block should still be added
      }

      // Show success notification
      const notification = document.createElement("div");
      notification.style.cssText =
        "position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;";
      notification.textContent = `✓ "${blockLabel}" imported successfully!${saveToServer ? ' Saved to server.' : ' (Not saved to server)'} You can now drag it from the "Custom" category in the Blocks panel.`;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);

      // Reset and close modal
      setImportHtml("");
      setImportCss("");
      setImportJs("");
      setWidgetName("Custom Widget");
      setImportTab("preview");
      setImportMode("paste");
      setShowImportModal(false);
    } catch (error) {
      console.error("Error importing widget:", error);
      alert(
        `Error importing widget: ${error.message}. Please check the console for details.`
      );
    }
  }, [editor, importHtml, importCss, importJs, widgetName]);

  // Handle AI generation in import modal
  const handleAIGenerateInImport = useCallback(async () => {
    if (!aiDescription.trim()) {
      alert('Please enter a description of what you want to generate.');
      return;
    }

    // Load AI settings
    let settingsToUse = { ...aiSettings };
    if (!settingsToUse.apiKey || !settingsToUse.apiKey.trim()) {
      try {
        let savedSettings = localStorage.getItem('aiSettings');
        if (!savedSettings) {
          savedSettings = localStorage.getItem('ai-chatbot-settings');
        }
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          settingsToUse = { ...settingsToUse, ...parsed };
        }
      } catch (e) {
        console.error('Error loading AI settings:', e);
      }
    }

    if (!settingsToUse.apiKey || !settingsToUse.apiKey.trim()) {
      alert('Please configure AI settings first. Go to More > AI Settings.');
      setShowImportModal(false);
      setShowAISettingsModal(true);
      return;
    }

    setIsGenerating(true);

    try {
      const settingsPayload = {
        apiKey: settingsToUse.apiKey.trim(),
        model: settingsToUse.model || 'llama-3.1-8b-instant',
        baseUrl: settingsToUse.baseUrl || 'https://api.groq.com/openai/v1'
      };

      const response = await apiService.request('/generate-ui-code/', {
        method: 'POST',
        body: JSON.stringify({
          description: aiDescription,
          mode: 'generate',
          existing_html: '',
          existing_css: '',
          existing_js: '',
          settings: settingsPayload
        }),
      });

      if (response.error) {
        alert(`Error: ${response.error}`);
        setIsGenerating(false);
        return;
      }

      if (response && response.html) {
        // Set the generated code
        setImportHtml(response.html || '');
        setImportCss(response.css || '');
        setImportJs(response.js || '');
        
        // Generate title from HTML
        const generatedTitle = await generateTitleFromHTML(response.html);
        setWidgetName(generatedTitle);
        
        // Switch to Preview tab to show the generated widget
        setImportTab('preview');
        
        // Show success notification
        const notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;';
        notification.textContent = '✓ Code generated! Check the Preview tab and import when ready.';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
      } else {
        throw new Error('No response from AI service');
      }
    } catch (error) {
      console.error('Error generating code:', error);
      alert(`Failed to generate code: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [aiDescription, aiSettings, generateTitleFromHTML]);

  // Save project handler - saves to both localStorage and server
  const handleSaveProject = useCallback(async () => {
    if (!editor) return;

    try {
      const projectData = editor.getProjectData();
      const currentName = projectName || "Untitled Project";

      // Prepare project data for localStorage
      const projectToSave = {
        ...projectData,
        projectName: currentName,
        savedAt: new Date().toISOString(),
        serverId: serverProjectId, // Keep server ID if exists
      };

      // Save to localStorage first (for offline access)
      localStorage.setItem("gjsProject", JSON.stringify(projectToSave));

      // Try to save to server
      try {
        const serverProjectData = {
          project_name: currentName,
          description: "",
          components: projectData.components || {},
          styles: projectData.styles || {},
          assets: projectData.assets || [],
        };

        if (serverProjectId) {
          // Update existing project on server
          const updatedProject = await apiService.updateUIProject(
            serverProjectId,
            serverProjectData
          );
          console.log("✅ Project updated on server:", updatedProject);
        } else {
          // Create new project on server
          const newProject = await apiService.createUIProject(
            serverProjectData
          );
          setServerProjectId(newProject.id);
          // Update localStorage with server ID
          projectToSave.serverId = newProject.id;
          localStorage.setItem("gjsProject", JSON.stringify(projectToSave));
          console.log("✅ Project created on server:", newProject);
        }
      } catch (serverError) {
        console.warn(
          "⚠️ Could not save to server (might not be authenticated):",
          serverError
        );
        // Continue anyway - project is saved locally
      }

      setCurrentProject({ projectName: currentName, hasChanges: false });
      setIsSaved(true);

      // Show success notification
      const notification = document.createElement("div");
      notification.style.cssText =
        "position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;";
      notification.textContent = "✓ Project saved successfully!";
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    } catch (error) {
      console.error("Error saving project:", error);
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
        pages.forEach((page) => {
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
    editor.on("update", updateStats);

    // Track editor changes for Contribute button
    const handleEditorChange = () => {
      setHasEditorChanges(true);
      setIsSaved(false);
    };

    editor.on("component:add", handleEditorChange);
    editor.on("component:remove", handleEditorChange);
    editor.on("component:update", handleEditorChange);
    editor.on("style:update", handleEditorChange);

    return () => {
      clearInterval(interval);
      editor.off("update", updateStats);
      editor.off("component:add", handleEditorChange);
      editor.off("component:remove", handleEditorChange);
      editor.off("component:update", handleEditorChange);
      editor.off("style:update", handleEditorChange);
    };
  }, [editor]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update project name from current project
  useEffect(() => {
    if (currentProject?.projectName) {
      setProjectName(currentProject.projectName);
    }
  }, [currentProject]);

  // Check for existing wallet connection on mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      const savedWalletAddress = localStorage.getItem("walletAddress");

      // Check if MetaMask is installed and connected
      if (typeof window.ethereum !== "undefined") {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });

          if (accounts.length > 0) {
            const address = accounts[0];
            setWalletAddress(address);
            setIsWalletConnected(true);
            localStorage.setItem("walletAddress", address);
            console.log("✅ Wallet auto-connected:", address);
          } else if (savedWalletAddress) {
            // Saved address but MetaMask not connected - clear it
            console.log("⚠️ Wallet was connected before but not anymore");
            setWalletAddress(savedWalletAddress);
            setIsWalletConnected(false);
          }
        } catch (error) {
          console.error("Error checking wallet connection:", error);
        }
      } else if (savedWalletAddress) {
        // MetaMask not installed but we have saved address
        setWalletAddress(savedWalletAddress);
        setIsWalletConnected(false);
      }
    };

    checkWalletConnection();

    // Listen for account changes
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsWalletConnected(true);
          localStorage.setItem("walletAddress", accounts[0]);
          console.log("✅ Wallet account changed:", accounts[0]);
        } else {
          setWalletAddress("");
          setIsWalletConnected(false);
          localStorage.removeItem("walletAddress");
          console.log("⚠️ Wallet disconnected");
        }
      });
    }
  }, []);

  // Load base URL and available workflows when workflow config modal opens
  useEffect(() => {
    if (showWorkflowConfigModal) {
      // Load current button configuration if component is selected
      if (selectedComponentForWorkflow && editor) {
        const button = selectedComponentForWorkflow.find('.workflow-trigger-btn')[0];
        if (button) {
          const attrs = button.get('attributes') || {};
          const buttonText = button.get('content') || button.get('text') || 'Run Workflow';
          const webhookUrl = attrs['data-workflow-webhook'] || '';
          
          // Determine if it's a backend workflow URL
          const isBackendUrl = webhookUrl.includes('/api/workflows/') && webhookUrl.includes('/webhook/');
          
          setWorkflowConfig({
            webhookUrl: webhookUrl,
            workflowId: attrs['data-workflow-id'] || '',
            secret: attrs['data-workflow-secret'] || '',
            buttonText: typeof buttonText === 'string' ? buttonText.replace(/<[^>]*>/g, '').trim() : 'Run Workflow',
            waitForResult: attrs['data-workflow-wait'] === 'true',
            showStatus: true,
            useBackendUrl: isBackendUrl,
            customUrl: ''
          });
        }
      }
      
      // Get base URL
      apiService.getBaseUrl()
        .then(data => {
          setBaseUrl(data.base_url);
          setWorkflowConfig(prev => ({
            ...prev,
            customUrl: data.base_url
          }));
        })
        .catch(err => {
          console.error('Error fetching base URL:', err);
        });

      // Load available workflows
      apiService.getWorkflows()
        .then(workflows => {
          setAvailableWorkflows(workflows || []);
        })
        .catch(err => {
          console.error('Error fetching workflows:', err);
        });
    }
  }, [showWorkflowConfigModal, selectedComponentForWorkflow, editor]);

  // Load AI settings from localStorage on mount
  useEffect(() => {
    const loadAISettings = () => {
      // Try 'aiSettings' first (new key)
      let savedSettings = localStorage.getItem('aiSettings');
      
      // Fallback to 'ai-chatbot-settings' (old key) for compatibility
      if (!savedSettings) {
        savedSettings = localStorage.getItem('ai-chatbot-settings');
        // If found in old key, migrate to new key
        if (savedSettings) {
          localStorage.setItem('aiSettings', savedSettings);
        }
      }
      
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setAiSettings(prev => ({
            ...prev,
            apiKey: parsed.apiKey || prev.apiKey,
            model: parsed.model || prev.model,
            baseUrl: parsed.baseUrl || prev.baseUrl,
            llmProvider: parsed.llmProvider || prev.llmProvider
          }));
        } catch (error) {
          console.error('Error loading AI settings:', error);
        }
      }
    };
    
    loadAISettings();
  }, []);

  // Reload AI settings when settings modal opens
  useEffect(() => {
    if (showAISettingsModal) {
      const loadAISettings = () => {
        // Try 'aiSettings' first (new key)
        let savedSettings = localStorage.getItem('aiSettings');
        
        // Fallback to 'ai-chatbot-settings' (old key) for compatibility
        if (!savedSettings) {
          savedSettings = localStorage.getItem('ai-chatbot-settings');
        }
        
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            setAiSettings(prev => ({
              ...prev,
              apiKey: parsed.apiKey || prev.apiKey,
              model: parsed.model || prev.model,
              baseUrl: parsed.baseUrl || prev.baseUrl,
              llmProvider: parsed.llmProvider || prev.llmProvider
            }));
          } catch (error) {
            console.error('Error loading AI settings:', error);
          }
        }
      };
      
      loadAISettings();
    }
  }, [showAISettingsModal]);

  // Save AI settings
  const handleSaveAISettings = useCallback(() => {
    if (!aiSettings.apiKey.trim()) {
      alert('Please enter an API key.');
      return;
    }
    // Save AI settings to localStorage (both keys for compatibility)
    const settingsJson = JSON.stringify(aiSettings);
    localStorage.setItem('aiSettings', settingsJson);
    localStorage.setItem('ai-chatbot-settings', settingsJson); // Also save to old key for compatibility
    setShowAISettingsModal(false);
    
    // Show success notification
    const notification = document.createElement("div");
    notification.style.cssText =
      "position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;";
    notification.textContent = "✓ AI settings saved!";
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }, [aiSettings]);

  // Handle AI generation/edit
  const handleAIGenerate = useCallback(async () => {
    // Load settings from localStorage if not in state (fallback)
    let settingsToUse = { ...aiSettings };
    
    console.log('🔍 Initial settings check:', {
      hasApiKey: !!settingsToUse.apiKey,
      apiKeyLength: settingsToUse.apiKey?.length || 0,
      model: settingsToUse.model
    });
    
    if (!settingsToUse.apiKey || !settingsToUse.apiKey.trim()) {
      try {
        // Try new key first
        let savedSettings = localStorage.getItem('aiSettings');
        console.log('📦 Checking localStorage for aiSettings:', !!savedSettings);
        
        // Fallback to old key for compatibility
        if (!savedSettings) {
          savedSettings = localStorage.getItem('ai-chatbot-settings');
          console.log('📦 Checking localStorage for ai-chatbot-settings:', !!savedSettings);
        }
        
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          console.log('✅ Loaded settings from localStorage:', {
            hasApiKey: !!parsed.apiKey,
            apiKeyLength: parsed.apiKey?.length || 0,
            model: parsed.model
          });
          settingsToUse = { ...settingsToUse, ...parsed };
          // Update state for next time
          setAiSettings(prev => ({ ...prev, ...parsed }));
        } else {
          console.warn('⚠️ No settings found in localStorage');
        }
      } catch (e) {
        console.error('Error loading AI settings from localStorage:', e);
      }
    } else {
      console.log('✅ Using settings from state');
    }

    if (!settingsToUse.apiKey || !settingsToUse.apiKey.trim()) {
      alert('Please configure AI settings first. Go to More > AI Settings.');
      setShowAIEditModal(false);
      setShowAISettingsModal(true);
      return;
    }

    if (!aiDescription.trim()) {
      alert('Please enter a description of what you want to generate or edit.');
      return;
    }

    setIsGenerating(true);
    setShowAIEditPreview(false);

    try {
      // Get component HTML/CSS if editing
      let componentHtml = '';
      let componentCss = '';
      
      if (aiMode === 'edit' && selectedComponent && editor) {
        try {
          componentHtml = selectedComponent.toHTML() || '';
          // GrapesJS components don't have toCSS(), get styles from component attributes
          try {
            const styles = selectedComponent.getStyle();
            if (styles && Object.keys(styles).length > 0) {
              componentCss = Object.entries(styles)
                .map(([prop, value]) => `${prop}: ${value};`)
                .join(' ');
            }
          } catch (styleError) {
            console.warn('Could not extract component styles:', styleError);
          }
        } catch (e) {
          console.warn('Could not get component HTML/CSS:', e);
        }
      }

      // Validate API key before sending
      if (!settingsToUse.apiKey || !settingsToUse.apiKey.trim()) {
        throw new Error('API key is missing. Please configure your AI settings first.');
      }

      // Prepare settings object for backend (camelCase as expected by backend)
      const settingsPayload = {
        apiKey: settingsToUse.apiKey.trim(),
        model: settingsToUse.model || 'llama-3.1-8b-instant',
        baseUrl: settingsToUse.baseUrl || 'https://api.groq.com/openai/v1'
      };

      console.log('🔑 Sending AI request with settings:', {
        hasApiKey: !!settingsPayload.apiKey,
        apiKeyLength: settingsPayload.apiKey?.length || 0,
        apiKeyPreview: settingsPayload.apiKey ? `${settingsPayload.apiKey.substring(0, 8)}...` : 'none',
        model: settingsPayload.model,
        baseUrl: settingsPayload.baseUrl
      });

      // Call the AI code generation API
      const response = await apiService.request('/generate-ui-code/', {
        method: 'POST',
        body: JSON.stringify({
          description: aiDescription,
          mode: aiMode,
          existing_html: componentHtml,
          existing_css: componentCss,
          existing_js: '',
          settings: settingsPayload
        }),
      });

      if (response.error) {
        alert(`Error: ${response.error}`);
        setIsGenerating(false);
        return;
      }

      if (response && response.html) {
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
        setShowAIEditPreview(true);
        setActivePreviewTab('Preview'); // Reset to Preview tab when new code is generated
        
        // Show success notification
        const notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;';
        notification.textContent = '✓ Code generated! Preview below and click "Apply Code" to update the component.';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
      } else {
        throw new Error('No response from AI service');
      }
    } catch (error) {
      console.error('Error generating AI code:', error);
      alert(`Failed to generate code: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [aiDescription, aiMode, selectedComponent, editor, aiSettings]);

  // Apply AI generated code
  const handleApplyAICode = useCallback(() => {
    if (!editor) {
      alert('Editor not ready. Please try again.');
      return;
    }

    try {
      if (aiMode === 'generate') {
        // Generate new component
        const componentHtml = aiEditPreview.html || '';
        const componentCss = aiEditPreview.css || '';
        const componentJs = aiEditPreview.js || '';
        
        if (!componentHtml) {
          alert('No HTML content to apply');
          return;
        }

        console.log('🔧 Applying AI code (generate mode):', { 
          hasHtml: !!componentHtml, 
          htmlLength: componentHtml.length,
          hasCss: !!componentCss,
          hasJs: !!componentJs
        });
        
        // Add CSS to the editor's style manager
        if (componentCss) {
          try {
            const canvas = editor.Canvas;
            const canvasDoc = canvas.getDocument();
            
            if (canvasDoc && canvasDoc.head) {
              let styleEl = canvasDoc.getElementById('gjs-ai-custom-css');
              
              if (!styleEl) {
                styleEl = canvasDoc.createElement('style');
                styleEl.id = 'gjs-ai-custom-css';
                styleEl.type = 'text/css';
                canvasDoc.head.appendChild(styleEl);
              }
              
              const existingCss = styleEl.textContent || '';
              styleEl.textContent = existingCss + (existingCss ? '\n' : '') + componentCss;
              console.log('✅ CSS added to canvas document');
            }
          } catch (cssError) {
            console.error('❌ Error adding CSS:', cssError);
          }
        }

        // Add the HTML component using GrapesJS API
        const componentsToAdd = componentHtml.trim();
        
        if (componentsToAdd) {
          try {
            const wrapper = editor.getWrapper();
            
            if (wrapper && typeof wrapper.append === 'function') {
              wrapper.append(componentsToAdd);
              console.log('✅ Components added via wrapper.append()');
              
              editor.trigger('component:add');
              editor.refresh();
              
              // Select the last added component
              setTimeout(() => {
                try {
                  const allComponents = wrapper.components();
                  if (allComponents && allComponents.length > 0) {
                    const lastComponent = allComponents[allComponents.length - 1];
                    editor.select(lastComponent);
                    console.log('✅ Component selected');
                  }
                } catch (selectError) {
                  console.warn('Could not select component:', selectError);
                }
              }, 100);
            } else if (typeof editor.addComponents === 'function') {
              const addedComponents = editor.addComponents(componentsToAdd);
              console.log('✅ Components added via editor.addComponents()');
              
              if (addedComponents) {
                const componentToSelect = Array.isArray(addedComponents) 
                  ? addedComponents[0] 
                  : addedComponents;
                if (componentToSelect) {
                  editor.select(componentToSelect);
                }
              }
            } else {
              throw new Error('Neither wrapper.append() nor editor.addComponents() is available');
            }
          } catch (addError) {
            console.error('❌ Error adding components:', addError);
            throw new Error('Failed to add component: ' + addError.message);
          }
        }
        
        // Add JavaScript if provided
        if (componentJs) {
          try {
            const canvas = editor.Canvas;
            const canvasDoc = canvas.getDocument();
            
            const scriptEl = canvasDoc.createElement('script');
            scriptEl.textContent = componentJs;
            canvasDoc.body.appendChild(scriptEl);
            canvasDoc.body.removeChild(scriptEl);
          } catch (jsError) {
            console.warn('Could not execute component JavaScript:', jsError);
          }
        }
        
        // Show success
        const notification = document.createElement("div");
        notification.style.cssText =
          "position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;";
        notification.textContent = "✓ Component generated and added!";
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
        
        // Close modal after delay
        setTimeout(() => {
          setShowAIEditModal(false);
          setAiDescription('');
          setAiEditPreview({ html: '', css: '', js: '' });
          setShowAIEditPreview(false);
          setActivePreviewTab('Preview');
        }, 500);
      } else if (aiMode === 'edit' && selectedComponent) {
        // Edit existing component - THIS IS THE CRITICAL PART
        const componentHtml = aiEditPreview.html || '';
        const componentCss = aiEditPreview.css || '';
        const componentJs = aiEditPreview.js || '';
        
        if (!componentHtml) {
          alert('No HTML content to apply');
          return;
        }

        console.log('🔄 Updating component (edit mode):', selectedComponent.get('type'));
        
        try {
          // Combine HTML, CSS, and JS into final content
          let componentContent = componentHtml || '';
          
          // Add CSS if provided
          if (componentCss) {
            const cssContent = componentCss.trim();
            if (cssContent && !cssContent.startsWith('<style')) {
              componentContent = `<style>${cssContent}</style>${componentContent}`;
            } else if (cssContent) {
              componentContent = `${cssContent}${componentContent}`;
            }
          }
          
          // Add JS if provided
          if (componentJs) {
            const jsContent = componentJs.trim();
            if (jsContent && !jsContent.startsWith('<script')) {
              componentContent = `${componentContent}<script>${jsContent}</script>`;
            } else if (jsContent) {
              componentContent = `${componentContent}${jsContent}`;
            }
          }
          
          // Clean componentContent to remove duplicate IDs and fix JS errors
          let cleanContent = componentContent;
          try {
            // Remove any existing IDs from the generated HTML to avoid conflicts
            cleanContent = cleanContent.replace(/\s+id=["'][^"']*["']/gi, '');
            
            // Clean script tags to prevent variable conflicts
            cleanContent = cleanContent.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (match, scriptContent) => {
              const uniqueSuffix = `_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              let cleanedScript = scriptContent
                .replace(/(const|let|var)\s+(\w+)\s*=/g, (m, decl, name) => {
                  if (['window', 'document', 'console', 'Math', 'Date', 'Array', 'Object', 'String', 'Number'].includes(name)) {
                    return m;
                  }
                  return `${decl} ${name}${uniqueSuffix} =`;
                })
                .replace(/function\s+(\w+)\s*\(/g, (m, name) => {
                  return `function ${name}${uniqueSuffix}(`;
                })
                .replace(/^([\s\S]*)$/, `try { $1 } catch(e) { console.error('Script error:', e); }`);
              
              return `<script>${cleanedScript}</script>`;
            });
          } catch (cleanError) {
            console.warn('Could not clean content, using as-is:', cleanError);
          }
          
          // Method: Clear existing components first, then set new content
          try {
            // Get components collection
            const components = selectedComponent.components();
            
            // Clear existing components first
            if (components) {
              try {
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
              throw e;
            }
          }
          
          // Get the updated component
          const updatedComponent = editor.getSelected() || selectedComponent;
          
          // Trigger component update events
          try {
            setTimeout(() => {
              try {
                updatedComponent.trigger('change:content');
                updatedComponent.trigger('change');
                updatedComponent.trigger('update');
              } catch (e) {
                // Ignore individual event errors
              }
            }, 0);
            
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
              editor.refresh();
              
              const canvas = editor.Canvas.getFrameEl();
              if (canvas && canvas.contentDocument) {
                const canvasDoc = canvas.contentDocument;
                const canvasWindow = canvas.contentWindow;
                
                // Update component view directly
                try {
                  const compView = updatedComponent.getView && updatedComponent.getView();
                  if (compView) {
                    if (compView.render) compView.render();
                    if (compView.update) compView.update();
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
          
          // Apply CSS to canvas document
          if (componentCss) {
            try {
              const canvas = editor.Canvas;
              const canvasDoc = canvas.getDocument();
              
              if (canvasDoc && canvasDoc.head) {
                let styleEl = canvasDoc.getElementById('gjs-ai-custom-css');
                
                if (!styleEl) {
                  styleEl = canvasDoc.createElement('style');
                  styleEl.id = 'gjs-ai-custom-css';
                  styleEl.type = 'text/css';
                  canvasDoc.head.appendChild(styleEl);
                }
                
                const existingCss = styleEl.textContent || '';
                styleEl.textContent = existingCss + (existingCss ? '\n' : '') + componentCss;
                console.log('✅ CSS updated in canvas document');
              }
            } catch (cssError) {
              console.error('Error adding CSS:', cssError);
            }
          }
          
          // Execute JavaScript if provided
          if (componentJs) {
            try {
              const canvas = editor.Canvas;
              const canvasDoc = canvas.getDocument();
              
              const scriptEl = canvasDoc.createElement('script');
              scriptEl.textContent = componentJs;
              canvasDoc.body.appendChild(scriptEl);
              canvasDoc.body.removeChild(scriptEl);
            } catch (jsError) {
              console.warn('Could not execute component JavaScript:', jsError);
            }
          }
          
          // Force canvas refresh multiple times to ensure it updates
          forceCanvasRefresh();
          setTimeout(forceCanvasRefresh, 100);
          setTimeout(forceCanvasRefresh, 300);
          
          // Show success
          const notification = document.createElement("div");
          notification.style.cssText =
            "position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;";
          notification.textContent = "✓ Component updated successfully!";
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 3000);
          
          // Close modal after delay
          setTimeout(() => {
            setShowAIEditModal(false);
            setAiDescription('');
            setAiEditPreview({ html: '', css: '', js: '' });
            setShowAIEditPreview(false);
            setActivePreviewTab('Preview');
          }, 500);
          
        } catch (error) {
          console.error('Error updating component:', error);
          alert(`Failed to update component: ${error.message || 'Unknown error'}`);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error applying AI code:', error);
      alert(`Failed to apply code: ${error.message || 'Unknown error'}`);
    }
  }, [editor, aiMode, selectedComponent, aiEditPreview]);

  // Connect Wallet function
  const connectWallet = async () => {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === "undefined") {
        alert("Please install MetaMask to connect your wallet!");
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        setIsWalletConnected(true);
        localStorage.setItem("walletAddress", address);

        // Show success notification
        const notification = document.createElement("div");
        notification.style.cssText =
          "position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 99999; font-weight: 600;";
        notification.textContent = `✓ Wallet connected: ${address.substring(
          0,
          6
        )}...${address.substring(address.length - 4)}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    }
  };

  // Disconnect Wallet function
  const disconnectWallet = () => {
    setWalletAddress("");
    setIsWalletConnected(false);
    localStorage.removeItem("walletAddress");

    const notification = document.createElement("div");
    notification.style.cssText =
      "position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 99999; font-weight: 600;";
    notification.textContent = "✓ Wallet disconnected";
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  // Get HTML code from editor
  const getEditorHTML = useCallback(() => {
    if (!editor) return "";

    try {
      // Get the current page
      const currentPage = editor.Pages.getSelected();
      if (!currentPage) return "";

      // Get the main component
      const mainComponent = currentPage.getMainComponent();
      if (!mainComponent) return "";

      // Get HTML and CSS
      const html = editor.getHtml();
      const css = editor.getCss();

      // Combine into full HTML document
      const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName || "Page"}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${css}
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

      return fullHTML;
    } catch (error) {
      console.error("Error getting HTML:", error);
      return "";
    }
  }, [editor, projectName]);

  // Upload to IPFS function
  const uploadToIPFS = async () => {
    if (!isWalletConnected) {
      alert("Please connect your wallet first!");
      return;
    }

    if (!editor) {
      alert("Editor not ready. Please try again.");
      return;
    }

    setIsUploading(true);

    try {
      // Get the HTML code
      const htmlCode = getEditorHTML();

      if (!htmlCode) {
        alert("No content to upload!");
        setIsUploading(false);
        return;
      }

      // Generate unique ID
      const uniqueId = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      // Create contribution metadata
      const contribution = {
        type: componentType,
        walletAddress: walletAddress,
        uniqueId: uniqueId,
        timestamp: new Date().toISOString(),
        projectName: projectName || "Untitled",
        code: htmlCode,
      };

      // Upload to IPFS using the utility
      const result = await uploadToIPFSUtil(
        contribution,
        projectName || "Untitled"
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to upload to IPFS");
      }

      const hash = result.hash;
      const encryptedHash = result.encryptedHash;

      setIpfsHash(hash);

      // Reset the changes flag after successful upload
      setHasEditorChanges(false);

      // Store encrypted hash to backend API (runs on port 5002)
      try {
        const walletApiUrl =
          import.meta.env.VITE_WALLET_API_URL || "http://localhost:5002/api";
        const apiResponse = await fetch(`${walletApiUrl}/wallet-data/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            wallet_address: walletAddress,
            encrypted_hash: encryptedHash,
            ipfs_hash: hash, // Store plain IPFS hash
            unique_id: uniqueId,
            component_type: componentType,
          }),
        });

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          console.error("❌ API Error Response:", errorText);
          throw new Error(`API returned ${apiResponse.status}: ${errorText}`);
        }

        const data = await apiResponse.json();
        console.log("✅ Stored to backend:", data);

        // Also register component for payment system
        try {
          const paymentApiUrl =
            import.meta.env.VITE_PAYMENT_API_URL || "http://localhost:5002/api";
          const registerResponse = await fetch(
            `${paymentApiUrl}/register-component`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                uniqueId: uniqueId,
                walletAddress: walletAddress,
                ipfsHash: hash,
                componentType: componentType,
              }),
            }
          );

          if (registerResponse.ok) {
            const registerData = await registerResponse.json();
            console.log("✅ Component registered for payments:", registerData);
          } else {
            console.warn(
              "⚠️ Component registration failed, but data is stored"
            );
          }
        } catch (regError) {
          console.error("❌ Failed to register component:", regError);
        }
      } catch (apiError) {
        console.error("❌ Failed to store to backend:", apiError);
        // Continue anyway, data is already on IPFS
      }

      // Store contribution in localStorage (with encrypted hash)
      const contributions = JSON.parse(
        localStorage.getItem("contributions") || "[]"
      );
      contributions.push({
        hash: hash, // Plain hash for immediate use
        encryptedHash: encryptedHash, // Encrypted hash for security
        type: componentType,
        walletAddress: walletAddress,
        uniqueId: uniqueId,
        timestamp: contribution.timestamp,
        projectName: projectName,
      });
      localStorage.setItem("contributions", JSON.stringify(contributions));

      // Show success notification
      const notification = document.createElement("div");
      notification.style.cssText =
        "position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 99999; font-weight: 600;";
      notification.innerHTML = `✓ Uploaded to IPFS!<br><small>Hash: ${hash.substring(
        0,
        10
      )}...</small><br><small style="opacity: 0.8;">🔒 Hash encrypted & registered</small>`;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);

      console.log("IPFS Hash:", hash);
      console.log("Encrypted Hash:", encryptedHash);
      console.log("Contribution saved:", contribution);
    } catch (error) {
      console.error("Error uploading to IPFS:", error);

      // Fallback: Save locally if IPFS fails
      const uniqueId = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const htmlCode = getEditorHTML();

      const contribution = {
        type: componentType,
        walletAddress: walletAddress,
        uniqueId: uniqueId,
        timestamp: new Date().toISOString(),
        projectName: projectName || "Untitled",
        code: htmlCode,
        localOnly: true,
      };

      // Store locally
      const contributions = JSON.parse(
        localStorage.getItem("contributions") || "[]"
      );
      contributions.push(contribution);
      localStorage.setItem("contributions", JSON.stringify(contributions));

      alert(
        `IPFS upload failed: ${error.message}. Contribution saved locally.`
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Handle component purchase with X402 payment
  const handlePayAndUseComponent = async (component) => {
    if (!isWalletConnected) {
      alert("Please connect your wallet first!");
      return;
    }

    try {
      // Check if user is the owner (no payment needed)
      if (
        component.walletAddress?.toLowerCase() === walletAddress?.toLowerCase()
      ) {
        alert("You own this component! Loading from localStorage...");
        // Decrypt and inject directly
        await decryptAndInjectComponent(component);
        return;
      }

      // Simple network check (non-blocking)
      try {
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        console.log("Current chain ID:", chainId);
        console.log("Base Sepolia chain ID: 0x14a34 (84532)");

        if (chainId !== "0x14a34") {
          console.warn("⚠️ Not on Base Sepolia testnet. Payment may fail.");
          const proceed = confirm(
            "You are not on Base Sepolia testnet.\n\n" +
              "Current network may not support this transaction.\n\n" +
              "Switch to Base Sepolia in MetaMask for best results.\n\n" +
              "Continue anyway?"
          );

          if (!proceed) {
            alert(
              "Please switch to Base Sepolia network in MetaMask:\n\n" +
                "Network Name: Base Sepolia\n" +
                "RPC URL: https://sepolia.base.org\n" +
                "Chain ID: 84532\n" +
                "Currency: ETH"
            );
            return;
          }
        }
      } catch (networkError) {
        console.warn("Could not check network:", networkError);
        // Continue anyway - let MetaMask handle network issues
      }

      // Get payment API URL
      const paymentApiUrl =
        import.meta.env.VITE_PAYMENT_API_URL || "http://localhost:5002/api";

      // Request payment from user via MetaMask
      const componentPrice = "0.01"; // 0.01 ETH
      const priceInWei = (parseFloat(componentPrice) * 1e18).toString(16);

      // Show payment notification
      const notification = document.createElement("div");
      notification.style.cssText =
        "position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 99999; font-weight: 600;";
      notification.innerHTML = `💳 Requesting payment via MetaMask...<br><small>0.01 ETH to ${component.walletAddress?.substring(
        0,
        10
      )}...</small>`;
      document.body.appendChild(notification);

      console.log("Sending payment request:", {
        from: walletAddress,
        to: component.walletAddress,
        value: "0x" + priceInWei,
        valueInETH: componentPrice,
      });

      // Send payment via MetaMask
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: walletAddress,
            to: component.walletAddress, // Direct payment to owner
            value: "0x" + priceInWei,
          },
        ],
      });

      notification.remove();

      // Show processing notification
      const processingNotif = document.createElement("div");
      processingNotif.style.cssText =
        "position: fixed; top: 20px; right: 20px; background: #f59e0b; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 99999; font-weight: 600;";
      processingNotif.innerHTML = `⏳ Payment sent! Processing...<br><small>TX: ${txHash?.substring(
        0,
        20
      )}...</small>`;
      document.body.appendChild(processingNotif);

      // Register purchase on backend
      try {
        const purchaseResponse = await fetch(
          `${paymentApiUrl}/component/${component.id}/purchase`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              buyerAddress: walletAddress,
              txHash: txHash,
            }),
          }
        );

        const purchaseData = await purchaseResponse.json();
        console.log('=== Purchase Response Debug ===');
        console.log('Full response:', purchaseData);
        console.log('ipfsHash:', purchaseData.ipfsHash);
        console.log('data.ipfsHash:', purchaseData.data?.ipfsHash);
        console.log('All keys:', Object.keys(purchaseData));
        
        if (purchaseData.success) {
          processingNotif.remove();

          // Show success notification
          const successNotif = document.createElement("div");
          successNotif.style.cssText =
            "position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 99999; font-weight: 600;";
          successNotif.innerHTML = `✅ Purchase successful!<br><small>Injecting component...</small>`;
          document.body.appendChild(successNotif);
          setTimeout(() => successNotif.remove(), 3000);

          // Try to get plain IPFS hash from purchase response
          let plainHash = purchaseData.ipfsHash || 
                         purchaseData.data?.ipfsHash || 
                         purchaseData.ipfs_hash ||
                         purchaseData.data?.ipfs_hash;
          
          console.log('Extracted plain hash:', plainHash);
          
          // If backend didn't return plain hash, check the Pro+ components list
          if (!plainHash || !plainHash.startsWith('Qm')) {
            console.warn('⚠️ Backend did not return plain IPFS hash, checking localStorage...');
            
            // Check localStorage contributions as fallback
            const contributions = JSON.parse(localStorage.getItem('contributions') || '[]');
            const match = contributions.find(c => c.uniqueId === component.uniqueId);
            
            if (match && match.hash && match.hash.startsWith('Qm')) {
              plainHash = match.hash;
              console.log('✅ Found plain hash in localStorage:', plainHash);
            } else {
              console.error('❌ Cannot find plain IPFS hash anywhere');
              alert(
                '⚠️ Purchase successful but cannot load component.\n\n' +
                'Backend needs to return "ipfsHash" field with plain IPFS hash (starting with "Qm").\n\n' +
                'Ask your backend team to update the /api/component/:id/purchase endpoint.'
              );
              return;
            }
          }

          // Use the plain IPFS hash from purchase response
          const componentWithHash = {
            ...component,
            hash: plainHash
          };
          
          console.log('Component with plain hash:', componentWithHash);
          
          // Decrypt and inject component
          await decryptAndInjectComponent(componentWithHash);
        } else {
          throw new Error(purchaseData.message || "Purchase failed");
        }
      } catch (apiError) {
        console.error("Purchase API error:", apiError);
        processingNotif.remove();
        
        // Check if it's a network error vs backend error
        if (apiError instanceof TypeError && apiError.message === 'Failed to fetch') {
          alert(
            "Cannot connect to backend server.\n\n" +
            "Make sure the backend is running on port 5002."
          );
        } else {
          alert(
            "Purchase recorded on blockchain, but backend registration failed.\n\n" +
            "Error: " + apiError.message
          );
        }
        // Don't try to inject if backend call failed
        return;
      }
    } catch (error) {
      console.error("Payment error:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        data: error.data,
        stack: error.stack,
      });

      // Remove any notifications
      document
        .querySelectorAll('[style*="position: fixed"][style*="top: 20px"]')
        .forEach((n) => n.remove());

      // Handle specific error codes
      let errorMessage =
        "Payment failed: " + (error.message || "Unknown error");

      if (error.code === -32002) {
        errorMessage =
          "🚨 MetaMask RPC Error\n\n" +
          "Your current network RPC is failing.\n\n" +
          "✅ Solution:\n" +
          "1. Open MetaMask\n" +
          "2. Switch to a different network (Ethereum Mainnet, Sepolia, etc.)\n" +
          "3. Or add Base Sepolia:\n" +
          "   • RPC: https://sepolia.base.org\n" +
          "   • Chain ID: 84532\n\n" +
          "Then try again!";
      } else if (error.code === -32603) {
        errorMessage =
          "🚨 Network Connection Error\n\n" +
          "MetaMask cannot connect to the blockchain.\n\n" +
          "✅ Solutions:\n" +
          "1. Check your internet connection\n" +
          "2. Switch to a different network in MetaMask\n" +
          "3. Try again in a few minutes\n\n" +
          "Error: " +
          error.message;
      } else if (error.code === 4001) {
        errorMessage =
          "❌ Transaction Rejected\n\n" +
          "You cancelled the transaction in MetaMask.";
      } else if (error.code === -32000) {
        errorMessage =
          "💰 Insufficient Funds\n\n" +
          "You don't have enough ETH for this transaction.\n\n" +
          "Get testnet ETH from:\n" +
          "https://www.coinbase.com/faucets";
      }

      alert(errorMessage);
    }
  };

  // Decrypt and inject component into editor
  // Decrypt and inject component into editor
  const decryptAndInjectComponent = async (component) => {
    try {
      // Determine which hash to use
      let ipfsHash = component.hash; // Use plain hash if available

      console.log("=== Component Injection Debug ===");
      console.log("Component:", component);
      console.log("Your wallet:", walletAddress);
      console.log("Component owner:", component.walletAddress);
      console.log("Hash received:", ipfsHash);

      // Check if user owns this component - get from localStorage
      if (
        component.walletAddress?.toLowerCase() === walletAddress?.toLowerCase()
      ) {
        console.log("✅ You own this component, checking localStorage...");

        // Try to get plain hash from localStorage
        const contributions = JSON.parse(
          localStorage.getItem("contributions") || "[]"
        );
        console.log("📦 LocalStorage contributions:", contributions);

        // Try multiple matching strategies
        let ownedComponent = contributions.find(
          (c) => c.uniqueId === component.uniqueId
        );

        if (!ownedComponent) {
          console.log("⚠️ No uniqueId match, trying wallet address match...");
          ownedComponent = contributions.find(
            (c) =>
              c.walletAddress?.toLowerCase() === walletAddress?.toLowerCase()
          );
        }

        if (!ownedComponent && contributions.length > 0) {
          console.log("⚠️ No wallet match, using most recent contribution...");
          ownedComponent = contributions[contributions.length - 1];
        }

        if (ownedComponent) {
          console.log("✅ Found matching contribution:", ownedComponent);
          if (ownedComponent.hash && ownedComponent.hash.startsWith("Qm")) {
            console.log(
              "✅ Using plain hash from localStorage:",
              ownedComponent.hash
            );
            ipfsHash = ownedComponent.hash;
          } else {
            console.warn("⚠️ Contribution found but no valid hash");
          }
        } else {
          console.warn("⚠️ No matching contribution in localStorage");
        }
      }

      // If the hash looks encrypted (long base64 string), try localStorage again
      if (ipfsHash && ipfsHash.length > 100 && !ipfsHash.startsWith("Qm")) {
        console.log("⚠️ Hash appears to be encrypted...");

        // For owner's components, search localStorage more broadly
        if (
          component.walletAddress?.toLowerCase() ===
          walletAddress?.toLowerCase()
        ) {
          const contributions = JSON.parse(
            localStorage.getItem("contributions") || "[]"
          );

          // Find ANY contribution by this wallet with a valid hash
          const match = contributions.find(
            (c) =>
              c.walletAddress?.toLowerCase() === walletAddress?.toLowerCase() &&
              c.hash &&
              c.hash.startsWith("Qm")
          );

          if (match) {
            console.log("✅ Found valid hash in localStorage:", match.hash);
            ipfsHash = match.hash;
          } else {
            console.error(
              "❌ No valid hash found in localStorage for your wallet"
            );
            console.log("Available contributions:", contributions);
          }
        }

        // If still encrypted, show clear error
        if (!ipfsHash.startsWith("Qm")) {
          throw new Error(
            "Cannot access component: Backend returned encrypted hash instead of plain IPFS hash.\n\n" +
              'Solution: Backend needs to store and return the "ipfs_hash" field (not just "encrypted_hash").'
          );
        }
      }

      // If still no valid hash, check encryptedHash
      if (!ipfsHash && component.encryptedHash) {
        console.log("Trying encryptedHash field...");

        // For owners, always check localStorage first
        if (
          component.walletAddress?.toLowerCase() ===
          walletAddress?.toLowerCase()
        ) {
          const contributions = JSON.parse(
            localStorage.getItem("contributions") || "[]"
          );
          const match = contributions.find(
            (c) =>
              c.walletAddress?.toLowerCase() === walletAddress?.toLowerCase() &&
              c.hash &&
              c.hash.startsWith("Qm")
          );

          if (match) {
            ipfsHash = match.hash;
          }
        }
      }

      if (!ipfsHash || !ipfsHash.startsWith("Qm")) {
        throw new Error(
          "No valid IPFS hash available.\n\n" +
            'The backend needs to store and return the plain "ipfs_hash" field.\n' +
            'Currently it only returns "encrypted_hash" which cannot be used directly.'
        );
      }

      console.log("✅ Final IPFS hash to use:", ipfsHash);

      console.log("Component object:", component);
      console.log("Fetching component from IPFS:", ipfsHash);

      // Fetch component data from IPFS
      const ipfsGateway = "https://gateway.pinata.cloud/ipfs/";
      const response = await fetch(`${ipfsGateway}${ipfsHash}`);

      console.log("IPFS Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("IPFS Error:", errorText);
        throw new Error(
          `IPFS fetch failed (${response.status}): Hash might be invalid or component not found`
        );
      }

      // Try to parse as JSON
      const responseText = await response.text();
      console.log(
        "IPFS Response (first 200 chars):",
        responseText.substring(0, 200)
      );

      let componentData;
      try {
        componentData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        // If it's not JSON, maybe it's direct HTML
        if (responseText.includes("<") && responseText.includes(">")) {
          console.log("Response appears to be HTML, using directly");
          componentData = { code: responseText };
        } else {
          throw new Error("Invalid IPFS data format - not JSON or HTML");
        }
      }

      console.log("Component data:", componentData);

      if (!componentData.code && !componentData.html) {
        throw new Error("No component code found in data");
      }

      // Get the HTML code
      const htmlCode = componentData.code || componentData.html || responseText;

      // Inject HTML into editor
      if (editor) {
        // Parse the HTML and add it to the canvas
        editor.getWrapper().append(htmlCode);

        // Show success
        const successNotif = document.createElement("div");
        successNotif.style.cssText =
          "position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 99999; font-weight: 600;";
        successNotif.innerHTML = `🎨 Component added to canvas!`;
        document.body.appendChild(successNotif);
        setTimeout(() => successNotif.remove(), 3000);

        // Close the Pro+ modal
        setShowProComponentsModal(false);
      } else {
        alert("Editor not ready. Please try again.");
      }
    } catch (error) {
      console.error("Error injecting component:", error);
      alert(
        `Failed to inject component: ${error.message}\n\nCheck browser console for details.`
      );
    }
  };

  return (
    <div className="app" style={{ width: "100%", height: "100vh" }}>
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
                    setCurrentProject((prev) =>
                      prev
                        ? { ...prev, projectName: newName, hasChanges: true }
                        : { projectName: newName, hasChanges: true }
                    );
                    setIsSaved(false);
                  }}
                  onBlur={handleSaveProject}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.target.blur(); // Trigger onBlur which calls handleSaveProject
                    }
                  }}
                />
              </div>
            </div>

            <div className="header-center">
              <div className="header-tabs">
                <button
                  className={`header-tab ${
                    activeTab === "workflow" ? "active" : ""
                  }`}
                  style={{
                    backgroundColor:
                      activeTab === "workflow" ? "black" : "#2a2b2b",
                  }}
                  onClick={() => navigateToBuilder("workflow")}
                >
                  <FiGrid style={{ fontSize: "16px" }} />
                  Workflow Builder
                </button>
                <button
                  className={`header-tab ${
                    activeTab === "page-builder" ? "active" : ""
                  }`}
                  style={{
                    backgroundColor:
                      activeTab === "page-builder" ? "black" : "#2a2b2b",
                  }}
                  onClick={() => navigateToBuilder("page-builder")}
                >
                  <FiLayout style={{ fontSize: "16px" }} />
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

              {/* AI Edit Button - Icon Only, Outside */}
              <button
                onClick={() => {
                  const selected = editor?.getSelected();
                  if (selected) {
                    setSelectedComponent(selected);
                    setAiMode('edit');
                  } else {
                    setSelectedComponent(null);
                    setAiMode('generate');
                  }
                  setShowAIEditModal(true);
                }}
                title="AI Edit Component"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.3)";
                }}
              >
                <FiZap style={{ fontSize: "18px" }} />
              </button>

              {/* 3-Dot Menu with All Other Buttons */}
              <div className="header-menu-container" ref={menuRef}>
                <button
                  className="header-btn icon-only"
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  title="More options"
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.backgroundColor = theme === "dark" ? "#374151" : "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <FiMoreVertical />
                </button>
                {moreMenuOpen && (
                  <div className="header-dropdown-menu" style={{
                    minWidth: "220px",
                    padding: "8px",
                    borderRadius: "12px",
                    boxShadow: theme === "dark" 
                      ? "0 10px 40px rgba(0, 0, 0, 0.5)" 
                      : "0 10px 40px rgba(0, 0, 0, 0.15)",
                  }}>
                    {/* Auto-save Toggle */}
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setAutoSaveEnabled(!autoSaveEnabled);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: "transparent",
                        color: theme === "dark" ? "#fff" : "#333",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        fontWeight: "500",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === "dark" ? "#374151" : "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <FiPower style={{ 
                          fontSize: "16px",
                          color: autoSaveEnabled ? "#10b981" : "#6b7280"
                        }} />
                        <span>Auto-save</span>
                      </div>
                      <div style={{
                        width: "44px",
                        height: "24px",
                        borderRadius: "12px",
                        background: autoSaveEnabled ? "#10b981" : (theme === "dark" ? "#374151" : "#d1d5db"),
                        position: "relative",
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                      }}>
                        <div style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: "white",
                          position: "absolute",
                          top: "2px",
                          left: autoSaveEnabled ? "22px" : "2px",
                          transition: "all 0.3s ease",
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                        }} />
                      </div>
                    </button>

                    {/* Divider */}
                    <div style={{
                      height: "1px",
                      background: theme === "dark" ? "#374151" : "#e5e7eb",
                      margin: "8px 0",
                    }} />

                    {/* Save Button */}
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        handleSaveProject();
                        setMoreMenuOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: "transparent",
                        color: theme === "dark" ? "#fff" : "#333",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        fontWeight: "500",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === "dark" ? "#374151" : "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <FiSave style={{ 
                        fontSize: "16px",
                        color: isSaved ? "#6b7280" : "#3b82f6"
                      }} />
                      <span>{isSaved ? "Saved" : "Save Project"}</span>
                    </button>

                    {/* Contribute Button */}
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        if (hasEditorChanges) {
                          setShowContributeModal(true);
                          setMoreMenuOpen(false);
                        }
                      }}
                      disabled={!hasEditorChanges}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: "transparent",
                        color: hasEditorChanges 
                          ? (theme === "dark" ? "#fff" : "#333")
                          : (theme === "dark" ? "#6b7280" : "#9ca3af"),
                        cursor: hasEditorChanges ? "pointer" : "not-allowed",
                        transition: "all 0.2s ease",
                        fontWeight: "500",
                        opacity: hasEditorChanges ? 1 : 0.6,
                      }}
                      onMouseEnter={(e) => {
                        if (hasEditorChanges) {
                          e.currentTarget.style.backgroundColor = theme === "dark" ? "#374151" : "#f3f4f6";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {hasEditorChanges ? (
                        <FiUnlock style={{ fontSize: "16px", color: "#667eea" }} />
                      ) : (
                        <FiLock style={{ fontSize: "16px" }} />
                      )}
                      <span>Contribute</span>
                    </button>

                    {/* Pro+ Components Button */}
                    <button
                      className="dropdown-item"
                      onClick={async () => {
                        try {
                          // Fetch all contributed components from backend
                          const walletApiUrl =
                            import.meta.env.VITE_WALLET_API_URL ||
                            "http://localhost:5002/api";
                          const response = await fetch(
                            `${walletApiUrl}/all-wallet-data`
                          );

                          if (response.ok) {
                            const result = await response.json();
                            const data = result.data || [];

                            // Fetch actual metadata from IPFS
                            const componentsWithMetadata = await Promise.all(
                              data.map(async (item) => {
                                try {
                                  let type = "component";
                                  let projectName = "Contribution";
                                  const ipfsHash = item.ipfs_hash || item.encrypted_hash;

                                  if (ipfsHash && ipfsHash.startsWith("Qm")) {
                                    try {
                                      const ipfsResponse = await fetch(
                                        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
                                      );
                                      if (ipfsResponse.ok) {
                                        const ipfsData = await ipfsResponse.json();
                                        type = ipfsData.type || item.component_type || "component";
                                        projectName = ipfsData.projectName || "Contribution";
                                      }
                                    } catch (ipfsError) {
                                      console.warn("Could not fetch from IPFS:", ipfsError);
                                      type = item.component_type || "component";
                                    }
                                  } else {
                                    type = item.component_type || "component";
                                  }

                                  return {
                                    id: item.id,
                                    type: type,
                                    projectName: projectName,
                                    walletAddress: item.wallet_address,
                                    uniqueId: item.unique_id,
                                    timestamp: item.created_at,
                                    hash: item.ipfs_hash || ipfsHash,
                                    encryptedHash: item.encrypted_hash,
                                  };
                                } catch (error) {
                                  console.error("Error processing component:", error);
                                  return {
                                    id: item.id,
                                    type: "component",
                                    walletAddress: item.wallet_address,
                                    uniqueId: item.unique_id,
                                    timestamp: item.created_at,
                                    hash: item.encrypted_hash,
                                  };
                                }
                              })
                            );

                            setProComponents(componentsWithMetadata);
                          } else {
                            setProComponents([]);
                          }
                          setShowProComponentsModal(true);
                          setMoreMenuOpen(false);
                        } catch (error) {
                          console.error("Failed to fetch pro components:", error);
                          setProComponents([]);
                          setShowProComponentsModal(true);
                          setMoreMenuOpen(false);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: "transparent",
                        color: theme === "dark" ? "#fff" : "#333",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        fontWeight: "500",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === "dark" ? "#374151" : "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <span style={{ 
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#f59e0b",
                      }}>
                        Pro+
                      </span>
                      <span>Components</span>
                    </button>

                    {/* Divider */}
                    <div style={{
                      height: "1px",
                      background: theme === "dark" ? "#374151" : "#e5e7eb",
                      margin: "8px 0",
                    }} />

                    {/* Import HTML */}
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowImportModal(true);
                        setMoreMenuOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: "transparent",
                        color: theme === "dark" ? "#fff" : "#333",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        fontWeight: "500",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === "dark" ? "#374151" : "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <FiSave style={{ fontSize: "16px" }} />
                      <span>Import HTML</span>
                    </button>

                    {/* Projects */}
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowProjectManager(true);
                        setMoreMenuOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: "transparent",
                        color: theme === "dark" ? "#fff" : "#333",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        fontWeight: "500",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === "dark" ? "#374151" : "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <FiFile style={{ fontSize: "16px" }} />
                      <span>Projects</span>
                    </button>

                    {/* AI Settings */}
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowAISettingsModal(true);
                        setMoreMenuOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: "transparent",
                        color: theme === "dark" ? "#fff" : "#333",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        fontWeight: "500",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === "dark" ? "#374151" : "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <FiSettings style={{ fontSize: "16px" }} />
                      <span>AI Settings</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Theme Toggle Button */}
              <button
                className="header-btn icon-only"
                onClick={toggleTheme}
                title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.backgroundColor = theme === "dark" ? "#374151" : "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {theme === "light" ? <FiMoon /> : <FiSun />}
              </button>
            </div>
          </div>
        </div>

        {/* Studio Editor */}
        <div
          className={`page-builder-studio ${theme}`}
          style={{
            width: "100%",
            height: "calc(100vh - 60px)",
            position: "relative",
            zIndex: 1,
            pointerEvents: showProjectManager ? "none" : "auto",
          }}
        >
          <StudioEditor
            options={{
              // Theme configuration
              theme: theme === "dark" ? "dark" : "light",
              customTheme: {
                default: {
                  colors: getThemeColors(),
                },
              },

              // Project configuration
              project: projectData || {
                type: "web",
                default: {
                  pages: [
                    {
                      id: "home-page",
                      name: "Home",
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
                  `,
                    },
                  ],
                },
              },

              // Layout configuration with tabs
              layout: {
                default: {
                  type: "row",
                  style: { height: "100%" },
                  children: [
                    {
                      type: "sidebarLeft",
                      children: {
                        type: "tabs",
                        value: "blocks",
                        tabs: [
                          {
                            id: "blocks",
                            label: "Blocks",
                            children: {
                              type: "panelBlocks",
                              style: { height: "100%" },
                            },
                          },
                          {
                            id: "layers",
                            label: "Layers",
                            children: {
                              type: "panelLayers",
                              style: { height: "100%" },
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "canvasSidebarTop",
                      sidebarTop: {
                        leftContainer: {
                          buttons: ({ items }) => [
                            ...items,
                            {
                              id: "save-project",
                              label: "Save",
                              icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
                              onClick: async ({ editor }) => {
                                try {
                                  const projectData = editor.getProjectData();
                                  // Include current project name and save timestamp
                                  const currentName =
                                    projectNameRef.current ||
                                    "Untitled Project";
                                  const projectToSave = {
                                    ...projectData,
                                    projectName: currentName,
                                    savedAt: new Date().toISOString(),
                                    serverId: serverProjectId,
                                  };
                                  localStorage.setItem(
                                    "gjsProject",
                                    JSON.stringify(projectToSave)
                                  );

                                  // Try to save to server
                                  try {
                                    const serverProjectData = {
                                      project_name: currentName,
                                      description: "",
                                      components: projectData.components || {},
                                      styles: projectData.styles || {},
                                      assets: projectData.assets || [],
                                    };

                                    if (serverProjectId) {
                                      await apiService.updateUIProject(
                                        serverProjectId,
                                        serverProjectData
                                      );
                                    } else {
                                      const newProject =
                                        await apiService.createUIProject(
                                          serverProjectData
                                        );
                                      setServerProjectId(newProject.id);
                                      projectToSave.serverId = newProject.id;
                                      localStorage.setItem(
                                        "gjsProject",
                                        JSON.stringify(projectToSave)
                                      );
                                    }
                                  } catch (serverError) {
                                    console.warn(
                                      "Could not save to server:",
                                      serverError
                                    );
                                  }

                                  // Show success notification
                                  const notification =
                                    document.createElement("div");
                                  notification.style.cssText =
                                    "position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;";
                                  notification.textContent =
                                    "✓ Project saved successfully!";
                                  document.body.appendChild(notification);
                                  setTimeout(() => notification.remove(), 3000);
                                } catch (error) {
                                  console.error("Error saving project:", error);
                                }
                              },
                            },
                            {
                              id: "import-widget",
                              label: "Import HTML",
                              icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
                              onClick: () => {
                                setShowImportModal(true);
                              },
                            },
                            {
                              id: "workflow-builder",
                              label: "Workflow",
                              icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
                              onClick: () => {
                                navigateToBuilder("workflow");
                              },
                            },
                            {
                              id: "project-manager",
                              label: "Projects",
                              icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
                              onClick: () => {
                                setShowProjectManager(true);
                              },
                            },
                          ],
                        },
                      },
                    },
                    {
                      type: "sidebarRight",
                      children: {
                        type: "tabs",
                        value: "styles",
                        tabs: [
                          {
                            id: "styles",
                            label: "Styles",
                            children: {
                              type: "column",
                              style: { height: "100%" },
                              children: [
                                {
                                  type: "panelSelectors",
                                  style: { padding: 5 },
                                },
                                { type: "panelStyles" },
                              ],
                            },
                          },
                          {
                            id: "props",
                            label: "Properties",
                            children: {
                              type: "panelProperties",
                              style: { padding: 5, height: "100%" },
                            },
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
                    id: "hero-section-modern",
                    label: "Hero Section",
                    category: "Sections",
                    media:
                      '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
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
                    full: true,
                  },

                  // Feature Grid
                  {
                    id: "feature-grid",
                    label: "Feature Grid",
                    category: "Sections",
                    media:
                      '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
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
                    full: true,
                  },

                  // CTA Section
                  {
                    id: "cta-section",
                    label: "Call to Action",
                    category: "Sections",
                    media:
                      '<svg viewBox="0 0 24 24"><path d="M21 3H3c-.6 0-1 .4-1 1v6c0 .6.4 1 1 1h18c.6 0 1-.4 1-1V4c0-.6-.4-1-1-1Z"/></svg>',
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
                    full: true,
                  },

                  // Card Component
                  {
                    id: "pricing-card",
                    label: "Pricing Card",
                    category: "Components",
                    media:
                      '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 15h6"/></svg>',
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
                `,
                  },

                  // Testimonial
                  {
                    id: "testimonial",
                    label: "Testimonial",
                    category: "Components",
                    media:
                      '<svg viewBox="0 0 24 24"><path d="M14 9.5V14h4.5L14 9.5zM5.5 14H10V9.5L5.5 14z"/></svg>',
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
                `,
                  },
              
                  // Workflow Trigger Button
                  {
                    id: 'workflow-trigger-button',
                    label: 'Workflow Trigger',
                    category: 'Automation',
                    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
                    content: `
                      <button 
                        class="workflow-trigger-btn" 
                        data-workflow-webhook="" 
                        data-workflow-id="" 
                        data-workflow-secret=""
                        data-workflow-wait="false"
                        style="padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.2s;">
                        Run Workflow
                      </button>
                      <div class="workflow-status" style="margin-top: 8px; display: none; padding: 8px 12px; border-radius: 4px; font-size: 14px;"></div>
                    `,
                    select: true
                  }
                ],
              },

              // Global styles
              globalStyles: {
                default: [
                  {
                    id: "primaryColor",
                    property: "color",
                    field: "color",
                    defaultValue: "#3b82f6",
                    selector: ":root",
                    label: "Primary Color",
                    category: { id: "colors", label: "Colors", open: true },
                  },
                  {
                    id: "h1Color",
                    property: "color",
                    field: "color",
                    defaultValue: "#111827",
                    selector: "h1",
                    label: "H1 Color",
                    category: { id: "typography", label: "Typography" },
                  },
                  {
                    id: "h1Size",
                    property: "font-size",
                    field: {
                      type: "number",
                      min: 0.5,
                      max: 10,
                      step: 0.1,
                      units: ["rem"],
                    },
                    defaultValue: "2.5rem",
                    selector: "h1",
                    label: "H1 Size",
                    category: { id: "typography" },
                  },
                  {
                    id: "bodyBg",
                    property: "background-color",
                    field: "color",
                    selector: "body",
                    label: "Body Background",
                    defaultValue: "#ffffff",
                    category: { id: "colors" },
                  },
                ],
              },

              // Templates configuration
              templates: {
                onLoad: async () => [
                  {
                    id: "template-landing",
                    name: "Landing Page",
                    thumbnail: "https://picsum.photos/400/300?random=1",
                    data: {
                      pages: [
                        {
                          name: "Home",
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
                      `,
                        },
                      ],
                    },
                  },
                  {
                    id: "template-business",
                    name: "Business Site",
                    thumbnail: "https://picsum.photos/400/300?random=2",
                    data: {
                      pages: [
                        {
                          name: "Home",
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
                      `,
                        },
                      ],
                    },
                  },
                ],
              },

              // Pages configuration
              pages: {
                add: ({ editor, rename }) => {
                  const page = editor.Pages.add(
                    {
                      name: "New Page",
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
                `,
                    },
                    {
                      select: true,
                    }
                  );
                  rename(page);
                },
                duplicate: ({ editor, page, rename }) => {
                  const root = page.getMainComponent();
                  const newPage = editor.Pages.add(
                    {
                      name: `${page.getName()} (Copy)`,
                      component: root.clone(),
                    },
                    { select: true }
                  );
                  rename(newPage);
                },
              },

              // Assets configuration
              assets: {
                storageType: "self",
                onUpload: async ({ files }) => {
                  return files.map((file) => ({
                    id: URL.createObjectURL(file),
                    src: URL.createObjectURL(file),
                    name: file.name,
                    mimeType: file.type,
                    size: file.size,
                  }));
                },
                onDelete: async ({ assets }) => {
                  console.log(
                    "Deleting assets:",
                    assets.map((a) => a.getSrc())
                  );
                },
              },

              // CSS configuration - ensure CSS is properly loaded
              css: {
                // Allow external stylesheets
                allowExternal: true,
                // Don't clear CSS on updates
                clear: false,
              },

              // Plugins configuration
              plugins: [
                dialogComponent.init({
                  block: { category: "Advanced", label: "Dialog" },
                }),
                tableComponent.init({
                  block: { category: "Advanced", label: "Table" },
                }),
                listPagesComponent?.init({
                  block: { category: "Advanced", label: "Navigation" },
                }),
                fsLightboxComponent?.init({
                  block: { category: "Advanced", label: "Image Gallery" },
                }),
                // Plugin to show floating button for workflow trigger configuration
                (editor) => {
                  editor.onReady(() => {
                    let floatingButton = null;
                    
                    // Function to check if selected component is a workflow trigger button
                    const isWorkflowTriggerButton = (component) => {
                      if (!component) return false;
                      const button = component.find('.workflow-trigger-btn')[0];
                      return !!button;
                    };
                    
                    // Function to create floating button
                    const createFloatingButton = () => {
                      if (floatingButton) return;
                      
                      floatingButton = document.createElement('button');
                      floatingButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
                      floatingButton.style.cssText = `
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        width: 56px;
                        height: 56px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        cursor: pointer;
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                        z-index: 10000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.3s ease;
                      `;
                      
                      floatingButton.onmouseenter = () => {
                        floatingButton.style.transform = 'scale(1.1)';
                        floatingButton.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
                      };
                      
                      floatingButton.onmouseleave = () => {
                        floatingButton.style.transform = 'scale(1)';
                        floatingButton.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                      };
                      
                      floatingButton.onclick = () => {
                        const selected = editor.getSelected();
                        if (selected && isWorkflowTriggerButton(selected)) {
                          setSelectedComponentForWorkflow(selected);
                          setShowWorkflowConfigModal(true);
                        }
                      };
                      
                      document.body.appendChild(floatingButton);
                    };
                    
                    // Function to update floating button visibility
                    const updateFloatingButton = () => {
                      const selected = editor.getSelected();
                      const shouldShow = selected && isWorkflowTriggerButton(selected);
                      
                      if (shouldShow) {
                        if (!floatingButton) {
                          createFloatingButton();
                        }
                        if (floatingButton) {
                          floatingButton.style.display = 'flex';
                        }
                      } else {
                        if (floatingButton) {
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
                // Plugin to handle workflow trigger buttons
                (editor) => {
                  editor.onReady(() => {
                    console.log('🔄 Workflow Trigger plugin initialized');
                    
                    // Function to handle workflow trigger button clicks
                    const handleWorkflowTrigger = async (buttonElement, webhookUrl, workflowId, secret, waitForResult) => {
                      if (!webhookUrl) {
                        alert('Workflow webhook URL is not configured. Please configure it in the component properties.');
                        return;
                      }
                      
                      const statusDiv = buttonElement.parentElement.querySelector('.workflow-status');
                      const resultDiv = buttonElement.parentElement.querySelector('.workflow-result') || (() => {
                        // Create result div if it doesn't exist
                        const div = document.createElement('div');
                        div.className = 'workflow-result';
                        div.style.cssText = 'margin-top: 12px; padding: 12px; border-radius: 6px; display: none; max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 12px;';
                        buttonElement.parentElement.appendChild(div);
                        return div;
                      })();
                      
                      const originalText = buttonElement.textContent;
                      
                      // Update button state
                      buttonElement.disabled = true;
                      buttonElement.textContent = '⏳ Running...';
                      buttonElement.style.opacity = '0.7';
                      buttonElement.style.cursor = 'not-allowed';
                      
                      // Hide result div
                      resultDiv.style.display = 'none';
                      
                      if (statusDiv) {
                        statusDiv.style.display = 'block';
                        statusDiv.textContent = 'Triggering workflow...';
                        statusDiv.style.backgroundColor = '#e0e7ff';
                        statusDiv.style.color = '#3730a3';
                      }
                      
                      try {
                        // Collect form data
                        const formData = {};
                        const form = buttonElement.closest('form') || document;
                        const formElements = form.querySelectorAll('input, select, textarea');
                        formElements.forEach(element => {
                          if (element.name && element.value) {
                            formData[element.name] = element.value;
                          }
                        });
                        
                        // Collect data from elements with data-workflow-field attribute
                        const workflowFields = document.querySelectorAll('[data-workflow-field]');
                        workflowFields.forEach(field => {
                          const fieldName = field.getAttribute('data-workflow-field');
                          const fieldValue = field.value || field.textContent || field.innerText;
                          if (fieldName && fieldValue) {
                            formData[fieldName] = fieldValue;
                          }
                        });
                        
                        // Prepare request data
                        const requestData = {
                          name: formData.name || 'User',
                          message: formData.message || formData.text || 'Hello from Page Builder!',
                          ...formData,
                          componentId: buttonElement.getAttribute('data-component-id') || 'workflow-trigger',
                          timestamp: new Date().toISOString()
                        };
                        
                        let response;
                        
                        // Check if this is a backend workflow URL (contains /api/workflows/ and /webhook/)
                        const isBackendWorkflow = webhookUrl.includes('/api/workflows/') && webhookUrl.includes('/webhook/');
                        
                        if (isBackendWorkflow) {
                          // Call backend webhook directly
                          const api = await import('../../services/api');
                          response = await api.default.callBackendWebhook(webhookUrl, requestData, 'POST');
                          
                          // Backend workflow returns execution data directly
                          buttonElement.textContent = '✓ Success';
                          buttonElement.style.backgroundColor = '#10b981';
                          
                          if (statusDiv) {
                            statusDiv.textContent = `Workflow ${response.status || 'completed'}`;
                            statusDiv.style.backgroundColor = '#d1fae5';
                            statusDiv.style.color = '#065f46';
                          }
                          
                          // Display output data
                          if (response.data) {
                            resultDiv.style.display = 'block';
                            resultDiv.style.backgroundColor = '#f0f9ff';
                            resultDiv.style.border = '1px solid #3b82f6';
                            resultDiv.style.color = '#1e40af';
                            resultDiv.innerHTML = `
                              <div style="font-weight: 600; margin-bottom: 8px; color: #1e40af;">
                                📊 Workflow Output:
                              </div>
                              <pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word;">${JSON.stringify(response.data, null, 2)}</pre>
                              ${response.execution ? `
                                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #93c5fd;">
                                  <div style="font-weight: 600; margin-bottom: 4px;">Execution Details:</div>
                                  <div style="font-size: 11px; line-height: 1.6;">
                                    <div>Status: <strong>${response.execution.status || 'N/A'}</strong></div>
                                    <div>Execution ID: ${response.execution.execution_id || 'N/A'}</div>
                                    ${response.execution.duration ? `<div>Duration: ${(response.execution.duration * 1000).toFixed(0)}ms</div>` : ''}
                                  </div>
                                </div>
                              ` : ''}
                            `;
                          } else if (response.execution) {
                            resultDiv.style.display = 'block';
                            resultDiv.style.backgroundColor = '#f0f9ff';
                            resultDiv.style.border = '1px solid #3b82f6';
                            resultDiv.style.color = '#1e40af';
                            resultDiv.innerHTML = `
                              <div style="font-weight: 600; margin-bottom: 8px;">📊 Workflow Execution:</div>
                              <pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word;">${JSON.stringify(response.execution, null, 2)}</pre>
                            `;
                          }
                          
                          // Reset button after 5 seconds (longer to allow viewing results)
                          setTimeout(() => {
                            buttonElement.textContent = originalText;
                            buttonElement.style.backgroundColor = '';
                            buttonElement.disabled = false;
                            buttonElement.style.opacity = '1';
                            buttonElement.style.cursor = 'pointer';
                          }, 5000);
                          
                        } else {
                          // External n8n workflow
                          const runWorkflow = window.runN8nWorkflow || apiService.runN8nWorkflow.bind(apiService);
                          response = await runWorkflow(
                            webhookUrl,
                            {
                              formData: requestData,
                              componentId: buttonElement.getAttribute('data-component-id') || 'workflow-trigger',
                              timestamp: new Date().toISOString()
                            },
                            {
                              workflowId,
                              secret,
                              waitForResult
                            }
                          );
                          
                          if (response.status === 'accepted' || response.status === 'success') {
                            buttonElement.textContent = '✓ Success';
                            buttonElement.style.backgroundColor = '#10b981';
                            
                            if (statusDiv) {
                              statusDiv.textContent = response.message || 'Workflow triggered successfully';
                              statusDiv.style.backgroundColor = '#d1fae5';
                              statusDiv.style.color = '#065f46';
                            }
                            
                            // If waitForResult, subscribe to updates
                            if (waitForResult && response.run_id) {
                              subscribeToWorkflowUpdates(response.run_id, (update) => {
                                if (statusDiv) {
                                  statusDiv.textContent = update.message || `Step: ${update.step} - ${update.state}`;
                                }
                                
                                if (update.state === 'done') {
                                  buttonElement.textContent = '✓ Completed';
                                  buttonElement.style.backgroundColor = '#10b981';
                                  if (statusDiv) {
                                    statusDiv.textContent = 'Workflow completed successfully';
                                    statusDiv.style.backgroundColor = '#d1fae5';
                                    statusDiv.style.color = '#065f46';
                                  }
                                  
                                  // Show result if available
                                  if (update.data) {
                                    resultDiv.style.display = 'block';
                                    resultDiv.style.backgroundColor = '#f0f9ff';
                                    resultDiv.style.border = '1px solid #3b82f6';
                                    resultDiv.style.color = '#1e40af';
                                    resultDiv.innerHTML = `
                                      <div style="font-weight: 600; margin-bottom: 8px;">📊 Workflow Output:</div>
                                      <pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word;">${JSON.stringify(update.data, null, 2)}</pre>
                                    `;
                                  }
                                } else if (update.state === 'error') {
                                  buttonElement.textContent = '✗ Error';
                                  buttonElement.style.backgroundColor = '#ef4444';
                                  if (statusDiv) {
                                    statusDiv.textContent = update.message || 'Workflow failed';
                                    statusDiv.style.backgroundColor = '#fee2e2';
                                    statusDiv.style.color = '#991b1b';
                                  }
                                }
                              });
                            }
                            
                            // Reset button after 3 seconds
                            setTimeout(() => {
                              buttonElement.textContent = originalText;
                              buttonElement.style.backgroundColor = '';
                              buttonElement.disabled = false;
                              buttonElement.style.opacity = '1';
                              buttonElement.style.cursor = 'pointer';
                            }, 3000);
                          } else {
                            throw new Error(response.error || 'Workflow trigger failed');
                          }
                        }
                      } catch (error) {
                        console.error('Error triggering workflow:', error);
                        buttonElement.textContent = '✗ Error';
                        buttonElement.style.backgroundColor = '#ef4444';
                        buttonElement.disabled = false;
                        buttonElement.style.opacity = '1';
                        buttonElement.style.cursor = 'pointer';
                        
                        if (statusDiv) {
                          statusDiv.textContent = error.message || 'Failed to trigger workflow';
                          statusDiv.style.backgroundColor = '#fee2e2';
                          statusDiv.style.color = '#991b1b';
                        }
                        
                        // Show error in result div
                        resultDiv.style.display = 'block';
                        resultDiv.style.backgroundColor = '#fef2f2';
                        resultDiv.style.border = '1px solid #ef4444';
                        resultDiv.style.color = '#991b1b';
                        resultDiv.innerHTML = `
                          <div style="font-weight: 600; margin-bottom: 8px;">❌ Error:</div>
                          <div>${error.message || 'Unknown error occurred'}</div>
                        `;
                      }
                    };
                    
                    // Function to subscribe to workflow updates
                    const subscribeToWorkflowUpdates = (runId, onUpdate) => {
                      const eventSource = apiService.subscribeToWorkflowUpdates(runId, (update) => {
                        onUpdate(update);
                        
                        if (update.state === 'done' || update.state === 'error') {
                          eventSource.close();
                        }
                      });
                      
                      return eventSource;
                    };
                    
                    // Inject workflow trigger handler into canvas
                    const injectWorkflowHandler = () => {
                      const canvas = editor.Canvas.getFrameEl();
                      if (canvas && canvas.contentDocument) {
                        const canvasDoc = canvas.contentDocument;
                        const canvasWindow = canvas.contentWindow;
                        
                        // Store handler in window for access
                        canvasWindow.handleWorkflowTrigger = handleWorkflowTrigger;
                        // Import apiService dynamically to avoid circular dependencies
                        canvasWindow.runN8nWorkflow = async (webhookUrl, data, options) => {
                          const api = await import('../../services/api');
                          return api.default.runN8nWorkflow(webhookUrl, data, options);
                        };
                        canvasWindow.callBackendWebhook = async (webhookUrl, data, method = 'POST') => {
                          const api = await import('../../services/api');
                          return api.default.callBackendWebhook(webhookUrl, data, method);
                        };
                        canvasWindow.subscribeToWorkflowUpdates = (runId, onUpdate) => {
                          return apiService.subscribeToWorkflowUpdates(runId, onUpdate);
                        };
                        
                        // Add click handlers to workflow trigger buttons
                        const addClickHandlers = () => {
                          const buttons = canvasDoc.querySelectorAll('.workflow-trigger-btn');
                          buttons.forEach(button => {
                            // Remove existing listeners
                            const newButton = button.cloneNode(true);
                            button.parentNode.replaceChild(newButton, button);
                            
                            // Add click handler
                            newButton.addEventListener('click', (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              const webhookUrl = newButton.getAttribute('data-workflow-webhook');
                              const workflowId = newButton.getAttribute('data-workflow-id') || '';
                              const secret = newButton.getAttribute('data-workflow-secret') || '';
                              const waitForResult = newButton.getAttribute('data-workflow-wait') === 'true';
                              
                              handleWorkflowTrigger(newButton, webhookUrl, workflowId, secret, waitForResult);
                            });
                          });
                        };
                        
                        // Add handlers on load
                        if (canvasDoc.readyState === 'complete') {
                          addClickHandlers();
                        } else {
                          canvasDoc.addEventListener('DOMContentLoaded', addClickHandlers);
                        }
                        
                        // Also add handlers after component updates
                        editor.on('component:update', () => {
                          setTimeout(addClickHandlers, 100);
                        });
                      }
                    };
                    
                    // Inject handler when canvas loads
                    editor.on('canvas:frame:load', () => {
                      setTimeout(injectWorkflowHandler, 200);
                    });
                    
                    // Also inject on ready
                    setTimeout(injectWorkflowHandler, 500);
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
                        const head =
                          doc.head || doc.getElementsByTagName("head")[0];

                        if (!head) return;

                        // Inject Tailwind CSS script - always check and inject if missing
                        let existingTailwindScript = doc.querySelector(
                          'script[src*="tailwindcss"]'
                        );

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
                            console.warn("Could not verify Tailwind:", e);
                          }
                        }

                        if (!existingTailwindScript) {
                          const script = doc.createElement("script");
                          script.src = "https://cdn.tailwindcss.com";
                          script.async = false; // Load synchronously to ensure it's available
                          script.onload = () => {
                            console.log("✅ Tailwind CSS loaded in canvas");
                            // Force a re-render after Tailwind loads
                            setTimeout(() => {
                              try {
                                // Trigger editor to refresh the canvas
                                editor.refresh();
                                // Also update all components to force re-render
                                const pages = editor.Pages.getAll();
                                pages.forEach((page) => {
                                  try {
                                    const component = page.getMainComponent();
                                    component.set(
                                      "style",
                                      component.getStyle()
                                    );
                                  } catch (e) {
                                    // Ignore errors for individual pages
                                  }
                                });
                              } catch (e) {
                                console.warn("Error refreshing canvas:", e);
                              }
                            }, 200);
                          };
                          script.onerror = () => {
                            console.error(
                              "❌ Failed to load Tailwind CSS from CDN"
                            );
                            // Try alternative CDN
                            const altScript = doc.createElement("script");
                            altScript.src =
                              "https://unpkg.com/tailwindcss@3/dist/tailwind.min.js";
                            altScript.async = false;
                            head.appendChild(altScript);
                          };
                          head.appendChild(script);
                          console.log(
                            "✅ Tailwind CSS script injected into canvas"
                          );
                        } else {
                          // Script exists, but ensure it's loaded
                          const window = doc.defaultView || doc.parentWindow;
                          if (window && window.tailwind) {
                            // Tailwind is loaded, trigger refresh
                            setTimeout(() => {
                              try {
                                editor.refresh();
                              } catch (e) {
                                console.warn("Error refreshing editor:", e);
                              }
                            }, 100);
                          }
                        }

                        // Ensure base styles are present
                        const existingBaseStyle = doc.querySelector(
                          "style[data-gjs-base]"
                        );
                        if (!existingBaseStyle) {
                          const baseStyle = doc.createElement("style");
                          baseStyle.setAttribute("data-gjs-base", "true");
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
                          console.log("✅ Base styles injected into canvas");
                        }
                      }
                    } catch (error) {
                      console.warn(
                        "Could not inject styles into canvas:",
                        error
                      );
                    }
                  };

                  // Inject styles when editor is ready
                  editor.onReady(() => {
                    console.log("Studio Editor Ready!");
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
                  editor.on("canvas:frame:load", () => {
                    setTimeout(() => {
                      injectStylesIntoCanvas();
                    }, 100);

                    setTimeout(() => {
                      injectStylesIntoCanvas();
                    }, 500);
                  });

                  // Also listen for canvas frame ready
                  editor.on("canvas:frame:ready", () => {
                    setTimeout(() => {
                      injectStylesIntoCanvas();
                    }, 100);
                  });

                  // Ensure Tailwind is in page components
                  editor.on("load", () => {
                    const pages = editor.Pages.getAll();
                    pages.forEach((page) => {
                      try {
                        const component = page.getMainComponent();
                        const head = component.find("head")[0];

                        if (head) {
                          const existingScript = head.find(
                            'script[src*="tailwindcss"]'
                          )[0];
                          if (!existingScript) {
                            head.append(
                              `<script src="https://cdn.tailwindcss.com"></script>`
                            );
                          }
                        }
                      } catch (error) {
                        console.warn("Error adding Tailwind to page:", error);
                      }
                    });
                  });

                  // Ensure Tailwind is added to new pages
                  editor.on("page:add", (page) => {
                    setTimeout(() => {
                      try {
                        const component = page.getMainComponent();
                        const head = component.find("head")[0];
                        if (head) {
                          const existingScript = head.find(
                            'script[src*="tailwindcss"]'
                          )[0];
                          if (!existingScript) {
                            head.append(
                              `<script src="https://cdn.tailwindcss.com"></script>`
                            );
                          }
                        }
                      } catch (error) {
                        console.warn(
                          "Error adding Tailwind to new page:",
                          error
                        );
                      }
                    }, 100);
                  });

                  // Re-inject on component update
                  editor.on("component:update", () => {
                    setTimeout(() => {
                      injectStylesIntoCanvas();
                    }, 200);
                  });

                  // Re-inject on page change
                  editor.on("page:select", () => {
                    setTimeout(() => {
                      injectStylesIntoCanvas();
                    }, 300);
                  });

                  // Re-inject on any update
                  editor.on("update", () => {
                    setTimeout(() => {
                      injectStylesIntoCanvas();
                    }, 100);
                  });
                },
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
                      pages: "Pages",
                      newPage: "New Page",
                      add: "Add Page",
                    },
                  },
                },
              },
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
          <div
            className="import-modal-overlay"
            onClick={() => setShowImportModal(false)}
          >
            <div
              className="import-modal-container"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="import-modal-header">
                <h2>Import Custom Widget</h2>
                <button
                  className="import-modal-close"
                  onClick={() => setShowImportModal(false)}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="import-modal-body">
                {/* Import Mode Selection */}
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      fontSize: "14px",
                      color: theme === "dark" ? "#fff" : "#333",
                    }}
                  >
                    Import Mode:
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setImportMode("paste")}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        borderRadius: "6px",
                        border: `2px solid ${importMode === "paste" ? "#10b981" : (theme === "dark" ? "#444" : "#d1d5db")}`,
                        backgroundColor: importMode === "paste" 
                          ? (theme === "dark" ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)")
                          : "transparent",
                        color: theme === "dark" ? "#fff" : "#333",
                        cursor: "pointer",
                        fontWeight: importMode === "paste" ? "600" : "400",
                        transition: "all 0.2s",
                        fontSize: "13px",
                      }}
                    >
                      📋 Paste & Import
                    </button>
                    <button
                      onClick={() => setImportMode("ai-generate")}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        borderRadius: "6px",
                        border: `2px solid ${importMode === "ai-generate" ? "#10b981" : (theme === "dark" ? "#444" : "#d1d5db")}`,
                        backgroundColor: importMode === "ai-generate" 
                          ? (theme === "dark" ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)")
                          : "transparent",
                        color: theme === "dark" ? "#fff" : "#333",
                        cursor: "pointer",
                        fontWeight: importMode === "ai-generate" ? "600" : "400",
                        transition: "all 0.2s",
                        fontSize: "13px",
                      }}
                    >
                      ✨ AI Generate
                    </button>
                    <button
                      onClick={() => setImportMode("import-without-saving")}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        borderRadius: "6px",
                        border: `2px solid ${importMode === "import-without-saving" ? "#10b981" : (theme === "dark" ? "#444" : "#d1d5db")}`,
                        backgroundColor: importMode === "import-without-saving" 
                          ? (theme === "dark" ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)")
                          : "transparent",
                        color: theme === "dark" ? "#fff" : "#333",
                        cursor: "pointer",
                        fontWeight: importMode === "import-without-saving" ? "600" : "400",
                        transition: "all 0.2s",
                        fontSize: "13px",
                      }}
                    >
                      🚀 Import (No Save)
                    </button>
                  </div>
                </div>

                {/* AI Generate Mode */}
                {importMode === "ai-generate" && (
                  <div style={{ marginBottom: "20px", padding: "16px", backgroundColor: theme === "dark" ? "#1a1a1a" : "#f9fafb", borderRadius: "8px", border: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}` }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "600",
                        fontSize: "14px",
                        color: theme === "dark" ? "#fff" : "#333",
                      }}
                    >
                      Describe what you want to generate:
                    </label>
                    <textarea
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      placeholder="e.g., A modern pricing card with 3 tiers, gradient buttons, and hover effects"
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: `1px solid ${theme === "dark" ? "#444" : "#d1d5db"}`,
                        backgroundColor: theme === "dark" ? "#2a2a2a" : "#fff",
                        color: theme === "dark" ? "#fff" : "#333",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        resize: "vertical",
                        marginBottom: "12px",
                      }}
                    />
                    <button
                      onClick={handleAIGenerateInImport}
                      disabled={isGenerating || !aiDescription.trim()}
                      style={{
                        width: "100%",
                        padding: "10px 20px",
                        borderRadius: "6px",
                        border: "none",
                        background: isGenerating || !aiDescription.trim()
                          ? (theme === "dark" ? "#444" : "#ccc")
                          : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "white",
                        cursor: isGenerating || !aiDescription.trim() ? "not-allowed" : "pointer",
                        fontWeight: "600",
                        opacity: isGenerating || !aiDescription.trim() ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      {isGenerating ? (
                        <>
                          <div style={{
                            width: "16px",
                            height: "16px",
                            border: "2px solid #fff",
                            borderTop: "2px solid transparent",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                          }} />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FiZap />
                          Generate Code
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Widget Name Input */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <label
                      style={{
                        display: "block",
                        fontWeight: "600",
                        color: theme === "dark" ? "#fff" : "#333",
                      }}
                    >
                      Widget Name:
                    </label>
                    {importMode === "paste" && importHtml.trim() && (
                      <button
                        onClick={async () => {
                          const generatedTitle = await generateTitleFromHTML(importHtml);
                          setWidgetName(generatedTitle);
                        }}
                        disabled={isGeneratingTitle}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "none",
                          background: isGeneratingTitle
                            ? (theme === "dark" ? "#444" : "#ccc")
                            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "white",
                          cursor: isGeneratingTitle ? "not-allowed" : "pointer",
                          fontSize: "12px",
                          fontWeight: "500",
                          opacity: isGeneratingTitle ? 0.6 : 1,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                        title="Generate title from HTML using AI"
                      >
                        {isGeneratingTitle ? (
                          <>
                            <div style={{
                              width: "12px",
                              height: "12px",
                              border: "2px solid #fff",
                              borderTop: "2px solid transparent",
                              borderRadius: "50%",
                              animation: "spin 1s linear infinite",
                            }} />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FiZap style={{ fontSize: "12px" }} />
                            AI Generate Title
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={widgetName}
                    onChange={(e) => setWidgetName(e.target.value)}
                    placeholder="Enter widget name"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: `1px solid ${theme === "dark" ? "#444" : "#ddd"}`,
                      backgroundColor: theme === "dark" ? "#2a2a2a" : "#fff",
                      color: theme === "dark" ? "#fff" : "#333",
                      fontSize: "14px",
                    }}
                  />
                </div>

                {/* Tabs */}
                <div
                  style={{
                    display: "flex",
                    borderBottom: `2px solid ${
                      theme === "dark" ? "#444" : "#e0e0e0"
                    }`,
                    marginBottom: "16px",
                  }}
                >
                  {["preview", "html", "css", "js"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setImportTab(tab)}
                      style={{
                        padding: "12px 24px",
                        border: "none",
                        background: "transparent",
                        color:
                          importTab === tab
                            ? theme === "dark"
                              ? "#a855f7"
                              : "#7c3aed"
                            : theme === "dark"
                            ? "#999"
                            : "#666",
                        fontWeight: importTab === tab ? "600" : "400",
                        cursor: "pointer",
                        borderBottom:
                          importTab === tab
                            ? `3px solid ${
                                theme === "dark" ? "#a855f7" : "#7c3aed"
                              }`
                            : "3px solid transparent",
                        textTransform: "uppercase",
                        fontSize: "13px",
                        transition: "all 0.2s",
                      }}
                    >
                      {tab === "preview" ? "👁️ Preview" : tab.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div style={{ position: "relative" }}>
                  {/* Preview Tab */}
                  {importTab === "preview" && (
                    <div>
                      {importHtml.trim() ? (
                        <div
                          style={{
                            width: "100%",
                            height: "500px",
                            border: `1px solid ${
                              theme === "dark" ? "#374151" : "#e5e7eb"
                            }`,
                            borderRadius: "8px",
                            overflow: "hidden",
                            backgroundColor: theme === "dark" ? "#111" : "#fff",
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              zIndex: 10,
                              display: "flex",
                              gap: "8px",
                            }}
                          >
                            <button
                              onClick={() => {
                                setPreviewRefreshKey(prev => prev + 1);
                              }}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "none",
                                backgroundColor: theme === "dark" ? "rgba(59, 130, 246, 0.8)" : "#3b82f6",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                              }}
                              title="Refresh preview"
                            >
                              <FiEye style={{ fontSize: "14px" }} />
                              Refresh
                            </button>
                          </div>
                          <iframe
                            key={`preview-${previewRefreshKey}-${importHtml.length}-${importCss.length}-${importJs.length}`}
                            srcDoc={`
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <script src="https://cdn.tailwindcss.com"></script>
                                <style>
                                  * {
                                    box-sizing: border-box;
                                  }
                                  body {
                                    margin: 0;
                                    padding: 20px;
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                                    background: ${theme === "dark" ? "#1a1a1a" : "#fff"};
                                  }
                                  ${importCss || ""}
                                </style>
                              </head>
                              <body>
                                ${importHtml}
                                <script>${importJs || ""}</script>
                              </body>
                              </html>
                            `}
                            style={{
                              width: "100%",
                              height: "100%",
                              border: "none",
                            }}
                            title="Widget Preview"
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "500px",
                            border: `1px solid ${
                              theme === "dark" ? "#374151" : "#e5e7eb"
                            }`,
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: theme === "dark" ? "#1a1a1a" : "#f9fafb",
                            color: theme === "dark" ? "#9ca3af" : "#6b7280",
                            flexDirection: "column",
                            gap: "12px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "48px",
                              opacity: 0.5,
                            }}
                          >
                            👁️
                          </div>
                          <p style={{ margin: 0, fontSize: "16px", fontWeight: "500" }}>
                            No preview available
                          </p>
                          <p style={{ margin: 0, fontSize: "14px", opacity: 0.7 }}>
                            {importMode === "ai-generate"
                              ? "Generate code using AI to see preview"
                              : "Add HTML code to see preview"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* HTML Tab */}
                  {importTab === "html" && (
                    <div>
                      <p
                        className="modal-description"
                        style={{
                          marginBottom: "12px",
                          color: theme === "dark" ? "#aaa" : "#666",
                        }}
                      >
                        Paste your HTML code. This will be the structure of your
                        widget.
                      </p>
                      <textarea
                        className="import-textarea"
                        placeholder="<div>Your HTML code here...</div>"
                        value={importHtml}
                        onChange={(e) => setImportHtml(e.target.value)}
                        rows={15}
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "6px",
                          border: `1px solid ${
                            theme === "dark" ? "#444" : "#ddd"
                          }`,
                          backgroundColor:
                            theme === "dark" ? "#1a1a1a" : "#fff",
                          color: theme === "dark" ? "#fff" : "#333",
                          fontFamily: "monospace",
                          fontSize: "13px",
                          resize: "vertical",
                        }}
                      />
                    </div>
                  )}

                  {/* CSS Tab */}
                  {importTab === "css" && (
                    <div>
                      <p
                        className="modal-description"
                        style={{
                          marginBottom: "12px",
                          color: theme === "dark" ? "#aaa" : "#666",
                        }}
                      >
                        Add custom CSS styles for your widget. (Optional)
                      </p>
                      <textarea
                        className="import-textarea"
                        placeholder=".my-widget { color: blue; }"
                        value={importCss}
                        onChange={(e) => setImportCss(e.target.value)}
                        rows={15}
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "6px",
                          border: `1px solid ${
                            theme === "dark" ? "#444" : "#ddd"
                          }`,
                          backgroundColor:
                            theme === "dark" ? "#1a1a1a" : "#fff",
                          color: theme === "dark" ? "#fff" : "#333",
                          fontFamily: "monospace",
                          fontSize: "13px",
                          resize: "vertical",
                        }}
                      />
                    </div>
                  )}

                  {/* JS Tab */}
                  {importTab === "js" && (
                    <div>
                      <p
                        className="modal-description"
                        style={{
                          marginBottom: "12px",
                          color: theme === "dark" ? "#aaa" : "#666",
                        }}
                      >
                        Add JavaScript functionality for your widget. (Optional)
                      </p>
                      <textarea
                        className="import-textarea"
                        placeholder="// Your JavaScript code here\ndocument.addEventListener('DOMContentLoaded', function() {\n  // Widget initialization\n});"
                        value={importJs}
                        onChange={(e) => setImportJs(e.target.value)}
                        rows={15}
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "6px",
                          border: `1px solid ${
                            theme === "dark" ? "#444" : "#ddd"
                          }`,
                          backgroundColor:
                            theme === "dark" ? "#1a1a1a" : "#fff",
                          color: theme === "dark" ? "#fff" : "#333",
                          fontFamily: "monospace",
                          fontSize: "13px",
                          resize: "vertical",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="import-modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportHtml("");
                    setImportCss("");
                    setImportJs("");
                    setWidgetName("Custom Widget");
                    setImportTab("preview");
                    setImportMode("paste");
                    setAiDescription("");
                  }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: theme === "dark" ? "#444" : "#e0e0e0",
                    color: theme === "dark" ? "#fff" : "#333",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                >
                  Cancel
                </button>
                {importMode === "import-without-saving" ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleImportWidget(false)}
                    disabled={!importHtml.trim()}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: !importHtml.trim()
                        ? theme === "dark"
                          ? "#444"
                          : "#ccc"
                        : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      color: "#fff",
                      cursor: !importHtml.trim() ? "not-allowed" : "pointer",
                      fontWeight: "600",
                      opacity: !importHtml.trim() ? 0.6 : 1,
                    }}
                  >
                    🚀 Import (No Save)
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleImportWidget(true)}
                    disabled={!importHtml.trim()}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: !importHtml.trim()
                        ? theme === "dark"
                          ? "#444"
                          : "#ccc"
                        : theme === "dark"
                        ? "#a855f7"
                        : "#7c3aed",
                      color: "#fff",
                      cursor: !importHtml.trim() ? "not-allowed" : "pointer",
                      fontWeight: "600",
                      opacity: !importHtml.trim() ? 0.6 : 1,
                    }}
                  >
                    Import Widget
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contribute Modal */}
        {showContributeModal && (
          <div
            className="import-modal-overlay"
            onClick={() => setShowContributeModal(false)}
          >
            <div
              className="import-modal-container"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "800px", maxHeight: "90vh" }}
            >
              <div className="import-modal-header">
                <h2>Contribute to IPFS</h2>
                <button
                  className="import-modal-close"
                  onClick={() => setShowContributeModal(false)}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div
                className="import-modal-body"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                {/* Wallet Connection Section */}
                <div style={{ marginBottom: "24px" }}>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      marginBottom: "12px",
                      color: theme === "dark" ? "#fff" : "#333",
                    }}
                  >
                    1. Connect Wallet
                  </h3>

                  {!isWalletConnected ? (
                    <button
                      onClick={connectWallet}
                      style={{
                        width: "100%",
                        padding: "14px 20px",
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        transition: "transform 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.transform = "scale(1.02)")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.transform = "scale(1)")
                      }
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Connect Wallet
                    </button>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          padding: "14px 20px",
                          background: theme === "dark" ? "#1a4d2e" : "#d1fae5",
                          border: `2px solid ${
                            theme === "dark" ? "#22c55e" : "#10b981"
                          }`,
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: "#10b981",
                            }}
                          />
                          <span
                            style={{
                              fontWeight: "600",
                              color: theme === "dark" ? "#fff" : "#065f46",
                              fontSize: "14px",
                            }}
                          >
                            {walletAddress.substring(0, 6)}...
                            {walletAddress.substring(walletAddress.length - 4)}
                          </span>
                        </div>
                        <button
                          onClick={disconnectWallet}
                          style={{
                            padding: "6px 12px",
                            background: theme === "dark" ? "#333" : "#fff",
                            border: `1px solid ${
                              theme === "dark" ? "#555" : "#d1d5db"
                            }`,
                            borderRadius: "6px",
                            fontSize: "12px",
                            cursor: "pointer",
                            color: theme === "dark" ? "#fff" : "#333",
                          }}
                        >
                          Disconnect
                        </button>
                      </div>

                      {/* History Button - shown when wallet is connected */}
                      <button
                        onClick={async () => {
                          try {
                            // Fetch from backend API
                            const walletApiUrl =
                              import.meta.env.VITE_WALLET_API_URL ||
                              "http://localhost:5002/api";
                            const response = await fetch(
                              `${walletApiUrl}/wallet-data/${walletAddress}/`
                            );

                            if (response.status === 404) {
                              // No contributions found for this wallet
                              setContributionHistory([]);
                              setShowHistoryModal(true);
                              return;
                            }

                            if (!response.ok) {
                              throw new Error(
                                `API returned ${response.status}`
                              );
                            }

                            const result = await response.json();
                            console.log("Fetched from backend:", result);

                            // Extract the data array from the nested response
                            const data = result.data || [];

                            // Check if data is empty
                            if (!data || data.length === 0) {
                              setContributionHistory([]);
                              setShowHistoryModal(true);
                              return;
                            }

                            // Decrypt hashes automatically and fetch metadata from IPFS
                            const { decryptHash } = await import(
                              "../../utils/ipfs"
                            );
                            const decryptedContributions = await Promise.all(
                              data.map(async (item) => {
                                try {
                                  const decryptedHash = await decryptHash(
                                    item.encrypted_hash,
                                    walletAddress
                                  );

                                  // Fetch the contribution data from IPFS to get type and projectName
                                  let contributionData = {
                                    type: "component",
                                    projectName: "Contribution",
                                  };
                                  try {
                                    const ipfsResponse = await fetch(
                                      `https://gateway.pinata.cloud/ipfs/${decryptedHash}`
                                    );
                                    if (ipfsResponse.ok) {
                                      const ipfsData =
                                        await ipfsResponse.json();
                                      contributionData = {
                                        type: ipfsData.type || "component",
                                        projectName:
                                          ipfsData.projectName ||
                                          "Untitled Project",
                                      };
                                    }
                                  } catch (ipfsError) {
                                    console.warn(
                                      "Could not fetch IPFS metadata:",
                                      ipfsError
                                    );
                                  }

                                  return {
                                    hash: decryptedHash,
                                    encryptedHash: item.encrypted_hash,
                                    uniqueId: item.unique_id,
                                    timestamp: item.created_at,
                                    walletAddress: item.wallet_address,
                                    projectName: contributionData.projectName,
                                    type: contributionData.type,
                                    id: item.id, // Database ID
                                  };
                                } catch (error) {
                                  console.error(
                                    "Decryption error for item:",
                                    item.unique_id,
                                    error
                                  );
                                  return null;
                                }
                              })
                            );

                            // Filter out failed decryptions
                            const validContributions =
                              decryptedContributions.filter((c) => c !== null);
                            setContributionHistory(validContributions);
                            setShowHistoryModal(true);
                          } catch (error) {
                            console.error("Failed to fetch history:", error);
                            // Show modal anyway with empty state
                            setContributionHistory([]);
                            setShowHistoryModal(true);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          background: theme === "dark" ? "#2d2d2d" : "#f3f4f6",
                          color: theme === "dark" ? "#fff" : "#333",
                          border: `1px solid ${
                            theme === "dark" ? "#444" : "#d1d5db"
                          }`,
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "500",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background =
                            theme === "dark" ? "#3d3d3d" : "#e5e7eb";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background =
                            theme === "dark" ? "#2d2d2d" : "#f3f4f6";
                        }}
                      >
                        <FiClock style={{ fontSize: "14px" }} />
                        View History
                      </button>
                    </div>
                  )}
                </div>

                {/* Component Type Section */}
                <div style={{ marginBottom: "24px" }}>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      marginBottom: "12px",
                      color: theme === "dark" ? "#fff" : "#333",
                    }}
                  >
                    2. Select Component Type
                  </h3>

                  <select
                    value={componentType}
                    onChange={(e) => setComponentType(e.target.value)}
                    disabled={!isWalletConnected}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: `2px solid ${
                        theme === "dark" ? "#444" : "#d1d5db"
                      }`,
                      backgroundColor: theme === "dark" ? "#1a1a1a" : "#fff",
                      color: theme === "dark" ? "#fff" : "#333",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: isWalletConnected ? "pointer" : "not-allowed",
                      opacity: isWalletConnected ? 1 : 0.5,
                      outline: "none",
                    }}
                  >
                    <option value="header">Header</option>
                    <option value="footer">Footer</option>
                    <option value="navbar">Navbar</option>
                    <option value="others">Others</option>
                  </select>
                </div>

                {/* Info Section */}
                <div
                  style={{
                    padding: "16px",
                    background: theme === "dark" ? "#1e3a8a" : "#dbeafe",
                    border: `1px solid ${
                      theme === "dark" ? "#3b82f6" : "#93c5fd"
                    }`,
                    borderRadius: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: theme === "dark" ? "#bfdbfe" : "#1e40af",
                      lineHeight: "1.6",
                    }}
                  >
                    <strong>ℹ️ What will be uploaded:</strong>
                    <br />
                    Your current page's HTML code will be converted to IPFS hash
                    and stored with your wallet address and unique ID.
                  </p>
                </div>

                {/* IPFS Hash Display */}
                {ipfsHash && (
                  <div
                    style={{
                      padding: "16px",
                      background: theme === "dark" ? "#14532d" : "#d1fae5",
                      border: `1px solid ${
                        theme === "dark" ? "#22c55e" : "#10b981"
                      }`,
                      borderRadius: "8px",
                      marginBottom: "16px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: theme === "dark" ? "#86efac" : "#065f46",
                      }}
                    >
                      ✅ Upload Successful!
                    </p>
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "12px",
                        color: theme === "dark" ? "#bbf7d0" : "#047857",
                        wordBreak: "break-all",
                        fontFamily: "monospace",
                      }}
                    >
                      IPFS Hash: {ipfsHash}
                    </p>
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 16px",
                        background: theme === "dark" ? "#22c55e" : "#10b981",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "600",
                        transition: "all 0.2s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background =
                          theme === "dark" ? "#16a34a" : "#059669";
                        e.target.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background =
                          theme === "dark" ? "#22c55e" : "#10b981";
                        e.target.style.transform = "translateY(0)";
                      }}
                    >
                      <FiDownload style={{ fontSize: "14px" }} />
                      View on IPFS
                    </a>
                  </div>
                )}
              </div>

              <div className="import-modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowContributeModal(false);
                    setIpfsHash("");
                  }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: theme === "dark" ? "#444" : "#e0e0e0",
                    color: theme === "dark" ? "#fff" : "#333",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={uploadToIPFS}
                  disabled={!isWalletConnected || isUploading}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "6px",
                    border: "none",
                    background:
                      !isWalletConnected || isUploading
                        ? theme === "dark"
                          ? "#444"
                          : "#ccc"
                        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "#fff",
                    cursor:
                      !isWalletConnected || isUploading
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: "600",
                    opacity: !isWalletConnected || isUploading ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isUploading ? (
                    <>
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid #fff",
                          borderTop: "2px solid transparent",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FiUpload />
                      Upload to IPFS
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistoryModal && (
          <div
            className="import-modal-overlay"
            onClick={() => setShowHistoryModal(false)}
          >
            <div
              className="import-modal-container"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "900px" }}
            >
              <div className="import-modal-header">
                <h2
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <FiClock />
                  Contribution History
                </h2>
                <button
                  className="import-modal-close"
                  onClick={() => setShowHistoryModal(false)}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div
                className="import-modal-body"
                style={{ maxHeight: "600px", overflowY: "auto" }}
              >
                {contributionHistory.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    {contributionHistory.map((contribution, index) => (
                      <div
                        key={contribution.uniqueId || index}
                        style={{
                          padding: "20px",
                          background: theme === "dark" ? "#2a2a2a" : "#ffffff",
                          borderRadius: "12px",
                          border: `1px solid ${
                            theme === "dark" ? "#3a3a3a" : "#e5e7eb"
                          }`,
                          boxShadow:
                            theme === "dark"
                              ? "0 2px 8px rgba(0,0,0,0.3)"
                              : "0 2px 8px rgba(0,0,0,0.05)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "12px",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: "18px",
                                fontWeight: "600",
                                color: theme === "dark" ? "#fff" : "#1f2937",
                                marginBottom: "6px",
                                textTransform: "capitalize",
                              }}
                            >
                              {contribution.type || "Component"}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: "12px",
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "12px",
                                  color:
                                    theme === "dark" ? "#9ca3af" : "#6b7280",
                                }}
                              >
                                {new Date(
                                  contribution.timestamp
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: "12px",
                            padding: "12px",
                            background:
                              theme === "dark" ? "#1a1a1a" : "#f9fafb",
                            borderRadius: "8px",
                            border: `1px solid ${
                              theme === "dark" ? "#2a2a2a" : "#e5e7eb"
                            }`,
                          }}
                        >
                          <div
                            style={{
                              fontSize: "11px",
                              color: theme === "dark" ? "#9ca3af" : "#6b7280",
                              marginBottom: "6px",
                              fontWeight: "500",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            ID
                          </div>
                          <div
                            style={{
                              fontSize: "13px",
                              color: theme === "dark" ? "#e5e7eb" : "#374151",
                              fontFamily: "Monaco, Consolas, monospace",
                              wordBreak: "break-all",
                              lineHeight: "1.5",
                            }}
                          >
                            {contribution.uniqueId || contribution.id || "N/A"}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            marginTop: "16px",
                            paddingTop: "16px",
                            borderTop: `1px solid ${
                              theme === "dark" ? "#3a3a3a" : "#e5e7eb"
                            }`,
                          }}
                        >
                          {contribution.hash && (
                            <a
                              href={`https://gateway.pinata.cloud/ipfs/${contribution.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: "10px 20px",
                                background:
                                  theme === "dark" ? "#3b82f6" : "#2563eb",
                                color: "white",
                                textDecoration: "none",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontWeight: "600",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                transition: "all 0.2s",
                                border: "none",
                                cursor: "pointer",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background =
                                  theme === "dark" ? "#2563eb" : "#1d4ed8";
                                e.target.style.transform = "translateY(-1px)";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background =
                                  theme === "dark" ? "#3b82f6" : "#2563eb";
                                e.target.style.transform = "translateY(0)";
                              }}
                            >
                              <FiExternalLink style={{ fontSize: "16px" }} />
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "60px 20px",
                      color: theme === "dark" ? "#9ca3af" : "#6b7280",
                    }}
                  >
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        margin: "0 auto 20px",
                        borderRadius: "50%",
                        background: theme === "dark" ? "#374151" : "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FiClock style={{ fontSize: "40px", opacity: 0.5 }} />
                    </div>
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        marginBottom: "8px",
                        color: theme === "dark" ? "#fff" : "#1f2937",
                      }}
                    >
                      No contributions yet
                    </h3>
                    <p style={{ fontSize: "14px", margin: 0 }}>
                      Start contributing components to see them here!
                    </p>
                  </div>
                )}
              </div>

              <div className="import-modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowHistoryModal(false)}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: theme === "dark" ? "#374151" : "#e5e7eb",
                    color: theme === "dark" ? "#fff" : "#1f2937",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pro+ Components Modal */}
        {showProComponentsModal && (
          <div
            className="import-modal-overlay"
            onClick={() => setShowProComponentsModal(false)}
          >
            <div
              className="import-modal-container"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "900px" }}
            >
              <div className="import-modal-header">
                <h2
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  Pro+ Components
                </h2>
                <button
                  className="import-modal-close"
                  onClick={() => setShowProComponentsModal(false)}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div
                className="import-modal-body"
                style={{ maxHeight: "600px", overflowY: "auto" }}
              >
                {proComponents.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    {proComponents.map((component, index) => (
                      <div
                        key={component.id || index}
                        style={{
                          padding: "20px",
                          background: theme === "dark" ? "#2a2a2a" : "#ffffff",
                          borderRadius: "12px",
                          border: `2px solid ${
                            theme === "dark" ? "#f59e0b" : "#fbbf24"
                          }`,
                          boxShadow:
                            theme === "dark"
                              ? "0 2px 8px rgba(245, 158, 11, 0.2)"
                              : "0 2px 8px rgba(251, 191, 36, 0.2)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "12px",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: "20px",
                                fontWeight: "600",
                                color: theme === "dark" ? "#fbbf24" : "#d97706",
                                marginBottom: "6px",
                                textTransform: "capitalize",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              {component.type || "Component"}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: "12px",
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "11px",
                                  color:
                                    theme === "dark" ? "#9ca3af" : "#6b7280",
                                  fontFamily: "monospace",
                                }}
                              >
                                By: {component.walletAddress?.substring(0, 6)}
                                ...
                                {component.walletAddress?.substring(
                                  component.walletAddress.length - 4
                                )}
                              </span>
                              <span
                                style={{
                                  fontSize: "12px",
                                  color:
                                    theme === "dark" ? "#9ca3af" : "#6b7280",
                                }}
                              >
                                {new Date(
                                  component.timestamp
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: "16px",
                            paddingTop: "16px",
                            borderTop: `1px solid ${
                              theme === "dark" ? "#3a3a3a" : "#e5e7eb"
                            }`,
                            display: "flex",
                            gap: "10px",
                          }}
                        >
                          <button
                            onClick={() => handlePayAndUseComponent(component)}
                            style={{
                              padding: "12px 24px",
                              background:
                                "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background =
                                "linear-gradient(135deg, #059669 0%, #047857 100%)";
                              e.target.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background =
                                "linear-gradient(135deg, #10b981 0%, #059669 100%)";
                              e.target.style.transform = "translateY(0)";
                            }}
                          >
                            💳 Pay & Use Component
                          </button>

                          <div
                            style={{
                              padding: "12px 20px",
                              background:
                                theme === "dark" ? "#374151" : "#f3f4f6",
                              borderRadius: "8px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              fontWeight: "600",
                              color: theme === "dark" ? "#fbbf24" : "#d97706",
                            }}
                          >
                            💰 0.01 ETH
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "60px 20px",
                      color: theme === "dark" ? "#9ca3af" : "#6b7280",
                    }}
                  >
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        margin: "0 auto 20px",
                        borderRadius: "50%",
                        background: theme === "dark" ? "#374151" : "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "40px",
                      }}
                    >
                      📦
                    </div>
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        marginBottom: "8px",
                        color: theme === "dark" ? "#fff" : "#1f2937",
                      }}
                    >
                      No Pro+ components available yet
                    </h3>
                    <p style={{ fontSize: "14px", margin: 0 }}>
                      Check back later for premium components!
                    </p>
                  </div>
                )}
              </div>

              <div className="import-modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowProComponentsModal(false)}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: theme === "dark" ? "#374151" : "#e5e7eb",
                    color: theme === "dark" ? "#fff" : "#1f2937",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Edit Modal */}
        {showAIEditModal && createPortal(
          <div className="import-modal-overlay" onClick={() => {
            setShowAIEditModal(false);
            setActivePreviewTab('Preview');
          }}>
            <div className="import-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95vw', width: '1400px', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
              <div className="import-modal-header">
                <h2>
                  <FiZap style={{ display: 'inline', marginRight: '8px' }} />
                  {aiMode === 'generate' ? 'AI Generate Component' : 'AI Edit Component'}
                </h2>
                <button className="import-modal-close" onClick={() => {
                  setShowAIEditModal(false);
                  setActivePreviewTab('Preview');
                }}>
                  <FiX />
                </button>
              </div>
              <div className="import-modal-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Top Section: Mode and Description */}
                <div style={{ flexShrink: 0 }}>
                  {/* Mode Selection */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: 600, 
                      fontSize: '14px',
                      color: theme === 'dark' ? '#fff' : '#333'
                    }}>
                      Mode
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => setAiMode('generate')}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          borderRadius: '6px',
                          border: `2px solid ${aiMode === 'generate' ? '#10b981' : (theme === 'dark' ? '#444' : '#d1d5db')}`,
                          backgroundColor: aiMode === 'generate' 
                            ? (theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)')
                            : 'transparent',
                          color: theme === 'dark' ? '#fff' : '#333',
                          cursor: 'pointer',
                          fontWeight: aiMode === 'generate' ? '600' : '400',
                          transition: 'all 0.2s'
                        }}
                      >
                        Generate New
                      </button>
                      <button
                        onClick={() => setAiMode('edit')}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          borderRadius: '6px',
                          border: `2px solid ${aiMode === 'edit' ? '#10b981' : (theme === 'dark' ? '#444' : '#d1d5db')}`,
                          backgroundColor: aiMode === 'edit' 
                            ? (theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)')
                            : 'transparent',
                          color: theme === 'dark' ? '#fff' : '#333',
                          cursor: 'pointer',
                          fontWeight: aiMode === 'edit' ? '600' : '400',
                          transition: 'all 0.2s'
                        }}
                      >
                        Edit Selected
                      </button>
                    </div>
                  </div>

                  {/* Description Input */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: 600, 
                      fontSize: '14px',
                      color: theme === 'dark' ? '#fff' : '#333'
                    }}>
                      Description <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      placeholder={aiMode === 'generate' 
                        ? 'Describe the component you want to generate, e.g., "A modern hero section with a gradient background, centered text, and two call-to-action buttons"'
                        : 'Describe how you want to edit the selected component, e.g., "Change the background color to blue and make the text larger"'}
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme === 'dark' ? '#444' : '#d1d5db'}`,
                        backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff',
                        color: theme === 'dark' ? '#fff' : '#333',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>

                {/* Preview Section - Large and Enhanced */}
                {showAIEditPreview && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {/* Tabs */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      borderBottom: `2px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                      marginBottom: '16px'
                    }}>
                      {['Preview', 'HTML', 'CSS', 'JS'].map((tab) => {
                        const isActive = activePreviewTab === tab;
                        return (
                          <button
                            key={tab}
                            onClick={() => setActivePreviewTab(tab)}
                            style={{
                              padding: '10px 20px',
                              border: 'none',
                              borderBottom: `3px solid ${isActive ? '#10b981' : 'transparent'}`,
                              backgroundColor: 'transparent',
                              color: isActive 
                                ? (theme === 'dark' ? '#10b981' : '#059669')
                                : (theme === 'dark' ? '#9ca3af' : '#6b7280'),
                              cursor: 'pointer',
                              fontWeight: isActive ? '600' : '400',
                              fontSize: '14px',
                              transition: 'all 0.2s',
                              marginBottom: '-2px'
                            }}
                          >
                            {tab}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab Content */}
                    <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                      {activePreviewTab === 'Preview' && (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: theme === 'dark' ? '#111' : '#fff',
                          minHeight: '500px'
                        }}>
                          <iframe
                            srcDoc={`
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <script src="https://cdn.tailwindcss.com"></script>
                                <style>${aiEditPreview.css || ''}</style>
                              </head>
                              <body style="margin: 0; padding: 20px; background: ${theme === 'dark' ? '#1a1a1a' : '#fff'}">
                                ${aiEditPreview.html || '<p style="color: #9ca3af; text-align: center; padding: 40px;">No preview available</p>'}
                                <script>${aiEditPreview.js || ''}</script>
                              </body>
                              </html>
                            `}
                            style={{
                              width: '100%',
                              height: '100%',
                              border: 'none',
                              minHeight: '500px'
                            }}
                            title="Component Preview"
                          />
                        </div>
                      )}
                      {activePreviewTab === 'HTML' && (
                        <div style={{
                          padding: '16px',
                          borderRadius: '8px',
                          border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f9fafb',
                          height: '100%',
                          overflow: 'auto'
                        }}>
                          <pre style={{
                            margin: 0,
                            fontSize: '13px',
                            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                            color: theme === 'dark' ? '#e5e7eb' : '#374151',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            lineHeight: '1.6'
                          }}>
                            {aiEditPreview.html || '// No HTML code available'}
                          </pre>
                        </div>
                      )}
                      {activePreviewTab === 'CSS' && (
                        <div style={{
                          padding: '16px',
                          borderRadius: '8px',
                          border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f9fafb',
                          height: '100%',
                          overflow: 'auto'
                        }}>
                          <pre style={{
                            margin: 0,
                            fontSize: '13px',
                            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                            color: theme === 'dark' ? '#e5e7eb' : '#374151',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            lineHeight: '1.6'
                          }}>
                            {aiEditPreview.css || '/* No CSS code available */'}
                          </pre>
                        </div>
                      )}
                      {activePreviewTab === 'JS' && (
                        <div style={{
                          padding: '16px',
                          borderRadius: '8px',
                          border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f9fafb',
                          height: '100%',
                          overflow: 'auto'
                        }}>
                          <pre style={{
                            margin: 0,
                            fontSize: '13px',
                            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                            color: theme === 'dark' ? '#e5e7eb' : '#374151',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            lineHeight: '1.6'
                          }}>
                            {aiEditPreview.js || '// No JavaScript code available'}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Info Message */}
                {!aiSettings.apiKey && (
                  <div style={{
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#fef3c7',
                    border: `1px solid ${theme === 'dark' ? 'rgba(245, 158, 11, 0.3)' : '#fbbf24'}`,
                    marginBottom: '20px'
                  }}>
                    <p style={{ margin: 0, fontSize: '13px', color: theme === 'dark' ? '#fbbf24' : '#92400e' }}>
                      ⚠️ Please configure AI settings first. Go to <strong>More → AI Settings</strong> to add your API key.
                    </p>
                  </div>
                )}
              </div>
              <div className="import-modal-footer">
                <button 
                  onClick={() => {
                    setShowAIEditModal(false);
                    setAiDescription('');
                    setAiEditPreview({ html: '', css: '', js: '' });
                    setShowAIEditPreview(false);
                    setActivePreviewTab('Preview');
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
                {showAIEditPreview ? (
                  <button 
                    onClick={handleApplyAICode}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Apply Code
                  </button>
                ) : (
                  <button 
                    onClick={handleAIGenerate}
                    disabled={isGenerating || !aiDescription.trim()}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isGenerating || !aiDescription.trim()
                        ? (theme === 'dark' ? '#444' : '#ccc')
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      cursor: isGenerating || !aiDescription.trim() ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      opacity: isGenerating || !aiDescription.trim() ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #fff',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FiZap />
                        Generate
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
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
                {/* LLM Provider */}
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
                      const providerConfigs = {
                        groq: {
                          model: 'llama-3.1-8b-instant',
                          baseUrl: 'https://api.groq.com/openai/v1'
                        },
                        openai: {
                          model: 'gpt-3.5-turbo',
                          baseUrl: 'https://api.openai.com/v1'
                        },
                        anthropic: {
                          model: 'claude-3-sonnet-20240229',
                          baseUrl: 'https://api.anthropic.com/v1'
                        }
                      };
                      const config = providerConfigs[provider] || providerConfigs.groq;
                      setAiSettings(prev => ({
                        ...prev,
                        llmProvider: provider,
                        model: config.model,
                        baseUrl: config.baseUrl
                      }));
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
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>

                {/* API Key */}
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
                    onChange={(e) => setAiSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Enter your API key"
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
                </div>

                {/* Model */}
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
                  <input
                    type="text"
                    value={aiSettings.model}
                    onChange={(e) => setAiSettings(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="Model name"
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
                </div>

                {/* Base URL */}
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
                    onChange={(e) => setAiSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
                    placeholder="API base URL"
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
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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

        {/* Workflow Configuration Modal */}
        {showWorkflowConfigModal && createPortal(
          <div className="import-modal-overlay" onClick={() => setShowWorkflowConfigModal(false)}>
            <div className="import-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <div className="import-modal-header">
                <h2>
                  <FiZap style={{ display: 'inline', marginRight: '8px' }} />
                  Configure Workflow Trigger
                </h2>
                <button className="import-modal-close" onClick={() => setShowWorkflowConfigModal(false)}>
                  <FiX />
                </button>
              </div>
              <div className="import-modal-body">
                {/* URL Source Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 600, 
                    fontSize: '14px',
                    color: theme === 'dark' ? '#fff' : '#333'
                  }}>
                    Webhook Source
                  </label>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <button
                      onClick={() => setWorkflowConfig({ ...workflowConfig, useBackendUrl: false })}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: `2px solid ${!workflowConfig.useBackendUrl ? '#667eea' : (theme === 'dark' ? '#444' : '#d1d5db')}`,
                        backgroundColor: !workflowConfig.useBackendUrl 
                          ? (theme === 'dark' ? 'rgba(102, 126, 234, 0.2)' : 'rgba(102, 126, 234, 0.1)')
                          : 'transparent',
                        color: theme === 'dark' ? '#fff' : '#333',
                        cursor: 'pointer',
                        fontWeight: !workflowConfig.useBackendUrl ? '600' : '400',
                        transition: 'all 0.2s'
                      }}
                    >
                      External (n8n)
                    </button>
                    <button
                      onClick={() => {
                        setWorkflowConfig({ 
                          ...workflowConfig, 
                          useBackendUrl: true,
                          customUrl: baseUrl || ''
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: `2px solid ${workflowConfig.useBackendUrl ? '#667eea' : (theme === 'dark' ? '#444' : '#d1d5db')}`,
                        backgroundColor: workflowConfig.useBackendUrl 
                          ? (theme === 'dark' ? 'rgba(102, 126, 234, 0.2)' : 'rgba(102, 126, 234, 0.1)')
                          : 'transparent',
                        color: theme === 'dark' ? '#fff' : '#333',
                        cursor: 'pointer',
                        fontWeight: workflowConfig.useBackendUrl ? '600' : '400',
                        transition: 'all 0.2s'
                      }}
                    >
                      Backend Workflow
                    </button>
                  </div>
                </div>

                {/* External n8n URL */}
                {!workflowConfig.useBackendUrl && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: 600, 
                      fontSize: '14px',
                      color: theme === 'dark' ? '#fff' : '#333'
                    }}>
                      n8n Webhook URL <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={workflowConfig.webhookUrl}
                      onChange={(e) => setWorkflowConfig({ ...workflowConfig, webhookUrl: e.target.value })}
                      placeholder="https://n8n.example.com/webhook/flows/your-workflow"
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
                      The webhook URL from your n8n workflow trigger node.
                    </p>
                  </div>
                )}

                {/* Backend Workflow Selection */}
                {workflowConfig.useBackendUrl && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: 600, 
                      fontSize: '14px',
                      color: theme === 'dark' ? '#fff' : '#333'
                    }}>
                      Select Workflow <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={workflowConfig.workflowId}
                      onChange={async (e) => {
                        const selectedWorkflowId = e.target.value;
                        setWorkflowConfig({ ...workflowConfig, workflowId: selectedWorkflowId });
                        
                        // Auto-fetch webhook URL for selected workflow
                        if (selectedWorkflowId) {
                          setWorkflowUrlLoading(true);
                          try {
                            const webhookData = await apiService.getWebhookUrl(selectedWorkflowId);
                            if (webhookData.webhook_url) {
                              setWorkflowConfig(prev => ({
                                ...prev,
                                webhookUrl: webhookData.webhook_url,
                                workflowId: selectedWorkflowId
                              }));
                            }
                          } catch (err) {
                            console.error('Error fetching webhook URL:', err);
                            alert('This workflow does not have a webhook trigger. Please add a webhook trigger node to the workflow.');
                          } finally {
                            setWorkflowUrlLoading(false);
                          }
                        }
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
                      <option value="">Select a workflow...</option>
                      {availableWorkflows.map(workflow => (
                        <option key={workflow.id} value={workflow.id}>
                          {workflow.name}
                        </option>
                      ))}
                    </select>
                    {workflowUrlLoading && (
                      <p style={{ marginTop: '6px', fontSize: '12px', color: theme === 'dark' ? '#888' : '#6b7280' }}>
                        Loading webhook URL...
                      </p>
                    )}
                    {workflowConfig.webhookUrl && !workflowUrlLoading && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                        border: `1px solid ${theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
                        borderRadius: '6px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <FiLink2 style={{ fontSize: '16px', color: '#3b82f6' }} />
                          <strong style={{ fontSize: '13px', color: theme === 'dark' ? '#fff' : '#333' }}>
                            Webhook URL:
                          </strong>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={workflowConfig.webhookUrl}
                            readOnly
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)',
                              border: `1px solid ${theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
                              borderRadius: '4px',
                              color: theme === 'dark' ? '#fff' : '#333',
                              fontSize: '12px',
                              fontFamily: 'monospace'
                            }}
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(workflowConfig.webhookUrl);
                              const notification = document.createElement('div');
                              notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;';
                              notification.textContent = '✓ Webhook URL copied!';
                              document.body.appendChild(notification);
                              setTimeout(() => notification.remove(), 2000);
                            }}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px'
                            }}
                            title="Copy webhook URL"
                          >
                            <FiCopy /> Copy
                          </button>
                        </div>
                        <p style={{ marginTop: '8px', fontSize: '11px', color: theme === 'dark' ? '#aaa' : '#666' }}>
                          💡 Share this URL with others or use it in external services.
                        </p>
                      </div>
                    )}
                    <p style={{ marginTop: '6px', fontSize: '12px', color: theme === 'dark' ? '#888' : '#6b7280' }}>
                      Select a workflow with a webhook trigger. The URL will be automatically generated.
                    </p>
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 600, 
                    fontSize: '14px',
                    color: theme === 'dark' ? '#fff' : '#333'
                  }}>
                    Workflow ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={workflowConfig.workflowId}
                    onChange={(e) => setWorkflowConfig({ ...workflowConfig, workflowId: e.target.value })}
                    placeholder="my-workflow-123"
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
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 600, 
                    fontSize: '14px',
                    color: theme === 'dark' ? '#fff' : '#333'
                  }}>
                    Shared Secret (Optional)
                  </label>
                  <input
                    type="password"
                    value={workflowConfig.secret}
                    onChange={(e) => setWorkflowConfig({ ...workflowConfig, secret: e.target.value })}
                    placeholder="Your HMAC secret for webhook authentication"
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
                    Used for HMAC signature authentication with n8n.
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
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={workflowConfig.buttonText}
                    onChange={(e) => setWorkflowConfig({ ...workflowConfig, buttonText: e.target.value })}
                    placeholder="Run Workflow"
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
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: theme === 'dark' ? '#fff' : '#333'
                  }}>
                    <input
                      type="checkbox"
                      checked={workflowConfig.waitForResult}
                      onChange={(e) => setWorkflowConfig({ ...workflowConfig, waitForResult: e.target.checked })}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '14px' }}>Wait for workflow completion (real-time updates)</span>
                  </label>
                  <p style={{ marginTop: '6px', fontSize: '12px', color: theme === 'dark' ? '#888' : '#6b7280', marginLeft: '24px' }}>
                    If enabled, the button will show real-time progress updates from the workflow.
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: theme === 'dark' ? '#fff' : '#333'
                  }}>
                    <input
                      type="checkbox"
                      checked={workflowConfig.showStatus}
                      onChange={(e) => setWorkflowConfig({ ...workflowConfig, showStatus: e.target.checked })}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontSize: '14px' }}>Show status messages</span>
                  </label>
                </div>
              </div>
              <div className="import-modal-footer">
                <button 
                  onClick={() => {
                    setShowWorkflowConfigModal(false);
                    setWorkflowConfig({
                      webhookUrl: '',
                      workflowId: '',
                      secret: '',
                      buttonText: 'Run Workflow',
                      waitForResult: false,
                      showStatus: true
                    });
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
                <button 
                  onClick={() => {
                    if (!workflowConfig.webhookUrl) {
                      if (workflowConfig.useBackendUrl) {
                        alert('Please select a workflow with a webhook trigger');
                      } else {
                        alert('Please enter a webhook URL');
                      }
                      return;
                    }
                    
                    // Apply configuration to selected component
                    if (selectedComponentForWorkflow && editor) {
                      const component = selectedComponentForWorkflow;
                      const button = component.find('.workflow-trigger-btn')[0];
                      
                      if (button) {
                        button.set('attributes', {
                          ...button.get('attributes'),
                          'data-workflow-webhook': workflowConfig.webhookUrl,
                          'data-workflow-id': workflowConfig.workflowId,
                          'data-workflow-secret': workflowConfig.secret,
                          'data-workflow-wait': workflowConfig.waitForResult.toString()
                        });
                        
                        // Update button text
                        button.set('content', workflowConfig.buttonText);
                        
                        // Update status div visibility
                        const statusDiv = component.find('.workflow-status')[0];
                        if (statusDiv) {
                          statusDiv.setStyle({
                            display: workflowConfig.showStatus ? 'block' : 'none'
                          });
                        }
                        
                        editor.refresh();
                      }
                    }
                    
                    setShowWorkflowConfigModal(false);
                    
                    // Show success notification
                    const notification = document.createElement('div');
                    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 600;';
                    notification.textContent = '✓ Workflow trigger configured!';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 3000);
                  }}
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
                  Save Configuration
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
