import { Exercise } from './exercise';

export interface Workout {
  id: string;
  title: string;
  date: string;
  exercises: Exercise[];
  notes?: string;
  totalVolume?: number;
  xpEarned?: number;
}
