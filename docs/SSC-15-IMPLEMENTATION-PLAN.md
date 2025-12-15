# SSC-15: Mobile App Development (iOS & Android) - Implementation Plan

## Overview

Create native mobile applications for iOS and Android to enable on-the-go studying and lecture capture. The mobile app brings StudySync's core features to students' pockets with offline support, camera integration for note capture, audio recording for lectures, and push notifications for study reminders.

**Priority**: High
**Platform Strategy**: React Native for cross-platform efficiency with native modules where needed

## Tech Stack

### Mobile Framework Decision: React Native

**Why React Native over alternatives:**

| Factor | React Native | Flutter | Native (Swift/Kotlin) |
|--------|-------------|---------|----------------------|
| Code Reuse with Web | High (shared types, API client) | Low | None |
| Team Knowledge | Leverages existing React/TS skills | New language (Dart) | Two separate codebases |
| Time to Market | Fast | Medium | Slow |
| Performance | Good (95% native) | Excellent | Best |
| Native Features | Via modules | Via plugins | Direct |
| App Size | ~20MB | ~10MB | ~5MB |

**Recommendation**: React Native with Expo for faster development, with ejection capability for native modules.

### Tech Stack Details
- **Framework**: React Native 0.73+ with Expo SDK 50+
- **Language**: TypeScript (shared types with web)
- **State Management**: Zustand (lightweight, works offline)
- **Offline Storage**: WatermelonDB (SQLite-based, sync-ready)
- **API Client**: Shared from `@studysync/shared` package
- **Navigation**: React Navigation 6
- **UI Components**: React Native Paper + custom design system
- **Push Notifications**: Expo Notifications + Firebase Cloud Messaging
- **Audio Recording**: expo-av
- **Camera/OCR**: expo-camera + Google Cloud Vision API
- **Background Sync**: expo-background-fetch + expo-task-manager
- **Testing**: Jest + Detox (E2E)

## Current State Analysis

### What Already Exists (Backend Ready)
- **Authentication API**: JWT-based auth with refresh tokens
- **Content API**: Flashcards, quizzes, uploads, knowledge graph endpoints
- **Subscription API**: Stripe integration for premium features
- **Analytics API**: Study tracking endpoints (SSC-17)
- **File Upload**: MinIO storage with presigned URLs
- **Feature Gating**: Subscription tier middleware

### What Needs to Be Built
1. New Turborepo workspace: `apps/mobile`
2. Shared package updates: `packages/shared` for API types
3. Mobile-specific API endpoints (push tokens, device sync)
4. Offline-first data architecture
5. Background sync system
6. Push notification infrastructure
7. Audio recording and processing
8. Camera OCR integration
9. Mobile-optimized UI components
10. App store assets and deployment pipeline

## Repository Structure

```
apps/
  mobile/                    # New React Native app
    src/
      app/                   # Expo Router screens
      components/            # Mobile UI components
      hooks/                 # Custom React hooks
      services/              # API, storage, sync services
      stores/                # Zustand state stores
      utils/                 # Utilities
      db/                    # WatermelonDB models and migrations
    assets/                  # Images, fonts
    app.json                 # Expo config
    eas.json                 # EAS Build config

packages/
  shared/                    # NEW: Shared types and API client
    src/
      types/                 # TypeScript interfaces
      api/                   # API client (used by web and mobile)
      constants/             # Shared constants
```

## Implementation Stages (25 Atomic Commits)

### Phase 1: Project Setup (Commits 1-3)

**Commit 1**: Initialize React Native project with Expo
- Create `apps/mobile` with Expo SDK 50
- Configure TypeScript
- Set up Expo Router for file-based navigation
- Configure Metro bundler for monorepo
- Add to Turborepo pipeline

```json
// apps/mobile/app.json
{
  "expo": {
    "name": "StudySync",
    "slug": "studysync",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.studysync.app",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "StudySync needs microphone access to record lectures",
        "NSCameraUsageDescription": "StudySync needs camera access to capture notes and documents"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.studysync.app",
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-av",
      "expo-camera",
      "expo-notifications"
    ]
  }
}
```

**Commit 2**: Create shared package with API types
- Create `packages/shared` workspace
- Move/create shared TypeScript interfaces
- Create base API client that works in both web and mobile
- Export from package

```typescript
// packages/shared/src/types/index.ts
export interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
}

export interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  flashcardSetId: string;
  front: string;
  back: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timesReviewed: number;
  correctCount: number;
  nextReview: string | null;
  lastReviewed: string | null;
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  timeLimit: number | null;
  tags: string[];
  createdAt: string;
}

export interface StudySession {
  id: string;
  flashcardSetId: string;
  startedAt: string;
  endedAt: string | null;
  cardsStudied: number;
  correctCount: number;
  duration: number;
}

// ... more shared types
```

**Commit 3**: Set up mobile authentication flow
- Implement secure token storage with expo-secure-store
- Create auth context and hooks
- Build login/register screens
- Implement biometric authentication option

```typescript
// apps/mobile/src/services/auth.service.ts
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { apiClient } from '@studysync/shared';

const TOKEN_KEY = 'studysync_access_token';
const REFRESH_KEY = 'studysync_refresh_token';

export const authService = {
  async login(email: string, password: string) {
    const response = await apiClient.post('/auth/login', { email, password });
    await this.storeTokens(response.accessToken, response.refreshToken);
    return response.user;
  },

  async storeTokens(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  },

  async getAccessToken() {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async refreshTokens() {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (!refreshToken) throw new Error('No refresh token');

    const response = await apiClient.post('/auth/refresh', { refreshToken });
    await this.storeTokens(response.accessToken, response.refreshToken);
    return response.accessToken;
  },

  async logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },

  async biometricLogin() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access StudySync',
      fallbackLabel: 'Use password',
    });

    return result.success;
  },
};
```

### Phase 2: Offline-First Database (Commits 4-6)

**Commit 4**: Set up WatermelonDB for offline storage
- Install and configure WatermelonDB
- Create database schema matching backend models
- Set up migration system

```typescript
// apps/mobile/src/db/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'flashcard_sets',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'tags', type: 'string' }, // JSON array
        { name: 'card_count', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'is_dirty', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'flashcards',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'flashcard_set_id', type: 'string', isIndexed: true },
        { name: 'front', type: 'string' },
        { name: 'back', type: 'string' },
        { name: 'difficulty', type: 'string' },
        { name: 'times_reviewed', type: 'number' },
        { name: 'correct_count', type: 'number' },
        { name: 'next_review', type: 'number', isOptional: true },
        { name: 'last_reviewed', type: 'number', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'is_dirty', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'quizzes',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'question_count', type: 'number' },
        { name: 'time_limit', type: 'number', isOptional: true },
        { name: 'tags', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'questions',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'quiz_id', type: 'string', isIndexed: true },
        { name: 'question_text', type: 'string' },
        { name: 'question_type', type: 'string' },
        { name: 'options', type: 'string' }, // JSON array
        { name: 'correct_answer', type: 'string' },
        { name: 'explanation', type: 'string', isOptional: true },
        { name: 'order_index', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'study_sessions',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'flashcard_set_id', type: 'string', isIndexed: true },
        { name: 'started_at', type: 'number' },
        { name: 'ended_at', type: 'number', isOptional: true },
        { name: 'cards_studied', type: 'number' },
        { name: 'correct_count', type: 'number' },
        { name: 'duration', type: 'number' },
        { name: 'is_synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'pending_uploads',
      columns: [
        { name: 'file_uri', type: 'string' },
        { name: 'file_name', type: 'string' },
        { name: 'file_type', type: 'string' },
        { name: 'file_size', type: 'number' },
        { name: 'status', type: 'string' }, // 'pending', 'uploading', 'failed'
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
```

**Commit 5**: Create WatermelonDB models
- Implement model classes with relationships
- Add computed properties and actions
- Create model decorators for sync

```typescript
// apps/mobile/src/db/models/FlashcardSet.ts
import { Model, Q } from '@nozbe/watermelondb';
import { field, date, children, lazy, action } from '@nozbe/watermelondb/decorators';

export class FlashcardSet extends Model {
  static table = 'flashcard_sets';
  static associations = {
    flashcards: { type: 'has_many' as const, foreignKey: 'flashcard_set_id' },
  };

  @field('server_id') serverId!: string;
  @field('title') title!: string;
  @field('description') description!: string | null;
  @field('tags') tagsJson!: string;
  @field('card_count') cardCount!: number;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt!: Date | null;
  @field('is_dirty') isDirty!: boolean;

  @children('flashcards') flashcards!: any;

  get tags(): string[] {
    try {
      return JSON.parse(this.tagsJson);
    } catch {
      return [];
    }
  }

  @lazy dueCards = this.flashcards.extend(
    Q.where('next_review', Q.lte(Date.now()))
  );

  @action async markDirty() {
    await this.update((set) => {
      set.isDirty = true;
      set.updatedAt = new Date();
    });
  }

  @action async markSynced() {
    await this.update((set) => {
      set.isDirty = false;
      set.syncedAt = new Date();
    });
  }
}

// apps/mobile/src/db/models/Flashcard.ts
export class Flashcard extends Model {
  static table = 'flashcards';
  static associations = {
    flashcard_sets: { type: 'belongs_to' as const, key: 'flashcard_set_id' },
  };

  @field('server_id') serverId!: string;
  @field('flashcard_set_id') flashcardSetId!: string;
  @field('front') front!: string;
  @field('back') back!: string;
  @field('difficulty') difficulty!: 'EASY' | 'MEDIUM' | 'HARD';
  @field('times_reviewed') timesReviewed!: number;
  @field('correct_count') correctCount!: number;
  @date('next_review') nextReview!: Date | null;
  @date('last_reviewed') lastReviewed!: Date | null;
  @field('is_dirty') isDirty!: boolean;

  get accuracy(): number {
    if (this.timesReviewed === 0) return 0;
    return Math.round((this.correctCount / this.timesReviewed) * 100);
  }

  get isDue(): boolean {
    if (!this.nextReview) return true;
    return this.nextReview.getTime() <= Date.now();
  }

  @action async recordReview(correct: boolean) {
    await this.update((card) => {
      card.timesReviewed += 1;
      if (correct) card.correctCount += 1;
      card.lastReviewed = new Date();
      card.nextReview = this.calculateNextReview(correct);
      card.isDirty = true;
    });
  }

  private calculateNextReview(correct: boolean): Date {
    const now = new Date();
    const intervals = {
      EASY: correct ? 7 : 1,
      MEDIUM: correct ? 3 : 0.5,
      HARD: correct ? 1 : 0.25,
    };
    const days = intervals[this.difficulty];
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }
}
```

**Commit 6**: Implement sync service
- Create bidirectional sync with conflict resolution
- Implement background sync with expo-background-fetch
- Add sync status indicators

```typescript
// apps/mobile/src/services/sync.service.ts
import { Database, Q } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { apiClient } from '@studysync/shared';
import { FlashcardSet, Flashcard, StudySession } from '../db/models';

const SYNC_TASK = 'STUDYSYNC_BACKGROUND_SYNC';

export class SyncService {
  private database: Database;
  private isSyncing = false;

  constructor(database: Database) {
    this.database = database;
  }

  async initialize() {
    // Register background task
    TaskManager.defineTask(SYNC_TASK, async () => {
      try {
        await this.sync();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch {
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }

  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, error: 'Sync already in progress' };
    }

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return { success: false, error: 'No internet connection' };
    }

    this.isSyncing = true;

    try {
      // 1. Push local changes
      await this.pushChanges();

      // 2. Pull remote changes
      await this.pullChanges();

      // 3. Sync study sessions
      await this.syncStudySessions();

      return { success: true };
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, error: String(error) };
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushChanges() {
    // Push dirty flashcard sets
    const dirtySets = await this.database
      .get<FlashcardSet>('flashcard_sets')
      .query(Q.where('is_dirty', true))
      .fetch();

    for (const set of dirtySets) {
      try {
        if (set.serverId) {
          // Update existing
          await apiClient.put(`/flashcards/sets/${set.serverId}`, {
            title: set.title,
            description: set.description,
            tags: set.tags,
          });
        }
        await set.markSynced();
      } catch (error) {
        console.error(`Failed to sync set ${set.id}:`, error);
      }
    }

    // Push dirty flashcards
    const dirtyCards = await this.database
      .get<Flashcard>('flashcards')
      .query(Q.where('is_dirty', true))
      .fetch();

    for (const card of dirtyCards) {
      try {
        if (card.serverId) {
          await apiClient.put(`/flashcards/${card.serverId}/review`, {
            timesReviewed: card.timesReviewed,
            correctCount: card.correctCount,
            lastReviewed: card.lastReviewed?.toISOString(),
            nextReview: card.nextReview?.toISOString(),
          });
        }
        await card.update((c) => { c.isDirty = false; });
      } catch (error) {
        console.error(`Failed to sync card ${card.id}:`, error);
      }
    }
  }

  private async pullChanges() {
    const lastSync = await this.getLastSyncTime();

    // Fetch updated flashcard sets
    const response = await apiClient.get('/flashcards/sets', {
      params: { updatedSince: lastSync?.toISOString() },
    });

    await this.database.write(async () => {
      for (const serverSet of response.sets) {
        const existing = await this.database
          .get<FlashcardSet>('flashcard_sets')
          .query(Q.where('server_id', serverSet.id))
          .fetch();

        if (existing.length > 0) {
          const local = existing[0];
          // Server wins if local isn't dirty
          if (!local.isDirty) {
            await local.update((set) => {
              set.title = serverSet.title;
              set.description = serverSet.description;
              set.tagsJson = JSON.stringify(serverSet.tags);
              set.cardCount = serverSet.cardCount;
              set.syncedAt = new Date();
            });
          }
        } else {
          // Create new local record
          await this.database.get<FlashcardSet>('flashcard_sets').create((set) => {
            set.serverId = serverSet.id;
            set.title = serverSet.title;
            set.description = serverSet.description;
            set.tagsJson = JSON.stringify(serverSet.tags);
            set.cardCount = serverSet.cardCount;
            set.createdAt = new Date(serverSet.createdAt);
            set.updatedAt = new Date(serverSet.updatedAt);
            set.syncedAt = new Date();
            set.isDirty = false;
          });
        }
      }
    });

    await this.setLastSyncTime(new Date());
  }

  private async syncStudySessions() {
    // Upload unsynced study sessions
    const unsyncedSessions = await this.database
      .get<StudySession>('study_sessions')
      .query(Q.where('is_synced', false))
      .fetch();

    for (const session of unsyncedSessions) {
      try {
        await apiClient.post('/study-sessions', {
          flashcardSetId: session.flashcardSetId,
          startedAt: new Date(session.startedAt).toISOString(),
          endedAt: session.endedAt ? new Date(session.endedAt).toISOString() : null,
          cardsStudied: session.cardsStudied,
          correctCount: session.correctCount,
          duration: session.duration,
        });
        await session.update((s) => { s.isSynced = true; });
      } catch (error) {
        console.error(`Failed to sync session ${session.id}:`, error);
      }
    }
  }

  private async getLastSyncTime(): Promise<Date | null> {
    // Implementation using AsyncStorage
    return null;
  }

  private async setLastSyncTime(time: Date): Promise<void> {
    // Implementation using AsyncStorage
  }
}

interface SyncResult {
  success: boolean;
  error?: string;
}
```

### Phase 3: Core Features - Flashcards (Commits 7-9)

**Commit 7**: Build flashcard list and set views
- Create flashcard sets list screen
- Implement pull-to-refresh with sync
- Add offline indicator
- Create set detail view

**Commit 8**: Build flashcard study mode
- Create swipeable card interface
- Implement spaced repetition locally
- Add study session tracking
- Create progress indicators

```typescript
// apps/mobile/src/components/FlashcardStudy.tsx
import React, { useState, useRef } from 'react';
import { View, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import { Text, Button, ProgressBar } from 'react-native-paper';
import { Flashcard } from '../db/models';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;

interface Props {
  cards: Flashcard[];
  onComplete: (results: StudyResult[]) => void;
}

export function FlashcardStudy({ cards, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<StudyResult[]>([]);

  const position = useRef(new Animated.ValueXY()).current;
  const flipAnimation = useRef(new Animated.Value(0)).current;

  const currentCard = cards[currentIndex];
  const progress = currentIndex / cards.length;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        // Swipe right = correct
        swipeCard('right', true);
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        // Swipe left = incorrect
        swipeCard('left', false);
      } else {
        // Reset position
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      }
    },
  });

  const swipeCard = async (direction: 'left' | 'right', correct: boolean) => {
    const toValue = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;

    Animated.timing(position, {
      toValue: { x: toValue, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(async () => {
      // Record result
      await currentCard.recordReview(correct);
      setResults([...results, { cardId: currentCard.id, correct }]);

      // Next card
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
        position.setValue({ x: 0, y: 0 });
        flipAnimation.setValue(0);
      } else {
        onComplete([...results, { cardId: currentCard.id, correct }]);
      }
    });
  };

  const flipCard = () => {
    Animated.spring(flipAnimation, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const cardRotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  return (
    <View style={styles.container}>
      <ProgressBar progress={progress} style={styles.progress} />
      <Text style={styles.counter}>
        {currentIndex + 1} / {cards.length}
      </Text>

      <View style={styles.cardContainer}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.card,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate: cardRotate },
              ],
            },
          ]}
        >
          {/* Front of card */}
          <Animated.View
            style={[
              styles.cardFace,
              { transform: [{ rotateY: frontInterpolate }] },
            ]}
          >
            <Text style={styles.cardText}>{currentCard.front}</Text>
          </Animated.View>

          {/* Back of card */}
          <Animated.View
            style={[
              styles.cardFace,
              styles.cardBack,
              { transform: [{ rotateY: backInterpolate }] },
            ]}
          >
            <Text style={styles.cardText}>{currentCard.back}</Text>
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => swipeCard('left', false)}
          icon="close"
        >
          Incorrect
        </Button>
        <Button mode="contained" onPress={flipCard}>
          {isFlipped ? 'Show Question' : 'Show Answer'}
        </Button>
        <Button
          mode="outlined"
          onPress={() => swipeCard('right', true)}
          icon="check"
        >
          Correct
        </Button>
      </View>
    </View>
  );
}

interface StudyResult {
  cardId: string;
  correct: boolean;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  progress: {
    marginBottom: 8,
  },
  counter: {
    textAlign: 'center',
    marginBottom: 16,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: SCREEN_WIDTH - 64,
    height: 400,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  cardBack: {
    backgroundColor: '#f0f0f0',
  },
  cardText: {
    fontSize: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
});
```

**Commit 9**: Add flashcard quick review widget (iOS) and shortcut (Android)
- Create iOS widget extension
- Create Android app shortcut
- Implement deep linking to study mode

### Phase 4: Core Features - Quizzes (Commits 10-11)

**Commit 10**: Build quiz list and detail views
- Create quiz list screen with filters
- Show quiz metadata (time, questions, difficulty)
- Implement quiz download for offline

**Commit 11**: Build mobile-optimized quiz interface
- Create question display with touch-optimized options
- Implement timer with background handling
- Add progress saving for interrupted quizzes
- Show results with detailed breakdown

### Phase 5: Camera & File Upload (Commits 12-14)

**Commit 12**: Implement camera capture for notes
- Create camera screen with document detection
- Add image cropping and enhancement
- Implement multi-page capture mode

```typescript
// apps/mobile/src/screens/CaptureScreen.tsx
import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Text, IconButton, FAB } from 'react-native-paper';

export function CaptureScreen() {
  const cameraRef = useRef<Camera>(null);
  const [captures, setCaptures] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const takePicture = async () => {
    if (!cameraRef.current || isProcessing) return;

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      // Enhance image for OCR
      const enhanced = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          { resize: { width: 2000 } }, // Resize for better OCR
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      setCaptures([...captures, enhanced.uri]);
    } finally {
      setIsProcessing(false);
    }
  };

  const processAndUpload = async () => {
    // Queue for upload (will sync when online)
    for (const uri of captures) {
      await queueUpload(uri);
    }
    // Navigate to processing status
  };

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={CameraType.back}
        ratio="4:3"
      >
        <View style={styles.overlay}>
          {/* Document detection overlay */}
          <View style={styles.documentFrame} />
        </View>
      </Camera>

      <View style={styles.controls}>
        <Text style={styles.captureCount}>
          {captures.length} page{captures.length !== 1 ? 's' : ''} captured
        </Text>

        <View style={styles.buttons}>
          <IconButton
            icon="image-multiple"
            size={32}
            onPress={() => {/* Show captures */}}
          />
          <FAB
            icon="camera"
            onPress={takePicture}
            loading={isProcessing}
            style={styles.captureButton}
          />
          <IconButton
            icon="check"
            size={32}
            onPress={processAndUpload}
            disabled={captures.length === 0}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentFrame: {
    width: '80%',
    height: '70%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 8,
  },
  controls: {
    backgroundColor: '#000',
    padding: 16,
  },
  captureCount: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: '#fff',
  },
});
```

**Commit 13**: Implement OCR processing
- Integrate Google Cloud Vision API
- Create text extraction pipeline
- Add confidence scoring and manual correction UI

**Commit 14**: Build file upload with offline queue
- Create upload queue system
- Implement background upload when online
- Add upload progress and retry UI
- Support photos, documents, and audio

### Phase 6: Audio Recording (Commits 15-16)

**Commit 15**: Implement lecture audio recording
- Create audio recording screen with waveform
- Implement background recording
- Add pause/resume functionality
- Create recording list management

```typescript
// apps/mobile/src/services/audioRecording.service.ts
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { database } from '../db';

export class AudioRecordingService {
  private recording: Audio.Recording | null = null;
  private isRecording = false;
  private isPaused = false;
  private startTime: number = 0;
  private pausedDuration: number = 0;

  async startRecording(): Promise<void> {
    // Request permissions
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) throw new Error('Microphone permission not granted');

    // Configure audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });

    // Create and start recording
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    this.recording = recording;
    this.isRecording = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.pausedDuration = 0;
  }

  async pauseRecording(): Promise<void> {
    if (!this.recording || !this.isRecording || this.isPaused) return;

    await this.recording.pauseAsync();
    this.isPaused = true;
  }

  async resumeRecording(): Promise<void> {
    if (!this.recording || !this.isRecording || !this.isPaused) return;

    await this.recording.startAsync();
    this.isPaused = false;
  }

  async stopRecording(): Promise<RecordingResult> {
    if (!this.recording) throw new Error('No active recording');

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    const duration = Date.now() - this.startTime - this.pausedDuration;

    if (!uri) throw new Error('Recording URI not available');

    // Get file info
    const info = await FileSystem.getInfoAsync(uri);

    // Save to local recordings
    const fileName = `lecture_${Date.now()}.m4a`;
    const newUri = `${FileSystem.documentDirectory}recordings/${fileName}`;

    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}recordings/`,
      { intermediates: true }
    );
    await FileSystem.moveAsync({ from: uri, to: newUri });

    // Queue for upload
    await this.queueForUpload(newUri, fileName, info.size || 0, duration);

    this.recording = null;
    this.isRecording = false;

    return {
      uri: newUri,
      duration,
      size: info.size || 0,
    };
  }

  async getStatus(): Promise<Audio.RecordingStatus | null> {
    if (!this.recording) return null;
    return this.recording.getStatusAsync();
  }

  private async queueForUpload(
    uri: string,
    fileName: string,
    size: number,
    duration: number
  ): Promise<void> {
    await database.write(async () => {
      await database.get('pending_uploads').create((upload: any) => {
        upload.fileUri = uri;
        upload.fileName = fileName;
        upload.fileType = 'audio/m4a';
        upload.fileSize = size;
        upload.status = 'pending';
        upload.retryCount = 0;
        upload.createdAt = new Date();
        upload._raw.duration = duration;
      });
    });
  }
}

interface RecordingResult {
  uri: string;
  duration: number;
  size: number;
}

export const audioRecordingService = new AudioRecordingService();
```

**Commit 16**: Add audio playback and transcription status
- Create audio player component
- Show transcription processing status
- Display generated flashcards/notes from audio

### Phase 7: Push Notifications (Commits 17-18)

**Commit 17**: Set up push notification infrastructure
- Configure Expo Notifications
- Create backend endpoint for device token registration
- Implement notification permission flow

```typescript
// apps/mobile/src/services/notifications.service.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from '@studysync/shared';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  async initialize(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Get push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-expo-project-id',
    });

    // Configure for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });

      await Notifications.setNotificationChannelAsync('study-reminders', {
        name: 'Study Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    // Register token with backend
    await this.registerToken(token.data);

    return token.data;
  }

  async registerToken(token: string): Promise<void> {
    await apiClient.post('/devices/register', {
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName,
    });
  }

  async scheduleStudyReminder(
    hour: number,
    minute: number,
    days: number[]
  ): Promise<string> {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to Study!',
        body: 'You have flashcards due for review',
        sound: true,
        data: { type: 'study_reminder' },
      },
      trigger: {
        hour,
        minute,
        repeats: true,
        weekday: days[0], // Schedule for each day
      },
    });

    return identifier;
  }

  async cancelAllReminders(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  addNotificationListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export const notificationService = new NotificationService();
```

**Commit 18**: Implement study reminder notifications
- Create reminder settings UI
- Implement smart reminders based on due cards
- Add streak protection notifications
- Create notification deep linking

### Phase 8: Backend API Updates (Commits 19-20)

**Commit 19**: Add mobile-specific API endpoints
- Create device registration endpoint
- Add batch sync endpoints for efficiency
- Implement push notification trigger endpoints

```typescript
// apps/api/src/routes/device.routes.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { deviceController } from '../controllers/device.controller';

const router = Router();

// Device registration
router.post('/register', authenticateToken, deviceController.registerDevice);
router.delete('/unregister', authenticateToken, deviceController.unregisterDevice);

// Sync endpoints
router.get('/sync/status', authenticateToken, deviceController.getSyncStatus);
router.post('/sync/flashcards', authenticateToken, deviceController.syncFlashcards);
router.post('/sync/study-sessions', authenticateToken, deviceController.syncStudySessions);

// Notification preferences
router.get('/notifications/preferences', authenticateToken, deviceController.getNotificationPreferences);
router.put('/notifications/preferences', authenticateToken, deviceController.updateNotificationPreferences);

export default router;

// apps/api/src/controllers/device.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { pushNotificationService } from '../services/pushNotification.service';

const prisma = new PrismaClient();

export const deviceController = {
  async registerDevice(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { token, platform, deviceName } = req.body;

      await prisma.device.upsert({
        where: {
          userId_token: { userId, token },
        },
        create: {
          userId,
          token,
          platform,
          deviceName,
          isActive: true,
        },
        update: {
          isActive: true,
          deviceName,
          updatedAt: new Date(),
        },
      });

      res.json({ message: 'Device registered successfully' });
    } catch (error) {
      next(error);
    }
  },

  async syncFlashcards(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { lastSyncAt, localChanges } = req.body;

      // Apply local changes
      if (localChanges?.length > 0) {
        for (const change of localChanges) {
          await prisma.flashcard.update({
            where: { id: change.id },
            data: {
              timesReviewed: change.timesReviewed,
              correctCount: change.correctCount,
              lastReviewed: change.lastReviewed,
              nextReview: change.nextReview,
            },
          });
        }
      }

      // Get server changes since last sync
      const serverChanges = await prisma.flashcardSet.findMany({
        where: {
          userId,
          updatedAt: lastSyncAt ? { gt: new Date(lastSyncAt) } : undefined,
        },
        include: {
          flashcards: true,
        },
      });

      res.json({
        sets: serverChanges,
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },

  // ... more controller methods
};
```

**Commit 20**: Add Prisma models for mobile features
- Create Device model for push tokens
- Create NotificationPreference model
- Add sync tracking fields

```prisma
// Add to packages/database/prisma/schema.prisma

model Device {
  id                String    @id @default(cuid())
  userId            String
  token             String                    // Push notification token
  platform          Platform
  deviceName        String?
  isActive          Boolean   @default(true)
  lastActiveAt      DateTime  @default(now())
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, token])
  @@index([userId])
  @@index([token])
}

model NotificationPreference {
  id                String    @id @default(cuid())
  userId            String    @unique
  studyReminders    Boolean   @default(true)
  reminderTime      String    @default("09:00")   // HH:mm format
  reminderDays      Int[]     @default([1,2,3,4,5]) // 1=Mon, 7=Sun
  streakAlerts      Boolean   @default(true)
  dueCardAlerts     Boolean   @default(true)
  quizReminders     Boolean   @default(false)
  marketingEmails   Boolean   @default(false)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum Platform {
  IOS
  ANDROID
  WEB
}

// Update User model
model User {
  // ... existing fields
  devices               Device[]
  notificationPreference NotificationPreference?
}
```

### Phase 9: UI Polish & Dark Mode (Commits 21-22)

**Commit 21**: Implement design system and theming
- Create consistent design tokens
- Implement light/dark mode switching
- Create reusable component library
- Add haptic feedback

```typescript
// apps/mobile/src/theme/index.ts
import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  fontFamily: 'Inter',
};

export const lightTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6366f1',         // Indigo
    primaryContainer: '#e0e7ff',
    secondary: '#8b5cf6',       // Violet
    secondaryContainer: '#ede9fe',
    tertiary: '#06b6d4',        // Cyan
    tertiaryContainer: '#cffafe',
    surface: '#ffffff',
    surfaceVariant: '#f4f4f5',
    background: '#fafafa',
    error: '#ef4444',
    errorContainer: '#fee2e2',
    success: '#22c55e',
    warning: '#f59e0b',
  },
  custom: {
    cardElevation: 2,
    borderRadius: 12,
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818cf8',
    primaryContainer: '#3730a3',
    secondary: '#a78bfa',
    secondaryContainer: '#5b21b6',
    tertiary: '#22d3ee',
    tertiaryContainer: '#0e7490',
    surface: '#18181b',
    surfaceVariant: '#27272a',
    background: '#09090b',
    error: '#f87171',
    errorContainer: '#7f1d1d',
    success: '#4ade80',
    warning: '#fbbf24',
  },
  custom: {
    cardElevation: 4,
    borderRadius: 12,
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
  },
};

// apps/mobile/src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: typeof lightTheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem('theme_mode').then((stored) => {
      if (stored) setModeState(stored as ThemeMode);
    });
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem('theme_mode', newMode);
  };

  const isDark = mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark');
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
```

**Commit 22**: Create navigation and main screens
- Implement bottom tab navigation
- Create dashboard/home screen
- Build settings screen with preferences
- Add profile and subscription management

### Phase 10: App Store Preparation (Commits 23-25)

**Commit 23**: Configure EAS Build for iOS and Android
- Set up EAS Build configuration
- Configure code signing for iOS
- Set up Android keystore
- Create build profiles (development, preview, production)

```json
// apps/mobile/eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m1-medium"
      },
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

**Commit 24**: Create app store assets and metadata
- Design app icons (all sizes)
- Create screenshots for all device sizes
- Write app store descriptions
- Set up privacy policy and terms

**Commit 25**: Implement analytics and crash reporting
- Integrate Sentry for crash reporting
- Add analytics events for key actions
- Create performance monitoring
- Set up user feedback mechanism

```typescript
// apps/mobile/src/services/analytics.service.ts
import * as Sentry from '@sentry/react-native';
import * as Analytics from 'expo-analytics';

export const analyticsService = {
  initialize() {
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      enableAutoSessionTracking: true,
      tracesSampleRate: 0.2,
    });
  },

  setUser(userId: string, email: string) {
    Sentry.setUser({ id: userId, email });
  },

  trackEvent(event: string, properties?: Record<string, unknown>) {
    // Track to analytics
    console.log('Analytics event:', event, properties);
  },

  trackScreen(screenName: string) {
    this.trackEvent('screen_view', { screen_name: screenName });
  },

  trackError(error: Error, context?: Record<string, unknown>) {
    Sentry.captureException(error, { extra: context });
  },

  // Key events to track
  events: {
    FLASHCARD_STUDY_STARTED: 'flashcard_study_started',
    FLASHCARD_STUDY_COMPLETED: 'flashcard_study_completed',
    QUIZ_STARTED: 'quiz_started',
    QUIZ_COMPLETED: 'quiz_completed',
    PHOTO_CAPTURED: 'photo_captured',
    AUDIO_RECORDED: 'audio_recorded',
    OFFLINE_MODE_ENTERED: 'offline_mode_entered',
    SYNC_COMPLETED: 'sync_completed',
    PUSH_NOTIFICATION_TAPPED: 'push_notification_tapped',
  },
};
```

## API Endpoints for Mobile

### New Backend Endpoints

```
# Device Management
POST   /api/devices/register              - Register device for push notifications
DELETE /api/devices/unregister            - Unregister device
GET    /api/devices/notifications/prefs   - Get notification preferences
PUT    /api/devices/notifications/prefs   - Update notification preferences

# Sync Endpoints
GET    /api/sync/status                   - Get sync status and pending changes
POST   /api/sync/flashcards               - Batch sync flashcards
POST   /api/sync/study-sessions           - Batch sync study sessions
POST   /api/sync/quiz-attempts            - Batch sync quiz attempts

# Mobile-Optimized Endpoints
GET    /api/mobile/dashboard              - Aggregated dashboard data
GET    /api/mobile/due-cards              - Cards due for review (paginated)
GET    /api/mobile/recent-activity        - Recent activity feed
```

### Existing Endpoints (Mobile-Compatible)

All existing API endpoints work with mobile:
- Authentication: `/api/auth/*`
- Flashcards: `/api/flashcards/*`
- Quizzes: `/api/quizzes/*`
- Uploads: `/api/uploads/*`
- Subscriptions: `/api/subscriptions/*`
- Analytics: `/api/analytics/*` (SSC-17)
- Predictions: `/api/predictions/*` (SSC-14)
- Assignments: `/api/assignments/*` (SSC-13)

## Database Schema Changes

### New Models

```prisma
model Device {
  id                String    @id @default(cuid())
  userId            String
  token             String
  platform          Platform
  deviceName        String?
  appVersion        String?
  osVersion         String?
  isActive          Boolean   @default(true)
  lastActiveAt      DateTime  @default(now())
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, token])
  @@index([userId])
  @@index([token])
}

model NotificationPreference {
  id                String    @id @default(cuid())
  userId            String    @unique
  studyReminders    Boolean   @default(true)
  reminderTime      String    @default("09:00")
  reminderDays      Int[]     @default([1,2,3,4,5])
  streakAlerts      Boolean   @default(true)
  dueCardAlerts     Boolean   @default(true)
  quizReminders     Boolean   @default(false)
  weeklyDigest      Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model SyncLog {
  id                String    @id @default(cuid())
  userId            String
  deviceId          String
  syncType          SyncType
  itemCount         Int
  status            SyncStatus
  errorMessage      String?
  startedAt         DateTime  @default(now())
  completedAt       DateTime?

  @@index([userId])
  @@index([deviceId])
}

enum Platform {
  IOS
  ANDROID
  WEB
}

enum SyncType {
  FLASHCARDS
  QUIZZES
  STUDY_SESSIONS
  UPLOADS
  FULL
}

enum SyncStatus {
  IN_PROGRESS
  COMPLETED
  FAILED
}
```

## Component Structure

```
apps/mobile/src/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab navigator
│   │   ├── index.tsx            # Dashboard/Home
│   │   ├── flashcards.tsx       # Flashcard sets list
│   │   ├── quizzes.tsx          # Quiz list
│   │   ├── capture.tsx          # Camera/upload
│   │   └── profile.tsx          # Profile & settings
│   ├── (auth)/                   # Auth screens
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── flashcard/
│   │   ├── [setId]/
│   │   │   ├── index.tsx        # Set detail
│   │   │   └── study.tsx        # Study mode
│   │   └── create.tsx           # Create set
│   ├── quiz/
│   │   ├── [quizId]/
│   │   │   ├── index.tsx        # Quiz detail
│   │   │   └── attempt.tsx      # Take quiz
│   │   └── results/[attemptId].tsx
│   ├── recording/
│   │   ├── index.tsx            # Recording screen
│   │   └── [id].tsx             # Recording detail
│   └── settings/
│       ├── index.tsx            # Settings main
│       ├── notifications.tsx    # Notification prefs
│       ├── offline.tsx          # Offline settings
│       └── subscription.tsx     # Subscription management
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── LoadingState.tsx
│   │   ├── EmptyState.tsx
│   │   ├── OfflineIndicator.tsx
│   │   └── SyncStatus.tsx
│   ├── flashcard/
│   │   ├── FlashcardSetCard.tsx
│   │   ├── FlashcardStudy.tsx
│   │   ├── StudyProgress.tsx
│   │   └── DueCardsWidget.tsx
│   ├── quiz/
│   │   ├── QuizCard.tsx
│   │   ├── QuestionView.tsx
│   │   ├── QuizTimer.tsx
│   │   └── ResultsSummary.tsx
│   ├── capture/
│   │   ├── CameraView.tsx
│   │   ├── DocumentScanner.tsx
│   │   ├── AudioRecorder.tsx
│   │   └── UploadQueue.tsx
│   └── dashboard/
│       ├── StatsOverview.tsx
│       ├── RecentActivity.tsx
│       ├── StreakDisplay.tsx
│       └── QuickActions.tsx
├── services/
│   ├── api.service.ts
│   ├── auth.service.ts
│   ├── sync.service.ts
│   ├── notifications.service.ts
│   ├── audioRecording.service.ts
│   ├── ocr.service.ts
│   └── analytics.service.ts
├── stores/
│   ├── authStore.ts
│   ├── flashcardStore.ts
│   ├── quizStore.ts
│   ├── syncStore.ts
│   └── settingsStore.ts
├── db/
│   ├── index.ts
│   ├── schema.ts
│   └── models/
│       ├── FlashcardSet.ts
│       ├── Flashcard.ts
│       ├── Quiz.ts
│       ├── Question.ts
│       ├── StudySession.ts
│       └── PendingUpload.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useFlashcards.ts
│   ├── useQuizzes.ts
│   ├── useSync.ts
│   ├── useOffline.ts
│   └── useNotifications.ts
├── theme/
│   └── index.ts
├── utils/
│   ├── date.ts
│   ├── format.ts
│   └── storage.ts
└── contexts/
    ├── AuthContext.tsx
    ├── ThemeContext.tsx
    └── SyncContext.tsx
```

## Feature Requirements Checklist

### Core Mobile Features
- [ ] User authentication with secure token storage
- [ ] Biometric login (Face ID / Touch ID / Fingerprint)
- [ ] Dashboard with study overview
- [ ] Flashcard set browsing and management
- [ ] Flashcard study mode with swipe gestures
- [ ] Quiz browsing and taking
- [ ] Profile and settings management

### Offline Functionality
- [ ] Local database with WatermelonDB
- [ ] Offline flashcard review
- [ ] Offline quiz taking
- [ ] Pending changes queue
- [ ] Automatic sync when online
- [ ] Conflict resolution
- [ ] Offline indicator UI

### Camera & Upload
- [ ] Camera capture for notes
- [ ] Document detection and cropping
- [ ] Multi-page capture mode
- [ ] OCR text extraction
- [ ] Photo upload to server
- [ ] Upload queue with retry

### Audio Recording
- [ ] Lecture audio recording
- [ ] Background recording support
- [ ] Pause/resume functionality
- [ ] Recording list management
- [ ] Audio upload for transcription
- [ ] Playback interface

### Push Notifications
- [ ] Device registration
- [ ] Study reminder notifications
- [ ] Due cards alerts
- [ ] Streak protection alerts
- [ ] Notification preferences UI
- [ ] Deep linking from notifications

### Sync System
- [ ] Background sync
- [ ] Manual sync trigger
- [ ] Sync status indicators
- [ ] Sync error handling
- [ ] Partial sync support

### UI/UX
- [ ] Dark mode support
- [ ] Consistent design system
- [ ] Haptic feedback
- [ ] Loading and empty states
- [ ] Error handling and display
- [ ] Pull-to-refresh
- [ ] Smooth animations

### Platform Specific
- [ ] iOS widget for due cards
- [ ] Android app shortcuts
- [ ] iOS App Clips (future)
- [ ] Android Instant Apps (future)

### App Store
- [ ] App icons (all sizes)
- [ ] Screenshots (all devices)
- [ ] App store descriptions
- [ ] Privacy policy
- [ ] Terms of service
- [ ] App store optimization

## Success Criteria

- [ ] All 25 commits completed and passing CI
- [ ] App launches in <3 seconds
- [ ] Offline mode works seamlessly
- [ ] Sync completes without data loss
- [ ] Push notifications delivered reliably
- [ ] Camera capture produces clear images
- [ ] Audio recording captures lectures clearly
- [ ] App store rating >4.5 stars (post-launch)
- [ ] 70%+ of users use mobile app (post-launch)
- [ ] Crash-free rate >99%
- [ ] iOS and Android feature parity

## Integration with Existing Features

### Web App Integration
- Shared API client from `@studysync/shared`
- Consistent user experience across platforms
- Real-time sync between web and mobile

### Subscription Integration (SSC-16)
- Premium features gated on mobile
- Subscription management in app
- App Store / Google Play subscriptions (future)

### Analytics Integration (SSC-17)
- Study sessions tracked and synced
- Mobile-specific analytics events
- Progress visible on both platforms

### Exam Prediction Integration (SSC-14)
- View predictions on mobile
- Study recommended topics offline
- Receive prediction updates via push

### Assignment Help Integration (SSC-13)
- View brainstorms and outlines on mobile
- Quick reference while writing
- Export outlines from mobile

## Dependencies

This feature depends on:
- Authentication System (SSC-10) ✅ Complete
- Content Upload System (SSC-6) ✅ Complete
- AI Flashcard Generation (SSC-7) ✅ Complete
- Interactive Quiz System (SSC-8) ✅ Complete
- Payment System (SSC-16) ✅ Complete

## Testing Strategy

### Unit Tests
- Service functions (auth, sync, notifications)
- Database model operations
- Utility functions

### Integration Tests
- API communication
- Offline/online transitions
- Sync operations

### E2E Tests (Detox)
- Authentication flow
- Flashcard study session
- Quiz completion
- Camera capture and upload
- Audio recording

### Manual Testing
- iOS and Android devices
- Various screen sizes
- Offline scenarios
- Low connectivity conditions

## Future Enhancements

1. **Apple Watch / Wear OS**: Quick flashcard review on smartwatches
2. **Widgets**: iOS 14+ widgets, Android widgets for due cards
3. **App Clips / Instant Apps**: Try before install
4. **CarPlay / Android Auto**: Audio flashcard review while driving
5. **Siri / Google Assistant**: Voice commands for study
6. **AR Features**: AR-enhanced flashcard study
7. **Tablet Optimization**: iPad/tablet-specific layouts
8. **Subscription via App Stores**: In-app purchases

## Notes

- React Native with Expo chosen for development speed and code sharing
- Offline-first architecture is critical for student use cases
- Push notifications are key to engagement and retention
- App store approval process takes 1-2 weeks for iOS, 2-3 days for Android
- Consider TestFlight/Internal testing before public release
- Monitor Sentry closely for crashes post-launch
- Plan for gradual rollout to catch issues early
