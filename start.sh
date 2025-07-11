#!/bin/bash

# dark sky zone finder startup script
echo "🌌 Starting Dark Sky Zone Finder..."

# function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# check for required tools
if ! command_exists python3; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

if ! command_exists node; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is required but not installed."
    exit 1
fi

echo "✅ All required tools found"

# setup backend
echo "🐍 Setting up Python backend..."
cd backend

# check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

# activate virtual environment
source .venv/bin/activate

# install python dependencies if needed
echo "Installing Python dependencies..."
pip install -r requirements.txt

# start backend in background
echo "🚀 Starting FastAPI backend..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# setup frontend
echo "⚛️  Setting up React frontend..."
cd ../frontend

# install node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# start frontend
echo "🚀 Starting React frontend..."
npm start &
FRONTEND_PID=$!

echo ""
echo "🌟 Dark Sky Zone Finder is starting up!"
echo ""
echo "📡 Backend API: http://localhost:8000"
echo "🌐 Frontend App: http://localhost:3000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both services"

# wait for interrupt
trap "echo ''; echo '🛑 Shutting down...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
