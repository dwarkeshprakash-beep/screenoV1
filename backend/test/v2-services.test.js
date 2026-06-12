const test = require('node:test')
const assert = require('node:assert/strict')

const { hashToken } = require('../src/services/auth.service')
const { fromUser, assertInterviewScope } = require('../src/services/candidate-identity.service')
const { publicQuestion } = require('../src/services/exam.service')
const { parseArray } = require('../src/services/monthly-assessment.service')
const { parseCSV } = require('../src/services/team.service')
const fetchWithTimeout = require('../src/utils/fetch-with-timeout')

test('hashToken creates a stable SHA-256 digest without storing the raw token', () => {
  const raw = 'candidate-magic-link'
  const digest = hashToken(raw)

  assert.equal(digest.length, 64)
  assert.notEqual(digest, raw)
  assert.equal(
    digest,
    'b452d98d84d081b22f109b2d0c07218eccfedf371dc6e12c433f0db962cd6827'
  )
})

test('candidate identity distinguishes internal and external candidates', () => {
  assert.deepEqual(
    fromUser({ id: 14, role: 'candidate', interviewId: 9 }),
    { internalUserId: 14, externalCandidateId: null, interviewId: 9 }
  )
  assert.deepEqual(
    fromUser({ id: 9, role: 'candidate', externalCandidateId: 7, interviewId: 12 }),
    { internalUserId: null, externalCandidateId: 7, interviewId: 12 }
  )
})

test('candidate interview scope rejects a token for another interview', () => {
  assert.doesNotThrow(() => assertInterviewScope({ interviewId: 4 }, 4))
  assert.throws(
    () => assertInterviewScope({ interviewId: 4 }, 5),
    /Unauthorized/
  )
})

test('publicQuestion removes answer keys and hidden test-case details', () => {
  const question = publicQuestion({
    id: 1,
    text: 'Solve it',
    answer: 'candidate answer',
    correct_answer: 2,
    reference_solution: 'secret solution',
    test_cases: [
      { input: '1', expected_output: '2', hidden: false },
      { input: '99', expected_output: '100', hidden: true },
    ],
  })

  assert.equal(question.answer, undefined)
  assert.equal(question.correct_answer, undefined)
  assert.equal(question.reference_solution, undefined)
  assert.deepEqual(question.test_cases[1], { hidden: true })
  assert.equal(question.test_cases[0].expected_output, '2')
})

test('parseArray accepts JSON arrays and rejects malformed values', () => {
  assert.deepEqual(parseArray('["React","Node.js"]'), ['React', 'Node.js'])
  assert.deepEqual(parseArray(['SQL']), ['SQL'])
  assert.deepEqual(parseArray('{"not":"an array"}'), [])
  assert.deepEqual(parseArray('not-json'), [])
})

test('parseCSV handles quoted commas, escaped quotes, and CRLF rows', () => {
  const rows = parseCSV(
    'firstName,lastName,email,position\r\n' +
    '"Asha","Patel","asha@example.com","Engineer, Platform"\r\n' +
    '"Ravi","Shah","ravi@example.com","Senior ""Cloud"" Engineer"\r\n'
  )

  assert.deepEqual(rows, [
    ['firstName', 'lastName', 'email', 'position'],
    ['Asha', 'Patel', 'asha@example.com', 'Engineer, Platform'],
    ['Ravi', 'Shah', 'ravi@example.com', 'Senior "Cloud" Engineer'],
  ])
})

test('fetchWithTimeout returns completed requests and aborts stalled providers', async () => {
  const originalFetch = global.fetch
  try {
    global.fetch = async () => ({ ok: true })
    assert.equal((await fetchWithTimeout('https://example.test', {}, 25)).ok, true)

    global.fetch = async (url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => {
        const err = new Error('aborted')
        err.name = 'AbortError'
        reject(err)
      })
    })
    await assert.rejects(
      fetchWithTimeout('https://example.test', {}, 5),
      /External request timed out after 5ms/
    )
  } finally {
    global.fetch = originalFetch
  }
})
