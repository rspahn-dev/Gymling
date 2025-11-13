import { Exercise } from './exercise';
import { PRAchievement } from './personalRecord';

export interface Workout {
  id: string;
  title: string;
  date: string;
  exercises: Exercise[];
  notes?: string;
  totalVolume?: number;
  xpEarned?: number;
  prAchievements?: PRAchievement[];
}
