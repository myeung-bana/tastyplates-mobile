import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ReviewViewerScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold text-white">Review Viewer</Text>
        <Text className="mt-2 text-sm text-gray-400">Full-screen viewer coming soon</Text>
      </View>
    </SafeAreaView>
  )
}
