import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { SectionTitle } from '@/components/layout/SectionTitle'
import { TEXT_MUTED } from '@/constants/brand'

/** Placeholder — `documentation/profile.md` §10 */
export default function FollowersScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="flex-1 items-center justify-center px-8">
        <SectionTitle>Followers</SectionTitle>
        <Text style={{ color: TEXT_MUTED }} className="mt-2 text-center text-sm leading-relaxed">
          List loading will be wired in a future pass.
        </Text>
      </View>
    </SafeAreaView>
  )
}
