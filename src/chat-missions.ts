import type { Locale } from "./shared";
import { missions } from "./copy";
export const missionIds = ["water", "music", "window", "tidy", "walk"] as const;
export type MissionId = (typeof missionIds)[number];
export type MissionState = {
  id: MissionId;
  status: "suggested" | "active" | "completed" | "deferred";
};
export function isMissionId(value: unknown): value is MissionId {
  return missionIds.includes(value as MissionId);
}
export function missionContent(id: MissionId, locale: Locale) {
  return missions[locale][missionIds.indexOf(id)];
}
export function validMission(value: unknown): value is MissionState {
  if (!value || typeof value !== "object") return false;
  const m = value as MissionState;
  return (
    isMissionId(m.id) &&
    ["suggested", "active", "completed", "deferred"].includes(m.status)
  );
}
export function demoMission(text: string, turn: number): MissionId | undefined {
  if (
    /死にたい|自殺|消えたい|죽고|자살|사라지고|kill myself|suicid/i.test(text)
  )
    return;
  if (/疲|つら|しんど|지친|지쳤|피곤|힘들|tired/i.test(text)) return "water";
  if (/片付|정리|책상/.test(text)) return "tidy";
  if (/音楽|음악/.test(text)) return "music";
  if (/散歩|산책/.test(text)) return "walk";
  if (/始|시작|미션|一歩/.test(text) || turn % 3 === 1) return "window";
}
