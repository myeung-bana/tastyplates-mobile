import { Redirect } from 'expo-router'

import { SCREEN_ONBOARDING } from '@/constants/screens'

export default function OnboardingIndex(): JSX.Element {
  return <Redirect href={SCREEN_ONBOARDING} />
}
