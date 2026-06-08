// frontend/src/hooks/useInterview.js
// Interview state machine — controls the full AI interview flow.

import { useState, useRef } from 'react'
import * as api from '../services/api'

/**
 * @param {number} interviewId
 * @param {string} mode - 'simple' or 'adaptive'
 * @returns {Object}
 */
function useInterview(interviewId, mode, transcriptionMode = 'api') {
  // States: loading | ai_speaking | listening | recording | processing | paused | ended | error
  const [phase, setPhase] = useState('loading')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [transcript, setTranscript] = useState([])
  const [liveTranscript, setLiveTranscript] = useState('')
  const [attemptId, setAttemptId] = useState(null)
  const [interviewMode, setInterviewMode] = useState(mode || 'simple')
  const [error, setError] = useState(null)
  const [manualRetry, setManualRetry] = useState(null)

  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const simulatedRecordingRef = useRef(false)
  const prevPhaseRef = useRef('listening')
  const startedRef = useRef(false)
  const speechFallbackRef = useRef(null)

  /**
   * Write interview diagnostics to the browser console in development.
   * @param {string} label
   * @param {Object} data
   */
  function logInterviewDebug(label, data) {
    if (!import.meta.env.DEV) return
    console.groupCollapsed(`[Screeno AI] ${label}`)
    console.info(data)
    console.groupEnd()
  }

  /**
   * Configure and start MediaRecorder for a supplied audio stream.
   * @param {MediaStream} stream
   */
  function beginRecording(stream) {
    simulatedRecordingRef.current = false
    const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    const mimeType = preferredTypes.find(type => MediaRecorder.isTypeSupported(type))
    recorderRef.current = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)

    recorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }

    recorderRef.current.start()
    setPhase('recording')
  }

  /**
   * Use a deterministic recorder in development so device permissions do not
   * block the candidate flow during local testing.
   */
  function beginDevelopmentRecording() {
    simulatedRecordingRef.current = true
    chunksRef.current = [new Blob(['screeno development audio'], { type: 'audio/webm' })]
    recorderRef.current = {
      mimeType: 'audio/webm',
      state: 'recording',
      stream: { getTracks: () => [] },
      onstop: null,
      stop() {
        this.state = 'inactive'
        queueMicrotask(() => this.onstop?.())
      },
    }
    setPhase('recording')
  }

  const speechRecognitionRef = useRef(null)
  const speechRecognitionActiveRef = useRef(false)
  const liveTranscriptRef = useRef('')
  const liveFinalTranscriptRef = useRef('')

  function setLiveTranscriptValue(value) {
    liveTranscriptRef.current = value
    setLiveTranscript(value)
  }

  function stopLiveRecognition() {
    speechRecognitionActiveRef.current = false
    if (!speechRecognitionRef.current) return

    try {
      speechRecognitionRef.current.onend = null
      speechRecognitionRef.current.stop()
    } catch {
      // Browser speech recognition may already be stopped.
    }
    speechRecognitionRef.current = null
  }

  function startLiveRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    stopLiveRecognition()
    liveFinalTranscriptRef.current = ''
    setLiveTranscriptValue('')

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-IN'

    recognition.onresult = (event) => {
      let interim = ''
      let finalText = liveFinalTranscriptRef.current

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript || ''
        if (event.results[i].isFinal) finalText += `${text} `
        else interim += text
      }

      liveFinalTranscriptRef.current = finalText
      setLiveTranscriptValue(`${finalText}${interim}`.trim())
    }

    recognition.onerror = (event) => {
      console.warn('Live speech recognition failed:', event.error || event)
    }

    recognition.onend = () => {
      if (!speechRecognitionActiveRef.current) return
      try {
        recognition.start()
      } catch {
        // Some browsers throw if restart happens too quickly.
      }
    }

    speechRecognitionActiveRef.current = true
    speechRecognitionRef.current = recognition

    try {
      recognition.start()
    } catch (err) {
      console.warn('Live speech recognition could not start:', err)
    }
  }

  /**
   * Load questions, create attempt, and start speaking the first question.
   */
  async function startInterview() {
    if (startedRef.current || !interviewId) return
    startedRef.current = true
    setPhase('loading')
    setError(null)
    try {
      const res = await api.startInterview(interviewId)
      const data = res.data
      if (!data.questions?.length) {
        await api.completeInterview(interviewId, data.attemptId)
        setPhase('ended')
        return
      }
      setQuestions(data.questions)
      setAttemptId(data.attemptId)
      setInterviewMode(data.mode || mode || 'simple')
      setTranscript(data.transcript || [])
      logInterviewDebug('Interview started', {
        interviewId,
        attemptId: data.attemptId,
        mode: data.mode || mode || 'simple',
        behavior: (data.mode || mode) === 'adaptive'
          ? 'Questions are generated one by one from previous answers.'
          : 'A fixed set of 10 questions is generated before the interview.',
        questions: data.questions.map((question, index) => ({
          number: index + 1,
          id: question.id,
          text: question.text,
        })),
      })
      speakQuestion(data.questions[0].text)
    } catch (err) {
      startedRef.current = false
      console.error('startInterview failed:', err)
      setError(err.message || 'Could not start interview. Please try again.')
      setPhase('error')
    }
  }

  /**
   * Use browser TTS to speak the current question.
   * @param {string} text
   */
  function speakQuestion(text) {
    setPhase('ai_speaking')
    window.clearTimeout(speechFallbackRef.current)

    const finishSpeaking = () => {
      window.clearTimeout(speechFallbackRef.current)
      setPhase(current => current === 'ai_speaking' ? 'listening' : current)
    }

    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      finishSpeaking()
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'
    utterance.rate = 0.95

    utterance.onend = finishSpeaking
    utterance.onerror = finishSpeaking

    speechFallbackRef.current = window.setTimeout(
      finishSpeaking,
      Math.min(5000, Math.max(2500, text.length * 35))
    )

    try {
      window.speechSynthesis.speak(utterance)
    } catch (err) {
      console.error('speechSynthesis failed:', err)
      finishSpeaking()
    }
  }

  /**
   * Start capturing audio from the microphone.
   */
  async function startRecording() {
    if (recorderRef.current && recorderRef.current.state === 'recording') return

    setError(null)
    chunksRef.current = []
    window.clearTimeout(speechFallbackRef.current)
    window.speechSynthesis?.cancel()
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('Audio recording is not supported')
      }

      let timeoutId
      const permissionTimeout = new Promise((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error('Microphone permission timed out')),
          5000
        )
      })
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        permissionTimeout,
      ])
      window.clearTimeout(timeoutId)
      beginRecording(stream)
      startLiveRecognition()
    } catch (err) {
      console.error('startRecording failed:', err)
      stopLiveRecognition()
      if (import.meta.env.DEV && localStorage.getItem('screenoDeviceBypass') === 'true') {
        beginDevelopmentRecording()
        setError('Microphone unavailable. Local test mode is using simulated audio.')
        return
      }
      setError('Microphone access was not granted. Allow it in the browser and try again.')
      setPhase('listening')
    }
  }

  /**
   * Stop recording, send audio to backend, handle next step.
   */
  async function stopRecording() {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') {
      setError('Recording did not start. Please try again.')
      setPhase('listening')
      return null
    }

    setPhase('processing')
    stopLiveRecognition()
    const clientTranscript = liveTranscriptRef.current.trim()

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        const audioType = recorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(chunksRef.current, { type: audioType })

        // Release microphone indicator in browser
        recorder.stream.getTracks().forEach(t => t.stop())
        const currentQuestion = questions[currentIndex]
        if (!currentQuestion?.id || audioBlob.size === 0) {
          setError('No audio was captured. Please record your answer again.')
          setPhase('listening')
          resolve(null)
          return
        }

        try {
          const formData = new FormData()
          const extension = audioType.includes('mp4') ? 'mp4' : 'webm'
          formData.append('audio', audioBlob, `answer.${extension}`)
          formData.append('questionId', String(currentQuestion.id))
          formData.append('mode', interviewMode)
          formData.append('transcriptionMode', transcriptionMode)
          formData.append('attemptId', String(attemptId))
          formData.append('developmentFallback', String(simulatedRecordingRef.current))
          if (clientTranscript) formData.append('clientTranscript', clientTranscript)

          const res = await api.saveAnswer(interviewId, formData)
          const result = res.data

          setTranscript(prev => [
            ...prev,
            { who: 'ai', text: currentQuestion.text },
            { who: 'candidate', text: result.transcribedText || '' },
          ])
          logInterviewDebug(`Question ${currentIndex + 1} answered`, {
            mode: interviewMode,
            question: currentQuestion.text,
            answer: result.transcribedText || '',
            nextQuestion: result.nextQuestion?.text || null,
            complete: Boolean(result.complete),
          })

          if (result.complete) {
            await handleInterviewComplete()
          } else if (interviewMode === 'adaptive' && result.nextQuestion) {
            setQuestions(prev => [...prev, result.nextQuestion])
            setCurrentIndex(prev => prev + 1)
            speakQuestion(result.nextQuestion.text)
          } else {
            const nextIndex = currentIndex + 1
            if (nextIndex >= questions.length) {
              await handleInterviewComplete()
            } else {
              setCurrentIndex(nextIndex)
              speakQuestion(questions[nextIndex].text)
            }
          }

          resolve(result)
        } catch (err) {
          console.error('stopRecording/saveAnswer failed:', err)
          if (err.message?.includes('Transcription failed')) {
            setManualRetry(currentQuestion)
          }
          setError(err.message || 'Could not save your answer. Please try again.')
          setPhase('listening')
          resolve(null)
        } finally {
          setLiveTranscriptValue('')
        }
      }

      recorder.stop()
    })
  }

  /**
   * Mark interview as complete and transition to ended state.
   */
  async function handleInterviewComplete() {
    await finishInterview('completed')
  }

  async function finishInterview(status = 'completed') {
    try {
      await api.completeInterview(interviewId, attemptId, status)
    } catch (err) {
      console.error('completeInterview failed:', err)
      setError('Could not submit the interview. Please try again.')
      return
    }
    setPhase('ended')
  }

  async function submitManualAnswer(answerText) {
    if (!manualRetry || !answerText.trim()) return null
    setPhase('processing')
    setError(null)
    try {
      const res = await api.saveTextAnswer(interviewId, {
        questionId: manualRetry.id,
        mode: interviewMode,
        attemptId,
        answerText,
      })
      const result = res.data
      setManualRetry(null)
      setTranscript(prev => [
        ...prev,
        { who: 'ai', text: manualRetry.text },
        { who: 'candidate', text: result.transcribedText || answerText },
      ])
      if (result.complete) {
        await handleInterviewComplete()
      } else if (interviewMode === 'adaptive' && result.nextQuestion) {
        setQuestions(prev => [...prev, result.nextQuestion])
        setCurrentIndex(prev => prev + 1)
        speakQuestion(result.nextQuestion.text)
      } else {
        const nextIndex = currentIndex + 1
        if (nextIndex >= questions.length) await handleInterviewComplete()
        else {
          setCurrentIndex(nextIndex)
          speakQuestion(questions[nextIndex].text)
        }
      }
      return result
    } catch (err) {
      setError(err.message || 'Could not save your answer.')
      setPhase('listening')
      return null
    }
  }

  /**
   * Repeat the current question aloud.
   */
  function repeatQuestion() {
    const q = questions[currentIndex]
    if (q) speakQuestion(q.text)
  }

  /**
   * Pause due to an integrity violation.
   */
  function pause() {
    prevPhaseRef.current = phase
    window.speechSynthesis.pause()
    setPhase('paused')
  }

  /**
   * Resume from paused state.
   */
  function resume() {
    window.speechSynthesis.resume()
    setPhase(prevPhaseRef.current || 'listening')
  }

  return {
    phase,
    currentQuestion: questions[currentIndex] || null,
    transcript,
    liveTranscript,
    totalQuestions: questions.length,
    currentIndex,
    interviewMode,
    attemptId,
    error,
    manualRetry,
    startInterview,
    startRecording,
    stopRecording,
    repeatQuestion,
    pause,
    resume,
    finishInterview,
    submitManualAnswer,
  }
}

export default useInterview
