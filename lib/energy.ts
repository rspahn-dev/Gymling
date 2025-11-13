export const getMaxEnergyForLevel = (level: number) => 30 + Math.max(level - 1, 0) * 5;

export const clampEnergyToLevel = (energy: number, level: number) =>
  Math.max(0, Math.min(energy, getMaxEnergyForLevel(level)));
