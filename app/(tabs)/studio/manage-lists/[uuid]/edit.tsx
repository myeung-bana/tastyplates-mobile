import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useLocalSearchParams, router, useSegments } from 'expo-router'

import { ListForm } from '@/components/studio/manage-lists/ListForm'
import type { ListFormInitialValues, ListFormValues } from '@/components/studio/manage-lists/ListForm'
import {
  listDetailLoadError,
  listUpdatedSuccess,
  listUpdateError,
} from '@/constants/messages'
import { firstSegmentParam } from '@/lib/routeParams'
import { uploadListCoverPhoto } from '@/lib/listCoverUpload'
import { getListByUuid, updateList } from '@/services/restaurantListService'
import { toast } from '@/utils/toast'

function resolveListUuid(
  params: Record<string, string | string[] | undefined>,
  segments: string[],
): string {
  const fromParams = firstSegmentParam(params.uuid)
  if (fromParams) return fromParams

  const listsIdx = segments.indexOf('manage-lists')
  const segment = listsIdx >= 0 ? segments[listsIdx + 1] : undefined
  if (segment && segment !== 'create') return segment

  return ''
}

export default function EditListScreen(): JSX.Element {
  const params = useLocalSearchParams()
  const segments = useSegments()
  const uuid = useMemo(() => resolveListUuid(params, segments), [params.uuid, segments])

  const [formValues, setFormValues] = useState<ListFormInitialValues | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'upload' | 'save'>('idle')

  useEffect(() => {
    const fallback: ListFormInitialValues = {
      title: firstSegmentParam(params.title) || '',
      description: firstSegmentParam(params.description) || '',
      is_public: firstSegmentParam(params.is_public) === 'true',
      display_pic: firstSegmentParam(params.display_pic) || null,
    }

    if (!uuid) {
      setFormValues(fallback)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void getListByUuid(uuid)
      .then((list) => {
        if (cancelled) return
        setFormValues({
          title: list.title,
          description: list.description ?? '',
          is_public: list.is_public,
          display_pic: list.display_pic?.trim() || list.cover_image_url?.trim() || null,
        })
      })
      .catch(() => {
        if (cancelled) return
        toast.error(listDetailLoadError)
        setFormValues(fallback)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [uuid])

  async function handleSubmit(values: ListFormValues): Promise<void> {
    if (!uuid) return
    setSubmitting(true)
    try {
      let display_pic: string | null | undefined
      if (values.pendingCover) {
        setSubmitPhase('upload')
        display_pic = await uploadListCoverPhoto(values.pendingCover)
      } else if (values.clearDisplayPic) {
        display_pic = null
      }

      setSubmitPhase('save')
      await updateList({
        list_uuid: uuid,
        title: values.title,
        description: values.description,
        is_public: values.is_public,
        ...(display_pic !== undefined ? { display_pic } : {}),
      })
      toast.success(listUpdatedSuccess)
      router.back()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : listUpdateError)
    } finally {
      setSubmitting(false)
      setSubmitPhase('idle')
    }
  }

  const submittingLabel =
    submitPhase === 'upload' ? 'Uploading cover…' : submitPhase === 'save' ? 'Saving…' : 'Saving…'

  if (loading || !formValues) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#31343F" />
      </View>
    )
  }

  return (
    <ListForm
      key={uuid || 'edit-list'}
      mode="edit"
      initialValues={formValues}
      submitLabel="Save Changes"
      submittingLabel={submitting ? submittingLabel : undefined}
      submitting={submitting}
      onSubmit={(values) => void handleSubmit(values)}
    />
  )
}
