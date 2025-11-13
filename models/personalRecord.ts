export type PersonalRecordMetric = 'maxWeight' | 'totalVolume';

export interface PersonalRecord {
  id: string;
  exercise: string;
  maxWeight: number;
  totalVolume: number;
  updatedAt: string;
  workoutId: string;
}

export interface PersonalRecordMap {
  [normalizedName: string]: PersonalRecord;
}

export interface PRAchievement {
  exercise: string;
  metric: PersonalRecordMetric;
  previousValue?: number;
  newValue: number;
  xpBonus: number;
  date: string;
}