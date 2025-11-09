import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlayerStats } from '@/models/player';

interface PlayerStatsDisplayProps {
  playerStats: PlayerStats;
}

export default function PlayerStatsDisplay({ playerStats }: PlayerStatsDisplayProps) {
  return (
    <View style={styles.container}>
      <Text>Energy: {playerStats.energy}</Text>
      <Text>XP: {playerStats.xp}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    margin: 20,
  },
});
