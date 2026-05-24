import { nhost } from '@/lib/nhost'

export interface UploadResult {
  fileId: string
  url: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export type UploadableFile =
  | File
  | {
      uri: string
      name: string
      type: string
    }

function extractFileId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const m = metadata as Record<string, unknown>
  if (typeof m.id === 'string') return m.id
  const processed = m.processedFiles
  if (Array.isArray(processed) && processed[0] && typeof processed[0] === 'object') {
    const id = (processed[0] as Record<string, unknown>).id
    if (typeof id === 'string') return id
  }
  return null
}

/**
 * Upload a photo to Nhost Storage (web `File` or React Native `{ uri, name, type }`).
 */
export async function uploadPhoto(
  file: UploadableFile,
  options?: {
    bucketId?: string
    onProgress?: (progress: UploadProgress) => void
  },
): Promise<UploadResult> {
  const { fileMetadata, error } = await nhost.storage.upload({
    file: file as never,
    bucketId: options?.bucketId,
  })

  if (error) {
    throw new Error(error.message)
  }

  const fileId = extractFileId(fileMetadata)
  if (!fileId) {
    throw new Error('Upload failed: no file metadata returned')
  }

  const url = nhost.storage.getPublicUrl({ fileId })

  return {
    fileId,
    url,
  }
}

export async function deletePhoto(fileId: string): Promise<void> {
  const { error } = await nhost.storage.delete({ fileId })
  if (error) {
    throw new Error(error.message)
  }
}

export const uploadService = {
  uploadPhoto,
  deletePhoto,
}
