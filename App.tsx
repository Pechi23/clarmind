import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState, Platform, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { getUserProfile } from './src/services/storage';
import { configurePurchases, refreshPremium } from './src/services/purchases';
import { initAnalytics, capture } from './src/services/analytics';
import { UserProfile } from './src/types';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';
import { I18nProvider, useI18n } from './src/i18n';
import { syncOnLogin, backupIfSignedIn } from './src/services/sync';

SplashScreen.preventAutoHideAsync();

function Root() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appReady, setAppReady] = useState(false);
  const { ready: i18nReady } = useI18n();
  const { width } = useWindowDimensions();
  const wideWeb = Platform.OS === 'web' && width >= 900;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const refreshProfile = async () => {
    const saved = await getUserProfile();
    setProfile(saved?.onboardingComplete ? saved : null);
  };

  useEffect(() => {
    (async () => {
      // Resolve premium before the UI mounts so a paying subscriber doesn't see
      // the paywall on a cold start. Cap the wait so a slow/offline RevenueCat
      // never blocks launch (screens fall back to the free tier meanwhile).
      const timeout = new Promise<void>((r) => setTimeout(r, 3000));
      await Promise.race([configurePurchases(), timeout]);
      await initAnalytics();
      capture('app_open');
      // If already signed in, reconcile with the cloud before reading the profile
      // so restored data (birth details, progress) is present when screens mount.
      try { await syncOnLogin(); } catch {}
      await refreshProfile();
      setAppReady(true);
    })();
  }, []);

  // Back up to the cloud when the app goes to the background (signed-in users only).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'inactive') backupIfSignedIn();
      if (s === 'active') refreshPremium(); // pick up a purchase/restore made elsewhere
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded && appReady && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, appReady, i18nReady]);

  if (!fontsLoaded || !appReady || !i18nReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {!profile ? (
          <View style={wideWeb ? styles.onboardWebWrap : styles.flex}>
            <View style={wideWeb ? styles.onboardWebColumn : styles.flex}>
              <OnboardingScreen onComplete={refreshProfile} />
            </View>
          </View>
        ) : (
          <AppNavigator profile={profile} onReset={refreshProfile} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <Root />
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // On wide web, center onboarding in a column on the ambient background.
  onboardWebWrap: { flex: 1, alignItems: 'center', backgroundColor: COLORS.background },
  onboardWebColumn: { flex: 1, width: '100%', maxWidth: 480 },
});
