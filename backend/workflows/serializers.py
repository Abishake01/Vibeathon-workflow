"""
Django REST Framework serializers for workflows
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Workflow, WorkflowExecution, Credential, ExportedWorkflow, UIBuilderProject


class WorkflowSerializer(serializers.ModelSerializer):
    """Serializer for Workflow model"""
    
    class Meta:
        model = Workflow
        fields = ['id', 'name', 'description', 'nodes', 'edges', 'created_at', 'updated_at', 'is_active']
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkflowExecutionSerializer(serializers.ModelSerializer):
    """Serializer for WorkflowExecution model"""
    
    class Meta:
        model = WorkflowExecution
        fields = [
            'id', 'workflow', 'status', 'started_at', 'finished_at',
            'execution_order', 'node_states', 'errors', 'trigger_data'
        ]
        read_only_fields = ['id', 'started_at']


class CredentialSerializer(serializers.ModelSerializer):
    """Serializer for Credential model"""
    
    class Meta:
        model = Credential
        fields = ['id', 'name', 'credential_type', 'data', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ExecuteWorkflowSerializer(serializers.Serializer):
    """Serializer for workflow execution request"""
    trigger_data = serializers.JSONField(required=False, default=dict)
    start_node_id = serializers.CharField(required=False, allow_null=True)
    credentials = serializers.JSONField(required=False, default=dict)


class ExecuteNodeSerializer(serializers.Serializer):
    """Serializer for single node execution request"""
    node_id = serializers.CharField(required=True)
    trigger_data = serializers.JSONField(required=False, default=dict)
    credentials = serializers.JSONField(required=False, default=dict)


class ExportedWorkflowSerializer(serializers.ModelSerializer):
    """Serializer for ExportedWorkflow model"""
    
    class Meta:
        model = ExportedWorkflow
        fields = [
            'id', 'user', 'name', 'description', 'version', 'export_type',
            'nodes', 'edges', 'tags', 'category', 'author',
            'is_public', 'is_featured', 'created_at', 'updated_at',
            'exported_at', 'download_count', 'import_count'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'exported_at', 'download_count', 'import_count']


class ExportedWorkflowCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating exported workflows"""
    
    class Meta:
        model = ExportedWorkflow
        fields = [
            'name', 'description', 'version', 'export_type',
            'nodes', 'edges', 'tags', 'category', 'author',
            'is_public', 'is_featured'
        ]
        read_only_fields = ['user']  # User is set in the view
    
    def validate_nodes(self, value):
        """Validate nodes data"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Nodes must be a list")
        return value
    
    def validate_edges(self, value):
        """Validate edges data"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Edges must be a list")
        return value


class ExportedWorkflowListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for exported workflow lists"""
    
    class Meta:
        model = ExportedWorkflow
        fields = [
            'id', 'name', 'description', 'version', 'export_type',
            'category', 'author', 'is_public', 'is_featured',
            'exported_at', 'download_count', 'import_count'
        ]
        read_only_fields = ['id', 'exported_at', 'download_count', 'import_count']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8, required=True)
    password_confirm = serializers.CharField(write_only=True, min_length=8, required=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    username = serializers.CharField(required=True, max_length=150)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
    
    def validate_username(self, value):
        """Check if username already exists"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value
    
    def validate_email(self, value):
        """Check if email already exists (if provided)"""
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match"})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        email = validated_data.pop('email', '') or ''
        user = User.objects.create_user(
            username=validated_data['username'],
            email=email,
            password=validated_data['password'],
            first_name=validated_data.get('first_name', '') or '',
            last_name=validated_data.get('last_name', '') or ''
        )
        return user


class UIBuilderProjectSerializer(serializers.ModelSerializer):
    """Serializer for UIBuilderProject model"""
    
    class Meta:
        model = UIBuilderProject
        fields = [
            'id', 'project_name', 'description', 'components', 'styles', 
            'assets', 'created_at', 'updated_at', 'is_active'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

