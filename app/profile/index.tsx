import { Redirect } from 'expo-router'
import { SCREEN_PROFILE } from '@/constants/screens'

export default function ProfileRedirectScreen() {
  return <Redirect href={SCREEN_PROFILE} />
}
