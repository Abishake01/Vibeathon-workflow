#!/usr/bin/env python
"""
Check workflow structure
"""
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agent_flow_backend.settings')
django.setup()

from workflows.models import Workflow

def check_workflow():
    """Check the workflow structure"""
    try:
        workflow = Workflow.objects.get(id='23dec328-12f6-45db-9bdb-70926d68e8f2')
        print(f"Workflow: {workflow.name}")
        print(f"Description: {workflow.description}")
        
        print("\nNodes:")
        for node in workflow.nodes:
            print(f"  {node['id']}: {node['data']['type']} - {node['data'].get('label', 'No label')}")
        
        print("\nEdges:")
        for edge in workflow.edges:
            print(f"  {edge['source']} -> {edge['target']} ({edge.get('sourceHandle', 'main')} -> {edge.get('targetHandle', 'main')})")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_workflow()
