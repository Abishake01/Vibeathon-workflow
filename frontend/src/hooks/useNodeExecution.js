/**
 * Node Execution Hook
 * Manages node execution state and lifecycle
 */

import { useState, useCallback } from 'react';

/**
 * Hook for managing node execution
 * @param {string} nodeId - Node ID
 * @param {Function} onExecutionComplete - Callback when execution completes
 * @returns {Object} - Execution state and control functions
 */
export const useNodeExecution = (nodeId, onExecutionComplete) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionState, setExecutionState] = useState(null);
  const [executionHistory, setExecutionHistory] = useState([]);

  const startExecution = useCallback((data = {}) => {
    setIsExecuting(true);
    setExecutionState({
      status: 'running',
      startTime: new Date(),
      output: null,
      error: null,
      ...data
    });
  }, []);

  const completeExecution = useCallback((output, error = null) => {
    const endTime = new Date();
    const duration = executionState?.startTime 
      ? endTime - executionState.startTime 
      : 0;

    const finalState = {
      ...executionState,
      status: error ? 'error' : 'completed',
      endTime,
      duration,
      output: error ? null : output,
      error
    };

    setExecutionState(finalState);
    setIsExecuting(false);

    // Add to history
    setExecutionHistory(prev => [
      {
        id: Date.now(),
        nodeId,
        timestamp: endTime,
        ...finalState
      },
      ...prev.slice(0, 49) // Keep last 50
    ]);

    if (onExecutionComplete) {
      onExecutionComplete(finalState);
    }

    return finalState;
  }, [nodeId, executionState, onExecutionComplete]);

  const resetExecution = useCallback(() => {
    setIsExecuting(false);
    setExecutionState(null);
  }, []);

  const clearHistory = useCallback(() => {
    setExecutionHistory([]);
  }, []);

  return {
    isExecuting,
    executionState,
    executionHistory,
    startExecution,
    completeExecution,
    resetExecution,
    clearHistory
  };
};

/**
 * Hook for managing multiple node executions
 * @returns {Object} - Execution manager
 */
export const useExecutionManager = () => {
  const [executingNodes, setExecutingNodes] = useState(new Set());
  const [nodeStates, setNodeStates] = useState({});

  const startNodeExecution = useCallback((nodeId) => {
    setExecutingNodes(prev => new Set([...prev, nodeId]));
    setNodeStates(prev => ({
      ...prev,
      [nodeId]: {
        status: 'running',
        startTime: Date.now()
      }
    }));
  }, []);

  const completeNodeExecution = useCallback((nodeId, result) => {
    setExecutingNodes(prev => {
      const newSet = new Set(prev);
      newSet.delete(nodeId);
      return newSet;
    });

    setNodeStates(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        status: result.error ? 'error' : 'completed',
        endTime: Date.now(),
        ...result
      }
    }));
  }, []);

  const resetAll = useCallback(() => {
    setExecutingNodes(new Set());
    setNodeStates({});
  }, []);

  return {
    executingNodes,
    nodeStates,
    startNodeExecution,
    completeNodeExecution,
    resetAll,
    isExecuting: executingNodes.size > 0
  };
};

