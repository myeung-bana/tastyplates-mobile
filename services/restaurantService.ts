import { apolloClient } from '@/lib/apollo'
import { gql } from '@apollo/client'

const SAVE_TO_WISHLIST = gql`
  mutation SaveToWishlist($restaurantId: uuid!, $userId: uuid!) {
    insert_wishlists_one(
      object: { restaurant_id: $restaurantId, user_id: $userId }
      on_conflict: { constraint: wishlists_user_id_restaurant_id_key, update_columns: [] }
    ) {
      id
    }
  }
`

const REMOVE_FROM_WISHLIST = gql`
  mutation RemoveFromWishlist($restaurantId: uuid!, $userId: uuid!) {
    delete_wishlists(
      where: { restaurant_id: { _eq: $restaurantId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`

const ADD_CHECKIN = gql`
  mutation AddCheckin($restaurantId: uuid!, $userId: uuid!) {
    insert_checkins_one(object: { restaurant_id: $restaurantId, user_id: $userId }) {
      id
      created_at
    }
  }
`

export const restaurantService = {
  async saveToWishlist(restaurantId: string, userId: string) {
    const { data, errors } = await apolloClient.mutate({
      mutation: SAVE_TO_WISHLIST,
      variables: { restaurantId, userId },
    })
    if (errors?.length) throw new Error(errors[0].message)
    return data?.insert_wishlists_one as { id: string }
  },

  async removeFromWishlist(restaurantId: string, userId: string) {
    const { data, errors } = await apolloClient.mutate({
      mutation: REMOVE_FROM_WISHLIST,
      variables: { restaurantId, userId },
    })
    if (errors?.length) throw new Error(errors[0].message)
    return data?.delete_wishlists?.affected_rows as number
  },

  async addCheckin(restaurantId: string, userId: string) {
    const { data, errors } = await apolloClient.mutate({
      mutation: ADD_CHECKIN,
      variables: { restaurantId, userId },
    })
    if (errors?.length) throw new Error(errors[0].message)
    return data?.insert_checkins_one as { id: string; created_at: string }
  },
}
