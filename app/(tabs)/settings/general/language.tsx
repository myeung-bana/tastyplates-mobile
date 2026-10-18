import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  SURFACE_CARD,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'

const LANGUAGES: { native: string; english: string; supported: boolean }[] = [
  { native: 'English', english: 'Default', supported: true },
  { native: '한국어', english: 'Korean', supported: false },
  { native: '繁體中文', english: 'Chinese (Traditional)', supported: false },
  { native: '简体中文', english: 'Chinese (Simplified)', supported: false },
  { native: 'Français', english: 'French', supported: false },
  { native: 'Deutsch', english: 'German', supported: false },
  { native: 'Español', english: 'Spanish', supported: false },
]

/** `/settings/general/language` (design T7). English only for now; the rest are listed, disabled. */
export default function LanguageSettingsScreen(): JSX.Element {
  const insets = useSafeAreaInsets()
  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE_CARD }}>
      <ReviewDetailTopNav title="Language" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 32 }}>
        <Text style={{ marginBottom: 14, fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED }}>Select your display language.</Text>
        <View accessibilityRole="radiogroup" style={{ borderRadius: 16, borderWidth: 1, borderColor: BORDER_SUBTLE, overflow: 'hidden' }}>
          {LANGUAGES.map((lang, i) => (
            <View
              key={lang.native}
              accessible
              accessibilityRole="radio"
              accessibilityState={{ selected: lang.supported, disabled: !lang.supported }}
              accessibilityLabel={`${lang.native}, ${lang.supported ? 'selected' : 'not supported yet'}`}
              className="flex-row items-center"
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                gap: 12,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: BORDER_SUBTLE,
                opacity: lang.supported ? 1 : 0.5,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: FONT.headingMedium, fontSize: 16, color: TEXT_HEADING }}>{lang.native}</Text>
                <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>
                  {lang.supported ? lang.english : `${lang.english} · Not supported yet`}
                </Text>
              </View>
              {lang.supported ? <AppIcon name="check" size={18} color={BRAND_PRIMARY} /> : null}
            </View>
          ))}
        </View>
        <Text style={{ marginTop: 14, fontFamily: FONT.body, fontSize: 12, color: TEXT_TERTIARY }}>Other languages are coming soon.</Text>
      </ScrollView>
    </View>
  )
}
