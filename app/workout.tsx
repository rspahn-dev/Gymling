import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { getData, storeData } from '@/utils/storage';
import { Workout } from '@/models/workout';
import { Exercise } from '@/models/exercise';
import { WorkoutSet } from '@/models/workoutSet';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function NewWorkoutScreen() {
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout>({ date: new Date(), exercises: [] });

  const addExercise = () => {
    const newExercise: Exercise = { name: 'New Exercise', sets: [] };
    setWorkout({ ...workout, exercises: [...workout.exercises, newExercise] });
  };

  const addSet = (exerciseIndex: number) => {
    const newSet: WorkoutSet = { reps: 0, weight: 0 };
    const newExercises = [...workout.exercises];
    newExercises[exerciseIndex].sets.push(newSet);
    setWorkout({ ...workout, exercises: newExercises });
  };

  const handleExerciseNameChange = (text: string, exerciseIndex: number) => {
    const newExercises = [...workout.exercises];
    newExercises[exerciseIndex].name = text;
    setWorkout({ ...workout, exercises: newExercises });
  };

  const handleSetChange = (exerciseIndex: number, setIndex: number, field: keyof WorkoutSet, value: string) => {
    const newExercises = [...workout.exercises];
    newExercises[exerciseIndex].sets[setIndex][field] = Number(value);
    setWorkout({ ...workout, exercises: newExercises });
  };


  const saveWorkout = async () => {
    const workoutLog = await getData('workoutLog') || { workouts: [] };
    workoutLog.workouts.push(workout);
    await storeData('workoutLog', workoutLog);
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>New Workout</ThemedText>
      <ScrollView>
        {workout.exercises.map((exercise, exerciseIndex) => (
          <View key={exerciseIndex} style={styles.exerciseContainer}>
            <TextInput
              value={exercise.name}
              onChangeText={(text) => handleExerciseNameChange(text, exerciseIndex)}
              style={styles.exerciseName}
            />
            <Button title="Add Set" onPress={() => addSet(exerciseIndex)} />
            {exercise.sets.map((set, setIndex) => (
              <View key={setIndex} style={styles.setContainer}>
                <TextInput
                  placeholder="Reps"
                  keyboardType="numeric"
                  onChangeText={(value) => handleSetChange(exerciseIndex, setIndex, 'reps', value)}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Weight"
                  keyboardType="numeric"
                  onChangeText={(value) => handleSetChange(exerciseIndex, setIndex, 'weight', value)}
                  style={styles.input}
                />
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
      <Button title="Add Exercise" onPress={addExercise} />
      <Button title="Save Workout" onPress={saveWorkout} />
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
  exerciseContainer: {
    marginBottom: 20,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    padding: 5,
  },
  setContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    width: '40%',
  },
});
