import { Redirect } from 'expo-router'

import { SCREEN_STUDIO_ADD_REVIEW } from '@/constants/screens'

/** Studio hub UI removed — `/studio` deep links land in Create review flow. */
export default function StudioIndexRedirect() {
  return <Redirect href={SCREEN_STUDIO_ADD_REVIEW} />
}
