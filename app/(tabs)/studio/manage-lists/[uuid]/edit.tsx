import { useState } from 'react'
import { useLocalSearchParams, router } from 'expo-router'

import { ListForm } from '@/components/studio/manage-lists/ListForm'
import type { ListFormValues } from '@/components/studio/manage-lists/ListForm'
import { listUpdatedSuccess, listUpdateError } from '@/constants/messages'
import { firstSegmentParam } from '@/lib/routeParams'
import { updateList } from '@/services/restaurantListService'
import { toast } from '@/utils/toast'

export default function EditListScreen(): JSX.Element {
  const params = useLocalSearchParams()
  const uuid = firstSegmentParam(params.uuid)
  // Initial values are passed as route params from the detail screen
  const initialTitle = firstSegmentParam(params.title) || ''
  const initialDescription = firstSegmentParam(params.description) || ''
  const rawVisibility = firstSegmentParam(params.visibility)
  const initialVisibility: 'private' | 'public' =
    rawVisibility === 'public' ? 'public' : 'private'

  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(values: ListFormValues): Promise<void> {
    setSubmitting(true)
    try {
      await updateList({
        list_uuid: uuid,
        title: values.title,
        description: values.description,
        visibility: values.visibility,
      })
      toast.success(listUpdatedSuccess)
      router.back()
    } catch {
      toast.error(listUpdateError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ListForm
      initialValues={{
        title: initialTitle,
        description: initialDescription,
        visibility: initialVisibility,
      }}
      submitLabel="Save Changes"
      submitting={submitting}
      onSubmit={(values) => void handleSubmit(values)}
    />
  )
}
