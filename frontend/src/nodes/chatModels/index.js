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
  // Only Groq nodes have actual executors and can be used standalone
  // For OpenAI and Anthropic, use the 'openai' and 'anthropic' AI nodes instead
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
