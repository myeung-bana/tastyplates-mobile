import { getNhostFunctionsBase, unwrapEnvelope, type Envelope } from '@/lib/tastyplatesFetch'
import { nhost } from '@/lib/nhost'

export interface S3UploadResult {
  fileUrl: string
  filePath: string
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

function toFormDataFile(file: UploadableFile): Blob | { uri: string; name: string; type: string } {
  if (file instanceof File) return file
  return {
    uri: file.uri,
    name: file.name,
    type: file.type,
  }
}

/**
 * Upload an image via Nhost Functions `POST upload/image` (multipart → S3).
 * Returns the public HTTPS URL to store on entities (reviews, profile, list display_pic).
 */
export async function uploadImageToS3(file: UploadableFile): Promise<S3UploadResult> {
  const base = getNhostFunctionsBase()
  if (!base) {
    throw new Error('EXPO_PUBLIC_NHOST_FUNCTIONS_URL is not set')
  }

  const token = nhost.auth.getAccessToken() ?? nhost.auth.getSession()?.accessToken ?? null
  if (!token) {
    throw new Error('You must be signed in to upload images')
  }

  const form = new FormData()
  const payload = toFormDataFile(file)
  if (payload instanceof File) {
    form.append('file', payload)
  } else {
    form.append('file', payload as unknown as Blob)
  }

  const res = await fetch(`${base}/upload/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })

  const text = await res.text()
  let envelope: Envelope<S3UploadResult>
  try {
    envelope = JSON.parse(text) as Envelope<S3UploadResult>
  } catch {
    throw new Error(
      res.ok ? 'Invalid JSON response from upload server' : `HTTP ${res.status}: ${text.slice(0, 200)}`,
    )
  }

  if (!res.ok && envelope.ok === false) {
    throw new Error(envelope.error)
  }

  const data = unwrapEnvelope(envelope)
  if (!data?.fileUrl || typeof data.fileUrl !== 'string') {
    throw new Error('Upload failed: no file URL returned')
  }

  return {
    fileUrl: data.fileUrl,
    filePath: typeof data.filePath === 'string' ? data.filePath : '',
  }
}

/** @deprecated Use {@link uploadImageToS3} — kept for gradual migration; maps to S3 result shape. */
export async function uploadPhoto(file: UploadableFile): Promise<{ fileId: string; url: string }> {
  const { fileUrl, filePath } = await uploadImageToS3(file)
  return { fileId: filePath, url: fileUrl }
}

export const uploadService = {
  uploadImageToS3,
  uploadPhoto,
}
