import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function PasswordSettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold text-gray-800">Password</Text>
        <Text className="mt-2 text-sm text-gray-500">Change or reset your password</Text>
      </View>
    </SafeAreaView>
  )
}
