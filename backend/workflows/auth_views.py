"""
Authentication views for user management
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from .serializers import UserSerializer, UserRegistrationSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    """User registration endpoint"""
    try:
        # Handle both snake_case and camelCase field names
        data = request.data.copy()
        if 'passwordConfirm' in data:
            data['password_confirm'] = data.pop('passwordConfirm')
        if 'firstName' in data:
            data['first_name'] = data.pop('firstName')
        if 'lastName' in data:
            data['last_name'] = data.pop('lastName')
        
        # Log incoming data for debugging
        print(f"📝 Signup request data: {data}")
        
        serializer = UserRegistrationSerializer(data=data)
        
        if serializer.is_valid():
            user = serializer.save()
            # Automatically log in the user after registration
            login(request, user)
            return Response({
                'user': UserSerializer(user).data,
                'message': 'User registered successfully'
            }, status=status.HTTP_201_CREATED)
        
        # Log validation errors
        print(f"❌ Validation errors: {serializer.errors}")
        
        # Format errors for better frontend handling
        error_messages = []
        for field, errors in serializer.errors.items():
            if isinstance(errors, list):
                for error in errors:
                    error_messages.append(f"{field}: {error}")
            else:
                error_messages.append(f"{field}: {errors}")
        
        return Response({
            'error': 'Validation failed',
            'errors': serializer.errors,
            'message': '; '.join(error_messages) if error_messages else 'Invalid data'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        print(f"❌ Signup exception: {str(e)}")
        return Response({
            'error': 'Registration failed',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def signin(request):
    """User login endpoint"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({
            'error': 'Username and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        login(request, user)
        return Response({
            'user': UserSerializer(user).data,
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'error': 'Invalid username or password'
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def signout(request):
    """User logout endpoint"""
    logout(request)
    return Response({
        'message': 'Logout successful'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """Get current authenticated user"""
    return Response({
        'user': UserSerializer(request.user).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def check_auth(request):
    """Check if user is authenticated and ensure CSRF cookie is set"""
    # Ensure CSRF token is available - this will set the cookie
    csrf_token = get_token(request)
    
    response_data = {
        'authenticated': False
    }
    
    if request.user.is_authenticated:
        response_data = {
            'authenticated': True,
            'user': UserSerializer(request.user).data
        }
    
    response = Response(response_data, status=status.HTTP_200_OK)
    # Set CSRF token in response header for frontend to read
    response['X-CSRFToken'] = csrf_token
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def get_csrf_token(request):
    """Get CSRF token endpoint - ensures cookie is set"""
    csrf_token = get_token(request)
    response = Response({
        'csrfToken': csrf_token
    }, status=status.HTTP_200_OK)
    response['X-CSRFToken'] = csrf_token
    return response

