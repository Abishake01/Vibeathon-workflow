#!/usr/bin/env python3
"""
Test script to verify API key format and validation
"""
import requests
import json

def test_api_key_format():
    """Test different API key formats"""
    
    # Test cases
    test_cases = [
        {
            "name": "Valid Groq API Key",
            "api_key": "gsk_your_api_key_here",
            "expected": True
        },
        {
            "name": "Invalid API Key (too short)",
            "api_key": "gsk_short",
            "expected": False
        },
        {
            "name": "Invalid API Key (wrong prefix)",
            "api_key": "sk-invalid_key_here",
            "expected": False
        },
        {
            "name": "Empty API Key",
            "api_key": "",
            "expected": False
        }
    ]
    
    print("🔍 Testing API Key Formats")
    print("=" * 50)
    
    for test_case in test_cases:
        print(f"\n📝 Test: {test_case['name']}")
        print(f"🔑 API Key: {test_case['api_key'][:20]}...")
        print(f"📏 Length: {len(test_case['api_key'])}")
        
        try:
            response = requests.post(
                'http://127.0.0.1:8000/api/test-api-key/',
                json={
                    'nodeType': 'groq-llama',
                    'apiKey': test_case['api_key'],
                    'testMessage': 'Hello test'
                },
                timeout=10
            )
            
            print(f"📡 Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Result: {result.get('valid', False)}")
                print(f"💬 Message: {result.get('message', 'No message')}")
                
                if result.get('valid') == test_case['expected']:
                    print("✅ Test PASSED")
                else:
                    print("❌ Test FAILED - Unexpected result")
            else:
                print(f"❌ HTTP Error: {response.status_code}")
                print(f"📄 Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 Testing Complete")

if __name__ == "__main__":
    test_api_key_format()
