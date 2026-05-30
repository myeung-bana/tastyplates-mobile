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
export const palateExactLimitMessage = (limit: number) => `Please select exactly ${limit} palates.`
export const palateMaxLimitMessage = (limit: number) => `You can only select up to ${limit} palates.`
export const maximumBioLength = (max: number) => `Bio must be ${max} characters or less.`
export const profileUpdateFailed = 'Could not update your profile. Please try again.'
export const profileImageSizeError = 'Profile photo must be 5 MB or smaller.'
export const profileImageTypeError = 'Please choose a JPEG or PNG image.'

export const errorOccurred = 'An Error occurred, Please try again later.'
export const commentedSuccess = 'Replied successfully!'
export const maximumCommentReplies = (max: number) => `Comment must be ${max} characters or less.`

export const requiredDescription = 'Description is required.'
export const maximumReviewTitle = (max: number) => `Review title must be ${max} characters or less.`
export const maximumReviewDescription = (max: number) =>
  `Review description must be ${max} characters or less.`
export const requiredRating = 'Rating is required.'
export const minimumImageLimit = (min: number) => `You must upload at least ${min} image.`
export const maximumImageLimit = (max: number) => `You can upload a maximum of ${max} images.`
export const savedAsDraft = 'Review saved as draft!'
export const commentDuplicateError = "Duplicate comment detected, You've already said that!"
export const commentFloodError = 'You are posting comments too quickly. Slow down.'
export const commentDuplicateWeekError =
  'You can only post one review per week for this restaurant.'

export const removedFromWishlistSuccess = 'You have removed this restaurant from your wishlist!'
export const uncheckInRestaurantSuccess = 'You have removed this restaurant from your checked in!'
export const favoriteStatusError = 'Failed to update favorite status. Please try again.'
export const checkInStatusError = 'Failed to update check-in status. Please try again.'

// ── Manage Lists ──────────────────────────────────────────────────────────────

export const listLoadError = 'Could not load your lists. Pull to refresh or try again.'
export const listDetailLoadError = 'Could not load this list. Pull to refresh or try again.'
export const listCreatedSuccess = 'List created!'
export const listDeletedSuccess = 'List deleted.'
export const listDeleteError = 'Failed to delete list. Please try again.'
export const listUpdatedSuccess = 'List saved!'
export const listUpdateError = 'Failed to save list. Please try again.'
export const listItemAddedSuccess = (name: string) => `"${name}" added to your list.`
export const listItemRemovedSuccess = 'Removed from list.'
export const listItemRemoveError = 'Failed to remove item. Please try again.'
export const listItemDuplicateError = 'Already in this list.'
export const listItemAddError = 'Failed to add restaurant. Please try again.'
export const listDetailEmptyTitle = 'No restaurants added yet'
export const listDetailEmptySubtitle =
  'Add places you want to try or recommend — they will show up here.'

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
