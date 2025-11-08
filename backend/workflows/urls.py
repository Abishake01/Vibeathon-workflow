"""
URL configuration for workflows app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from .views import (
    WorkflowViewSet, WorkflowExecutionViewSet, CredentialViewSet, 
    ExportedWorkflowViewSet, trigger_chat, trigger_webhook, test_api_key, ai_chat,
    export_workflow, get_exported_workflow, get_available_memory_types,
    test_memory_connection, get_memory_statistics,
    save_custom_widget, get_custom_widgets, delete_custom_widget,
    get_dynamic_nodes, get_dynamic_tools, get_node_execution_data,
    generate_ui_code
)
from .n8n_views import (
    run_n8n_workflow, flow_updates, workflow_status,
    workflow_updates_stream, list_workflow_runs,
    get_webhook_url, get_base_url
)
from .webhook_listener_views import (
    start_webhook_listener, pause_webhook_listener, resume_webhook_listener,
    stop_webhook_listener, delete_webhook_listener, get_webhook_listener,
    list_webhook_listeners, webhook_listener_stream
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
    # JWT token endpoints
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token-verify'),
    
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
    
    # Custom Widget endpoints
    path('custom-widgets/', get_custom_widgets, name='get-custom-widgets'),
    path('custom-widgets/save/', save_custom_widget, name='save-custom-widget'),
    path('custom-widgets/<uuid:widget_id>/', delete_custom_widget, name='delete-custom-widget'),
    
    # Dynamic Nodes and Tools endpoints
    path('dynamic-nodes/', get_dynamic_nodes, name='get-dynamic-nodes'),
    path('dynamic-tools/', get_dynamic_tools, name='get-dynamic-tools'),
    path('node-execution-data/', get_node_execution_data, name='get-node-execution-data'),
    
    # UI Code Generation endpoint
    path('generate-ui-code/', generate_ui_code, name='generate-ui-code'),
    
    # n8n Integration endpoints
    path('n8n/workflows/run/', run_n8n_workflow, name='run-n8n-workflow'),
    path('n8n/workflows/updates/', flow_updates, name='flow-updates'),
    path('n8n/workflows/<str:run_id>/status/', workflow_status, name='workflow-status'),
    path('n8n/workflows/<str:run_id>/stream/', workflow_updates_stream, name='workflow-updates-stream'),
    path('n8n/workflows/runs/', list_workflow_runs, name='list-workflow-runs'),
    
    # Webhook URL endpoints
    path('workflows/<uuid:workflow_id>/webhook-url/', get_webhook_url, name='get-webhook-url'),
    path('base-url/', get_base_url, name='get-base-url'),
    
    # Webhook trigger endpoint (must be before router URLs to avoid conflicts)
    path('workflows/<uuid:workflow_id>/webhook/<path:webhook_path>/', trigger_webhook, name='trigger-webhook'),
    
    # Webhook Listener endpoints
    path('workflows/<uuid:workflow_id>/listener/start/', start_webhook_listener, name='start-webhook-listener'),
    path('listeners/<str:listener_id>/pause/', pause_webhook_listener, name='pause-webhook-listener'),
    path('listeners/<str:listener_id>/resume/', resume_webhook_listener, name='resume-webhook-listener'),
    path('listeners/<str:listener_id>/stop/', stop_webhook_listener, name='stop-webhook-listener'),
    path('listeners/<str:listener_id>/', get_webhook_listener, name='get-webhook-listener'),
    path('listeners/<str:listener_id>/stream/', webhook_listener_stream, name='webhook-listener-stream'),  # Note: Uses function view, not @api_view
    path('listeners/', list_webhook_listeners, name='list-webhook-listeners'),
    path('listeners/<str:listener_id>/delete/', delete_webhook_listener, name='delete-webhook-listener'),
    
    # Router URLs
    path('', include(router.urls)),
]

