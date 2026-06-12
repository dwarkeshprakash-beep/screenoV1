// backend/src/services/judge.service.js
// Runs candidate code against test cases via the free hosted Piston judge API.
// No API key required — see https://github.com/engineer-man/piston

const PISTON_URL = 'https://emkc.org/api/v2/piston/execute'
const fetchWithTimeout = require('../utils/fetch-with-timeout')

const LANGUAGE_VERSIONS = {
  javascript: '18.15.0',
  python: '3.10.0',
}

const LANGUAGE_FILENAMES = {
  javascript: 'main.js',
  python: 'main.py',
}

/**
 * Run a single piece of code with the given stdin via Piston.
 * @param {string} language - 'javascript' | 'python'
 * @param {string} code
 * @param {string} stdin
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
async function runCode(language, code, stdin = '') {
  const lang = LANGUAGE_VERSIONS[language] ? language : 'javascript'
  const res = await fetchWithTimeout(PISTON_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: lang,
      version: LANGUAGE_VERSIONS[lang],
      files: [{ name: LANGUAGE_FILENAMES[lang], content: code }],
      stdin: stdin || '',
    }),
  }, 15000)

  if (!res.ok) throw new Error(`Judge request failed (${res.status})`)
  const data = await res.json()
  return {
    stdout: (data.run?.stdout || '').trim(),
    stderr: (data.run?.stderr || data.compile?.stderr || '').trim(),
  }
}

/**
 * Run code against a list of { input, expected_output } test cases.
 * @param {string} language
 * @param {string} code
 * @param {Array<{input: string, expected_output: string, hidden?: boolean}>} testCases
 * @returns {Promise<Array<{passed: boolean, error: string|null}>>}
 */
async function runTestCases(language, code, testCases) {
  const results = []
  for (const testCase of testCases) {
    try {
      const { stdout, stderr } = await runCode(language, code, testCase.input || '')
      results.push({
        passed: !stderr && stdout === String(testCase.expected_output ?? '').trim(),
        error: stderr || null,
      })
    } catch (err) {
      results.push({ passed: false, error: err.message })
    }
  }
  return results
}

module.exports = { runCode, runTestCases, LANGUAGE_VERSIONS }
