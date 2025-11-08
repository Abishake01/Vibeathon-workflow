@echo off
REM Backend Startup Script (Windows)

echo 🚀 Starting Workflow Backend...

REM Check if virtual environment exists
if not exist "venv\" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔌 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Check for .env file
if not exist ".env" (
    echo ⚠️  No .env file found. Creating template...
    (
        echo # Django settings
        echo SECRET_KEY=django-insecure-change-this-in-production
        echo DEBUG=True
        echo ALLOWED_HOSTS=localhost,127.0.0.1
        echo.
        echo # AI API Keys
        echo OPENAI_API_KEY=
        echo ANTHROPIC_API_KEY=
        echo GOOGLE_API_KEY=
    ) > .env
    echo 📝 Please edit .env file and add your API keys
)

REM Run migrations
echo 🗄️  Running database migrations...
python manage.py makemigrations
python manage.py migrate

REM Create superuser
echo 👤 Creating superuser...
python manage.py shell < NUL 2>&1 | findstr /C:"from django.contrib.auth import get_user_model" > NUL
if errorlevel 1 (
    echo Superuser creation skipped
)

echo.
echo ✅ Backend setup complete!
echo.
echo 🌐 Starting Django development server...
echo    Backend API: http://localhost:8000/api/
echo    Admin Panel: http://localhost:8000/admin/
echo    Username: admin
echo    Password: admin123
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start server
python manage.py runserver

pause

