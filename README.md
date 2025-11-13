# Gymling

Gymling is a gamified fitness companion built with Expo + React Native. Each workout feeds your creature, unlocks gear, and rotates fresh monsters to battle. The app now launches with a creature-first dashboard, an onboarding flow for naming/customising your pal, and an improved arena card that surfaces energy, cooldown, and matchup hints.

## Features
- **Creature progression:** Log workouts to gain XP, raise stats, and evolve your companion.
- **Battle arena:** Fight monsters within 10 levels, review cooldown/energy at a glance, and launch cinematic duels.
- **Workout logging & streaks:** Every session tracks XP, volume, streaks, and personal records (with bonus XP for new PRs).
- **Persistent settings:** Creature name/photo, player stats, and battle prep all live in AsyncStorage so state survives app restarts.
- **Multi-platform Expo Router app:** File‑based routing with dedicated screens for creature details, battle prep, workouts, and settings.

## Getting started
`ash
npm install
npx expo start
`
Pick /i/w to launch Android, iOS, or web. For a clean Metro cache use 
px expo start --clear.

### First-run creature onboarding
On first launch (or after clearing storage) you'll be prompted to:
1. **Name your creature.** This label appears across the home screen, battle logs, and creature tab.
2. **Upload a portrait.** Tap “Choose Photo” to pick an image from the device library. This can be skipped temporarily, but the reminder reappears until both a name and photo are saved.
3. **Save creature.** The profile writes to AsyncStorage and unlocks the rest of the app. You can always revisit the Settings tab to change the name/photo later.

### Changing monster pictures
All monster art is driven by the icon field inside [constants/monsters.ts](constants/monsters.ts). To swap an image:
1. Open that file and locate the monster you want to update.
2. Replace the icon URL with a new square image (ideally 96×96 or larger) hosted on the web or served locally via expo-asset.
3. Save the file and reload Metro (
px expo start --clear) so the updated art flows through both the rotation list and duel screens.

## Updated home experience
- The landing screen now highlights your creature’s portrait, level, XP progress, stat grid, and quick actions for Battle Arena, Log Workout, and View Workouts.
- An arena-status callout summarises trainer XP and current energy (pulled from the shared player stats hook), ensuring you always know if you can fight or need to log a workout.

## Project structure
`
app/
  index.tsx          # Creature-first home + onboarding modal
  battle/            # Battle list + duel cinematic
  creature.tsx       # Creature overview
  workout.tsx        # Workout logger with PR bonuses + templates
  (tabs)/workouts.tsx# Workout log, streak tracker, PR gallery
components/
hooks/               # use-creature + use-player-stats wrappers
constants/monsters.ts# Monster data + icon URLs
lib/battle.ts        # Battle simulation + prep constants
`

## Development tips
- **Hot reload:** Metro + Expo Go support live reloading when you edit files inside pp/.
- **Clearing local state:** Delete the Gymling app from the Expo Go client or wipe AsyncStorage via dev tools to re-trigger onboarding.
- **Image picker permissions:** Ensure the Expo Go client has photo-library permission when testing creature onboarding or settings.

Happy training!
