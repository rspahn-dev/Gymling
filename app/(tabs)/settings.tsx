import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCreature } from '@/hooks/use-creature';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&h=300&fit=crop';

export default function SettingsScreen() {
  const { creature, updateCreature, isCreatureLoading } = useCreature();
  const [nameInput, setNameInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (creature) {
      setNameInput(creature.name ?? '');
      setImageInput(creature.imageUrl ?? '');
    }
  }, [creature]);

  const previewImage = useMemo(() => {
    if (imageInput.trim().length > 0) {
      return imageInput.trim();
    }
    if (creature?.imageUrl) {
      return creature.imageUrl;
    }
    return FALLBACK_IMAGE;
  }, [imageInput, creature?.imageUrl]);

  const handleSaveProfile = async () => {
    if (!creature) {
      return;
    }
    const trimmedName = nameInput.trim();
    if (!trimmedName.length) {
      Alert.alert('Pick a name', 'Please enter a name for your creature before saving.');
      return;
    }
    const trimmedImage = imageInput.trim();
    setIsSaving(true);
    await updateCreature((current) => ({
      ...current,
      name: trimmedName,
      imageUrl: trimmedImage.length > 0 ? trimmedImage : undefined,
    }));
    setStatusMessage('Profile updated.');
    setIsSaving(false);
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to upload your creature picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        setImageInput(result.assets[0].uri);
        setStatusMessage('Preview updated. Save changes to keep this photo.');
      }
    } catch (error) {
      console.error('Image picker error', error);
      Alert.alert('Oops', 'Could not open your photo library. Try again.');
    }
  };

  if (isCreatureLoading || !creature) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading creature...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <Image source={{ uri: previewImage }} style={styles.avatar} />
          <Pressable style={styles.secondaryButton} onPress={handlePickImage}>
            <Text style={styles.secondaryText}>Upload Photo</Text>
          </Pressable>
        </View>
        <TextInput
          value={nameInput}
          onChangeText={setNameInput}
          placeholder="Creature name"
          placeholderTextColor="#64748B"
          style={styles.input}
        />
        <Pressable
          style={[styles.primaryButton, isSaving ? styles.disabled : null]}
          onPress={handleSaveProfile}
          disabled={isSaving}
        >
          <Text style={styles.primaryText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
        </Pressable>
        {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#111E33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
    padding: 16,
    gap: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#1F2A44',
  },
  input: {
    borderWidth: 1,
    borderColor: '#1F2A44',
    borderRadius: 12,
    padding: 12,
    color: '#F8FAFC',
  },
  primaryButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#0B1120',
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1F2A44',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryText: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
  status: {
    color: '#94A3B8',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1120',
  },
  loadingText: {
    marginTop: 12,
    color: '#CBD5F5',
  },
});
