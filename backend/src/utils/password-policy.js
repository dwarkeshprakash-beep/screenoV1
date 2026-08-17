const PASSWORD_RULES_MESSAGE = 'Password must be 8-72 characters and include an uppercase letter, a lowercase letter, and a number'

function validatePassword(password) {
  const value = String(password || '')
  if (value.length < 8 || value.length > 72) return PASSWORD_RULES_MESSAGE
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value)) {
    return PASSWORD_RULES_MESSAGE
  }
  return null
}

module.exports = { PASSWORD_RULES_MESSAGE, validatePassword }
