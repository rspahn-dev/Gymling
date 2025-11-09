import React from 'react';
import { StyleSheet, Text, View, Button, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { getData } from '@/utils/storage';
import { WorkoutLog } from '@/models/workoutLog';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function WorkoutLogScreen() {
  const router = useRouter();
  const [workoutLog, setWorkoutLog] = React.useState<WorkoutLog | null>(null);

  React.useEffect(() => {
    const fetchWorkoutLog = async () => {
      const log = await getData('workoutLog');
      setWorkoutLog(log);
    };
    fetchWorkoutLog();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Workout Log</ThemedText>
      <Button title="New Workout" onPress={() => router.push('/workout')} />
      <ScrollView>
        {workoutLog?.workouts.map((workout, index) => (
          <View key={index} style={styles.workoutContainer}>
            <Text>{new Date(workout.date).toLocaleDateString()}</Text>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  workoutContainer: {
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
});
