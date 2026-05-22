import { useMemo } from 'react'
import { SplashScreen } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useFonts } from 'expo-font'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { GluestackUIProvider } from '@gluestack-ui/themed'
import { config } from '@gluestack-ui/config'
import { NhostProvider } from '@nhost/react'
import { ApolloProvider } from '@apollo/client'
import { createApolloClient } from '@nhost/apollo'

import { SplashAuthGate } from '@/components/layout/SplashAuthGate'
import { LocationHierarchyPickerHost } from '@/components/navigation/LocationHierarchyPickerHost'
import { LocationProvider } from '@/contexts/LocationContext'
import { SearchCuisinesSheetProvider } from '@/contexts/SearchCuisinesSheetContext'
import { nhost } from '@/lib/nhost'
import '../global.css'

WebBrowser.maybeCompleteAuthSession()

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({})

  const apolloClient = useMemo(() => createApolloClient({ nhost }), [])

  /** Wait for fonts; session + splash hide handled inside {@link SplashAuthGate} under `NhostProvider`. */
  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NhostProvider nhost={nhost}>
        <ApolloProvider client={apolloClient}>
          <LocationProvider>
            <GluestackUIProvider config={config}>
              <BottomSheetModalProvider>
                <SearchCuisinesSheetProvider>
                  <SplashAuthGate />
                </SearchCuisinesSheetProvider>
                <LocationHierarchyPickerHost />
              </BottomSheetModalProvider>
            </GluestackUIProvider>
          </LocationProvider>
        </ApolloProvider>
      </NhostProvider>
    </GestureHandlerRootView>
  )
}
