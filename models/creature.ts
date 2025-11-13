export interface Creature {
  name: string;
  level: number;
  evolutionStage: number;
  xp: number;
  xpToNext: number;
  imageUrl?: string;
  bag: CreatureItem[];
  stats: {
    str: number;
    agi: number;
    sta: number;
    int: number;
  };
}

export interface CreatureItem {
  id: string;
  name: string;
  description: string;
  icon?: string;
}
