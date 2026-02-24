/**
 * Represents the core user entity in the application.
 * Corresponds to lib/domain/models/user_model.dart
 */
export interface UserModel {
  uid: string;
  name: string;
  avatarUrl: string | null;
  grade: number | null; // e.g., 12 for Senior, 13 for Mezun
  targetExams: string[]; // e.g., ['TYT', 'AYT', 'YDT']
  targetUni?: string; // Target University
  targetDept?: string; // Target Department
  isTargetUndecided?: boolean; // If user hasn't decided on a university yet
  monthlyTargetHours: number; // Legacy?
  
  // New Target Config
  targetPeriod?: 'weekly' | 'monthly';
  targetType?: 'time' | 'question'; // 'time' or 'question'
  targetGoal?: number; // The numeric value of the target
  targetHours?: number; // Legacy, kept for backward compat

  // Limits
  nameChangesRemaining?: number; // Defaults to 3
  
  // Profile Showcase
  showcaseBadgeIds?: string[]; // IDs of badges selected for profile
}

/**
 * Helper to ensure type safety when creating a new user
 */
export const DEFAULT_USER_MODEL: Partial<UserModel> = {
  monthlyTargetHours: 40,
  targetExams: [],
  grade: 12,
  avatarUrl: null,
  targetPeriod: 'weekly',
  targetType: 'time',
  targetGoal: 15,
  targetHours: 15,
  isTargetUndecided: false,
  nameChangesRemaining: 3,
  showcaseBadgeIds: [],
};

// Simulation of Firestore Document Data
export type FirestoreData = Record<string, any>;

export type SessionType = 'question' | 'lecture';

// Session Types
export interface SessionConfig {
  sessionType: SessionType;
  durationMinutes: number;
  subject: string;
  topic: string;
  activeTopics?: string[]; // Track multiple topics selected during session
  subTopic?: string;
  isMockTest: boolean;
  breakReminderInterval?: number;
  mood: string;
  location: string;
  bookId?: number; // Added book selection
  lectureSource?: string; // Added for Lecture sessions
  publisher?: string; // Added for Mock Tests
  examType?: 'TYT' | 'AYT' | 'YDT'; // Added for Mock Tests
  allowBreaks?: boolean; // Added for Mock Tests
  isFreeMode?: boolean; // Added for Free vs Countdown mode
}

export interface TopicStat {
  topic: string;
  questions: number;
  correct: number;
  wrong: number;
  empty: number;
  durationSeconds?: number; // Added for tracking time per topic
}

export interface SessionResult {
  durationSeconds: number;
  config: SessionConfig;
  questions: number;
  correct: number;
  wrong: number;
  empty: number;
  net: number;
  accuracy: number;
  customDate?: string; // For Dev Mode testing to simulate past/future dates
  notes?: string[]; // Added notes field
  topicStats?: TopicStat[]; // Breakdown per topic
  topicDurations?: Record<string, number>; // Raw duration per topic name
  isPendingResult?: boolean; // Flag for "Henüz açıklanmadı" mode
  pauseCount?: number; // NEW: Number of times session was paused
  pauseDurationSeconds?: number; // NEW: Total duration spent in pause
  understandingScore?: number; // 1-5 (For Lecture mode)
  focusScore?: number; // 1-5 (For Lecture mode)
  isFinished?: boolean; // For Lecture mode completion status
}

export interface SessionPreset {
  id: string;
  name: string;
  config: Partial<SessionConfig>;
}

// Planned Session for Future
export interface PlannedSession {
  id: string;
  date: string; // ISO Date YYYY-MM-DD
  time: string; // HH:MM
  subject: string;
  topic: string;
  durationMinutes: number;
}

// Library Types
export interface BookTopic {
  label: string;
  progress: number;
  solvedCount?: number; // Track actual questions solved for this topic via App
  externalSolvedCount?: number; // Track questions solved manually/historically (not included in app analytics)
  totalQuestions?: number; // Specific total for this topic (overrides defaults)
  correct?: number;   // Aggregated correct count
  wrong?: number;     // Aggregated wrong count
  empty?: number;     // Aggregated empty count
  isFinished?: boolean; // Manual override status
  isDeleted?: boolean; // If true, topic is hidden from the book details
}

export interface Book {
  id: number;
  title: string;
  category: string;
  progress: number;
  color: string;
  year?: number; // Added year
  isFavorite?: boolean; // Added favorite status
  examTypes?: string[]; // Added exam types
  // Details
  totalQuestions?: number;
  solvedQuestions?: number;
  lastSolvedDate?: string; // e.g. "29.08.2025 Fri"
  lastSolvedAt?: string; // ISO Timestamp for precise sorting
  timeSpent?: string; // e.g. "7 h 04 m"
  qpm?: number;
  accuracy?: number;
  rating?: number; // 0-5
  topics?: BookTopic[];
}