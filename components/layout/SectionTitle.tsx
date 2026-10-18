import type { ReactNode } from 'react'
import { Text, type TextProps } from 'react-native'

import { TEXT_HEADING } from '@/constants/brand'
import { FONT } from '@/constants/typography'

type Props = TextProps & {
  children: ReactNode
}

/** Section heading (brand v1.0): Jost 500 18. */
export function SectionTitle({ children, style, ...rest }: Props): JSX.Element {
  return (
    <Text
      accessibilityRole="header"
      style={[{ fontFamily: FONT.headingMedium, fontSize: 18, lineHeight: 22, color: TEXT_HEADING }, style]}
      {...rest}
    >
      {children}
    </Text>
  )
}
