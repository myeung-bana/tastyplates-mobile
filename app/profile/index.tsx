import { Redirect } from 'expo-router'

/** Deep links to `/profile` land on the tab shell (bottom nav preserved). */
export default function LegacyProfileRedirect() {
  return <Redirect href="/(tabs)/profile" />
}
