import { createToolNode } from '../base/nodeFactory';
import { valueProperty, urlProperty, httpMethodProperty, selectProperty } from '../base/commonProperties';

export const toolNodes = {
  // Only DuckDuckGo Search is actually implemented and used by AI Agent
  // calculator, web-search, and api-caller are registered but not implemented (just placeholders)
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
  })
  // Removed calculator, web-search, and api-caller - registered in backend but not actually implemented (just placeholders)
};
