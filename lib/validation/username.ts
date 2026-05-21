import { userNameMaxLimit, userNameMinLimit } from '@/constants/validation'

export type UsernameValidationErrorKey =
  | 'usernameRequired'
  | 'usernameTooShort'
  | 'usernameTooLong'
  | 'usernameNoSpaces'
  | 'usernameInvalidCharacters'
  | 'usernameCannotStartWithSpecial'
  | 'usernameCannotEndWithSpecial'
  | 'usernameCannotBeAllNumbers'
  | 'usernameNoConsecutiveSpecial'

export interface UsernameValidationResult {
  isValid: boolean
  error?: UsernameValidationErrorKey
}

/**
 * Validates username policy (port of web `validateUsername`).
 */
export function validateUsername(username: string): UsernameValidationResult {
  const trimmed = username.trim()

  if (!trimmed) {
    return { isValid: false, error: 'usernameRequired' }
  }

  if (trimmed.length < userNameMinLimit) {
    return { isValid: false, error: 'usernameTooShort' }
  }

  if (trimmed.length > userNameMaxLimit) {
    return { isValid: false, error: 'usernameTooLong' }
  }

  if (/\s/.test(trimmed)) {
    return { isValid: false, error: 'usernameNoSpaces' }
  }

  const allowedPattern = /^[a-zA-Z0-9_-]+$/
  if (!allowedPattern.test(trimmed)) {
    return { isValid: false, error: 'usernameInvalidCharacters' }
  }

  if (/^[_-]/.test(trimmed)) {
    return { isValid: false, error: 'usernameCannotStartWithSpecial' }
  }

  if (/[_-]$/.test(trimmed)) {
    return { isValid: false, error: 'usernameCannotEndWithSpecial' }
  }

  if (/^\d+$/.test(trimmed)) {
    return { isValid: false, error: 'usernameCannotBeAllNumbers' }
  }

  if (/[_-]{2,}/.test(trimmed)) {
    return { isValid: false, error: 'usernameNoConsecutiveSpecial' }
  }

  return { isValid: true }
}
