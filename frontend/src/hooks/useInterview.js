// frontend/src/hooks/useInterview.js
// Interview state machine — controls the full AI interview flow.

import { useState, useRef } from 'react'
import * as api from '../services/api'

/**
 * @param {number} interviewId
 * @param {string} mode - 'simple' or 'adaptive'
 * @returns {Object}
 */
function useInterview(interviewId, mode) {
  // States: loading | ai_speaking | listening | recording | processing | paused | ended | error
  const [phase, setPhase] = useState('loading')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [transcript, setTranscript] = useState([])
  const [attemptId, setAttemptId] = useState(null)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [error, setError] = useState(null)

  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const prevPhaseRef = useRef('listening')

  /**
   * Load questions, create attempt, and start speaking the first question.
   */
  async function startInterview() {
    setPhase('loading')
    setError(null)
    try {
      const res = await api.startInterview(interviewId)
      const data = res.data
      setQuestions(data.questions)
      setAttemptId(data.attemptId)
      setAttemptNumber(data.attemptNumber)
      speakQuestion(data.questions[0].text)
    } catch (err) {
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
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'
    utterance.rate = 0.95

    utterance.onend = () => setPhase('listening')
    utterance.onerror = () => setPhase('listening')

    window.speechSynthesis.speak(utterance)
  }

  /**
   * Start capturing audio from the microphone.
   */
  async function startRecording() {
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recorderRef.current = new MediaRecorder(stream)

      recorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorderRef.current.start()
      setPhase('recording')
    } catch (err) {
      console.error('startRecording failed:', err)
      setError('Microphone access denied. Please allow microphone access and try again.')
      setPhase('error')
    }
  }

  /**
   * Stop recording, send audio to backend, handle next step.
   */
  async function stopRecording() {
    setPhase('processing')

    return new Promise((resolve) => {
      recorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })

        // Release microphone indicator in browser
        recorderRef.current.stream.getTracks().forEach(t => t.stop())

        const currentQuestion = questions[currentIndex]

        try {
          const formData = new FormData()
          formData.append('audio', audioBlob, 'answer.webm')
          formData.append('questionId', String(currentQuestion.id))
          formData.append('mode', mode || 'simple')
          formData.append('attemptId', String(attemptId))

          const res = await api.saveAnswer(interviewId, formData)
          const result = res.data

          setTranscript(prev => [...prev, {
            question: currentQuestion.text,
            answer: result.transcribedText || '',
          }])

          if (result.complete) {
            await handleInterviewComplete()
          } else if (mode === 'adaptive' && result.nextQuestion) {
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
          setPhase('listening')
          resolve(null)
        }
      }

      recorderRef.current.stop()
    })
  }

  /**
   * Mark interview as complete and transition to ended state.
   */
  async function handleInterviewComplete() {
    try {
      await api.completeInterview(interviewId, attemptId)
    } catch (err) {
      console.error('completeInterview failed:', err)
    }
    setPhase('ended')
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
    totalQuestions: questions.length,
    currentIndex,
    error,
    startInterview,
    startRecording,
    stopRecording,
    repeatQuestion,
    pause,
    resume,
  }
}

export default useInterview
