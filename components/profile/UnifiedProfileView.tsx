import { type ComponentProps, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

import {
  BRAND_PRIMARY,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
  RATING_STAR,
} from '@/constants/brand'
import {
  ProfileOtherUserReviewsPreview,
  type ProfileOtherUserReviewsPreviewProps,
} from '@/components/profile/ProfileOtherUserReviewsPreview'
import {
  SCREEN_EDIT_PROFILE,
  SCREEN_PUBLIC_PROFILE_FOLLOWERS,
  SCREEN_PUBLIC_PROFILE_FOLLOWING,
} from '@/constants/screens'
import { capitalizePhrase } from '@/lib/profileFormatting'

const AVATAR_SIZE = 96
const STATS_BORDER = '#f3f4f6'

function formatMetric(n: number | null): string {
  if (n === null) return '—'
  if (n >= 10000) return `${Math.round(n / 1000)}k`
  return String(n)
}

export interface UnifiedProfileStatModel {
  posts: number | null
  followers: number | null
  following: number | null
}

export interface UnifiedProfileFollowButtonModel {
  isFollowing: boolean
  loading: boolean
  onToggle: () => void | Promise<void>
}

export interface UnifiedProfileViewProps {
  isOwnProfile: boolean
  /** For nested profile routes (`/(tabs)/profile/[userId]/…`) — Nhost user id (`RestaurantUserRow.id`, UUID). */
  routeUserId: string
  headlineHandle: string
  avatarUrl: string | null
  initials: string
  displayNameSubtitle: string | null
  bio: string | null
  palates: string[]
  memberSinceLabel: string
  stats: UnifiedProfileStatModel
  statsLoading: boolean
  pullRefreshing: boolean
  onRefresh: () => Promise<void>
  /** Own profile — avatar taps open edit profile. */
  onPressAvatarOwn?: () => void
  followButton?: UnifiedProfileFollowButtonModel | null
  showFollowPlaceholder?: boolean
  /** When set on another user’s profile, replaces the placeholder with a 2-review preview + CTA (`design_system.md` §5). */
  otherUserReviews?: ProfileOtherUserReviewsPreviewProps | null
  belowActions?: ReactNode
}

/**
 * Unified profile chrome — `documentation/profile.md` §4 + design tokens (`constants/brand`).
 */
export function UnifiedProfileView({
  isOwnProfile,
  routeUserId,
  headlineHandle,
  avatarUrl,
  initials,
  displayNameSubtitle,
  bio,
  palates,
  memberSinceLabel,
  stats,
  statsLoading,
  pullRefreshing,
  onRefresh,
  onPressAvatarOwn,
  followButton,
  showFollowPlaceholder = false,
  otherUserReviews = null,
  belowActions,
}: UnifiedProfileViewProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const runShare = () => {
    void Haptics.selectionAsync()
    void Share.share({
      message: `${headlineHandle} — Tastyplates`,
    })
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Math.max(insets.bottom, 20) + 32,
      }}
      refreshControl={
        <RefreshControl
          refreshing={pullRefreshing}
          onRefresh={() => void onRefresh()}
          tintColor={BRAND_PRIMARY}
        />
      }
    >
      <View className="items-center">
        <Pressable
          accessibilityRole={isOwnProfile ? 'button' : 'none'}
          disabled={!isOwnProfile}
          onPress={() => {
            if (!isOwnProfile) return
            void Haptics.selectionAsync()
            onPressAvatarOwn?.()
          }}
        >
          {avatarUrl ? (
            <Image
              accessibilityIgnoresInvertColors
              source={{ uri: avatarUrl }}
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
              className="bg-gray-100"
              resizeMode="cover"
            />
          ) : (
            <View
              className="items-center justify-center rounded-full bg-gray-100"
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
            >
              <Text
                className="text-2xl font-semibold"
                style={{ color: TEXT_HEADING }}
                maxFontSizeMultiplier={1.2}
              >
                {initials}
              </Text>
            </View>
          )}
        </Pressable>

        <Text
          accessibilityRole="header"
          className="mt-4 text-center text-lg font-semibold leading-tight"
          style={{ color: TEXT_HEADING }}
        >
          {headlineHandle}
        </Text>

        {displayNameSubtitle ? (
          <Text className="mt-1 text-center text-sm" style={{ color: TEXT_BODY }} numberOfLines={2}>
            {displayNameSubtitle}
          </Text>
        ) : null}

        {memberSinceLabel ? (
          <Text className="mt-2 text-center text-xs" style={{ color: TEXT_MUTED }}>
            {memberSinceLabel}
          </Text>
        ) : null}

        {palates.length > 0 ? (
          <View className="mt-4 flex-row flex-wrap items-center justify-center gap-2">
            {palates.map((p) => (
              <View
                key={p}
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: '#f3f4f6' }}
              >
                <Text className="text-xs font-medium text-gray-700">{capitalizePhrase(p)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text
          className={`mt-4 max-w-md text-center text-sm leading-relaxed ${bio?.trim()?.length ? '' : 'italic'}`}
          style={{ color: bio?.trim()?.length ? TEXT_BODY : TEXT_MUTED }}
        >
          {bio?.trim()?.length
            ? bio
            : isOwnProfile
              ? 'Add a short bio from Edit profile.'
              : 'No bio yet.'}
        </Text>
      </View>

      <View
        className="mt-8 flex-row items-start justify-between border-t px-1 pt-6"
        style={{ borderTopWidth: 1, borderTopColor: STATS_BORDER }}
      >
        <ProfileStatColumn
          label="Posts"
          value={stats.posts}
          loading={statsLoading}
        />
        <ProfileStatColumn
          label="Followers"
          value={stats.followers}
          loading={statsLoading}
          button
          onPress={() => {
            void Haptics.selectionAsync()
            router.push({
              pathname: SCREEN_PUBLIC_PROFILE_FOLLOWERS,
              params: { userId: routeUserId },
            })
          }}
        />
        <ProfileStatColumn
          label="Following"
          value={stats.following}
          loading={statsLoading}
          button
          onPress={() => {
            void Haptics.selectionAsync()
            router.push({
              pathname: SCREEN_PUBLIC_PROFILE_FOLLOWING,
              params: { userId: routeUserId },
            })
          }}
        />
      </View>

      <View className="mt-6 flex-row flex-wrap items-center justify-center gap-3">
        {isOwnProfile ? (
          <>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync()
                router.push(SCREEN_EDIT_PROFILE)
              }}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              className="rounded-full px-6 py-2.5 active:opacity-90"
              style={{ backgroundColor: TEXT_HEADING }}
            >
              <Text className="text-sm font-medium text-white">Edit profile</Text>
            </Pressable>
            <Pressable
              onPress={() => runShare()}
              accessibilityRole="button"
              accessibilityLabel="Share profile"
              className="flex-row items-center gap-2 rounded-full border bg-white px-6 py-2.5 active:bg-gray-50"
              style={{ borderColor: '#d1d5db', borderWidth: 1 }}
            >
              <Ionicons name="share-social-outline" size={18} color={TEXT_HEADING} />
              <Text className="text-sm font-semibold" style={{ color: TEXT_HEADING }}>
                Share profile
              </Text>
            </Pressable>
          </>
        ) : followButton ? (
          <ProfileFollowButton
            isFollowing={followButton.isFollowing}
            loading={followButton.loading}
            onToggle={followButton.onToggle}
          />
        ) : showFollowPlaceholder ? (
          <Text className="text-center text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
            Sign in to follow this creator.
          </Text>
        ) : null}
      </View>

      <View
        className="mt-10 border-t px-2 pb-6 pt-8"
        style={{ borderTopWidth: 1, borderTopColor: STATS_BORDER }}
      >
        <View className="mb-3 flex-row items-center gap-2">
          <Text
            className="text-xl font-semibold"
            style={{ color: TEXT_HEADING, letterSpacing: -0.3 }}
          >
            Reviews
          </Text>
          <Text style={{ fontSize: 13, color: RATING_STAR }}>★</Text>
        </View>
        {!isOwnProfile && otherUserReviews ? (
          <ProfileOtherUserReviewsPreview {...otherUserReviews} />
        ) : (
          <Text className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
            {isOwnProfile
              ? 'Published reviews will appear in this grid. Open My reviews below to jump to TastyStudio.'
              : 'Reviews from this account will appear here soon.'}
          </Text>
        )}
      </View>

      {belowActions}
    </ScrollView>
  )
}

function ProfileStatColumn(props: {
  label: string
  value: number | null
  loading: boolean
  button?: boolean
  onPress?: () => void
}) {
  const show = props.loading ? '…' : formatMetric(props.value)
  const inner = (
    <View className="items-center">
      <Text className="text-base font-semibold tabular-nums" style={{ color: TEXT_HEADING }}>
        {show}
      </Text>
      <Text className="mt-1 text-center text-xs" style={{ color: TEXT_MUTED }}>
        {props.label}
      </Text>
    </View>
  )

  if (props.button && props.onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={props.label}
        onPress={() => props.onPress?.()}
        disabled={props.loading}
        className="min-w-[88px] items-center px-1 active:opacity-70"
        style={{ opacity: props.loading ? 0.55 : 1 }}
      >
        {inner}
      </Pressable>
    )
  }

  return <View className="min-w-[88px] items-center px-1">{inner}</View>
}

function ProfileFollowButton(props: {
  isFollowing: boolean
  loading: boolean
  onToggle: () => void | Promise<void>
}) {
  const { isFollowing, loading, onToggle } = props

  const base =
    'min-w-[100px] items-center justify-center rounded-full border px-5 py-2 active:opacity-90'
  const styleFollow = !isFollowing
    ? {
        borderColor: BRAND_PRIMARY,
        backgroundColor: BRAND_PRIMARY,
        borderWidth: 1,
      }
    : { borderColor: '#000000', backgroundColor: '#ffffff', borderWidth: 1 }
  const textColor = isFollowing ? TEXT_HEADING : '#ffffff'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
      disabled={loading}
      onPress={() => {
        void Haptics.selectionAsync()
        void onToggle()
      }}
      className={base}
      style={[styleFollow, loading ? { opacity: 0.55 } : null]}
    >
      {loading ? (
        <ActivityIndicator color={isFollowing ? TEXT_HEADING : '#fff'} size="small" />
      ) : (
        <Text className="text-xs font-normal" style={{ color: textColor }}>
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      )}
    </Pressable>
  )
}

export type ProfileMenuRowIcon = ComponentProps<typeof Ionicons>['name']

export function ProfileMenuCard({
  children,
}: {
  children: ReactNode
}) {
  return (
    <View className="mt-6 overflow-hidden rounded-2xl border bg-white px-2 py-1" style={{ borderColor: '#e5e7eb' }}>
      {children}
    </View>
  )
}

export function ProfileMenuRow({
  icon,
  title,
  subtitle,
  onPress,
  topBorder,
}: {
  icon: ProfileMenuRowIcon
  title: string
  subtitle?: string
  onPress: () => void
  topBorder?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle ?? ''}`}
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3.5 active:bg-orange-50/60"
      style={
        topBorder
          ? { borderTopWidth: 1, borderTopColor: '#e5e7eb' }
          : undefined
      }
    >
      <Ionicons name={icon} size={22} color={TEXT_BODY} />
      <View className="min-w-0 flex-1">
        <Text className="text-base font-normal" style={{ color: TEXT_HEADING }}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-xs" style={{ color: TEXT_MUTED }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} importantForAccessibility="no" />
    </Pressable>
  )
}

