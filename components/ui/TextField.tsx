import { forwardRef, type ReactNode } from 'react'
import { Text, TextInput, View, type TextInputProps } from 'react-native'

import {
  BORDER_SUBTLE,
  DANGER,
  SURFACE_CARD,
  TEXT_HEADING,
  TEXT_TERTIARY,
  mergeTextInputBodyTypography,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'

type Props = TextInputProps & {
  label?: string
  /** Red border + message below. */
  error?: string | null
  /** Neutral or success line below (ignored while `error` is set). */
  hint?: ReactNode
  /** Rendered inside the field before the input (e.g. "@"). */
  prefix?: ReactNode
  /** Rendered inside the field after the input (e.g. clear button). */
  suffix?: ReactNode
  /** Overrides the border colour (e.g. green once a username is available). */
  borderColor?: string
  height?: number
}

/** Brand v1.0 input: 52px, radius 12, 1.5px border, DM Sans 16. */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, prefix, suffix, borderColor, height = 52, style, multiline, ...rest },
  ref,
) {
  const border = error ? DANGER : (borderColor ?? BORDER_SUBTLE)
  return (
    <View>
      {label ? (
        <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: TEXT_HEADING, marginBottom: 8 }}>
          {label}
        </Text>
      ) : null}
      <View
        className="flex-row items-center"
        style={{
          minHeight: height,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: border,
          backgroundColor: SURFACE_CARD,
          paddingLeft: 16,
          paddingRight: suffix ? 8 : 16,
          gap: 2,
          alignItems: multiline ? 'flex-start' : 'center',
          paddingVertical: multiline ? 12 : 0,
        }}
      >
        {prefix}
        <TextInput
          ref={ref}
          placeholderTextColor={TEXT_TERTIARY}
          multiline={multiline}
          style={[
            mergeTextInputBodyTypography({
              flex: 1,
              minWidth: 0,
              color: TEXT_HEADING,
              paddingVertical: multiline ? 0 : 12,
              textAlignVertical: multiline ? 'top' : 'center',
            }),
            style,
          ]}
          {...rest}
        />
        {suffix}
      </View>
      {error ? (
        <Text style={{ marginTop: 8, fontFamily: FONT.bodyMedium, fontSize: 13, lineHeight: 18, color: DANGER }}>
          {error}
        </Text>
      ) : hint ? (
        typeof hint === 'string' ? (
          <Text style={{ marginTop: 8, fontFamily: FONT.body, fontSize: 12, lineHeight: 18, color: TEXT_TERTIARY }}>
            {hint}
          </Text>
        ) : (
          <View style={{ marginTop: 8 }}>{hint}</View>
        )
      ) : null}
    </View>
  )
})
