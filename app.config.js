/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json')

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

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
      [
        'react-native-maps',
        {
          iosGoogleMapsApiKey: googleMapsApiKey,
          androidGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
    ],
  },
}
