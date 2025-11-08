#!/usr/bin/env python
"""
Test workflow execution with database memory
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

async def test_workflow_with_db_memory():
    """Test workflow execution with database memory"""
    try:
        # Get workflow
        workflow = await sync_to_async(Workflow.objects.get)(id='23dec328-12f6-45db-9bdb-70926d68e8f2')
        
        # Create execution engine
        engine = WorkflowExecutionEngine()
        
        # Test first message with database memory
        print("=== First Message with Database Memory ===")
        context1 = await engine.execute_workflow(
            workflow_id=str(workflow.id),
            execution_id="test-db-1",
            nodes=workflow.nodes,
            edges=workflow.edges,
            trigger_data={
                'message': 'Hello, my name is Sarah',
                'user': 'test_user',
                'channel': '',
                'timestamp': '',
            },
            credentials={}
        )
        
        print(f"Execution 1 Status: {context1.status}")
        print(f"Chat Response: {context1.chat_response}")
        
        # Test second message (should remember Sarah)
        print("\n=== Second Message (should remember Sarah) ===")
        context2 = await engine.execute_workflow(
            workflow_id=str(workflow.id),
            execution_id="test-db-2",
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
        
        # Check if memory persisted in database
        from workflows.models import MemoryCollection, MemoryMessage
        collections = await sync_to_async(list)(MemoryCollection.objects.all())
        print(f"\nDatabase memory collections: {len(collections)}")
        
        for collection in collections:
            messages = await sync_to_async(list)(MemoryMessage.objects.filter(collection=collection))
            print(f"Collection {collection.name}: {len(messages)} messages")
            for msg in messages:
                print(f"  {msg.role}: {msg.content[:50]}...")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_workflow_with_db_memory())
