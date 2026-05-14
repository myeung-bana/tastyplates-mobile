import type { AddressComponents } from '@/utils/addressUtils'

export interface RestaurantSummary {
  id: string
  slug: string
  name: string
  coverPhotoId: string | null
  cuisineType: string | null
  address: AddressComponents | null
  overallRating: number | null
  reviewCount: number
}

export interface RestaurantDetail extends RestaurantSummary {
  description: string | null
  priceRange: 1 | 2 | 3 | 4 | null
  websiteUrl: string | null
  phoneNumber: string | null
  openingHours: OpeningHours | null
  photoIds: string[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface OpeningHours {
  monday?: DayHours | null
  tuesday?: DayHours | null
  wednesday?: DayHours | null
  thursday?: DayHours | null
  friday?: DayHours | null
  saturday?: DayHours | null
  sunday?: DayHours | null
}

export interface DayHours {
  open: string
  close: string
  closed?: boolean
}

export interface CuisineType {
  id: string
  slug: string
  name: string
  iconUrl: string | null
}
