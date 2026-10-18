import { useEffect, useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SplashScreen, type ErrorBoundaryProps } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useFonts } from 'expo-font'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { GluestackUIProvider } from '@gluestack-ui/themed'
import { config } from '@gluestack-ui/config'
import { NhostProvider } from '@nhost/react'
import { ApolloProvider } from '@apollo/client'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { createNhostApolloClient } from '@/lib/nhostApolloClient'

import { SplashAuthGate } from '@/components/layout/SplashAuthGate'
import { SystemChrome } from '@/components/layout/SystemChrome'
import { AuthSheetProvider } from '@/contexts/AuthSheetContext'
import { LocationProvider } from '@/contexts/LocationContext'
import { ModerationProvider } from '@/contexts/ModerationContext'
import { SearchCuisinesSheetProvider } from '@/contexts/SearchCuisinesSheetContext'
import { SearchOverlayProvider } from '@/contexts/SearchOverlayContext'
import { AddRestaurantOverlayProvider } from '@/contexts/AddRestaurantOverlayContext'
import { UploadProvider } from '@/contexts/UploadContext'
import { UploadProgressBar } from '@/components/ui/UploadProgressBar'
import { ToastHost } from '@/components/ui/ToastHost'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { nhost } from '@/lib/nhost'
import { initSentry, Sentry, sentryEnabled } from '@/lib/sentry'
import '../global.css'

initSentry()

WebBrowser.maybeCompleteAuthSession()

SplashScreen.preventAutoHideAsync()

function RootLayout() {
  // Neusans: loaded via @font-face in global.css on web; native uses system fallback until .ttf assets are added.
  const [fontsLoaded, fontError] = useFonts({})

  const apolloClient = useMemo(() => createNhostApolloClient({ nhost }), [])

  /** Wait for fonts; session + splash hide handled inside {@link SplashAuthGate} under `NhostProvider`. */
  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} pointerEvents="box-none">
      <SafeAreaProvider>
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
                          <AuthSheetProvider>
                            <ModerationProvider>
                              <UploadProgressBar />
                              <ToastHost />
                              <SplashAuthGate />
                            </ModerationProvider>
                          </AuthSheetProvider>
                        </SearchCuisinesSheetProvider>
                      </AddRestaurantOverlayProvider>
                    </SearchOverlayProvider>
                  </LocationProvider>
                </UploadProvider>
              </BottomSheetModalProvider>
            </GluestackUIProvider>
          </ApolloProvider>
        </NhostProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default sentryEnabled ? Sentry.wrap(RootLayout) : RootLayout

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps): JSX.Element {
  useEffect(() => {
    if (sentryEnabled) Sentry.captureException(error)
  }, [error])

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Text className="mb-2 text-center text-lg font-neusans" style={{ color: TEXT_HEADING }}>
        Something went wrong
      </Text>
      <Text className="mb-6 text-center text-sm font-neusans" style={{ color: TEXT_MUTED }}>
        We have been notified and are looking into it.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        className="rounded-full px-6 py-3 active:opacity-90"
        style={{ backgroundColor: BRAND_PRIMARY }}
      >
        <Text className="text-base font-semibold text-white">Try again</Text>
      </Pressable>
    </View>
  )
}
