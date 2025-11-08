import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const ExpressionEditor = forwardRef(({ value, onChange, jsonData, placeholder = "Enter expression...", onFocus }, ref) => {
  const [expression, setExpression] = useState(value || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    setExpression(value || '');
  }, [value]);

  // Expose insertVariable method to parent
  useImperativeHandle(ref, () => ({
    insertVariable: (variablePath) => {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart || cursorPosition;
        const end = textarea.selectionEnd || cursorPosition;
        const before = expression.substring(0, start);
        const after = expression.substring(end);
        const newExpression = before + variablePath + after;
        
        setExpression(newExpression);
        setCursorPosition(start + variablePath.length);
        
        if (onChange) {
          onChange(newExpression);
        }
        
        setTimeout(() => {
          const newPos = start + variablePath.length;
          textarea.setSelectionRange(newPos, newPos);
          setCursorPosition(newPos);
          textarea.focus();
        }, 0);
      }
    }
  }));

  // Generate suggestions based on JSON schema
  const generateSuggestions = (text, cursorPos) => {
    const beforeCursor = text.substring(0, cursorPos);
    const lastDot = beforeCursor.lastIndexOf('.');
    const lastBracket = beforeCursor.lastIndexOf('[');
    const lastDollar = beforeCursor.lastIndexOf('$');
    
    // Get the current context (what user is typing)
    let context = '';
    let startPos = 0;
    
    if (lastDollar > lastDot && lastDollar > lastBracket) {
      context = beforeCursor.substring(lastDollar);
      startPos = lastDollar;
    } else if (lastDot > lastBracket) {
      context = beforeCursor.substring(lastDot + 1);
      startPos = lastDot + 1;
    } else if (lastBracket > -1) {
      context = beforeCursor.substring(lastBracket + 1);
      startPos = lastBracket + 1;
    } else {
      context = beforeCursor;
      startPos = 0;
    }

    const matches = [];
    
    // Flatten JSON data for suggestions with proper $ prefix
    const flattenObject = (obj, prefix = '') => {
      const result = [];
      for (const key in obj) {
        // Add $ prefix for root level variables
        const fullPath = prefix ? `${prefix}.${key}` : (key.startsWith('$') ? key : `$${key}`);
        const value = obj[key];
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Add the object itself
          result.push({
            path: fullPath,
            display: fullPath,
            type: 'object',
            value: value
          });
          // Add nested properties
          result.push(...flattenObject(value, fullPath));
        } else {
          result.push({
            path: fullPath,
            display: fullPath,
            type: typeof value,
            value: value
          });
        }
      }
      return result;
    };

    const allPaths = flattenObject(jsonData);
    
    // Filter suggestions based on context
    let filtered = [];
    
    if (context.trim() === '' || context.trim() === '$') {
      // Show all root level variables when just typing $
      filtered = allPaths.filter(item => 
        item.path.startsWith('$') && !item.path.includes('.')
      ).slice(0, 10);
    } else {
      // Filter based on what user is typing
      const ctx = context.toLowerCase().replace(/[^a-zA-Z0-9_$]/g, '');
      filtered = allPaths.filter(item => {
        const display = item.display.toLowerCase();
        return display.includes(ctx) || display.startsWith(ctx);
      }).slice(0, 10);
    }

    return filtered;
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setExpression(newValue);
    setCursorPosition(cursorPos);
    
    if (onChange) {
      onChange(newValue);
    }

    // Show suggestions if typing $ or after . or [
    const beforeCursor = newValue.substring(0, cursorPos);
    const lastChar = beforeCursor[beforeCursor.length - 1];
    
    // Show suggestions when typing $ or after . or [
    if (beforeCursor.includes('$') || lastChar === '.' || lastChar === '[') {
      const suggs = generateSuggestions(newValue, cursorPos);
      if (suggs.length > 0) {
        setSuggestions(suggs);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertSuggestion(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  const insertSuggestion = (suggestion) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const beforeCursor = expression.substring(0, cursorPosition);
    const afterCursor = expression.substring(cursorPosition);
    
    // Find where to insert
    let insertPos = cursorPosition;
    const lastDot = beforeCursor.lastIndexOf('.');
    const lastBracket = beforeCursor.lastIndexOf('[');
    const lastDollar = beforeCursor.lastIndexOf('$');
    
    if (lastDollar > lastDot && lastDollar > lastBracket) {
      insertPos = lastDollar;
    } else if (lastDot > lastBracket) {
      insertPos = lastDot + 1;
    } else if (lastBracket > -1) {
      insertPos = lastBracket + 1;
    }

    const beforeInsert = expression.substring(0, insertPos);
    const afterInsert = expression.substring(cursorPosition);
    
    // Get the path to insert (remove common prefix if needed)
    let pathToInsert = suggestion.path;
    
    // If user just typed $, insert the full path
    if (beforeInsert.trim().endsWith('$') && !beforeInsert.trim().endsWith('.$')) {
      // User typed $, insert full variable path
      pathToInsert = suggestion.path.startsWith('$') 
        ? suggestion.path 
        : `$${suggestion.path}`;
    } else if (beforeInsert.endsWith('.')) {
      // User typed . after a variable, insert just the property name
      const parts = suggestion.path.split('.');
      pathToInsert = parts[parts.length - 1];
    } else if (lastDollar > -1 && lastDot === -1) {
      // User is typing after $ but before any dot, replace what they typed
      const typedAfterDollar = beforeInsert.substring(lastDollar + 1);
      if (typedAfterDollar.length > 0) {
        // Replace the typed text with the full path
        pathToInsert = suggestion.path.startsWith('$') 
          ? suggestion.path 
          : `$${suggestion.path}`;
        insertPos = lastDollar;
      } else {
        pathToInsert = suggestion.path.startsWith('$') 
          ? suggestion.path 
          : `$${suggestion.path}`;
      }
    }

    const newExpression = beforeInsert + pathToInsert + afterInsert;
    setExpression(newExpression);
    setShowSuggestions(false);
    
    if (onChange) {
      onChange(newExpression);
    }

    // Set cursor position after inserted text
    setTimeout(() => {
      const newPos = insertPos + pathToInsert.length;
      textarea.setSelectionRange(newPos, newPos);
      setCursorPosition(newPos);
    }, 0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const variablePath = e.dataTransfer.getData('text/plain');
    
    if (variablePath) {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = expression.substring(0, start);
        const after = expression.substring(end);
        const newExpression = before + variablePath + after;
        
        setExpression(newExpression);
        if (onChange) {
          onChange(newExpression);
        }
        
        setTimeout(() => {
          const newPos = start + variablePath.length;
          textarea.setSelectionRange(newPos, newPos);
          setCursorPosition(newPos);
        }, 0);
      }
    }
  };

  return (
    <div className="expression-editor-wrapper" style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        value={expression}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onFocus={(e) => {
          const pos = e.target.selectionStart || 0;
          setCursorPosition(pos);
          if (onFocus) onFocus();
        }}
        onSelect={(e) => {
          const pos = e.target.selectionStart || 0;
          setCursorPosition(pos);
        }}
        placeholder={placeholder}
        className="expression-textarea"
        rows={6}
        spellCheck={false}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="expression-suggestions"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.path}
              className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => insertSuggestion(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="suggestion-path">{suggestion.path}</span>
              <span className="suggestion-type">{suggestion.type}</span>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .expression-editor-wrapper {
          position: relative;
        }
        .expression-textarea {
          width: 100%;
          padding: 12px;
          background: #0f1724;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          color: #cbd5e1;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          resize: vertical;
          min-height: 120px;
          line-height: 1.5;
        }
        .expression-textarea:focus {
          outline: none;
          border-color: #ff6d5a;
        }
        .expression-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #1e1e2f;
          border: 1px solid #3d3d52;
          border-radius: 6px;
          margin-top: 4px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .suggestion-item {
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .suggestion-item:last-child {
          border-bottom: none;
        }
        .suggestion-item:hover,
        .suggestion-item.selected {
          background: #2a2a3a;
        }
        .suggestion-path {
          color: #cbd5e1;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }
        .suggestion-type {
          color: #888;
          font-size: 11px;
          text-transform: capitalize;
        }
      `}</style>
    </div>
  );
});

ExpressionEditor.displayName = 'ExpressionEditor';

export default ExpressionEditor;

