import React, { useEffect, useMemo, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { monsters } from '@/constants/monsters';
import { useCreature } from '@/hooks/use-creature';
import { usePlayerStats } from '@/hooks/use-player-stats';
import { getData, storeData } from '@/utils/storage';
import { getMaxEnergyForLevel, clampEnergyToLevel } from '@/lib/energy';
import {
  BattleEvent,
  BattlePrepState,
  defaultBattlePrep,
  ENERGY_COST,
  prepOptions,
  getTodayKey,
  simulateBattle,
  computeXpGain,
} from '@/lib/battle';

const parsePrepState = (value?: string): BattlePrepState => {
  if (!value) {
    return { ...defaultBattlePrep };
  }
  try {
    const parsed = JSON.parse(value) as Partial<BattlePrepState>;
    return {
      ...defaultBattlePrep,
      ...parsed,
    };
  } catch {
    return { ...defaultBattlePrep };
  }
};

export default function DuelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ monsterId?: string; prep?: string }>();
  const { creature, isCreatureLoading } = useCreature();
  const { playerStats, isPlayerStatsLoading, updatePlayerStats } = usePlayerStats();
  const [battleEvents, setBattleEvents] = useState<BattleEvent[]>([]);
  const [displayedEvents, setDisplayedEvents] = useState<string[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [liveCreatureHP, setLiveCreatureHP] = useState(0);
  const [liveMonsterHP, setLiveMonsterHP] = useState(0);
  const [baseCreatureHP, setBaseCreatureHP] = useState(0);
  const [baseMonsterHP, setBaseMonsterHP] = useState(0);
  const [battleSummary, setBattleSummary] = useState('');
  const [battleResult, setBattleResult] = useState<'win' | 'lose' | null>(null);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [pendingSummary, setPendingSummary] = useState<{ xpGain: number; result: 'win' | 'lose' } | null>(null);

  const battlePrep = useMemo(() => parsePrepState(params.prep as string | undefined), [params.prep]);

  const selectedMonster = useMemo(() => {
    const monster = monsters.find((m) => m.id === params.monsterId);
    return monster ?? monsters[0];
  }, [params.monsterId]);

  const startBattle = async () => {
    if (!creature || !playerStats || !selectedMonster) {
      return;
    }
    const today = getTodayKey();
    const lock = (await getData('battleLock')) as { lockedUntil: string } | null;
    if (lock?.lockedUntil === today) {
      setErrorMessage('Your creature must recover. Log a workout to reset the cooldown.');
      return;
    }
    if (energy < ENERGY_COST) {
      setErrorMessage('Not enough energy for another battle.');
      return;
    }
    setIsResolving(true);
    const outcome = simulateBattle(creature, selectedMonster, battlePrep);
    const xpGain = computeXpGain(selectedMonster.xpReward, battlePrep, outcome.didWin);

    await updatePlayerStats({
      energy: Math.max(0, energy - ENERGY_COST),
      xp: (playerStats?.xp ?? 0) + xpGain,
    });

    if (outcome.didWin) {
      await storeData('battleLock', null);
    } else {
      await storeData('battleLock', { lockedUntil: today });
    }

    setBattleEvents(outcome.events);
    setBaseCreatureHP(outcome.initialCreatureHP);
    setBaseMonsterHP(outcome.initialMonsterHP);
    setLiveCreatureHP(outcome.initialCreatureHP);
    setLiveMonsterHP(outcome.initialMonsterHP);
    setBattleSummary('');
    setBattleResult(null);
    setXpAwarded(xpGain);
    setDisplayedEvents([]);
    setCurrentEventIndex(0);
    setPendingSummary({ xpGain, result: outcome.didWin ? 'win' : 'lose' });
    setIsResolving(false);
  };

  useEffect(() => {
    if (hasStarted) {
      return;
    }
    if (!creature || !playerStats || isCreatureLoading || isPlayerStatsLoading) {
      return;
    }
    setHasStarted(true);
    startBattle();
  }, [creature, playerStats, isCreatureLoading, isPlayerStatsLoading, hasStarted]);

  useEffect(() => {
    if (battleEvents.length === 0) {
      return;
    }
    if (currentEventIndex >= battleEvents.length) {
      if (pendingSummary && !battleResult && battleSummary === '') {
        setBattleSummary(
          pendingSummary.result === 'win'
            ? `Victory! +${pendingSummary.xpGain} XP`
            : `Defeat. Consolation +${pendingSummary.xpGain} XP`,
        );
        setBattleResult(pendingSummary.result);
      }
      return;
    }
    const timeout = setTimeout(() => {
      const event = battleEvents[currentEventIndex];
      setLiveCreatureHP(event.creatureHP);
      setLiveMonsterHP(event.monsterHP);
      setDisplayedEvents((prev) => [...prev, event.message]);
      setCurrentEventIndex((prev) => prev + 1);
    }, 1100);
    return () => clearTimeout(timeout);
  }, [battleEvents, currentEventIndex, pendingSummary, battleResult, battleSummary]);

  const creatureHpPercent = baseCreatureHP ? Math.max(0, (liveCreatureHP / baseCreatureHP) * 100) : 0;
  const monsterHpPercent = baseMonsterHP ? Math.max(0, (liveMonsterHP / baseMonsterHP) * 100) : 0;
  const isCinematicComplete = battleEvents.length > 0 && currentEventIndex >= battleEvents.length;

  const activePrep = prepOptions.filter((option) => battlePrep[option.key]);

  if (isCreatureLoading || isPlayerStatsLoading || !creature || !playerStats || !selectedMonster) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Preparing battle...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/battle')}>
          <Text style={styles.secondaryText}>Back to Arena</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.cinematicCard}>
        <View style={styles.vsRow}>
          <View style={styles.combatant}>
            <Text style={styles.combatantName}>{creature.name || 'Your creature'}</Text>
            <View style={styles.hpBar}>
              <View style={[styles.hpFill, { width: `${creatureHpPercent}%` }]} />
            </View>
            <Text style={styles.hpLabel}>{Math.max(liveCreatureHP, 0)} HP</Text>
          </View>
          <Text style={styles.vsTag}>VS</Text>
          <View style={styles.combatant}>
            <Image source={{ uri: selectedMonster.icon }} style={styles.monsterIcon} />
            <Text style={styles.combatantName}>{selectedMonster.name}</Text>
            <View style={styles.hpBar}>
              <View style={[styles.hpFillMonster, { width: `${monsterHpPercent}%` }]} />
            </View>
            <Text style={styles.hpLabel}>{Math.max(liveMonsterHP, 0)} HP</Text>
          </View>
        </View>
        {activePrep.length > 0 && (
          <View style={styles.prepRow}>
            {activePrep.map((prep) => (
              <Text key={prep.key} style={styles.prepChip}>
                {prep.title}
              </Text>
            ))}
          </View>
        )}
        <View style={styles.eventFeed}>
          {displayedEvents.slice(-4).map((entry, index) => (
            <Text key={`${entry}-${index}`} style={styles.eventText}>
              {entry}
            </Text>
          ))}
          {displayedEvents.length === 0 && (
            <Text style={styles.eventTextMuted}>
              {isResolving ? 'Calculating battle...' : 'Battle commencing...'}
            </Text>
          )}
        </View>
        {isCinematicComplete ? (
          <>
            {battleSummary ? <Text style={styles.summaryText}>{battleSummary}</Text> : null}
            <Pressable style={styles.primaryButton} onPress={() => router.replace('/battle')}>
              <Text style={styles.primaryText}>Back to Arena</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.summaryHint}>Cinematic in progress...</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 24,
    backgroundColor: '#0B1120',
    flexGrow: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1120',
    gap: 12,
    padding: 24,
  },
  loadingText: {
    color: '#CBD5F5',
  },
  errorText: {
    color: '#FCA5A5',
    textAlign: 'center',
  },
  cinematicCard: {
    backgroundColor: '#111E33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
    padding: 16,
    gap: 12,
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  combatant: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  combatantName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  hpBar: {
    height: 10,
    backgroundColor: '#1F2A44',
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  hpFill: {
    height: '100%',
    backgroundColor: '#34D399',
  },
  hpFillMonster: {
    height: '100%',
    backgroundColor: '#F87171',
  },
  hpLabel: {
    color: '#CBD5F5',
    fontSize: 12,
  },
  vsTag: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  monsterIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  prepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prepChip: {
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    color: '#38BDF8',
    fontSize: 12,
  },
  eventFeed: {
    backgroundColor: '#0B1120',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2A44',
    padding: 12,
    minHeight: 90,
    gap: 6,
  },
  eventText: {
    color: '#E2E8F0',
    fontSize: 13,
  },
  eventTextMuted: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
  },
  summaryText: {
    color: '#F8FAFC',
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryHint: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#0B1120',
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2A44',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryText: {
    color: '#38BDF8',
    fontWeight: '600',
    textAlign: 'center',
  },
});

