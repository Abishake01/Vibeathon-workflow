import { createAgentNode, createProcessingNode } from '../base/nodeFactory';
import {
  systemPromptProperty,
  messageProperty,
  operationProperty,
  modelSelectProperty,
  textProperty,
  claudeModels,
  apiKeyProperty
} from '../base/commonProperties';

export const aiNodes = {
  'ai-agent': createAgentNode({
    name: 'AI Agent',
    category: 'AI',
    color: '#8b5cf6',
    icon: 'AiOutlineRobot',
    description: 'Generates an action plan and executes it. Can use external tools.',
    properties: {
      prompt: systemPromptProperty,
      user_message: {
        type: 'textarea',
        label: 'User Message (Query)',
        default: '',
        required: false,
        placeholder: 'Enter your query or message here...',
        description: 'The user message/query to send to the AI agent. If empty, will use input from connected nodes or default message.'
      },
      api_key: {
        type: 'password',
        label: 'API Key (Optional)',
        default: '',
        required: false,
        placeholder: 'Auto-filled from connected chat model, or enter manually',
        description: 'API key for the AI model. If a chat model (like Groq Llama) is connected, its API key will be used automatically. You can also enter a key manually here.'
      }
    }
  }),

  'openai': createProcessingNode({
    name: 'OpenAI',
    category: 'AI',
    color: '#10a37f',
    icon: 'SiOpenai',
    description: 'Message an assistant or GPT, analyze images, generate audio, etc.',
    properties: {
      operation: operationProperty(['chat', 'image', 'audio', 'embeddings'], 'chat'),
      message: messageProperty(true)
    }
  }),

  'anthropic': createProcessingNode({
    name: 'Anthropic',
    category: 'AI',
    color: '#d97757',
    icon: 'BiBrain',
    description: 'Interact with Anthropic AI models (Claude)',
    properties: {
      operation: operationProperty(['message', 'complete'], 'message'),
      prompt: messageProperty(true),
      model: modelSelectProperty(claudeModels, 'claude-3-sonnet')
    }
  }),

  'google-gemini': createProcessingNode({
    name: 'Google Gemini',
    category: 'AI',
    color: '#4285f4',
    icon: 'SiGoogle',
    description: 'Interact with Google Gemini AI models',
    properties: {
      prompt: messageProperty(true),
      model: modelSelectProperty(['gemini-pro', 'gemini-pro-vision', 'gemini-ultra'], 'gemini-pro')
    }
  }),

  'text-classifier': createProcessingNode({
    name: 'Text Classifier',
    category: 'AI',
    color: '#f59e0b',
    icon: 'FiHash',
    description: 'Classify your text into distinct categories',
    properties: {
      text: messageProperty(true),
      categories: textProperty('Categories (comma separated)', true, 'positive, negative, neutral'),
      api_key: {
        type: 'password',
        label: 'API Key (OpenAI or Groq)',
        default: '',
        required: false,
        placeholder: 'sk-... or gsk_...',
        description: 'API key for text classification. Supports OpenAI (sk-...) or Groq (gsk_...) keys. If not provided, will use environment variables.'
      }
    }
  }),

  'sentiment-analysis': createProcessingNode({
    name: 'Sentiment Analysis',
    category: 'AI',
    color: '#ec4899',
    icon: 'FiTrendingUp',
    description: 'Analyze the sentiment of your text',
    properties: {
      text: messageProperty(true),
      api_key: {
        type: 'password',
        label: 'API Key (OpenAI or Groq)',
        default: '',
        required: false,
        placeholder: 'sk-... or gsk_...',
        description: 'API key for sentiment analysis. Supports OpenAI (sk-...) or Groq (gsk_...) keys. If not provided, will use environment variables.'
      }
    }
  })
};
