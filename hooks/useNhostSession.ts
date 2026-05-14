import { useAuthenticationStatus, useUserData } from '@nhost/react'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import type { User } from '@nhost/nhost-js'

const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: uuid!) {
    users_by_pk(id: $userId) {
      id
      displayName
      avatarUrl
      metadata
    }
  }
`

export interface UserProfile {
  id: string
  displayName: string | null
  avatarUrl: string | null
  metadata: Record<string, unknown> | null
}

export interface NhostSessionResult {
  authUser: User | null
  profile: UserProfile | null
  loading: boolean
  error: Error | null
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

  const { data, loading: profileLoading, error } = useQuery(GET_USER_PROFILE, {
    variables: { userId: authUser?.id },
    skip: !authUser?.id,
  })

  return {
    authUser: authUser ?? null,
    profile: (data?.users_by_pk as UserProfile) ?? null,
    loading: authLoading || profileLoading,
    error: error ?? null,
  }
}
