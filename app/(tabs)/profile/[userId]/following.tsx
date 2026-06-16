import { ProfileConnectionsScreen } from '@/components/profile/ProfileConnectionsScreen'

/** @deprecated — use `connections` with `tab=following`. */
export default function FollowingScreen(): JSX.Element {
  return <ProfileConnectionsScreen initialTab="following" />
}
