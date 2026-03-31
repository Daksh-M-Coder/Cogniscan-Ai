'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAssessmentStore } from '@/lib/assessments'
import { ProtectedRoute } from '@/lib/auth-provider'
import { 
  Mic, 
  Video, 
  Brain, 
  ChevronRight, 
  ChevronLeft,
  Play,
  Square,
  RefreshCw,
  CheckCircle
} from 'lucide-react'

type AssessmentStep = 'intro' | 'speech' | 'video' | 'tasks' | 'review' | 'complete'
type TaskGame = 'menu' | 'digitSpan' | 'trailMaking' | 'verbalFluency' | 'patternCompletion'

export default function AssessmentPage() {
  return (
    <ProtectedRoute>
      <AssessmentContent />
    </ProtectedRoute>
  )
}

function AssessmentContent() {
  const router = useRouter()
  const { addAssessment } = useAssessmentStore()
  const [currentStep, setCurrentStep] = useState<AssessmentStep>('intro')
  const [progress, setProgress] = useState(0)
  const [currentGame, setCurrentGame] = useState<TaskGame>('menu')
  
  // Speech recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Video recording
  const [isRecordingVideo, setIsRecordingVideo] = useState(false)
  const [videoTime, setVideoTime] = useState(0)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRecorderRef = useRef<MediaRecorder | null>(null)
  
  // Task scores - now based on actual performance
  const [taskScores, setTaskScores] = useState({
    digitSpan: 0,
    trailMaking: 0,
    verbalFluency: 0,
    patternCompletion: 0,
  })
  const [completedGames, setCompletedGames] = useState<Set<TaskGame>>(new Set())

  const [speechAnalysis, setSpeechAnalysis] = useState<any>(null)
  const [facialAnalysis, setFacialAnalysis] = useState<any>(null)
  const [analyzingSpeech, setAnalyzingSpeech] = useState(false)
  const [analyzingVideo, setAnalyzingVideo] = useState(false)

  const submitAssessment = useMutation({
    mutationFn: async () => {
      console.log('Submitting assessment with ML analysis...', { audioBlob, videoBlob })
      
      try {
        // Step 1: Analyze speech if audio exists
        let speechResult = null
        if (audioBlob) {
          const audioFormData = new FormData()
          audioFormData.append('audio', audioBlob, 'speech.webm')
          
          const speechResponse = await api.post('/api/v1/analyze/speech', audioFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          speechResult = speechResponse.data
          setSpeechAnalysis(speechResult)
          console.log('Speech analysis:', speechResult)
        }

        // Step 2: Analyze facial if video exists
        let facialResult = null
        if (videoBlob) {
          const videoFormData = new FormData()
          videoFormData.append('video', videoBlob, 'video.webm')
          
          const facialResponse = await api.post('/api/v1/analyze/facial', videoFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          facialResult = facialResponse.data
          setFacialAnalysis(facialResult)
          console.log('Facial analysis:', facialResult)
        }

        // Step 3: Get combined analysis
        const combinedResponse = await api.post('/api/v1/analyze/combined', {
          speech: speechResult,
          facial: facialResult,
          cognitive: {
            digitSpan: taskScores.digitSpan / 100,
            trailMaking: taskScores.trailMaking / 100,
            verbalFluency: taskScores.verbalFluency / 100,
            patternCompletion: taskScores.patternCompletion / 100,
          }
        })
        
        console.log('Combined analysis:', combinedResponse.data)
        return combinedResponse.data
        
      } catch (err: any) {
        console.error('ML analysis failed:', err)
        // If backend unavailable, fall back to simple calculation
        if (!err.response) {
          console.log('ML backend unavailable, using fallback scoring')
          return {
            overall_score: 0.5,
            risk_level: 'mild',
            speech_score: recordingTime / 60,
            facial_score: videoTime / 30,
            cognitive_score: (taskScores.digitSpan + taskScores.trailMaking + taskScores.verbalFluency + taskScores.patternCompletion) / 400,
            recommendation: 'Backend unavailable - using fallback scoring',
            details: { speech: null, facial: null }
          }
        }
        throw err
      }
    },
    onSuccess: (data) => {
      // Save real ML results to local storage
      addAssessment({
        overall_risk_score: data.overall_score ?? data.cognitive_score ?? 0.5,
        risk_category: data.risk_level ?? 'mild',
        duration_seconds: recordingTime + videoTime + 300,
        speech_score: data.speech_score ?? data.details?.speech?.cognitive_score ?? recordingTime / 60,
        facial_score: data.facial_score ?? data.details?.facial?.cognitive_indicators?.concern_score ?? videoTime / 30,
        cognitive_score: data.cognitive_score ?? (taskScores.digitSpan + taskScores.trailMaking + taskScores.verbalFluency + taskScores.patternCompletion) / 400,
        speech_analysis: speechAnalysis,
        facial_analysis: facialAnalysis,
        recommendation: data.recommendation,
      })
      setCurrentStep('complete')
    },
    onError: (error: any) => {
      console.error('Failed to submit assessment:', error)
      alert('Failed to analyze assessment: ' + (error.response?.data?.message || error.message))
    },
  })

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Try to use a more compatible codec
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      const chunks: Blob[] = []
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
        // Auto-analyze after recording
        await analyzeSpeechAudio(blob)
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            return 60  // Cap at 60, user must manually stop
          }
          return prev + 1
        })
      }, 1000)
    } catch (err) {
      console.error('Failed to start recording:', err)
      alert('Please allow microphone access to continue')
    }
  }

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  // Analyze speech after recording
  const analyzeSpeechAudio = useCallback(async (blob: Blob) => {
    if (!blob || blob.size === 0) {
      console.error('[SPEECH] No audio data to analyze')
      return
    }
    
    setAnalyzingSpeech(true)
    
    try {
      const audioFormData = new FormData()
      // Use proper filename based on blob type
      const ext = blob.type.includes('mp4') ? '.mp4' : '.webm'
      audioFormData.append('audio', blob, `speech${ext}`)
      
      console.log(`[SPEECH] Sending ${blob.size} bytes to backend...`)
      
      const response = await api.post('/api/v1/analyze/speech', audioFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000  // 60 seconds for Whisper transcription
      })
      
      setSpeechAnalysis(response.data)
      console.log('[SPEECH] Analysis complete:', response.data)
      
      // Show alert if crisis detected
      if (response.data?.crisis_analysis?.requires_immediate_attention) {
        alert('⚠️ CRISIS ALERT: Please seek immediate help. Call emergency services or a crisis helpline.')
      }
    } catch (err: any) {
      console.error('[SPEECH] Analysis failed:', err)
      setSpeechAnalysis({
        error: true,
        message: err.response?.data?.detail || 'Speech analysis failed',
        risk_level: 'unknown'
      })
    } finally {
      setAnalyzingSpeech(false)
    }
  }, [])

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      const mediaRecorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        setVideoBlob(blob)
        stream.getTracks().forEach(track => track.stop())
        // Auto-analyze after recording
        await analyzeVideo(blob)
      }
      
      videoRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecordingVideo(true)
      
      timerRef.current = setInterval(() => {
        setVideoTime(prev => {
          if (prev >= 30) {
            stopVideoRecording()
            return 30
          }
          return prev + 1
        })
      }, 1000)
    } catch (err) {
      console.error('Failed to start video:', err)
      alert('Please allow camera access to continue')
    }
  }

  const stopVideoRecording = useCallback(() => {
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.stop()
      setIsRecordingVideo(false)
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [isRecordingVideo])

  // Analyze video after recording
  const analyzeVideo = useCallback(async (blob: Blob) => {
    if (!blob) return
    setAnalyzingVideo(true)
    try {
      const videoFormData = new FormData()
      videoFormData.append('video', blob, 'video.webm')
      
      const response = await api.post('/api/v1/analyze/facial', videoFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setFacialAnalysis(response.data)
      console.log('Facial analysis:', response.data)
    } catch (err) {
      console.error('Facial analysis failed:', err)
    } finally {
      setAnalyzingVideo(false)
    }
  }, [])

  const nextStep = () => {
    const steps: AssessmentStep[] = ['intro', 'speech', 'video', 'tasks', 'review', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
      setProgress((currentIndex + 1) / (steps.length - 1))
    }
  }

  const prevStep = () => {
    const steps: AssessmentStep[] = ['intro', 'speech', 'video', 'tasks', 'review', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
      setProgress((currentIndex - 1) / (steps.length - 1))
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'intro':
        return (
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10 text-violet-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Daily Cognitive Assessment
            </h2>
            <p className="text-gray-600 mb-8">
              This assessment takes about 10 minutes and helps track your cognitive health 
              through speech analysis, facial expression recognition, and cognitive tasks.
            </p>
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <Mic className="w-8 h-8 text-violet-600 mx-auto mb-2" />
                <p className="font-medium text-gray-900">Speech</p>
                <p className="text-sm text-gray-500">60 seconds</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <Video className="w-8 h-8 text-violet-600 mx-auto mb-2" />
                <p className="font-medium text-gray-900">Video</p>
                <p className="text-sm text-gray-500">30 seconds</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <Brain className="w-8 h-8 text-violet-600 mx-auto mb-2" />
                <p className="font-medium text-gray-900">Tasks</p>
                <p className="text-sm text-gray-500">~5 minutes</p>
              </div>
            </div>
          </div>
        )

      case 'speech':
        return (
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Speech Recording</h2>
            <p className="text-gray-600 mb-8">
              Please speak for up to 60 seconds about your favorite memory, recent experience, 
              or describe your day in detail.
            </p>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
              {/* Recording Animation - separate from button */}
              <div className="w-32 h-32 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                {isRecording && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-red-100 animate-ping" />
                    <div className="absolute inset-4 rounded-full bg-red-200 animate-pulse" />
                  </>
                )}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500' : 'bg-violet-100'}`}>
                  <Mic className={`w-8 h-8 ${isRecording ? 'text-white' : 'text-violet-600'}`} />
                </div>
              </div>
              
              <div className="text-4xl font-mono font-bold text-gray-900 mb-2">
                {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
              </div>
              <p className="text-gray-500 mb-6">
                {isRecording ? 'Recording in progress...' : audioBlob ? 'Recording saved!' : 'Ready to record'}
              </p>

              {/* Separate Start/Stop Buttons */}
              {!isRecording && !audioBlob && (
                <button
                  onClick={startRecording}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto"
                >
                  <Play className="w-5 h-5" />
                  Start Recording
                </button>
              )}

              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto"
                >
                  <Square className="w-5 h-5" />
                  Stop Recording
                </button>
              )}
            </div>

            {audioBlob && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 justify-center">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span>Audio recorded successfully</span>
                  </div>
                  <button
                    onClick={() => {
                      setAudioBlob(null)
                      setRecordingTime(0)
                      setSpeechAnalysis(null)
                    }}
                    className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retake
                  </button>
                </div>

                {/* Speech Analysis Results */}
                {analyzingSpeech && (
                  <div className="bg-violet-50 rounded-xl p-6 border border-violet-200">
                    <div className="flex items-center gap-3 justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
                      <p className="text-violet-700 font-medium">Analyzing speech...</p>
                    </div>
                  </div>
                )}

                {speechAnalysis && !analyzingSpeech && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-left">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Mic className="w-5 h-5 text-violet-600" />
                      🎤 Speech Analysis Results
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Detected Language</p>
                        <p className="font-semibold text-gray-900">{speechAnalysis.language || 'en'} ({speechAnalysis.language_name || 'English'})</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Speech Rate</p>
                        <p className="font-semibold text-gray-900">{speechAnalysis.speech_rate_wpm?.toFixed(1) || 'N/A'} WPM</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Pause Score</p>
                        <p className="font-semibold text-gray-900">{speechAnalysis.pause_analysis?.pause_score || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Risk Level</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          speechAnalysis.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                          speechAnalysis.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {speechAnalysis.risk_level?.toUpperCase() || 'LOW'}
                        </span>
                      </div>
                    </div>
                    
                    {speechAnalysis.text && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Transcription:</p>
                        <p className="text-sm text-gray-700 italic">"{speechAnalysis.text.substring(0, 150)}{speechAnalysis.text.length > 150 ? '...' : ''}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'video':
        return (
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Facial Expression</h2>
            <p className="text-gray-600 mb-8">
              Look at the camera and react naturally. We'll capture 30 seconds of video 
              for emotion and expression analysis.
            </p>
            
            <div className="relative bg-black rounded-2xl overflow-hidden mb-6 aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              
              {!isRecordingVideo && !videoBlob && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <button
                    onClick={startVideoRecording}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Start Recording
                  </button>
                </div>
              )}
              
              {isRecordingVideo && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  REC {Math.floor(videoTime / 60)}:{String(videoTime % 60).padStart(2, '0')}
                </div>
              )}
              
              {isRecordingVideo && (
                <button
                  onClick={stopVideoRecording}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              )}
            </div>

            {videoBlob && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 justify-center text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span>Video recorded successfully</span>
                  <button
                    onClick={() => {
                      setVideoBlob(null)
                      setVideoTime(0)
                      setFacialAnalysis(null)
                    }}
                    className="text-gray-500 hover:text-gray-700 ml-4 flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retake
                  </button>
                </div>

                {/* Facial Analysis Results */}
                {analyzingVideo && (
                  <div className="bg-violet-50 rounded-xl p-6 border border-violet-200">
                    <div className="flex items-center gap-3 justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
                      <p className="text-violet-700 font-medium">Analyzing facial expressions...</p>
                    </div>
                  </div>
                )}

                {facialAnalysis && !analyzingVideo && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-left">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Video className="w-5 h-5 text-violet-600" />
                      📹 Facial Analysis Results
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-violet-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Face Detection</p>
                        <p className="text-xl font-bold text-violet-700">
                          {((facialAnalysis.face_detection_rate || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Dominant Emotion</p>
                        <p className="text-lg font-bold text-blue-700 uppercase">
                          {facialAnalysis.dominant_emotion || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Attention Level</p>
                        <p className="text-lg font-bold text-green-700 uppercase">
                          {facialAnalysis.attention?.level || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">🎭 Emotion Distribution:</p>
                      <div className="flex flex-wrap gap-2">
                        {facialAnalysis.emotion_distribution && Object.entries(facialAnalysis.emotion_distribution).map(([emotion, pct]) => (
                          <span key={emotion} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                            {emotion}: {((pct as number) * 100).toFixed(1)}%
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Average Attention</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {((facialAnalysis.attention?.average_score || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Risk Level</p>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          facialAnalysis.cognitive_indicators?.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                          facialAnalysis.cognitive_indicators?.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {facialAnalysis.cognitive_indicators?.risk_level?.toUpperCase() || 'LOW'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'tasks':
        if (currentGame === 'menu') {
          return (
            <div className="max-w-xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Cognitive Tasks</h2>
              <p className="text-gray-600 mb-8 text-center">
                Complete these tasks to the best of your ability. Your performance helps 
                us understand your cognitive function.
              </p>
              
              <div className="space-y-4">
                <TaskGameCard
                  title="1. Digit Span"
                  description="Remember and repeat number sequences"
                  score={taskScores.digitSpan}
                  completed={completedGames.has('digitSpan')}
                  onClick={() => setCurrentGame('digitSpan')}
                  icon={<Brain className="w-5 h-5" />}
                />
                <TaskGameCard
                  title="2. Trail Making"
                  description="Connect numbered circles in ascending order"
                  score={taskScores.trailMaking}
                  completed={completedGames.has('trailMaking')}
                  onClick={() => setCurrentGame('trailMaking')}
                  icon={<Brain className="w-5 h-5" />}
                />
                <TaskGameCard
                  title="3. Verbal Fluency"
                  description="Name as many animals as you can in 60 seconds"
                  score={taskScores.verbalFluency}
                  completed={completedGames.has('verbalFluency')}
                  onClick={() => setCurrentGame('verbalFluency')}
                  icon={<Brain className="w-5 h-5" />}
                />
                <TaskGameCard
                  title="4. Pattern Completion"
                  description="Complete the visual pattern sequences"
                  score={taskScores.patternCompletion}
                  completed={completedGames.has('patternCompletion')}
                  onClick={() => setCurrentGame('patternCompletion')}
                  icon={<Brain className="w-5 h-5" />}
                />
              </div>
              
              {completedGames.size === 4 && (
                <div className="mt-8 text-center">
                  <p className="text-green-600 font-medium mb-4">All tasks completed!</p>
                </div>
              )}
            </div>
          )
        }
        
        if (currentGame === 'digitSpan') {
          return <DigitSpanGame 
            onComplete={(score) => {
              setTaskScores(prev => ({ ...prev, digitSpan: score }))
              setCompletedGames(prev => new Set([...prev, 'digitSpan']))
              setCurrentGame('menu')
            }}
            onBack={() => setCurrentGame('menu')}
          />
        }
        
        if (currentGame === 'trailMaking') {
          return <TrailMakingGame 
            onComplete={(score) => {
              setTaskScores(prev => ({ ...prev, trailMaking: score }))
              setCompletedGames(prev => new Set([...prev, 'trailMaking']))
              setCurrentGame('menu')
            }}
            onBack={() => setCurrentGame('menu')}
          />
        }
        
        if (currentGame === 'verbalFluency') {
          return <VerbalFluencyGame 
            onComplete={(score) => {
              setTaskScores(prev => ({ ...prev, verbalFluency: score }))
              setCompletedGames(prev => new Set([...prev, 'verbalFluency']))
              setCurrentGame('menu')
            }}
            onBack={() => setCurrentGame('menu')}
          />
        }
        
        if (currentGame === 'patternCompletion') {
          return <PatternCompletionGame 
            onComplete={(score) => {
              setTaskScores(prev => ({ ...prev, patternCompletion: score }))
              setCompletedGames(prev => new Set([...prev, 'patternCompletion']))
              setCurrentGame('menu')
            }}
            onBack={() => setCurrentGame('menu')}
          />
        }
        
        return null

      case 'review':
        return (
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Review & Submit</h2>
            <p className="text-gray-600 mb-8">
              Please review your assessment before submitting.
            </p>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 text-left">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                    <Mic className="w-5 h-5 text-violet-600" />
                  </div>
                  <span className="font-medium text-gray-900">Speech Recording</span>
                </div>
                {audioBlob ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Complete
                  </span>
                ) : (
                  <span className="text-red-500">Missing</span>
                )}
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-violet-600" />
                  </div>
                  <span className="font-medium text-gray-900">Video Recording</span>
                </div>
                {videoBlob ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Complete
                  </span>
                ) : (
                  <span className="text-red-500">Missing</span>
                )}
              </div>
              
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-violet-600" />
                  </div>
                  <span className="font-medium text-gray-900">Cognitive Tasks</span>
                </div>
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Complete
                </span>
              </div>
            </div>

            <button
              onClick={() => submitAssessment.mutate()}
              disabled={submitAssessment.isPending || !audioBlob || !videoBlob}
              className="w-full bg-violet-600 text-white py-3 rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitAssessment.isPending 
                ? 'Submitting...' 
                : !audioBlob 
                  ? 'Record Audio to Submit' 
                  : !videoBlob 
                    ? 'Record Video to Submit' 
                    : 'Submit Assessment'}
            </button>
            
            {(!audioBlob || !videoBlob) && (
              <p className="text-sm text-amber-600 mt-3">
                {!audioBlob && !videoBlob 
                  ? 'Please complete both audio and video recording'
                  : !audioBlob 
                    ? 'Please record audio'
                    : 'Please record video'}
              </p>
            )}
          </div>
        )

      case 'complete':
        return (
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Assessment Complete!
            </h2>
            
            {/* Analysis Results */}
            {speechAnalysis && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 text-left">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Mic className="w-5 h-5 text-violet-600" />
                  🎤 Speech Analysis
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Detected Language</p>
                    <p className="font-semibold text-gray-900">{speechAnalysis.language || 'en'} ({speechAnalysis.language_name || 'English'})</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Speech Rate</p>
                    <p className="font-semibold text-gray-900">{speechAnalysis.speech_rate_wpm?.toFixed(1) || 'N/A'} WPM</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pause Score</p>
                    <p className="font-semibold text-gray-900">{speechAnalysis.pause_analysis?.pause_score || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Risk Level</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      speechAnalysis.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                      speechAnalysis.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {speechAnalysis.risk_level?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                </div>
                {speechAnalysis.text && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Transcription:</p>
                    <p className="text-sm text-gray-700 italic">"{speechAnalysis.text.substring(0, 200)}{speechAnalysis.text.length > 200 ? '...' : ''}"</p>
                  </div>
                )}
              </div>
            )}

            {facialAnalysis && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 text-left">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5 text-violet-600" />
                  📹 Facial Analysis
                </h3>
                
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-violet-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Face Detection</p>
                    <p className="text-xl font-bold text-violet-700">
                      {((facialAnalysis.face_detection_rate || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Dominant Emotion</p>
                    <p className="text-xl font-bold text-blue-700 uppercase">
                      {facialAnalysis.dominant_emotion || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Attention Level</p>
                    <p className="text-xl font-bold text-green-700 uppercase">
                      {facialAnalysis.attention?.level || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">🎭 Emotion Distribution:</p>
                  <div className="flex flex-wrap gap-2">
                    {facialAnalysis.emotion_distribution && Object.entries(facialAnalysis.emotion_distribution).map(([emotion, pct]) => (
                      <span key={emotion} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                        {emotion}: {((pct as number) * 100).toFixed(1)}%
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Average Attention Score</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {((facialAnalysis.attention?.average_score || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Risk Level</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      facialAnalysis.cognitive_indicators?.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                      facialAnalysis.cognitive_indicators?.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {facialAnalysis.cognitive_indicators?.risk_level?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => router.push('/dashboard')}
              className="bg-violet-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-violet-700"
            >
              Back to Dashboard
            </button>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-violet-600" />
              <span className="font-bold text-gray-900">CogniScan AI</span>
            </div>
            <div className="flex-1 max-w-md mx-8">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-violet-600 transition-all duration-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
            <div className="w-20" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-8 min-h-[500px] flex flex-col">
          <div className="flex-1">
            {renderStep()}
          </div>
          
          {/* Navigation */}
          {currentStep !== 'complete' && (
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={prevStep}
                disabled={currentStep === 'intro'}
                className="flex items-center gap-2 px-6 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
              
              {currentStep !== 'review' && (
                <button
                  onClick={nextStep}
                  className="flex items-center gap-2 px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium"
                >
                  {currentStep === 'intro' ? 'Start Assessment' : 'Continue'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function TaskCard({ title, description, score, icon }: { title: string, description: string, score: number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-violet-500 rounded-full"
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">{score}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskGameCard({ title, description, score, completed, onClick, icon }: { 
  title: string, 
  description: string, 
  score: number, 
  completed: boolean,
  onClick: () => void,
  icon: React.ReactNode 
}) {
  return (
    <button 
      onClick={onClick}
      className={`w-full text-left bg-white p-4 rounded-xl border-2 transition-all hover:shadow-md ${
        completed ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-violet-300'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          completed ? 'bg-green-100' : 'bg-violet-100'
        }`}>
          {completed ? <CheckCircle className="w-5 h-5 text-green-600" /> : icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{title}</h3>
            {completed && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Done</span>}
          </div>
          <p className="text-sm text-gray-500">{description}</p>
          {completed && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-sm font-medium text-green-700">{score}%</span>
            </div>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </button>
  )
}

// STRICT Digit Span Game - Fails immediately on wrong answer
function DigitSpanGame({ onComplete, onBack }: { onComplete: (score: number) => void, onBack: () => void }) {
  const [level, setLevel] = useState(3)
  const [sequence, setSequence] = useState<number[]>([])
  const [userInput, setUserInput] = useState<number[]>([])
  const [phase, setPhase] = useState<'show' | 'input' | 'result' | 'failed'>('show')
  const [score, setScore] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    generateSequence(level)
  }, [level])

  const generateSequence = (len: number) => {
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 10))
    setSequence(seq)
    setUserInput([])
    setPhase('show')
    
    // Show sequence for 2 seconds per digit
    setTimeout(() => setPhase('input'), len * 1000 + 1000)
  }

  const handleNumberClick = (num: number) => {
    if (failed || userInput.length >= sequence.length) return
    
    const currentIndex = userInput.length
    const correctNum = sequence[currentIndex]
    
    // STRICT: Check each number immediately - fail on wrong
    if (num !== correctNum) {
      setFailed(true)
      setPhase('failed')
      // WRONG ANSWER = 0% (Strict mode)
      const finalScore = 0
      setTimeout(() => onComplete(finalScore), 1500)
      return
    }
    
    const newInput = [...userInput, num]
    setUserInput(newInput)
    
    // Complete sequence correctly
    if (newInput.length === sequence.length) {
      const newScore = score + 25
      setScore(newScore)
      
      if (level < 6) {
        setTimeout(() => setLevel(prev => prev + 1), 1000)
      } else {
        setTimeout(() => onComplete(100), 1000)
      }
    }
  }

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <h2 className="text-xl font-bold text-gray-900">Digit Span (Strict)</h2>
        <div className="w-20" />
      </div>

      {phase === 'failed' ? (
        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
          <p className="text-red-700 font-bold text-lg mb-2">❌ Wrong Answer!</p>
          <p className="text-red-600">Assessment stopped. You entered the wrong number.</p>
          <p className="text-red-500 mt-2">Correct was: {sequence.join(' - ')}</p>
          <p className="text-sm text-gray-500 mt-4">Final Score: 0% (Failed)</p>
        </div>
      ) : (
        <>
          <div className="bg-amber-50 rounded-lg p-3 mb-4 border border-amber-200">
            <p className="text-amber-700 text-sm font-medium">⚠️ STRICT MODE: One wrong answer ends the test!</p>
          </div>

          <p className="text-gray-600 mb-8">
            {phase === 'show' ? 'Remember this sequence:' : 'Enter the sequence correctly:'}
          </p>

          {phase === 'show' && (
            <div className="flex justify-center gap-3 mb-8">
              {sequence.map((num, i) => (
                <div key={i} className="w-14 h-14 bg-violet-600 text-white text-2xl font-bold rounded-xl flex items-center justify-center animate-pulse">
                  {num}
                </div>
              ))}
            </div>
          )}

          {phase === 'input' && (
            <>
              <div className="flex justify-center gap-3 mb-8">
                {sequence.map((_, i) => (
                  <div key={i} className={`w-14 h-14 text-2xl font-bold rounded-xl flex items-center justify-center ${
                    userInput[i] !== undefined ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {userInput[i] ?? '?'}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num)}
                    disabled={failed}
                    className="h-14 bg-gray-100 hover:bg-violet-100 disabled:opacity-50 text-xl font-semibold rounded-xl transition-colors"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </>
          )}

          <p className="text-sm text-gray-500 mt-6">Level {level - 2} • Score: {score}%</p>
        </>
      )}
    </div>
  )
}

// Trail Making Game (simplified - number connection)
function TrailMakingGame({ onComplete, onBack }: { onComplete: (score: number) => void, onBack: () => void }) {
  const [numbers, setNumbers] = useState<{num: number, x: number, y: number, clicked: boolean}[]>([])
  const [currentTarget, setCurrentTarget] = useState(1)
  const [startTime] = useState(Date.now())
  const [errors, setErrors] = useState(0)

  useEffect(() => {
    // Generate random positions for numbers 1-10
    const nums = Array.from({ length: 10 }, (_, i) => ({
      num: i + 1,
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 70,
      clicked: false
    }))
    setNumbers(nums)
  }, [])

  const handleCircleClick = (num: number) => {
    if (num === currentTarget) {
      setNumbers(prev => prev.map(n => n.num === num ? { ...n, clicked: true } : n))
      if (currentTarget === 10) {
        const time = (Date.now() - startTime) / 1000
        const timeBonus = Math.max(0, 50 - time * 2)
        const errorPenalty = errors * 10
        const finalScore = Math.max(20, Math.min(100, 50 + timeBonus - errorPenalty))
        onComplete(Math.round(finalScore))
      } else {
        setCurrentTarget(prev => prev + 1)
      }
    } else {
      setErrors(prev => prev + 1)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <h2 className="text-xl font-bold text-gray-900">Trail Making</h2>
        <div className="w-20" />
      </div>

      <p className="text-gray-600 text-center mb-4">
        Click numbers in order: <span className="font-bold text-violet-600">{currentTarget}</span>
      </p>
      <p className="text-sm text-gray-500 text-center mb-4">Errors: {errors}</p>

      <div className="relative w-full h-80 bg-gray-50 rounded-xl border-2 border-gray-200">
        {numbers.map(n => (
          <button
            key={n.num}
            onClick={() => handleCircleClick(n.num)}
            className={`absolute w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
              n.clicked 
                ? 'bg-green-500 text-white' 
                : n.num === currentTarget 
                  ? 'bg-violet-600 text-white scale-110 shadow-lg' 
                  : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-violet-400'
            }`}
            style={{ left: `${n.x}%`, top: `${n.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            {n.num}
          </button>
        ))}
      </div>
    </div>
  )
}

// STRICT Verbal Fluency Game - Predefined animal list, strict validation
const VALID_ANIMALS = [
  'dog', 'cat', 'elephant', 'tiger', 'lion', 'bear', 'wolf', 'fox', 'deer', 'rabbit',
  'horse', 'cow', 'sheep', 'goat', 'pig', 'chicken', 'duck', 'goose', 'turkey', 'eagle',
  'hawk', 'owl', 'parrot', 'crow', 'sparrow', 'pigeon', 'dove', 'swan', 'peacock', 'flamingo',
  'penguin', 'seagull', 'pelican', 'ostrich', 'emu', 'kiwi', 'hummingbird', 'woodpecker', 'robin', 'cardinal',
  'bat', 'rat', 'mouse', 'squirrel', 'chipmunk', 'beaver', 'otter', 'raccoon', 'skunk', 'badger',
  'hedgehog', 'mole', 'hamster', 'gerbil', 'guinea pig', 'chinchilla', 'ferret', 'weasel', 'marten', 'mink',
  'moose', 'elk', 'caribou', 'bison', 'buffalo', 'antelope', 'gazelle', 'giraffe', 'zebra', 'rhinoceros',
  'hippopotamus', 'camel', 'llama', 'alpaca', 'monkey', 'ape', 'gorilla', 'chimpanzee', 'orangutan', 'baboon',
  'lemur', 'sloth', 'anteater', 'armadillo', 'pangolin', 'aardvark', 'hyena', 'jackal', 'coyote', 'cheetah',
  'leopard', 'jaguar', 'panther', 'puma', 'cougar', 'lynx', 'bobcat', 'ocelot', 'serval', 'caracal',
  'whale', 'dolphin', 'porpoise', 'seal', 'sea lion', 'walrus', 'manatee', 'dugong', 'otter', 'narwhal',
  'shark', 'ray', 'eel', 'jellyfish', 'octopus', 'squid', 'crab', 'lobster', 'shrimp', 'oyster',
  'clam', 'snail', 'slug', 'worm', 'spider', 'scorpion', 'centipede', 'millipede', 'insect', 'butterfly',
  'moth', 'bee', 'wasp', 'ant', 'termite', 'beetle', 'dragonfly', 'grasshopper', 'cricket', 'praying mantis',
  'ladybug', 'firefly', 'caterpillar', 'cocoon', 'tadpole', 'frog', 'toad', 'salamander', 'newt', 'lizard',
  'snake', 'turtle', 'tortoise', 'crocodile', 'alligator', 'chameleon', 'iguana', 'gecko', 'cobra', 'python',
  'anaconda', 'rattlesnake', 'viper', 'dinosaur', 'kangaroo', 'wallaby', 'koala', 'wombat', 'platypus', 'echidna',
  'tasmanian devil', 'dingo', 'quokka', 'capybara', 'tapir', 'peccary', 'civet', 'genet', 'mongoose', 'meerkat',
  'warthog', 'wild boar', 'narwhal', 'beluga', 'orca', 'killer whale', 'sperm whale', 'blue whale', 'humpback whale',
  'giant panda', 'red panda', 'polar bear', 'grizzly bear', 'black bear', 'sun bear', 'sloth bear', 'spectacled bear'
]

function VerbalFluencyGame({ onComplete, onBack }: { onComplete: (score: number) => void, onBack: () => void }) {
  const [timeLeft, setTimeLeft] = useState(30) // Reduced to 30 seconds
  const [animals, setAnimals] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [failed, setFailed] = useState(false)
  const [failedAnimal, setFailedAnimal] = useState('')

  useEffect(() => {
    if (isActive && timeLeft > 0 && !failed) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !failed) {
      const score = Math.min(100, animals.length * 8) // 30 seconds, faster scoring
      onComplete(score)
    }
  }, [isActive, timeLeft, animals, failed, onComplete])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (failed) return
    
    const animal = input.trim().toLowerCase()
    
    // STRICT: Check if animal is in valid list
    if (!VALID_ANIMALS.includes(animal)) {
      setFailed(true)
      setFailedAnimal(animal)
      // WRONG ANSWER = 0% (Strict mode)
      const finalScore = 0
      setTimeout(() => onComplete(finalScore), 2000)
      return
    }
    
    // Check for duplicates
    if (animals.includes(animal)) {
      return // Ignore duplicates silently
    }
    
    if (!isActive) {
      setIsActive(true)
    }
    
    setAnimals(prev => [...prev, animal])
    setInput('')
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <h2 className="text-xl font-bold text-gray-900">Verbal Fluency (Strict)</h2>
        <div className="w-20" />
      </div>

      {failed ? (
        <div className="bg-red-50 rounded-xl p-6 border border-red-200 text-center">
          <p className="text-red-700 font-bold text-lg mb-2">❌ Invalid Animal!</p>
          <p className="text-red-600">"{failedAnimal}" is not in our animal database.</p>
          <p className="text-red-500 mt-2">Assessment stopped immediately.</p>
          <p className="text-sm text-gray-500 mt-4">Final Score: 0% (Failed)</p>
        </div>
      ) : (
        <>
          <div className="bg-amber-50 rounded-lg p-3 mb-4 border border-amber-200">
            <p className="text-amber-700 text-sm font-medium">⚠️ STRICT MODE: Invalid animal ends test! Only real animals allowed.</p>
          </div>

          <p className="text-gray-600 text-center mb-4">
            Name valid animals! 30 seconds only.
          </p>

          <div className={`text-center text-4xl font-bold mb-6 ${timeLeft < 10 ? 'text-red-500' : 'text-violet-600'}`}>
            {timeLeft}s
          </div>

          <form onSubmit={handleSubmit} className="mb-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type an animal..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-violet-500 focus:outline-none text-lg"
              autoFocus
              disabled={failed}
            />
          </form>

          <div className="flex flex-wrap gap-2 mb-4">
            {animals.map((animal, i) => (
              <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                {animal}
              </span>
            ))}
          </div>

          <p className="text-center text-gray-500">Valid Animals: {animals.length}</p>
        </>
      )}
    </div>
  )
}

// STRICT Pattern Completion Game - Fails on wrong answer
function PatternCompletionGame({ onComplete, onBack }: { onComplete: (score: number) => void, onBack: () => void }) {
  const [level, setLevel] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [failed, setFailed] = useState(false)
  const [wrongAnswer, setWrongAnswer] = useState('')

  const patterns = [
    { sequence: ['○', '△', '○', '△', '○', '?'], answer: 1, options: ['○', '△', '□'], pattern: 'Circle-Triangle repeating' },
    { sequence: ['🔴', '🔵', '🔴', '🔵', '?'], answer: 1, options: ['🔴', '🔵', '🟢'], pattern: 'Red-Blue alternating' },
    { sequence: ['1', '2', '3', '1', '2', '?'], answer: 2, options: ['1', '2', '3'], pattern: '1-2-3 sequence' },
    { sequence: ['A', 'B', 'C', 'A', 'B', '?'], answer: 2, options: ['A', 'B', 'C'], pattern: 'A-B-C alphabet' },
    { sequence: ['⬆️', '➡️', '⬇️', '⬅️', '⬆️', '?'], answer: 1, options: ['⬆️', '➡️', '⬇️'], pattern: 'Clockwise rotation' },
    { sequence: ['🟥', '🟦', '🟩', '🟥', '🟦', '?'], answer: 2, options: ['🟥', '🟦', '🟩'], pattern: 'Red-Blue-Green' },
  ]

  const current = patterns[level]

  const handleOptionClick = (idx: number) => {
    if (failed) return
    
    // STRICT: Check answer immediately - fail on wrong
    if (idx !== current.answer) {
      setFailed(true)
      setWrongAnswer(current.options[idx])
      // WRONG ANSWER = 0% (Strict mode)
      const finalScore = 0
      setTimeout(() => onComplete(finalScore), 2000)
      return
    }
    
    // Correct answer
    setCorrect(prev => prev + 1)
    
    if (level < patterns.length - 1) {
      setLevel(prev => prev + 1)
    } else {
      // All patterns completed successfully
      setTimeout(() => onComplete(100), 500)
    }
  }

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <h2 className="text-xl font-bold text-gray-900">Pattern Completion (Strict)</h2>
        <div className="w-20" />
      </div>

      {failed ? (
        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
          <p className="text-red-700 font-bold text-lg mb-2">❌ Wrong Answer!</p>
          <p className="text-red-600">Pattern: {current.pattern}</p>
          <p className="text-red-500 mt-2">You selected: {wrongAnswer}</p>
          <p className="text-sm text-gray-500 mt-4">Assessment stopped. Final Score: 0% (Failed)</p>
        </div>
      ) : (
        <>
          <div className="bg-amber-50 rounded-lg p-3 mb-4 border border-amber-200">
            <p className="text-amber-700 text-sm font-medium">⚠️ STRICT MODE: One wrong answer ends the test!</p>
          </div>

          <p className="text-gray-600 mb-2">
            Level {level + 1} of {patterns.length}
          </p>
          <p className="text-sm text-violet-600 mb-4 font-medium">
            Pattern: {current.pattern}
          </p>

          <div className="flex justify-center items-center gap-3 mb-8 text-3xl">
            {current.sequence.map((item, i) => (
              <div key={i} className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                item === '?' ? 'bg-violet-100 border-2 border-violet-400 animate-pulse' : 'bg-gray-100'
              }`}>
                {item}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {current.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleOptionClick(i)}
                disabled={failed}
                className="h-16 bg-gray-100 hover:bg-violet-100 disabled:opacity-50 text-3xl rounded-xl transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>

          <p className="text-sm text-gray-500 mt-6">Correct: {correct}/{patterns.length}</p>
        </>
      )}
    </div>
  )
}
