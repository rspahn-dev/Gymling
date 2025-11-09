export interface Creature {
  name: string;
  level: number;
  evolutionStage: number;
  stats: {
    str: number;
    agi: number;
    sta: number;
    int: number;
  };
}
