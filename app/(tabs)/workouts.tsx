import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getData } from '@/utils/storage';
import type { Workout } from '@/models/workout';
import type { WorkoutLog } from '@/models/workoutLog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export default function WorkoutLogScreen() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWorkouts = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = (await getData('workoutLog')) as WorkoutLog | null;
      const list = stored?.workouts ?? [];
      const sorted = [...list].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setWorkouts(sorted);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [loadWorkouts]),
  );

  const totalVolume = useMemo(
    () => workouts.reduce((sum, workout) => sum + (workout.totalVolume ?? 0), 0),
    [workouts],
  );
  const totalXp = useMemo(
    () => workouts.reduce((sum, workout) => sum + (workout.xpEarned ?? 0), 0),
    [workouts],
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText style={styles.title}>Workout Log</ThemedText>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/workout')}>
          <Text style={styles.primaryButtonText}>New Workout</Text>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Sessions</Text>
          <Text style={styles.summaryValue}>{workouts.length}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>XP Earned</Text>
          <Text style={styles.summaryValue}>{totalXp}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Volume</Text>
          <Text style={styles.summaryValue}>{totalVolume}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Loading workouts...</Text>
        </View>
      ) : workouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No workouts logged yet. Tap “New Workout” to get started.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.logList}>
          {workouts.map((workout, index) => (
            <View key={workout.id ?? `${workout.title}-${index}`} style={styles.workoutCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{workout.title || 'Untitled workout'}</Text>
                <Text style={styles.cardXp}>+{workout.xpEarned ?? 0} XP</Text>
              </View>
              <Text style={styles.cardMeta}>
                {formatDate(workout.date)} • {workout.exercises.length} exercises
              </Text>
              {workout.notes ? <Text style={styles.cardNotes}>{workout.notes}</Text> : null}
              <View style={styles.exerciseList}>
                {workout.exercises.slice(0, 3).map((exercise, exerciseIndex) => (
                  <View key={`${exercise.name}-${exerciseIndex}`} style={styles.exerciseRow}>
                    <Text style={styles.exerciseName}>{exercise.name || 'Exercise'}</Text>
                    <Text style={styles.exerciseSets}>{exercise.sets.length} sets</Text>
                  </View>
                ))}
                {workout.exercises.length > 3 ? (
                  <Text style={styles.moreText}>
                    +{workout.exercises.length - 3} more exercises
                  </Text>
                ) : null}
              </View>
              {typeof workout.totalVolume === 'number' ? (
                <Text style={styles.cardFooter}>
                  Volume {workout.totalVolume} • Time logged {new Date(workout.date).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#0B1120',
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#111E33',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
  },
  logList: {
    gap: 16,
    paddingBottom: 24,
  },
  workoutCard: {
    backgroundColor: '#111E33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
  },
  cardXp: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  cardMeta: {
    color: '#94A3B8',
    fontSize: 13,
  },
  cardNotes: {
    color: '#CBD5F5',
  },
  exerciseList: {
    gap: 6,
    marginTop: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exerciseName: {
    color: '#F8FAFC',
  },
  exerciseSets: {
    color: '#94A3B8',
  },
  moreText: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  cardFooter: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
});
