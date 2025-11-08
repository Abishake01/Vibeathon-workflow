import { createAgentNode, createProcessingNode } from '../base/nodeFactory';
import {
  systemPromptProperty,
  messageProperty,
  operationProperty,
  modelSelectProperty,
  textProperty,
  valueProperty,
  jsonProperty,
  claudeModels
} from '../base/commonProperties';

export const aiNodes = {
  'ai-agent': createAgentNode({
    name: 'AI Agent',
    category: 'AI',
    color: '#8b5cf6',
    icon: 'AiOutlineRobot',
    description: 'Generates an action plan and executes it. Can use external tools.',
    properties: {
      prompt: systemPromptProperty
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

  'question-answer-chain': createProcessingNode({
    name: 'Question and Answer Chain',
    category: 'AI',
    color: '#f59e0b',
    icon: 'FiMessageSquare',
    description: 'Answer questions about retrieved documents',
    properties: {
      question: textProperty('Question', true, 'What question should be answered?')
    }
  }),

  'summarization-chain': createProcessingNode({
    name: 'Summarization Chain',
    category: 'AI',
    color: '#06b6d4',
    icon: 'FiFileText',
    description: 'Transforms text into a concise summary',
    properties: {
      maxLength: valueProperty(500, 100, 2000)
    }
  }),

  'information-extractor': createProcessingNode({
    name: 'Information Extractor',
    category: 'AI',
    color: '#10b981',
    icon: 'BiData',
    description: 'Extract information from text in a structured format',
    properties: {
      schema: jsonProperty('Extraction Schema', '{\n  "fields": ["name", "email", "company"]\n}')
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
      categories: textProperty('Categories (comma separated)', true, 'positive, negative, neutral')
    }
  }),

  'sentiment-analysis': createProcessingNode({
    name: 'Sentiment Analysis',
    category: 'AI',
    color: '#ec4899',
    icon: 'FiTrendingUp',
    description: 'Analyze the sentiment of your text',
    properties: {
      text: messageProperty(true)
    }
  })
};
