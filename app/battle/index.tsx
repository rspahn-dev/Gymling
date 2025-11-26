import { createAiRival, monsters } from '@/constants/monsters';
import { useCreature } from '@/hooks/use-creature';
import { usePlayerStats } from '@/hooks/use-player-stats';
import {
  BattlePrepKey,
  BattlePrepState,
  computeXpGain,
  defaultBattlePrep,
  ENERGY_COST,
  getTodayKey,
  prepOptions,
} from '@/lib/battle';
import { getMaxEnergyForLevel } from '@/lib/energy';
import { getData } from '@/utils/storage';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';


export default function BattleScreen() {
  const router = useRouter();
  const { creature, isCreatureLoading } = useCreature();
  const gymlingName = creature?.name?.trim() || 'Your Gymling';
  const { playerStats, isPlayerStatsLoading } = usePlayerStats();
  const energy = playerStats?.energy ?? 0;
  const maxEnergy = useMemo(
    () => getMaxEnergyForLevel(creature?.level ?? 1),
    [creature?.level],
  );
  const playerXp = playerStats?.xp ?? 0;
  const roster = useMemo(() => [createAiRival(creature), ...monsters], [creature]);
  const [selectedMonsterId, setSelectedMonsterId] = useState(() => roster[0].id);
  const [battlePrep, setBattlePrep] = useState<BattlePrepState>({ ...defaultBattlePrep });
  const [isBattleLocked, setIsBattleLocked] = useState(false);
  const [isBattling, setIsBattling] = useState(false);
  const refreshBattleLock = useCallback(async () => {
    const lock = (await getData('battleLock')) as { lockedUntil: string } | null;
    const today = getTodayKey();
    setIsBattleLocked(Boolean(lock?.lockedUntil && lock.lockedUntil === today));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshBattleLock();
    }, [refreshBattleLock]),
  );

  const availableMonsters = useMemo(() => {
    if (!creature) {
      return roster.slice(0, 3);
    }
    const filtered = roster
      .filter((monster) => Math.abs(monster.level - creature.level) <= 10)
      .sort(
        (a, b) =>
          Math.abs(a.level - creature.level) - Math.abs(b.level - creature.level),
      );
    const pool = filtered.length > 0 ? filtered : roster;
    return pool.slice(0, 3);
  }, [creature, roster]);

  useEffect(() => {
    if (availableMonsters.length === 0) {
      return;
    }
    if (!availableMonsters.find((monster) => monster.id === selectedMonsterId)) {
      setSelectedMonsterId(availableMonsters[0].id);
    }
  }, [availableMonsters, selectedMonsterId]);

  const selectedMonster = useMemo(
    () =>
      availableMonsters.find((monster) => monster.id === selectedMonsterId) ??
      availableMonsters[0] ??
      roster[0],
    [availableMonsters, selectedMonsterId, roster],
  );

  const rewardSummary = useMemo(() => {
    const xpValue = computeXpGain(selectedMonster.xpReward, battlePrep, true);
    return [
      { label: 'Victory XP', value: `+${xpValue}` },
      { label: 'Loot', value: selectedMonster.featuredLoot },
      { label: 'Energy Cost', value: `-${ENERGY_COST}` },
    ];
  }, [selectedMonster, battlePrep]);

  const statusMessage = useMemo(() => {
    if (isBattleLocked) {
      // return `${gymlingName} needs to recover before entering the arena again.`;
      return `${gymlingName} needs to recover before entering the arena again.`;

    }
    if (energy < ENERGY_COST) {
      const deficit = Math.max(0, ENERGY_COST - energy);
      return `Need ${ENERGY_COST} energy (${deficit} more) to queue a fight.`;
    }
    return 'Power surge active -- completing a fight now grants a 15% loot bonus.';
  }, [isBattleLocked, energy]);

  const statusHighlights = useMemo(() => {
    const monsterDelta = creature ? selectedMonster.level - creature.level : 0;
    return [
      {
        label: 'Energy',
        value: `${energy}/${maxEnergy}`,
        hint:
          energy >= ENERGY_COST
            ? `Cost ${ENERGY_COST}`
            : `Need ${ENERGY_COST}`,
      },
      {
        label: 'Cooldown',
        value: isBattleLocked ? 'Locked' : 'Open',
        hint: isBattleLocked ? 'Log a workout to reset' : 'Ready for combat',
      },
      // {
      //   label: 'Matchup',
      //   value: `${monsterDelta >= 0 ? '+' : ''}${monsterDelta}`,
      //   hint: `vs ${selectedMonster.name}`,
      // },
    ];
  }, [energy, isBattleLocked, selectedMonster, creature]);

  const handleBattle = async () => {
    if (!creature || !playerStats) {
      return;
    }
    if (isBattleLocked) {
      Alert.alert(
        'Creature needs rest',
        'Your creature was defeated today. Log a workout to reset the battle cooldown.',
      );
      return;
    }
    if (energy < ENERGY_COST) {
      Alert.alert('Not enough energy', 'Log a workout or wait to restore more energy.');
      return;
    }
    setIsBattling(true);
    try {
      const query = `monsterId=${encodeURIComponent(selectedMonsterId)}&prep=${encodeURIComponent(
        JSON.stringify(battlePrep),
      )}`;
      router.push(`/battle/duel?${query}`);
    } finally {
      setTimeout(() => setIsBattling(false), 300);
    }
  };

  const togglePrep = (key: BattlePrepKey) => {
    setBattlePrep((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isCreatureLoading || isPlayerStatsLoading || !creature || !playerStats) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Syncing battle data...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIntro}>
            <Text style={styles.eyebrow}>Arena Status</Text>
            <Text style={styles.title}>Battle Ready</Text>
            <Text style={styles.subtitle}>
              {statusMessage}
            </Text>
          </View>
          {/* <View style={styles.energyBadge}> */}
            {/* <Text style={styles.energyLabel}>Energy</Text> */}
            {/* <Text style={styles.energyValue}>{energy}</Text> */}
            {/* <Text style={styles.energySub}>XP {playerXp}</Text> */}
          {/* </View> */}
        </View>
        <View style={styles.statusRow}>
          {statusHighlights.map((tile) => (
            <View key={tile.label} style={styles.statusTile}>
              <Text style={styles.statusTileLabel}>{tile.label}</Text>
              <Text style={styles.statusTileValue}>{tile.value}</Text>
              <Text style={styles.statusTileHint}>{tile.hint}</Text>
            </View>
          ))}
        </View>
      </View>

      {isBattleLocked && (
        <View style={styles.lockBanner}>
          <Text style={styles.lockText}>
            {gymlingName} must recover. Log a workout to battle again today.
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Selected Encounter</Text>
      <View style={styles.encounterCard}>
        <View style={styles.encounterHeader}>
          <View>
            <Text style={styles.encounterName}>{selectedMonster.name}</Text>
            <Text style={styles.encounterMeta}>
              Lvl {selectedMonster.level} - {selectedMonster.element}
            </Text>
          </View>
          <View style={styles.difficultyTag}>
            <Text style={styles.difficultyText}>{selectedMonster.recommendedStr}+ STR</Text>
          </View>
        </View>
        <Text style={styles.encounterDescription}>{selectedMonster.description}</Text>
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardLabel}>Featured Reward</Text>
          <Text style={styles.rewardValue}>{selectedMonster.featuredLoot}</Text>
        </View>
        <View style={styles.encounterActions}>
          <Pressable
            style={styles.primaryButton}
            onPress={handleBattle}
            disabled={isBattling || isBattleLocked}
          >
            <Text style={styles.primaryButtonText}>
              {isBattleLocked
                ? 'Locked'
                : isBattling
                  ? 'Preparing...'
                  : `Fight`}
            </Text>
          </Pressable>
          <Link href="/creature" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Creature check</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Monsters in Rotation</Text>
      <View style={styles.monsterList}>
        {availableMonsters.map((monster) => {
          const isSelected = monster.id === selectedMonsterId;
          return (
            <Pressable
              key={monster.id}
                style={[styles.monsterCard, isSelected && styles.monsterCardSelected]}
                onPress={() => {
                  setSelectedMonsterId(monster.id);
                }}
              >
              <Image source={{ uri: monster.icon }} style={styles.monsterIcon} />
              <View>
                <Text style={styles.monsterName}>{monster.name}</Text>
                <Text style={styles.monsterMeta}>
                  Lvl {monster.level} - {monster.element}
                </Text>
              </View>
              <View style={styles.monsterReward}>
                <Text style={styles.monsterRewardLabel}>Reward</Text>
                <Text style={styles.monsterRewardValue}>{monster.featuredLoot}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Reward Summary</Text>
      <View style={styles.rewardRow}>
        {rewardSummary.map((reward) => (
          <View key={reward.label} style={styles.rewardCard}>
            <Text style={styles.rewardLabel}>{reward.label}</Text>
            <Text style={styles.rewardValue}>{reward.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Battle Prep</Text>
      <View style={styles.checklist}>
        {prepOptions.map(({ key, title, description }) => {
          const active = battlePrep[key];
          return (
            <Pressable
              key={key}
              style={[styles.checklistItem, active && styles.checklistItemActive]}
              onPress={() => togglePrep(key)}
            >
              <View style={[styles.checkbox, active && styles.checkboxActive]}>
                {active ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.checklistTitle}>{title}</Text>
                <Text style={styles.checklistText}>{description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 24,
    backgroundColor: '#0B1120',
    gap: 24,
  },
  loadingState: {
    flex: 1,
    backgroundColor: '#0B1120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#CBD5F5',
    marginTop: 12,
  },
  heroCard: {
    backgroundColor: '#111E33',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1F2A44',
    gap: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  heroIntro: {
    flex: 1,
    minWidth: 220,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusTile: {
    flexGrow: 1,
    minWidth: 110,
    backgroundColor: '#0B1120',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F2A44',
    padding: 12,
    gap: 4,
  },
  statusTileLabel: {
    color: '#94A3B8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusTileValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
  },
  statusTileHint: {
    color: '#CBD5F5',
    fontSize: 12,
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
    marginBottom: 6,
  },
  subtitle: {
    color: '#CBD5F5',
    fontSize: 14,
    lineHeight: 20,
  },
  energyBadge: {
    backgroundColor: '#0B1120',
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  energyLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
  },
  energyValue: {
    color: '#38BDF8',
    fontSize: 24,
    fontWeight: '600',
  },
  energySub: {
    color: '#CBD5F5',
    fontSize: 12,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
  },
  encounterCard: {
    backgroundColor: '#111E33',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1F2A44',
    gap: 12,
  },
  encounterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  encounterName: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '600',
  },
  encounterMeta: {
    color: '#94A3B8',
    fontSize: 13,
  },
  encounterDescription: {
    color: '#CBD5F5',
    lineHeight: 20,
  },
  difficultyTag: {
    backgroundColor: '#0B1120',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  difficultyText: {
    color: '#FCD34D',
    fontWeight: '600',
  },
  rewardBadge: {
    backgroundColor: '#0B1120',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  rewardLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
  },
  rewardValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  encounterActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#0B1120',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  secondaryButtonText: {
    color: '#38BDF8',
    fontWeight: '600',
    paddingVertical: 14,
  },
  monsterList: {
    gap: 12,
  },
  monsterCard: {
    backgroundColor: '#111E33',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  monsterIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  monsterCardSelected: {
    borderColor: '#38BDF8',
  },
  monsterName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  monsterMeta: {
    color: '#94A3B8',
    fontSize: 13,
  },
  monsterReward: {
    alignItems: 'flex-end',
  },
  monsterRewardLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  monsterRewardValue: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardCard: {
    flex: 1,
    backgroundColor: '#111E33',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  lockBanner: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
    borderRadius: 12,
    padding: 12,
  },
  lockText: {
    color: '#FCA5A5',
    textAlign: 'center',
  },
  checklist: {
    backgroundColor: '#111E33',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
    gap: 10,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  checklistItemActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#38BDF8',
  },
  checkboxMark: {
    color: '#0B1120',
    fontWeight: '700',
    fontSize: 12,
  },
  checklistTitle: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  checklistText: {
    color: '#CBD5F5',
    lineHeight: 20,
    fontSize: 13,
  },
});














