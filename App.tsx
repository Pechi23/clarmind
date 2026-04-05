import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
import HomeScreen from './src/screens/HomeScreen';
import { COLORS } from './src/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appReady, setAppReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const init = async () => {
      const saved = await getUserProfile();
      if (saved?.onboardingComplete) {
        setProfile(saved);
      }
      setAppReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (fontsLoaded && appReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, appReady]);

  if (!fontsLoaded || !appReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <>
        <StatusBar style="light" />
        <OnboardingScreen onComplete={async () => {
          const saved = await getUserProfile();
          setProfile(saved);
        }} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <HomeScreen profile={profile} />
    </>
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
