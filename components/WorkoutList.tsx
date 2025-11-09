import React from 'react';
import { StyleSheet, Text, FlatList, TouchableOpacity } from 'react-native';
import { Workout } from '@/models/workouts';

interface WorkoutListProps {
  workouts: Workout[];
  onSelectWorkout: (workout: Workout) => void;
}

export default function WorkoutList({ workouts, onSelectWorkout }: WorkoutListProps) {
  return (
    <FlatList
      data={workouts}
      keyExtractor={(item) => item.name}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => onSelectWorkout(item)} style={styles.item}>
          <Text style={styles.name}>{item.name}</Text>
          <Text>{item.description}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
