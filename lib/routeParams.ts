import type { Href } from 'expo-router'

export function firstSegmentParam(raw: string | string[] | undefined): string {
  if (typeof raw !== 'string') {
    const head = Array.isArray(raw) ? raw[0] : undefined
    return typeof head === 'string' ? head : ''
  }
  return raw
}

/** Expo Router exposes a literal `Href` union — helpers emitting `string` need a narrow bridge. */
export function castHref(path: string): Href {
  return path as Href
}
