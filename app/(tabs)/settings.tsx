import { useCreature } from '@/hooks/use-creature';
import { usePlayerStats } from '@/hooks/use-player-stats';
import { initialCreature, initialPlayerStats } from '@/models/initialData';
import { getData, storeData } from '@/utils/storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&h=300&fit=crop';
const SETTINGS_KEY = 'userSettings';

type UserSettings = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  workoutReminders: boolean;
  energyAlerts: boolean;
  unitSystem: 'imperial' | 'metric';
};

const defaultSettings: UserSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  workoutReminders: true,
  energyAlerts: true,
  unitSystem: 'imperial',
};

const unitOptions: UserSettings['unitSystem'][] = ['imperial', 'metric'];

export default function SettingsScreen() {
  const { creature, updateCreature, isCreatureLoading } = useCreature();
  const { updatePlayerStats } = usePlayerStats();
  const insets = useSafeAreaInsets();
  const [nameInput, setNameInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  useEffect(() => {
    if (creature) {
      setNameInput(creature.name ?? '');
      setImageInput(creature.imageUrl ?? '');
    }
  }, [creature]);

  useEffect(() => {
    const hydrateSettings = async () => {
      const stored = (await getData(SETTINGS_KEY)) as UserSettings | null;
      if (stored) {
        setSettings({ ...defaultSettings, ...stored });
      }
      setIsSettingsLoading(false);
    };
    void hydrateSettings();
  }, []);

  const previewImage = useMemo(() => {
    if (imageInput.trim().length > 0) {
      return imageInput.trim();
    }
    if (creature?.imageUrl) {
      return creature.imageUrl;
    }
    return FALLBACK_IMAGE;
  }, [imageInput, creature?.imageUrl]);

  const persistSettings = async (next: UserSettings) => {
    setSettings(next);
    await storeData(SETTINGS_KEY, next);
    setStatusMessage('Settings updated.');
  };

  const handleToggleSetting = (key: keyof UserSettings) => async (value: boolean) => {
    const next = { ...settings, [key]: value } as UserSettings;
    await persistSettings(next);
  };

  const handleUnitChange = async (unitSystem: UserSettings['unitSystem']) => {
    if (unitSystem === settings.unitSystem) {
      return;
    }
    await persistSettings({ ...settings, unitSystem });
  };

  const handleExportData = async () => {
    try {
      const payload = {
        creature,
        playerStats: await getData('playerStats'),
        workoutLog: await getData('workoutLog'),
        personalRecords: await getData('personalRecords'),
        settings,
      };
      await Share.share({
        title: 'Gymling backup',
        message: JSON.stringify(payload, null, 2),
      });
    } catch (error) {
      console.error('Export data failed', error);
      Alert.alert('Export failed', 'Unable to prepare your data right now. Please try again.');
    }
  };

  const handleShowStorageSummary = async () => {
    const workoutLog = ((await getData('workoutLog')) as { workouts?: unknown[] } | null)?.workouts ?? [];
    const personalRecords = (await getData('personalRecords')) as Record<string, unknown> | null;
    const summary = `Workouts saved: ${Array.isArray(workoutLog) ? workoutLog.length : 0}` +
      `\nPersonal records: ${personalRecords ? Object.keys(personalRecords).length : 0}` +
      `\nUnit system: ${settings.unitSystem === 'imperial' ? 'Imperial (lbs/mi)' : 'Metric (kg/km)'}`;
    Alert.alert('Local data summary', summary);
  };

  const handleResetProgress = () => {
    Alert.alert(
      'Reset all progress?',
      'This clears your creature, player stats, workouts, and settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            await updateCreature(() => initialCreature);
            await updatePlayerStats(initialPlayerStats);
            await storeData('workoutLog', { workouts: [] });
            await storeData('personalRecords', {});
            await storeData('battleLock', null);
            await persistSettings(defaultSettings);
            setStatusMessage('All progress cleared.');
            setIsSaving(false);
          },
        },
      ],
    );
  };

  const disableSettings = isSaving || isSettingsLoading;

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
      <View style={[styles.loadingState, { paddingTop: insets.top + 32 }]}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading creature...</Text>
      </View>
    );
  }

    return (
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 32) },
        ]}
      >
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

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Feedback</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>Sound effects</Text>
              <Text style={styles.settingHint}>Play audio cues during battles and workouts.</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={handleToggleSetting('soundEnabled')}
              trackColor={{ false: '#1F2A44', true: '#38BDF8' }}
              thumbColor="#F8FAFC"
              disabled={disableSettings}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>Haptics</Text>
              <Text style={styles.settingHint}>Vibrate on major battle moments.</Text>
            </View>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={handleToggleSetting('hapticsEnabled')}
              trackColor={{ false: '#1F2A44', true: '#38BDF8' }}
              thumbColor="#F8FAFC"
              disabled={disableSettings}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Notifications</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>Workout reminders</Text>
              <Text style={styles.settingHint}>Get nudges when you miss a planned session.</Text>
            </View>
            <Switch
              value={settings.workoutReminders}
              onValueChange={handleToggleSetting('workoutReminders')}
              trackColor={{ false: '#1F2A44', true: '#38BDF8' }}
              thumbColor="#F8FAFC"
              disabled={disableSettings}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>Energy alerts</Text>
              <Text style={styles.settingHint}>Let me know when battle energy is full.</Text>
            </View>
            <Switch
              value={settings.energyAlerts}
              onValueChange={handleToggleSetting('energyAlerts')}
              trackColor={{ false: '#1F2A44', true: '#38BDF8' }}
              thumbColor="#F8FAFC"
              disabled={disableSettings}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Preferences</Text>
          <Text style={styles.settingHint}>Unit system</Text>
          <View style={styles.segmentedControl}>
            {unitOptions.map((unit) => {
              const isActive = settings.unitSystem === unit;
              const label = unit === 'imperial' ? 'Imperial (lbs/mi)' : 'Metric (kg/km)';
              return (
                <Pressable
                  key={unit}
                  style={[styles.segmentedOption, isActive && styles.segmentedOptionActive]}
                  onPress={() => handleUnitChange(unit)}
                  disabled={disableSettings}
                >
                  <Text
                    style={[styles.segmentedOptionText, isActive && styles.segmentedOptionTextActive]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Data & Privacy</Text>
          <View style={styles.buttonGroup}>
            <Pressable style={styles.outlineButton} onPress={handleShowStorageSummary} disabled={disableSettings}>
              <Text style={styles.outlineButtonText}>View Local Data</Text>
            </Pressable>
            <Pressable style={styles.outlineButton} onPress={handleExportData} disabled={disableSettings}>
              <Text style={styles.outlineButtonText}>Export Backup</Text>
            </Pressable>
            <Pressable
              style={[styles.outlineButton, styles.dangerButton]}
              onPress={handleResetProgress}
              disabled={disableSettings}
            >
              <Text style={[styles.outlineButtonText, styles.dangerButtonText]}>
                Reset All Progress
              </Text>
            </Pressable>
          </View>
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
  cardHeading: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  settingCopy: {
    flex: 1,
  },
  settingLabel: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  settingHint: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
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
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#0B1120',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2A44',
    overflow: 'hidden',
  },
  segmentedOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  segmentedOptionActive: {
    backgroundColor: '#1D2B44',
  },
  segmentedOptionText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  segmentedOptionTextActive: {
    color: '#F8FAFC',
  },
  buttonGroup: {
    gap: 10,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#1F2A44',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  dangerButton: {
    borderColor: '#F87171',
  },
  dangerButtonText: {
    color: '#F87171',
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













