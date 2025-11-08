import { createToolNode } from '../base/nodeFactory';
import { valueProperty, urlProperty, httpMethodProperty, selectProperty } from '../base/commonProperties';

export const toolNodes = {
  'calculator': createToolNode({
    name: 'Calculator',
    category: 'Tools',
    color: '#10b981',
    icon: 'FiHash',
    description: 'Perform mathematical calculations',
    properties: {
      precision: valueProperty(2, 0, 10)
    }
  }),

  'web-search': createToolNode({
    name: 'Web Search',
    category: 'Tools',
    color: '#10b981',
    icon: 'FiSearch',
    description: 'Search the web for real-time information',
    properties: {
      maxResults: valueProperty(5, 1, 20)
    }
  }),

  'duckduckgo-search': createToolNode({
    name: 'DuckDuckGo Search',
    category: 'Tools',
    color: '#ff6b35',
    icon: 'FiSearch',
    description: 'Search using DuckDuckGo for privacy-focused web search',
    properties: {
      maxResults: valueProperty(5, 1, 20, 'Max Results', 'Maximum number of search results to return'),
      region: selectProperty('Region', 'us-en', [
        { value: 'us-en', label: 'United States (English)' },
        { value: 'uk-en', label: 'United Kingdom (English)' },
        { value: 'ca-en', label: 'Canada (English)' },
        { value: 'au-en', label: 'Australia (English)' },
        { value: 'de-de', label: 'Germany (German)' },
        { value: 'fr-fr', label: 'France (French)' },
        { value: 'es-es', label: 'Spain (Spanish)' },
        { value: 'it-it', label: 'Italy (Italian)' },
        { value: 'pt-br', label: 'Brazil (Portuguese)' },
        { value: 'ru-ru', label: 'Russia (Russian)' },
        { value: 'ja-jp', label: 'Japan (Japanese)' },
        { value: 'ko-kr', label: 'South Korea (Korean)' },
        { value: 'zh-cn', label: 'China (Chinese)' },
        { value: 'in-en', label: 'India (English)' }
      ])
    }
  }),

  'api-caller': createToolNode({
    name: 'API Caller',
    category: 'Tools',
    color: '#10b981',
    icon: 'FiGlobe',
    description: 'Make API calls to external services',
    properties: {
      url: urlProperty(true),
      method: httpMethodProperty('GET')
    }
  })
};
