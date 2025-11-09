import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button } from 'react-native';
import { Creature } from '@/models/creature';
import { storeData } from '@/utils/storage';

interface CreatureDisplayProps {
  creature: Creature;
}

export default function CreatureDisplay({ creature }: CreatureDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(creature.name);

  const handleSave = async () => {
    const updatedCreature = { ...creature, name };
    await storeData('creature', updatedCreature);
    setIsEditing(false);
  };

  return (
    <View style={styles.container}>
      {isEditing ? (
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.nameInput}
        />
      ) : (
        <Text style={styles.name}>{name}</Text>
      )}
      <Button title={isEditing ? 'Save' : 'Edit'} onPress={() => isEditing ? handleSave() : setIsEditing(true)} />
      <Text>Level: {creature.level}</Text>
      <Text>STR: {creature.stats.str}</Text>
      <Text>AGI: {creature.stats.agi}</Text>
      <Text>STA: {creature.stats.sta}</Text>
      <Text>INT: {creature.stats.int}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    margin: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  nameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    padding: 5,
  },
});
