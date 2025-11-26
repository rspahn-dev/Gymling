import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCreature } from '@/hooks/use-creature';
import { usePlayerStats } from '@/hooks/use-player-stats';
import { getMaxEnergyForLevel } from '@/lib/energy';
import type { Creature } from '@/models/creature';
import { checkEvolution } from '@/models/evolution';
import type { Exercise } from '@/models/exercise';
import type { PersonalRecordMap, PRAchievement } from '@/models/personalRecord';
import type { Workout } from '@/models/workout';
import type { WorkoutSet } from '@/models/workoutSet';
import { getData, storeData } from '@/utils/storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type WorkoutTemplate = {
  id: string;
  name: string;
  workout: Workout;
};

type StatBoost = Partial<Record<keyof Creature['stats'], number>>;

const createEmptyWorkout = (): Workout => ({
  id: Date.now().toString(),
  title: '',
  date: new Date().toISOString(),
  notes: '',
  exercises: [],
});

const deepCopyExercises = (exercises: Exercise[]): Exercise[] =>
  exercises.map((exercise) => ({
    name: exercise.name,
    sets: exercise.sets.map((set) => ({ ...set })),
    cardio: exercise.cardio?.map((segment) => ({ ...segment })) ?? [],
  }));

const createWorkoutFromTemplate = (workout: Workout): Workout => ({
  ...workout,
  id: Date.now().toString(),
  date: new Date().toISOString(),
  exercises: deepCopyExercises(workout.exercises),
});

const buildPresetWorkout = (
  id: string,
  title: string,
  notes: string,
  exercises: Array<{ name: string; reps: number[]; weight?: number }>,
): Workout => ({
  id,
  title,
  date: new Date(0).toISOString(),
  notes,
  exercises: exercises.map(({ name, reps, weight = 0 }) => ({
    name,
    sets: reps.map((rep) => ({ reps: rep, weight })),
  })),
});

const presetTemplates: WorkoutTemplate[] = [
  {
    id: 'preset-chest-tris',
    name: 'Chest / Triceps Workout',
    workout: buildPresetWorkout(
      'preset-chest-tris-workout',
      'Chest + Triceps Power',
      'Upper push focus emphasizing presses and arm finishers.',
      [
        { name: 'Barbell Bench Press', reps: [10, 8, 6] },
        { name: 'Incline Dumbbell Press', reps: [12, 10, 8] },
        { name: 'Cable Fly', reps: [15, 12, 12] },
        { name: 'Triceps Pushdown', reps: [12, 10, 10] },
        { name: 'Overhead Triceps Extension', reps: [12, 12] },
      ],
    ),
  },
  {
    id: 'preset-back-bis',
    name: 'Back / Biceps Workout',
    workout: buildPresetWorkout(
      'preset-back-bis-workout',
      'Back + Biceps Pull',
      'Pull session with rows, pulldowns, and curl variations.',
      [
        { name: 'Deadlift', reps: [6, 5, 4] },
        { name: 'Bent-Over Row', reps: [10, 8, 8] },
        { name: 'Lat Pulldown', reps: [12, 10, 10] },
        { name: 'Face Pull', reps: [15, 15] },
        { name: 'Alternating Dumbbell Curl', reps: [12, 10, 10] },
      ],
    ),
  },
  {
    id: 'preset-leg-shoulder',
    name: 'Leg / Shoulder Workout',
    workout: buildPresetWorkout(
      'preset-leg-shoulder-workout',
      'Legs + Shoulders',
      'Lower-body strength with shoulder finishers.',
      [
        { name: 'Back Squat', reps: [10, 8, 6] },
        { name: 'Romanian Deadlift', reps: [10, 10, 8] },
        { name: 'Walking Lunge', reps: [12, 12] },
        { name: 'Seated Shoulder Press', reps: [12, 10, 8] },
        { name: 'Lateral Raise', reps: [15, 15, 12] },
      ],
    ),
  },
];

const computeStatBoosts = (
  workout: Workout,
  totalVolume: number,
  totalSets: number,
  achievements: PRAchievement[],
): StatBoost => {
  const prStrength = achievements.filter((achievement) => achievement.metric === 'maxWeight').length;
  const prVolume = achievements.filter((achievement) => achievement.metric === 'totalVolume').length;
  return {
    str: Math.max(0, Math.floor(totalVolume / 800)) + prStrength,
    sta: Math.max(0, Math.floor(totalSets / 6)),
    agi: Math.max(0, Math.floor(workout.exercises.length / 3)),
    int: (workout.notes?.trim().length ? 1 : 0) + prVolume,
  };
};
const placeholderColor = '#94A3B8';

const PR_XP_BONUS = 35;

type ExercisePerformanceSummary = {
  maxWeight: number;
  totalVolume: number;
};

const normalizeExerciseName = (value: string) => value.trim().toLowerCase();

const summarizeExercisePerformance = (exercise: Exercise): ExercisePerformanceSummary =>
  exercise.sets.reduce(
    (acc, set) => {
      const weight = Number(set.weight) || 0;
      const reps = Number(set.reps) || 0;
      const volume = weight * reps;
      if (weight > acc.maxWeight) {
        acc.maxWeight = weight;
      }
      acc.totalVolume += volume;
      return acc;
    },
    { maxWeight: 0, totalVolume: 0 },
  );

const evaluatePersonalRecords = (
  exercises: Exercise[],
  records: PersonalRecordMap,
  workoutId: string,
  date: string,
): { updatedRecords: PersonalRecordMap; achievements: PRAchievement[] } => {
  const updatedRecords: PersonalRecordMap = { ...records };
  const achievements: PRAchievement[] = [];

  exercises.forEach((exercise) => {
    const label = exercise.name.trim();
    if (!label) {
      return;
    }
    const stats = summarizeExercisePerformance(exercise);
    if (stats.maxWeight <= 0 && stats.totalVolume <= 0) {
      return;
    }
    const key = normalizeExerciseName(label);
    const record = updatedRecords[key];

    let metric: PRAchievement['metric'] | null = null;
    let previousValue: number | undefined;
    let newValue = 0;

    if (stats.maxWeight > (record?.maxWeight ?? 0)) {
      metric = 'maxWeight';
      previousValue = record?.maxWeight;
      newValue = stats.maxWeight;
    } else if (stats.totalVolume > (record?.totalVolume ?? 0)) {
      metric = 'totalVolume';
      previousValue = record?.totalVolume;
      newValue = stats.totalVolume;
    }

    if (metric) {
      achievements.push({
        exercise: label,
        metric,
        previousValue,
        newValue,
        xpBonus: PR_XP_BONUS,
        date,
      });
      updatedRecords[key] = {
        id: key,
        exercise: label,
        maxWeight: Math.max(stats.maxWeight, record?.maxWeight ?? 0),
        totalVolume: Math.max(stats.totalVolume, record?.totalVolume ?? 0),
        updatedAt: date,
        workoutId,
      };
    }
  });

  return { updatedRecords, achievements };
};

const calculateWorkoutMetrics = (workout: Workout) => {
  let totalVolume = 0;
  let totalSets = 0;

  workout.exercises.forEach((exercise) => {
    exercise.sets.forEach((set) => {
      totalVolume += (set.weight || 0) * (set.reps || 0);
      totalSets += 1;
    });
  });

  const xpPreview = Math.max(20, Math.round(totalVolume / 15) + totalSets * 4);
  return { totalVolume, totalSets, xpPreview };
};

const applyXpGain = (creature: Creature, xpGain: number, statBoost: StatBoost = {}): Creature => {
  let xp = creature.xp + xpGain;
  let xpToNext = creature.xpToNext;
  let level = creature.level;
  let stats = { ...creature.stats };

  while (xp >= xpToNext) {
    xp -= xpToNext;
    level += 1;
    xpToNext = Math.round(xpToNext * 1.15);
    stats = {
      str: stats.str + 1,
      agi: stats.agi + 1,
      sta: stats.sta + 1,
      int: stats.int + 1,
    };
  }

  stats = {
    str: stats.str + (statBoost.str ?? 0),
    agi: stats.agi + (statBoost.agi ?? 0),
    sta: stats.sta + (statBoost.sta ?? 0),
    int: stats.int + (statBoost.int ?? 0),
  };

  return checkEvolution({
    ...creature,
    level,
    xp,
    xpToNext,
    stats,
  });
};

export default function NewWorkoutScreen() {
  const router = useRouter();
  const { creature, updateCreature, isCreatureLoading } = useCreature();
  const { playerStats, updatePlayerStats, isPlayerStatsLoading } = usePlayerStats();
  const insets = useSafeAreaInsets();
  const [workout, setWorkout] = useState<Workout>(createEmptyWorkout());
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { totalVolume, totalSets, xpPreview } = useMemo(
    () => calculateWorkoutMetrics(workout),
    [workout],
  );

  const hasLoggedSets = useMemo(
    () =>
      workout.exercises.some((exercise) => {
        if (exercise.name.trim().length === 0) {
          return false;
        }
        const hasSets = exercise.sets.some((set) => set.reps > 0 && set.weight >= 0);
        const hasCardio = (exercise.cardio ?? []).some(
          (segment) => segment.duration > 0 || segment.distance > 0,
        );
        return hasSets || hasCardio;
      }),
    [workout.exercises],
  );

  useEffect(() => {
    const loadTemplates = async () => {
      const stored = (await getData('workoutTemplates')) as WorkoutTemplate[] | null;
      if (!stored || stored.length === 0) {
        setTemplates(presetTemplates);
        await storeData('workoutTemplates', presetTemplates);
      } else {
        setTemplates(stored);
      }
    };
    void loadTemplates();
  }, []);

  const updateExercises = (updater: (current: Exercise[]) => Exercise[]) => {
    setWorkout((prev) => ({
      ...prev,
      exercises: updater(prev.exercises),
    }));
  };

  const addExercise = () => {
    const newExercise: Exercise = { name: 'New Exercise', sets: [], cardio: [] };
    updateExercises((current) => [...current, newExercise]);
  };

  const removeExercise = (exerciseIndex: number) => {
    updateExercises((current) => current.filter((_, index) => index !== exerciseIndex));
  };

  const addSet = (exerciseIndex: number) => {
    const newSet: WorkoutSet = { reps: 0, weight: 0 };
    updateExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? { ...exercise, sets: [...exercise.sets, newSet] }
          : exercise,
      ),
    );
  };

  const addCardioSegment = (exerciseIndex: number) => {
    updateExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              cardio: [...(exercise.cardio ?? []), { duration: 0, distance: 0 }],
            }
          : exercise,
      ),
    );
  };

  const handleCardioChange = (
    exerciseIndex: number,
    cardioIndex: number,
    field: 'duration' | 'distance',
    value: string,
  ) => {
    const numericValue = Number(value) || 0;
    updateExercises((current) =>
      current.map((exercise, index) => {
        if (index !== exerciseIndex) {
          return exercise;
        }
        const cardio = exercise.cardio ?? [];
        const nextCardio = cardio.map((segment, idx) =>
          idx === cardioIndex ? { ...segment, [field]: numericValue } : segment,
        );
        return { ...exercise, cardio: nextCardio };
      }),
    );
  };

  const removeCardioSegment = (exerciseIndex: number, cardioIndex: number) => {
    updateExercises((current) =>
      current.map((exercise, index) => {
        if (index !== exerciseIndex) {
          return exercise;
        }
        const nextCardio = (exercise.cardio ?? []).filter((_, idx) => idx !== cardioIndex);
        return { ...exercise, cardio: nextCardio };
      }),
    );
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    updateExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? { ...exercise, sets: exercise.sets.filter((_, sIndex) => sIndex !== setIndex) }
          : exercise,
      ),
    );
  };

  const handleExerciseNameChange = (text: string, exerciseIndex: number) => {
    updateExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, name: text } : exercise,
      ),
    );
  };

  const handleSetChange = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof WorkoutSet,
    value: string,
  ) => {
    const numericValue = Number(value) || 0;
    updateExercises((current) =>
      current.map((exercise, index) => {
        if (index !== exerciseIndex) {
          return exercise;
        }
        const updatedSets = exercise.sets.map((set, sIndex) =>
          sIndex === setIndex ? { ...set, [field]: numericValue } : set,
        );
        return { ...exercise, sets: updatedSets };
      }),
    );
  };

  const persistTemplates = async (nextTemplates: WorkoutTemplate[]) => {
    setTemplates(nextTemplates);
    await storeData('workoutTemplates', nextTemplates);
  };

  const handleSaveTemplate = async () => {
    if (!hasLoggedSets) {
      setStatusMessage('Add at least one exercise with sets before saving a template.');
      return;
    }
    if (!templateName.trim()) {
      setStatusMessage('Give your template a name.');
      return;
    }
    const newTemplate: WorkoutTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      workout: {
        ...workout,
        exercises: deepCopyExercises(workout.exercises),
      },
    };
    await persistTemplates([...templates, newTemplate]);
    setTemplateName('');
    setStatusMessage(`Saved template "${newTemplate.name}".`);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const nextTemplates = templates.filter((template) => template.id !== templateId);
    await persistTemplates(nextTemplates);
  };

  const handleApplyTemplate = (template: WorkoutTemplate) => {
    setWorkout(createWorkoutFromTemplate(template.workout));
    // setStatusMessage(`Loaded template "${template.name}".`);
  };

  const saveWorkout = async () => {
    if (!hasLoggedSets) {
      Alert.alert('Add a workout', 'Log at least one exercise with a set.');
      return;
    }
    if (!creature) {
      Alert.alert('Creature unavailable', 'Unable to sync XP right now. Try again shortly.');
      return;
    }
    if (!playerStats && !isPlayerStatsLoading) {
      Alert.alert('Stats unavailable', 'Unable to sync XP right now. Try again shortly.');
      return;
    }
    setIsSaving(true);
    try {
      const personalRecords =
        ((await getData('personalRecords')) as PersonalRecordMap | null) ?? {};
      const workoutLog =
        ((await getData('workoutLog')) as { workouts: Workout[] } | null) ?? {
          workouts: [],
        };
      const workoutId = Date.now().toString();
      const workoutDate = new Date().toISOString();
      const { updatedRecords, achievements } = evaluatePersonalRecords(
        workout.exercises,
        personalRecords,
        workoutId,
        workoutDate,
      );
      const prBonus = achievements.reduce((sum, pr) => sum + pr.xpBonus, 0);
      const xpEarned = xpPreview + prBonus;
      const workoutToSave: Workout = {
        ...workout,
        id: workoutId,
        date: workoutDate,
        totalVolume,
        xpEarned,
        prAchievements: achievements,
        exercises: deepCopyExercises(workout.exercises),
      };
      const statBoost = computeStatBoosts(workoutToSave, totalVolume, totalSets, achievements);
      const nextCreature = applyXpGain(creature, xpEarned, statBoost);
      workoutLog.workouts = [workoutToSave, ...(workoutLog.workouts ?? [])];
      await storeData('workoutLog', workoutLog);
      if (achievements.length > 0) {
        await storeData('personalRecords', updatedRecords);
      }

      await updateCreature(() => nextCreature);
      await updatePlayerStats({
        xp: (playerStats?.xp ?? 0) + xpEarned,
        energy: getMaxEnergyForLevel(nextCreature.level),
      });
      await storeData('battleLock', null);

      const bonusText = achievements.length
        ? ` (including +${prBonus} XP for ${achievements.length} new PR${achievements.length > 1 ? 's' : ''})`
        : '';
      setStatusMessage(
        `Workout saved! ${creature.name || 'Your creature'} gained +${xpEarned} XP${bonusText}.`,
      );
      setWorkout(createEmptyWorkout());
      router.back();
    } catch (error) {
      console.error('Failed to save workout', error);
      Alert.alert('Something went wrong', 'Unable to save workout. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 32) },
        ]}
      >
        <ThemedText style={styles.title}>Log Workout</ThemedText>
        <TextInput
          placeholder="Workout title"
          placeholderTextColor={placeholderColor}
          value={workout.title}
          onChangeText={(text) => setWorkout((prev) => ({ ...prev, title: text }))}
          style={[styles.textInput, styles.lightInput]}
        />
        <TextInput
          placeholder="Notes (optional)"
          placeholderTextColor={placeholderColor}
          value={workout.notes}
          onChangeText={(text) => setWorkout((prev) => ({ ...prev, notes: text }))}
          style={[styles.textInput, styles.notesInput, styles.lightInput]}
          multiline
        />

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Sets</Text>
            <Text style={styles.metricValue}>{totalSets}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Volume</Text>
            <Text style={styles.metricValue}>{totalVolume}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>XP Preview</Text>
            <Text style={styles.metricValue}>{xpPreview}</Text>
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={addExercise}>
          <Text style={styles.primaryButtonText}>Add Exercise</Text>
        </Pressable>

        {workout.exercises.map((exercise, exerciseIndex) => (
          <View key={`exercise-${exerciseIndex}`} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <TextInput
                value={exercise.name}
                onChangeText={(text) => handleExerciseNameChange(text, exerciseIndex)}
                style={styles.exerciseName}
                placeholderTextColor={placeholderColor}
                placeholder={`Exercise ${exerciseIndex + 1}`}
              />
              <Pressable onPress={() => removeExercise(exerciseIndex)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
            {exercise.sets.map((set, setIndex) => (
              <View key={`${exerciseIndex}-${setIndex}`} style={styles.setRow}>
                <View style={styles.setInputGroup}>
                  <Text style={styles.setLabel}>Reps</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={set.reps.toString()}
                    placeholderTextColor={placeholderColor}
                    onChangeText={(value) =>
                      handleSetChange(exerciseIndex, setIndex, 'reps', value)
                    }
                    style={styles.setInput}
                  />
                </View>
                <View style={styles.setInputGroup}>
                  <Text style={styles.setLabel}>Weight</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={set.weight.toString()}
                    placeholderTextColor={placeholderColor}
                    onChangeText={(value) =>
                      handleSetChange(exerciseIndex, setIndex, 'weight', value)
                    }
                    style={styles.setInput}
                  />
                </View>
                <Pressable onPress={() => removeSet(exerciseIndex, setIndex)}>
                  <Text style={styles.removeText}>X</Text>
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.secondaryButton} onPress={() => addSet(exerciseIndex)}>
              <Text style={styles.secondaryButtonText}>Add Set</Text>
            </Pressable>
            {(exercise.cardio ?? []).map((segment, cardioIndex) => (
              <View
                key={`cardio-segment-${exerciseIndex}-${cardioIndex}`}
                style={styles.cardioRow}
              >
                <View style={styles.setInputGroup}>
                  <Text style={styles.setLabel}>Time (min)</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={segment.duration.toString()}
                    placeholderTextColor={placeholderColor}
                    onChangeText={(value) =>
                      handleCardioChange(exerciseIndex, cardioIndex, 'duration', value)
                    }
                    style={styles.setInput}
                  />
                </View>
                <View style={styles.setInputGroup}>
                  <Text style={styles.setLabel}>Distance (mi)</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={segment.distance.toString()}
                    placeholderTextColor={placeholderColor}
                    onChangeText={(value) =>
                      handleCardioChange(exerciseIndex, cardioIndex, 'distance', value)
                    }
                    style={styles.setInput}
                  />
                </View>
                <Pressable onPress={() => removeCardioSegment(exerciseIndex, cardioIndex)}>
                  <Text style={styles.removeText}>X</Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              style={styles.secondaryButton}
              onPress={() => addCardioSegment(exerciseIndex)}
            >
              <Text style={styles.secondaryButtonText}>Add Cardio</Text>
            </Pressable>
          </View>
        ))}

        <View style={styles.actionsRow}>
        <Pressable
          style={[
            styles.primaryButton,
            isSaving || isCreatureLoading || isPlayerStatsLoading ? styles.disabled : null,
          ]}
          onPress={saveWorkout}
          disabled={isSaving || isCreatureLoading || isPlayerStatsLoading}
        >
            <Text style={styles.primaryButtonText}>
              {isSaving ? 'Saving...' : 'Save Workout'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.templateSection}>
          <Text style={styles.sectionTitle}>Templates</Text>
          <View style={styles.templateInputRow}>
            <TextInput
              placeholder="Template name"
              placeholderTextColor={placeholderColor}
              value={templateName}
              onChangeText={setTemplateName}
              style={[styles.textInput, styles.templateInput]}
            />
            <Pressable style={styles.secondaryButton} onPress={handleSaveTemplate}>
              <Text style={styles.secondaryButtonText}>Save Template</Text>
            </Pressable>
          </View>
          {templates.length === 0 ? (
            <Text style={styles.helperText}>No templates yet.</Text>
          ) : (
            templates.map((template) => (
              <View key={template.id} style={styles.templateCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateMeta}>
                    {template.workout.exercises.length} exercises
                  </Text>
                </View>
                <View style={styles.templateActions}>
                  <Pressable onPress={() => handleApplyTemplate(template)}>
                    <Text style={styles.linkText}>Load</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDeleteTemplate(template.id)}>
                    <Text style={styles.linkText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#1F2A44',
    borderRadius: 12,
    padding: 12,
    color: '#E2E8F0',
    backgroundColor: '#0F172A',
  },
  lightInput: {
    color: '#F8FAFC',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0D1B2A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  metricLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#0B1120',
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2A44',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
  exerciseCard: {
    backgroundColor: '#0D1B2A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
    padding: 16,
    gap: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: '#1F2A44',
    marginRight: 12,
    paddingVertical: 4,
    color: '#E2E8F0',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  setInputGroup: {
    flex: 1,
  },
  setLabel: {
    color: '#CBD5F5',
    fontSize: 12,
  },
  setInput: {
    borderWidth: 1,
    borderColor: '#1F2A44',
    borderRadius: 10,
    padding: 8,
    color: '#E2E8F0',
    marginTop: 4,
  },
  removeText: {
    color: '#F87171',
    fontWeight: '600',
  },
  actionsRow: {
    gap: 12,
  },
  templateSection: {
    marginTop: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  templateInputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  templateInput: {
    flex: 1,
  },
  helperText: {
    color: '#E2E8F0',
    textAlign: 'center',
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2A44',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  templateName: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  templateMeta: {
    color: '#E2E8F0',
    fontSize: 12,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 12,
  },
  linkText: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  statusMessage: {
    color: '#F8FAFC',
    textAlign: 'center',
  },
});



















