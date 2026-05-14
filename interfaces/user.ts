export interface UserSummary {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  isFollowedByMe: boolean
}

export interface UserProfile extends UserSummary {
  bio: string | null
  palates: string[]
  reviewCount: number
  followerCount: number
  followingCount: number
  wishlistCount: number
  checkinCount: number
  createdAt: string
}

export interface UserMetadata {
  bio?: string
  palates?: string[]
  avatarFileId?: string
  onboardingCompleted?: boolean
  city?: string
}
