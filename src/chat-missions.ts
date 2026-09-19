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
export function isCrisisText(text: string): boolean {
  return /死にたい|自殺|消えたい|죽고|자살|사라지고|kill myself|suicid/i.test(text);
}
export function demoMission(text: string, turn: number): MissionId | undefined {
  if (isCrisisText(text)) return;
  if (/疲|つら|しんど|지친|지쳤|피곤|힘들|tired/i.test(text)) return "water";
  if (/片付|정리|책상/.test(text)) return "tidy";
  if (/音楽|음악/.test(text)) return "music";
  if (/散歩|산책/.test(text)) return "walk";
  if (/始|시작|미션|一歩/.test(text) || turn % 3 === 1) return "window";
}

// Evaluate the full local conversation, before trimming the provider context.
// Retries reuse the same history, so they never advance the cooldown.
export function canSuggestMission(messages: readonly {
  role: string; content: string; mission?: MissionState;
}[]): boolean {
  const latest = messages.at(-1);
  if (!latest || latest.role !== "user") return false;
  if (isCrisisText(latest.content)) return false;
  if (/싫|말고|말아|그만|안 할|안할|필요 없|필요없|나중|하지 마|하지마|やめ|いらない|不要|したくない|後で|あとで|ではなく|じゃなく/.test(latest.content)) return false;
  if (messages.some(m => m.mission?.status === "active")) return false;
  const explicit = /(?:미션|한\s*걸음).*(?:추천|제안|알려|줄래|주세요|하고 싶)|(?:추천|제안).*(?:미션|한\s*걸음)|(?:ミッション|一歩).*(?:提案|教えて|おすすめ|ください)|(?:提案|おすすめ).*(?:ミッション|一歩)/.test(latest.content);
  if (explicit) return true;
  let last = -1;
  messages.forEach((m, index) => { if (m.mission) last = index; });
  const turns = messages.slice(last + 1).filter(m => m.role === "user").length;
  const gap = last < 0 ? 4 : messages[last].mission?.status === "deferred" ? 8 : 5;
  return turns >= gap;
}
