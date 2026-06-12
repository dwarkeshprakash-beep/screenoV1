function fromUser(user) {
  const externalCandidateId = user.externalCandidateId || null
  const internalUserId = user.internalUserId
    || (!externalCandidateId && user.role === 'candidate' ? user.id : null)
  return {
    internalUserId: internalUserId || null,
    externalCandidateId,
    interviewId: user.interviewId || null,
  }
}

function assertInterviewScope(identity, interviewId) {
  if (identity.interviewId && Number(identity.interviewId) !== Number(interviewId)) {
    throw new Error('Unauthorized')
  }
}

module.exports = { fromUser, assertInterviewScope }
