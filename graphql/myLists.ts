import { gql } from '@apollo/client'

export const MY_LIST_PLACE_ROWS = gql`
  query UserPlaceCollections($userId: uuid!, $listType: String!) {
    user_place_collections(
      where: { user_id: { _eq: $userId }, list_type: { _eq: $listType } }
      order_by: { created_at: desc }
    ) {
      id
      user_id
      list_type
      google_place_id
      name
      address
      latitude
      longitude
      image_url
      google_types
      tastyplates_restaurant_uuid
      tastyplates_restaurant_slug
      location_key
      location_label
      created_at
    }
  }
`

/** Upserts on `(user_id, google_place_id, list_type)` per DB constraint name. */
export const UPSERT_USER_PLACE_COLLECTION = gql`
  mutation UpsertUserPlaceCollection($object: user_place_collections_insert_input!) {
    insert_user_place_collections_one(
      object: $object
      on_conflict: {
        constraint: user_place_collections_user_google_list_unique
        update_columns: [
          name
          address
          latitude
          longitude
          image_url
          google_types
          tastyplates_restaurant_uuid
          tastyplates_restaurant_slug
          location_key
          location_label
        ]
      }
    ) {
      id
    }
  }
`

export const DELETE_USER_PLACE_COLLECTION = gql`
  mutation DeleteUserPlaceCollection($id: uuid!) {
    delete_user_place_collections_by_pk(id: $id) {
      id
    }
  }
`
