/** Mobile onboarding + profile + reviews — aligned with web `constants/validation.ts`. */

/** Must match `auth.method.emailPassword.passwordMinLength` in `tastyplates-nhost/nhost/nhost.toml`. */
export const minimumPassword = 9

/** Minimum age for account profile birthdate — aligned with web `ageLimit`. */
export const ageLimit = 18

export const userNameMinLimit = 3
export const userNameMaxLimit = 20
export const palateLimit = 2
export const aboutMeMaxLimit = 250
export const reviewDescriptionDisplayLimit = 300

export const imageMBLimit = 5
export const imageSizeLimit = imageMBLimit * 1024 * 1024
export const maximumImage = 6
export const minimumImage = 1
export const reviewTitleMaxLimit = 50
export const reviewDescriptionMaxLimit = 1200
