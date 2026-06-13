import Constants from 'expo-constants'

const APP_SCHEME = 'tastyplates'

function stripLeadingSlash(path: string): string {
  return path.replace(/^\//, '')
}

/**
 * Canonical auth deep links that match `[auth.redirections].allowedUrls` in `tastyplates-nhost/nhost/nhost.toml`.
 *
 * Do not use `Linking.createURL()` for Nhost `redirectTo` — it may emit `tastyplates:///path` (triple slash)
 * and the Nhost JS client rewrites custom schemes incorrectly when `clientUrl` is set.
 */
export function authDeepLink(path: string): string {
  const route = stripLeadingSlash(path)
  const useExpoDevScheme =
    __DEV__ &&
    (Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === 'storeClient')

  if (useExpoDevScheme) {
    return `exp+${APP_SCHEME}://${route}`
  }

  return `${APP_SCHEME}://${route}`
}
