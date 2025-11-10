import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { monsters } from '@/constants/monsters';
import type { Monster } from '@/models/monster';
import type { Creature } from '@/models/creature';
import { useCreature } from '@/hooks/use-creature';
import { usePlayerStats } from '@/hooks/use-player-stats';

const ENERGY_COST = 12;
const prepOptions = [
  {
    key: 'fed',
    title: 'Feed creature',
    description: 'Bonus +2 STA for this fight.',
  },
  {
    key: 'charm',
    title: 'Equip charm',
    description: 'Reduce incoming damage from the enemy element.',
  },
  {
    key: 'potion',
    title: 'Queue healing potion',
    description: 'Auto-heal once when HP drops low.',
  },
  {
    key: 'coop',
    title: 'Invite friend',
    description: 'Gain co-op strikes and +15% XP.',
  },
] as const;

type BattlePrepKey = (typeof prepOptions)[number]['key'];
type BattlePrepState = Record<BattlePrepKey, boolean>;

type BattleEvent = {
  round: number;
  attacker: 'creature' | 'monster';
  damage: number;
  message: string;
  creatureHP: number;
  monsterHP: number;
};

type BattleOutcome = {
  didWin: boolean;
  log: string[];
  events: BattleEvent[];
  initialCreatureHP: number;
  initialMonsterHP: number;
};

const simulateBattle = (
  creature: Creature | null,
  monster: Monster,
  prep: BattlePrepState,
): BattleOutcome => {
  if (!creature) {
    return {
      didWin: false,
      log: ['Missing creature data.'],
      events: [],
      initialCreatureHP: 0,
      initialMonsterHP: 0,
    };
  }

  const log: string[] = [];
  const events: BattleEvent[] = [];
  const creatureName = creature.name?.trim().length ? creature.name : 'Your creature';
  const staBonus = prep.fed ? 2 : 0;
  const defenseBonus = prep.charm ? 5 : 0;
  let potionAvailable = prep.potion;
  const potionThresholdFactor = 0.4;
  const initialCreatureHP = (creature.stats.sta + staBonus) * 20 + creature.level * 10 + 60;
  const initialMonsterHP = monster.health;
  let playerHP = initialCreatureHP;
  let monsterHP = initialMonsterHP;
  const playerAttack =
    creature.stats.str * 1.4 + creature.stats.agi * 0.8 + creature.stats.int * 0.5 + creature.level * 1.8;
  const playerDefense = creature.stats.sta * 0.7 + creature.stats.int * 0.3 + defenseBonus;
  const monsterAttack = monster.attack;
  const monsterDefense = monster.defense;
  const coopStrike =
    prep.coop ? Math.max(8, Math.round((creature.stats.str + creature.stats.agi) * 0.4)) : 0;
  const potionHealAmount = Math.round(initialCreatureHP * 0.3);

  for (let round = 1; round <= 6 && playerHP > 0 && monsterHP > 0; round += 1) {
    const playerDamage = Math.max(
      8,
      Math.round(playerAttack * (0.85 + Math.random() * 0.4) - monsterDefense),
    );
    monsterHP -= playerDamage;
    const clampedMonster = Math.max(monsterHP, 0);
    const creatureMessage = `Round ${round}: ${creatureName} hits ${monster.name} for ${Math.max(playerDamage, 0)} dmg.`;
    log.push(creatureMessage);
    events.push({
      round,
      attacker: 'creature',
      damage: Math.max(playerDamage, 0),
      message: creatureMessage,
      creatureHP: playerHP,
      monsterHP: clampedMonster,
    });
    if (monsterHP <= 0) {
      monsterHP = 0;
      break;
    }
    if (coopStrike && monsterHP > 0) {
      monsterHP -= coopStrike;
      const clampCoop = Math.max(monsterHP, 0);
      const coopMessage = `Round ${round}: Ally strike deals ${coopStrike} dmg.`;
      log.push(coopMessage);
      events.push({
        round,
        attacker: 'creature',
        damage: coopStrike,
        message: coopMessage,
        creatureHP: playerHP,
        monsterHP: clampCoop,
      });
      if (monsterHP <= 0) {
        monsterHP = 0;
        break;
      }
    }
    const monsterDamage = Math.max(
      6,
      Math.round(monsterAttack * (0.9 + Math.random() * 0.3) - playerDefense),
    );
    playerHP -= monsterDamage;
    const clampedPlayer = Math.max(playerHP, 0);
    const monsterMessage = `Round ${round}: ${monster.name} counters for ${Math.max(monsterDamage, 0)} dmg.`;
    log.push(monsterMessage);
    events.push({
      round,
      attacker: 'monster',
      damage: Math.max(monsterDamage, 0),
      message: monsterMessage,
      creatureHP: clampedPlayer,
      monsterHP: clampedMonster,
    });
    if (
      potionAvailable &&
      playerHP > 0 &&
      playerHP <= initialCreatureHP * potionThresholdFactor
    ) {
      potionAvailable = false;
      playerHP = Math.min(playerHP + potionHealAmount, initialCreatureHP);
      const potionMessage = `Healing potion restores ${potionHealAmount} HP!`;
      log.push(potionMessage);
      events.push({
        round,
        attacker: 'creature',
        damage: 0,
        message: potionMessage,
        creatureHP: playerHP,
        monsterHP: clampedMonster,
      });
    }
  }

  const didWin = monsterHP <= 0 && playerHP > 0;
  log.push(
    didWin
      ? `${creatureName} prevails!`
      : `${monster.name} overwhelms ${creatureName}. Retreat and regroup.`,
  );
  return {
    didWin,
    log,
    events,
    initialCreatureHP,
    initialMonsterHP,
  };
};

export default function BattleScreen() {
  const { creature, isCreatureLoading } = useCreature();
  const { playerStats, isPlayerStatsLoading, updatePlayerStats } = usePlayerStats();
  const [selectedMonsterId, setSelectedMonsterId] = useState(monsters[0].id);
  const [battleResult, setBattleResult] = useState<'win' | 'lose' | 'energy' | null>(null);
  const [isBattling, setIsBattling] = useState(false);
  const [isArenaView, setIsArenaView] = useState(false);
  const [battleEvents, setBattleEvents] = useState<BattleEvent[]>([]);
  const [displayedEvents, setDisplayedEvents] = useState<string[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [liveCreatureHP, setLiveCreatureHP] = useState(0);
  const [liveMonsterHP, setLiveMonsterHP] = useState(0);
  const [baseCreatureHP, setBaseCreatureHP] = useState(0);
  const [baseMonsterHP, setBaseMonsterHP] = useState(0);
  const [battleSummary, setBattleSummary] = useState('');
  const [pendingOutcome, setPendingOutcome] = useState<{ xpGain: number; result: 'win' | 'lose' } | null>(null);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [battlePrep, setBattlePrep] = useState<BattlePrepState>({
    fed: false,
    charm: false,
    potion: false,
    coop: false,
  });

  const availableMonsters = useMemo(() => {
    if (!creature) {
      return monsters;
    }
    return monsters.filter(
      (monster) => Math.abs(monster.level - creature.level) <= 10,
    );
  }, [creature]);

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
      monsters[0],
    [availableMonsters, selectedMonsterId],
  );

  const rewardSummary = useMemo(
    () => [
      { label: 'XP', value: `+${selectedMonster.xpReward}` },
      { label: 'Loot', value: selectedMonster.featuredLoot },
      { label: 'Energy Cost', value: `-${ENERGY_COST}` },
    ],
    [selectedMonster],
  );
  const consolationXp = useMemo(() => Math.floor(selectedMonster.xpReward / 4), [selectedMonster]);

  const handleBattle = async () => {
    if (!creature || !playerStats) {
      return;
    }
    if (playerStats.energy < ENERGY_COST) {
      setBattleResult('energy');
      return;
    }
    setIsBattling(true);
    const outcome = simulateBattle(creature, selectedMonster, battlePrep);
    const coopMultiplier = battlePrep.coop ? 1.15 : 1;
    const victoryXp = Math.round(selectedMonster.xpReward * coopMultiplier);
    const consolationXp = Math.round(Math.floor(selectedMonster.xpReward / 4) * coopMultiplier);
    const xpGain = outcome.didWin ? victoryXp : consolationXp;

    await updatePlayerStats({
      energy: Math.max(0, playerStats.energy - ENERGY_COST),
      xp: playerStats.xp + xpGain,
    });

    setBattleResult(null);
    setBattleSummary('');
    setXpAwarded(null);
    setDisplayedEvents([]);
    setBattleEvents(outcome.events);
    setCurrentEventIndex(0);
    setLiveCreatureHP(outcome.initialCreatureHP);
    setLiveMonsterHP(outcome.initialMonsterHP);
    setBaseCreatureHP(outcome.initialCreatureHP);
    setBaseMonsterHP(outcome.initialMonsterHP);
    setPendingOutcome({ xpGain, result: outcome.didWin ? 'win' : 'lose' });
    setIsArenaView(true);
    setIsBattling(false);
  };

  useEffect(() => {
    if (!isArenaView || battleEvents.length === 0) {
      return;
    }
    if (currentEventIndex >= battleEvents.length) {
      if (pendingOutcome && !battleResult && battleSummary === '') {
        setBattleSummary(
          pendingOutcome.result === 'win'
            ? `Victory! +${pendingOutcome.xpGain} XP`
            : `Defeat. Consolation +${pendingOutcome.xpGain} XP`,
        );
        setBattleResult(pendingOutcome.result);
        setXpAwarded(pendingOutcome.xpGain);
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
  }, [
    isArenaView,
    battleEvents,
    currentEventIndex,
    pendingOutcome,
    battleResult,
    battleSummary,
  ]);

  const exitArenaView = () => {
    setIsArenaView(false);
    setDisplayedEvents([]);
    setBattleEvents([]);
    setBattleSummary('');
    setPendingOutcome(null);
    setCurrentEventIndex(0);
    setXpAwarded(null);
  };

  const creatureHpPercent = baseCreatureHP ? Math.max(0, (liveCreatureHP / baseCreatureHP) * 100) : 0;
  const monsterHpPercent = baseMonsterHP ? Math.max(0, (liveMonsterHP / baseMonsterHP) * 100) : 0;
  const isCinematicComplete = battleEvents.length > 0 && currentEventIndex >= battleEvents.length;

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
        <View>
          <Text style={styles.eyebrow}>Arena Status</Text>
          <Text style={styles.title}>Battle Ready</Text>
          <Text style={styles.subtitle}>
            Power surge active -- completing a fight now grants a 15% loot bonus.
          </Text>
        </View>
        <View style={styles.energyBadge}>
          <Text style={styles.energyLabel}>Energy</Text>
          <Text style={styles.energyValue}>{playerStats.energy}</Text>
          <Text style={styles.energySub}>XP {playerStats.xp}</Text>
        </View>
      </View>

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
            disabled={isBattling || isArenaView}
          >
            <Text style={styles.primaryButtonText}>
              {isBattling ? 'Resolving...' : `Fight (-${ENERGY_COST} energy)`}
            </Text>
          </Pressable>
          <Link href="/creature" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Edit Loadout</Text>
            </Pressable>
          </Link>
        </View>
        {battleResult && (
          <View
            style={[
              styles.resultBanner,
              battleResult === 'win'
                ? styles.resultBannerWin
                : battleResult === 'energy'
                  ? styles.resultBannerEnergy
                  : styles.resultBannerFail,
            ]}
          >
            <Text style={styles.resultText}>
              {battleResult === 'win'
                ? xpAwarded
                  ? `Victory! +${xpAwarded} XP`
                  : 'Victory! XP granted.'
                : battleResult === 'energy'
                  ? 'You need more energy to enter the arena.'
                  : xpAwarded
                    ? `Defeat. Consolation +${xpAwarded} XP.`
                    : `Defeat. Consolation reward +${consolationXp} XP.`}
            </Text>
          </View>
        )}
      </View>

      {isArenaView && (
        <View style={styles.cinematicCard}>
          <View style={styles.vsRow}>
            <View style={styles.combatant}>
              <Text style={styles.combatantName}>{creature.name}</Text>
              <View style={styles.hpBar}>
                <View style={[styles.hpFill, { width: `${creatureHpPercent}%` }]} />
              </View>
              <Text style={styles.hpLabel}>{Math.max(liveCreatureHP, 0)} HP</Text>
            </View>
            <Text style={styles.vsTag}>VS</Text>
            <View style={styles.combatant}>
              <Text style={styles.combatantName}>{selectedMonster.name}</Text>
              <View style={styles.hpBar}>
                <View style={[styles.hpFillMonster, { width: `${monsterHpPercent}%` }]} />
              </View>
              <Text style={styles.hpLabel}>{Math.max(liveMonsterHP, 0)} HP</Text>
            </View>
          </View>
          <View style={styles.eventFeed}>
            {displayedEvents.slice(-4).map((entry, index) => (
              <Text key={`${entry}-${index}`} style={styles.eventText}>
                {entry}
              </Text>
            ))}
            {displayedEvents.length === 0 && (
              <Text style={styles.eventTextMuted}>Battle commencing...</Text>
            )}
          </View>
          {isCinematicComplete ? (
            <>
              {battleSummary ? <Text style={styles.summaryText}>{battleSummary}</Text> : null}
              <Pressable style={styles.secondaryButton} onPress={exitArenaView}>
                <Text style={styles.secondaryButtonText}>Back to Arena</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.summaryHint}>Cinematic in progress...</Text>
          )}
        </View>
      )}

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
                  setBattleResult(null);
                }}
              >
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
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
  resultBanner: {
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  resultBannerWin: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.4)',
    borderWidth: 1,
  },
  resultBannerFail: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderColor: 'rgba(248,113,113,0.4)',
    borderWidth: 1,
  },
  resultBannerEnergy: {
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderColor: 'rgba(251,191,36,0.4)',
    borderWidth: 1,
  },
  resultText: {
    color: '#F8FAFC',
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
  },
  combatantName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  hpBar: {
    height: 10,
    backgroundColor: '#1F2A44',
    borderRadius: 999,
    overflow: 'hidden',
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
    marginTop: 4,
  },
  vsTag: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
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
    padding: 8,
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
