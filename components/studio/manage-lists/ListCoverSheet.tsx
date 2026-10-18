import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { TpMark } from '@/components/brand/TpMark'
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  SURFACE_CARD,
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'

export type ListCoverOption = { key: string; name: string; imageUrl: string }

type Props = {
  visible: boolean
  onClose: () => void
  /** Photos of restaurants already in this list ("From this list"). */
  options: ListCoverOption[]
  selectedUrl?: string | null
  onPickOption: (option: ListCoverOption) => void
  onChooseLibrary: () => void
  onTakePhoto: () => void
  /** Only when a custom cover is set. */
  onUseDefault?: () => void
}

function Row({ icon, label, onPress, glyph }: { icon?: AppIconName; label: string; onPress: () => void; glyph?: JSX.Element }): JSX.Element {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center active:opacity-70" style={{ gap: 14, paddingVertical: 12 }}>
      <View
        className="items-center justify-center"
        style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: BORDER_SUBTLE, backgroundColor: SURFACE_CARD }}
      >
        {glyph ?? (icon ? <AppIcon name={icon} size={19} color={TEXT_HEADING} /> : null)}
      </View>
      <Text style={{ fontFamily: FONT.heading, fontSize: 16, color: TEXT_HEADING }}>{label}</Text>
    </Pressable>
  )
}

/** List cover picker (design L7): a restaurant photo from the list, library, camera or default. */
export function ListCoverSheet({
  visible,
  onClose,
  options,
  selectedUrl,
  onPickOption,
  onChooseLibrary,
  onTakePhoto,
  onUseDefault,
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
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: BORDER_SUBTLE }} />
          <Text accessibilityRole="header" style={{ marginTop: 14, fontFamily: FONT.heading, fontSize: 22, color: TEXT_HEADING }}>
            List cover
          </Text>

          {options.length > 0 ? (
            <>
              <Text style={{ marginTop: 16, marginBottom: 10, fontFamily: FONT.heading, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: TEXT_MUTED }}>
                From this list
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {options.map((o) => {
                  const on = selectedUrl === o.imageUrl
                  return (
                    <Pressable key={o.key} accessibilityRole="button" accessibilityLabel={`Use ${o.name} photo`} onPress={() => onPickOption(o)} style={{ width: 84, gap: 6 }}>
                      <Image
                        source={{ uri: o.imageUrl }}
                        style={{ width: 84, height: 84, borderRadius: 12, borderWidth: on ? 3 : 0, borderColor: BRAND_PRIMARY, backgroundColor: SURFACE_FOG }}
                      />
                      <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 11, color: TEXT_MUTED }}>
                        {o.name}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </>
          ) : null}

          <View style={{ marginTop: 10 }}>
            <Row icon="image" label="Choose from library" onPress={onChooseLibrary} />
            <Row icon="camera" label="Take photo" onPress={onTakePhoto} />
            {onUseDefault ? (
              <Row label="Use default cover" onPress={onUseDefault} glyph={<TpMark size={18} color={BRAND_PRIMARY} />} />
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}
