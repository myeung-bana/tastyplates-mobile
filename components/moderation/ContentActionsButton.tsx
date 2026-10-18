import { Pressable } from 'react-native'

import { AppIcon } from '@/components/ui/AppIcon'
import { TEXT_HEADING } from '@/constants/brand'
import { useModeration, type ContentActionsOptions } from '@/contexts/ModerationContext'

/** "•••" trigger for Report / Block. Renders nothing on the viewer's own content. */
export function ContentActionsButton({
  size = 20,
  color = TEXT_HEADING,
  compact = false,
  ...options
}: ContentActionsOptions & {
  size?: number
  color?: string
  /** Inline rows (comments): 24pt box instead of the 40pt nav-bar target. */
  compact?: boolean
}): JSX.Element | null {
  const { openContentActions, canModerate } = useModeration()
  if (!options.targetId || !canModerate(options.ownerId)) return null

  return (
    <Pressable
      onPress={() => openContentActions(options)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="More options"
      className={`${compact ? 'h-6 w-6' : 'h-10 w-10'} items-center justify-center active:opacity-70`}
    >
      <AppIcon name="more-horizontal" size={size} color={color} />
    </Pressable>
  )
}
