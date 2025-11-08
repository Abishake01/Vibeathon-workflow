#!/usr/bin/env python3
"""
Debug test for Groq integration
"""

import requests
import json

def test_groq_debug():
    """Test Groq with detailed error reporting"""
    
    print("🧪 Testing Groq Integration (Debug Mode)...")
    
    # Simple workflow
    workflow_data = {
        "name": "Groq Debug Test",
        "description": "Debug Groq integration",
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
                        "max_tokens": 50
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
                        "text": "Hello!"
                    },
                    "credentials": {
                        "groq_api_key": "gsk_your_api_key_here"  # Replace with your actual API key
                    }
                }
            )
            
            print(f"Response Status: {execute_response.status_code}")
            print(f"Response Content: {execute_response.text}")
            
            if execute_response.status_code == 200:
                result = execute_response.json()
                print("✅ Workflow execution successful!")
                print(f"Execution ID: {result['execution_id']}")
                print(f"Status: {result['execution']['status']}")
                
                # Print detailed execution info
                execution = result['execution']
                print(f"Execution details: {json.dumps(execution, indent=2)}")
                
            else:
                print(f"❌ Workflow execution failed: {execute_response.status_code}")
                print(f"Error: {execute_response.text}")
        else:
            print(f"❌ Workflow creation failed: {create_response.status_code}")
            print(f"Error: {create_response.text}")
            
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")

if __name__ == "__main__":
    test_groq_debug()
