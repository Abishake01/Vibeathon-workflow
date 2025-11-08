import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FiFileText, FiEye, FiCopy, FiDownload } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const READMEViewerNode = ({ data, selected }) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState(data.title || 'Content Viewer');

  // Update content when data changes (from workflow execution)
  useEffect(() => {
    if (data.executionState?.output) {
      // Handle different output formats
      const output = data.executionState.output;
      
      // If output is a string, use it directly
      if (typeof output === 'string') {
        setContent(output);
      }
      // If output is an object, look for content/text/response fields
      else if (output && typeof output === 'object') {
        if (output.content) {
          setContent(output.content);
        } else if (output.text) {
          setContent(output.text);
        } else if (output.response) {
          setContent(output.response);
        } else if (output.main && typeof output.main === 'object') {
          // Handle nested main object
          if (output.main.content) {
            setContent(output.main.content);
          } else if (output.main.text) {
            setContent(output.main.text);
          } else if (output.main.response) {
            setContent(output.main.response);
          } else {
            // Fallback to string representation of main object
            setContent(JSON.stringify(output.main, null, 2));
          }
        } else {
          // Last resort - stringify the entire output
          setContent(JSON.stringify(output, null, 2));
        }
      }
    } else if (data.content) {
      setContent(data.content);
    }
  }, [data.executionState, data.content]);

  // Update title when properties change
  useEffect(() => {
    setTitle(data.title || 'Content Viewer');
  }, [data.title]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
    console.log('📋 Content copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`readme-viewer-node ${selected ? 'selected' : ''}`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="main"
        style={{
          background: '#10b981',
          width: 12,
          height: 12,
          border: '2px solid #fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      />
      
      <div className="readme-viewer-header">
        <div className="readme-viewer-title">
          <FiFileText />
          <span>{title}</span>
        </div>
        <div className="readme-viewer-actions">
          <button 
            className="action-btn copy-btn" 
            onClick={handleCopy}
            title="Copy content"
          >
            <FiCopy />
          </button>
          <button 
            className="action-btn download-btn" 
            onClick={handleDownload}
            title="Download as markdown"
          >
            <FiDownload />
          </button>
        </div>
      </div>

      <div className="readme-viewer-content">
        {content ? (
          <div className="readme-display">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="readme-h1">{children}</h1>,
                h2: ({ children }) => <h2 className="readme-h2">{children}</h2>,
                h3: ({ children }) => <h3 className="readme-h3">{children}</h3>,
                h4: ({ children }) => <h4 className="readme-h4">{children}</h4>,
                h5: ({ children }) => <h5 className="readme-h5">{children}</h5>,
                h6: ({ children }) => <h6 className="readme-h6">{children}</h6>,
                p: ({ children }) => <p className="readme-p">{children}</p>,
                ul: ({ children }) => <ul className="readme-ul">{children}</ul>,
                ol: ({ children }) => <ol className="readme-ol">{children}</ol>,
                li: ({ children }) => <li className="readme-li">{children}</li>,
                code: ({ children, className }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <pre className="readme-code-block">
                      <code className={`language-${match[1]}`}>{children}</code>
                    </pre>
                  ) : (
                    <code className="readme-inline-code">{children}</code>
                  );
                },
                pre: ({ children }) => <pre className="readme-pre">{children}</pre>,
                blockquote: ({ children }) => <blockquote className="readme-blockquote">{children}</blockquote>,
                table: ({ children }) => <div className="readme-table-wrapper"><table className="readme-table">{children}</table></div>,
                th: ({ children }) => <th className="readme-th">{children}</th>,
                td: ({ children }) => <td className="readme-td">{children}</td>,
                a: ({ children, href }) => <a href={href} className="readme-link" target="_blank" rel="noopener noreferrer">{children}</a>,
                img: ({ src, alt }) => <img src={src} alt={alt} className="readme-img" />,
                hr: () => <hr className="readme-hr" />,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="readme-empty">
            <FiEye />
            <p>No content to display</p>
            <p className="readme-empty-subtitle">Connect a node to see content here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default READMEViewerNode;
