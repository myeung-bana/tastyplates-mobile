/** Parse ISO `YYYY-MM-DD` or `MM/DD/YYYY` into a local calendar date. */
export function parseBirthdateString(dateString: string): Date | null {
  const raw = dateString.trim()
  if (!raw) return null

  let year: number
  let month: number
  let day: number

  if (raw.includes('/')) {
    const parts = raw.split('/')
    if (parts.length !== 3) return null
    const [monthStr, dayStr, yearStr] = parts
    month = Number(monthStr)
    day = Number(dayStr)
    year = Number(yearStr)
  } else if (raw.includes('-')) {
    const parts = raw.split('-')
    if (parts.length !== 3) return null
    const [yearStr, monthStr, dayStr] = parts
    year = Number(yearStr)
    month = Number(monthStr)
    day = Number(dayStr)
  } else {
    return null
  }

  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

/** Display as `MM/DD/YYYY` for form fields. */
export function formatBirthdateDisplay(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

/** API payload `YYYY-MM-DD`. */
export function formatBirthdateForApi(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Normalize stored birthdate to `YYYY-MM-DD` for API. */
export function normalizeBirthdateForApi(dateString: string): string {
  const parsed = parseBirthdateString(dateString)
  if (!parsed) return dateString.trim()
  return formatBirthdateForApi(parsed)
}

export function computeAge(birthdate: Date, today = new Date()): number {
  let age = today.getFullYear() - birthdate.getFullYear()
  const monthDelta = today.getMonth() - birthdate.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthdate.getDate())) {
    age--
  }
  return age
}
