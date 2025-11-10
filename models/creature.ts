export interface Creature {
  name: string;
  level: number;
  evolutionStage: number;
  xp: number;
  xpToNext: number;
  imageUrl?: string;
  stats: {
    str: number;
    agi: number;
    sta: number;
    int: number;
  };
}
