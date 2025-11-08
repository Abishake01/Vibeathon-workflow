"""
Django admin configuration for workflows
"""
from django.contrib import admin
from .models import Workflow, WorkflowExecution, Credential


@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    """Admin interface for Workflow model"""
    list_display = ['name', 'is_active', 'created_at', 'updated_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'description', 'is_active')
        }),
        ('Workflow Configuration', {
            'fields': ('nodes', 'edges'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(WorkflowExecution)
class WorkflowExecutionAdmin(admin.ModelAdmin):
    """Admin interface for WorkflowExecution model"""
    list_display = ['workflow', 'status', 'started_at', 'finished_at']
    list_filter = ['status', 'started_at']
    search_fields = ['workflow__name']
    readonly_fields = ['id', 'started_at', 'finished_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'workflow', 'status')
        }),
        ('Execution Data', {
            'fields': ('execution_order', 'node_states', 'errors', 'trigger_data'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('started_at', 'finished_at')
        }),
    )
    
    def has_add_permission(self, request):
        """Executions should only be created via API"""
        return False


@admin.register(Credential)
class CredentialAdmin(admin.ModelAdmin):
    """Admin interface for Credential model"""
    list_display = ['name', 'credential_type', 'created_at', 'updated_at']
    list_filter = ['credential_type', 'created_at']
    search_fields = ['name', 'credential_type']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'credential_type')
        }),
        ('Credential Data', {
            'fields': ('data',),
            'description': 'Store credential data as JSON. In production, this should be encrypted.'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
