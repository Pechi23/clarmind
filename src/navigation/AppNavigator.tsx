import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import {
  createBottomTabNavigator, BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '../constants/theme';
import { UserProfile } from '../types';
import { useI18n } from '../i18n';
import HomeScreen from '../screens/HomeScreen';
import BreatheScreen from '../screens/BreatheScreen';
import { capture } from '../services/analytics';
import SkyScreen from '../screens/SkyScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FloatingClara from '../components/FloatingClara';
import GuideOverlay from '../components/GuideOverlay';
import {
  getGuideSeen, getNotifAsked, setNotifAsked, setNotificationsEnabled, getReminderTime,
  getNotificationsEnabled,
} from '../services/storage';
import { requestNotificationPermissions, scheduleDailyReminder } from '../services/notifications';

const Tab = createBottomTabNavigator();

interface Props {
  profile: UserProfile;
  onReset: () => void;
}

const TAB_ORDER = ['Home', 'Breathe', 'Sky', 'Top', 'Profile'] as const;

const TAB_ICONS: Record<string, string> = {
  Home: '🌙',
  Breathe: '🌬️',
  Sky: '🌌',
  Top: '🏆',
  Profile: '⚙️',
};

const TAB_KEYS: Record<string, string> = {
  Home: 'tabs.home', Breathe: 'tabs.breathe', Sky: 'tabs.sky', Top: 'tabs.top', Profile: 'tabs.profile',
};

// The floating bottom pill used on phones / narrow screens.
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBarWrap, { bottom: insets.bottom + 12 }]}>
      <LinearGradient
        colors={['rgba(15,12,41,0.85)', 'rgba(15,12,41,0.98)']}
        style={styles.tabBar}
      >
        {state.routes.map((route, idx) => {
          const focused = state.index === idx;
          const icon = TAB_ICONS[route.name] ?? '•';

          const onPress = () => {
            if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityLabel={t(TAB_KEYS[route.name] ?? route.name)}
            >
              {focused && <View style={styles.activeBg} />}
              <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
              <View style={[styles.dot, focused && styles.dotActive]} />
            </TouchableOpacity>
          );
        })}
      </LinearGradient>
    </View>
  );
}

// A proper left navigation rail shown on wide web screens (desktop / tablet).
function WebSidebar({ active, onNavigate }: { active: string; onNavigate: (name: string) => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.sidebar}>
      <Text style={styles.sidebarLogo}>✦ Stillnova</Text>
      <View style={styles.sidebarNav}>
        {TAB_ORDER.map((name) => {
          const focused = active === name;
          return (
            <TouchableOpacity
              key={name}
              onPress={() => onNavigate(name)}
              activeOpacity={0.8}
              style={[styles.sideItem, focused && styles.sideItemActive]}
              accessibilityRole="tab"
              accessibilityLabel={t(TAB_KEYS[name])}
            >
              <Text style={[styles.sideIcon, focused && styles.sideIconActive]}>{TAB_ICONS[name]}</Text>
              <Text style={[styles.sideLabel, focused && styles.sideLabelActive]}>{t(TAB_KEYS[name])}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.sidebarFoot}>✦</Text>
    </View>
  );
}

export default function AppNavigator({ profile, onReset }: Props) {
  const [showGuide, setShowGuide] = useState(false);
  const { width } = useWindowDimensions();
  const wideWeb = Platform.OS === 'web' && width >= 900;
  const navigationRef = useNavigationContainerRef();
  const [activeRoute, setActiveRoute] = useState<string>('Home');

  useEffect(() => {
    getGuideSeen().then((seen) => setShowGuide(!seen));
  }, []);

  // Ask for notification permission once, on first entry into the app.
  useEffect(() => {
    (async () => {
      if (await getNotifAsked()) return;
      await setNotifAsked(true);
      const granted = await requestNotificationPermissions();
      if (granted) {
        await setNotificationsEnabled(true);
        const { hour, minute } = await getReminderTime();
        await scheduleDailyReminder(hour, minute);
      }
    })();
  }, []);

  // On every app open, if reminders are on, reschedule so the daily body rotates
  // and picks up the current language (the DAILY trigger otherwise repeats one
  // fixed sentence forever).
  useEffect(() => {
    (async () => {
      if (await getNotificationsEnabled()) {
        const { hour, minute } = await getReminderTime();
        await scheduleDailyReminder(hour, minute);
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        onStateChange={(state) => {
          const route = state?.routes[state.index]?.name;
          if (route) { setActiveRoute(route); capture('screen_view', { screen: route }); }
        }}
      >
        <View style={[styles.shell, wideWeb && styles.shellRow]}>
          {wideWeb && (
            <WebSidebar active={activeRoute} onNavigate={(n) => navigationRef.navigate(n as never)} />
          )}
          <View style={[styles.stage, wideWeb && styles.stageWeb]}>
            <View style={[styles.column, wideWeb && styles.columnWeb]}>
              <Tab.Navigator
                screenOptions={{ headerShown: false }}
                tabBar={wideWeb ? () => null : (props) => <CustomTabBar {...props} />}
              >
                <Tab.Screen name="Home">
                  {() => <HomeScreen profile={profile} onProfileChange={onReset} />}
                </Tab.Screen>
                <Tab.Screen name="Breathe" component={BreatheScreen} />
                <Tab.Screen name="Sky">
                  {() => <SkyScreen profile={profile} />}
                </Tab.Screen>
                <Tab.Screen name="Top">
                  {() => <LeaderboardScreen profile={profile} />}
                </Tab.Screen>
                <Tab.Screen name="Profile">
                  {() => <ProfileScreen profile={profile} onReset={onReset} />}
                </Tab.Screen>
              </Tab.Navigator>
            </View>
          </View>
        </View>
      </NavigationContainer>

      {/* Draggable Clara — floats over every main screen */}
      <FloatingClara profile={profile} />

      {/* First-run guide */}
      {showGuide && <GuideOverlay onDone={() => setShowGuide(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  shellRow: { flexDirection: 'row' },
  stage: { flex: 1 },
  // On wide web, center the app in a column on the ambient background.
  stageWeb: { alignItems: 'center', backgroundColor: COLORS.background },
  column: { flex: 1, width: '100%' },
  columnWeb: {
    maxWidth: 680,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  // Left sidebar (wide web)
  sidebar: {
    width: 232,
    backgroundColor: '#0b0920',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
    paddingTop: 28,
    paddingHorizontal: 16,
  },
  sidebarLogo: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    color: COLORS.primary,
    letterSpacing: 1,
    paddingHorizontal: 12,
    marginBottom: 28,
  },
  sidebarNav: { gap: 4, flex: 1 },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  sideItemActive: { backgroundColor: 'rgba(167,139,250,0.16)' },
  sideIcon: { fontSize: 20, opacity: 0.7 },
  sideIconActive: { opacity: 1 },
  sideLabel: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.textMuted },
  sideLabelActive: { color: COLORS.text },
  sidebarFoot: { color: 'rgba(167,139,250,0.4)', fontSize: 16, paddingHorizontal: 12, paddingBottom: 20 },

  // Floating bottom pill (phones / narrow)
  tabBarWrap: {
    position: 'absolute',
    left: 16, right: 16,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    alignSelf: 'center',
    maxWidth: 520,
    width: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, position: 'relative',
  },
  activeBg: {
    position: 'absolute', top: 0, left: '15%', right: '15%', bottom: 0,
    backgroundColor: 'rgba(167,139,250,0.18)',
    borderRadius: 22,
  },
  tabIcon: { fontSize: 22, opacity: 0.6 },
  tabIconActive: { opacity: 1 },
  dot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: 'transparent', marginTop: 4,
  },
  dotActive: { backgroundColor: COLORS.primary },
});
