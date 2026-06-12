import { getNhostFunctionsBase, unwrapEnvelope, type Envelope } from '@/lib/tastyplatesFetch'
import { nhost } from '@/lib/nhost'

export interface MediaUploadResult {
  fileUrl: string
  filePath: string
  mediaUuid?: string | null
  deduped?: boolean
}

/** @deprecated Use {@link MediaUploadResult} */
export type S3UploadResult = MediaUploadResult

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

/** React Native FormData file part — must be `{ uri, name, type }`, not a Blob cast. */
function appendUploadFile(form: FormData, file: UploadableFile): void {
  if (file instanceof File) {
    form.append('file', file, file.name)
    return
  }

  const name = file.name?.trim() || `upload-${Date.now()}.jpg`
  const type = file.type?.trim() || 'image/jpeg'
  const uri = file.uri

  if (!uri) {
    throw new Error('Upload failed: image file has no URI')
  }

  // RN/Expo fetch reads this object shape for multipart file parts
  form.append('file', { uri, name, type } as unknown as Blob)
}

function requireAccessToken(): string {
  const token = nhost.auth.getAccessToken() ?? nhost.auth.getSession()?.accessToken ?? null
  if (!token) {
    throw new Error('You must be signed in to upload images')
  }
  return token
}

/**
 * Upload an image via Nhost Functions `POST upload/image`.
 * Returns the public HTTPS URL to store on entities (reviews, profile, list display_pic).
 */
export async function uploadMediaAsset(file: UploadableFile): Promise<MediaUploadResult> {
  const base = getNhostFunctionsBase()
  if (!base) {
    throw new Error('EXPO_PUBLIC_NHOST_FUNCTIONS_URL is not set')
  }

  const token = requireAccessToken()

  const form = new FormData()
  appendUploadFile(form, file)

  const headers = new Headers()
  headers.set('Authorization', `Bearer ${token}`)
  // Do not set Content-Type — fetch must add multipart boundary automatically

  const res = await fetch(`${base}/upload/image`, {
    method: 'POST',
    headers,
    body: form,
  })

  const text = await res.text()
  let envelope: Envelope<MediaUploadResult>
  try {
    envelope = JSON.parse(text) as Envelope<MediaUploadResult>
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
    mediaUuid: data.mediaUuid ?? null,
    deduped: data.deduped ?? false,
  }
}

/** @deprecated Use {@link uploadMediaAsset} */
export async function uploadImageToS3(file: UploadableFile): Promise<MediaUploadResult> {
  return uploadMediaAsset(file)
}

/** @deprecated Use {@link uploadMediaAsset} */
export async function uploadPhoto(file: UploadableFile): Promise<{ fileId: string; url: string }> {
  const { fileUrl, filePath } = await uploadMediaAsset(file)
  return { fileId: filePath, url: fileUrl }
}

export const uploadService = {
  uploadMediaAsset,
  uploadImageToS3,
  uploadPhoto,
}
