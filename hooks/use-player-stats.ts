import { useCallback, useEffect, useState } from 'react';
import type { PlayerStats } from '@/models/player';
import { initialPlayerStats } from '@/models/initialData';
import { getData, storeData } from '@/utils/storage';

export const usePlayerStats = () => {
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [isPlayerStatsLoading, setIsPlayerStatsLoading] = useState(true);

  const hydrateStats = useCallback(async () => {
    setIsPlayerStatsLoading(true);
    try {
      const stored = (await getData('playerStats')) as PlayerStats | null;
      if (stored) {
        setPlayerStats(stored);
      } else {
        await storeData('playerStats', initialPlayerStats);
        setPlayerStats(initialPlayerStats);
      }
    } finally {
      setIsPlayerStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrateStats();
  }, [hydrateStats]);

  const updatePlayerStats = useCallback(async (updates: Partial<PlayerStats>) => {
    let nextValue: PlayerStats | null = null;
    setPlayerStats((prev) => {
      const base = prev ?? initialPlayerStats;
      nextValue = { ...base, ...updates };
      return nextValue;
    });
    if (nextValue) {
      await storeData('playerStats', nextValue);
    }
  }, []);

  return { playerStats, isPlayerStatsLoading, refreshPlayerStats: hydrateStats, updatePlayerStats };
};
