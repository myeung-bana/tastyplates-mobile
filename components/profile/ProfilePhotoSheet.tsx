import { Image, Modal, Pressable, Text, View } from 'react-native'
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import { BORDER_SUBTLE, DANGER, SURFACE_CARD, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { resolveProfileAvatarSource } from '@/lib/profileAvatar'

type Props = {
  visible: boolean
  avatarUrl: string | null
  hasCustomPhoto: boolean
  onTakePhoto: () => void
  onChooseLibrary: () => void
  onRemove: () => void
  onClose: () => void
}

function Action({ icon, label, onPress, danger = false }: { icon: AppIconName; label: string; onPress: () => void; danger?: boolean }): JSX.Element {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center active:opacity-70" style={{ gap: 14, paddingVertical: 13 }}>
      <AppIcon name={icon} size={20} color={danger ? DANGER : TEXT_HEADING} />
      <Text style={{ fontFamily: FONT.heading, fontSize: 16, color: danger ? DANGER : TEXT_HEADING }}>{label}</Text>
    </Pressable>
  )
}

/** Change photo from the profile avatar (design P10). Remove only shows for a custom photo. */
export function ProfilePhotoSheet({
  visible,
  avatarUrl,
  hasCustomPhoto,
  onTakePhoto,
  onChooseLibrary,
  onRemove,
  onClose,
}: Props): JSX.Element {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View entering={FadeIn.duration(180)} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(180)}
          accessibilityViewIsModal
          style={{
            backgroundColor: SURFACE_CARD,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 10,
            paddingHorizontal: 24,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: BORDER_SUBTLE }} />
          <View className="flex-row items-center" style={{ gap: 14, marginTop: 16, marginBottom: 8 }}>
            <Image source={resolveProfileAvatarSource(avatarUrl)} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: BORDER_SUBTLE }} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text accessibilityRole="header" style={{ fontFamily: FONT.heading, fontSize: 18, color: TEXT_HEADING }}>
                Profile photo
              </Text>
              <Text style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 18, color: TEXT_MUTED }}>
                Shown on your profile, reviews and comments.
              </Text>
            </View>
          </View>
          <Action icon="camera" label="Take photo" onPress={onTakePhoto} />
          <Action icon="image" label="Choose from library" onPress={onChooseLibrary} />
          {hasCustomPhoto ? <Action icon="trash-2" label="Remove photo" onPress={onRemove} danger /> : null}
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            className="items-center justify-center active:opacity-70"
            style={{ marginTop: 8, height: 48, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER_SUBTLE }}
          >
            <Text style={{ fontFamily: FONT.heading, fontSize: 16, color: TEXT_HEADING }}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}
