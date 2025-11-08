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
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
import secrets
from .serializers import UserSerializer, UserRegistrationSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    """User registration endpoint - returns JWT tokens"""
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
            
            # Create JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            # Automatically log in the user after registration (for session-based auth backward compatibility)
            login(request, user)
            
            return Response({
                'user': UserSerializer(user).data,
                'access': str(access_token),
                'refresh': str(refresh),
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
    """User login endpoint - returns JWT tokens"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({
            'error': 'Username and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        # Create JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        # Also login for session-based auth (backward compatibility)
        login(request, user)
        
        return Response({
            'user': UserSerializer(user).data,
            'access': str(access_token),
            'refresh': str(refresh),
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'error': 'Invalid username or password'
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([AllowAny])  # Allow logout even without valid token
def signout(request):
    """User logout endpoint - blacklists refresh token if provided"""
    try:
        # Try to get refresh token from request
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()  # Blacklist the refresh token
            except Exception as e:
                print(f"Token blacklist error (non-critical): {e}")
    except Exception as e:
        print(f"Logout token handling error (non-critical): {e}")
    
    # Also logout session if authenticated
    if request.user.is_authenticated:
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
    """Check if user is authenticated - supports both JWT and session auth"""
    response_data = {
        'authenticated': False
    }
    
    # Try JWT authentication first
    jwt_auth = JWTAuthentication()
    try:
        user, token = jwt_auth.authenticate(request)
        if user:
            request.user = user
    except Exception:
        pass  # JWT auth failed, try session auth
    
    # Check if user is authenticated (either via JWT or session)
    if request.user.is_authenticated:
        try:
            response_data = {
                'authenticated': True,
                'user': UserSerializer(request.user).data
            }
        except Exception as e:
            print(f"⚠️ User serialization error in check_auth: {str(e)}")
            response_data = {
                'authenticated': True,
                'user': {
                    'id': request.user.id,
                    'username': request.user.username,
                    'email': request.user.email or '',
                    'first_name': request.user.first_name or '',
                    'last_name': request.user.last_name or ''
                }
            }
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_csrf_token(request):
    """Get CSRF token endpoint - ensures cookie is set"""
    csrf_token = None
    try:
        # Try to get existing token first
        csrf_token = get_token(request)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"⚠️ CSRF token error in get_csrf_token: {str(e)}")
        print(f"⚠️ Traceback: {error_trace}")
        # Generate a fallback token
        csrf_token = secrets.token_urlsafe(32)
    
    # If still no token, generate one
    if not csrf_token:
        csrf_token = secrets.token_urlsafe(32)
    
    response = Response({
        'csrfToken': csrf_token
    }, status=status.HTTP_200_OK)
    
    if csrf_token:
        response['X-CSRFToken'] = csrf_token
        
        # Ensure the cookie is set in the response
        from django.conf import settings
        try:
            response.set_cookie(
                settings.CSRF_COOKIE_NAME,
                csrf_token,
                max_age=settings.CSRF_COOKIE_AGE if hasattr(settings, 'CSRF_COOKIE_AGE') else 31449600,
                domain=settings.CSRF_COOKIE_DOMAIN if hasattr(settings, 'CSRF_COOKIE_DOMAIN') else None,
                path=settings.CSRF_COOKIE_PATH if hasattr(settings, 'CSRF_COOKIE_PATH') else '/',
                secure=settings.CSRF_COOKIE_SECURE if hasattr(settings, 'CSRF_COOKIE_SECURE') else False,
                samesite=settings.CSRF_COOKIE_SAMESITE if hasattr(settings, 'CSRF_COOKIE_SAMESITE') else 'Lax',
                httponly=settings.CSRF_COOKIE_HTTPONLY if hasattr(settings, 'CSRF_COOKIE_HTTPONLY') else False
            )
        except Exception as cookie_error:
            print(f"⚠️ Failed to set CSRF cookie: {str(cookie_error)}")
    
    return response

