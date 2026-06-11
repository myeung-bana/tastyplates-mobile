import { uploadMediaAsset } from '@/services/uploadService'

export interface PickedImageFile {
  uri: string
  fileName: string
  mimeType: string
}

/** Upload a local image picked from the library or camera. */
export async function uploadPickedImage(picked: PickedImageFile): Promise<string> {
  const { fileUrl } = await uploadMediaAsset({
    uri: picked.uri,
    name: picked.fileName,
    type: picked.mimeType,
  })
  return fileUrl
}
