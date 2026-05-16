import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ElementRef,
} from 'react'
import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PalatePickerPanel } from '@/components/search/PalatePickerPanel'
import { BRAND_PRIMARY } from '@/constants/brand'
import { SCREEN_RESTAURANTS } from '@/constants/screens'

export interface OpenSearchCuisinesOptions {
  initialPalateKey?: string | null
  /** Hero flow: apply selection locally instead of navigating to Restaurants. */
  onApply?: (palateKey: string | null) => void
}

type SearchCuisinesSheetContextValue = {
  openSearchCuisines: (options?: OpenSearchCuisinesOptions) => void
}

const SearchCuisinesSheetContext = createContext<SearchCuisinesSheetContextValue | null>(null)

export function useSearchCuisinesSheet(): SearchCuisinesSheetContextValue {
  const ctx = useContext(SearchCuisinesSheetContext)
  if (!ctx) {
    throw new Error('useSearchCuisinesSheet must be used within SearchCuisinesSheetProvider')
  }
  return ctx
}

export function SearchCuisinesSheetProvider({ children }: PropsWithChildren) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const sheetRef = useRef<ElementRef<typeof BottomSheetModal>>(null)
  const onApplyRef = useRef<((palateKey: string | null) => void) | undefined>(undefined)
  const draftKeyRef = useRef<string | null>(null)

  const [draftKey, setDraftKey] = useState<string | null>(null)

  const setDraftKeySynced = useCallback((next: string | null) => {
    draftKeyRef.current = next
    setDraftKey(next)
  }, [])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  )

  const openSearchCuisines = useCallback((options?: OpenSearchCuisinesOptions) => {
    onApplyRef.current = options?.onApply
    const initial = options?.initialPalateKey ?? null
    draftKeyRef.current = initial
    setDraftKey(initial)
    sheetRef.current?.present()
  }, [])

  const dismissSheet = useCallback(() => {
    sheetRef.current?.dismiss()
  }, [])

  const handleDone = useCallback(() => {
    const apply = onApplyRef.current
    const key = draftKeyRef.current
    if (apply) {
      apply(key)
    } else {
      router.push({
        pathname: SCREEN_RESTAURANTS,
        params: key ? { palate: key } : {},
      })
    }
    onApplyRef.current = undefined
    dismissSheet()
  }, [dismissSheet, router])

  const handleDismiss = useCallback(() => {
    onApplyRef.current = undefined
  }, [])

  const handleClear = useCallback(() => {
    setDraftKeySynced(null)
  }, [setDraftKeySynced])

  const handleSelectCuisine = useCallback(
    (key: string) => {
      const prev = draftKeyRef.current
      const next = prev === key ? null : key
      setDraftKeySynced(next)
    },
    [setDraftKeySynced],
  )

  const handleSelectRegion = useCallback(
    (regionKey: string) => {
      const prev = draftKeyRef.current
      const next = prev === regionKey ? null : regionKey
      setDraftKeySynced(next)
    },
    [setDraftKeySynced],
  )

  const value = useMemo(() => ({ openSearchCuisines }), [openSearchCuisines])

  return (
    <SearchCuisinesSheetContext.Provider value={value}>
      {children}
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={['88%']}
        enablePanDownToClose
        onDismiss={handleDismiss}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#d1d5db', width: 40 }}
      >
        <BottomSheetView style={{ flex: 1, backgroundColor: '#ffffff' }}>
          <View className="flex-row items-center justify-between border-b border-gray-100 px-4 pb-3 pt-1">
            <Text className="text-lg font-semibold text-gray-900">Search cuisines</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              onPress={dismissSheet}
              className="rounded-full p-1 active:opacity-70"
            >
              <Ionicons name="close" size={26} color="#6b7280" />
            </Pressable>
          </View>

          <View style={{ flex: 1, minHeight: 0 }}>
            <PalatePickerPanel
              selectedKey={draftKey}
              onSelectCuisine={handleSelectCuisine}
              onSelectRegion={handleSelectRegion}
              onClear={handleClear}
            />
          </View>

          <View
            className="border-t border-gray-100 bg-white px-4 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 14) }}
          >
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleClear}
                className="flex-1 items-center rounded-2xl border border-gray-200 py-3.5 active:bg-gray-50"
              >
                <Text className="font-semibold text-gray-700">Reset</Text>
              </Pressable>
              <Pressable
                onPress={handleDone}
                className="flex-1 items-center rounded-2xl py-3.5 active:opacity-90"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <Text className="font-semibold text-white">Done</Text>
              </Pressable>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </SearchCuisinesSheetContext.Provider>
  )
}
