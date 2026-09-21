import { validMission, type MissionState } from './chat-missions';
import type { ChatMessage, Locale, Region } from './shared';
import { MAX_MESSAGE_LENGTH, MAX_MESSAGES } from './shared';

export const STORAGE = { preferences: 'ippo.preferences.v1', history: 'ippo.history.v1', step: 'ippo.step.v1', paymentReturn: 'ippo.payment-return.v1' };
export type Preferences = { locale: Locale; region: Region; saveHistory: boolean };
export type DisplayMessage = ChatMessage & { id: string; mode?: 'demo' | 'live' | 'local'; mission?: MissionState };

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
  return raw.messages.slice(-60).filter((message): message is DisplayMessage => !!message && typeof message === 'object' && ['user', 'assistant'].includes(message.role) && typeof message.content === 'string' && message.content.length <= MAX_MESSAGE_LENGTH && typeof message.id === 'string').map(message => ({ ...message, mission: message.role === 'assistant' && validMission(message.mission) ? message.mission : undefined }));
}

type PaymentReturn = { locale: Locale; region: Region; messages: DisplayMessage[]; draft: string; savedAt: number };

function validMessages(value: unknown): DisplayMessage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-60).filter((message): message is DisplayMessage => !!message && typeof message === 'object' && ['user', 'assistant'].includes(message.role) && typeof message.content === 'string' && message.content.length <= MAX_MESSAGE_LENGTH && typeof message.id === 'string').map(message => ({ ...message, mission: message.role === 'assistant' && validMission(message.mission) ? message.mission : undefined }));
}

export function savePaymentReturn(preferences: Preferences, messages: DisplayMessage[], draft: string): void {
  const value: PaymentReturn = { locale: preferences.locale, region: preferences.region, messages: messages.slice(-60), draft: draft.slice(0, MAX_MESSAGE_LENGTH), savedAt: Date.now() };
  sessionStorage.setItem(STORAGE.paymentReturn, JSON.stringify(value));
}

export function takePaymentReturn(preferences: Preferences): Pick<PaymentReturn, 'messages' | 'draft'> | null {
  let raw: Partial<PaymentReturn> | null = null;
  try {
    raw = JSON.parse(sessionStorage.getItem(STORAGE.paymentReturn) || 'null');
    sessionStorage.removeItem(STORAGE.paymentReturn);
  } catch {
    return null;
  }
  if (raw?.locale !== preferences.locale || raw?.region !== preferences.region || typeof raw.savedAt !== 'number' || Date.now() - raw.savedAt > 2 * 60 * 60 * 1000 || typeof raw.draft !== 'string' || raw.draft.length > MAX_MESSAGE_LENGTH) return null;
  const messages = validMessages(raw.messages);
  if (!messages.length && !raw.draft) return null;
  return { messages, draft: raw.draft };
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
