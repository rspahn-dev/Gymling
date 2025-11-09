import { Creature } from './creature';
import { PlayerStats } from './player';

export const initialCreature: Creature = {
  name: 'Gymling',
  level: 1,
  evolutionStage: 1,
  stats: {
    str: 1,
    agi: 1,
    sta: 1,
    int: 1,
  },
};

export const initialPlayerStats: PlayerStats = {
  energy: 100,
  xp: 0,
};
