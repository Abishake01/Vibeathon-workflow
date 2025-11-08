import { useState } from 'react';
import { FiX, FiSearch, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { nodeTypeDefinitions, categories } from '../../nodeTypes.jsx';

const NodeLibrary = ({ onAddNode, isOpen, onToggle, nodes = [], logsExpanded = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(['AI', 'Core']);

  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => 
      prev.includes(categoryKey)
        ? prev.filter(c => c !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  const getNodesByCategory = (categoryKey) => {
    return Object.entries(nodeTypeDefinitions).filter(([key, node]) => {
      const matchesCategory = node.category === categoryKey;
      const matchesSearch = searchTerm === '' || 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  };

  // Check if a trigger node of the same type already exists
  const hasExistingTrigger = (nodeType) => {
    const nodeDef = nodeTypeDefinitions[nodeType];
    if (nodeDef?.nodeType !== 'trigger') return false;
    
    return nodes.some(node => {
      const existingNodeDef = nodeTypeDefinitions[node.data.type];
      return existingNodeDef?.nodeType === 'trigger' && node.data.type === nodeType;
    });
  };

  const handleDragStart = (event, nodeType, nodeDef) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: nodeType,
      label: nodeDef.name
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <>
      <div className={`node-library ${isOpen ? 'open' : ''}`}>
        <div className="library-header">
          <h3>Nodes</h3>
          <button className="close-btn" onClick={onToggle}>
            <FiX />
          </button>
        </div>

        <div className="library-search">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="library-categories">
          {categories.map(category => {
            const nodes = getNodesByCategory(category.key);
            const isExpanded = expandedCategories.includes(category.key);
            
            if (nodes.length === 0) return null;

            return (
              <div key={category.key} className="category-section">
                <div 
                  className="category-header" 
                  onClick={() => toggleCategory(category.key)}
                >
                  <span className="expand-icon">
                    {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                  </span>
                  <div className="category-info">
                    <h4>{category.label}</h4>
                    <p className="category-description">{category.description}</p>
                  </div>
                  <span className="node-count">{nodes.length}</span>
                </div>

                {isExpanded && (
                  <div className="category-nodes">
                    {nodes.map(([key, node]) => {
                      const isDisabled = hasExistingTrigger(key);
                      return (
                        <div
                          key={key}
                          className={`library-node ${isDisabled ? 'disabled' : ''}`}
                          draggable={!isDisabled}
                          onDragStart={!isDisabled ? (e) => handleDragStart(e, key, node) : undefined}
                          onClick={!isDisabled ? () => onAddNode(key, node) : undefined}
                          title={isDisabled ? `Only one '${node.name}' node is allowed in a workflow` : ''}
                        >
                          <div className="library-node-icon" style={{ color: isDisabled ? '#999' : node.color }}>
                            {node.icon}
                          </div>
                          <div className="library-node-content">
                            <div className="library-node-name" style={{ color: isDisabled ? '#999' : 'var(--text)' }}>
                              {node.name}
                              {isDisabled && <span style={{ fontSize: '12px', color: '#ef4444', marginLeft: '8px' }}>❌</span>}
                            </div>
                            <div className="library-node-description" style={{ color: isDisabled ? '#999' : 'var(--textSecondary)' }}>
                              {isDisabled ? 'Already exists in workflow' : node.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .node-library {
          position: fixed;
          left: -380px;
          top: 0;
          width: 380px;
          height: calc(100vh - var(--logs-height, 45px));
          background: var(--surface);
          border-right: 1px solid var(--border);
          transition: left 0.3s ease, height 0.3s ease;
          z-index: 10;
          display: flex;
          flex-direction: column;
        }

        .node-library.open {
          left: 0;
        }

        .library-header {
          padding: 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .library-header h3 {
          margin: 0;
          font-size: 18px;
          color: var(--text);
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--textSecondary);
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          color: var(--text);
          background: var(--hover);
        }

        .library-search {
          padding: 16px;
          border-bottom: 1px solid var(--border);
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 28px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--textSecondary);
          font-size: 16px;
        }

        .library-search input {
          width: 100%;
          padding: 10px 10px 10px 36px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 14px;
          background: var(--background);
          color: var(--text);
          transition: all 0.2s;
        }

        .library-search input:focus {
          outline: none;
          border-color: var(--text);
        }

        .library-categories {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0 60px 0; /* Extra padding at bottom to ensure last element is visible */
        }

        .category-section {
          margin-bottom: 4px;
        }

        .category-header {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 12px 16px;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }

        .category-header:hover {
          background: var(--hover);
        }

        .expand-icon {
          color: var(--textSecondary);
          display: flex;
          align-items: center;
          margin-top: 2px;
          font-size: 14px;
        }

        .category-info {
          flex: 1;
        }

        .category-info h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }

        .category-description {
          margin: 0;
          font-size: 11px;
          color: var(--textSecondary);
          line-height: 1.4;
        }

        .node-count {
          background: var(--hover);
          color: var(--textSecondary);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          margin-top: 2px;
        }

        .category-nodes {
          padding: 0 8px 8px 8px;
        }

        .library-node {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 6px;
          cursor: grab;
          transition: all 0.2s;
        }

        .library-node:hover {
          border-color: var(--text);
          transform: translateX(4px);
          box-shadow: 0 2px 8px var(--shadow);
        }

        .library-node:active {
          cursor: grabbing;
        }

        .library-node-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--hover);
          border-radius: 8px;
          flex-shrink: 0;
        }

        .library-node-content {
          flex: 1;
          min-width: 0;
        }

        .library-node-name {
          font-weight: 600;
          font-size: 13px;
          color: var(--text);
          margin-bottom: 4px;
        }

        .library-node-description {
          font-size: 11px;
          color: var(--textSecondary);
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .node-library {
            width: 320px;
            left: -320px;
          }
        }
      `}</style>
    </>
  );
};

export default NodeLibrary;
