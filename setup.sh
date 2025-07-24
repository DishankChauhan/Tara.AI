#!/bin/bash

echo "🚀 Setting up Regional Language AI Tutor MVP..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Create environment file
echo "⚙️ Creating environment configuration..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "📝 Created backend/.env file. Please add your API keys:"
    echo "   - OPENAI_API_KEY=your_openai_api_key"
    echo "   - GOOGLE_APPLICATION_CREDENTIALS=path_to_google_credentials.json"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add your API keys to backend/.env"
echo "2. Run 'npm run dev:full' to start both servers"
echo "3. Open http://localhost:5173 in your browser"
echo ""
echo "🔑 Required API keys:"
echo "   • OpenAI API key: https://platform.openai.com/"
echo "   • Google Cloud TTS: https://cloud.google.com/text-to-speech"
