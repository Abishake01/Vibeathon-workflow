/**
 * Local Storage Hook
 * Handles persistent storage for node properties
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing localStorage with React state
 * @param {string} key - Storage key
 * @param {any} initialValue - Default value if nothing in storage
 * @returns {[any, Function, Function]} - [value, setValue, removeValue]
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      console.log(`💾 Saved to localStorage: ${key}`);
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
      console.log(`🗑️ Removed from localStorage: ${key}`);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};

/**
 * Hook specifically for node properties
 * @param {string} nodeId - Node ID
 * @returns {Object} - { properties, updateProperty, updateProperties, clearProperties }
 */
export const useNodeProperties = (nodeId) => {
  const key = `inputValues_${nodeId}`;
  const [properties, setProperties, clearProperties] = useLocalStorage(key, {});

  const updateProperty = useCallback((propKey, value) => {
    setProperties(prev => ({ ...prev, [propKey]: value }));
  }, [setProperties]);

  const updateProperties = useCallback((newProperties) => {
    setProperties(prev => ({ ...prev, ...newProperties }));
  }, [setProperties]);

  return {
    properties,
    updateProperty,
    updateProperties,
    clearProperties
  };
};

