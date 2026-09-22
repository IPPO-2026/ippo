import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatQuota } from './shared';

export function useChatQuota(enabled: boolean) {
  const [quota, setQuota] = useState<ChatQuota | null>(null);
  const pending = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    pending.current?.abort();
    setQuota(null);
    if (!enabled) return;
    const controller = new AbortController();
    pending.current = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/api/quota', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: '{}', cache: 'no-store', signal: controller.signal,
      });
      const { quota: value } = await response.json() as { quota?: ChatQuota };
      if (!response.ok || !value || !Number.isInteger(value.remaining) || value.remaining < 0 || value.remaining > 1010 || !['personal', 'service'].includes(value.limitedBy) || !Number.isFinite(value.resetsAt) || value.resetsAt <= Date.now()) return;
      if (!controller.signal.aborted && pending.current === controller) setQuota(value);
    } catch { /* An unavailable balance stays hidden, never guessed. */ }
    finally { clearTimeout(timeout); }
  }, [enabled]);

  useEffect(() => {
    void refresh();
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', visible);
    window.addEventListener('online', visible);
    document.addEventListener('visibilitychange', visible);
    return () => {
      pending.current?.abort();
      window.removeEventListener('focus', visible);
      window.removeEventListener('online', visible);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);
  useEffect(() => {
    if (!quota) return;
    const timer = setTimeout(() => void refresh(), Math.min(86400000, Math.max(0, quota.resetsAt - Date.now())));
    return () => clearTimeout(timer);
  }, [quota, refresh]);
  return { quota: enabled ? quota : null, refresh };
}
