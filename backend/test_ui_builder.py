#!/usr/bin/env python
"""
Quick test script for UI Builder asset upload functionality
Run from backend directory: python test_ui_builder.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agent_flow_backend.settings')
django.setup()

from django.test import Client
from django.core.files.uploadedfile import SimpleUploadedFile
from workflows.asset_views import upload_asset, list_assets, delete_asset

def test_asset_upload():
    """Test asset upload without authentication"""
    print("🧪 Testing UI Builder Asset Upload...")
    print("-" * 50)
    
    # Create test client
    client = Client()
    
    # Create a fake image file
    image_content = b'fake image content'
    image_file = SimpleUploadedFile(
        "test_image.png",
        image_content,
        content_type="image/png"
    )
    
    # Test upload (should work without authentication now)
    print("\n1. Testing file upload (unauthenticated)...")
    response = client.post(
        '/api/ui-assets/upload/',
        {'file': image_file, 'custom_name': 'test_upload'},
        format='multipart'
    )
    
    if response.status_code == 201:
        print("   ✅ Upload successful!")
        data = response.json()
        print(f"   📁 File URL: {data.get('url')}")
        print(f"   📝 Filename: {data.get('filename')}")
        print(f"   📊 Size: {data.get('size')} bytes")
    else:
        print(f"   ❌ Upload failed: {response.status_code}")
        print(f"   Error: {response.json()}")
        return False
    
    # Test list assets
    print("\n2. Testing list assets (unauthenticated)...")
    response = client.get('/api/ui-assets/')
    
    if response.status_code == 200:
        print("   ✅ List successful!")
        data = response.json()
        print(f"   📂 Total assets: {data.get('count')}")
        for asset in data.get('assets', []):
            print(f"      - {asset.get('filename')}")
    else:
        print(f"   ❌ List failed: {response.status_code}")
        return False
    
    print("\n" + "=" * 50)
    print("✨ All tests passed! UI Builder asset upload is working.")
    print("=" * 50)
    return True

def check_media_directory():
    """Check if media directory exists and is writable"""
    print("\n🔍 Checking media directory setup...")
    print("-" * 50)
    
    from django.conf import settings
    
    media_root = settings.MEDIA_ROOT
    print(f"📁 MEDIA_ROOT: {media_root}")
    
    if os.path.exists(media_root):
        print("   ✅ Media directory exists")
        
        # Check if writable
        test_file = os.path.join(media_root, 'test_write.txt')
        try:
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
            print("   ✅ Media directory is writable")
        except Exception as e:
            print(f"   ❌ Media directory is not writable: {e}")
            return False
    else:
        print("   ⚠️  Media directory doesn't exist, creating...")
        try:
            os.makedirs(media_root, exist_ok=True)
            print("   ✅ Media directory created")
        except Exception as e:
            print(f"   ❌ Failed to create media directory: {e}")
            return False
    
    # Check ui_assets subdirectory
    ui_assets_dir = os.path.join(media_root, 'ui_assets', 'user_guest')
    if not os.path.exists(ui_assets_dir):
        print(f"\n📁 Creating ui_assets/user_guest directory...")
        try:
            os.makedirs(ui_assets_dir, exist_ok=True)
            print("   ✅ Directory created")
        except Exception as e:
            print(f"   ❌ Failed to create directory: {e}")
            return False
    
    return True

if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("🚀 UI Builder Backend Test Suite")
    print("=" * 50)
    
    # Check media directory setup
    if not check_media_directory():
        print("\n❌ Media directory setup failed!")
        sys.exit(1)
    
    # Run tests
    try:
        if test_asset_upload():
            print("\n✅ All tests passed! UI Builder is ready to use.")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed. Check the errors above.")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

