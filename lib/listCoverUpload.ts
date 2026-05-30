import type { PickedListCoverPhoto } from '@/lib/pickListCoverPhoto'
import { uploadImageToS3 } from '@/services/uploadService'

/** Upload a picked cover and return the S3 public URL for `display_pic`. */
export async function uploadListCoverPhoto(picked: PickedListCoverPhoto): Promise<string> {
  const { fileUrl } = await uploadImageToS3({
    uri: picked.uri,
    name: picked.fileName,
    type: picked.mimeType,
  })
  return fileUrl
}
