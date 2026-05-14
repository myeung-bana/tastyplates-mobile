import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Constants from 'expo-constants'

export default function AboutScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold text-gray-800">About Tastyplates</Text>
        <Text className="mt-2 text-sm text-gray-500">
          Version {Constants.expoConfig?.version ?? '—'}
        </Text>
      </View>
    </SafeAreaView>
  )
}
