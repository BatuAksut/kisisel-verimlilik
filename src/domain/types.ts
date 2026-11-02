export const AREAS = ['uyku', 'su', 'hareket', 'zihin', 'ekran', 'beslenme', 'sosyal', 'ogrenme'] as const;
export type Area = (typeof AREAS)[number];

export const AREA_LABELS: Record<Area, string> = {
  uyku: 'Uyku',
  su: 'Su',
  hareket: 'Hareket',
  zihin: 'Zihin',
  ekran: 'Ekran',
  beslenme: 'Beslenme',
  sosyal: 'Sosyal',
  ogrenme: 'Öğrenme',
};

export const STAT_KEYS = ['guc', 'zihin', 'disiplin', 'saglik', 'sosyal'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Partial<Record<StatKey, number>>;

export const STAT_LABELS: Record<StatKey, string> = {
  guc: 'Güç',
  zihin: 'Zihin',
  disiplin: 'Disiplin',
  saglik: 'Sağlık',
  sosyal: 'Sosyal',
};

export type Difficulty = 'kolay' | 'normal' | 'hard';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  kolay: 'Kolay',
  normal: 'Normal',
  hard: 'Hard Mode',
};

export type QuestType = 'main' | 'side' | 'boss';
export type QuestStatus = 'pending' | 'done' | 'missed';
export type QuestSource = 'ai' | 'pool';

export interface QuestBlueprint {
  id: string;
  title: string;
  description: string;
  area: Area;
  stats: Stats;
  xp: number;
  estimatedMinutes: number;
  type: QuestType;
}

export interface Quest extends QuestBlueprint {
  dayNumber: number;
  weekNumber: number;
  status: QuestStatus;
  source: QuestSource;
  order: number;
  completedAt?: number;
}

export interface SpareQuest extends QuestBlueprint {
  weekNumber: number;
  source: QuestSource;
  used: boolean;
}

export interface DayRecord {
  dayNumber: number;
  date: string;
  difficulty: Difficulty;
  rerollUsed: boolean;
}

export interface WeekRecord {
  weekNumber: number;
  theme: string;
  source: QuestSource;
  generatedAt: number;
  lastAiAttemptAt?: number;
  lastError?: string;
}

export interface Reflection {
  dayNumber: number;
  mood: number;
  note: string;
  createdAt: number;
}

export interface OnboardingAnswers {
  goals: string[];
  wakeTime: string;
  sleepTime: string;
  freeMinutes: number;
  habits: Record<Area, string>;
  focusAreas: Area[];
  interests: string;
}

export interface Profile {
  id: 'me';
  answers: OnboardingAnswers;
  difficulty: Difficulty;
  startDate: string;
  createdAt: number;
}

export interface AppSettings {
  id: 'app';
  apiKey: string;
  baseUrl: string;
  model: string;
  proxyUrl: string;
  lastReminderAt?: number;
  notificationPromptDismissed?: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  proxyUrl: '',
};
