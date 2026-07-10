/** DB-aligned gender slugs — aligned with tastyplates-v2-1 `formOptions.ts`. */
export const genderOptions = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'rather-not-say', label: 'Rather not say' },
  { value: 'custom', label: 'Custom' },
] as const

export type GenderValue = (typeof genderOptions)[number]['value']

export function genderLabelForValue(value: string | null | undefined): string {
  const match = genderOptions.find((o) => o.value === value)
  return match?.label ?? ''
}
