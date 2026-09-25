// backend/src/services/transcription.service.js
// Audio transcription - Groq Whisper API (external) or local stub.

const fetchWithTimeout = require('../utils/fetch-with-timeout')

/**
 * Transcribe audio via Groq Whisper API.
 * Audio buffer is processed here and never stored to disk.
 * @param {Buffer} audioBuffer
 * @param {string} mimeType - e.g. 'audio/webm'
 * @returns {Promise<string>} transcribed text
 */
async function transcribeGroq(audioBuffer, mimeType = 'audio/webm') {
  const formData = new FormData()

  // Create a Blob from the buffer for fetch FormData
  const blob = new Blob([audioBuffer], { type: mimeType })
  formData.append('file', blob, 'audio.webm')
  formData.append('model', 'whisper-large-v3')
  formData.append('language', 'en')
  formData.append('response_format', 'text')

  const response = await fetchWithTimeout('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: formData,
  }, 60000)

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq transcription failed: ${response.status} ${err}`)
  }

  const text = await response.text()
  return text.trim()
}

module.exports = { transcribeGroq }
