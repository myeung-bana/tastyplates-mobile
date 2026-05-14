import { useEffect, useMemo } from 'react'
import { Slot } from 'expo-router'
import { SplashScreen } from 'expo-router'
import { useFonts } from 'expo-font'
import { GluestackUIProvider } from '@gluestack-ui/themed'
import { config } from '@gluestack-ui/config'
import { NhostProvider } from '@nhost/react'
import { ApolloProvider } from '@apollo/client'
import { createApolloClient } from '@nhost/apollo'

import { nhost } from '@/lib/nhost'
import '../global.css'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({})

  const apolloClient = useMemo(() => createApolloClient({ nhost }), [])

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <NhostProvider nhost={nhost}>
      <ApolloProvider client={apolloClient}>
        <GluestackUIProvider config={config}>
          <Slot />
        </GluestackUIProvider>
      </ApolloProvider>
    </NhostProvider>
  )
}
