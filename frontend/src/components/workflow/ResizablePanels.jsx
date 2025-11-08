import { useState, useRef, useEffect } from 'react';

/**
 * Resizable Panels Component
 * Allows resizing between panels using a drag handle
 */
const ResizablePanels = ({ children, initialSizes = [280, 1, 400], minSizes = [200, 300, 300] }) => {
  const [sizes, setSizes] = useState(initialSizes);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragIndexRef = useRef(null);
  const startXRef = useRef(0);
  const startSizesRef = useRef([0, 0, 0]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current || dragIndexRef.current === null) return;

      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const deltaX = e.clientX - startXRef.current;
      const dragIndex = dragIndexRef.current;

      // Calculate new sizes
      const newSizes = [...startSizesRef.current];
      const totalFlex = sizes[1]; // Middle panel uses flex

      // Convert pixel sizes to percentages for left and right
      const leftPercent = (startSizesRef.current[0] / containerWidth) * 100;
      const rightPercent = (startSizesRef.current[2] / containerWidth) * 100;

      if (dragIndex === 0) {
        // Resizing left panel
        const newLeftSize = Math.max(
          minSizes[0],
          Math.min(containerWidth - minSizes[1] - minSizes[2], startSizesRef.current[0] + deltaX)
        );
        newSizes[0] = newLeftSize;
      } else if (dragIndex === 1) {
        // Resizing right panel
        const newRightSize = Math.max(
          minSizes[2],
          Math.min(containerWidth - minSizes[0] - minSizes[1], startSizesRef.current[2] - deltaX)
        );
        newSizes[2] = newRightSize;
      }

      setSizes(newSizes);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      dragIndexRef.current = null;
    };

    if (isDraggingRef.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [sizes, minSizes]);

  const handleMouseDown = (index, e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragIndexRef.current = index;
    startXRef.current = e.clientX;
    startSizesRef.current = [...sizes];
  };

  return (
    <div 
      ref={containerRef}
      className="resizable-panels-container"
      style={{
        display: 'grid',
        gridTemplateColumns: `${sizes[0]}px 4px 1fr 4px ${sizes[2]}px`,
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Left Panel */}
      <div 
        className="resizable-panel" 
        style={{ 
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden'
        }}
      >
        {children[0]}
      </div>

      {/* Left Resizer */}
      <div
        className="resizer resizer-vertical"
        onMouseDown={(e) => handleMouseDown(0, e)}
        style={{
          cursor: 'col-resize',
          background: 'var(--border)',
          width: '4px',
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '-2px',
            right: '-2px',
            top: 0,
            bottom: 0,
            cursor: 'col-resize'
          }}
        />
      </div>

      {/* Middle Panel */}
      <div 
        className="resizable-panel" 
        style={{ 
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden'
        }}
      >
        {children[1]}
      </div>

      {/* Right Resizer */}
      <div
        className="resizer resizer-vertical"
        onMouseDown={(e) => handleMouseDown(1, e)}
        style={{
          cursor: 'col-resize',
          background: 'var(--border)',
          width: '4px',
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '-2px',
            right: '-2px',
            top: 0,
            bottom: 0,
            cursor: 'col-resize'
          }}
        />
      </div>

      {/* Right Panel */}
      <div 
        className="resizable-panel" 
        style={{ 
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden'
        }}
      >
        {children[2]}
      </div>

      <style>{`
        .resizable-panels-container {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .resizable-panel {
          box-sizing: border-box;
        }
        .resizable-panel > * {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        .resizer-vertical:hover {
          background: var(--primary);
        }
        .resizer-vertical:active {
          background: var(--primary);
        }
      `}</style>
    </div>
  );
};

export default ResizablePanels;

