/** Standard icon sizes — aligned with design_system.md §6.1 (web/mobile). */
export const ICON_SIZE = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  nav: 24,
  xl: 28,
  /** Studio tab (+) center button */
  tabStudio: 26,
} as const

export type IconSizeToken = keyof typeof ICON_SIZE

export function resolveIconSize(size: IconSizeToken | number | undefined): number {
  if (size == null) return ICON_SIZE.md
  if (typeof size === 'number') return size
  return ICON_SIZE[size]
}
