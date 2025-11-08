import React, { useState, useEffect } from 'react';
import { FiEdit3, FiFileText, FiSave, FiX } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const NotesNode = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(data.content || '');

  // Update editContent when data.content changes
  useEffect(() => {
    setEditContent(data.content || '');
  }, [data.content]);

  const handleSave = () => {
    console.log('📝 Saving notes content:', editContent);
    if (data.onUpdate) {
      data.onUpdate({ content: editContent });
    } else {
      console.error('📝 onUpdate function not found in data:', data);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(data.content || '');
    setIsEditing(false);
  };

  const handleEdit = () => {
    setEditContent(data.content || '');
    setIsEditing(true);
  };

  return (
    <div className={`notes-node ${selected ? 'selected' : ''}`}>
      <div className="notes-node-header">
        <div className="notes-node-title">
          <FiFileText />
          <span>Notes</span>
        </div>
        <div className="notes-node-actions">
          {isEditing ? (
            <>
              <button 
                className="action-btn save-btn" 
                onClick={handleSave}
                title="Save changes"
              >
                <FiSave />
              </button>
              <button 
                className="action-btn cancel-btn" 
                onClick={handleCancel}
                title="Cancel editing"
              >
                <FiX />
              </button>
            </>
          ) : (
            <button 
              className="action-btn edit-btn" 
              onClick={handleEdit}
              title="Edit notes"
            >
              <FiEdit3 />
            </button>
          )}
        </div>
      </div>

      <div className="notes-node-content">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Enter your notes here... (Markdown supported)"
            className="notes-edit-textarea"
            autoFocus
          />
        ) : (
          <div className="notes-display">
            {data.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="notes-h1">{children}</h1>,
                  h2: ({ children }) => <h2 className="notes-h2">{children}</h2>,
                  h3: ({ children }) => <h3 className="notes-h3">{children}</h3>,
                  p: ({ children }) => <p className="notes-p">{children}</p>,
                  ul: ({ children }) => <ul className="notes-ul">{children}</ul>,
                  ol: ({ children }) => <ol className="notes-ol">{children}</ol>,
                  li: ({ children }) => <li className="notes-li">{children}</li>,
                  code: ({ children, className }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <code className="notes-code-block">{children}</code>
                    ) : (
                      <code className="notes-inline-code">{children}</code>
                    );
                  },
                  blockquote: ({ children }) => <blockquote className="notes-blockquote">{children}</blockquote>,
                  table: ({ children }) => <div className="notes-table-wrapper"><table className="notes-table">{children}</table></div>,
                  th: ({ children }) => <th className="notes-th">{children}</th>,
                  td: ({ children }) => <td className="notes-td">{children}</td>,
                }}
              >
                {data.content}
              </ReactMarkdown>
            ) : (
              <div className="notes-empty">
                <FiFileText />
                <p>Click edit to add notes</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesNode;
