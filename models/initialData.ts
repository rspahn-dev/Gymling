import { Creature } from './creature';
import { PlayerStats } from './player';

export const initialCreature: Creature = {
  name: '',
  level: 1,
  evolutionStage: 1,
  xp: 0,
  xpToNext: 100,
  imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&h=300&fit=crop',
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
