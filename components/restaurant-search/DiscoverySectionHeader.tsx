import { Text, View } from 'react-native'

interface DiscoverySectionHeaderProps {
  title: string
}

export function DiscoverySectionHeader({ title }: DiscoverySectionHeaderProps): JSX.Element {
  return (
    <Text className="px-4 pb-1.5 pt-4 font-neusans text-[11px] font-semibold uppercase tracking-wide text-gray-400">
      {title}
    </Text>
  )
}

interface DiscoveryErrorBannerProps {
  message: string
}

export function DiscoveryErrorBanner({ message }: DiscoveryErrorBannerProps): JSX.Element {
  return (
    <View className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2">
      <Text className="font-neusans text-xs text-red-600">{message}</Text>
    </View>
  )
}
