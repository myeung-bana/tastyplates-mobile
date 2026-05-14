import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function RestaurantsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold text-gray-800">Restaurants</Text>
        <Text className="mt-2 text-sm text-gray-500">Discovery coming soon</Text>
      </View>
    </SafeAreaView>
  )
}
