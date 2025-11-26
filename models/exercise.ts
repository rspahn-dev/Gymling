import { WorkoutSet } from './workoutSet';

export interface CardioSegment {
  duration: number;
  distance: number;
}

export interface Exercise {
  name: string;
  sets: WorkoutSet[];
  cardio?: CardioSegment[];
}
