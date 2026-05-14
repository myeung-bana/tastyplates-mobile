import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ListingStep2Screen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold text-gray-800">Additional Details</Text>
        <Text className="mt-2 text-sm text-gray-500">Step 2: Confirm before submitting</Text>
      </View>
    </SafeAreaView>
  )
}
