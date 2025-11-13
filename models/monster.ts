export type ElementType = 'Fire' | 'Water' | 'Earth' | 'Air' | 'Lightning' | 'Shadow';

export interface Monster {
  id: string;
  name: string;
  level: number;
  element: ElementType;
  health: number;
  attack: number;
  defense: number;
  recommendedStr: number;
  description: string;
  xpReward: number;
  featuredLoot: string;
  icon: string;
}
