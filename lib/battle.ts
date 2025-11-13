import type { Creature } from '@/models/creature';
import type { Monster } from '@/models/monster';

export const ENERGY_COST = 10;

export type BattlePrepKey = 'fed' | 'charm' | 'potion' | 'coop';
export type BattlePrepState = Record<BattlePrepKey, boolean>;

export const defaultBattlePrep: BattlePrepState = {
  fed: false,
  charm: false,
  potion: false,
  coop: false,
};

export const prepOptions = [
  {
    key: 'fed' as const,
    title: 'Feed creature',
    description: 'Gain +2 STA before battle.',
  },
  {
    key: 'charm' as const,
    title: 'Equip charm',
    description: 'Reduces incoming damage from the enemy element.',
  },
  {
    key: 'potion' as const,
    title: 'Queue potion',
    description: 'Auto-heal once when HP is low.',
  },
  {
    key: 'coop' as const,
    title: 'Invite friend',
    description: 'Adds ally strikes and +15% XP.',
  },
] as const;

export type BattleEvent = {
  round: number;
  attacker: 'creature' | 'monster';
  damage: number;
  message: string;
  creatureHP: number;
  monsterHP: number;
};

export type BattleOutcome = {
  didWin: boolean;
  log: string[];
  events: BattleEvent[];
  initialCreatureHP: number;
  initialMonsterHP: number;
};

export const getTodayKey = () => new Date().toISOString().slice(0, 10);

export const getXpMultiplier = (prep: BattlePrepState) => (prep.coop ? 1.15 : 1);

export const computeXpGain = (monsterXp: number, prep: BattlePrepState, didWin: boolean) => {
  const base = didWin ? monsterXp : Math.floor(monsterXp / 4);
  return Math.round(base * getXpMultiplier(prep));
};

export const simulateBattle = (
  creature: Creature | null,
  monster: Monster,
  prep: BattlePrepState,
): BattleOutcome => {
  const hasBagItem = (itemId: string) => creature?.bag?.some((item) => item.id === itemId);

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
  const snackEquipped = hasBagItem('snack');
  const charmEquipped = hasBagItem('charm-spark') && monster.element === 'Lightning';
  const bagPotionAvailable = hasBagItem('potion-small');
  const staBonus = (prep.fed ? 2 : 0) + (snackEquipped ? 1 : 0);
  const defenseBonus = (prep.charm ? 5 : 0) + (charmEquipped ? 3 : 0);
  let potionAvailable = prep.potion || bagPotionAvailable;
  const potionThresholdFactor = 0.4;
  const initialCreatureHP = (creature.stats.sta + staBonus) * 20 + creature.level * 10 + 60;
  const initialMonsterHP = monster.health;
  let playerHP = initialCreatureHP;
  let monsterHP = initialMonsterHP;
  const baseAttack =
    creature.stats.str * 1.4 + creature.stats.agi * 0.8 + creature.stats.int * 0.5 + creature.level * 1.8;
  const playerAttack = snackEquipped ? baseAttack * 1.05 : baseAttack;
  const playerDefense = creature.stats.sta * 0.7 + creature.stats.int * 0.3 + defenseBonus;
  const monsterAttack = monster.attack;
  const monsterDefense = monster.defense;
  const coopStrike =
    prep.coop ? Math.max(8, Math.round((creature.stats.str + creature.stats.agi) * 0.4)) : 0;
  const potionHealAmount = Math.round(initialCreatureHP * (bagPotionAvailable ? 0.35 : 0.3));

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
    let monsterDamage = Math.max(
      6,
      Math.round(monsterAttack * (0.9 + Math.random() * 0.3) - playerDefense),
    );
    let mitigationNote = '';
    if (charmEquipped && monsterDamage > 0) {
      const mitigated = Math.round(monsterDamage * 0.85);
      if (mitigated < monsterDamage) {
        monsterDamage = mitigated;
        mitigationNote = ' Spark charm absorbs part of the strike.';
      }
    }
    playerHP -= monsterDamage;
    const clampedPlayer = Math.max(playerHP, 0);
    const monsterMessage = `Round ${round}: ${monster.name} counters for ${Math.max(monsterDamage, 0)} dmg.${mitigationNote}`;
    log.push(monsterMessage);
    events.push({
      round,
      attacker: 'monster',
      damage: Math.max(monsterDamage, 0),
      message: monsterMessage,
      creatureHP: clampedPlayer,
      monsterHP: Math.max(monsterHP, 0),
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
        monsterHP: Math.max(monsterHP, 0),
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



