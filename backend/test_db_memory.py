#!/usr/bin/env python
"""
Test script for Agent Flow DB Memory functionality
"""
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agent_flow_backend.settings')
django.setup()

from workflows.models import MemoryCollection, MemoryMessage
from workflows.node_executors.ai_nodes import AgentFlowDBMemory
from datetime import datetime

def test_db_memory():
    """Test database memory functionality"""
    print("=== Testing Agent Flow DB Memory ===")
    
    # Create a test collection
    collection = MemoryCollection.objects.create(
        name="test_workflow_123_node_456",
        workflow_id="test_workflow_123",
        node_id="node_456",
        window_size=5,
        description="Test memory collection"
    )
    
    print(f"Created memory collection: {collection.name}")
    
    # Create memory instance
    memory = AgentFlowDBMemory(collection, window_size=5)
    
    # Test adding messages
    print("\n--- Adding messages ---")
    memory.add_user_message("Hello, my name is Alice")
    memory.add_ai_message("Nice to meet you, Alice! How can I help you today?")
    memory.add_user_message("What's my name?")
    memory.add_ai_message("Your name is Alice.")
    
    # Test retrieving messages
    print("\n--- Retrieving messages ---")
    messages = memory.messages()
    print(f"Total messages: {len(messages)}")
    
    for i, msg in enumerate(messages):
        print(f"  {i+1}. {msg.role}: {msg.content}")
    
    # Test window size enforcement
    print("\n--- Testing window size enforcement ---")
    print("Adding more messages to test window size...")
    memory.add_user_message("Message 5")
    memory.add_ai_message("Response 5")
    memory.add_user_message("Message 6")
    memory.add_ai_message("Response 6")
    
    messages = memory.messages()
    print(f"Messages after adding more: {len(messages)}")
    print("Should be limited to 5 messages (window size)")
    
    for i, msg in enumerate(messages):
        print(f"  {i+1}. {msg.role}: {msg.content}")
    
    # Test to_string method
    print("\n--- Testing to_string method ---")
    conversation = memory.to_string()
    print("Conversation string:")
    print(conversation)
    
    # Test persistence
    print("\n--- Testing persistence ---")
    print("Creating new memory instance with same collection...")
    memory2 = AgentFlowDBMemory(collection, window_size=5)
    messages2 = memory2.messages()
    print(f"New memory instance has {len(messages2)} messages")
    print("Memory persisted in database!")
    
    # Clean up
    print("\n--- Cleaning up ---")
    memory.clear()
    collection.delete()
    print("Test completed successfully!")

if __name__ == "__main__":
    test_db_memory()
