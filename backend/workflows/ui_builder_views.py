"""
Views for UI Builder Project management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import UIBuilderProject
from .serializers import UIBuilderProjectSerializer


class UIBuilderProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for UIBuilderProject CRUD operations"""
    queryset = UIBuilderProject.objects.all()
    serializer_class = UIBuilderProjectSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter projects by authenticated user"""
        return UIBuilderProject.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Associate project with current user"""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_projects(self, request):
        """Get all projects for current user"""
        projects = self.get_queryset()
        serializer = self.get_serializer(projects, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a project"""
        project = self.get_object()
        new_project = UIBuilderProject.objects.create(
            user=request.user,
            project_name=f"{project.project_name} (Copy)",
            description=project.description,
            components=project.components,
            styles=project.styles,
            assets=project.assets,
            is_active=project.is_active
        )
        serializer = self.get_serializer(new_project)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

