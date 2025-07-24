# 🎓 Regional Language AI Tutor MVP

An AI-powered educational assistant that accepts questions in Indian regional languages and provides clear, step-by-step explanations with realistic voice output.

## ✨ Features (Phase 1 & 2 MVP)

- 🗣️ **9 Language Support**: Hindi, Tamil, Bengali, Telugu, Marathi, Gujarati, Kannada, Malayalam, and English
- 🤖 **AI-Powered Answers**: Uses OpenAI GPT-4 for generating educational explanations
- 🔊 **Voice Output**: Realistic Indian accent voices using Google Text-to-Speech
- 🎤 **Voice Input**: Speech-to-text using OpenAI Whisper for hands-free interaction
- 📱 **Responsive Design**: Beautiful, modern UI that works on web and mobile
- ⚡ **Fast & Lean**: Built for MVP speed and scalability

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React + Vite | Modern web interface |
| Backend | Node.js + Express | API server |
| AI | OpenAI GPT-4 & Whisper | Answer generation & Speech-to-text |
| TTS | Google Cloud TTS | Voice synthesis |
| Styling | CSS3 + Modern Design | Beautiful UI |

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- OpenAI API key
- Google Cloud account with Text-to-Speech API enabled

### 1. Clone and Install

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
```

### 2. Environment Setup

Create `backend/.env` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_APPLICATION_CREDENTIALS=path_to_google_credentials.json
PORT=5000
NODE_ENV=development
```

### 3. Run the Application

```bash
# Terminal 1: Start backend server
cd backend
npm run dev

# Terminal 2: Start frontend (in project root)
npm run dev
```

The app will be available at `http://localhost:5173` with API at `http://localhost:5000`

## 🎯 Supported Languages

| Language | Code | Voice |
|----------|------|-------|
| हिंदी (Hindi) | `hi` | Indian Female |
| தமிழ் (Tamil) | `ta` | Indian Female |
| বাংলা (Bengali) | `bn` | Indian Female |
| తెలుగు (Telugu) | `te` | Indian Female |
| मराठी (Marathi) | `mr` | Indian Female |
| ગુજરાતી (Gujarati) | `gu` | Indian Female |
| ಕನ್ನಡ (Kannada) | `kn` | Indian Female |
| മലയാളം (Malayalam) | `ml` | Indian Female |
| English | `en` | Indian English |

## 📡 API Endpoints

### POST `/api/ask`
Ask a question in any supported language.

**Request:**
```json
{
  "question": "पाइथागोरस प्रमेय क्या है?",
  "language": "hi"
}
```

**Response:**
```json
{
  "success": true,
  "question": "पाइथागोरस प्रमेय क्या है?",
  "answer": "पाइथागोरस प्रमेय कहती है कि...",
  "language": "hi",
  "languageName": "Hindi",
  "audioUrl": "http://localhost:5000/audio/answer_123456.mp3",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST `/api/transcribe`
Convert speech to text using Whisper.

**Request:**
```javascript
// FormData with audio file
const formData = new FormData()
formData.append('audio', audioBlob, 'recording.webm')
formData.append('language', 'hi')
```

**Response:**
```json
{
  "success": true,
  "transcription": "पाइथागोरस प्रमेय क्या है?",
  "language": "hi",
  "languageName": "Hindi",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET `/api/languages`
Get list of supported languages.

### GET `/api/health`
Health check endpoint.

## 🗂️ Project Structure

```
tara/
├── src/                    # React frontend
│   ├── App.jsx            # Main application component
│   ├── App.css            # Application styles
│   ├── index.css          # Global styles
│   └── main.jsx           # React entry point
├── backend/               # Node.js backend
│   ├── server.js          # Express server
│   ├── package.json       # Backend dependencies
│   └── .env.example       # Environment template
├── public/                # Static assets
├── package.json           # Frontend dependencies
└── README.md             # This file
```

## 🔄 Development Roadmap

### ✅ Phase 1: Core MVP (Complete)
- Text input/output in 9 Indian languages
- GPT-4 powered explanations
- Google TTS voice output
- Modern responsive UI

### ✅ Phase 2: Voice Input (Complete)
- Speech-to-text using OpenAI Whisper
- Microphone integration
- Voice conversation flow
- Recording states and controls

### 📋 Phase 3: Personalization
- User authentication
- Q&A history tracking
- Personalized recommendations

### 🎯 Phase 4: Subject Intelligence
- Math, Physics, Chemistry specialization
- Grade-specific content (6-12)
- Visual aids and diagrams

## 🔧 Configuration

### Google Cloud Setup
1. Create a Google Cloud project
2. Enable Text-to-Speech API
3. Create a service account key
4. Download JSON credentials file
5. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

### OpenAI Setup
1. Get API key from OpenAI platform
2. Set `OPENAI_API_KEY` environment variable
3. Ensure you have GPT-4 access

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Check the GitHub Issues
- Review the API documentation
- Ensure all environment variables are set correctly+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
