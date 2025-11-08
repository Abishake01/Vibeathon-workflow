import { useState, useEffect } from 'react';
import { FiX, FiDownload, FiCopy, FiCheck } from 'react-icons/fi';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-markup.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-javascript.js';
import './CodeExportModal.css';

function CodeExportModal({ isOpen, onClose, editor }) {
  const [exportType, setExportType] = useState('html-only'); // html-only, html-css, full
  const [minified, setMinified] = useState(false);
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [jsCode, setJsCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (editor && isOpen) {
      const html = editor.getHtml();
      const css = editor.getCss();
      
      setHtmlCode(html || '<!-- No HTML content -->');
      setCssCode(css || '/* No CSS styles */');
      setJsCode('// Add your JavaScript here');
      
      // Highlight syntax
      setTimeout(() => {
        Prism.highlightAll();
      }, 100);
    }
  }, [editor, isOpen]);

  if (!isOpen) return null;

  const getFullHtml = () => {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Page</title>`;

    if (exportType === 'html-css' || exportType === 'full') {
      html += `
  <style>
${cssCode}
  </style>`;
    }

    html += `
</head>
<body>
${htmlCode}`;

    if (exportType === 'full' && jsCode && jsCode !== '// Add your JavaScript here') {
      html += `
  <script>
${jsCode}
  </script>`;
    }

    html += `
</body>
</html>`;

    return html;
  };

  const handleCopy = (code, type) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(type);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleDownload = () => {
    let content, filename, mimeType;

    if (exportType === 'html-only') {
      content = htmlCode;
      filename = 'page.html';
      mimeType = 'text/html';
    } else {
      content = getFullHtml();
      filename = 'page.html';
      mimeType = 'text/html';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = () => {
    // Create separate files for HTML, CSS, and JS
    const files = [
      { name: 'index.html', content: getFullHtml() },
      { name: 'styles.css', content: cssCode },
      { name: 'script.js', content: jsCode }
    ];

    // For now, download files separately (in production, use JSZip library)
    files.forEach(file => {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container code-export-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <FiDownload />
            <h2>Export Code</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Export Options */}
          <div className="export-options">
            <label className="export-option">
              <input
                type="radio"
                name="export-type"
                value="html-only"
                checked={exportType === 'html-only'}
                onChange={(e) => setExportType(e.target.value)}
              />
              <div className="option-content">
                <strong>HTML Only</strong>
                <span>Export only the HTML content</span>
              </div>
            </label>

            <label className="export-option">
              <input
                type="radio"
                name="export-type"
                value="html-css"
                checked={exportType === 'html-css'}
                onChange={(e) => setExportType(e.target.value)}
              />
              <div className="option-content">
                <strong>HTML + CSS</strong>
                <span>Export HTML with embedded CSS</span>
              </div>
            </label>

            <label className="export-option">
              <input
                type="radio"
                name="export-type"
                value="full"
                checked={exportType === 'full'}
                onChange={(e) => setExportType(e.target.value)}
              />
              <div className="option-content">
                <strong>Full Package</strong>
                <span>Export HTML, CSS, and JavaScript</span>
              </div>
            </label>
          </div>

          {/* Minify Option */}
          <div className="option-toggle">
            <label>
              <input
                type="checkbox"
                checked={minified}
                onChange={(e) => setMinified(e.target.checked)}
              />
              <span>Minify code (compact format)</span>
            </label>
          </div>

          {/* Code Preview */}
          <div className="code-preview">
            {/* HTML */}
            <div className="code-section">
              <div className="code-header">
                <span className="code-label">HTML</span>
                <button
                  className="code-copy-btn"
                  onClick={() => handleCopy(htmlCode, 'html')}
                >
                  {copiedCode === 'html' ? <FiCheck /> : <FiCopy />}
                  {copiedCode === 'html' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="code-block">
                <code className="language-markup">{htmlCode}</code>
              </pre>
            </div>

            {/* CSS */}
            {(exportType === 'html-css' || exportType === 'full') && (
              <div className="code-section">
                <div className="code-header">
                  <span className="code-label">CSS</span>
                  <button
                    className="code-copy-btn"
                    onClick={() => handleCopy(cssCode, 'css')}
                  >
                    {copiedCode === 'css' ? <FiCheck /> : <FiCopy />}
                    {copiedCode === 'css' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="code-block">
                  <code className="language-css">{cssCode}</code>
                </pre>
              </div>
            )}

            {/* JavaScript */}
            {exportType === 'full' && (
              <div className="code-section">
                <div className="code-header">
                  <span className="code-label">JavaScript</span>
                  <button
                    className="code-copy-btn"
                    onClick={() => handleCopy(jsCode, 'js')}
                  >
                    {copiedCode === 'js' ? <FiCheck /> : <FiCopy />}
                    {copiedCode === 'js' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="code-block">
                  <code className="language-javascript">{jsCode}</code>
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {exportType === 'full' && (
            <button className="btn btn-secondary" onClick={handleDownloadZip}>
              <FiDownload />
              Download All Files
            </button>
          )}
          <button className="btn btn-primary" onClick={handleDownload}>
            <FiDownload />
            Download {exportType === 'html-only' ? 'HTML' : 'Page'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CodeExportModal;

