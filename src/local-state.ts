import type { ChatMessage, Locale, Region } from './shared';
import { MAX_MESSAGE_LENGTH, MAX_MESSAGES } from './shared';

export const STORAGE = { preferences: 'ippo.preferences.v1', history: 'ippo.history.v1', step: 'ippo.step.v1' };
export type Preferences = { locale: Locale; region: Region; saveHistory: boolean };
export type StepState = { date: string; energy: number; mission: number; status: 'suggested' | 'active' | 'completed' | 'deferred' };
export type DisplayMessage = ChatMessage & { id: string; mode?: 'demo' | 'live' };

export function readJSON(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}

export function loadPreferences(): Preferences {
  const raw = readJSON(STORAGE.preferences) as Partial<Preferences> | null;
  return { locale: raw?.locale === 'ko' ? 'ko' : 'ja', region: raw?.region === 'KR' ? 'KR' : 'JP', saveHistory: raw?.saveHistory === true };
}

export function loadHistory(preferences: Preferences): DisplayMessage[] {
  if (!preferences.saveHistory) return [];
  const raw = readJSON(STORAGE.history) as { locale?: string; region?: string; messages?: unknown } | null;
  if (raw?.locale !== preferences.locale || raw?.region !== preferences.region || !Array.isArray(raw.messages)) return [];
  return raw.messages.slice(-60).filter((message): message is DisplayMessage => !!message && typeof message === 'object' && ['user', 'assistant'].includes(message.role) && typeof message.content === 'string' && message.content.length <= MAX_MESSAGE_LENGTH && typeof message.id === 'string');
}

export function localDate(region: Region): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: region === 'JP' ? 'Asia/Tokyo' : 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function freshStep(region: Region): StepState {
  return { date: localDate(region), energy: 3, mission: 2, status: 'suggested' };
}

export function loadStep(region: Region): StepState {
  const raw = readJSON(STORAGE.step) as Partial<StepState> | null;
  if (raw?.date === localDate(region) && Number.isInteger(raw.energy) && Number.isInteger(raw.mission) && raw.energy! >= 1 && raw.energy! <= 5 && raw.mission! >= 0 && raw.mission! < 5 && ['suggested', 'active', 'completed', 'deferred'].includes(raw.status!)) return raw as StepState;
  return freshStep(region);
}

export function contextMessages(messages: DisplayMessage[], maxCharacters: number): ChatMessage[] {
  let remaining = maxCharacters;
  const context: ChatMessage[] = [];
  for (const message of messages.slice(-MAX_MESSAGES).reverse()) {
    const content = message.content.slice(0, MAX_MESSAGE_LENGTH);
    if (content.length > remaining) break;
    context.unshift({ role: message.role, content });
    remaining -= content.length;
  }
  return context;
}
