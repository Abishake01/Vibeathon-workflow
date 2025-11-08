import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiKey, FiSettings, FiCpu } from 'react-icons/fi';
import { workflowApi } from '../../api/workflowApi';

const SettingsModal = ({ isOpen, onClose, showToast }) => {
  const [settings, setSettings] = useState({
    llmProvider: 'groq',
    model: 'llama-3.1-8b-instant',
    apiKey: '',
    baseUrl: 'https://api.groq.com/openai/v1'
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load settings from localStorage on component mount
  useEffect(() => {
    if (isOpen) {
      const savedSettings = localStorage.getItem('ai-chatbot-settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      }
    }
  }, [isOpen]);

  const handleProviderChange = (provider) => {
    const providerConfigs = {
      groq: {
        model: 'llama-3.1-8b-instant',
        baseUrl: 'https://api.groq.com/openai/v1'
      },
      openai: {
        model: 'gpt-3.5-turbo',
        baseUrl: 'https://api.openai.com/v1'
      },
      anthropic: {
        model: 'claude-3-sonnet-20240229',
        baseUrl: 'https://api.anthropic.com'
      },
      custom: {
        model: '',
        baseUrl: ''
      }
    };

    const config = providerConfigs[provider] || providerConfigs.groq;
    setSettings(prev => ({
      ...prev,
      llmProvider: provider,
      model: config.model,
      baseUrl: config.baseUrl
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('ai-chatbot-settings', JSON.stringify(settings));
      
      // Test the API key if provided
      if (settings.apiKey && settings.apiKey.trim()) {
        await testApiKey();
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Error saving settings. Please try again.', 'error', 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const testApiKey = async () => {
    try {
      const nodeType = settings.llmProvider === 'groq' ? 'groq-llama' : 
                       settings.llmProvider === 'openai' ? 'gpt-3.5-turbo' :
                       settings.llmProvider === 'anthropic' ? 'claude-3-sonnet' : 'custom';
      
      const response = await fetch('http://localhost:8000/api/test-api-key/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeType: nodeType,
          apiKey: settings.apiKey,
          testMessage: 'Hello, this is a test message.'
        }),
      });

      const data = await response.json();
      if (data.valid) {
        showToast('✅ API key is valid and working!', 'success', 3000);
      } else {
        showToast(`❌ API key test failed: ${data.error || 'Unknown error'}`, 'error', 5000);
      }
    } catch (error) {
      console.error('API key test failed:', error);
      showToast('❌ Could not test API key. Please check your connection.', 'error', 5000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <div className="settings-title">
            <FiSettings className="settings-icon" />
            <span>AI Chatbot Settings</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <label className="settings-label">
              <FiCpu className="label-icon" />
              LLM Provider
            </label>
            <select 
              value={settings.llmProvider} 
              onChange={(e) => handleProviderChange(e.target.value)}
              className="settings-select"
            >
              <option value="groq">Groq (Fast & Free)</option>
              <option value="openai">OpenAI (GPT Models)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="custom">Custom Provider</option>
            </select>
          </div>

          <div className="settings-section">
            <label className="settings-label">
              <FiCpu className="label-icon" />
              Model
            </label>
            <input
              type="text"
              value={settings.model}
              onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
              className="settings-input"
              placeholder="Enter model name"
            />
          </div>

          <div className="settings-section">
            <label className="settings-label">
              <FiKey className="label-icon" />
              API Key
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
              className="settings-input"
              placeholder="Enter your API key"
            />
            <button 
              className="test-btn" 
              onClick={testApiKey}
              disabled={!settings.apiKey.trim()}
            >
              Test API Key
            </button>
          </div>

          <div className="settings-section">
            <label className="settings-label">
              <FiSettings className="label-icon" />
              Base URL
            </label>
            <input
              type="url"
              value={settings.baseUrl}
              onChange={(e) => setSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
              className="settings-input"
              placeholder="Enter base URL"
            />
          </div>
        </div>

        <div className="settings-footer">
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <FiSave />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
