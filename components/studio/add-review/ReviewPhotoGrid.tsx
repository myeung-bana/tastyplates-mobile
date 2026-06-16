import { ActionSheetIOS, Alert, Image, Platform, Pressable, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { AppIcon } from '@/components/ui/AppIcon'

import { maximumImage } from '@/constants/validation'
import type { PendingReviewPhoto } from '@/lib/uploadReviewPhotos'

const TILE = 86

type Props = {
  previewUris: string[]
  pending: PendingReviewPhoto[]
  onChange: (previews: string[], pending: PendingReviewPhoto[]) => void
  /** Preview tiles at the start that are already-uploaded URLs (not in `pending`). */
  leadingSavedCount?: number
  error?: string
}

async function pickFromLibrary(
  remaining: number,
): Promise<ImagePicker.ImagePickerAsset[] | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 0.8,
  })
  if (result.canceled) return null
  return result.assets
}

async function pickFromCamera(): Promise<ImagePicker.ImagePickerAsset | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (!perm.granted) return null
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  })
  if (result.canceled) return null
  return result.assets[0] ?? null
}

function assetToPending(asset: ImagePicker.ImagePickerAsset, index: number): PendingReviewPhoto {
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? `photo-${Date.now()}-${index}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
  }
}

export function ReviewPhotoGrid({
  previewUris,
  pending,
  onChange,
  leadingSavedCount = 0,
  error,
}: Props): JSX.Element {
  const addAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const nextPending = [...pending]
    const nextPreviews = [...previewUris]
    for (let i = 0; i < assets.length && nextPreviews.length < maximumImage; i++) {
      const a = assets[i]!
      nextPending.push(assetToPending(a, nextPreviews.length))
      nextPreviews.push(a.uri)
    }
    onChange(nextPreviews, nextPending)
  }

  const showPicker = () => {
    const remaining = maximumImage - previewUris.length
    if (remaining <= 0) return

    const takePhoto = () => {
      void pickFromCamera().then((asset) => {
        if (asset) addAssets([asset])
      })
    }

    const chooseLibrary = () => {
      void pickFromLibrary(remaining).then((assets) => {
        if (assets?.length) addAssets(assets)
      })
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Take Photo', 'Choose from Library', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) takePhoto()
          if (index === 1) chooseLibrary()
        },
      )
    } else {
      Alert.alert('Add photo', undefined, [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: chooseLibrary },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }

  const removeAt = (index: number) => {
    if (index < leadingSavedCount) {
      onChange(
        previewUris.filter((_, i) => i !== index),
        pending,
      )
      return
    }
    const pendingIndex = index - leadingSavedCount
    onChange(
      previewUris.filter((_, i) => i !== index),
      pending.filter((_, i) => i !== pendingIndex),
    )
  }

  return (
    <View className="px-4 pb-4">
      <Text className="mb-3 font-neusans text-sm text-[#374151]">Upload Photos (Max 6 Photos)</Text>
      <View className="flex-row flex-wrap gap-3">
        {previewUris.map((uri, index) => (
          <View key={`${uri}-${index}`} style={{ width: TILE, height: TILE }}>
            <Image
              source={{ uri }}
              style={{ width: TILE, height: TILE, borderRadius: 12 }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              onPress={() => removeAt(index)}
              className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-black/60"
            >
              <AppIcon name="x" size={12} color="#ffffff" />
            </Pressable>
          </View>
        ))}
        {previewUris.length < maximumImage ? (
          <Pressable
            accessibilityRole="button"
            onPress={showPicker}
            className="items-center justify-center rounded-xl border-2 border-dashed border-[#e5e7eb]"
            style={{ width: TILE, height: TILE }}
          >
            <AppIcon name="plus" size={24} color="#9ca3af" />
            <Text className="mt-1 text-center font-neusans text-[10px] text-[#9ca3af]">
              Add{'\n'}Photo
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="mt-1 font-neusans text-xs text-red-600">{error}</Text> : null}
    </View>
  )
}
