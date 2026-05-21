/** Dev-only skips in auth/onboarding — set `EXPO_PUBLIC_DEV_MODE=true` locally; never in production. */
export const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true'
