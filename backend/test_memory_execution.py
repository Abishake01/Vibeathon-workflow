#!/usr/bin/env python
"""
Test memory execution with actual workflow
"""
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agent_flow_backend.settings')
django.setup()

from workflows.execution_engine import WorkflowExecutionEngine
from workflows.models import Workflow
import asyncio
from asgiref.sync import sync_to_async

async def test_memory_execution():
    """Test memory execution"""
    try:
        # Get workflow
        workflow = await sync_to_async(Workflow.objects.get)(id='23dec328-12f6-45db-9bdb-70926d68e8f2')
        
        # Create execution engine
        engine = WorkflowExecutionEngine()
        
        # Test first message
        print("=== First Message ===")
        context1 = await engine.execute_workflow(
            workflow_id=str(workflow.id),
            execution_id="test-1",
            nodes=workflow.nodes,
            edges=workflow.edges,
            trigger_data={
                'message': 'Hello, my name is John',
                'user': 'test_user',
                'channel': '',
                'timestamp': '',
            },
            credentials={}
        )
        
        print(f"Execution 1 Status: {context1.status}")
        print(f"Chat Response: {context1.chat_response}")
        
        # Test second message (should remember John)
        print("\n=== Second Message ===")
        context2 = await engine.execute_workflow(
            workflow_id=str(workflow.id),
            execution_id="test-2",
            nodes=workflow.nodes,
            edges=workflow.edges,
            trigger_data={
                'message': 'What is my name?',
                'user': 'test_user',
                'channel': '',
                'timestamp': '',
            },
            credentials={}
        )
        
        print(f"Execution 2 Status: {context2.status}")
        print(f"Chat Response: {context2.chat_response}")
        
        # Check global memory storage
        from workflows.execution_engine import _global_memory_storage
        print(f"\nGlobal memory storage keys: {list(_global_memory_storage.keys())}")
        
        for key, memory in _global_memory_storage.items():
            print(f"Memory {key}: {len(memory.messages())} messages")
            for i, msg in enumerate(memory.messages()):
                print(f"  {i+1}: {msg.content[:50]}...")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_memory_execution())
