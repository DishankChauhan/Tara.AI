# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Regional Language AI Tutor MVP that supports Indian regional languages including Hindi, Tamil, Bengali, Telugu, Marathi, Gujarati, Kannada, Malayalam, and English.

## Tech Stack
- **Frontend**: React with Vite, Axios for API calls, Lucide React for icons
- **Backend**: Node.js with Express, OpenAI GPT-4 for answer generation, Google Cloud Text-to-Speech for voice output
- **Languages Supported**: Hindi (hi), Tamil (ta), Bengali (bn), Telugu (te), Marathi (mr), Gujarati (gu), Kannada (kn), Malayalam (ml), English (en)

## Key Features (Phase 1 & 2 MVP)
- Text input in regional Indian languages
- Voice input with speech-to-text using OpenAI Whisper
- AI-powered answer generation using OpenAI GPT-4
- Text-to-speech output with Indian language voices
- Modern, responsive web interface
- Language selector for 9 Indian languages
- Recording controls and microphone integration

## Development Guidelines
1. Always use proper error handling for API calls
2. Maintain consistent UI/UX patterns
3. Follow responsive design principles
4. Use proper TypeScript types when adding new features
5. Keep API endpoints RESTful and well-documented
6. Handle loading states and user feedback appropriately

## Environment Variables Required
- `OPENAI_API_KEY`: OpenAI API key for GPT-4 access
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Google Cloud service account JSON file
- `PORT`: Backend server port (default: 5000)

## Future Phase Plans
- Phase 3: User authentication and Q&A history
- Phase 4: Subject-specific tutoring (Math, Physics, Chemistry)

## Code Style
- Use ES6+ features and modern React patterns
- Prefer functional components with hooks
- Use consistent naming conventions (camelCase for variables, PascalCase for components)
- Add proper error boundaries and fallback UI components
