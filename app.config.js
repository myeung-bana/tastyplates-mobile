/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json')

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

/** Source-map upload runs only when EAS provides the Sentry project + secret auth token. */
const sentryPlugin =
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN
    ? [
        [
          '@sentry/react-native/expo',
          {
            organization: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            url: process.env.SENTRY_URL ?? 'https://sentry.io/',
          },
        ],
      ]
    : []

module.exports = {
  expo: {
    ...appJson.expo,
    ios: {
      ...appJson.expo.ios,
      config: {
        googleMapsApiKey,
      },
      infoPlist: {
        ...appJson.expo.ios.infoPlist,
        NSLocationWhenInUseUsageDescription:
          'TastyPlates uses your location to show nearby restaurants.',
      },
    },
    android: {
      ...appJson.expo.android,
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    plugins: [
      ...(appJson.expo.plugins ?? []),
      '@react-native-community/datetimepicker',
      [
        'react-native-maps',
        {
          iosGoogleMapsApiKey: googleMapsApiKey,
          androidGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
      ...sentryPlugin,
    ],
  },
}
