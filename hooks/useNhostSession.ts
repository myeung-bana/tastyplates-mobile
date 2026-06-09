import { useAuthenticationStatus, useUserData } from '@nhost/react'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import type { User } from '@nhost/nhost-js'

const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: bpchar!) {
    user_profiles(where: { user_id: { _eq: $userId } }, limit: 1) {
      user_id
      username
      onboarding_complete
      user {
        id
        displayName
        avatarUrl
        metadata
      }
    }
  }
`

type UserProfileQueryRow = {
  user_id: string
  username?: string | null
  onboarding_complete?: boolean | null
  user?: {
    id: string
    displayName?: string | null
    avatarUrl?: string | null
    metadata?: Record<string, unknown> | null
  } | null
}

export interface UserProfile {
  id: string
  displayName: string | null
  avatarUrl: string | null
  metadata: Record<string, unknown> | null
  username?: string | null
  onboarding_complete?: boolean | null
}

export interface NhostSessionResult {
  authUser: User | null
  profile: UserProfile | null
  loading: boolean
  error: Error | null
}

function mapProfileRow(row: UserProfileQueryRow | undefined): UserProfile | null {
  if (!row?.user_id) return null
  const auth = row.user
  return {
    id: row.user_id,
    displayName: auth?.displayName?.trim() || null,
    avatarUrl: auth?.avatarUrl?.trim() || null,
    metadata:
      auth?.metadata && typeof auth.metadata === 'object'
        ? (auth.metadata as Record<string, unknown>)
        : null,
    username: row.username?.trim() || null,
    onboarding_complete: row.onboarding_complete ?? null,
  }
}

/**
 * Nhost-specific session hook.
 *
 * Extends useSession with a GraphQL fetch of the user's Hasura profile row.
 * Use this when you need metadata beyond what the JWT contains.
 */
export function useNhostSession(): NhostSessionResult {
  const { isLoading: authLoading } = useAuthenticationStatus()
  const authUser = useUserData()

  const { data, loading: profileLoading, error } = useQuery<{
    user_profiles: UserProfileQueryRow[]
  }>(GET_USER_PROFILE, {
    variables: { userId: authUser?.id },
    skip: !authUser?.id,
    errorPolicy: 'ignore',
    fetchPolicy: 'cache-and-network',
  })

  const profile = mapProfileRow(data?.user_profiles?.[0])

  return {
    authUser: authUser ?? null,
    profile,
    loading: authLoading || profileLoading,
    error: error ?? null,
  }
}
