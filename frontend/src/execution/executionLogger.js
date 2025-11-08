/**
 * Execution Logger
 * Centralized logging system for node execution
 */

/**
 * Log levels
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

/**
 * Log entry structure
 */
class LogEntry {
  constructor(level, message, data = {}) {
    this.id = Date.now() + Math.random();
    this.timestamp = new Date();
    this.level = level;
    this.message = message;
    this.data = data;
  }

  toString() {
    const time = this.timestamp.toLocaleTimeString();
    const icon = this.getIcon();
    return `${icon} [${time}] ${this.message}`;
  }

  getIcon() {
    const icons = {
      debug: '🔍',
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    return icons[this.level] || 'ℹ️';
  }
}

/**
 * Execution Logger Class
 */
class ExecutionLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.listeners = new Set();
  }

  /**
   * Add a log entry
   */
  log(level, message, data = {}) {
    const entry = new LogEntry(level, message, data);
    this.logs.push(entry);

    // Keep only max logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    this.consoleLog(entry);

    // Notify listeners
    this.notifyListeners(entry);

    return entry;
  }

  consoleLog(entry) {
    const style = this.getConsoleStyle(entry.level);
    const prefix = `%c${entry.getIcon()} ${entry.level.toUpperCase()}`;
    
    if (entry.data && Object.keys(entry.data).length > 0) {
      console.log(prefix, style, entry.message, entry.data);
    } else {
      console.log(prefix, style, entry.message);
    }
  }

  getConsoleStyle(level) {
    const styles = {
      debug: 'color: #64748b',
      info: 'color: #3b82f6',
      success: 'color: #10b981',
      warning: 'color: #f59e0b',
      error: 'color: #ef4444; font-weight: bold'
    };
    return styles[level] || styles.info;
  }

  // Convenience methods
  debug(message, data) {
    return this.log(LogLevel.DEBUG, message, data);
  }

  info(message, data) {
    return this.log(LogLevel.INFO, message, data);
  }

  success(message, data) {
    return this.log(LogLevel.SUCCESS, message, data);
  }

  warning(message, data) {
    return this.log(LogLevel.WARNING, message, data);
  }

  error(message, data) {
    return this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Node-specific logging
   */
  logNodeExecution(nodeId, nodeName, status, data = {}) {
    const messages = {
      start: `Starting execution: ${nodeName} (${nodeId})`,
      running: `Executing: ${nodeName}`,
      completed: `Completed: ${nodeName}`,
      error: `Error in: ${nodeName}`
    };

    const levels = {
      start: LogLevel.INFO,
      running: LogLevel.INFO,
      completed: LogLevel.SUCCESS,
      error: LogLevel.ERROR
    };

    return this.log(
      levels[status] || LogLevel.INFO,
      messages[status] || `${nodeName}: ${status}`,
      { nodeId, nodeName, status, ...data }
    );
  }

  /**
   * Workflow-level logging
   */
  logWorkflowExecution(workflowId, status, data = {}) {
    const messages = {
      start: '🚀 Starting workflow execution',
      running: '⚙️ Workflow executing',
      completed: '✨ Workflow completed successfully',
      error: '💥 Workflow execution failed'
    };

    return this.log(
      status === 'error' ? LogLevel.ERROR : 
      status === 'completed' ? LogLevel.SUCCESS : LogLevel.INFO,
      messages[status] || `Workflow ${status}`,
      { workflowId, status, ...data }
    );
  }

  /**
   * Subscribe to log updates
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(entry) {
    this.listeners.forEach(callback => callback(entry));
  }

  /**
   * Get logs with filters
   */
  getLogs(filter = {}) {
    let filtered = [...this.logs];

    if (filter.level) {
      filtered = filtered.filter(log => log.level === filter.level);
    }

    if (filter.nodeId) {
      filtered = filtered.filter(log => log.data.nodeId === filter.nodeId);
    }

    if (filter.startTime) {
      filtered = filtered.filter(log => log.timestamp >= filter.startTime);
    }

    if (filter.endTime) {
      filtered = filtered.filter(log => log.timestamp <= filter.endTime);
    }

    return filtered;
  }

  /**
   * Clear logs
   */
  clear() {
    this.logs = [];
    this.info('Logs cleared');
  }

  /**
   * Export logs
   */
  export() {
    return {
      exportTime: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs.map(log => ({
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        message: log.message,
        data: log.data
      }))
    };
  }

  /**
   * Get execution summary
   */
  getExecutionSummary(nodeId = null) {
    const logs = nodeId 
      ? this.getLogs({ nodeId })
      : this.logs;

    const summary = {
      total: logs.length,
      byLevel: {
        debug: 0,
        info: 0,
        success: 0,
        warning: 0,
        error: 0
      },
      errors: [],
      duration: null
    };

    logs.forEach(log => {
      summary.byLevel[log.level]++;
      if (log.level === LogLevel.ERROR) {
        summary.errors.push({
          message: log.message,
          timestamp: log.timestamp,
          data: log.data
        });
      }
    });

    // Calculate duration
    if (logs.length > 1) {
      const first = logs[0].timestamp;
      const last = logs[logs.length - 1].timestamp;
      summary.duration = last - first;
    }

    return summary;
  }
}

// Singleton instance
export const executionLogger = new ExecutionLogger();

// Export for testing
export { ExecutionLogger, LogEntry };

