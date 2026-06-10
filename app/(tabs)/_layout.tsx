import { Redirect } from 'expo-router'

import {
  AUTH_VISIBLE_TABS,
  GUEST_VISIBLE_TABS,
  TabsShell,
} from '@/components/navigation/TabsShell'
import { SCREEN_GET_STARTED } from '@/constants/screens'
import { useGetStartedGate } from '@/hooks/useGetStartedGate'
import { useGuestBrowseGate } from '@/hooks/useGuestBrowseGate'
import { useAuth } from '@/hooks/useAuth'
import { loginScreenHref } from '@/lib/authRoutes'

export default function TabsLayout(): JSX.Element | null {
  const { isAuthenticated, loading } = useAuth()
  const getStartedGate = useGetStartedGate()
  const guestGate = useGuestBrowseGate()

  if (loading || !getStartedGate.ready || !guestGate.ready) {
    return null
  }

  if (isAuthenticated) {
    return <TabsShell visibleTabs={AUTH_VISIBLE_TABS} useStudioTabBar />
  }

  if (getStartedGate.showIntro && !guestGate.enabled) {
    return <Redirect href={SCREEN_GET_STARTED} />
  }

  if (!guestGate.enabled) {
    return <Redirect href={loginScreenHref()} />
  }

  return <TabsShell visibleTabs={GUEST_VISIBLE_TABS} />
}
