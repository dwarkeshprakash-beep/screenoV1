// backend/src/services/transcription.service.js
// Audio transcription — Groq Whisper API (external) or local stub.

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

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq transcription failed: ${response.status} ${err}`)
  }

  const text = await response.text()
  return text.trim()
}

/**
 * Local Whisper transcription — Phase 2 only (@huggingface/transformers).
 * Returns a placeholder until the local model is configured.
 * @param {Buffer} audioBuffer
 * @returns {Promise<string>}
 */
async function transcribeLocal(audioBuffer) {
  // Phase 2: replace with @huggingface/transformers whisper-small
  console.error('Local transcription requested but not yet configured — using API fallback note')
  return '[Local transcription not available — please configure local Whisper in Phase 2]'
}

module.exports = { transcribeGroq, transcribeLocal }
