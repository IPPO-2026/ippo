import { useCallback, useEffect, useRef, useState } from 'react';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwa() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [installed, setInstalled] = useState(() => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [ready, setReady] = useState(false);
  const [update, setUpdate] = useState<ServiceWorker | null>(null);
  const [failed, setFailed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const shouldReload = useRef(false);

  useEffect(() => {
    const online = () => setOffline(false);
    const offline = () => setOffline(true);
    const prompt = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const installed = () => { setInstalled(true); setInstallEvent(null); };
    const mode = matchMedia('(display-mode: standalone)');
    const changed = () => setInstalled(mode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('appinstalled', installed);
    mode.addEventListener('change', changed);
    return () => {
      window.removeEventListener('online', online); window.removeEventListener('offline', offline);
      window.removeEventListener('beforeinstallprompt', prompt); window.removeEventListener('appinstalled', installed);
      mode.removeEventListener('change', changed);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let disposed = false;
    let cleanup = () => {};
    const controlled = () => { if (shouldReload.current) location.reload(); else setReady(true); };
    navigator.serviceWorker.addEventListener('controllerchange', controlled);
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(reg => {
      if (disposed) return;
      registration.current = reg;
      if (reg.waiting) setUpdate(reg.waiting);
      const found = () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => {
          if (disposed) return;
          if (worker.state === 'redundant') setFailed(true);
          if (worker.state === 'installed') {
            if (navigator.serviceWorker.controller) setUpdate(reg.waiting);
            else setReady(true);
          }
        });
      };
      reg.addEventListener('updatefound', found);
      found();
      cleanup = () => reg.removeEventListener('updatefound', found);
      if (reg.active) setReady(true);
    }).catch(() => { if (!disposed) setFailed(true); });
    const check = () => { if (document.visibilityState === 'visible' && navigator.onLine) void registration.current?.update().catch(() => {}); };
    document.addEventListener('visibilitychange', check);
    return () => { disposed = true; cleanup(); navigator.serviceWorker.removeEventListener('controllerchange', controlled); document.removeEventListener('visibilitychange', check); };
  }, []);

  const install = useCallback(async () => {
    if (!installEvent || installing) return;
    setInstalling(true);
    try { await installEvent.prompt(); await installEvent.userChoice; } catch { setFailed(true); }
    finally { setInstallEvent(null); setInstalling(false); }
  }, [installEvent, installing]);
  const applyUpdate = () => { if (update) { shouldReload.current = true; update.postMessage({ type: 'SKIP_WAITING' }); } };
  return { offline, installed, canInstall: !!installEvent, install, installing, ready, update, applyUpdate, failed };
}
