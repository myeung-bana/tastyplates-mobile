import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react'
import { ActionSheetIOS, Alert, Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

import { AUTH_WALL } from '@/constants/authWalls'
import { ReportContentModal, type ReportTarget } from '@/components/moderation/ReportContentModal'
import { useAuthSheet } from '@/contexts/AuthSheetContext'
import { useAuth } from '@/hooks/useAuth'
import { blockUser, type ReportTargetType } from '@/services/moderationService'
import { toast } from '@/utils/toast'

export interface ContentActionsOptions {
  targetType: ReportTargetType
  targetId: string
  /** Author / owner of the content; enables "Block". */
  ownerId?: string | null
  ownerLabel?: string | null
  onBlocked?: () => void
}

interface ModerationContextValue {
  /** Report / block menu for someone else's content. Guests are asked to sign in. */
  openContentActions: (options: ContentActionsOptions) => void
  /** Whether the current user may act on content owned by `ownerId` (false for own content). */
  canModerate: (ownerId?: string | null) => boolean
  confirmBlockUser: (userId: string, label?: string | null, onBlocked?: () => void) => void
  /** Opens the report form directly (skips the options menu). */
  openReport: (target: ReportTarget) => void
}

const ModerationContext = createContext<ModerationContextValue | null>(null)

const REPORT_LABEL: Record<ReportTargetType, string> = {
  review: 'Report review',
  comment: 'Report comment',
  user: 'Report profile',
  list: 'Report list',
}

export function useModeration(): ModerationContextValue {
  const ctx = useContext(ModerationContext)
  if (!ctx) throw new Error('useModeration must be used within ModerationProvider')
  return ctx
}

export function ModerationProvider({ children }: PropsWithChildren): JSX.Element {
  const { isAuthenticated, user } = useAuth()
  const { openAuthSheet } = useAuthSheet()
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null)

  const canModerate = useCallback(
    (ownerId?: string | null) =>
      !ownerId || !user?.id || ownerId.toLowerCase() !== user.id.toLowerCase(),
    [user?.id],
  )

  const confirmBlockUser = useCallback(
    (userId: string, label?: string | null, onBlocked?: () => void) => {
      if (!isAuthenticated) {
        openAuthSheet({ wall: AUTH_WALL.report })
        return
      }
      const name = label?.trim() || 'this user'
      Alert.alert(
        `Block ${name}?`,
        'You won’t see each other’s reviews, comments or activity, and any follow between you is removed. They aren’t notified.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                try {
                  await blockUser(userId)
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                  toast.success(`${name} has been blocked.`)
                  onBlocked?.()
                } catch {
                  toast.error('Could not block this user. Please try again.')
                }
              })()
            },
          },
        ],
      )
    },
    [isAuthenticated, openAuthSheet],
  )

  const openContentActions = useCallback(
    (options: ContentActionsOptions) => {
      void Haptics.selectionAsync()
      if (!isAuthenticated) {
        openAuthSheet({ wall: AUTH_WALL.report })
        return
      }
      const { targetType, targetId, ownerId, ownerLabel, onBlocked } = options
      const canBlock = Boolean(ownerId) && canModerate(ownerId)
      const blockLabel = `Block ${ownerLabel?.trim() || 'user'}`
      // Native action sheet on iOS (design X1 / X4 / X8): Report · Block · Cancel.
      if (Platform.OS === 'ios') {
        const optionsList = [REPORT_LABEL[targetType], ...(canBlock && ownerId ? [blockLabel] : []), 'Cancel']
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: optionsList,
            cancelButtonIndex: optionsList.length - 1,
            destructiveButtonIndex: canBlock && ownerId ? 1 : undefined,
          },
          (index) => {
            if (index === 0) setReportTarget({ targetType, targetId })
            else if (index === 1 && canBlock && ownerId) confirmBlockUser(ownerId, ownerLabel, onBlocked)
          },
        )
        return
      }
      Alert.alert(
        'Options',
        undefined,
        [
          {
            text: REPORT_LABEL[targetType],
            onPress: () => setReportTarget({ targetType, targetId }),
          },
          ...(canBlock && ownerId
            ? [
                {
                  text: blockLabel,
                  style: 'destructive' as const,
                  onPress: () => confirmBlockUser(ownerId, ownerLabel, onBlocked),
                },
              ]
            : []),
          { text: 'Cancel', style: 'cancel' as const },
        ],
        { cancelable: true },
      )
    },
    [canModerate, confirmBlockUser, isAuthenticated, openAuthSheet],
  )

  const openReport = useCallback(
    (target: ReportTarget) => {
      if (!isAuthenticated) {
        openAuthSheet()
        return
      }
      setReportTarget(target)
    },
    [isAuthenticated, openAuthSheet],
  )

  const value = useMemo(
    () => ({ openContentActions, canModerate, confirmBlockUser, openReport }),
    [openContentActions, canModerate, confirmBlockUser, openReport],
  )

  return (
    <ModerationContext.Provider value={value}>
      {children}
      <ReportContentModal target={reportTarget} onClose={() => setReportTarget(null)} />
    </ModerationContext.Provider>
  )
}
