import { NhostClient } from '@nhost/nhost-js'
import * as SecureStore from 'expo-secure-store'

export const nhost = new NhostClient({
  subdomain: process.env.EXPO_PUBLIC_NHOST_SUBDOMAIN!,
  region: process.env.EXPO_PUBLIC_NHOST_REGION!,
  clientStorageType: 'expo-secure-storage',
  clientStorage: SecureStore,
})
