import type { ComponentType } from 'react'
import type { SvgProps } from 'react-native-svg'

import FlagIcon from '@/assets/images/recognition/flag.svg'
import PhoneIcon from '@/assets/images/recognition/phone.svg'
import CashIcon from '@/assets/images/recognition/cash.svg'
import HelmetIcon from '@/assets/images/recognition/helmet.svg'
import StarFilledIcon from '@/assets/images/recognition/star-filled.svg'

export type SvgIconComponent = ComponentType<SvgProps>

export const STAR_FILLED: SvgIconComponent = StarFilledIcon

/** Last-resort restaurant tile / hero fallback — real photos always take priority. */
export const DEFAULT_RESTAURANT_IMAGE =
  'https://tastyplates-bucket.s3.ap-northeast-2.amazonaws.com/uploads/tastyplates_placeholder_portrait.jpg'

export const RECOGNITION_TAGS: ReadonlyArray<{
  name: string
  Icon: SvgIconComponent
}> = [
  { name: 'Must Revisit', Icon: FlagIcon },
  { name: 'Insta-Worthy', Icon: PhoneIcon },
  { name: 'Value for Money', Icon: CashIcon },
  { name: 'Best Service', Icon: HelmetIcon },
]
