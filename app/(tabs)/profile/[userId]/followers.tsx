import { ProfileConnectionsScreen } from '@/components/profile/ProfileConnectionsScreen'

/** @deprecated — use `connections` with `tab=followers`. */
export default function FollowersScreen(): JSX.Element {
  return <ProfileConnectionsScreen initialTab="followers" />
}
