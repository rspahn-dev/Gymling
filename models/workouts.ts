export interface Workout {
  name: string;
  description: string;
  stat: 'str' | 'agi' | 'sta' | 'int';
  xpGain: number;
  energyCost: number;
}

export const workouts: Workout[] = [
  {
    name: 'Push-ups',
    description: 'Increase your strength',
    stat: 'str',
    xpGain: 10,
    energyCost: 10,
  },
  {
    name: 'Running',
    description: 'Increase your agility',
    stat: 'agi',
    xpGain: 10,
    energyCost: 10,
  },
  {
    name: 'Plank',
    description: 'Increase your stamina',
    stat: 'sta',
    xpGain: 10,
    energyCost: 10,
  },
  {
    name: 'Reading',
    description: 'Increase your intelligence',
    stat: 'int',
    xpGain: 10,
    energyCost: 10,
  },
];
