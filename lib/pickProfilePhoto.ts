import { ActionSheetIOS, Alert, Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'

import { imageSizeLimit } from '@/constants/validation'
import { profileImageSizeError } from '@/constants/messages'

export interface PickedProfilePhoto {
  uri: string
  fileName: string
  mimeType: string
}

async function pickFromLibrary(): Promise<PickedProfilePhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  })
  if (result.canceled || !result.assets[0]) return null
  const asset = result.assets[0]
  if (asset.fileSize != null && asset.fileSize > imageSizeLimit) {
    throw new Error(profileImageSizeError)
  }
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? `avatar-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
  }
}

async function pickFromCamera(): Promise<PickedProfilePhoto | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (!perm.granted) return null
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  })
  if (result.canceled || !result.assets[0]) return null
  const asset = result.assets[0]
  if (asset.fileSize != null && asset.fileSize > imageSizeLimit) {
    throw new Error(profileImageSizeError)
  }
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? `avatar-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
  }
}

/** Instagram-style action sheet → square crop → local URI for preview/upload. */
export function pickProfilePhoto(): Promise<PickedProfilePhoto | null> {
  return new Promise((resolve, reject) => {
    const onLibrary = () => {
      void pickFromLibrary().then(resolve).catch(reject)
    }
    const onCamera = () => {
      void pickFromCamera().then(resolve).catch(reject)
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Take photo', 'Choose from library', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) onCamera()
          else if (index === 1) onLibrary()
          else resolve(null)
        },
      )
      return
    }

    Alert.alert('Profile photo', undefined, [
      { text: 'Take photo', onPress: onCamera },
      { text: 'Choose from library', onPress: onLibrary },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ])
  })
}
