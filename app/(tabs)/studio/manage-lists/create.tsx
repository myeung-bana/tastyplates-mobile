import { useState } from 'react'
import { router } from 'expo-router'

import { ListForm } from '@/components/studio/manage-lists/ListForm'
import type { ListFormValues } from '@/components/studio/manage-lists/ListForm'
import { listCreatedSuccess } from '@/constants/messages'
import { castHref } from '@/lib/routeParams'
import { studioManageListDetailPath } from '@/constants/screens'
import { uploadListCoverPhoto } from '@/lib/listCoverUpload'
import { createList } from '@/services/restaurantListService'
import { toast } from '@/utils/toast'

export default function CreateListScreen(): JSX.Element {
  const [submitting, setSubmitting] = useState(false)
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'upload' | 'save'>('idle')

  async function handleSubmit(values: ListFormValues): Promise<void> {
    setSubmitting(true)
    try {
      let display_pic: string | undefined
      if (values.pendingCover) {
        setSubmitPhase('upload')
        display_pic = await uploadListCoverPhoto(values.pendingCover)
      }
      setSubmitPhase('save')

      const list = await createList({
        title: values.title,
        description: values.description || undefined,
        is_public: values.is_public,
        display_pic,
      })
      toast.success(listCreatedSuccess)
      router.replace({
        pathname: castHref(studioManageListDetailPath(list.uuid)) as never,
        params: { slug: list.slug, title: list.title },
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create list. Please try again.')
    } finally {
      setSubmitting(false)
      setSubmitPhase('idle')
    }
  }

  const submittingLabel =
    submitPhase === 'upload' ? 'Uploading cover…' : submitPhase === 'save' ? 'Creating…' : 'Creating…'

  return (
    <ListForm
      mode="create"
      submitLabel="Create List"
      submittingLabel={submitting ? submittingLabel : undefined}
      submitting={submitting}
      onSubmit={(values) => void handleSubmit(values)}
    />
  )
}
