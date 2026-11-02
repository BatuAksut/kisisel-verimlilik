import type { Intensity } from '../domain/feedback';
import type { Area, Difficulty, QuestBlueprint } from '../domain/types';

export const MAIN_COUNT: Record<Difficulty, number> = { kolay: 3, normal: 4, hard: 5 };
export const SIDE_COUNT: Record<Difficulty, number> = { kolay: 1, normal: 2, hard: 2 };
export const SPARE_SIDE_COUNT = 3;

export interface PlannedDay {
  day: number;
  main: QuestBlueprint[];
  side: QuestBlueprint[];
}

export interface PlannedWeek {
  theme: string;
  days: PlannedDay[];
  boss: QuestBlueprint;
  spareSide: QuestBlueprint[];
}

/** Hem yapay zekâ hem havuz üretiminin kullandığı haftalık girdi. */
export interface PlanInput {
  weekNumber: number;
  days: number[];
  difficulty: Difficulty;
  focusAreas: Area[];
  freeMinutes: number;
  intensity: Intensity;
  /** Havuz görevi kimlikleri ve şimdiye kadar kaç kez kullanıldıkları. */
  usage: Map<string, number>;
  seed: number;
}
