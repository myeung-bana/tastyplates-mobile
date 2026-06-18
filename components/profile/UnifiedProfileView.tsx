import { type ReactNode, useCallback, useState } from 'react'
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'

import {
  BRAND_PRIMARY,
  BORDER_OUTLINE,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { getTabBarHeight } from '@/constants/tabBar'
import {
  ProfileContentTabBar,
  type ProfileContentTab,
} from '@/components/profile/ProfileContentTabBar'
import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { ProfilePublicListsPreview } from '@/components/profile/ProfilePublicListsPreview'
import { ProfileReviewsTabPanel } from '@/components/profile/ProfileReviewsTabPanel'
import { useProfilePublicListsPreview } from '@/hooks/useProfilePublicListsPreview'
import {
  SCREEN_EDIT_PROFILE,
  SCREEN_PUBLIC_PROFILE_CONNECTIONS,
  SCREEN_REVIEW_VIEWER,
  studioManageListDetailPath,
} from '@/constants/screens'
import { capitalizePhrase } from '@/lib/profileFormatting'
import { castHref } from '@/lib/routeParams'

const AVATAR_SIZE = 96
const HORIZONTAL_PAD = 20

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
  /** Own profile — settings icon beside Share. */
  onPressSettings?: () => void
  followButton?: UnifiedProfileFollowButtonModel | null
  showFollowPlaceholder?: boolean
  /** Rendered below action buttons on the Me tab (e.g. recent activity). */
  meTabExtra?: ReactNode
}

/**
 * Unified profile chrome — `documentation/profile.md` §4 + design tokens (`constants/brand`).
 * Top pill tabs: Me · Reviews · Lists.
 */
export function UnifiedProfileView({
  isOwnProfile,
  routeUserId,
  headlineHandle,
  avatarUrl,
  initials,
  displayNameSubtitle: _displayNameSubtitle,
  bio,
  palates,
  memberSinceLabel,
  stats,
  statsLoading,
  pullRefreshing,
  onRefresh,
  onPressAvatarOwn,
  onPressSettings,
  followButton,
  showFollowPlaceholder = false,
  meTabExtra,
}: UnifiedProfileViewProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [contentTab, setContentTab] = useState<ProfileContentTab>('me')
  const scrollBottomPad = getTabBarHeight(insets) + 32

  const {
    lists: publicLists,
    error: publicListsError,
    loading: publicListsLoading,
    refresh: refreshPublicLists,
  } = useProfilePublicListsPreview(routeUserId, {
    enabled: contentTab === 'lists',
  })

  const handleMeRefresh = useCallback(async () => {
    await onRefresh()
  }, [onRefresh])

  const runShare = () => {
    void Haptics.selectionAsync()
    const handle = headlineHandle.startsWith('@') ? headlineHandle : `@${headlineHandle}`
    const pathKey = headlineHandle.replace(/^@/, '').trim() || routeUserId
    const url = `https://tastyplates.co/profile/${encodeURIComponent(pathKey)}`
    void Share.share({
      message: `Check out ${handle} on Tastyplates`,
      url,
    })
  }

  const openReview = (reviewId: string) => {
    router.push({
      pathname: SCREEN_REVIEW_VIEWER,
      params: { reviewId },
    })
  }

  return (
    <View className="flex-1 bg-white">
      <View
        style={{
          paddingHorizontal: HORIZONTAL_PAD,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <ProfileContentTabBar activeTab={contentTab} onTabChange={setContentTab} />
      </View>

      {contentTab === 'me' ? (
        <ScrollView
          className="flex-1 bg-white"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: HORIZONTAL_PAD,
            paddingTop: 20,
            paddingBottom: scrollBottomPad,
          }}
          refreshControl={
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={() => void handleMeRefresh()}
              tintColor={BRAND_PRIMARY}
            />
          }
        >
          <ProfileMeSection
            isOwnProfile={isOwnProfile}
            routeUserId={routeUserId}
            headlineHandle={headlineHandle}
            avatarUrl={avatarUrl}
            initials={initials}
            bio={bio}
            palates={palates}
            memberSinceLabel={memberSinceLabel}
            stats={stats}
            statsLoading={statsLoading}
            onPressAvatarOwn={onPressAvatarOwn}
            onPressSettings={onPressSettings}
            followButton={followButton}
            showFollowPlaceholder={showFollowPlaceholder}
            onShare={runShare}
          />
          {meTabExtra}
        </ScrollView>
      ) : null}

      {contentTab === 'reviews' ? (
        <ProfileReviewsTabPanel
          userId={routeUserId}
          onPressReview={openReview}
          emptyMessage={
            isOwnProfile
              ? 'Published reviews will appear here soon.'
              : 'Reviews from this account will appear here soon.'
          }
        />
      ) : null}

      {contentTab === 'lists' ? (
        <ProfileListsTabScroll onRefresh={refreshPublicLists} scrollBottomPad={scrollBottomPad}>
          <ProfilePublicListsPreview
            error={publicListsError}
            loading={publicListsLoading}
            lists={publicLists}
            emptyMessage={
              isOwnProfile ? 'Your public lists will appear here.' : 'There are no Lists yet'
            }
            onPressList={(list) => {
              router.push({
                pathname: castHref(studioManageListDetailPath(list.uuid)) as never,
              })
            }}
          />
        </ProfileListsTabScroll>
      ) : null}
    </View>
  )
}

function ProfileListsTabScroll({
  children,
  onRefresh,
  scrollBottomPad,
}: {
  children: ReactNode
  onRefresh: () => Promise<void>
  scrollBottomPad: number
}) {
  const [listsRefreshing, setListsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setListsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setListsRefreshing(false)
    }
  }, [onRefresh])

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{
        paddingHorizontal: HORIZONTAL_PAD,
        paddingTop: 12,
        paddingBottom: scrollBottomPad,
        flexGrow: 1,
      }}
      refreshControl={
        <RefreshControl
          refreshing={listsRefreshing}
          onRefresh={() => void handleRefresh()}
          tintColor={BRAND_PRIMARY}
        />
      }
    >
      {children}
    </ScrollView>
  )
}

function ProfileMeSection({
  isOwnProfile,
  routeUserId,
  headlineHandle,
  avatarUrl,
  initials: _initials,
  bio,
  palates,
  memberSinceLabel,
  stats,
  statsLoading,
  onPressAvatarOwn,
  followButton,
  showFollowPlaceholder,
  onShare,
  onPressSettings,
}: {
  isOwnProfile: boolean
  routeUserId: string
  headlineHandle: string
  avatarUrl: string | null
  initials: string
  bio: string | null
  palates: string[]
  memberSinceLabel: string
  stats: UnifiedProfileStatModel
  statsLoading: boolean
  onPressAvatarOwn?: () => void
  followButton?: UnifiedProfileFollowButtonModel | null
  showFollowPlaceholder?: boolean
  onShare: () => void
  onPressSettings?: () => void
}) {
  const router = useRouter()

  return (
    <>
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
          <ProfileAvatarImage
            size={AVATAR_SIZE}
            avatarUrl={avatarUrl}
            className="bg-gray-100"
          />
        </Pressable>

        <Text
          accessibilityRole="header"
          className="mt-4 text-center text-lg font-semibold leading-tight"
          style={{ color: TEXT_HEADING }}
        >
          {headlineHandle}
        </Text>

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

      <View className="mt-6 flex-row items-start justify-between px-1">
        <ProfileStatColumn label="Posts" value={stats.posts} loading={statsLoading} />
        <ProfileStatColumn
          label="Followers"
          value={stats.followers}
          loading={statsLoading}
          button
          onPress={() => {
            void Haptics.selectionAsync()
            router.push({
              pathname: SCREEN_PUBLIC_PROFILE_CONNECTIONS,
              params: { userId: routeUserId, tab: 'followers' },
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
              pathname: SCREEN_PUBLIC_PROFILE_CONNECTIONS,
              params: { userId: routeUserId, tab: 'following' },
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
            <ProfileShareButton onPress={onShare} />
            {onPressSettings ? (
              <ProfileIconCircleButton
                icon="settings"
                accessibilityLabel="Settings"
                onPress={onPressSettings}
              />
            ) : null}
          </>
        ) : (
          <>
            {followButton ? (
              <ProfileFollowButton
                isFollowing={followButton.isFollowing}
                loading={followButton.loading}
                onToggle={followButton.onToggle}
              />
            ) : showFollowPlaceholder ? (
              <Text className="text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                Sign in to follow this creator.
              </Text>
            ) : null}
            <ProfileShareButton onPress={onShare} />
          </>
        )}
      </View>
    </>
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

function ProfileShareButton({ onPress }: { onPress: () => void }): JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Share profile"
      className="flex-row items-center gap-2 rounded-full border bg-white px-6 py-2.5 active:bg-gray-50"
      style={{ borderColor: BORDER_OUTLINE, borderWidth: 1 }}
    >
      <AppIcon name="share-2" size={18} color={TEXT_HEADING} />
      <Text className="text-sm font-semibold" style={{ color: TEXT_HEADING }}>
        Share profile
      </Text>
    </Pressable>
  )
}

function ProfileIconCircleButton({
  icon,
  accessibilityLabel,
  onPress,
}: {
  icon: AppIconName
  accessibilityLabel: string
  onPress: () => void
}): JSX.Element {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="items-center justify-center rounded-full border bg-white active:bg-gray-50"
      style={{ width: 40, height: 40, borderColor: BORDER_OUTLINE, borderWidth: 1 }}
    >
      <AppIcon name={icon} size={18} color={TEXT_HEADING} />
    </Pressable>
  )
}

function ProfileFollowButton(props: {
  isFollowing: boolean
  loading: boolean
  onToggle: () => void | Promise<void>
}): JSX.Element {
  const { isFollowing, loading, onToggle } = props

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
      className="items-center justify-center rounded-full border px-6 py-2.5 active:opacity-90"
      style={[styleFollow, loading ? { opacity: 0.55 } : null]}
    >
      {loading ? (
        <ActivityIndicator color={isFollowing ? TEXT_HEADING : '#fff'} size="small" />
      ) : (
        <Text
          className={`text-sm ${isFollowing ? 'font-medium' : 'font-semibold'}`}
          style={{ color: textColor }}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      )}
    </Pressable>
  )
}

export type ProfileMenuRowIcon = AppIconName

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
      <AppIcon name={icon} size="lg" color={TEXT_BODY} />
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
      <AppIcon name="chevron-right" size={18} color={TEXT_MUTED} />
    </Pressable>
  )
}
