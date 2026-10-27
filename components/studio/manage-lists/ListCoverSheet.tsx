import { useRef } from 'react'
import { Image, Pressable, ScrollView, Text, View } from 'react-native'

import { TpMark } from '@/components/brand/TpMark'
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import { ModalSheet } from '@/components/ui/ModalSheet'
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
  // Library / camera open only after the sheet has slid away (iOS can't present over a closing modal).
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
      accessibilityLabel="List cover"
      contentStyle={{ paddingHorizontal: 20 }}
    >
      <Text accessibilityRole="header" style={{ marginTop: 8, fontFamily: FONT.heading, fontSize: 22, color: TEXT_HEADING }}>
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
        <Row icon="image" label="Choose from library" onPress={() => runAfterClose(onChooseLibrary)} />
        <Row icon="camera" label="Take photo" onPress={() => runAfterClose(onTakePhoto)} />
        {onUseDefault ? (
          <Row label="Use default cover" onPress={onUseDefault} glyph={<TpMark size={18} color={BRAND_PRIMARY} />} />
        ) : null}
      </View>
    </ModalSheet>
  )
}
