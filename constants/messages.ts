import { userNameMaxLimit, userNameMinLimit } from '@/constants/validation'

export const usernameValidationLimit = (min: number, max: number) =>
  `Username must be ${min}-${max} characters.`

export const usernameRequired = 'Username is required.'
export const usernameTooShort = 'Username must be at least 3 characters long.'
export const usernameTooLong = 'Username must be 20 characters or less.'
export const usernameNoSpaces = 'Username cannot contain spaces.'
export const usernameInvalidCharacters =
  'Username can only contain letters, numbers, underscores (_), and hyphens (-).'
export const usernameCannotStartWithSpecial = 'Username cannot start with an underscore or hyphen.'
export const usernameCannotEndWithSpecial = 'Username cannot end with an underscore or hyphen.'
export const usernameCannotBeAllNumbers = 'Username cannot be all numbers.'
export const usernameNoConsecutiveSpecial =
  'Username cannot contain consecutive underscores or hyphens.'

export const usernameCheckError = 'Error checking username availability'
export const usernameNotAvailable = 'This username is already taken.'

export const palateRequired = 'Please select at least one palate.'
export const palateMaxLimitMessage = (limit: number) => `You can only select up to ${limit} palates.`

export function getUsernameErrorMessage(errorKey: string): string {
  switch (errorKey) {
    case 'usernameRequired':
      return usernameRequired
    case 'usernameTooShort':
      return usernameTooShort
    case 'usernameTooLong':
      return usernameTooLong
    case 'usernameNoSpaces':
      return usernameNoSpaces
    case 'usernameInvalidCharacters':
      return usernameInvalidCharacters
    case 'usernameCannotStartWithSpecial':
      return usernameCannotStartWithSpecial
    case 'usernameCannotEndWithSpecial':
      return usernameCannotEndWithSpecial
    case 'usernameCannotBeAllNumbers':
      return usernameCannotBeAllNumbers
    case 'usernameNoConsecutiveSpecial':
      return usernameNoConsecutiveSpecial
    default:
      return usernameValidationLimit(userNameMinLimit, userNameMaxLimit)
  }
}
