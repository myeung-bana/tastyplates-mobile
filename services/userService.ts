import { apolloClient } from '@/lib/apollo'
import { gql } from '@apollo/client'

const FOLLOW_USER = gql`
  mutation FollowUser($followerId: uuid!, $followingId: uuid!) {
    insert_follows_one(
      object: { follower_id: $followerId, following_id: $followingId }
      on_conflict: { constraint: follows_follower_id_following_id_key, update_columns: [] }
    ) {
      id
    }
  }
`

const UNFOLLOW_USER = gql`
  mutation UnfollowUser($followerId: uuid!, $followingId: uuid!) {
    delete_follows(
      where: { follower_id: { _eq: $followerId }, following_id: { _eq: $followingId } }
    ) {
      affected_rows
    }
  }
`

const UPDATE_PROFILE = gql`
  mutation UpdateProfile(
    $userId: uuid!
    $displayName: String
    $bio: String
    $avatarUrl: String
  ) {
    update_users_by_pk(
      pk_columns: { id: $userId }
      _set: { displayName: $displayName, metadata: { bio: $bio, avatarUrl: $avatarUrl } }
    ) {
      id
      displayName
      metadata
    }
  }
`

export const userService = {
  async followUser(followerId: string, followingId: string) {
    const { data, errors } = await apolloClient.mutate({
      mutation: FOLLOW_USER,
      variables: { followerId, followingId },
    })
    if (errors?.length) throw new Error(errors[0].message)
    return data?.insert_follows_one as { id: string }
  },

  async unfollowUser(followerId: string, followingId: string) {
    const { data, errors } = await apolloClient.mutate({
      mutation: UNFOLLOW_USER,
      variables: { followerId, followingId },
    })
    if (errors?.length) throw new Error(errors[0].message)
    return data?.delete_follows?.affected_rows as number
  },

  async updateProfile(params: {
    userId: string
    displayName?: string
    bio?: string
    avatarUrl?: string
  }) {
    const { data, errors } = await apolloClient.mutate({
      mutation: UPDATE_PROFILE,
      variables: params,
    })
    if (errors?.length) throw new Error(errors[0].message)
    return data?.update_users_by_pk as { id: string; displayName: string; metadata: unknown }
  },
}
