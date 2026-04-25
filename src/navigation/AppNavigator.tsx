import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createBottomTabNavigator, BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '../constants/theme';
import { UserProfile } from '../types';
import HomeScreen from '../screens/HomeScreen';
import BreatheScreen from '../screens/BreatheScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

interface Props {
  profile: UserProfile;
  onReset: () => void;
}

const TAB_ICONS: Record<string, string> = {
  Home: '🌙',
  Breathe: '🌬️',
  Top: '🏆',
  Profile: '⚙️',
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.tabBarWrap}>
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

export default function AppNavigator({ profile, onReset }: Props) {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tab.Screen name="Home">
          {() => <HomeScreen profile={profile} />}
        </Tab.Screen>
        <Tab.Screen name="Breathe" component={BreatheScreen} />
        <Tab.Screen name="Top">
          {() => <LeaderboardScreen profile={profile} />}
        </Tab.Screen>
        <Tab.Screen name="Profile">
          {() => <ProfileScreen profile={profile} onReset={onReset} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
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
