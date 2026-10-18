/** Square cover image picker — same UX and 1:1 crop as the profile photo. */
export {
  pickFromCamera as pickListCoverFromCamera,
  pickFromLibrary as pickListCoverFromLibrary,
  pickProfilePhoto as pickListCoverPhoto,
} from '@/lib/pickProfilePhoto'
export type { PickedProfilePhoto as PickedListCoverPhoto } from '@/lib/pickProfilePhoto'
