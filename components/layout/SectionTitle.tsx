import type { ReactNode } from 'react'
import { Text, type TextProps } from 'react-native'

type Props = TextProps & {
  children: ReactNode
}

/** Section / screen heading — matches home Quick finds card title ({@link HomeSectionCard}). */
export function SectionTitle({ children, className, ...rest }: Props): JSX.Element {
  return (
    <Text className={`text-base font-semibold text-gray-900${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </Text>
  )
}
