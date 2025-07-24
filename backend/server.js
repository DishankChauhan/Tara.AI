const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Origin:', req.headers.origin);
  next();
});

// Error handling middleware for CORS
app.use((err, req, res, next) => {
  console.error('CORS Error:', err.message);
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'CORS not allowed for this origin' });
  } else {
    next(err);
  }
});

// Additional middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/audio', express.static(path.join(__dirname, 'public/audio')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    // Determine file extension based on original name or mime type
    let extension = '.webm'; // Default to webm for browser recordings
    
    if (file.originalname && file.originalname.includes('.')) {
      extension = path.extname(file.originalname);
    } else if (file.mimetype) {
      // Map mime types to extensions
      const mimeToExt = {
        'audio/webm': '.webm',
        'audio/wav': '.wav',
        'audio/mp3': '.mp3',
        'audio/mpeg': '.mp3',
        'audio/ogg': '.ogg',
        'audio/m4a': '.m4a',
        'application/octet-stream': '.webm' // Browser default
      };
      extension = mimeToExt[file.mimetype] || '.webm';
    }
    
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${extension}`;
    console.log(`Saving file as: ${filename} (original: ${file.originalname}, mimetype: ${file.mimetype})`);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Initialize OpenAI
let openai;
try {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ OpenAI client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize OpenAI client:', error.message);
  process.exit(1);
}

// Initialize Google Text-to-Speech client
let ttsClient;
try {
  ttsClient = new textToSpeech.TextToSpeechClient();
  console.log('✅ Google TTS client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Google TTS client:', error.message);
  console.error('Please check your Google Cloud credentials at:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
  process.exit(1);
}

// Language configurations for Indian languages
const LANGUAGE_CONFIG = {
  hi: { name: 'Hindi', voice: 'hi-IN-Wavenet-A', code: 'hi-IN' },
  ta: { name: 'Tamil', voice: 'ta-IN-Wavenet-A', code: 'ta-IN' },
  bn: { name: 'Bengali', voice: 'bn-IN-Wavenet-A', code: 'bn-IN' },
  te: { name: 'Telugu', voice: 'te-IN-Standard-A', code: 'te-IN' },
  mr: { name: 'Marathi', voice: 'mr-IN-Wavenet-A', code: 'mr-IN' },
  gu: { name: 'Gujarati', voice: 'gu-IN-Wavenet-A', code: 'gu-IN' },
  kn: { name: 'Kannada', voice: 'kn-IN-Wavenet-A', code: 'kn-IN' },
  ml: { name: 'Malayalam', voice: 'ml-IN-Wavenet-A', code: 'ml-IN' },
  en: { name: 'English', voice: 'en-IN-Wavenet-A', code: 'en-IN' }
};

// Subject configurations for specialized tutoring
const SUBJECT_CONFIG = {
  math: {
    name: 'Mathematics',
    icon: '🔢',
    prompt: 'You are an expert mathematics teacher. Explain mathematical concepts step-by-step with clear examples.',
    keywords: ['math', 'algebra', 'geometry', 'calculus', 'trigonometry', 'arithmetic', 'equation', 'formula', 'theorem', 'proof']
  },
  physics: {
    name: 'Physics',
    icon: '⚗️',
    prompt: 'You are an expert physics teacher. Explain physics concepts with real-world examples and clear diagrams.',
    keywords: ['physics', 'force', 'energy', 'motion', 'electricity', 'magnetism', 'waves', 'optics', 'thermodynamics', 'mechanics']
  },
  chemistry: {
    name: 'Chemistry',
    icon: '🧪',
    prompt: 'You are an expert chemistry teacher. Explain chemical concepts with molecular examples and reactions.',
    keywords: ['chemistry', 'element', 'compound', 'reaction', 'bond', 'molecule', 'atom', 'periodic', 'acid', 'base']
  },
  general: {
    name: 'General Studies',
    icon: '📚',
    prompt: 'You are a knowledgeable teacher. Provide clear explanations for any academic topic.',
    keywords: []
  }
};

// Grade level configurations
const GRADE_CONFIG = {
  6: { name: 'Class 6', complexity: 'basic' },
  7: { name: 'Class 7', complexity: 'basic' },
  8: { name: 'Class 8', complexity: 'intermediate' },
  9: { name: 'Class 9', complexity: 'intermediate' },
  10: { name: 'Class 10', complexity: 'advanced' },
  11: { name: 'Class 11', complexity: 'advanced' },
  12: { name: 'Class 12', complexity: 'expert' }
};

// Create audio directory if it doesn't exist
const createAudioDir = async () => {
  try {
    await fs.mkdir(path.join(__dirname, 'public/audio'), { recursive: true });
    await fs.mkdir(path.join(__dirname, 'uploads'), { recursive: true });
  } catch (error) {
    console.log('Directories already exist or error creating them:', error.message);
  }
};

// Convert speech to text using OpenAI Whisper
async function speechToText(audioFilePath, language) {
  try {
    console.log(`Processing audio file: ${audioFilePath}`);
    
    // Check if file exists
    const fileExists = await fs.access(audioFilePath).then(() => true).catch(() => false);
    if (!fileExists) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    // Get file stats
    const stats = await fs.stat(audioFilePath);
    console.log(`File size: ${stats.size} bytes`);

    const transcription = await openai.audio.transcriptions.create({
      file: require('fs').createReadStream(audioFilePath),
      model: 'whisper-1',
      language: language === 'en' ? 'en' : undefined, // Let Whisper auto-detect for Indian languages
      response_format: 'text'
    });

    console.log('Transcription successful:', transcription);

    // Clean up the uploaded file
    await fs.unlink(audioFilePath).catch(console.error);

    return transcription.trim();
  } catch (error) {
    console.error('Whisper API error:', error);
    // Clean up the uploaded file even on error
    await fs.unlink(audioFilePath).catch(console.error);
    throw new Error('Failed to transcribe audio');
  }
}

// Detect subject from question content
function detectSubject(question) {
  const lowerQuestion = question.toLowerCase();
  
  for (const [subject, config] of Object.entries(SUBJECT_CONFIG)) {
    if (subject === 'general') continue;
    
    const hasKeyword = config.keywords.some(keyword => 
      lowerQuestion.includes(keyword)
    );
    
    if (hasKeyword) {
      return subject;
    }
  }
  
  return 'general';
}

// Generate answer using OpenAI GPT
async function generateAnswer(question, language, subject = null, grade = null) {
  console.log('🤖 Starting answer generation...');
  const languageName = LANGUAGE_CONFIG[language]?.name || 'Hindi';
  
  // Auto-detect subject if not provided
  const detectedSubject = subject || detectSubject(question);
  const subjectConfig = SUBJECT_CONFIG[detectedSubject] || SUBJECT_CONFIG.general;
  
  // Get grade complexity if provided
  const gradeInfo = grade ? GRADE_CONFIG[grade] : null;
  const complexityLevel = gradeInfo?.complexity || 'intermediate';
  
  let systemPrompt = `${subjectConfig.prompt} Always respond in ${languageName} using simple, easy-to-understand language.`;
  
  if (gradeInfo) {
    systemPrompt += ` Adjust the explanation for ${gradeInfo.name} level (${complexityLevel} complexity).`;
  }
  
  const userPrompt = `You are a friendly and knowledgeable ${subjectConfig.name} teacher. A student has asked you a question in ${languageName}. 

Subject: ${subjectConfig.name} ${subjectConfig.icon}
${gradeInfo ? `Grade Level: ${gradeInfo.name}` : ''}
Language: ${languageName}

Please provide a clear, step-by-step explanation in ${languageName}. 
${complexityLevel === 'basic' ? 'Use very simple words and basic examples.' : 
  complexityLevel === 'advanced' ? 'Include detailed explanations and advanced concepts.' :
  complexityLevel === 'expert' ? 'Provide comprehensive analysis with complex examples.' :
  'Explain it clearly with appropriate examples.'}

Be encouraging and make sure the explanation is easy to understand.

Student's Question: ${question}

Please respond in ${languageName} with a helpful ${subjectConfig.name} explanation:`;

  try {
    console.log('📡 Calling OpenAI API...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: 600,
      temperature: 0.7
    });

    console.log('✅ OpenAI response received');
    return {
      answer: response.choices[0].message.content.trim(),
      subject: detectedSubject,
      subjectName: subjectConfig.name,
      grade: gradeInfo?.name || null
    };
  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    throw new Error('Failed to generate answer');
  }
}

// Convert text to speech using Google TTS
async function convertTextToSpeech(text, language) {
  console.log('🎵 Starting text-to-speech conversion...');
  const languageConfig = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.hi;
  
  const request = {
    input: { text: text },
    voice: {
      languageCode: languageConfig.code,
      name: languageConfig.voice,
      ssmlGender: 'FEMALE',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.9,
      pitch: 0.0,
    },
  };

  try {
    console.log(`🎤 Calling Google TTS for ${languageConfig.name}...`);
    const [response] = await ttsClient.synthesizeSpeech(request);
    
    // Generate unique filename
    const filename = `answer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
    const filepath = path.join(__dirname, 'public/audio', filename);
    
    console.log(`💾 Saving audio file: ${filename}`);
    // Save audio file
    await fs.writeFile(filepath, response.audioContent, 'binary');
    
    console.log('✅ Audio file saved successfully');
    return `/audio/${filename}`;
  } catch (error) {
    console.error('❌ Google TTS error:', error);
    console.error('TTS Error details:', error.message);
    throw new Error('Failed to generate audio');
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Regional Language AI Tutor API', 
    version: '1.0.0',
    supportedLanguages: Object.keys(LANGUAGE_CONFIG).map(key => ({
      code: key,
      name: LANGUAGE_CONFIG[key].name
    }))
  });
});

// Voice input endpoint - transcribe audio to text
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    // Explicitly set CORS headers
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');

    console.log('Transcribe endpoint called');
    console.log('File received:', !!req.file);
    console.log('Request body:', req.body);

    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const { language = 'hi' } = req.body;

    if (!LANGUAGE_CONFIG[language]) {
      console.log('Unsupported language:', language);
      return res.status(400).json({ error: 'Unsupported language' });
    }

    console.log(`Transcribing audio in ${LANGUAGE_CONFIG[language].name}`);
    console.log('File path:', req.file.path);
    console.log('File size:', req.file.size);

    // Convert speech to text
    const transcribedText = await speechToText(req.file.path, language);

    console.log('Transcription result:', transcribedText);

    // Clean up uploaded file
    try {
      await fs.unlink(req.file.path);
    } catch (cleanupError) {
      console.warn('Could not delete uploaded file:', cleanupError.message);
    }

    res.json({
      success: true,
      transcription: transcribedText,
      language,
      languageName: LANGUAGE_CONFIG[language].name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error transcribing audio:', error);
    console.error('Error stack:', error.stack);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Could not delete uploaded file after error:', cleanupError.message);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to transcribe audio', 
      message: error.message 
    });
  }
});

// Main API endpoint for asking questions
app.post('/api/ask', async (req, res) => {
  try {
    const { question, language = 'hi', subject = null, grade = null } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!LANGUAGE_CONFIG[language]) {
      return res.status(400).json({ error: 'Unsupported language' });
    }

    if (grade && !GRADE_CONFIG[grade]) {
      return res.status(400).json({ error: 'Unsupported grade level' });
    }

    console.log(`Processing ${subject || 'auto-detected'} question in ${LANGUAGE_CONFIG[language].name}: ${question}`);

    // Set a timeout for the entire request
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ 
          error: 'Request timeout', 
          message: 'The request took too long to process. Please try again.' 
        });
      }
    }, 45000); // 45 second timeout

    try {
      // Generate answer using OpenAI with subject intelligence
      const result = await generateAnswer(question, language, subject, grade);

      // Convert answer to speech
      const audioUrl = await convertTextToSpeech(result.answer, language);

      // Clear the timeout since we completed successfully
      clearTimeout(timeout);

      if (!res.headersSent) {
        res.json({
          success: true,
          question,
          answer: result.answer,
          language,
          languageName: LANGUAGE_CONFIG[language].name,
          subject: result.subject,
          subjectName: result.subjectName,
          grade: result.grade,
          audioUrl: `http://localhost:${PORT}${audioUrl}`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (processingError) {
      clearTimeout(timeout);
      throw processingError;
    }

  } catch (error) {
    console.error('Error processing request:', error);
    console.error('Error stack:', error.stack);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  }
});

// Get supported languages
app.get('/api/languages', (req, res) => {
  res.json({
    languages: Object.keys(LANGUAGE_CONFIG).map(key => ({
      code: key,
      name: LANGUAGE_CONFIG[key].name
    }))
  });
});

// Get supported subjects
app.get('/api/subjects', (req, res) => {
  res.json({
    subjects: Object.keys(SUBJECT_CONFIG).map(key => ({
      code: key,
      name: SUBJECT_CONFIG[key].name,
      icon: SUBJECT_CONFIG[key].icon
    }))
  });
});

// Get supported grade levels
app.get('/api/grades', (req, res) => {
  res.json({
    grades: Object.keys(GRADE_CONFIG).map(key => ({
      code: parseInt(key),
      name: GRADE_CONFIG[key].name,
      complexity: GRADE_CONFIG[key].complexity
    }))
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Stack:', reason?.stack);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    await createAudioDir();
    console.log('✅ Audio directories created/verified');
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Regional Language AI Tutor API running on port ${PORT}`);
      console.log(`📝 Supported languages: ${Object.values(LANGUAGE_CONFIG).map(l => l.name).join(', ')}`);
      console.log(`🌐 Server ready to accept requests at http://localhost:${PORT}`);
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please use a different port or kill the existing process.`);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

startServer();

module.exports = app;
