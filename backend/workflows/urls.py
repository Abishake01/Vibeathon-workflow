"""
URL configuration for workflows app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WorkflowViewSet, WorkflowExecutionViewSet, CredentialViewSet, 
    ExportedWorkflowViewSet, trigger_chat, test_api_key, ai_chat,
    export_workflow, get_exported_workflow, get_available_memory_types,
    test_memory_connection, get_memory_statistics
)
from .auth_views import signup, signin, signout, get_current_user, check_auth, get_csrf_token
from .ui_builder_views import UIBuilderProjectViewSet
from .asset_views import upload_asset, list_assets, delete_asset

router = DefaultRouter()
router.register(r'workflows', WorkflowViewSet, basename='workflow')
router.register(r'executions', WorkflowExecutionViewSet, basename='execution')
router.register(r'credentials', CredentialViewSet, basename='credential')
router.register(r'exported-workflows', ExportedWorkflowViewSet, basename='exported-workflow')
router.register(r'ui-projects', UIBuilderProjectViewSet, basename='ui-project')

urlpatterns = [
    # Authentication endpoints
    path('auth/csrf-token/', get_csrf_token, name='get-csrf-token'),
    path('auth/signup/', signup, name='signup'),
    path('auth/signin/', signin, name='signin'),
    path('auth/signout/', signout, name='signout'),
    path('auth/me/', get_current_user, name='get-current-user'),
    path('auth/check/', check_auth, name='check-auth'),
    
    # Workflow endpoints
    path('test-api-key/', test_api_key, name='test-api-key'),
    path('trigger/chat/', trigger_chat, name='trigger-chat'),
    path('ai-chat/', ai_chat, name='ai-chat'),
    path('export-workflow/', export_workflow, name='export-workflow'),
    path('exported-workflow/<uuid:workflow_id>/', get_exported_workflow, name='get-exported-workflow'),
    
    # Memory management endpoints
    path('memory/types/', get_available_memory_types, name='get-memory-types'),
    path('memory/test-connection/', test_memory_connection, name='test-memory-connection'),
    path('memory/statistics/', get_memory_statistics, name='get-memory-statistics'),
    
    # UI Builder asset endpoints
    path('ui-assets/upload/', upload_asset, name='upload-asset'),
    path('ui-assets/', list_assets, name='list-assets'),
    path('ui-assets/<str:filename>/', delete_asset, name='delete-asset'),
    
    # Router URLs
    path('', include(router.urls)),
]

