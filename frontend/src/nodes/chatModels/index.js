import { createChatModelNode } from '../base/nodeFactory';
import {
  apiKeyProperty,
  temperatureProperty,
  maxTokensProperty,
  modelSelectProperty,
  testMessageProperty,
  textProperty,
  groqLlamaModels,
  groqGemmaModels
} from '../base/commonProperties';

export const chatModelNodes = {
  'gpt-4-turbo': createChatModelNode({
    name: 'GPT-4 Turbo',
    category: 'Chat Models',
    color: '#10a37f',
    icon: 'SiOpenai',
    description: 'Most capable GPT-4 model with 128k context',
    properties: {
      model: textProperty('Model', true),
      temperature: temperatureProperty
    }
  }),

  'gpt-3.5-turbo': createChatModelNode({
    name: 'GPT-3.5 Turbo',
    category: 'Chat Models',
    color: '#10a37f',
    icon: 'SiOpenai',
    description: 'Fast and efficient GPT-3.5 model',
    properties: {
      model: textProperty('Model', true),
      temperature: temperatureProperty
    }
  }),

  'claude-3-opus': createChatModelNode({
    name: 'Claude 3 Opus',
    category: 'Chat Models',
    color: '#d97757',
    icon: 'BiBrain',
    description: 'Most powerful Claude 3 model',
    properties: {
      model: textProperty('Model', true),
      temperature: temperatureProperty
    }
  }),

  'claude-3-sonnet': createChatModelNode({
    name: 'Claude 3 Sonnet',
    category: 'Chat Models',
    color: '#d97757',
    icon: 'BiBrain',
    description: 'Balanced Claude 3 model',
    properties: {
      model: textProperty('Model', true),
      temperature: temperatureProperty
    }
  }),

  'groq-llama': createChatModelNode({
    name: 'Groq Llama',
    category: 'Chat Models',
    color: '#00a8ff',
    icon: 'BiBrain',
    description: 'Fast Llama models via Groq API',
    properties: {
      api_key: apiKeyProperty('Groq', 'gsk_'),
      model: modelSelectProperty(groqLlamaModels, 'llama-3.1-8b-instant'),
      temperature: temperatureProperty,
      max_tokens: maxTokensProperty(1024),
      test_message: testMessageProperty
    }
  }),

  'groq-gemma': createChatModelNode({
    name: 'Groq Gemma',
    category: 'Chat Models',
    color: '#00a8ff',
    icon: 'BiBrain',
    description: 'Google Gemma models via Groq API',
    properties: {
      api_key: apiKeyProperty('Groq', 'gsk_'),
      model: modelSelectProperty(groqGemmaModels, 'gemma-7b-it'),
      temperature: temperatureProperty,
      max_tokens: maxTokensProperty(1024),
      test_message: testMessageProperty
    }
  })
};
