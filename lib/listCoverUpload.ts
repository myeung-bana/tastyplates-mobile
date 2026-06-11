import type { PickedListCoverPhoto } from '@/lib/pickListCoverPhoto'
import { uploadPickedImage } from '@/lib/uploadPickedImage'

/** Upload a picked cover and return the public URL for `display_pic`. */
export async function uploadListCoverPhoto(picked: PickedListCoverPhoto): Promise<string> {
  return uploadPickedImage(picked)
}
