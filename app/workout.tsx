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
import { useRouter } from 'expo-router';
import { getData, storeData } from '@/utils/storage';
import type { Workout } from '@/models/workout';
import type { Exercise } from '@/models/exercise';
import type { WorkoutSet } from '@/models/workoutSet';
import type { Creature } from '@/models/creature';
import { checkEvolution } from '@/models/evolution';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useCreature } from '@/hooks/use-creature';
import { usePlayerStats } from '@/hooks/use-player-stats';

type WorkoutTemplate = {
  id: string;
  name: string;
  workout: Workout;
};

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
  }));

const createWorkoutFromTemplate = (workout: Workout): Workout => ({
  ...workout,
  id: Date.now().toString(),
  date: new Date().toISOString(),
  exercises: deepCopyExercises(workout.exercises),
});

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

const applyXpGain = (creature: Creature, xpGain: number): Creature => {
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
      workout.exercises.some(
        (exercise) =>
          exercise.name.trim().length > 0 &&
          exercise.sets.some((set) => set.reps > 0 && set.weight >= 0),
      ),
    [workout.exercises],
  );

  useEffect(() => {
    const loadTemplates = async () => {
      const stored = (await getData('workoutTemplates')) as WorkoutTemplate[] | null;
      setTemplates(stored ?? []);
    };
    loadTemplates();
  }, []);

  const updateExercises = (updater: (current: Exercise[]) => Exercise[]) => {
    setWorkout((prev) => ({
      ...prev,
      exercises: updater(prev.exercises),
    }));
  };

  const addExercise = () => {
    const newExercise: Exercise = { name: 'New Exercise', sets: [] };
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
    setStatusMessage(`Loaded template "${template.name}".`);
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
      const xpEarned = xpPreview;
      const workoutLog =
        ((await getData('workoutLog')) as { workouts: Workout[] } | null) ?? {
          workouts: [],
        };
      const workoutToSave: Workout = {
        ...workout,
        id: Date.now().toString(),
        date: new Date().toISOString(),
        totalVolume,
        xpEarned,
        exercises: deepCopyExercises(workout.exercises),
      };
      workoutLog.workouts = [workoutToSave, ...(workoutLog.workouts ?? [])];
      await storeData('workoutLog', workoutLog);

      await updateCreature((current) => applyXpGain(current, xpEarned));
      await updatePlayerStats({
        xp: (playerStats?.xp ?? 0) + xpEarned,
      });

      setStatusMessage(
        `Workout saved! ${creature.name || 'Your creature'} gained +${xpEarned} XP.`,
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText style={styles.title}>Log Workout</ThemedText>
        <TextInput
          placeholder="Workout title"
          value={workout.title}
          onChangeText={(text) => setWorkout((prev) => ({ ...prev, title: text }))}
          style={[styles.textInput, styles.lightInput]}
        />
        <TextInput
          placeholder="Notes (optional)"
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
          <View key={`${exercise.name}-${exerciseIndex}`} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <TextInput
                value={exercise.name}
                onChangeText={(text) => handleExerciseNameChange(text, exerciseIndex)}
                style={styles.exerciseName}
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
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#1F2A44',
    borderRadius: 12,
    padding: 12,
    color: '#E2E8F0',
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
    backgroundColor: '#111E33',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  metricLabel: {
    color: '#94A3B8',
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
    backgroundColor: '#111E33',
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
  setInputGroup: {
    flex: 1,
  },
  setLabel: {
    color: '#94A3B8',
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
    color: '#94A3B8',
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
    color: '#94A3B8',
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
    color: '#94A3B8',
    textAlign: 'center',
  },
});
