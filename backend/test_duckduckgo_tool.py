#!/usr/bin/env python
"""
Test DuckDuckGo Search Tool
"""
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agent_flow_backend.settings')
django.setup()

from workflows.node_executors.duckduckgo_tool import create_duckduckgo_tool

def test_duckduckgo_search():
    """Test DuckDuckGo search functionality"""
    print("=== Testing DuckDuckGo Search Tool ===")
    
    # Create tool instance
    tool = create_duckduckgo_tool(max_results=3, region='us-en')
    
    # Test search
    query = "Python programming"
    print(f"Searching for: {query}")
    
    results = tool.search(query)
    
    print(f"Query: {results.get('query', 'N/A')}")
    print(f"Total results: {results.get('total_results', 0)}")
    print(f"Region: {results.get('region', 'N/A')}")
    
    if results.get('error'):
        print(f"Error: {results['error']}")
    else:
        print("\nResults:")
        for i, result in enumerate(results.get('results', []), 1):
            print(f"{i}. {result.get('title', 'No title')}")
            print(f"   {result.get('snippet', 'No snippet')}")
            print(f"   URL: {result.get('url', 'No URL')}")
            print(f"   Type: {result.get('type', 'Unknown')}")
            print()
    
    # Test tool execution
    print("=== Testing Tool Execution ===")
    formatted_output = tool.execute_tool(query)
    print("Formatted output:")
    print(formatted_output)
    
    # Test tool definition
    print("\n=== Tool Definition ===")
    tool_def = tool.get_tool_definition()
    print(f"Tool name: {tool_def['name']}")
    print(f"Description: {tool_def['description']}")
    print(f"Parameters: {tool_def['parameters']}")

if __name__ == "__main__":
    test_duckduckgo_search()
