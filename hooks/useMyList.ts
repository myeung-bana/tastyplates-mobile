import { useCallback, useMemo } from 'react'
import { useMutation, useQuery } from '@apollo/client'

import type { SavedLocationPreference } from '@/constants/locations'
import {
  DELETE_USER_PLACE_COLLECTION,
  MY_LIST_PLACE_ROWS,
  UPSERT_USER_PLACE_COLLECTION,
} from '@/graphql/myLists'

export type MyListPlaceRow = {
  id: string
  user_id: string
  list_type: string
  google_place_id: string
  name: string
  address: string | null
  latitude: number | string | null
  longitude: number | string | null
  image_url: string | null
  google_types: string[] | null
  tastyplates_restaurant_uuid: string | null
  tastyplates_restaurant_slug: string | null
  location_key: string | null
  location_label: string | null
  created_at: string | null
}

export type StudioListKind = 'checkin' | 'like'

export function useMyList(userId: string | undefined | null, listType: StudioListKind) {
  const query = useQuery<{ user_place_collections: MyListPlaceRow[] }>(MY_LIST_PLACE_ROWS, {
    variables:
      userId == null ? undefined : ({ userId, listType } as { userId: string; listType: StudioListKind }),
    skip: userId == null,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'cache-and-network',
  })

  const [runUpsert] = useMutation(UPSERT_USER_PLACE_COLLECTION, {
    refetchQueries:
      userId == null
        ? []
        : [
            { query: MY_LIST_PLACE_ROWS, variables: { userId, listType: 'checkin' as StudioListKind } },
            { query: MY_LIST_PLACE_ROWS, variables: { userId, listType: 'like' as StudioListKind } },
          ],
    awaitRefetchQueries: true,
  })

  const [runDelete] = useMutation(DELETE_USER_PLACE_COLLECTION, {
    refetchQueries:
      userId == null
        ? []
        : [
            { query: MY_LIST_PLACE_ROWS, variables: { userId, listType: 'checkin' as StudioListKind } },
            { query: MY_LIST_PLACE_ROWS, variables: { userId, listType: 'like' as StudioListKind } },
          ],
    awaitRefetchQueries: true,
  })

  const rows = query.data?.user_place_collections ?? []

  const attachPlaceFromGoogleDetails = useCallback(
    async (input: {
      placeId: string
      location: SavedLocationPreference
      kind: StudioListKind
      name: string
      address?: string | null
      latitude?: number | null
      longitude?: number | null
      photoUrl?: string | null
      types?: string[] | null
    }) => {
      if (!userId) throw new Error('Not signed in')
      await runUpsert({
        variables: {
          object: {
            user_id: userId,
            list_type: input.kind,
            google_place_id: input.placeId,
            name: input.name,
            address: input.address ?? null,
            latitude: input.latitude ?? null,
            longitude: input.longitude ?? null,
            image_url: input.photoUrl ?? null,
            google_types: input.types ?? null,
            location_key: input.location.key,
            location_label: input.location.label,
            tastyplates_restaurant_slug: null,
            tastyplates_restaurant_uuid: null,
          },
        },
      })
    },
    [runUpsert, userId],
  )

  const removeRow = useCallback(
    async (id: string) => {
      await runDelete({
        variables: { id },
      })
    },
    [runDelete],
  )

  return useMemo(
    () => ({
      rows,
      loading: query.loading,
      error: query.error,
      refetch: query.refetch,
      attachPlaceFromGoogleDetails,
      removeRow,
    }),
    [
      attachPlaceFromGoogleDetails,
      query.error,
      query.loading,
      query.refetch,
      removeRow,
      rows,
    ],
  )
}
