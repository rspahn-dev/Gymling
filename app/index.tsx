import { useCreature } from '@/hooks/use-creature';
import { usePlayerStats } from '@/hooks/use-player-stats';
import { ENERGY_COST } from '@/lib/battle';
import { getMaxEnergyForLevel } from '@/lib/energy';
import { getData, storeData } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=600&fit=crop';
const placeholderColor = '#94A3B8';

const primaryActions = [
  {
    label: 'Battle Arena',
    href: '/battle',
    icon: 'flash-outline' as const,
    accent: '#F97316',
  },
  {
    label: 'Log Workout',
    href: '/workout',
    icon: 'create-outline' as const,
    accent: '#38BDF8',
  },
  {
    label: 'View Workouts',
    href: '/workouts',
    icon: 'barbell-outline' as const,
    accent: '#A78BFA',
  },
];

export default function HomeScreen() {
  const { creature, isCreatureLoading, updateCreature } = useCreature();
  const { playerStats } = usePlayerStats();

  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingImage, setOnboardingImage] = useState('');
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false);
  const needsProfile = !creature?.name?.trim() || !creature?.imageUrl;
  const maxEnergy = useMemo(() => getMaxEnergyForLevel(creature?.level ?? 1), [creature?.level]);
  
  useEffect(() => {
    if (!creature || dismissedOnboarding) {
      return;
    }

    let isMounted = true;
    (async () => {
      const completed = await getData('creatureOnboardingCompleted');
      if (!completed && needsProfile && isMounted) {
        setOnboardingName(creature.name ?? '');
        setOnboardingImage(creature.imageUrl ?? '');
        setIsOnboardingVisible(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [creature, needsProfile, dismissedOnboarding]);

  const previewImage = creature?.imageUrl || FALLBACK_IMAGE;
  const xpProgress = useMemo(() => {
    if (!creature || !creature.xpToNext) {
      return 0;
    }
    return Math.min(creature.xp / creature.xpToNext, 1);
  }, [creature]);

  const energy = playerStats?.energy ?? 0;
  const totalXp = playerStats?.xp ?? 0;
  const clampedEnergy = Math.min(Math.max(energy, 0), maxEnergy);
  const gymlingName = creature?.name?.trim() || 'Your Gymling';



  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to select Your Gymling photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        setOnboardingImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error', error);
      Alert.alert('Oops', 'Could not open your photo library. Try again.');
    }
  };

  const handleSaveOnboarding = async () => {
    if (!creature) {
      return;
    }
    const trimmedName = onboardingName.trim();
    if (!trimmedName.length) {
      Alert.alert('Name required', 'Give Your Gymling a name to continue.');
      return;
    }
    if (!onboardingImage.trim()) {
      Alert.alert('Photo required', 'Upload a photo or use the Settings tab later.');
      return;
    }
    await updateCreature((current) => ({
      ...current,
      name: trimmedName,
      imageUrl: onboardingImage,
    }));
    await storeData('creatureOnboardingCompleted', true);
    setIsOnboardingVisible(false);
  };

  const handleSkipOnboarding = () => {
    setDismissedOnboarding(true);
    setIsOnboardingVisible(false);
  };

  if (isCreatureLoading || !creature) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading Your Gymling...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Image source={{ uri: previewImage }} style={styles.heroImage} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{gymlingName}</Text>
            <Text style={styles.heroMeta}>Level {creature.level} • Stage {creature.evolutionStage}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(xpProgress * 100).toFixed(0)}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {creature.xp} / {creature.xpToNext} XP to evolve
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {Object.entries(creature.stats).map(([statKey, statValue]) => (
            <View key={statKey} style={styles.statTile}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{statKey.toUpperCase()}</Text>
                <Text style={styles.statValue}>{statValue}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.calloutRow}>
          <View style={styles.calloutCard}>
            <Text style={styles.calloutLabel}>Energy</Text>
            <Text style={styles.calloutValue}>{`${clampedEnergy}/${maxEnergy}`}</Text>
            <Text style={styles.calloutHint}>{`Need ${ENERGY_COST} energy to queue a fight.`}</Text>
          </View>
          <View style={styles.calloutCard}>
            <Text style={styles.calloutLabel}>{`${gymlingName} XP`}</Text>
            <Text style={styles.calloutValue}>{totalXp}</Text>
            <Text style={styles.calloutHint}>Workouts feed your Gymling's growth.</Text>
          </View>
        </View>

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Jump back in</Text>
          <View style={styles.actionsRow}>
            {primaryActions.map((action) => (
              <Link key={action.label} href={action.href} asChild>
                <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.cardPressed]}>
                  <View style={[styles.actionIcon, { backgroundColor: action.accent }]}>
                    <Ionicons name={action.icon} size={22} color="#0B1120" />
                  </View>
                  <Text style={styles.actionText}>{action.label}</Text>
                </Pressable>
              </Link>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={isOnboardingVisible} transparent animationType="fade" onRequestClose={handleSkipOnboarding}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Customize Your Gymling</Text>
            <Text style={styles.modalSubtitle}>Pick a name and portrait to unlock the adventure.</Text>
            <TextInput
              value={onboardingName}
              onChangeText={setOnboardingName}
              placeholder="Creature name"
              placeholderTextColor={placeholderColor}
              style={styles.modalInput}
            />
            <View style={styles.modalPreviewRow}>
              <Image
                source={{ uri: onboardingImage || creature.imageUrl || FALLBACK_IMAGE }}
                style={styles.modalPreviewImage}
              />
              <Pressable style={styles.modalPickerButton} onPress={handlePickImage}>
                <Text style={styles.modalPickerText}>Choose Photo</Text>
              </Pressable>
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalPrimary} onPress={handleSaveOnboarding}>
                <Text style={styles.modalPrimaryText}>Save Creature</Text>
              </Pressable>
              <Pressable style={styles.modalSecondary} onPress={handleSkipOnboarding}>
                <Text style={styles.modalSecondaryText}>Skip for now</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 24,
    gap: 20,
    backgroundColor: '#010914',
  },
  loadingState: {
    flex: 1,
    backgroundColor: '#010914',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#CBD5F5',
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1D2B44',
    flexDirection: 'row',
    gap: 20,
  },
  heroImage: {
    width: 120,
    height: 120,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#1D2B44',
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  heroName: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '700',
  },
  heroMeta: {
    color: '#CBD5F5',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1E2D47',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
  },
  progressLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statTile: {
    flexBasis: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1D2B44',
    padding: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  calloutRow: {
    flexDirection: 'row',
    gap: 12,
  },
  calloutCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1D2B44',
    padding: 16,
    gap: 4,
  },
  calloutLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  calloutValue: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
  },
  calloutHint: {
    color: '#CBD5F5',
    fontSize: 12,
  },
  actionsSection: {
    gap: 12,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  actionCard: {
    flexGrow: 1,
    flexBasis: '30%',
    maxWidth: 160,
    minWidth: 110,
    backgroundColor: '#111E33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#0B1120',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2A44',
    gap: 12,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#CBD5F5',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#1F2A44',
    borderRadius: 12,
    padding: 12,
    color: '#F8FAFC',
  },
  modalPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  modalPreviewImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  modalPickerButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalPickerText: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalPrimary: {
    flex: 1,
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryText: {
    color: '#0B1120',
    fontWeight: '700',
  },
  modalSecondary: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2A44',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  modalSecondaryText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
});







































