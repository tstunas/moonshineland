import type { AutoPost } from "@/types/autoPost";
import type { AutoPostSchedule } from "@/types/autoPostSchedule";

export interface AutoPostImagePayload {
  id: number;
  imageUrl: string;
  sortOrder: number;
}

export const AUTO_POST_INTERVAL_OPTIONS = [30, 60, 90, 120, 150, 180] as const;
export type AutoPostIntervalSeconds = (typeof AUTO_POST_INTERVAL_OPTIONS)[number];

export interface AutoPostPayload extends AutoPost {
  autoPostImages: AutoPostImagePayload[];
}

export type AutoPostSchedulePayload = AutoPostSchedule;

export interface AutoPostActionResult {
  success: boolean;
  message: string;
  autoPosts?: AutoPostPayload[];
  schedule?: AutoPostSchedulePayload | null;
}
