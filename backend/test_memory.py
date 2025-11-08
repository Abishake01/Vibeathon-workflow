#!/usr/bin/env python
"""
Test script to debug memory functionality
"""
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agent_flow_backend.settings')
django.setup()

from alith import WindowBufferMemory, Agent
from workflows.models import Workflow

def test_memory_basic():
    """Test basic memory functionality"""
    print("Testing basic WindowBufferMemory...")
    
    # Create memory
    memory = WindowBufferMemory(window_size=5)
    print(f"Created memory with window_size: 5")
    
    # Add some messages
    memory.add_user_message("Hello, my name is John")
    memory.add_ai_message("Nice to meet you, John! How can I help you today?")
    
    messages = memory.messages()
    print(f"Memory has {len(messages)} messages")
    for i, msg in enumerate(messages):
        print(f"  Message {i+1}: {msg.content[:50]}...")
    
    # Test conversation string
    conversation = memory.to_string()
    print(f"Conversation string: {conversation[:100]}...")
    
    return memory

def test_memory_persistence():
    """Test memory persistence"""
    print("\nTesting memory persistence...")
    
    # Simulate first conversation
    memory1 = WindowBufferMemory(window_size=3)
    memory1.add_user_message("My name is Alice")
    memory1.add_ai_message("Hello Alice!")
    
    print(f"First conversation - Messages: {len(memory1.messages())}")
    
    # Simulate second conversation (should remember Alice)
    memory2 = WindowBufferMemory(window_size=3)
    # In real scenario, this would be loaded from persistent storage
    memory2.add_user_message("My name is Alice")
    memory2.add_ai_message("Hello Alice!")
    memory2.add_user_message("What's my name?")
    
    print(f"Second conversation - Messages: {len(memory2.messages())}")
    print(f"Latest conversation: {memory2.to_string()}")
    
    return memory2

def test_agent_with_memory():
    """Test Agent with memory"""
    print("\nTesting Agent with memory...")
    
    try:
        # Create memory
        memory = WindowBufferMemory(window_size=3)
        memory.add_user_message("My name is Bob")
        memory.add_ai_message("Nice to meet you, Bob!")
        
        # Create agent with memory
        agent = Agent(
            name="TestAgent",
            model="gpt-4-turbo",
            api_key=os.getenv('OPENAI_API_KEY', 'test-key'),
            memory=memory
        )
        
        print("Agent created with memory")
        print(f"Memory before prompt: {len(memory.messages())} messages")
        
        # This would normally call agent.prompt("What's my name?")
        # but we'll just test the memory part
        print("Memory test completed successfully")
        
    except Exception as e:
        print(f"Agent test failed: {e}")

if __name__ == "__main__":
    print("=== Memory System Test ===")
    
    # Test 1: Basic memory
    memory1 = test_memory_basic()
    
    # Test 2: Memory persistence simulation
    memory2 = test_memory_persistence()
    
    # Test 3: Agent with memory
    test_agent_with_memory()
    
    print("\n=== Test Complete ===")
