/** Palate pills use neutral gray per `profile.md` §4 (not brand orange chips). */
export function parseProfilePalates(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    const out: string[] = []
    for (const el of raw) {
      if (typeof el === 'string' && el.trim()) out.push(capitalizePhrase(el.trim()))
      else if (el && typeof el === 'object' && 'name' in el) {
        const n = (el as { name?: unknown }).name
        if (typeof n === 'string' && n.trim()) out.push(capitalizePhrase(n.trim()))
      }
    }
    return [...new Set(out)]
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return parseProfilePalates(parsed)
    } catch {
      return raw.includes(',')
        ? raw.split(',').map((s) => capitalizePhrase(s.trim())).filter(Boolean)
        : capitalizePhrase(raw.trim())
          ? [capitalizePhrase(raw.trim())]
          : []
    }
  }
  return []
}

export function capitalizePhrase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatMemberSince(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return `Member since ${d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`
  } catch {
    return ''
  }
}

export function initialsFromName(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return t.slice(0, 2).toUpperCase()
}
