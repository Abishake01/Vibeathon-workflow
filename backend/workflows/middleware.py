"""
Custom middleware to exempt API views from CSRF protection when using JWT
"""
from django.utils.deprecation import MiddlewareMixin


class CSRFExemptAPIMiddleware(MiddlewareMixin):
    """
    Middleware to exempt API endpoints from CSRF protection
    JWT authentication handles security for API endpoints
    This must be placed BEFORE CsrfViewMiddleware in MIDDLEWARE list
    """
    
    def process_request(self, request):
        # Check if this is an API request
        if request.path.startswith('/api/'):
            # Set a flag to exempt from CSRF
            # This flag is checked by Django's CSRF middleware
            setattr(request, '_dont_enforce_csrf_checks', True)
            print(f"🔓 CSRF exemption applied for API endpoint: {request.path}")
        return None

