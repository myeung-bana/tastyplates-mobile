import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'

import { TEXT_HEADING } from '@/constants/brand'
import { headingFont } from '@/constants/typography'

/**
 * Shared stack header — matches TastyStudio (e.g. Manage Reviews): minimal back chevron, no “Back” label.
 */
export const STACK_DETAIL_HEADER_OPTIONS: NativeStackNavigationOptions = {
  headerShadowVisible: false,
  headerTintColor: TEXT_HEADING,
  headerStyle: { backgroundColor: '#ffffff' },
  headerTitleStyle: { fontFamily: headingFont('600') },
  headerBackTitle: '',
  headerBackTitleVisible: false,
  headerBackButtonDisplayMode: 'minimal',
}
