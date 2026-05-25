import { useState } from 'react'
import { router } from 'expo-router'

import { ListForm } from '@/components/studio/manage-lists/ListForm'
import type { ListFormValues } from '@/components/studio/manage-lists/ListForm'
import { listCreatedSuccess } from '@/constants/messages'
import { castHref } from '@/lib/routeParams'
import { studioManageListDetailPath } from '@/constants/screens'
import { createList } from '@/services/restaurantListService'
import { toast } from '@/utils/toast'

export default function CreateListScreen(): JSX.Element {
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(values: ListFormValues): Promise<void> {
    setSubmitting(true)
    try {
      const list = await createList({
        title: values.title,
        description: values.description || undefined,
        visibility: values.visibility,
      })
      toast.success(listCreatedSuccess)
      // Navigate to detail; pass slug so detail can load immediately
      router.replace({
        pathname: castHref(studioManageListDetailPath(list.uuid)) as never,
        params: { slug: list.slug, title: list.title },
      })
    } catch {
      toast.error('Failed to create list. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ListForm
      variant="create"
      submitLabel="Create List"
      submitting={submitting}
      onSubmit={(values) => void handleSubmit(values)}
    />
  )
}

