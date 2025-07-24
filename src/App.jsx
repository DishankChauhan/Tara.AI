import { useState } from 'react'
import axios from 'axios'
import { Mic, Volume2, Languages, MessageCircle, Loader2, Home, User, Settings, HelpCircle, BookOpen, GraduationCap } from 'lucide-react'
import './App.css'

const API_BASE_URL = 'http://localhost:5001/api'

// Language options for Indian regional languages
const LANGUAGES = [
  { code: 'hi', name: 'हिंदी (Hindi)', flag: '🇮🇳' },
  { code: 'ta', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা (Bengali)', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी (Marathi)', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
]

// Subject options for specialized tutoring
const SUBJECTS = [
  { code: 'general', name: 'General Studies', icon: '📚' },
  { code: 'math', name: 'Mathematics', icon: '🔢' },
  { code: 'physics', name: 'Physics', icon: '⚗️' },
  { code: 'chemistry', name: 'Chemistry', icon: '🧪' },
]

// Grade level options
const GRADES = [
  { code: 6, name: 'Class 6' },
  { code: 7, name: 'Class 7' },
  { code: 8, name: 'Class 8' },
  { code: 9, name: 'Class 9' },
  { code: 10, name: 'Class 10' },
  { code: 11, name: 'Class 11' },
  { code: 12, name: 'Class 12' },
]

function App() {
  const [question, setQuestion] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('hi')
  const [selectedSubject, setSelectedSubject] = useState('general')
  const [selectedGrade, setSelectedGrade] = useState(null)
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const [recordingTimeout, setRecordingTimeout] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    setError('')
    setResponse(null)

    try {
      const result = await axios.post(`${API_BASE_URL}/ask`, {
        question: question.trim(),
        language: selectedLanguage,
        subject: selectedSubject !== 'general' ? selectedSubject : null,
        grade: selectedGrade
      })

      setResponse(result.data)
      setQuestion('')
    } catch (err) {
      console.error('Error:', err)
      setError(err.response?.data?.message || 'Failed to get answer. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const playAudio = (audioUrl) => {
    const audio = new Audio(audioUrl)
    audio.play().catch(err => {
      console.error('Error playing audio:', err)
      setError('Could not play audio. Please try again.')
    })
  }

  const startRecording = async () => {
    try {
      setError('')
      setIsProcessingVoice(false) // Reset processing state
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      const chunks = []
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' })
        stream.getTracks().forEach(track => track.stop())
        
        // Clear timeout
        if (recordingTimeout) {
          clearTimeout(recordingTimeout)
          setRecordingTimeout(null)
        }
        
        // Automatically transcribe and process
        await transcribeAndProcess(blob)
      }
      
      setMediaRecorder(recorder)
      recorder.start()
      setIsRecording(true)
      
      // Auto-stop after 30 seconds
      const timeout = setTimeout(() => {
        console.log('Auto-stopping recording after 30 seconds')
        if (recorder && recorder.state === 'recording') {
          recorder.stop()
        }
      }, 30000)
      setRecordingTimeout(timeout)
      
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Could not access microphone. Please check permissions.')
      setIsProcessingVoice(false)
    }
  }

  const stopRecording = () => {
    console.log('stopRecording called')
    if (mediaRecorder && isRecording) {
      console.log('Actually stopping recorder')
      mediaRecorder.stop()
      setIsRecording(false)
      setIsProcessingVoice(true) // Start processing after stopping
      
      // Clear timeout
      if (recordingTimeout) {
        clearTimeout(recordingTimeout)
        setRecordingTimeout(null)
      }
    }
  }

  const transcribeAndProcess = async (audioBlob) => {
    try {
      setError('')

      // Step 1: Transcribe audio to text
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('language', selectedLanguage)

      const transcribeResult = await axios.post(`${API_BASE_URL}/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const transcribedQuestion = transcribeResult.data.transcription
      setQuestion(transcribedQuestion)

      // Step 2: Get AI answer
      const answerResult = await axios.post(`${API_BASE_URL}/ask`, {
        question: transcribedQuestion,
        language: selectedLanguage,
        subject: selectedSubject !== 'general' ? selectedSubject : null,
        grade: selectedGrade
      })

      setResponse(answerResult.data)
      
      // Step 3: Auto-play the audio response
      if (answerResult.data.audioUrl) {
        setTimeout(() => {
          const audio = new Audio(answerResult.data.audioUrl)
          audio.play().catch(console.error)
        }, 500) // Small delay for better UX
      }

    } catch (err) {
      console.error('Error processing voice:', err)
      setError(err.response?.data?.message || 'Failed to process voice input. Please try again.')
    } finally {
      setIsProcessingVoice(false)
    }
  }

  const handleVoiceInput = () => {
    console.log('Voice input clicked:', { isRecording, isProcessingVoice, loading })
    
    if (isRecording) {
      console.log('Stopping recording...')
      // Stop recording and start processing
      stopRecording()
    } else if (!isProcessingVoice && !loading) {
      console.log('Starting recording...')
      // Start new recording
      startRecording()
    } else {
      console.log('Cannot start recording - processing or loading')
    }
  }

  const selectedLangData = LANGUAGES.find(lang => lang.code === selectedLanguage)
  const selectedSubjectData = SUBJECTS.find(subj => subj.code === selectedSubject)
  const selectedGradeData = GRADES.find(grade => grade.code === selectedGrade)

  return (
    <div className="app">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-left">
          <div className="logo">
            <MessageCircle size={20} />
            <span>Tara</span>
          </div>
        </div>
        <div className="nav-right">
          <a href="#" className="nav-link">Home</a>
          <a href="#" className="nav-link">Privacy Policy</a>
          <a href="#" className="nav-link">Terms of use</a>
          <a href="#" className="nav-link">Connect with us</a>
          <a href="#" className="nav-link">Careers</a>
          <a href="#" className="nav-link">Company</a>
          <button className="claim-invite-btn">Join Beta!</button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        <div className="container">
          {/* Intro Message */}
          <div className="intro-message">
            <p>Tara AI is your intelligent learning companion! Ask questions about Math, Physics, Chemistry, or any subject in your preferred language. She's ready to provide grade-specific explanations!</p>
          </div>

          {/* Voice Interface */}
          <div className="voice-interface">
            <div className="voice-button">
              <div className={`voice-rings ${isRecording ? 'recording' : ''}`}>
                <div className="ring ring-1"></div>
                <div className="ring ring-2"></div>
                <div className="ring ring-3"></div>
              </div>
              <button 
                className={`mic-button ${isRecording ? 'recording' : ''} ${isProcessingVoice ? 'processing' : ''}`}
                onClick={handleVoiceInput}
                disabled={loading}
              >
                {isProcessingVoice ? (
                  <Loader2 className="spinner" size={24} />
                ) : (
                  <Mic size={24} />
                )}
              </button>
            </div>
            <p className="voice-prompt">
              {isRecording 
                ? 'Listening... Click to stop and process' 
                : isProcessingVoice
                ? 'Processing your question... Please wait'
                : loading
                ? 'Getting your answer...'
                : 'Click to ask your question by voice'
              }
            </p>
          </div>

          {/* Subject and Grade Selectors */}
          <div className="academic-controls">
            {/* Subject Selector */}
            <div className="selector-group">
              <div className="selector-header">
                <BookOpen className="selector-icon" />
                <span>Subject</span>
              </div>
              <select 
                value={selectedSubject} 
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="academic-dropdown"
              >
                {SUBJECTS.map(subject => (
                  <option key={subject.code} value={subject.code}>
                    {subject.icon} {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Selector */}
            <div className="selector-group">
              <div className="selector-header">
                <GraduationCap className="selector-icon" />
                <span>Grade</span>
              </div>
              <select 
                value={selectedGrade || ''} 
                onChange={(e) => setSelectedGrade(e.target.value ? parseInt(e.target.value) : null)}
                className="academic-dropdown"
              >
                <option value="">Auto-detect</option>
                {GRADES.map(grade => (
                  <option key={grade.code} value={grade.code}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Selector */}
            <div className="selector-group">
              <div className="selector-header">
                <Languages className="selector-icon" />
                <span>Language</span>
              </div>
              <select 
                value={selectedLanguage} 
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="academic-dropdown"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Input */}
          <div className="question-form">
            <div className="input-group">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={`Ask your ${selectedSubjectData?.name} question in ${selectedLangData?.name}...`}
                className="question-input"
                rows="3"
                disabled={loading}
              />
              {question.trim() && (
                <button 
                  onClick={handleSubmit}
                  disabled={loading || !question.trim()}
                  className="submit-button"
                >
                  {loading ? (
                    <Loader2 className="spinner" />
                  ) : (
                    'Ask Tara'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="response-container">
              <div className="response-header">
                <div className="subject-info">
                  <span className="subject-badge">
                    {SUBJECTS.find(s => s.code === response.subject)?.icon} {response.subjectName}
                  </span>
                  {response.grade && (
                    <span className="grade-badge">
                      🎓 {response.grade}
                    </span>
                  )}
                </div>
                <h3>Answer in {response.languageName}</h3>
                {response.audioUrl && (
                  <button 
                    onClick={() => playAudio(response.audioUrl)}
                    className="play-button"
                    title="Play audio"
                  >
                    <Volume2 className="volume-icon" />
                    Play Audio
                  </button>
                )}
              </div>
              
              <div className="response-content">
                <div className="question-display">
                  <strong>Your Question:</strong>
                  <p>{response.question}</p>
                </div>
                
                <div className="answer-display">
                  <strong>Answer:</strong>
                  <div className="answer-text">{response.answer}</div>
                </div>
              </div>
            </div>
          )}

          {/* Waitlist Section */}
          <div className="waitlist-section">
            <div className="waitlist-input">
              <input 
                type="email" 
                placeholder="Enter your email"
                className="email-input"
              />
              <button className="claim-btn">Join Beta!</button>
            </div>
            <p className="waitlist-text">— We are <strong>500+</strong> people in our <strong>Beta Waitlist</strong>, join now!</p>
            <p className="coming-soon">Subject-specific AI tutoring now available!</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-links">
          <a href="#" className="footer-link">Terms of use</a>
          <a href="#" className="footer-link">Privacy policies</a>
          <a href="#" className="footer-link">Connect-with-us</a>
          <a href="#" className="footer-link">Company</a>
        </div>
        <p className="footer-copyright">Tara. © 2025</p>
      </footer>
    </div>
  )
}

export default App
