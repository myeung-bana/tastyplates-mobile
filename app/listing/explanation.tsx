import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ListingExplanationScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold text-gray-800">Add a Restaurant</Text>
        <Text className="mt-2 text-sm text-gray-500">What you need to know before listing</Text>
      </View>
    </SafeAreaView>
  )
}
