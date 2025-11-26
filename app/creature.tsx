import { useCreature } from '@/hooks/use-creature';
import type { Creature } from '@/models/creature';
import { Link } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&h=300&fit=crop';

const STAT_ICONS: Record<keyof Creature['stats'], string> = {
  str: '💪',
  agi: '💨',
  sta: '❤️',
  int: '🧠',
};

export default function CreatureScreen() {
  const { creature, isCreatureLoading } = useCreature();

  if (!creature) {
    return (
      <View style={styles.emptyState}>
        <Text>{isCreatureLoading ? 'Loading creature...' : 'No creature data found.'}</Text>
      </View>
    );
  }

  const totalStats = useMemo(
    () => Object.values(creature.stats).reduce((sum, value) => sum + value, 0),
    [creature.stats],
  );
  const highestStatKey = useMemo(
    () =>
      (Object.entries(creature.stats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'str') as keyof
        typeof creature.stats,
    [creature.stats],
  );
  const previewImage = creature.imageUrl || FALLBACK_IMAGE;
  const displayName =
    creature.name.trim().length > 0 ? creature.name : 'Name your creature';

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <Image source={{ uri: previewImage }} style={styles.creatureImage} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.subtitle}>Stage {creature.evolutionStage ?? 1}</Text>
            <Text style={styles.subtitleSmall}>
              XP {creature.xp} / {creature.xpToNext}
            </Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelLabel}>Level</Text>
            <Text style={styles.levelValue}>{creature.level}</Text>
          </View>
        </View>

        <View style={styles.helperCard}>
          <Text style={styles.helperText}>
            Customize your companion&apos;s name and portrait from the Settings tab.
          </Text>
          <Link href="/settings" style={styles.settingsLink}>
            Go to Settings
          </Link>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Power Score</Text>
            <Text style={styles.summaryValue}>{totalStats}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Focus Stat</Text>
            <Text style={styles.summaryValue}>{highestStatKey.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Core Stats</Text>
        <View style={styles.statsContainer}>
          {Object.entries(creature.stats).map(([key, value]) => {
            const icon = STAT_ICONS[key as keyof Creature['stats']] ?? '✨';
            return (
              <View key={key} style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>
                    <Text style={styles.statIcon}>{icon}</Text> {key.toUpperCase()}
                  </Text>
                  <Text style={styles.statValue}>{value}</Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min((value / 20) * 100, 100)}%` },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Bag</Text>
        <View style={styles.bagList}>
          {creature.bag && creature.bag.length > 0 ? (
            creature.bag.map((item) => (
              <View key={item.id} style={styles.bagItem}>
                {item.icon && item.icon.startsWith('http') ? (
                  <Image source={{ uri: item.icon }} style={styles.bagIconImage} />
                ) : (
                  <Text style={styles.bagIconEmoji}>{item.icon ?? 'ðŸŽ’'}</Text>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.bagItemName}>{item.name}</Text>
                  <Text style={styles.bagItemDescription}>{item.description}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.helperText}>Your bag is empty. Battle monsters to earn loot.</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    gap: 20,
  },
  heroCard: {
    backgroundColor: '#111E33',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1F2A44',
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  creatureImage: {
    width: 96,
    height: 96,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#1F2A44',
  },
  name: {
    fontSize: 30,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    color: '#CBD5F5',
    marginTop: 4,
  },
  subtitleSmall: {
    color: '#CBD5F5',
    fontSize: 12,
  },
  levelBadge: {
    backgroundColor: '#0B1120',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  levelLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
  },
  levelValue: {
    color: '#38BDF8',
    fontSize: 26,
    fontWeight: '600',
  },
  helperCard: {
    backgroundColor: '#111E33',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
    gap: 8,
  },
  helperText: {
    color: '#94A3B8',
  },
  settingsLink: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#111E33',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
  },
  statsContainer: {
    gap: 12,
  },
  statCard: {
    backgroundColor: '#0B1120',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  statIcon: {
    fontSize: 16,
  },
  statValue: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1F2A44',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
  },
  bagList: {
    backgroundColor: '#111E33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
    padding: 16,
    gap: 12,
  },
  bagItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  bagIconImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  bagIconEmoji: {
    fontSize: 28,
  },
  bagItemName: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  bagItemDescription: {
    color: '#94A3B8',
    fontSize: 13,
  },
});



