import React from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';

const NAV_ITEMS = [
  {
    label: 'Home',
    href: '/',
    icon: 'home-outline',
    activeIcon: 'home',
    match: '/',
  },
  {
    label: 'Workouts',
    href: '/workouts',
    icon: 'list-outline',
    activeIcon: 'list',
    match: '/workouts',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: 'settings-outline',
    activeIcon: 'settings',
    match: '/settings',
  },
] as const;

function BottomNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={[styles.navBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {NAV_ITEMS.map((tab) => {
        const active =
          tab.match === '/' ? pathname === '/' : pathname.startsWith(tab.match);
        const handlePress = () => {
          if (active) return;
          router.replace(tab.href);
        };
        return (
          <Pressable key={tab.href} style={styles.navItem} onPress={handlePress}>
            <Ionicons
              name={(active ? tab.activeIcon : tab.icon) as any}
              size={22}
              color={active ? '#38BDF8' : '#94A3B8'}
            />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={styles.root}>
          <View style={styles.content}>
            <Stack screenOptions={{ headerShown: false }} />
          </View>
          <BottomNav />
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030712',
  },
  content: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#1F2A44',
    backgroundColor: '#040B1A',
    paddingTop: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  navLabelActive: {
    color: '#38BDF8',
    fontWeight: '600',
  },
});
