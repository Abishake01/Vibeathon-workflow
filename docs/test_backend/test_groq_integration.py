#!/usr/bin/env python3
"""
Test script for Groq integration
Run this to verify Groq API is working correctly
"""

import os
import sys
import asyncio
import httpx

# Add the backend to Python path
sys.path.append('agent_flow_backend')

async def test_groq_api():
    """Test Groq API integration"""
    
    # Test data
    groq_api_key = "gsk_your_api_key_here"  # Replace with your actual API key
    base_url = "https://api.groq.com/openai/v1"
    
    print("🧪 Testing Groq API Integration...")
    print(f"API Key: {groq_api_key[:20]}...")
    print(f"Base URL: {base_url}")
    print()
    
    # Test 1: Direct API call
    print("Test 1: Direct Groq API call")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.1-70b-versatile",
                    "messages": [
                        {"role": "user", "content": "Hello! What is AI?"}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 100
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Direct API call successful!")
                print(f"Response: {result['choices'][0]['message']['content'][:100]}...")
            else:
                print(f"❌ API call failed: {response.status_code}")
                print(f"Error: {response.text}")
                
    except Exception as e:
        print(f"❌ Direct API call failed: {str(e)}")
    
    print()
    
    # Test 2: Backend API call
    print("Test 2: Backend API call")
    try:
        # First create a test workflow
        workflow_data = {
            "name": "Groq Test Workflow",
            "description": "Testing Groq integration",
            "nodes": [
                {
                    "id": "1",
                    "type": "manual-trigger",
                    "data": {
                        "label": "Manual Trigger",
                        "properties": {}
                    },
                    "position": {"x": 100, "y": 100}
                },
                {
                    "id": "2",
                    "type": "groq-llama",
                    "data": {
                        "label": "Groq Llama",
                        "properties": {
                            "model": "llama-3.1-70b-versatile",
                            "temperature": 0.7,
                            "max_tokens": 100
                        }
                    },
                    "position": {"x": 300, "y": 100}
                }
            ],
            "edges": [
                {
                    "id": "e1",
                    "source": "1",
                    "target": "2",
                    "sourceHandle": "main",
                    "targetHandle": "main"
                }
            ]
        }
        
        async with httpx.AsyncClient() as client:
            # Create workflow
            create_response = await client.post(
                "http://localhost:8000/api/workflows/",
                json=workflow_data
            )
            
            if create_response.status_code == 201:
                workflow = create_response.json()
                workflow_id = workflow['id']
                print(f"✅ Workflow created: {workflow_id}")
                
                # Execute workflow
                execute_response = await client.post(
                    f"http://localhost:8000/api/workflows/{workflow_id}/execute/",
                    json={
                        "trigger_data": {
                            "text": "Hello! What is AI?"
                        },
                        "credentials": {
                            "groq_api_key": groq_api_key
                        }
                    }
                )
                
                if execute_response.status_code == 200:
                    result = execute_response.json()
                    print("✅ Workflow execution successful!")
                    print(f"Execution ID: {result['execution_id']}")
                    print(f"Status: {result['execution']['status']}")
                    
                    # Check node states
                    if 'node_states' in result['execution']:
                        for node_id, state in result['execution']['node_states'].items():
                            print(f"Node {node_id}: {state['status']}")
                            if 'output' in state:
                                output = state['output']
                                if 'main' in output and 'text' in output['main']:
                                    print(f"Response: {output['main']['text'][:100]}...")
                else:
                    print(f"❌ Workflow execution failed: {execute_response.status_code}")
                    print(f"Error: {execute_response.text}")
            else:
                print(f"❌ Workflow creation failed: {create_response.status_code}")
                print(f"Error: {create_response.text}")
                
    except Exception as e:
        print(f"❌ Backend API call failed: {str(e)}")
    
    print()
    print("🎉 Groq integration test completed!")

if __name__ == "__main__":
    print("Groq Integration Test")
    print("===================")
    print()
    
    # Check if backend is running
    try:
        import httpx
        response = httpx.get("http://localhost:8000/api/workflows/", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
        else:
            print("❌ Backend is not responding correctly")
            sys.exit(1)
    except:
        print("❌ Backend is not running. Please start it with:")
        print("   cd agent_flow_backend")
        print("   python manage.py runserver")
        sys.exit(1)
    
    # Run the test
    asyncio.run(test_groq_api())
