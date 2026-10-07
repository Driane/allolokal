import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:   'com.allolokal.app',
  appName: 'AlloLokal',
  webDir:  'dist',

  server: {
    androidScheme: 'https',
    // En dev : décommenter pour pointer vers ton serveur local
    // url: 'http://192.168.1.XXX:5173',
    // cleartext: true,
  },

  plugins: {
    StatusBar: {
      style:           'DARK',
      backgroundColor: '#0b0e14',
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration:        2500,
      launchAutoHide:            true,
      backgroundColor:           '#0b0e14',
      androidSplashResourceName: 'splash',
      androidScaleType:          'CENTER_CROP',
      showSpinner:               false,
    },
  },

  android: {
    buildOptions: {
      keystorePath:       undefined,
      keystoreAlias:      undefined,
    },
    // Minimum Android 6.0 (API 23) — couvre 99%+ des appareils
    minSdkVersion: 23,
  },
};

export default config;
