import { Creature } from './creature';

export const checkEvolution = (creature: Creature): Creature => {
  if (creature.level >= 5 && creature.evolutionStage === 1) {
    return {
      ...creature,
      name: 'Gymbrute',
      evolutionStage: 2,
      stats: {
        str: creature.stats.str + 5,
        agi: creature.stats.agi + 5,
        sta: creature.stats.sta + 5,
        int: creature.stats.int + 5,
      },
    };
  }
  return creature;
};
