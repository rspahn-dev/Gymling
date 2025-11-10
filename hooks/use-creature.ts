import { useCallback, useEffect, useState } from 'react';
import type { Creature } from '@/models/creature';
import { initialCreature } from '@/models/initialData';
import { getData, storeData } from '@/utils/storage';

type Listener = () => void;

const normalizeCreature = (data: Partial<Creature> | null | undefined): Creature => {
  const stats = {
    ...initialCreature.stats,
    ...(data?.stats ?? {}),
  };

  return {
    ...initialCreature,
    ...data,
    stats,
    xp: typeof data?.xp === 'number' && Number.isFinite(data.xp) ? data.xp : initialCreature.xp,
    xpToNext:
      typeof data?.xpToNext === 'number' && data.xpToNext > 0
        ? data.xpToNext
        : initialCreature.xpToNext,
  };
};

let creatureCache: Creature | null = null;
let isHydrating = false;
const listeners = new Set<Listener>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

const hydrateCache = async () => {
  if (isHydrating) {
    return;
  }
  isHydrating = true;
  try {
    const stored = (await getData('creature')) as Creature | null;
    if (stored) {
      creatureCache = normalizeCreature(stored);
    } else {
      const normalized = normalizeCreature(initialCreature);
      await storeData('creature', normalized);
      creatureCache = normalized;
    }
    notify();
  } finally {
    isHydrating = false;
  }
};

export const useCreature = () => {
  const [creature, setCreature] = useState<Creature | null>(creatureCache);
  const [isCreatureLoading, setIsCreatureLoading] = useState(creatureCache === null);

  useEffect(() => {
    const listener = () => {
      setCreature(creatureCache);
      setIsCreatureLoading(false);
    };
    listeners.add(listener);
    if (creatureCache === null && !isHydrating) {
      void hydrateCache();
    } else {
      setIsCreatureLoading(false);
    }
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const refreshCreature = useCallback(async () => {
    await hydrateCache();
  }, []);

  const updateCreature = useCallback(async (updater: (current: Creature) => Creature) => {
    const base = creatureCache ?? initialCreature;
    const nextValue = normalizeCreature(updater(base));
    creatureCache = nextValue;
    notify();
    await storeData('creature', nextValue);
  }, []);

  return { creature, isCreatureLoading, refreshCreature, updateCreature };
};
