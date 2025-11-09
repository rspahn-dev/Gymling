import { View, Text, StyleSheet } from 'react-native';
import { useCreature } from '@/hooks/use-creature';

export default function CreatureTab() {
  const { creature } = useCreature();

  if (!creature) {
    return <View style={styles.container}><Text>Loading creature...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{creature.name}</Text>
      <Text style={styles.level}>Level: {creature.level}</Text>
      <View style={styles.statsContainer}>
        <Text style={styles.stat}>Strength: {creature.stats.str}</Text>
        <Text style={styles.stat}>Agility: {creature.stats.agi}</Text>
        <Text style={styles.stat}>Stamina: {creature.stats.sta}</Text>
        <Text style={styles.stat}>Intelligence: {creature.stats.int}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  level: {
    fontSize: 18,
    marginBottom: 20,
  },
  statsContainer: {
    alignItems: 'flex-start',
  },
  stat: {
    fontSize: 16,
    marginBottom: 5,
  },
});
