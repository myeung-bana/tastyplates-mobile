import { type ReactNode, useCallback, useState } from 'react'
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
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
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  DANGER,
  SURFACE_CARD,
  SURFACE_FOG,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { Button } from '@/components/ui/Button'
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
  SCREEN_HOME,
  SCREEN_PUBLIC_PROFILE_CONNECTIONS,
  SCREEN_REVIEW_VIEWER,
  studioManageListDetailPath,
} from '@/constants/screens'
import { capitalizePhrase } from '@/lib/profileFormatting'
import { castHref } from '@/lib/routeParams'

const AVATAR_SIZE = 112
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
  currentLocationLabel?: string | null
  hometownLabel?: string | null
  pullRefreshing: boolean
  onRefresh: () => Promise<void>
  /** Own profile — avatar taps open edit profile. */
  onPressAvatarOwn?: () => void
  /** Own profile — settings icon beside Share. */
  onPressSettings?: () => void
  followButton?: UnifiedProfileFollowButtonModel | null
  /** Other user's profile — "•••" menu (report / block). */
  onPressMore?: () => void
  showFollowPlaceholder?: boolean
  /** Guest viewing someone else: "Sign in to follow" opens the sign-in wall (design P3b). */
  onPressFollowPlaceholder?: () => void
  /** Own profile: new photo uploading — shows the ring over this local preview (design P14). */
  avatarUploading?: boolean
  avatarPendingUri?: string | null
  /** Rendered below action buttons on the Me tab (e.g. recent activity). */
  meTabExtra?: ReactNode
  /** Viewer blocked this account (design X6): header + notice only, no tabs or content. */
  blockedHandle?: string | null
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
  displayNameSubtitle,
  bio,
  palates,
  memberSinceLabel,
  stats,
  statsLoading,
  currentLocationLabel = null,
  hometownLabel = null,
  pullRefreshing,
  onRefresh,
  onPressAvatarOwn,
  onPressSettings,
  followButton,
  showFollowPlaceholder = false,
  onPressFollowPlaceholder,
  avatarUploading = false,
  avatarPendingUri = null,
  onPressMore,
  meTabExtra,
  blockedHandle = null,
}: UnifiedProfileViewProps) {
  const router = useRouter()
  const [contentTab, setContentTab] = useState<ProfileContentTab>('me')
  const scrollBottomPad = 32

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

  const handleLabel = headlineHandle.startsWith('@') ? headlineHandle : `@${headlineHandle}`
  const topBar = (
    <ProfileTopBar
      handle={handleLabel}
      onPressSettings={isOwnProfile ? onPressSettings : undefined}
      onPressMore={isOwnProfile ? undefined : onPressMore}
    />
  )

  if (blockedHandle) {
    return (
      <View className="flex-1" style={{ backgroundColor: SURFACE_CARD }}>
      {topBar}
      <View className="flex-1 items-center" style={{ paddingHorizontal: 32, paddingTop: 24 }}>
        <ProfileAvatarImage size={AVATAR_SIZE} avatarUrl={avatarUrl} style={{ backgroundColor: SURFACE_FOG, opacity: 0.6 }} />
        <Text style={{ marginTop: 14, fontFamily: FONT.heading, fontSize: 24, color: TEXT_HEADING }}>
          {displayNameSubtitle?.trim() || blockedHandle}
        </Text>
        <Text style={{ marginTop: 4, fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED }}>{blockedHandle}</Text>
        <View style={{ marginTop: 24, alignSelf: 'stretch', borderRadius: 16, backgroundColor: SURFACE_FOG, padding: 18, gap: 6 }}>
          <Text style={{ fontFamily: FONT.heading, fontSize: 17, color: TEXT_HEADING }}>You blocked {blockedHandle}</Text>
          <Text style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: TEXT_MUTED }}>
            Their reviews, lists and activity are hidden. Unblock from ••• or Settings → Blocked Users.
          </Text>
        </View>
      </View>
      </View>
    )
  }

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE_CARD }}>
      {topBar}
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 }}>
        <ProfileContentTabBar activeTab={contentTab} onTabChange={setContentTab} />
      </View>

      {contentTab === 'me' ? (
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: HORIZONTAL_PAD,
            paddingTop: 24,
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
            currentLocationLabel={currentLocationLabel}
            hometownLabel={hometownLabel}
            onPressAvatarOwn={onPressAvatarOwn}
            onPressSettings={onPressSettings}
            followButton={followButton}
            showFollowPlaceholder={showFollowPlaceholder}
            onPressFollowPlaceholder={onPressFollowPlaceholder}
            displayName={displayNameSubtitle}
            avatarUploading={avatarUploading}
            avatarPendingUri={avatarPendingUri}
            onShare={runShare}
            onPressMore={onPressMore}
          />
          {meTabExtra}
        </ScrollView>
      ) : null}

      {contentTab === 'reviews' ? (
        <ProfileReviewsTabPanel
          userId={routeUserId}
          isOwnProfile={isOwnProfile}
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
              isOwnProfile ? 'Your public lists will appear here.' : 'There are no Lists yet.'
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
  bio,
  palates,
  memberSinceLabel,
  stats,
  statsLoading,
  currentLocationLabel,
  hometownLabel,
  onPressAvatarOwn,
  followButton,
  showFollowPlaceholder,
  onPressFollowPlaceholder,
  displayName,
  avatarUploading,
  avatarPendingUri,
  onShare,
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
  currentLocationLabel: string | null
  hometownLabel: string | null
  onPressAvatarOwn?: () => void
  followButton?: UnifiedProfileFollowButtonModel | null
  showFollowPlaceholder?: boolean
  onPressFollowPlaceholder?: () => void
  displayName?: string | null
  avatarUploading?: boolean
  avatarPendingUri?: string | null
  onShare: () => void
  onPressSettings?: () => void
  onPressMore?: () => void
}) {
  const router = useRouter()
  const handle = headlineHandle.startsWith('@') ? headlineHandle : `@${headlineHandle}`
  const title = displayName?.trim() && displayName.trim() !== handle ? displayName.trim() : handle
  const showHandle = title !== handle
  // Toronto · From Seoul · Since Mar 2025 (design P1/P2), each with its own icon.
  const meta = [
    currentLocationLabel?.trim() ? { icon: 'map-pin' as const, label: currentLocationLabel.trim() } : null,
    hometownLabel?.trim() ? { icon: 'home' as const, label: `From ${hometownLabel.trim()}` } : null,
    memberSinceLabel?.trim() ? { icon: 'calendar' as const, label: memberSinceLabel.trim() } : null,
  ].filter((x): x is { icon: 'map-pin' | 'home' | 'calendar'; label: string } => Boolean(x))

  return (
    <>
      <View className="items-center">
        <Pressable
          accessibilityRole={isOwnProfile ? 'button' : 'image'}
          accessibilityLabel={isOwnProfile ? 'Change profile photo' : `${title} profile photo`}
          disabled={!isOwnProfile || avatarUploading}
          onPress={() => {
            if (!isOwnProfile) return
            void Haptics.selectionAsync()
            onPressAvatarOwn?.()
          }}
        >
          <View style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}>
            {avatarPendingUri ? (
              <Image
                source={{ uri: avatarPendingUri }}
                style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: SURFACE_FOG }}
              />
            ) : (
              <ProfileAvatarImage size={AVATAR_SIZE} avatarUrl={avatarUrl} style={{ backgroundColor: SURFACE_FOG }} />
            )}
            {avatarUploading ? (
              <View
                className="absolute items-center justify-center"
                style={{
                  top: -4,
                  left: -4,
                  width: AVATAR_SIZE + 8,
                  height: AVATAR_SIZE + 8,
                  borderRadius: (AVATAR_SIZE + 8) / 2,
                  borderWidth: 3,
                  borderColor: BRAND_PRIMARY,
                  backgroundColor: 'rgba(255,255,255,0.35)',
                }}
                accessibilityLabel="Uploading photo"
              >
                <ActivityIndicator color={BRAND_PRIMARY} />
              </View>
            ) : null}
            {isOwnProfile && !avatarUploading ? (
              <View
                className="absolute items-center justify-center"
                style={{
                  right: 0,
                  bottom: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: BRAND_PRIMARY,
                  borderWidth: 2,
                  borderColor: SURFACE_CARD,
                }}
              >
                <AppIcon name="edit-2" size={14} color="#FFFFFF" />
              </View>
            ) : null}
          </View>
        </Pressable>

        <Text
          accessibilityRole="header"
          className="text-center"
          style={{ marginTop: 14, fontFamily: FONT.heading, fontSize: 24, lineHeight: 29, color: TEXT_HEADING }}
        >
          {title}
        </Text>
        {showHandle ? (
          <Text style={{ marginTop: 4, fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED }}>{handle}</Text>
        ) : null}

        {bio?.trim()?.length ? (
          <Text
            className="text-center"
            style={{ marginTop: 10, maxWidth: 320, fontFamily: FONT.body, fontSize: 14, lineHeight: 20, color: TEXT_BODY }}
          >
            {bio}
          </Text>
        ) : isOwnProfile ? (
          <Text className="text-center" style={{ marginTop: 10, fontFamily: FONT.body, fontSize: 13, color: TEXT_TERTIARY }}>
            Add a short bio from Edit profile.
          </Text>
        ) : null}

        {palates.length > 0 ? (
          <View className="flex-row flex-wrap items-center justify-center" style={{ marginTop: 12, gap: 6 }}>
            {palates.map((p) => (
              <View
                key={p}
                style={{ height: 28, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER_SUBTLE }}
              >
                <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 13, color: TEXT_HEADING }}>{capitalizePhrase(p)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {meta.length > 0 ? (
          <View className="flex-row flex-wrap items-center justify-center" style={{ marginTop: 12, columnGap: 14, rowGap: 6 }}>
            {meta.map((m) => (
              <View key={m.label} className="flex-row items-center" style={{ gap: 5 }}>
                <AppIcon name={m.icon} size={13} color={TEXT_MUTED} />
                <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>{m.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center justify-center" style={{ marginTop: 18 }}>
        <ProfileStatColumn label="Posts" value={stats.posts} loading={statsLoading} />
        <StatDivider />
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
        <StatDivider />
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

      <View className="flex-row items-center" style={{ marginTop: 18, gap: 10 }}>
        {isOwnProfile ? (
          <>
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                size="md"
                style={{ borderColor: BRAND_PRIMARY }}
                onPress={() => {
                  void Haptics.selectionAsync()
                  router.push(SCREEN_EDIT_PROFILE)
                }}
              >
                <Text style={{ fontFamily: FONT.heading, fontSize: 15, letterSpacing: 0.6, color: BRAND_PRIMARY_DARK }}>
                  Edit profile
                </Text>
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button variant="secondary" size="md" onPress={onShare} accessibilityLabel="Share profile">
                Share
              </Button>
            </View>
          </>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              {followButton ? (
                <ProfileFollowButton
                  isFollowing={followButton.isFollowing}
                  loading={followButton.loading}
                  onToggle={followButton.onToggle}
                />
              ) : showFollowPlaceholder ? (
                <Button size="md" onPress={onPressFollowPlaceholder}>
                  Sign in to follow
                </Button>
              ) : null}
            </View>
            <ProfileIconCircleButton icon="share-2" accessibilityLabel="Share profile" onPress={onShare} />
          </>
        )}
      </View>

      <Text
        accessibilityRole="header"
        style={{ marginTop: 28, marginBottom: 4, fontFamily: FONT.heading, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: TEXT_MUTED }}
      >
        Latest
      </Text>
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
      <Text style={{ fontFamily: FONT.heading, fontSize: 20, color: TEXT_HEADING, fontVariant: ['tabular-nums'] }}>{show}</Text>
      <Text className="text-center" style={{ marginTop: 2, fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>
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
        className="items-center active:opacity-70"
        style={{ flex: 1, opacity: props.loading ? 0.55 : 1 }}
      >
        {inner}
      </Pressable>
    )
  }

  return <View className="items-center" style={{ flex: 1 }}>{inner}</View>
}

function StatDivider(): JSX.Element {
  return <View style={{ width: 1, height: 28, backgroundColor: BORDER_SUBTLE }} />
}

/** Profile header bar (design P1/P2): back · @handle · gear (own) or share + ••• (others). */
function ProfileTopBar({
  handle,
  onPressSettings,
  onPressMore,
}: {
  handle: string
  onPressSettings?: () => void
  onPressMore?: () => void
}): JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  return (
    <View
      className="flex-row items-center justify-between"
      style={{ paddingTop: insets.top + 4, paddingHorizontal: 16, height: insets.top + 56, backgroundColor: SURFACE_CARD }}
    >
      <ProfileIconCircleButton
        icon="chevron-left"
        accessibilityLabel="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace(SCREEN_HOME))}
      />
      <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, textAlign: 'center', marginHorizontal: 8, fontFamily: FONT.heading, fontSize: 16, color: TEXT_HEADING }}>
        {handle}
      </Text>
      <View className="flex-row" style={{ gap: 8 }}>
        {onPressSettings ? (
          <ProfileIconCircleButton icon="settings" accessibilityLabel="Settings" onPress={onPressSettings} />
        ) : null}
        {onPressMore ? (
          <ProfileIconCircleButton icon="more-horizontal" accessibilityLabel="More options" onPress={onPressMore} />
        ) : null}
        {!onPressSettings && !onPressMore ? <View style={{ width: 44 }} /> : null}
      </View>
    </View>
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
      className="items-center justify-center rounded-full active:opacity-80"
      style={{ width: 44, height: 44, borderColor: BORDER_SUBTLE, borderWidth: 1.5, backgroundColor: SURFACE_CARD }}
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
  return (
    <Button
      size="md"
      variant={isFollowing ? 'secondary' : 'primary'}
      loading={loading}
      accessibilityState={{ selected: isFollowing, busy: loading }}
      onPress={() => {
        void Haptics.selectionAsync()
        void onToggle()
      }}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  )
}

export type ProfileMenuRowIcon = AppIconName

/** Settings group (design T1): optional eyebrow label above a rounded card. */
export function ProfileMenuCard({
  children,
  title,
}: {
  children: ReactNode
  title?: string
}) {
  return (
    <View style={{ marginTop: 22 }}>
      {title ? (
        <Text
          accessibilityRole="header"
          style={{ marginBottom: 8, paddingHorizontal: 4, fontFamily: FONT.heading, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: TEXT_MUTED }}
        >
          {title}
        </Text>
      ) : null}
      <View style={{ overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: BORDER_SUBTLE, backgroundColor: SURFACE_CARD }}>
        {children}
      </View>
    </View>
  )
}

export function ProfileMenuRow({
  icon,
  title,
  subtitle,
  onPress,
  topBorder,
  value,
  danger = false,
}: {
  icon: ProfileMenuRowIcon
  title: string
  subtitle?: string
  onPress: () => void
  topBorder?: boolean
  /** Right-aligned current value (e.g. "English", blocked count). */
  value?: string
  danger?: boolean
}) {
  const ink = danger ? DANGER : TEXT_HEADING
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, value, subtitle].filter(Boolean).join('. ')}
      onPress={onPress}
      className="flex-row items-center active:opacity-70"
      style={[
        { gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
        topBorder ? { borderTopWidth: 1, borderTopColor: BORDER_SUBTLE } : null,
      ]}
    >
      <View className="items-center justify-center" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: SURFACE_FOG }}>
        <AppIcon name={icon} size={17} color={ink} />
      </View>
      <View className="min-w-0 flex-1" style={{ gap: 2 }}>
        <Text style={{ fontFamily: FONT.headingMedium, fontSize: 16, color: ink }}>{title}</Text>
        {subtitle ? (
          <Text style={{ fontFamily: FONT.body, fontSize: 12, lineHeight: 16, color: TEXT_MUTED }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? <Text style={{ fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED }}>{value}</Text> : null}
      <AppIcon name="chevron-right" size={18} color={TEXT_TERTIARY} />
    </Pressable>
  )
}
