#!/usr/bin/env python3
"""
Simple test for Groq integration
"""

import requests
import json

def test_groq_workflow():
    """Test creating and executing a Groq workflow"""
    
    print("🧪 Testing Groq Workflow Creation and Execution...")
    
    # Test workflow with Groq node
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
    
    try:
        # Create workflow
        print("1. Creating workflow...")
        create_response = requests.post(
            "http://localhost:8000/api/workflows/",
            json=workflow_data
        )
        
        if create_response.status_code == 201:
            workflow = create_response.json()
            workflow_id = workflow['id']
            print(f"✅ Workflow created: {workflow_id}")
            
            # Execute workflow
            print("2. Executing workflow...")
            execute_response = requests.post(
                f"http://localhost:8000/api/workflows/{workflow_id}/execute/",
                json={
                    "trigger_data": {
                        "text": "Hello! What is AI?"
                    },
                    "credentials": {
                        "groq_api_key": "gsk_your_api_key_here"  # Replace with your actual API key
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
        print(f"❌ Test failed: {str(e)}")

if __name__ == "__main__":
    test_groq_workflow()
