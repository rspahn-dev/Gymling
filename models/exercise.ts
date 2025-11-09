import { WorkoutSet } from './workoutSet';

export interface Exercise {
  name: string;
  sets: WorkoutSet[];
}
