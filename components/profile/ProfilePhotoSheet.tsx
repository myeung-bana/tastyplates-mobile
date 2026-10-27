import { useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import { ModalSheet } from '@/components/ui/ModalSheet'
import { BORDER_SUBTLE, DANGER, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'

/** Soft red ring for the destructive row (design P10). */
const DANGER_RING = '#F3C4BE'

type Props = {
  visible: boolean
  /** Kept for callers; the design sheet shows no avatar preview. */
  avatarUrl?: string | null
  hasCustomPhoto: boolean
  onTakePhoto: () => void
  onChooseLibrary: () => void
  onRemove: () => void
  onClose: () => void
}

function Action({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: AppIconName
  label: string
  onPress: () => void
  danger?: boolean
}): JSX.Element {
  const color = danger ? DANGER : TEXT_HEADING
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      className="flex-row items-center active:opacity-70"
      style={{ gap: 14, height: 56 }}
    >
      <View
        className="items-center justify-center"
        style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: danger ? DANGER_RING : BORDER_SUBTLE }}
      >
        <AppIcon name={icon} size={18} color={color} />
      </View>
      <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 16, color }}>{label}</Text>
    </Pressable>
  )
}

/**
 * Change photo from the profile avatar (design P10). Remove only shows for a custom photo.
 * The chosen action runs after the sheet has slid away, so the camera / library opens cleanly.
 */
export function ProfilePhotoSheet({
  visible,
  hasCustomPhoto,
  onTakePhoto,
  onChooseLibrary,
  onRemove,
  onClose,
}: Props): JSX.Element {
  const pendingRef = useRef<(() => void) | null>(null)

  const runAfterClose = (action: () => void) => {
    pendingRef.current = action
    onClose()
  }

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      onClosed={() => {
        const next = pendingRef.current
        pendingRef.current = null
        next?.()
      }}
      accessibilityLabel="Profile photo"
      contentStyle={{ gap: 12 }}
    >
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={{ fontFamily: FONT.heading, fontSize: 22, lineHeight: 28, color: TEXT_HEADING }}>
          Profile photo
        </Text>
        <Text style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: TEXT_MUTED }}>
          Shown on your profile, reviews and comments.
        </Text>
      </View>
      <View>
        <Action icon="camera" label="Take photo" onPress={() => runAfterClose(onTakePhoto)} />
        <Action icon="image" label="Choose from library" onPress={() => runAfterClose(onChooseLibrary)} />
        {hasCustomPhoto ? <Action icon="trash-2" label="Remove photo" onPress={() => runAfterClose(onRemove)} danger /> : null}
      </View>
      <Button variant="secondary" onPress={onClose}>
        Cancel
      </Button>
    </ModalSheet>
  )
}
