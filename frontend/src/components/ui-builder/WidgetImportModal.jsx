import { useState, useRef, useEffect } from 'react';
import { FiX, FiUpload, FiCode, FiImage, FiLink, FiTrash2 } from 'react-icons/fi';
import apiService from '../../services/api';
import './WidgetImportModal.css';

function WidgetImportModal({ isOpen, onClose, onImport, editor }) {
  const [widgetName, setWidgetName] = useState('');
  const [widgetHtml, setWidgetHtml] = useState('');
  const [widgetCss, setWidgetCss] = useState('');
  const [widgetJs, setWidgetJs] = useState('');
  const [externalScripts, setExternalScripts] = useState([]);
  const [externalStyles, setExternalStyles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [useTailwind, setUseTailwind] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setWidgetName('');
      setWidgetHtml('');
      setWidgetCss('');
      setWidgetJs('');
      setExternalScripts([]);
      setExternalStyles([]);
      setUploadedImages([]);
      setUseTailwind(false);
    }
  }, [isOpen]);

  // Detect Tailwind CSS in HTML/CSS
  useEffect(() => {
    const hasTailwind = 
      widgetHtml.includes('class=') && 
      (widgetHtml.includes('bg-') || widgetHtml.includes('text-') || widgetHtml.includes('p-') || 
       widgetHtml.includes('m-') || widgetHtml.includes('flex') || widgetHtml.includes('grid')) ||
      widgetCss.includes('@tailwind') ||
      widgetCss.includes('tailwindcss');
    
    setUseTailwind(hasTailwind);
  }, [widgetHtml, widgetCss]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if dragging files
    if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        e.dataTransfer.dropEffect = 'copy';
        setDragActive(true);
      } else if (e.type === 'dragleave') {
        // Only set inactive if we're leaving the drop zone
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
          setDragActive(false);
        }
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      console.log('Files dropped:', fileArray.map(f => f.name));
      handleFiles(fileArray);
    } else {
      console.warn('No files in drop event');
      alert('No files were dropped. Please try again.');
    }
  };

  const handleFileInput = (e) => {
    const files = e.target?.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      console.log('Files selected:', fileArray.map(f => f.name));
      handleFiles(fileArray);
      // Reset input to allow selecting the same file again
      e.target.value = '';
    }
  };

  const handleFiles = (files) => {
    if (!files || files.length === 0) {
      console.warn('No files provided');
      return;
    }

    let processedCount = 0;
    
    files.forEach((file, index) => {
      const reader = new FileReader();
      const extension = file.name.split('.').pop().toLowerCase();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          
          if (!content) {
            console.warn(`File ${file.name} is empty`);
            return;
          }

          if (extension === 'html' || extension === 'htm') {
            setWidgetHtml(content);
            if (!widgetName) {
              setWidgetName(file.name.replace(/\.[^/.]+$/, ''));
            }
            processedCount++;
          } else if (extension === 'css') {
            setWidgetCss(content);
            processedCount++;
          } else if (extension === 'js') {
            setWidgetJs(content);
            processedCount++;
          } else {
            console.warn(`Unsupported file type: ${extension} for file ${file.name}`);
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          alert(`Error reading file ${file.name}: ${error.message}`);
        }
      };

      reader.onerror = (error) => {
        console.error(`Error reading file ${file.name}:`, error);
        alert(`Failed to read file ${file.name}. Please try again.`);
      };

      if (['html', 'htm', 'css', 'js'].includes(extension)) {
        reader.readAsText(file, 'UTF-8');
      } else {
        console.warn(`Skipping file ${file.name} - unsupported extension: ${extension}`);
      }
    });

    // Show feedback if no files were processed
    if (processedCount === 0 && files.length > 0) {
      setTimeout(() => {
        if (processedCount === 0) {
          alert('No valid files were processed. Please ensure you are dropping HTML, CSS, or JS files.');
        }
      }, 100);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Get custom name from user
        const customName = prompt(`Enter a custom name for "${file.name}" (or leave empty to use original name):`);
        if (customName === null) continue; // User cancelled
        
        if (customName) {
          formData.append('custom_name', customName);
        }

        const response = await apiService.request('/ui-assets/upload/', {
          method: 'POST',
          body: formData,
          headers: {} // Let browser set Content-Type for FormData
        });

        if (response.success) {
          setUploadedImages(prev => [...prev, {
            url: response.url,
            filename: response.filename,
            originalName: file.name
          }]);
        }
      }
    } catch (error) {
      alert(`Failed to upload image: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddExternalScript = () => {
    const url = prompt('Enter script URL (e.g., https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js):');
    if (url && url.trim()) {
      setExternalScripts(prev => [...prev, url.trim()]);
    }
  };

  const handleRemoveScript = (index) => {
    setExternalScripts(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddExternalStyle = () => {
    const url = prompt('Enter stylesheet URL (e.g., https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css):');
    if (url && url.trim()) {
      setExternalStyles(prev => [...prev, url.trim()]);
    }
  };

  const handleRemoveStyle = (index) => {
    setExternalStyles(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = () => {
    if (!widgetHtml.trim()) {
      alert('Please provide HTML content for the widget');
      return;
    }

    // Replace image placeholders with uploaded image URLs
    let processedHtml = widgetHtml;
    
    // Smart image replacement - replace image references in HTML
    uploadedImages.forEach((img) => {
      // Replace by filename in src attributes
      const filenamePattern = new RegExp(
        `(src=["'])([^"']*${img.originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"']*)(["'])`,
        'gi'
      );
      processedHtml = processedHtml.replace(filenamePattern, `$1${img.url}$3`);
      
      // Also replace by custom name if different
      if (img.filename !== img.originalName) {
        const customNamePattern = new RegExp(
          `(src=["'])([^"']*${img.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"']*)(["'])`,
          'gi'
        );
        processedHtml = processedHtml.replace(customNamePattern, `$1${img.url}$3`);
      }
      
      // Replace placeholder patterns like [IMAGE:filename] or {{image:filename}}
      const placeholderPatterns = [
        new RegExp(`\\[IMAGE:${img.originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'gi'),
        new RegExp(`\\{\\{image:${img.originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'gi'),
      ];
      
      placeholderPatterns.forEach(pattern => {
        processedHtml = processedHtml.replace(pattern, img.url);
      });
    });

    const widgetData = {
      id: `widget-${Date.now()}`,
      label: widgetName || 'Custom Widget',
      html: processedHtml,
      css: widgetCss,
      js: widgetJs,
      externalScripts: externalScripts,
      externalStyles: externalStyles,
      useTailwind: useTailwind,
      uploadedImages: uploadedImages
    };

    onImport(widgetData);
    handleClose();
  };

  const handleClose = () => {
    setWidgetName('');
    setWidgetHtml('');
    setWidgetCss('');
    setWidgetJs('');
    setExternalScripts([]);
    setExternalStyles([]);
    setUploadedImages([]);
    setUseTailwind(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container widget-import-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <FiUpload />
            <h2>Import Widget</h2>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>
            <FiX />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Widget Name */}
          <div className="form-group">
            <label>Widget Name</label>
            <input
              type="text"
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
              placeholder="Enter widget name"
              className="form-input"
            />
          </div>

          {/* Tailwind CSS Detection */}
          {useTailwind && (
            <div className="alert alert-info">
              <strong>🎨 Tailwind CSS Detected!</strong> The Tailwind CDN will be automatically added to support Tailwind classes.
            </div>
          )}

          {/* Image Upload Section */}
          <div className="form-group">
            <label>
              <FiImage /> Upload Images
            </label>
            <div className="image-upload-section">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
              >
                <FiUpload /> {uploading ? 'Uploading...' : 'Upload Images'}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              {uploadedImages.length > 0 && (
                <div className="uploaded-images">
                  {uploadedImages.map((img, index) => (
                    <div key={index} className="uploaded-image-item">
                      <img src={img.url} alt={img.filename} />
                      <span>{img.filename}</span>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* External Scripts */}
          <div className="form-group">
            <label>
              <FiLink /> External Scripts
            </label>
            <div className="external-resources">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddExternalScript}
              >
                + Add Script
              </button>
              {externalScripts.map((url, index) => (
                <div key={index} className="resource-item">
                  <span>{url}</span>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleRemoveScript(index)}
                  >
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* External Stylesheets */}
          <div className="form-group">
            <label>
              <FiLink /> External Stylesheets
            </label>
            <div className="external-resources">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddExternalStyle}
              >
                + Add Stylesheet
              </button>
              {externalStyles.map((url, index) => (
                <div key={index} className="resource-item">
                  <span>{url}</span>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleRemoveStyle(index)}
                  >
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* File Upload Area */}
          <div
            className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <FiUpload className="upload-icon" />
            <p className="upload-text">Drag & drop HTML, CSS, or JS files here</p>
            <p className="upload-subtext">or click to browse</p>
            {dragActive && (
              <p className="upload-active">Release to drop files</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".html,.htm,.css,.js,.txt"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>

          {/* HTML Input */}
          <div className="form-group">
            <label>
              <FiCode /> HTML
            </label>
            <textarea
              value={widgetHtml}
              onChange={(e) => setWidgetHtml(e.target.value)}
              placeholder="Paste your HTML code here... (Images will be replaced with uploaded images)"
              className="form-textarea code-input"
              rows="8"
            />
          </div>

          {/* CSS Input */}
          <div className="form-group">
            <label>
              <FiCode /> CSS (Optional)
            </label>
            <textarea
              value={widgetCss}
              onChange={(e) => setWidgetCss(e.target.value)}
              placeholder="Paste your CSS code here..."
              className="form-textarea code-input"
              rows="6"
            />
          </div>

          {/* JS Input */}
          <div className="form-group">
            <label>
              <FiCode /> JavaScript (Optional)
            </label>
            <textarea
              value={widgetJs}
              onChange={(e) => setWidgetJs(e.target.value)}
              placeholder="Paste your JavaScript code here..."
              className="form-textarea code-input"
              rows="6"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleImport}>
            Import Widget
          </button>
        </div>
      </div>
    </div>
  );
}

export default WidgetImportModal;
