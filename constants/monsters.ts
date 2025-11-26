// import blueHydra from '@/assets/images/blue_hydra.png';
import type { Creature } from '@/models/creature';
import { ElementType, Monster } from '@/models/monster';
import { Image } from 'react-native';

const monsterIcons = {
  // 'ai-rival': require('@/assets/images/ai-rival.png'),
  'hydra-prime': require('@/assets/images/blue_hydra.png'),
};



const statElementAffinity: Record<keyof Creature['stats'], ElementType> = {
  str: 'Fire',
  agi: 'Air',
  sta: 'Earth',
  int: 'Lightning',
};

const elementOpposites: Record<ElementType, ElementType> = {
  Fire: 'Water',
  Water: 'Fire',
  Earth: 'Air',
  Air: 'Earth',
  Lightning: 'Shadow',
  Shadow: 'Light',
  Light: 'Shadow',
};

const fallbackStats = {
  str: 1,
  agi: 1,
  sta: 1,
  int: 1,
};

const getDominantElement = (creature: Creature | null): ElementType => {
  if (!creature) {
    return 'Shadow';
  }
  const entries = Object.entries(creature.stats) as Array<[keyof Creature['stats'], number]>;
  const [topKey] = entries.sort((a, b) => b[1] - a[1])[0] ?? ['str', 1];
  return statElementAffinity[topKey] ?? 'Shadow';
};

const getOppositeElement = (element: ElementType): ElementType => elementOpposites[element] ?? 'Shadow';

export const createAiRival = (creature: Creature | null): Monster => {
  const stats = creature?.stats ?? fallbackStats;
  const playerElement = getDominantElement(creature);
  const rivalElement = getOppositeElement(playerElement);
  const rivalLevel = Math.max(2, (creature?.level ?? 1) + 1);
  const totalStats = stats.str + stats.agi + stats.sta + stats.int;
  const health = Math.round((stats.sta + rivalLevel) * 22 + totalStats * 1.6);
  const attack = Math.round(stats.str * 1.4 + stats.agi * 1.1 + rivalLevel * 2.5);
  const defense = Math.round(stats.sta * 0.9 + stats.int * 1.2 + rivalLevel * 1.5);
  const xpReward = Math.max(60, rivalLevel * 12);
  const recommendedStr = Math.max(stats.str + 2, Math.round(rivalLevel * 0.8) + 5);

  return {
    id: 'ai-rival',
    name: 'Trainer 9000',
    level: rivalLevel,
    element: rivalElement,
    health,
    attack,
    defense,
    recommendedStr,
    description: `An adaptive construct that inverts your ${playerElement.toLowerCase()} style into ${rivalElement.toLowerCase()} counters. Always arrives one step ahead.`,
    xpReward,
    featuredLoot: 'Mirror Core',
    icon: Image.resolveAssetSource(monsterIcons['hydra-prime']).uri,
  };
};
export const monsters: Monster[] = [
  {
    id: 'hydra-prime',
    name: 'Hydra Prime',
    level: 18,
    element: 'Water',
    health: 260,
    attack: 34,
    defense: 22,
    recommendedStr: 16,
    description:
      'A regenerative serpent that splits into new heads when struck. Target the core crystal to stop the regen.',
    xpReward: 120,
    featuredLoot: 'Phoenix Feather',
    icon: 'https://images.unsplash.com/photo-1508674861872-a51e06c50c9b?w=96&h=96&fit=crop',
  },
  {
    id: 'storm-wyrm',
    name: 'Storm Wyrm',
    level: 14,
    element: 'Lightning',
    health: 210,
    attack: 30,
    defense: 16,
    recommendedStr: 14,
    description: 'Sweeps the arena with charged winds that punish low agility.',
    xpReward: 100,
    featuredLoot: 'Tempest Scale',
    icon: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=96&h=96&fit=crop',
  },
  {
    id: 'iron-golem',
    name: 'Iron Golem',
    level: 12,
    element: 'Earth',
    health: 240,
    attack: 24,
    defense: 28,
    recommendedStr: 15,
    description: 'Slow but unyielding guardian forged from haunted steel.',
    xpReward: 90,
    featuredLoot: 'Shard of Fortitude',
    icon: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=96&h=96&fit=crop',
  },
  {
    id: 'night-geist',
    name: 'Night Geist',
    level: 16,
    element: 'Shadow',
    health: 200,
    attack: 32,
    defense: 18,
    recommendedStr: 13,
    description: 'Phases in and out of reality to siphon stamina.',
    xpReward: 110,
    featuredLoot: 'Void Cloak',
    icon: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=96&h=96&fit=crop',
  },
  {
    id: 'ember-rat',
    name: 'Ember Rat',
    level: 5,
    element: 'Fire',
    health: 120,
    attack: 16,
    defense: 8,
    recommendedStr: 8,
    description: 'A fiery scavenger that ignites the ground with each scurry.',
    xpReward: 60,
    featuredLoot: 'Cinder Tail',
    icon: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=96&h=96&fit=crop',
  },
  {
    id: 'sapling-guardian',
    name: 'Sapling Guardian',
    level: 2,
    element: 'Earth',
    health: 90,
    attack: 10,
    defense: 6,
    recommendedStr: 4,
    description: 'A tiny treant that defends the forest with thorny vines.',
    xpReward: 35,
    featuredLoot: 'Verdant Twig',
    icon: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=96&h=96&fit=crop',
  },
  {
    id: 'tidal-sprite',
    name: 'Tidal Sprite',
    level: 3,
    element: 'Water',
    health: 100,
    attack: 12,
    defense: 7,
    recommendedStr: 5,
    description: 'Splashes attackers with bursts of pressurized surf.',
    xpReward: 40,
    featuredLoot: 'Bubble Pearl',
    icon: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=96&h=96&fit=crop',
  },
  {
    id: 'gale-fox',
    name: 'Gale Fox',
    level: 4,
    element: 'Air',
    health: 110,
    attack: 14,
    defense: 8,
    recommendedStr: 6,
    description: 'Dashes around opponents, slicing with wind-forged tails.',
    xpReward: 50,
    featuredLoot: 'Wind Tail',
    icon: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=96&h=96&fit=crop',
  },
  {
    id: 'dune-scorpion',
    name: 'Dune Scorpion',
    level: 7,
    element: 'Earth',
    health: 150,
    attack: 18,
    defense: 12,
    recommendedStr: 9,
    description: 'Ambushes foes beneath the sand with venom-tipped claws.',
    xpReward: 70,
    featuredLoot: 'Sting Barbs',
    icon: 'https://images.unsplash.com/photo-1500534310680-81a9a0c3c061?w=96&h=96&fit=crop',
  },
  {
    id: 'glacier-owl',
    name: 'Glacier Owl',
    level: 9,
    element: 'Air',
    health: 170,
    attack: 20,
    defense: 14,
    recommendedStr: 10,
    description: 'Freezes prey mid-flight with glacial winds.',
    xpReward: 80,
    featuredLoot: 'Frost Feather',
    icon: 'https://images.unsplash.com/photo-1501706362039-c6e08e4b7b9f?w=96&h=96&fit=crop',
  },
  {
    id: 'pyro-colossus',
    name: 'Pyro Colossus',
    level: 22,
    element: 'Fire',
    health: 320,
    attack: 40,
    defense: 26,
    recommendedStr: 20,
    description: 'An ancient molten sentinel that erupts with magma fists.',
    xpReward: 150,
    featuredLoot: 'Inferno Core',
    icon: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=96&h=96&fit=crop',
  },
  {
    id: 'void-singer',
    name: 'Void Singer',
    level: 27,
    element: 'Shadow',
    health: 360,
    attack: 44,
    defense: 30,
    recommendedStr: 23,
    description: 'Channels cosmic echoes to shatter defenses.',
    xpReward: 180,
    featuredLoot: 'Echo Shard',
    icon: 'https://images.unsplash.com/photo-1500534310680-81a9a0c3c061?w=96&h=96&fit=crop',
  },
  {
    id: 'terra-leviathan',
    name: 'Terra Leviathan',
    level: 32,
    element: 'Earth',
    health: 420,
    attack: 48,
    defense: 38,
    recommendedStr: 28,
    description: 'A slumbering behemoth that crushes foes with tectonic waves.',
    xpReward: 210,
    featuredLoot: 'Gaia Scale',
    icon: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=96&h=96&fit=crop',
  },
  {
    id: 'astral-phoenix',
    name: 'Astral Phoenix',
    level: 40,
    element: 'Air',
    health: 480,
    attack: 56,
    defense: 34,
    recommendedStr: 32,
    description: 'Reborn from stardust, bathes the arena in celestial fire.',
    xpReward: 260,
    featuredLoot: 'Stellar Plume',
    icon: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=96&h=96&fit=crop',
  },
];








