import { useCallback, useState } from 'react'
import { useNhostClient } from '@nhost/react'

import { invalidateOwnRestaurantUserCache } from '@/hooks/useOwnProfilePresentation'
import { pickFromCamera, pickFromLibrary, type PickedProfilePhoto } from '@/lib/pickProfilePhoto'
import { uploadPickedImage } from '@/lib/uploadPickedImage'
import { updateRestaurantUserProfile } from '@/services/restaurantUserService'
import { toast } from '@/utils/toast'

const UPLOAD_FAILED = 'Couldn’t upload your photo. Try again.'

/**
 * Profile photo straight from the avatar (design P10 → P12 → P14): pick with the native 1:1 crop,
 * upload immediately, save, refresh. A failed upload keeps the old photo.
 */
export function useProfilePhotoChange(userId: string | null | undefined, onSaved?: () => void) {
  const nhost = useNhostClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  /** Local preview shown under the upload ring while it saves. */
  const [pendingUri, setPendingUri] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const save = useCallback(
    async (profileImage: string | null) => {
      await updateRestaurantUserProfile({ profile_image: profileImage })
      if (userId) invalidateOwnRestaurantUserCache(userId)
      await nhost.auth.refreshSession().catch(() => undefined)
      onSaved?.()
    },
    [nhost.auth, onSaved, userId],
  )

  const uploadPicked = useCallback(
    async (picked: PickedProfilePhoto | null) => {
      if (!picked) return
      setPendingUri(picked.uri)
      setUploading(true)
      try {
        const url = await uploadPickedImage(picked)
        await save(url)
        toast.success('Profile saved')
      } catch {
        toast.error(UPLOAD_FAILED)
      } finally {
        setUploading(false)
        setPendingUri(null)
      }
    },
    [save],
  )

  const choose = useCallback(
    (from: 'camera' | 'library') => {
      setSheetOpen(false)
      // Let the sheet close before the system picker opens.
      setTimeout(() => {
        const pick = from === 'camera' ? pickFromCamera : pickFromLibrary
        void pick()
          .then(uploadPicked)
          .catch((e) => toast.error(e instanceof Error ? e.message : UPLOAD_FAILED))
      }, 250)
    },
    [uploadPicked],
  )

  const remove = useCallback(async () => {
    setSheetOpen(false)
    setUploading(true)
    try {
      await save(null)
      toast.success('Photo removed')
    } catch {
      toast.error('Couldn’t remove your photo. Try again.')
    } finally {
      setUploading(false)
    }
  }, [save])

  return {
    sheetOpen,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
    takePhoto: () => choose('camera'),
    chooseLibrary: () => choose('library'),
    removePhoto: () => void remove(),
    pendingUri,
    uploading,
  }
}
