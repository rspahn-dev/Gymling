import { getData, storeData } from '../utils/storage';
import { PlayerStats } from '../models/player';

const ENERGY_RESTORATION_RATE = 1; // 1 energy per minute
const MAX_ENERGY = 100;

export const restoreEnergy = () => {
  setInterval(async () => {
    const playerStats = await getData('playerStats') as PlayerStats | null;
    if (playerStats && playerStats.energy < MAX_ENERGY) {
      const newEnergy = Math.min(MAX_ENERGY, playerStats.energy + ENERGY_RESTORATION_RATE);
      await storeData('playerStats', { ...playerStats, energy: newEnergy });
    }
  }, 60000); // every minute
};
