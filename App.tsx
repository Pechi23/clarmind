import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
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
import { UserProfile } from './src/types';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';
import { I18nProvider, useI18n } from './src/i18n';

SplashScreen.preventAutoHideAsync();

function Root() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appReady, setAppReady] = useState(false);
  const { ready: i18nReady } = useI18n();

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
      await refreshProfile();
      setAppReady(true);
    })();
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
          <OnboardingScreen onComplete={refreshProfile} />
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
  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
