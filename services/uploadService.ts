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

/**
 * Upload a photo to Nhost Storage.
 *
 * Files go directly from the device to Nhost Storage — no proxy server involved.
 * Returns the file ID and public URL on success.
 */
export async function uploadPhoto(
  file: File,
  options?: {
    bucketId?: string
    onProgress?: (progress: UploadProgress) => void
  },
): Promise<UploadResult> {
  const { fileMetadata, error } = await nhost.storage.upload({
    file,
    bucketId: options?.bucketId,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!fileMetadata) {
    throw new Error('Upload failed: no file metadata returned')
  }

  const url = nhost.storage.getPublicUrl({ fileId: fileMetadata.id })

  return {
    fileId: fileMetadata.id,
    url,
  }
}

/**
 * Delete a file from Nhost Storage by its file ID.
 */
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
