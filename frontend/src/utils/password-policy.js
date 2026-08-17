export const PASSWORD_RULES = 'Use 8-72 characters with at least one uppercase letter, one lowercase letter, and one number.'

export function validatePassword(password) {
  const value = String(password || '')
  if (value.length < 8 || value.length > 72 || !/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value)) {
    return PASSWORD_RULES
  }
  return null
}
