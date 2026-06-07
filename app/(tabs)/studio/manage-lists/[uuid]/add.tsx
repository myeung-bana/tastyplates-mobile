/**
 * Deep-link route for add-restaurant — renders the same full-screen overlay as in-list flow.
 */
import { router, useLocalSearchParams } from 'expo-router'

import { AddRestaurantOverlayContent } from '@/components/studio/manage-lists/AddRestaurantOverlayContent'
import { firstSegmentParam } from '@/lib/routeParams'

export default function AddRestaurantToListScreen(): JSX.Element | null {
  const params = useLocalSearchParams<{
    uuid?: string | string[]
    title?: string | string[]
  }>()

  const listUuid = firstSegmentParam(params.uuid)
  const listTitle = firstSegmentParam(params.title)

  if (!listUuid) {
    router.back()
    return null
  }

  return (
    <AddRestaurantOverlayContent
      listUuid={listUuid}
      listTitle={listTitle}
      onClose={() => router.back()}
    />
  )
}
