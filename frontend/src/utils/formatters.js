/**
 * Formatter Utilities
 * Common formatting functions
 */

/**
 * Format duration in milliseconds to readable string
 */
export const formatDuration = (ms) => {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

/**
 * Format timestamp to readable time
 */
export const formatTime = (timestamp) => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format timestamp to readable date and time
 */
export const formatDateTime = (timestamp) => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Format file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Truncate string with ellipsis
 */
export const truncate = (str, maxLength = 100) => {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
};

/**
 * Format number with commas
 */
export const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format percentage
 */
export const formatPercentage = (value, total, decimals = 1) => {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
};

/**
 * Format JSON for display
 */
export const formatJson = (obj, indent = 2) => {
  try {
    return JSON.stringify(obj, null, indent);
  } catch (error) {
    return String(obj);
  }
};

/**
 * Parse and format JSON string
 */
export const prettyPrintJson = (jsonString) => {
  try {
    const obj = JSON.parse(jsonString);
    return formatJson(obj);
  } catch (error) {
    return jsonString;
  }
};

/**
 * Capitalize first letter
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert camelCase to Title Case
 */
export const camelToTitle = (str) => {
  if (!str) return '';
  const result = str.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

/**
 * Convert kebab-case to Title Case
 */
export const kebabToTitle = (str) => {
  if (!str) return '';
  return str
    .split('-')
    .map(word => capitalize(word))
    .join(' ');
};

/**
 * Get status color
 */
export const getStatusColor = (status) => {
  const colors = {
    running: '#f59e0b',
    pending: '#6b7280',
    completed: '#10b981',
    success: '#10b981',
    error: '#ef4444',
    failed: '#ef4444',
    warning: '#f59e0b',
    cancelled: '#6b7280'
  };
  return colors[status?.toLowerCase()] || colors.pending;
};

/**
 * Get status icon
 */
export const getStatusIcon = (status) => {
  const icons = {
    running: '⚙️',
    pending: '⏳',
    completed: '✅',
    success: '✅',
    error: '❌',
    failed: '❌',
    warning: '⚠️',
    cancelled: '🚫'
  };
  return icons[status?.toLowerCase()] || icons.pending;
};

/**
 * Format execution output for display
 */
export const formatExecutionOutput = (output) => {
  if (!output) return 'No output';
  
  if (typeof output === 'string') {
    return output;
  }
  
  if (output.response) {
    return output.response;
  }
  
  if (output.text) {
    return output.text;
  }
  
  if (output.main?.text) {
    return output.main.text;
  }
  
  if (output.main?.response) {
    return output.main.response;
  }
  
  // Fallback to JSON
  return formatJson(output);
};

