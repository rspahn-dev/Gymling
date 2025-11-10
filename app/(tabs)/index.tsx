import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const actions = [
  {
    title: 'Creature',
    href: '/creature',
    icon: 'paw-outline' as const,
  },
  {
    title: 'Battle',
    href: '/battle',
    icon: 'flash-outline' as const,
  },
  {
    title: 'Log Workout',
    href: '/workout',
    icon: 'create-outline' as const,
  },
];

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Choose your next move</Text>
        <Text style={styles.title}>Welcome back, Trainer!</Text>
        <Text style={styles.subtitle}>
          Jump into your creature, battle new foes, or log a workout to keep the streak alive.
        </Text>
      </View>

      <View style={styles.grid}>
        {actions.map((action) => (
          <Link key={action.title} href={action.href} asChild>
            <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
              <Ionicons name={action.icon} size={40} color="#38BDF8" style={styles.cardIcon} />
              <Text style={styles.cardTitle}>{action.title}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#0B1120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  eyebrow: {
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#CBD5F5',
    lineHeight: 20,
    textAlign: 'center',
  },
  grid: {
    width: '100%',
    maxWidth: 420,
    gap: 16,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#111E33',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2A44',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  cardIcon: {
    marginRight: 12,
  },
});
