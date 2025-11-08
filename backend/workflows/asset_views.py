"""
Views for handling UI Builder asset uploads (images, files)
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
import os
import uuid
from pathlib import Path


@api_view(['POST'])
@permission_classes([AllowAny])  # Allow unauthenticated uploads for now
def upload_asset(request):
    """Upload an asset (image, file) for UI Builder"""
    try:
        if 'file' not in request.FILES:
            return Response({
                'error': 'No file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        custom_name = request.data.get('custom_name', '')
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp']
        if file.content_type not in allowed_types:
            return Response({
                'error': f'File type not allowed. Allowed types: {", ".join(allowed_types)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate filename
        file_ext = os.path.splitext(file.name)[1].lower()
        if custom_name and custom_name.strip():
            # Use custom name but preserve extension
            # Sanitize filename
            safe_name = "".join(c for c in custom_name.strip() if c.isalnum() or c in (' ', '-', '_')).strip()
            safe_name = safe_name.replace(' ', '_')
            filename = f"{safe_name}{file_ext}"
        else:
            # Use original name or generate UUID
            original_name = os.path.splitext(file.name)[0]
            # Sanitize original name
            safe_original = "".join(c for c in original_name if c.isalnum() or c in (' ', '-', '_')).strip()
            safe_original = safe_original.replace(' ', '_')
            filename = f"{safe_original}_{uuid.uuid4().hex[:8]}{file_ext}"
        
        # Create user-specific directory (use guest if not authenticated)
        user_id = request.user.id if request.user.is_authenticated else 'guest'
        user_dir = f"ui_assets/user_{user_id}"
        filepath = os.path.join(user_dir, filename)
        
        # Save file
        saved_path = default_storage.save(filepath, ContentFile(file.read()))
        file_url = default_storage.url(saved_path)
        
        return Response({
            'success': True,
            'url': file_url,
            'filename': filename,
            'path': saved_path,
            'size': file.size,
            'content_type': file.content_type
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': f'Upload failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])  # Allow unauthenticated access
def list_assets(request):
    """List all assets for the current user"""
    try:
        user_id = request.user.id if request.user.is_authenticated else 'guest'
        user_dir = f"ui_assets/user_{user_id}"
        
        # List files in user directory
        assets = []
        if default_storage.exists(user_dir):
            files = default_storage.listdir(user_dir)[1]  # Get files (not directories)
            for filename in files:
                filepath = os.path.join(user_dir, filename)
                if default_storage.exists(filepath):
                    file_url = default_storage.url(filepath)
                    file_size = default_storage.size(filepath)
                    assets.append({
                        'filename': filename,
                        'url': file_url,
                        'path': filepath,
                        'size': file_size
                    })
        
        return Response({
            'assets': assets,
            'count': len(assets)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to list assets: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([AllowAny])  # Allow unauthenticated access
def delete_asset(request, filename):
    """Delete an asset"""
    try:
        user_id = request.user.id if request.user.is_authenticated else 'guest'
        user_dir = f"ui_assets/user_{user_id}"
        filepath = os.path.join(user_dir, filename)
        
        if not default_storage.exists(filepath):
            return Response({
                'error': 'File not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        default_storage.delete(filepath)
        
        return Response({
            'success': True,
            'message': 'Asset deleted successfully'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Delete failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

