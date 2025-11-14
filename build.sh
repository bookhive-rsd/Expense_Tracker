#!/bin/bash

# Build script for Render deployment

echo "🚀 Starting build process..."

# Build Backend
echo "📦 Installing backend dependencies..."
cd backend
pip install -r requirements.txt

# Build Frontend
echo "📦 Building frontend..."
cd ../frontend
npm install
npm run build

echo "✅ Build complete!"
