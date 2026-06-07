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
import { SystemChrome } from '@/components/layout/SystemChrome'
import { LocationProvider } from '@/contexts/LocationContext'
import { SearchCuisinesSheetProvider } from '@/contexts/SearchCuisinesSheetContext'
import { SearchOverlayProvider } from '@/contexts/SearchOverlayContext'
import { AddRestaurantOverlayProvider } from '@/contexts/AddRestaurantOverlayContext'
import { UploadProvider } from '@/contexts/UploadContext'
import { UploadProgressBar } from '@/components/ui/UploadProgressBar'
import { nhost } from '@/lib/nhost'
import '../global.css'

WebBrowser.maybeCompleteAuthSession()

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  // Neusans: loaded via @font-face in global.css on web; native uses system fallback until .ttf assets are added.
  const [fontsLoaded, fontError] = useFonts({})

  const apolloClient = useMemo(() => createApolloClient({ nhost }), [])

  /** Wait for fonts; session + splash hide handled inside {@link SplashAuthGate} under `NhostProvider`. */
  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SystemChrome />
      <NhostProvider nhost={nhost}>
        <ApolloProvider client={apolloClient}>
          <GluestackUIProvider config={config}>
            <BottomSheetModalProvider>
              <UploadProvider>
                <LocationProvider>
                  <SearchOverlayProvider>
                    <AddRestaurantOverlayProvider>
                      <SearchCuisinesSheetProvider>
                        <UploadProgressBar />
                        <SplashAuthGate />
                      </SearchCuisinesSheetProvider>
                    </AddRestaurantOverlayProvider>
                  </SearchOverlayProvider>
                </LocationProvider>
              </UploadProvider>
            </BottomSheetModalProvider>
          </GluestackUIProvider>
        </ApolloProvider>
      </NhostProvider>
    </GestureHandlerRootView>
  )
}
