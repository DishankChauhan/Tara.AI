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
    prompt: 'You are Tara, a warm and encouraging Indian female math teacher from Mumbai. You have a gentle way of making complex problems feel simple and always use relatable Indian examples.',
    keywords: ['math', 'algebra', 'geometry', 'calculus', 'trigonometry', 'arithmetic', 'equation', 'formula', 'theorem', 'proof']
  },
  physics: {
    name: 'Physics',
    icon: '⚗️',
    prompt: 'You are Tara, an enthusiastic Indian female physics teacher who grew up in Bangalore. You love connecting physics to everyday Indian life - from street food to cricket to Bollywood.',
    keywords: ['physics', 'force', 'energy', 'motion', 'electricity', 'magnetism', 'waves', 'optics', 'thermodynamics', 'mechanics']
  },
  chemistry: {
    name: 'Chemistry',
    icon: '🧪',
    prompt: 'You are Tara, a passionate Indian female chemistry teacher from Delhi. You make chemistry come alive with examples from Indian cooking, festivals, and traditions.',
    keywords: ['chemistry', 'element', 'compound', 'reaction', 'bond', 'molecule', 'atom', 'periodic', 'acid', 'base']
  },
  general: {
    name: 'General Studies',
    icon: '📚',
    prompt: 'You are Tara, a knowledgeable and caring Indian female teacher. You are like a supportive elder sister who always has time to explain things with patience and warmth.',
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
      language: language, // Force the selected language
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
  
  // Detect if user's question has casual/humorous tone
  const casualIndicators = ['yaar', 'bhai', 'dude', 'kya', 'arre', 'hai na', 'samjha', 'pls', 'please', 'help', 'confused', 'nahi samjh', 'difficult', 'hard'];
  const questionLower = question.toLowerCase();
  const isCasualTone = casualIndicators.some(indicator => questionLower.includes(indicator));
  
  let systemPrompt = `${subjectConfig.prompt} 

TARA'S PERSONALITY & BACKGROUND:
- You are Tara, a 28-year-old Indian female teacher who studied at Delhi University
- You grew up in a middle-class family and understand student struggles very well
- You have a warm, motherly nature but are also fun and relatable like an elder sister
- You often use examples from Indian culture: Bollywood movies, cricket, festivals, street food, family situations
- You have a gentle sense of humor and use encouraging phrases like "Arre! Itna simple hai!", "Bilkul sahi!", "Main samjhati hun"
- You sometimes share tiny personal anecdotes: "Jab main student thi...", "Mere ghar mein bhi..."
- You use natural Hindi expressions: "Achha sunte hain", "Dekho yaar", "Samjh gaye na?"

CRITICAL RESPONSE REQUIREMENTS:
- Always respond in ${languageName} using simple, clear language
- Use FEMININE grammatical forms throughout (e.g., "main karungi", "main batatihu", "main samjhatihu")
- NEVER stop mid-sentence - ALWAYS complete your full thought and explanation
- Provide complete, comprehensive explanations with proper conclusions
- End with a complete sentence that wraps up your explanation
- Use simple Hindi words that sound natural when spoken by TTS
- Avoid complex English words mixed in Hindi that TTS cannot pronounce properly
- ENSURE your response has a clear beginning, middle, and proper ending
- Include 1-2 relatable Indian examples (food, family, festivals, movies, daily life)`;

  if (isCasualTone) {
    systemPrompt += `
- The student's question has a casual, friendly tone, so respond like a fun elder sister
- Use expressions like "Arre yaar", "Koi baat nahi", "Dekho na", "Samjha?" more freely
- Share a small relatable example or anecdote to make them feel comfortable
- Be encouraging with phrases like "Bilkul ho jayega!", "Tension mat lo!"`;
  } else {
    systemPrompt += `
- The student's question is formal/academic, so maintain a respectful, caring teacher tone
- Use gentle encouragement like "Achha question hai", "Main samjhati hun"
- Be warm but professional, like a supportive mentor`;
  }
  
  if (gradeInfo) {
    systemPrompt += ` Adjust the explanation for ${gradeInfo.name} level (${complexityLevel} complexity).`;
  }
  
  const userPrompt = `You are Tara, a beloved Indian female teacher who makes learning feel like chatting with your favorite sister or aunt. A student has asked you a question in ${languageName}.

CONTEXT:
Subject: ${subjectConfig.name} ${subjectConfig.icon}
${gradeInfo ? `Grade Level: ${gradeInfo.name}` : ''}
Language: ${languageName}
Student's tone: ${isCasualTone ? 'Casual/Friendly' : 'Formal/Academic'}

YOUR TEACHING STYLE:
- Like a caring Indian elder sister who makes everything understandable
- Use examples from Indian daily life: chai, family situations, Bollywood, cricket, festivals
- Include natural expressions: "Achha sunte hain", "Main batati hun", "Dekho yaar"
- Share tiny personal touches: "Mere ghar mein bhi aisa hota hai", "Main bachpan mein..."
- Make the student feel comfortable and encouraged

RESPONSE REQUIREMENTS:
1. Use FEMININE grammatical forms in ${languageName} (e.g., "main karungi", "main batatihu")
2. Provide a COMPLETE response with clear step-by-step explanation
3. NEVER end abruptly - always conclude with a proper ending sentence
4. Use simple ${languageName} words that TTS can pronounce naturally
5. Match the student's tone - ${isCasualTone ? 'be warm and sisterly' : 'be caring but respectful'}
6. Include 1-2 relatable Indian examples (food, family, movies, daily life)
7. ${complexityLevel === 'basic' ? 'Use very simple words and basic examples from cartoons or games.' : 
  complexityLevel === 'advanced' ? 'Include detailed explanations but keep them relatable.' :
  complexityLevel === 'expert' ? 'Provide comprehensive analysis with smart Indian examples.' :
  'Explain clearly with appropriate examples.'}
8. End your response with an encouraging conclusion that shows you've finished explaining

Student's Question: ${question}

Respond as Tara would - warm, knowledgeable, and uniquely Indian in your approach:`;

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
      max_tokens: 1200, // Increased for complete responses
      temperature: 0.7,
      stop: null // Ensure no artificial stopping
    });

    console.log('✅ OpenAI response received');
    
    let answer = response.choices[0].message.content.trim();
    
    // Check if response seems incomplete (ends with incomplete sentence indicators)
    const incompleteIndicators = ['...', '।।', 'और', 'तो', 'लेकिन', 'इसलिए', 'क्योंकि'];
    const lastWords = answer.split(' ').slice(-3).join(' ').toLowerCase();
    
    // If response seems incomplete, add a completion
    if (incompleteIndicators.some(indicator => answer.endsWith(indicator)) || 
        answer.length > 500 && !answer.endsWith('।') && !answer.endsWith('.') && !answer.endsWith('!')) {
      console.log('⚠️ Response appears incomplete, attempting to complete...');
      answer += ` उम्मीद है कि अब आपको यह समझ आ गया होगा। अगर कोई और सवाल है तो पूछिए!`;
    }
    
    return {
      answer: answer,
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
  let timeoutHandle;
  
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
    timeoutHandle = setTimeout(() => {
      if (!res.headersSent) {
        console.log('⏰ Request timed out after 60 seconds');
        res.status(504).json({ 
          error: 'Request timeout', 
          message: 'The request took too long to process. Please try again.' 
        });
      }
    }, 60000); // 60 second timeout

    // Generate answer using OpenAI with subject intelligence
    console.log('🤖 Generating answer...');
    const result = await generateAnswer(question, language, subject, grade);
    console.log('✅ Answer generated successfully');

    // Convert answer to speech
    console.log('🎵 Converting to speech...');
    const audioUrl = await convertTextToSpeech(result.answer, language);
    console.log('✅ Audio conversion completed');

    // Clear the timeout since we completed successfully
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }

    // Send response immediately
    if (!res.headersSent) {
      const response = {
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
      };
      
      console.log('📤 Sending response to frontend...');
      res.json(response);
      console.log('✅ Response sent successfully');
    }

  } catch (error) {
    console.error('❌ Error processing request:', error);
    console.error('Error stack:', error.stack);
    
    // Clear timeout on error
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    
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
