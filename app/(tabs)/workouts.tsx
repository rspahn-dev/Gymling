import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { PersonalRecord, PersonalRecordMap } from '@/models/personalRecord';
import type { Workout } from '@/models/workout';
import type { WorkoutLog } from '@/models/workoutLog';
import { getData } from '@/utils/storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const DAY_MS = 1000 * 60 * 60 * 24;

const toDateKey = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

const stepDateKey = (key: string, delta: number) => {
  const date = new Date(key);
  if (Number.isNaN(date.getTime())) {
    return key;
  }
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
};

type FitbitSettings = {
  isConnected: boolean;
  deviceName: string;
  lastSync?: string;
};

const FITBIT_SETTINGS_KEY = 'fitbitSettings';

const computeStreakStats = (entries: Workout[]) => {
  if (!entries.length) {
    return { current: 0, best: 0 };
  }
  const dateKeys = entries
    .map((workout) => toDateKey(workout.date))
    .filter((key): key is string => Boolean(key));
  if (!dateKeys.length) {
    return { current: 0, best: 0 };
  }
  const unique = Array.from(new Set(dateKeys)).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;

  unique.forEach((key) => {
    if (!prev) {
      run = 1;
    } else {
      const diff = (new Date(key).getTime() - new Date(prev).getTime()) / DAY_MS;
      run = diff === 1 ? run + 1 : 1;
    }
    prev = key;
    if (run > best) {
      best = run;
    }
  });

  const dateSet = new Set(unique);
  const todayKey = toDateKey(new Date());
  let current = 0;
  if (todayKey) {
    let cursor = todayKey;
    while (dateSet.has(cursor)) {
      current += 1;
      cursor = stepDateKey(cursor, -1);
    }
  }

  return {
    current,
    best: Math.max(best, current),
  };
};

export default function WorkoutLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [fitbitSettings, setFitbitSettings] = useState<FitbitSettings | null>(null);
  const [streak, setStreak] = useState<{ current: number; best: number }>({
    current: 0,
    best: 0,
  });

  const loadWorkouts = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = (await getData('workoutLog')) as WorkoutLog | null;
      const list = stored?.workouts ?? [];
      const sorted = [...list].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setWorkouts(sorted);
      setStreak(computeStreakStats(sorted));

      const storedRecords =
        ((await getData('personalRecords')) as PersonalRecordMap | null) ?? {};
      const orderedRecords = Object.values(storedRecords).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setPersonalRecords(orderedRecords);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadFitbitSettings = useCallback(async () => {
    const stored = (await getData(FITBIT_SETTINGS_KEY)) as FitbitSettings | null;
    setFitbitSettings(stored ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
      loadFitbitSettings();
    }, [loadWorkouts, loadFitbitSettings]),
  );

  const totalVolume = useMemo(
    () => workouts.reduce((sum, workout) => sum + (workout.totalVolume ?? 0), 0),
    [workouts],
  );
  const fitbitChipStatus = fitbitSettings?.isConnected
    ? fitbitSettings?.lastSync
      ? `Synced ${new Date(fitbitSettings.lastSync).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}`
      : 'Synced'
    : 'Connected';
  const totalXp = useMemo(
    () => workouts.reduce((sum, workout) => sum + (workout.xpEarned ?? 0), 0),
    [workouts],
  );
  const topRecords = useMemo(
    () => personalRecords.slice(0, 4),
    [personalRecords],
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 32) },
        ]}
        showsVerticalScrollIndicator={false}
      >
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

        <View style={styles.streakChips}>
          <View style={styles.streakChip}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakChipText}>{streak.current}d</Text>
          </View>
          <View style={styles.streakChip}>
            <Text style={styles.streakIcon}>🏆</Text>
            <Text style={styles.streakChipText}>{streak.best}d</Text>
          </View>
          <Pressable
            style={[styles.streakChip, styles.fitbitChip]}
            onPress={() => router.push('/settings')}
          >
            <Text style={styles.fitbitIcon}>⌚</Text>
            <View>
              <Text style={styles.fitbitChipLabel}>Fitbit</Text>
              <Text style={styles.fitbitChipStatus}>{fitbitChipStatus}</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.prSection}>
          <View style={styles.prHeader}>
            <Text style={styles.sectionTitle}>Personal Records</Text>
            <Text style={styles.prHint}>
              {personalRecords.length ? 'Auto-tracked from your best sets' : 'No records yet'}
            </Text>
          </View>
          {topRecords.length === 0 ? (
            <Text style={styles.helperText}>Log a workout to set your first PR.</Text>
          ) : (
            <View style={styles.prGrid}>
              {topRecords.map((record) => (
                <View key={record.id} style={styles.prChip}>
                  <Text style={styles.prChipWeight}>{Math.round(record.maxWeight)} lbs</Text>
                  <Text style={styles.prChipName}>{record.exercise}</Text>
                  <Text style={styles.prChipMeta}>{formatDate(record.updatedAt)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={styles.loadingText}>Loading workouts...</Text>
          </View>
        ) : workouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No workouts logged yet. Tap "New Workout" to get started.
            </Text>
          </View>
        ) : (
          <View style={styles.logList}>
            {workouts.map((workout, index) => {
              const prCount = workout.prAchievements?.length ?? 0;
              const prBonus =
                workout.prAchievements?.reduce((sum, pr) => sum + pr.xpBonus, 0) ?? 0;
              return (
                <View key={workout.id ?? `${workout.title}-${index}`} style={styles.workoutCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{workout.title || 'Untitled workout'}</Text>
                    <Text style={styles.cardXp}>+{workout.xpEarned ?? 0} XP</Text>
                  </View>
                  <Text style={styles.cardMeta}>
                    {formatDate(workout.date)} - {workout.exercises.length} exercises
                  </Text>
                  {workout.notes ? <Text style={styles.cardNotes}>{workout.notes}</Text> : null}
                  {prCount ? (
                    <View style={styles.prBadge}>
                      <Text style={styles.prBadgeText}>
                        {prCount} PR{prCount > 1 ? 's' : ''} (+{prBonus} XP)
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.exerciseList}>
                    {workout.exercises.slice(0, 3).map((exercise, exerciseIndex) => (
                      <View key={`${exercise.name}-${exerciseIndex}`} style={styles.exerciseRow}>
                        <Text style={styles.exerciseName}>{exercise.name || 'Exercise'}</Text>
                        <Text style={styles.exerciseSets}>{exercise.sets.length} sets</Text>
                      </View>
                    ))}
                    {workout.exercises.length > 3 ? (
                      <Text style={styles.moreText}>+{workout.exercises.length - 3} more exercises</Text>
                    ) : null}
                  </View>
                  {typeof workout.totalVolume === 'number' ? (
                    <Text style={styles.cardFooter}>
                      Volume {workout.totalVolume} - Time logged{' '}
                      {new Date(workout.date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
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
    paddingHorizontal: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
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
    color: '#CBD5F5',
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '600',
  },
  streakChips: {
    flexDirection: 'row',
    gap: 8,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1120',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1F2A44',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  streakIcon: {
    fontSize: 14,
  },
  streakChipText: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  fitbitChip: {
    paddingVertical: 8,
  },
  fitbitIcon: {
    fontSize: 16,
    marginRight: 4,
    color: '#38BDF8',
  },
  fitbitChipLabel: {
    color: '#E2E8F0',
    fontWeight: '600',
    fontSize: 12,
  },
  fitbitChipStatus: {
    color: '#38BDF8',
    fontSize: 11,
  },
  sectionTitle: {
    color: '#E2E8F0',
    fontSize: 20,
    fontWeight: '600',
  },
  prSection: {
    gap: 12,
  },
  prHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prHint: {
    color: '#CBD5F5',
    fontSize: 12,
  },
  prGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prChip: {
    flexBasis: '48%',
    backgroundColor: '#111E33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2A44',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
  },
  prChipWeight: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  prChipName: {
    color: '#E2E8F0',
    fontWeight: '600',
    fontSize: 13,
  },
  prChipMeta: {
    color: '#CBD5F5',
    fontSize: 11,
  },
  prBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  prBadgeText: {
    color: '#38BDF8',
    fontWeight: '600',
    fontSize: 12,
  },
  helperText: {
    color: '#E2E8F0',
    textAlign: 'center',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#CBD5F5',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#CBD5F5',
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
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '600',
  },
  cardXp: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  cardMeta: {
    color: '#CBD5F5',
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
    color: '#E2E8F0',
  },
  exerciseSets: {
    color: '#CBD5F5',
  },
  moreText: {
    color: '#CBD5F5',
    fontStyle: 'italic',
  },
  cardFooter: {
    color: '#CBD5F5',
    fontSize: 12,
    marginTop: 4,
  },
});



















