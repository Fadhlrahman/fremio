#!/bin/bash

echo ""
echo "🚀 ============================================"
echo "🚀 Fremio Backend - Quick Setup"
echo "🚀 ============================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Setup backend
echo "📦 Setting up backend..."
cd backend

if [ ! -f "package.json" ]; then
    echo "❌ backend/package.json not found"
    exit 1
fi

echo "   Installing dependencies..."
npm install

if [ ! -f ".env" ]; then
    echo "   Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please configure backend/.env with your Firebase credentials"
fi

if [ ! -f "serviceAccountKey.json" ]; then
    echo ""
    echo "⚠️  serviceAccountKey.json not found"
    echo "   1. Go to Firebase Console → Project Settings → Service Accounts"
    echo "   2. Click 'Generate New Private Key'"
    echo "   3. Save as backend/serviceAccountKey.json"
    echo ""
fi

cd ..

# Setup frontend
echo ""
echo "📦 Setting up frontend..."
cd my-app

if [ ! -f "package.json" ]; then
    echo "❌ my-app/package.json not found"
    exit 1
fi

# Install axios if needed
if ! grep -q "\"axios\"" package.json; then
    echo "   Installing axios..."
    npm install axios
fi

if [ ! -f ".env" ]; then
    echo "   Creating .env file..."
    if [ ! -f ".env.example" ]; then
        echo "VITE_API_URL=http://localhost:5000/api" > .env
        echo "VITE_APP_MODE=firebase" >> .env
    else
        cp .env.example .env
    fi
    echo "⚠️  Please configure my-app/.env with your Firebase credentials"
fi

cd ..

echo ""
echo "✅ ============================================"
echo "✅ Setup completed!"
echo "✅ ============================================"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Configure Firebase:"
echo "   - Download serviceAccountKey.json to backend/"
echo "   - Update backend/.env with Firebase config"
echo "   - Update my-app/.env with Firebase config"
echo ""
echo "2. Deploy Firestore rules:"
echo "   - Copy my-app/firestore.rules to Firebase Console"
echo ""
echo "3. Start servers:"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd my-app && npm run dev"
echo ""
echo "📚 Read BACKEND_IMPLEMENTATION_COMPLETE.md for full documentation"
echo ""
