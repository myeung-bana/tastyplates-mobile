import type { UploadContextValue } from '@/contexts/UploadContext'
import { uploadImageToS3 } from '@/services/uploadService'

export type PendingReviewPhoto = {
  uri: string
  fileName: string
  mimeType: string
}

function guessFileName(uri: string, index: number): string {
  const ext = uri.split('.').pop()?.split('?')[0] ?? 'jpg'
  return `review-${Date.now()}-${index}.${ext}`
}

export async function uploadReviewPhotos(
  pending: PendingReviewPhoto[],
  uploadCtx: Pick<UploadContextValue, 'startUpload' | 'updateProgress' | 'resetUpload'>,
): Promise<string[]> {
  if (pending.length === 0) return []

  uploadCtx.startUpload(pending.length)
  const urls: string[] = []

  try {
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i]!
      const { fileUrl } = await uploadImageToS3({
        uri: item.uri,
        name: item.fileName || guessFileName(item.uri, i),
        type: item.mimeType || 'image/jpeg',
      })
      urls.push(fileUrl)
      uploadCtx.updateProgress(i + 1, pending.length)
    }
    return urls
  } catch (e) {
    uploadCtx.resetUpload()
    throw e
  }
}
