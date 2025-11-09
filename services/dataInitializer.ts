import { storeData } from '../utils/storage';
import { initialCreature, initialPlayerStats } from '../models/initialData';

export const initializeData = async () => {
  await storeData('creature', initialCreature);
  await storeData('playerStats', initialPlayerStats);
};
