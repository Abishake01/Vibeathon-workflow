import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FiFileText, FiEye, FiCopy, FiDownload } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const READMEViewerNode = ({ data, selected }) => {
  // Get configured content from properties (fallback only, not default)
  const configuredContent = (data.properties?.content || data.content || '').trim();
  // Initialize with empty string - will be set by execution output or configured content
  const [content, setContent] = useState('');
  const [title, setTitle] = useState(data.properties?.title || data.title || 'Content Viewer');
  const lastContentRef = useRef('');
  
  // Debug logging
  console.log('📄 README Viewer - Data:', {
    nodeId: data.id,
    hasProperties: !!data.properties,
    propertiesContent: data.properties?.content,
    dataContent: data.content,
    configuredContent: configuredContent,
    executionState: !!data.executionState
  });

  // Update content when data changes (from workflow execution)
  useEffect(() => {
    let output = null;
    
    // First, check data.executionState (from node execution)
    if (data.executionState?.output) {
      output = data.executionState.output;
      console.log('📄 README Viewer: Using executionState output', { nodeId: data.id });
    }
    // If not found, check localStorage for execution data (from webhook executions)
    else {
      try {
        const storedData = localStorage.getItem('workflow_execution_data');
        if (storedData) {
          const executionData = JSON.parse(storedData);
          const nodeId = data.id || data.nodeId;
          if (nodeId) {
            const nodeState = executionData.node_states?.[nodeId];
            const nodeResult = executionData.node_results?.[nodeId];
            
            // Try to get output from node_states first
            if (nodeState?.output) {
              output = nodeState.output;
              console.log('📄 README Viewer: Using node_states output', { 
                nodeId, 
                outputType: typeof output,
                hasMain: output && typeof output === 'object' && 'main' in output,
                outputKeys: output && typeof output === 'object' ? Object.keys(output) : []
              });
            } 
            // Then try node_results (this is the actual result from backend)
            else if (nodeResult) {
              output = nodeResult;
              console.log('📄 README Viewer: Using node_results', { 
                nodeId, 
                outputType: typeof output,
                hasMain: output && typeof output === 'object' && 'main' in output,
                outputKeys: output && typeof output === 'object' ? Object.keys(output) : []
              });
            }
          }
        }
      } catch (e) {
        console.error('Error reading execution data from localStorage:', e);
      }
    }
    
    // Process the output - Priority: execution output (expression result) > actual data received > configured content > default "work"
    if (output) {
      let newContent = '';
      let hasExpressionResult = false;
      
      console.log('📄 README Viewer: Processing output:', {
        outputType: typeof output,
        isObject: typeof output === 'object',
        hasMain: output && typeof output === 'object' && 'main' in output,
        outputKeys: output && typeof output === 'object' ? Object.keys(output) : []
      });
      
      // If output is a string, use it directly (this is expression result)
      if (typeof output === 'string') {
        newContent = output;
        hasExpressionResult = true;
        console.log('📄 README Viewer: Using string output directly (expression result)');
      }
      // If output is an object, extract the actual content
      else if (output && typeof output === 'object') {
        // First check if it's the readme-viewer output structure: {main: {content: "...", ...}}
        if (output.main && typeof output.main === 'object') {
          // This is the structure from backend: {main: {content: "...", title: "...", ...}}
          // The content field contains the expression result
          if (output.main.content) {
            newContent = output.main.content;
            hasExpressionResult = true;
            console.log('📄 README Viewer: Extracted content from output.main.content (expression result):', newContent.substring(0, 50));
          } else if (output.main.text) {
            newContent = output.main.text;
            hasExpressionResult = true;
            console.log('📄 README Viewer: Extracted content from output.main.text');
          } else if (output.main.response) {
            newContent = output.main.response;
            hasExpressionResult = true;
            console.log('📄 README Viewer: Extracted content from output.main.response');
          } else {
            // Show actual data received (the main object itself) - no expression result, show data
            newContent = JSON.stringify(output.main, null, 2);
            console.log('📄 README Viewer: Showing actual data received (main object)');
          }
        }
        // Check top-level content/text fields (expression results)
        else if (output.content) {
          newContent = output.content;
          hasExpressionResult = true;
          console.log('📄 README Viewer: Using top-level content field (expression result)');
        } else if (output.text) {
          newContent = output.text;
          hasExpressionResult = true;
          console.log('📄 README Viewer: Using top-level text field');
        } else if (output.response) {
          newContent = output.response;
          hasExpressionResult = true;
          console.log('📄 README Viewer: Using top-level response field');
        } else {
          // Show actual data received (the entire output object) - no expression result, show data
          newContent = JSON.stringify(output, null, 2);
          console.log('📄 README Viewer: Showing actual data received (entire output)');
        }
      }
      
      if (newContent) {
        console.log('📄 README Viewer: Setting content from execution output, length:', newContent.length, 'hasExpressionResult:', hasExpressionResult);
        setContent(newContent);
        lastContentRef.current = newContent;
      } else {
        console.log('📄 README Viewer: No content extracted from output');
      }
    } else {
      // No execution output - use configured content only if it exists
      const propsContent = (data.properties?.content || data.content || '').trim();
      if (propsContent && propsContent !== 'work') {
        console.log('📄 README Viewer: Using configured content (no execution output)');
        setContent(propsContent);
        lastContentRef.current = propsContent;
      } else if (!propsContent) {
        // Default to "work" only if no execution output and no configured content
        console.log('📄 README Viewer: Using default "work" (no execution output, no configured content)');
        setContent('work');
        lastContentRef.current = 'work';
      }
    }
  }, [data.executionState, data.properties?.content, data.content, data.id]);
  
  // Also listen for storage events (when localStorage is updated from other tabs/components)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'workflow_execution_data') {
        console.log('📄 README Viewer: Storage event detected, updating content');
        // Trigger re-render by checking localStorage again
        try {
          const storedData = localStorage.getItem('workflow_execution_data');
          if (storedData) {
            const executionData = JSON.parse(storedData);
            const nodeId = data.id || data.nodeId;
            if (nodeId) {
              const nodeState = executionData.node_states?.[nodeId];
              const nodeResult = executionData.node_results?.[nodeId];
              
              let output = null;
              if (nodeState?.output) {
                output = nodeState.output;
              } else if (nodeResult) {
                output = nodeResult;
              }
              
              if (output) {
                let newContent = '';
                if (typeof output === 'string') {
                  newContent = output;
                } else if (output && typeof output === 'object') {
                  // Check for readme-viewer structure: {main: {content: "...", ...}}
                  if (output.main && typeof output.main === 'object') {
                    newContent = output.main.content || output.main.text || output.main.response || JSON.stringify(output.main, null, 2);
                  } else if (output.content) {
                    newContent = output.content;
                  } else if (output.text) {
                    newContent = output.text;
                  } else {
                    newContent = JSON.stringify(output, null, 2);
                  }
                }
                if (newContent) {
                  setContent(newContent);
                  lastContentRef.current = newContent;
                }
              } else {
                // No execution data - only use configured content if it exists
                const propsContent = (data.properties?.content || data.content || '').trim();
                if (propsContent && propsContent !== lastContentRef.current) {
                  console.log('📄 README Viewer: Using configured content (no execution data in storage event)');
                  setContent(propsContent);
                  lastContentRef.current = propsContent;
                } else if (!propsContent && lastContentRef.current !== 'work') {
                  // Only show "work" if there's truly nothing
                  setContent('work');
                  lastContentRef.current = 'work';
                }
              }
            }
          }
        } catch (e) {
          console.error('Error handling storage event:', e);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also poll localStorage periodically (for same-tab updates)
    const pollInterval = setInterval(() => {
      try {
        const storedData = localStorage.getItem('workflow_execution_data');
        if (storedData) {
          const executionData = JSON.parse(storedData);
          const nodeId = data.id || data.nodeId;
          if (nodeId) {
            const nodeState = executionData.node_states?.[nodeId];
            const nodeResult = executionData.node_results?.[nodeId];
            
            if (nodeState?.output || nodeResult) {
              const output = nodeState?.output || nodeResult;
              let newContent = '';
              
              if (typeof output === 'string') {
                newContent = output;
              } else if (output && typeof output === 'object') {
                // Check for readme-viewer structure: {main: {content: "...", ...}}
                if (output.main && typeof output.main === 'object') {
                  newContent = output.main.content || output.main.text || output.main.response;
                  if (!newContent) {
                    newContent = typeof output.main === 'string' ? output.main : JSON.stringify(output.main, null, 2);
                  }
                } else if (output.content) {
                  newContent = output.content;
                } else if (output.text) {
                  newContent = output.text;
                } else {
                  newContent = JSON.stringify(output, null, 2);
                }
              }
              
              if (newContent && newContent !== lastContentRef.current) {
                setContent(newContent);
                lastContentRef.current = newContent;
              } else if (!newContent) {
                // If no execution data, use configured content from properties
                const propsContent = (data.properties?.content || data.content || '').trim();
                if (propsContent && propsContent !== lastContentRef.current) {
                  setContent(propsContent);
                  lastContentRef.current = propsContent;
                } else if (!propsContent && lastContentRef.current !== 'work') {
                  setContent('work');
                  lastContentRef.current = 'work';
                }
              }
            } else {
              // No execution data, use configured content
              const propsContent = (data.properties?.content || data.content || '').trim();
              if (propsContent && propsContent !== lastContentRef.current) {
                setContent(propsContent);
                lastContentRef.current = propsContent;
              } else if (!propsContent && lastContentRef.current !== 'work') {
                setContent('work');
                lastContentRef.current = 'work';
              }
            }
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }, 1000); // Poll every second
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [data.id, data.properties?.content, data.content]);

  // Update title when properties change
  useEffect(() => {
    setTitle(data.properties?.title || data.title || 'Content Viewer');
  }, [data.properties?.title, data.title]);

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
            <p>work</p>
            <p className="readme-empty-subtitle">Configure content or connect a node to see data here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default READMEViewerNode;

