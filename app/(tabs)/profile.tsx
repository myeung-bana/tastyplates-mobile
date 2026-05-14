import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { SCREEN_LOGIN } from '@/constants/screens'

export default function ProfileScreen() {
  const { isAuthenticated, loading } = useAuth()

  if (!loading && !isAuthenticated) {
    return <Redirect href={SCREEN_LOGIN} />
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold text-gray-800">Profile</Text>
        <Text className="mt-2 text-sm text-gray-500">Your profile coming soon</Text>
      </View>
    </SafeAreaView>
  )
}
