/** The four display-name variants offered in onboarding step 3 and Edit profile → Display name. */
export type DisplayNameVariant = 'full' | 'initial_last' | 'first' | 'last'

export const DISPLAY_NAME_VARIANTS: { id: DisplayNameVariant; hint: string }[] = [
  { id: 'full', hint: 'Full name' },
  { id: 'initial_last', hint: 'First initial + last name' },
  { id: 'first', hint: 'First name only' },
  { id: 'last', hint: 'Last name only' },
]

/** `Jun` + `Park` → "Jun Park" / "J. Park" / "Jun" / "Park". Falls back to whichever part exists. */
export function buildDisplayName(
  firstRaw: string,
  lastRaw: string,
  variant: DisplayNameVariant,
): string {
  const first = firstRaw.trim()
  const last = lastRaw.trim()
  switch (variant) {
    case 'full':
      return first && last ? `${first} ${last}` : first || last
    case 'initial_last':
      return first && last ? `${first[0]!.toUpperCase()}. ${last}` : first || last
    case 'first':
      return first || last
    case 'last':
      return last || first
  }
}

/** Which variant produced `displayName` (used to preselect in Edit profile). Defaults to full. */
export function detectDisplayNameVariant(
  first: string,
  last: string,
  displayName: string | null | undefined,
): DisplayNameVariant {
  const target = displayName?.trim()
  if (!target) return 'full'
  const hit = DISPLAY_NAME_VARIANTS.find((v) => buildDisplayName(first, last, v.id) === target)
  return hit?.id ?? 'full'
}
