/** True when a string looks like a displayable remote image URL (S3 or Nhost Storage). */
export function isDisplayableMediaUrl(url: string | null | undefined): boolean {
  const u = url?.trim()
  if (!u) return false
  if (!/^https?:\/\//i.test(u)) return false
  return true
}

export function isNhostStorageUrl(url: string | null | undefined): boolean {
  const u = url?.trim().toLowerCase() ?? ''
  return u.includes('.storage.') && u.includes('.nhost.run/v1/files/')
}

export function isLegacyS3MediaUrl(url: string | null | undefined): boolean {
  const u = url?.trim().toLowerCase() ?? ''
  return u.includes('amazonaws.com') || u.includes('.s3.')
}
