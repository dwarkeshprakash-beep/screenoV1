// backend/src/services/llm.service.js
// LLM calls via plain fetch — Groq primary, Gemini fallback.

/**
 * Call Groq chat completions API.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<string>}
 */
async function callGroq(systemPrompt, userPrompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq API failed: ${response.status} ${err}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

/**
 * Call Gemini 2.0 Flash as a fallback.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API failed: ${response.status} ${err}`)
  }

  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

/**
 * Parse JSON from LLM output (strip markdown fences if present).
 * @param {string} text
 * @returns {any}
 */
function parseJSON(text) {
  const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

/**
 * Generate interview questions for a candidate.
 * @param {Object} params
 * @returns {Promise<Array<{text, phase, order_num}>>}
 */
async function generateQuestions({ resume, jd, focusAreas, difficulty, count = 10, mode }) {
  const systemPrompt = `You are an expert technical interviewer. Generate exactly ${count} interview questions as a JSON array.
Each question must have: { "text": "...", "phase": "warmup|technical|scenario|closing", "order_num": N }
Start with 1-2 warmup questions, then technical questions, optionally a scenario, close with 1-2 closing questions.
Difficulty: ${difficulty}. Mode: ${mode === 'adaptive' ? 'adaptive (follow-ups will be generated per answer)' : 'simple (fixed list)'}.
Return ONLY the JSON array, no other text.`

  const userPrompt = `Resume: ${resume || 'Not provided'}
Job Description: ${jd || 'Not provided'}
Focus Areas: ${focusAreas || 'General technical assessment'}`

  let text
  try {
    text = await callGroq(systemPrompt, userPrompt)
  } catch (err) {
    console.error('Groq generateQuestions failed, trying Gemini:', err.message)
    text = await callGemini(`${systemPrompt}\n\n${userPrompt}`)
  }

  try {
    const questions = parseJSON(text)
    return Array.isArray(questions) ? questions : questions.questions || []
  } catch (err) {
    console.error('Failed to parse questions JSON:', err.message)
    // Return basic fallback questions
    return Array.from({ length: count }, (_, i) => ({
      text: i === 0 ? 'Tell me about yourself and your background.' : `Technical question ${i + 1}: Describe a challenging problem you solved recently.`,
      phase: i === 0 ? 'warmup' : i === count - 1 ? 'closing' : 'technical',
      order_num: i + 1,
    }))
  }
}

/**
 * Get the next adaptive question based on conversation history, or null if done.
 * @param {Array<{question, answer}>} conversationHistory
 * @returns {Promise<string|null>}
 */
async function getAdaptiveQuestion(conversationHistory) {
  const systemPrompt = `You are conducting an adaptive interview. Based on the conversation so far, decide:
1. If the interview should end (enough questions asked), respond with exactly: INTERVIEW_COMPLETE
2. Otherwise, respond with ONLY the next question text (no quotes, no JSON, just the question).
Keep the interview focused. End after 8-12 exchanges total.`

  const historyText = conversationHistory
    .map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`)
    .join('\n\n')

  let response
  try {
    response = await callGroq(systemPrompt, historyText)
  } catch (err) {
    console.error('Groq getAdaptiveQuestion failed:', err.message)
    return null
  }

  if (response.trim() === 'INTERVIEW_COMPLETE') return null
  return response.trim()
}

/**
 * Generate an interview report from Q&A answers.
 * @param {string} prompt - pre-built report prompt with candidate info + Q&A
 * @returns {Promise<Object>}
 */
async function generateReport(prompt) {
  const systemPrompt = `You are an expert HR analyst. Analyze this interview and return a JSON object with:
{
  "overall_score": <1-10 number>,
  "confidence": <1-10>,
  "tech_knowledge": <1-10>,
  "communication": <1-10>,
  "summary": "<2-3 sentence executive summary>",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "tips": ["improvement tip 1", "tip 2", "tip 3"]
}
Return ONLY the JSON object, no other text.`

  let text
  try {
    text = await callGroq(systemPrompt, prompt)
  } catch (err) {
    console.error('Groq generateReport failed, trying Gemini:', err.message)
    text = await callGemini(`${systemPrompt}\n\n${prompt}`)
  }

  try {
    return parseJSON(text)
  } catch (err) {
    console.error('Failed to parse report JSON:', err.message)
    return {
      overall_score: 5,
      confidence: 5,
      tech_knowledge: 5,
      communication: 5,
      summary: 'Report generation encountered an issue. Manual review recommended.',
      strengths: [],
      tips: [],
    }
  }
}

module.exports = { generateQuestions, getAdaptiveQuestion, generateReport }
