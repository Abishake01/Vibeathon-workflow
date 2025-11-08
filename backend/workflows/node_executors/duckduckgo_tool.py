"""
DuckDuckGo Search Tool Implementation
"""
import requests
from typing import Dict, Any, List
import json
from urllib.parse import quote_plus
from alith import Tool
from pydantic import BaseModel
from ddgs import DDGS


class DuckDuckGoSearchParameters(BaseModel):
    """Parameters for DuckDuckGo search tool"""
    query: str


class DuckDuckGoSearchTool:
    """DuckDuckGo search tool for AI agents"""
    
    def __init__(self, max_results: int = 5, region: str = 'us-en'):
        self.max_results = max_results
        self.region = region
        self.base_url = "https://api.duckduckgo.com/"
    
    def search(self, query: str) -> Dict[str, Any]:
        """Perform a DuckDuckGo search using DDGS library"""
        try:
            print(f"Searching for: {query}")
            print(f"Max results: {self.max_results}")
            print(f"Region: {self.region}")
            
            # Use DDGS library for better search results
            with DDGS() as ddgs:
                results = []
                search_results = ddgs.text(
                    query=query, 
                    region=self.region, 
                    max_results=self.max_results
                )
                
                for result in search_results:
                    results.append({
                        'title': result.get('title', ''),
                        'snippet': result.get('body', ''),
                        'url': result.get('href', ''),
                        'type': 'web_result'
                    })
                
                print(f"Found {len(results)} results")
                
                return {
                    'query': query,
                    'results': results,
                    'total_results': len(results),
                    'region': self.region
                }
            
        except Exception as e:
            print(f"Search error: {e}")
            return {
                'query': query,
                'error': f"Search failed: {str(e)}",
                'results': [],
                'total_results': 0
            }
    
    def get_tool_definition(self) -> Dict[str, Any]:
        """Get tool definition for AI agent"""
        return {
            'name': 'duckduckgo_search',
            'description': 'Search the web using DuckDuckGo for privacy-focused search results',
            'parameters': {
                'type': 'object',
                'properties': {
                    'query': {
                        'type': 'string',
                        'description': 'The search query to look up'
                    }
                },
                'required': ['query']
            }
        }
    
    def execute_tool(self, query: str) -> str:
        """Execute the search tool and return formatted results"""
        results = self.search(query)
        
        if results.get('error'):
            return f"Search error: {results['error']}"
        
        if not results.get('results'):
            return f"No results found for query: {query}"
        
        # Format results for AI consumption
        formatted_results = []
        for i, result in enumerate(results['results'], 1):
            formatted_results.append(
                f"{i}. **{result['title']}**\n"
                f"   {result['snippet']}\n"
                f"   URL: {result['url']}\n"
            )
        
        return f"Search results for '{query}':\n\n" + "\n".join(formatted_results)


def create_duckduckgo_tool(max_results: int = 5, region: str = 'us-en') -> Tool:
    """Create a DuckDuckGo search tool instance"""
    # Create the search tool instance
    search_tool = DuckDuckGoSearchTool(max_results=max_results, region=region)
    
    # Create Alith Tool with proper handler
    def search_handler(query: str) -> str:
        """Handler function for the search tool"""
        return search_tool.execute_tool(query)
    
    # Create and return Alith Tool
    return Tool(
        name="duckduckgo_search",
        description="Search the web using DuckDuckGo for privacy-focused search results",
        parameters=DuckDuckGoSearchParameters,
        handler=search_handler,
        version="1.0.0",
        author="Agent Flow"
    )

def create_brave_search_tool(max_results: int = 5, region: str = 'us-en') -> Tool:
    """Create a Brave search tool instance (alias for DuckDuckGo)"""
    # This is actually the same as DuckDuckGo tool but with different name
    return create_duckduckgo_tool(max_results=max_results, region=region)