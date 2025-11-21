@echo off
setlocal

echo.
echo ============================================
echo Fremio Backend - Quick Setup
echo ============================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not installed. Please install Node.js first.
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%
echo.

REM Setup backend
echo Setting up backend...
cd backend

if not exist "package.json" (
    echo ERROR: backend/package.json not found
    exit /b 1
)

echo    Installing dependencies...
call npm install

if not exist ".env" (
    echo    Creating .env file...
    copy .env.example .env
    echo WARNING: Please configure backend/.env with your Firebase credentials
)

if not exist "serviceAccountKey.json" (
    echo.
    echo WARNING: serviceAccountKey.json not found
    echo    1. Go to Firebase Console - Project Settings - Service Accounts
    echo    2. Click 'Generate New Private Key'
    echo    3. Save as backend/serviceAccountKey.json
    echo.
)

cd ..

REM Setup frontend
echo.
echo Setting up frontend...
cd my-app

if not exist "package.json" (
    echo ERROR: my-app/package.json not found
    exit /b 1
)

REM Check if axios is installed
findstr /C:"\"axios\"" package.json >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo    Installing axios...
    call npm install axios
)

if not exist ".env" (
    echo    Creating .env file...
    if exist ".env.example" (
        copy .env.example .env
    ) else (
        echo VITE_API_URL=http://localhost:5000/api > .env
        echo VITE_APP_MODE=firebase >> .env
    )
    echo WARNING: Please configure my-app/.env with your Firebase credentials
)

cd ..

echo.
echo ============================================
echo Setup completed!
echo ============================================
echo.
echo Next steps:
echo.
echo 1. Configure Firebase:
echo    - Download serviceAccountKey.json to backend/
echo    - Update backend/.env with Firebase config
echo    - Update my-app/.env with Firebase config
echo.
echo 2. Deploy Firestore rules:
echo    - Copy my-app/firestore.rules to Firebase Console
echo.
echo 3. Start servers:
echo    Terminal 1: cd backend ^&^& npm run dev
echo    Terminal 2: cd my-app ^&^& npm run dev
echo.
echo Read BACKEND_IMPLEMENTATION_COMPLETE.md for full documentation
echo.

pause
