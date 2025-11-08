#!/usr/bin/env python3
"""
Webhook Testing Script
Tests workflow webhook endpoints and displays real-time output
"""

import requests
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_header(text: str):
    """Print formatted header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text:^60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")


def print_success(text: str):
    """Print success message"""
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")


def print_error(text: str):
    """Print error message"""
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")


def print_info(text: str):
    """Print info message"""
    print(f"{Colors.OKCYAN}ℹ {text}{Colors.ENDC}")


def print_warning(text: str):
    """Print warning message"""
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")


def format_json(data: Any, indent: int = 2) -> str:
    """Format JSON data for display"""
    return json.dumps(data, indent=indent, ensure_ascii=False)


def test_webhook(
    base_url: str,
    workflow_id: str,
    webhook_path: str,
    method: str = 'POST',
    data: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    query_params: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Test webhook endpoint
    
    Args:
        base_url: Base URL of the backend (e.g., http://localhost:8000)
        workflow_id: UUID of the workflow
        webhook_path: Webhook path (e.g., /hello)
        method: HTTP method (GET, POST, PUT, PATCH, DELETE)
        data: Request body data (for POST/PUT/PATCH)
        headers: Custom headers
        query_params: Query parameters (for GET)
    
    Returns:
        Response data as dictionary
    """
    # Check if base_url is actually a full webhook URL
    if '/api/workflows/' in base_url and '/webhook/' in base_url:
        # User provided full webhook URL, use it directly
        url = base_url.rstrip('/')
        if not url.endswith('/'):
            url += '/'
        print_warning("Detected full webhook URL. Using it directly.")
        print_info(f"Using URL: {url}")
    else:
        # Construct URL from components
        clean_path = webhook_path.lstrip('/')
        if not clean_path:
            clean_path = 'webhook'  # Default path
        base = base_url.rstrip('/')
        url = f"{base}/api/workflows/{workflow_id}/webhook/{clean_path}/"
    
    # Default headers
    if headers is None:
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    
    # Default data
    if data is None:
        data = {
            'name': 'Test User',
            'message': 'Hello from webhook test script!',
            'timestamp': datetime.now().isoformat()
        }
    
    print_header(f"Testing Webhook Endpoint")
    print_info(f"URL: {url}")
    print_info(f"Method: {method}")
    print_info(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if data:
        print(f"\n{Colors.OKBLUE}Request Body:{Colors.ENDC}")
        print(format_json(data))
    
    if query_params:
        print(f"\n{Colors.OKBLUE}Query Parameters:{Colors.ENDC}")
        print(format_json(query_params))
    
    if headers:
        print(f"\n{Colors.OKBLUE}Headers:{Colors.ENDC}")
        print(format_json(headers))
    
    print(f"\n{Colors.BOLD}Sending request...{Colors.ENDC}\n")
    
    try:
        start_time = time.time()
        
        # Make request based on method
        if method.upper() == 'GET':
            response = requests.get(url, params=query_params, headers=headers, timeout=30)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, headers=headers, params=query_params, timeout=30)
        elif method.upper() == 'PUT':
            response = requests.put(url, json=data, headers=headers, params=query_params, timeout=30)
        elif method.upper() == 'PATCH':
            response = requests.patch(url, json=data, headers=headers, params=query_params, timeout=30)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, headers=headers, params=query_params, timeout=30)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        elapsed_time = time.time() - start_time
        
        # Parse response
        try:
            response_data = response.json()
        except:
            response_data = {'raw_response': response.text}
        
        # Display results
        print_header("Response Received")
        print_success(f"Status Code: {response.status_code}")
        print_info(f"Response Time: {elapsed_time:.3f}s")
        print_info(f"Content-Type: {response.headers.get('Content-Type', 'N/A')}")
        
        print(f"\n{Colors.OKGREEN}{Colors.BOLD}Response Data:{Colors.ENDC}")
        print(format_json(response_data))
        
        # Extract workflow execution details
        if 'execution' in response_data:
            execution = response_data['execution']
            print(f"\n{Colors.OKCYAN}{Colors.BOLD}Execution Details:{Colors.ENDC}")
            print(f"  Execution ID: {execution.get('execution_id', 'N/A')}")
            print(f"  Status: {execution.get('status', 'N/A')}")
            print(f"  Duration: {execution.get('duration', 0):.3f}s")
            
            if execution.get('node_states'):
                print(f"\n{Colors.OKCYAN}Node States:{Colors.ENDC}")
                for node_id, node_state in execution['node_states'].items():
                    status = node_state.get('status', 'unknown')
                    status_color = Colors.OKGREEN if status == 'completed' else Colors.FAIL if status == 'error' else Colors.WARNING
                    print(f"  {node_id}: {status_color}{status}{Colors.ENDC}")
                    if 'error' in node_state:
                        print(f"    Error: {Colors.FAIL}{node_state['error']}{Colors.ENDC}")
        
        if 'data' in response_data:
            print(f"\n{Colors.OKGREEN}{Colors.BOLD}Workflow Output Data:{Colors.ENDC}")
            print(format_json(response_data['data']))
        
        if response.status_code >= 400:
            print_error(f"Request failed with status {response.status_code}")
            if 'error' in response_data:
                print_error(f"Error: {response_data['error']}")
        
        return {
            'success': response.status_code < 400,
            'status_code': response.status_code,
            'data': response_data,
            'elapsed_time': elapsed_time
        }
        
    except requests.exceptions.Timeout:
        print_error("Request timed out after 30 seconds")
        return {'success': False, 'error': 'Timeout'}
    
    except requests.exceptions.ConnectionError:
        print_error(f"Could not connect to {base_url}")
        print_info("Make sure the server is running!")
        return {'success': False, 'error': 'ConnectionError'}
    
    except Exception as e:
        print_error(f"Error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return {'success': False, 'error': str(e)}


def interactive_mode():
    """Run in interactive mode"""
    print_header("Webhook Testing Tool - Interactive Mode")
    print_info("You can either:")
    print_info("  1. Enter base URL (e.g., http://localhost:8000) and provide workflow ID + path separately")
    print_info("  2. Paste the full webhook URL (e.g., http://localhost:8000/api/workflows/{id}/webhook/{path}/)")
    print()
    
    # Get configuration
    base_url_input = input(f"{Colors.OKCYAN}Enter base URL or full webhook URL (default: http://localhost:8000): {Colors.ENDC}").strip()
    if not base_url_input:
        base_url_input = "http://localhost:8000"
    
    # Check if user provided full webhook URL
    workflow_id = None
    webhook_path = None
    
    if '/api/workflows/' in base_url_input and '/webhook/' in base_url_input:
        # Extract workflow ID and path from full URL
        import re
        match = re.search(r'/api/workflows/([^/]+)/webhook/([^/]+)', base_url_input)
        if match:
            workflow_id = match.group(1)
            webhook_path = '/' + match.group(2)
            base_url = base_url_input
            print_success(f"Detected workflow ID: {workflow_id}")
            print_success(f"Detected webhook path: {webhook_path}")
        else:
            print_warning("Could not parse full URL. Please provide components separately.")
            base_url = base_url_input
    else:
        base_url = base_url_input
        workflow_id = input(f"{Colors.OKCYAN}Enter workflow ID (UUID): {Colors.ENDC}").strip()
        if not workflow_id:
            print_error("Workflow ID is required!")
            return
        
        webhook_path = input(f"{Colors.OKCYAN}Enter webhook path (e.g., /hello, default: /webhook): {Colors.ENDC}").strip()
        if not webhook_path:
            webhook_path = "/webhook"
    
    method = input(f"{Colors.OKCYAN}Enter HTTP method (default: POST): {Colors.ENDC}").strip().upper()
    if not method:
        method = "POST"
    
    # Get custom data
    use_custom_data = input(f"{Colors.OKCYAN}Use custom request data? (y/n, default: n): {Colors.ENDC}").strip().lower()
    data = None
    if use_custom_data == 'y':
        data_input = input(f"{Colors.OKCYAN}Enter JSON data (or press Enter for default): {Colors.ENDC}").strip()
        if data_input:
            try:
                data = json.loads(data_input)
            except json.JSONDecodeError:
                print_error("Invalid JSON! Using default data.")
                data = None
    
    # Test webhook
    result = test_webhook(
        base_url=base_url,
        workflow_id=workflow_id or '',  # May be None if extracted from URL
        webhook_path=webhook_path or '/webhook',
        method=method,
        data=data
    )
    
    # Ask if user wants to test again
    if result.get('success'):
        print_success("Test completed successfully!")
    else:
        print_error("Test failed!")
    
    return result


def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        # Command line mode
        import argparse
        
        parser = argparse.ArgumentParser(description='Test workflow webhook endpoints')
        parser.add_argument('--url', default='http://localhost:8000', help='Base URL of the backend OR full webhook URL')
        parser.add_argument('--workflow-id', help='Workflow UUID (not needed if --url is a full webhook URL)')
        parser.add_argument('--path', default='/hello', help='Webhook path (not needed if --url is a full webhook URL)')
        parser.add_argument('--method', default='POST', choices=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], help='HTTP method')
        parser.add_argument('--data', help='JSON data as string')
        parser.add_argument('--file', help='JSON file containing request data')
        parser.add_argument('--interactive', '-i', action='store_true', help='Run in interactive mode')
        
        args = parser.parse_args()
        
        if args.interactive:
            interactive_mode()
            return
        
        # Check if full webhook URL was provided
        workflow_id = args.workflow_id
        webhook_path = args.path
        
        if '/api/workflows/' in args.url and '/webhook/' in args.url:
            # Full URL provided, extract components if needed
            import re
            match = re.search(r'/api/workflows/([^/]+)/webhook/([^/]+)', args.url)
            if match:
                if not workflow_id:
                    workflow_id = match.group(1)
                if not webhook_path or webhook_path == '/hello':
                    webhook_path = '/' + match.group(2)
        elif not workflow_id:
            print_error("--workflow-id is required when --url is not a full webhook URL")
            return
        
        # Parse data
        data = None
        if args.file:
            with open(args.file, 'r') as f:
                data = json.load(f)
        elif args.data:
            try:
                data = json.loads(args.data)
            except json.JSONDecodeError:
                print_error("Invalid JSON in --data argument")
                return
        
        result = test_webhook(
            base_url=args.url,
            workflow_id=workflow_id or '',
            webhook_path=webhook_path,
            method=args.method,
            data=data
        )
        
        sys.exit(0 if result.get('success') else 1)
    else:
        # Interactive mode by default
        interactive_mode()


if __name__ == '__main__':
    main()

