import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function AccountProfileSettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold text-gray-800">Profile Settings</Text>
        <Text className="mt-2 text-sm text-gray-500">Update email, birthdate, gender</Text>
      </View>
    </SafeAreaView>
  )
}
