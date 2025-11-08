import React, { useState, useEffect } from 'react';
import { workflowApi } from '../../api/workflowApi';
import './MemoryTypesDisplay.css';

const MemoryTypesDisplay = ({ onMemoryTypeSelect, selectedMemoryType }) => {
  const [memoryTypes, setMemoryTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMemoryTypes();
  }, []);

  const loadMemoryTypes = async () => {
    try {
      setLoading(true);
      const response = await workflowApi.getAvailableMemoryTypes();
      setMemoryTypes(response.memory_types || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...new Set(memoryTypes.map(type => type.category))];

  const filteredMemoryTypes = memoryTypes.filter(type => {
    const matchesCategory = selectedCategory === 'All' || type.category === selectedCategory;
    const matchesSearch = type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         type.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Alith SDK': return '🚀';
      case 'Legacy': return '🔧';
      default: return '📝';
    }
  };

  const getMemoryTypeIcon = (type) => {
    switch (type.id) {
      case 'window-buffer-memory': return '🪟';
      case 'simple-memory': return '💬';
      case 'vector-memory': return '🔍';
      default: return '🧠';
    }
  };

  if (loading) {
    return (
      <div className="memory-types-loading">
        <div className="loading-spinner"></div>
        <p>Loading memory types...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="memory-types-error">
        <p>Error loading memory types: {error}</p>
        <button onClick={loadMemoryTypes} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="memory-types-display">
      <div className="memory-types-header">
        <h3>Available Memory Types</h3>
        <p>Choose from {memoryTypes.length} different memory types powered by Alith SDK</p>
      </div>

      <div className="memory-types-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search memory types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-filters">
          {categories.map(category => (
            <button
              key={category}
              className={`category-filter ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {getCategoryIcon(category)} {category}
            </button>
          ))}
        </div>
      </div>

      <div className="memory-types-grid">
        {filteredMemoryTypes.map(type => (
          <div
            key={type.id}
            className={`memory-type-card ${selectedMemoryType === type.id ? 'selected' : ''}`}
            onClick={() => onMemoryTypeSelect && onMemoryTypeSelect(type)}
          >
            <div className="memory-type-header">
              <span className="memory-type-icon">{getMemoryTypeIcon(type)}</span>
              <div className="memory-type-info">
                <h4>{type.name}</h4>
                <span className="memory-type-category">
                  {getCategoryIcon(type.category)} {type.category}
                </span>
              </div>
            </div>
            
            <p className="memory-type-description">{type.description}</p>
            
            <div className="memory-type-features">
              {type.features.map((feature, index) => (
                <span key={index} className="feature-tag">
                  {feature}
                </span>
              ))}
            </div>

            {selectedMemoryType === type.id && (
              <div className="selected-indicator">
                ✓ Selected
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredMemoryTypes.length === 0 && (
        <div className="no-results">
          <p>No memory types found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default MemoryTypesDisplay;
