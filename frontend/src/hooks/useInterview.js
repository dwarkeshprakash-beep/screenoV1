import { useCallback, useRef, useState } from 'react'
import * as api from '../services/api'

function useInterview(interviewId, mode, transcriptionMode = 'api') {
  const [phase, setPhase] = useState('loading')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [transcript, setTranscript] = useState([])
  const [liveTranscript, setLiveTranscript] = useState('')
  const [interviewMode, setInterviewMode] = useState(mode || 'simple')
  const [error, setError] = useState(null)
  const [manualRetry, setManualRetry] = useState(null)

  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const prevPhaseRef = useRef('listening')
  const startedRef = useRef(false)
  const speechFallbackRef = useRef(null)
  const speechRecognitionRef = useRef(null)
  const speechRecognitionActiveRef = useRef(false)
  const liveTranscriptRef = useRef('')
  const liveFinalTranscriptRef = useRef('')

  function logInterviewDebug(label, data) {
    if (!import.meta.env.DEV) return
    console.groupCollapsed(`[Screeno AI] ${label}`)
    console.info(data)
    console.groupEnd()
  }

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
      // Recognition may already be stopped by the browser.
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
    recognition.onresult = event => {
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
    recognition.onerror = event => {
      console.warn('Live speech recognition failed:', event.error || event)
    }
    recognition.onend = () => {
      if (!speechRecognitionActiveRef.current) return
      try {
        recognition.start()
      } catch {
        // Some browsers reject an immediate restart.
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

  const speakQuestion = useCallback(text => {
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
      Math.max(4000, text.length * 120)
    )

    try {
      window.speechSynthesis.speak(utterance)
    } catch (err) {
      console.error('speechSynthesis failed:', err)
      finishSpeaking()
    }
  }, [])

  const startInterview = useCallback(async () => {
    if (startedRef.current || !interviewId) return
    startedRef.current = true
    setPhase('loading')
    setError(null)
    try {
      const response = await api.startInterview(interviewId)
      const data = response.data
      if (!data.questions?.length) {
        await api.completeInterview(interviewId)
        setPhase('ended')
        return
      }

      const resumeIndex = Math.min(
        Math.max(Number(data.currentIndex) || 0, 0),
        data.questions.length
      )
      setQuestions(data.questions)
      setCurrentIndex(resumeIndex)
      setInterviewMode(data.mode || mode || 'simple')
      setTranscript(data.transcript || [])
      logInterviewDebug('Interview started', {
        interviewId,
        resumeIndex,
        mode: data.mode || mode || 'simple',
        questions: data.questions.map((question, index) => ({
          number: index + 1,
          id: question.id,
          text: question.text,
        })),
      })

      if (resumeIndex >= data.questions.length) {
        await api.completeInterview(interviewId)
        setPhase('ended')
      } else {
        speakQuestion(data.questions[resumeIndex].text)
      }
    } catch (err) {
      startedRef.current = false
      console.error('startInterview failed:', err)
      setError(err.message || 'Could not start interview. Please try again.')
      setPhase('error')
    }
  }, [interviewId, mode, speakQuestion])

  async function startRecording() {
    if (recorderRef.current?.state === 'recording') return
    setError(null)
    chunksRef.current = []
    window.clearTimeout(speechFallbackRef.current)
    window.speechSynthesis?.cancel()

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('Audio recording is not supported')
      }
      let timeoutId
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise((_, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error('Microphone permission timed out')),
            10000
          )
        }),
      ])
      window.clearTimeout(timeoutId)

      const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      const mimeType = preferredTypes.find(type => MediaRecorder.isTypeSupported(type))
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorderRef.current = recorder
      recorder.start()
      startLiveRecognition()
      setPhase('recording')
    } catch (err) {
      console.error('startRecording failed:', err)
      stopLiveRecognition()
      setError('Microphone access was not granted. Allow it in the browser and try again.')
      setPhase('listening')
    }
  }

  const finishInterview = useCallback(async (status = 'completed') => {
    try {
      await api.completeInterview(interviewId, status)
      setPhase('ended')
    } catch (err) {
      console.error('completeInterview failed:', err)
      setError('Could not submit the interview. Please try again.')
    }
  }, [interviewId])

  async function advanceAfterAnswer(result, currentQuestion) {
    setTranscript(previous => [
      ...previous,
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
      await finishInterview('completed')
    } else if (interviewMode === 'adaptive' && result.nextQuestion) {
      setQuestions(previous => [...previous, result.nextQuestion])
      setCurrentIndex(previous => previous + 1)
      speakQuestion(result.nextQuestion.text)
    } else {
      const nextIndex = currentIndex + 1
      if (nextIndex >= questions.length) await finishInterview('completed')
      else {
        setCurrentIndex(nextIndex)
        speakQuestion(questions[nextIndex].text)
      }
    }
  }

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

    return new Promise(resolve => {
      recorder.onstop = async () => {
        const audioType = recorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(chunksRef.current, { type: audioType })
        recorder.stream.getTracks().forEach(track => track.stop())
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
          if (clientTranscript) formData.append('clientTranscript', clientTranscript)

          const response = await api.saveAnswer(interviewId, formData)
          await advanceAfterAnswer(response.data, currentQuestion)
          resolve(response.data)
        } catch (err) {
          console.error('stopRecording/saveAnswer failed:', err)
          if (err.message?.includes('Transcription failed')) setManualRetry(currentQuestion)
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

  async function submitManualAnswer(answerText) {
    if (!manualRetry || !answerText.trim()) return null
    setPhase('processing')
    setError(null)
    try {
      const response = await api.saveTextAnswer(interviewId, {
        questionId: manualRetry.id,
        mode: interviewMode,
        answerText,
      })
      const question = manualRetry
      setManualRetry(null)
      await advanceAfterAnswer(response.data, question)
      return response.data
    } catch (err) {
      setError(err.message || 'Could not save your answer.')
      setPhase('listening')
      return null
    }
  }

  function repeatQuestion() {
    const question = questions[currentIndex]
    if (question) speakQuestion(question.text)
  }

  function pause() {
    prevPhaseRef.current = phase
    window.speechSynthesis?.pause()
    setPhase('paused')
  }

  function resume() {
    window.speechSynthesis?.resume()
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
