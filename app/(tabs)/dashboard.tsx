import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getData } from '@/utils/storage';
import { Creature } from '@/models/creature';
import { PlayerStats } from '@/models/player';
import CreatureDisplay from '@/components/CreatureDisplay';
import PlayerStatsDisplay from '@/components/PlayerStatsDisplay';

export default function DashboardScreen() {
  const [creature, setCreature] = useState<Creature | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        const creatureData = await getData('creature');
        setCreature(creatureData);
        const playerStatsData = await getData('playerStats');
        setPlayerStats(playerStatsData);
      };

      fetchData();
    }, [])
  );

  if (!creature || !playerStats) {
    return <Text>Loading...</Text>; // Or a loading indicator
  }

  return (
    <View style={styles.container}>
      <CreatureDisplay creature={creature} />
      <PlayerStatsDisplay playerStats={playerStats} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
