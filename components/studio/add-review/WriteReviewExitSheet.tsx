import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type ElementRef,
} from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'

export type WriteReviewExitSheetHandle = {
  present: () => void
  dismiss: () => void
}

export type WriteReviewExitSheetProps = {
  onDiscard: () => void
  onSaveDraft: () => void
  savingDraft: boolean
  busy: boolean
}

type ActionRowProps = {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  destructive?: boolean
  accent?: boolean
  showDivider?: boolean
}

function ActionRow({
  label,
  onPress,
  disabled = false,
  loading = false,
  destructive = false,
  accent = false,
  showDivider = false,
}: ActionRowProps): JSX.Element {
  const color = destructive ? '#ef4444' : accent ? BRAND_PRIMARY : TEXT_HEADING

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      className={`items-center justify-center py-4 active:bg-gray-50 ${disabled ? 'opacity-50' : ''}`}
      style={showDivider ? { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' } : undefined}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Text className="font-neusans text-base font-semibold" style={{ color }}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

export const WriteReviewExitSheet = forwardRef<WriteReviewExitSheetHandle, WriteReviewExitSheetProps>(
  function WriteReviewExitSheet({ onDiscard, onSaveDraft, savingDraft, busy }, ref): JSX.Element {
    const insets = useSafeAreaInsets()
    const sheetRef = useRef<ElementRef<typeof BottomSheetModal>>(null)

    const present = useCallback(() => {
      sheetRef.current?.present()
    }, [])

    const dismiss = useCallback(() => {
      sheetRef.current?.dismiss()
    }, [])

    useImperativeHandle(ref, () => ({ present, dismiss }), [present, dismiss])

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
      ),
      [],
    )

    const handleDiscard = useCallback(() => {
      dismiss()
      onDiscard()
    }, [dismiss, onDiscard])

    const handleSaveDraft = useCallback(() => {
      onSaveDraft()
    }, [onSaveDraft])

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#d1d5db', width: 40 }}
      >
        <BottomSheetView style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <Text
            className="px-6 pb-5 pt-2 text-center font-neusans text-base leading-6"
            style={{ color: TEXT_HEADING }}
          >
            If you back now, your review will be discarded.
          </Text>

          <View className="mx-4 overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <ActionRow
              label="Discard"
              onPress={handleDiscard}
              disabled={busy}
              destructive
              showDivider
            />
            <ActionRow
              label="Save Draft"
              onPress={handleSaveDraft}
              disabled={busy && !savingDraft}
              loading={savingDraft}
              accent
            />
          </View>

          <View className="mx-4 mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <ActionRow label="Cancel" onPress={dismiss} disabled={busy && !savingDraft} />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    )
  },
)
