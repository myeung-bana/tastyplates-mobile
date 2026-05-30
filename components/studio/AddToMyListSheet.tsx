import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import * as Haptics from 'expo-haptics'
import { AppIcon } from '@/components/ui/AppIcon'

import { SectionTitle } from '@/components/layout/SectionTitle'
import { BORDER_SUBTLE, BRAND_PRIMARY, mergeTextInputBodyTypography, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { useLocation } from '@/contexts/LocationContext'
import type { StudioListKind } from '@/hooks/useMyList'
import type { SavedLocationPreference } from '@/constants/locations'
import {
  autocompletePlacesEstablishments,
  fetchGooglePlaceDetails,
  googlePlacePhotoUrl,
  type PlacesAutocompletePrediction,
  type PlacesDetailsResult,
} from '@/lib/googlePlaces'

export interface AddToMyListSheetHandle {
  present: () => void
  dismiss: () => void
}

interface Props {
  userId: string | undefined | null
  /** Defaults to whichever list tab is visible when sheet opens */
  activeListKind?: StudioListKind
  attachPlaceFromGoogleDetails: (input: {
    placeId: string
    location: SavedLocationPreference
    kind: StudioListKind
    name: string
    address?: string | null
    latitude?: number | null
    longitude?: number | null
    photoUrl?: string | null
    types?: string[] | null
  }) => Promise<void>
}

export const AddToMyListSheet = forwardRef<AddToMyListSheetHandle, Props>(function AddToMyListSheet(
  { userId, activeListKind = 'checkin', attachPlaceFromGoogleDetails },
  ref,
): JSX.Element {
  const sheetRef = useRef<BottomSheetModal>(null)
  const { location } = useLocation()
  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState<PlacesAutocompletePrediction[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<PlacesAutocompletePrediction | null>(null)
  const [detail, setDetail] = useState<PlacesDetailsResult | null>(null)
  const [kind, setKind] = useState<StudioListKind>(activeListKind)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setKind(activeListKind)
  }, [activeListKind])

  useImperativeHandle(
    ref,
    () => ({
      present: () => {
        sheetRef.current?.present()
      },
      dismiss: () => {
        sheetRef.current?.dismiss()
      },
    }),
    [],
  )

  useEffect(() => {
    let cancelled = false
    let handle: ReturnType<typeof globalThis.setTimeout> | undefined

    const run = (): void => {
      if (!query.trim() || query.trim().length < 2) {
        setSearching(false)
        setPredictions([])
        return
      }
      setSearching(true)
      handle = globalThis.setTimeout(() => {
        void (async () => {
          try {
            const preds = await autocompletePlacesEstablishments(query, location.coordinates)
            if (!cancelled) {
              setPredictions(preds)
            }
          } catch (err) {
            if (!cancelled) {
              setPredictions([])
            }
          } finally {
            if (!cancelled) setSearching(false)
          }
        })()
      }, 340)
    }

    run()
    return () => {
      cancelled = true
      if (handle !== undefined) clearTimeout(handle)
    }
  }, [location.coordinates, query])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  )

  const photoFromDetail = useMemo(() => {
    const refPhoto = detail?.photos?.[0]?.photo_reference
    if (!refPhoto) return null
    try {
      return googlePlacePhotoUrl(refPhoto, 480)
    } catch {
      return null
    }
  }, [detail])

  const onPickPrediction = async (prediction: PlacesAutocompletePrediction): Promise<void> => {
    setPicked(prediction)
    setQuery(prediction.description)
    setSearching(true)
    try {
      const d = await fetchGooglePlaceDetails(prediction.place_id)
      setDetail(d)
    } catch (e) {
      setDetail(null)
      Alert.alert('Google Places', e instanceof Error ? e.message : 'Could not fetch place detail.')
    } finally {
      setSearching(false)
    }
  }

  const onConfirm = async (): Promise<void> => {
    if (!userId) {
      Alert.alert('Sign in', 'You must be logged in to add to a list.')
      return
    }
    const placeId = detail?.place_id ?? picked?.place_id
    if (!placeId) {
      Alert.alert('Pick a place', 'Choose a suggestion from Google, then tap save.')
      return
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const name =
      detail?.name?.trim()?.length ?? 0
        ? detail!.name!.trim()
        : picked?.structured_formatting?.main_text.trim() ??
          picked?.description.split(',').slice(0, 1)[0]?.trim() ??
          'Unknown place'

    const lat = detail?.geometry?.location?.lat ?? null
    const lng = detail?.geometry?.location?.lng ?? null

    try {
      setSaving(true)
      await attachPlaceFromGoogleDetails({
        placeId,
        location,
        kind,
        name,
        address: detail?.formatted_address ?? null,
        latitude: lat,
        longitude: lng,
        photoUrl: photoFromDetail,
        types: detail?.types ?? null,
      })
      sheetRef.current?.dismiss()
      setPicked(null)
      setDetail(null)
      setQuery('')
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Hasura mutation failed.')
    } finally {
      setSaving(false)
    }
  }

  const onDismissSheet = (): void => {
    setPicked(null)
    setDetail(null)
    setQuery('')
    setPredictions([])
    setSearching(false)
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['88%']}
      enablePanDownToClose
      onDismiss={onDismissSheet}
      keyboardBehavior="interactive"
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: '#d1d5db', width: 40 }}
    >
      <BottomSheetView style={{ flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 16 }}>
        <SectionTitle className="pb-4">Save a place</SectionTitle>

        <View className="mb-4 flex-row rounded-2xl p-1" style={{ backgroundColor: '#f3f4f6' }}>
          {(
            [
              { key: 'checkin' as const, label: 'Check-ins' },
              { key: 'like' as const, label: 'Likes' },
            ] as const
          ).map((tab) => {
            const focused = tab.key === kind
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                onPress={() => {
                  void Haptics.selectionAsync()
                  setKind(tab.key)
                }}
                className="flex-1 items-center rounded-xl py-3"
                style={{ backgroundColor: focused ? '#ffffff' : 'transparent', elevation: focused ? 1 : 0 }}
              >
                <Text style={{ fontWeight: '600', color: focused ? TEXT_HEADING : TEXT_MUTED }}>
                  {tab.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <TextInput
          value={query}
          onChangeText={(t) => {
            setPicked(null)
            setDetail(null)
            setQuery(t)
          }}
          placeholder="Search Google Places..."
          placeholderTextColor={TEXT_MUTED}
          className="rounded-2xl border px-4 py-3 text-base"
          style={mergeTextInputBodyTypography({
            borderColor: BORDER_SUBTLE,
            color: TEXT_HEADING,
          })}
        />

        {!picked && predictions.length ? (
          <ScrollView className="mt-3 flex-1" keyboardShouldPersistTaps="handled">
            {predictions.map((prediction) => (
              <Pressable
                key={prediction.place_id}
                accessibilityRole="button"
                className="border-b py-3"
                style={{ borderColor: '#f3f4f6' }}
                onPress={() => void onPickPrediction(prediction)}
              >
                <Text style={{ fontSize: 15, color: TEXT_HEADING, fontWeight: '600' }}>
                  {prediction.structured_formatting?.main_text ?? prediction.description.split(',')[0]}
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: TEXT_MUTED }}>
                  {prediction.structured_formatting?.secondary_text ??
                    prediction.description.split(',').slice(1).join(',').trim()}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {(searching || saving) && (
          <View className="flex-row items-center gap-2 py-3">
            <ActivityIndicator color={BRAND_PRIMARY} />
            <Text className="text-sm" style={{ color: TEXT_MUTED }}>
              {saving ? 'Saving…' : 'Working…'}
            </Text>
          </View>
        )}

        {picked ? (
          <View className="mt-6 gap-4">
            <View className="flex-row items-start justify-between rounded-3xl border p-4" style={{ borderColor: BORDER_SUBTLE }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: TEXT_HEADING }}>{detail?.name ?? query}</Text>
                {detail?.formatted_address ? (
                  <Text className="mt-2 text-xs" style={{ color: TEXT_MUTED }}>
                    {detail.formatted_address}
                  </Text>
                ) : null}
              </View>
              <AppIcon name="check-circle" size={28} color={BRAND_PRIMARY} />
            </View>

            <Pressable
              onPress={() => void onConfirm()}
              disabled={saving}
              className="items-center rounded-full py-4 active:opacity-90"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <Text className="text-base font-semibold text-white">Save to {kind === 'like' ? 'likes' : 'check-ins'}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                void Haptics.selectionAsync()
                setPicked(null)
                setDetail(null)
              }}
            >
              <Text className="text-center text-sm" style={{ color: BRAND_PRIMARY }}>
                Pick a different place
              </Text>
            </Pressable>
          </View>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  )
})
