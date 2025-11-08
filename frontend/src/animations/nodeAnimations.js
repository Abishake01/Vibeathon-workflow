/**
 * Node Animation System
 * Centralized animations for all workflow nodes
 */

/**
 * CSS keyframe animations
 */
export const keyframes = {
  spin: `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
  
  pulseRunning: `
    @keyframes pulse-running {
      0%, 100% { 
        border-color: #f59e0b;
        box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.2);
      }
      50% { 
        border-color: #fbbf24;
        box-shadow: 0 0 0 8px rgba(251, 191, 36, 0.3);
      }
    }
  `,
  
  pulseCompleted: `
    @keyframes pulse-completed {
      0% { 
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
      }
      100% { 
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
      }
    }
  `,
  
  pulseError: `
    @keyframes pulse-error {
      0% { 
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
      }
      100% { 
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
      }
    }
  `,
  
  slideIn: `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  
  shake: `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
  `
};

/**
 * Get CSS class for node execution state
 * @param {string} status - Execution status
 * @returns {string} - CSS class name
 */
export const getExecutionStateClass = (status) => {
  const classMap = {
    running: 'node-running',
    completed: 'node-completed',
    error: 'node-error',
    pending: 'node-pending'
  };
  return classMap[status] || '';
};

/**
 * Get animation duration based on state
 * @param {string} status - Execution status
 * @returns {number} - Duration in milliseconds
 */
export const getAnimationDuration = (status) => {
  const durations = {
    running: 1500,
    completed: 500,
    error: 600,
    default: 300
  };
  return durations[status] || durations.default;
};

/**
 * Node state styles
 */
export const nodeStateStyles = {
  running: {
    borderColor: '#f59e0b',
    boxShadow: '0 0 0 4px rgba(245, 158, 11, 0.2)',
    animation: 'pulse-running 1.5s ease-in-out infinite'
  },
  
  completed: {
    borderColor: '#10b981',
    boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.15)',
    animation: 'pulse-completed 0.5s ease'
  },
  
  error: {
    borderColor: '#ef4444',
    boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)',
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), var(--surface))',
    animation: 'pulse-error 0.5s ease'
  },
  
  invalid: {
    borderColor: '#ef4444',
    opacity: 0.9,
    animation: 'shake 0.3s ease'
  }
};

/**
 * Get inline styles for node state
 * @param {string} status - Execution status
 * @returns {Object} - Inline styles
 */
export const getNodeStateStyles = (status) => {
  return nodeStateStyles[status] || {};
};

/**
 * Handle animation class
 */
export const handleAnimations = {
  default: {
    width: '14px',
    height: '14px',
    transition: 'all 0.2s ease'
  },
  
  hover: {
    width: '18px',
    height: '18px',
    transform: 'scale(1.2)',
    boxShadow: '0 0 0 6px rgba(139, 92, 246, 0.3)'
  },
  
  connecting: {
    animation: 'pulse 1s ease-in-out infinite'
  }
};

/**
 * Export all keyframes as a single CSS string
 */
export const getAllKeyframes = () => {
  return Object.values(keyframes).join('\n');
};

/**
 * Transition configuration
 */
export const transitions = {
  fast: '0.15s ease',
  normal: '0.2s ease',
  slow: '0.3s ease',
  smooth: '0.3s cubic-bezier(0.4, 0, 0.2, 1)'
};

