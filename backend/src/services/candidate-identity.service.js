// Only ever called from a route already gated by requireModule('interviews'/'feedback'/
// 'outcomes') or the magic-link session token (scoped to one interview by construction) -
// the caller's own id/externalCandidateId is what identifies "their" rows.
function fromUser(user) {
  const externalCandidateId = user.externalCandidateId || null
  const internalUserId = user.internalUserId
    || (!externalCandidateId ? user.id : null)
  return {
    internalUserId: internalUserId || null,
    externalCandidateId,
    interviewId: user.interviewId || null,
  }
}

function assertInterviewScope(identity, interviewId) {
  // Interview action endpoints (start/answer/complete) must only be called via
  // a magic-link JWT that is scoped to a specific interview. Dashboard JWTs
  // (identity.interviewId === null) are not authorised to call these actions.
  if (!identity.interviewId) {
    throw new Error('Unauthorized: use your magic link to access this interview')
  }
  if (Number(identity.interviewId) !== Number(interviewId)) {
    throw new Error('Unauthorized')
  }
}

module.exports = { fromUser, assertInterviewScope }
