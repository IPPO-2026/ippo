import { useEffect, useRef, useState } from 'react';
import type { Locale } from './shared';
import { copy } from './copy';
import { Check, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; action: string; theme: 'light'; language: string; size: 'flexible'; appearance: 'interaction-only'; 'before-interactive-callback': () => void; 'after-interactive-callback': () => void; 'timeout-callback': () => void; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void }) => string;
      remove: (id: string) => void;
    };
  }
}

export default function Turnstile({ siteKey, locale, onToken }: { siteKey: string; locale: Locale; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<'checking' | 'ready' | 'interaction'>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    let widget: string | undefined;
    setFailed(false);
    setStatus('checking');
    onToken('');
    const render = () => {
      if (disposed || !container.current || !window.turnstile || widget !== undefined) return;
      try {
        widget = window.turnstile.render(container.current, {
          sitekey: siteKey, action: 'chat', theme: 'light', language: locale, size: 'flexible', appearance: 'interaction-only',
          'before-interactive-callback': () => { if (!disposed) setStatus('interaction'); },
          'after-interactive-callback': () => { if (!disposed) setStatus('checking'); },
          'timeout-callback': () => { if (!disposed) { onToken(''); setFailed(true); } },
          callback: token => { if (!disposed) { onToken(token); setStatus('ready'); setFailed(false); } },
          'expired-callback': () => { if (!disposed) { onToken(''); setStatus('checking'); } },
          'error-callback': () => { if (!disposed) { onToken(''); setFailed(true); } },
        });
      } catch { if (!disposed) setFailed(true); }
    };
    let script = document.querySelector<HTMLScriptElement>('#ippo-turnstile');
    if (!script) {
      script = document.createElement('script');
      script.id = 'ippo-turnstile';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
    const fail = () => { if (!disposed) setFailed(true); };
    script.addEventListener('load', render);
    script.addEventListener('error', fail);
    render();
    const timeout = window.setTimeout(() => { if (!disposed && widget === undefined) setFailed(true); }, 15000);
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      script?.removeEventListener('load', render);
      script?.removeEventListener('error', fail);
      if (widget !== undefined) { try { window.turnstile?.remove(widget); } catch { /* A detached widget needs no further cleanup. */ } }
    };
  }, [siteKey, locale, onToken, attempt]);

  function retry() {
    if (!window.turnstile) document.querySelector('#ippo-turnstile')?.remove();
    setAttempt(value => value + 1);
  }

  const ko = locale === 'ko';
  return <div className="verification">
    <div className={`verification-status ${failed ? 'failed' : status}`} role="status" aria-live="polite">
      {failed ? <ShieldCheck size={14} /> : status === 'ready' ? <Check size={14} /> : status === 'interaction' ? <ShieldCheck size={14} /> : <LoaderCircle size={14} className="verification-spinner" />}
      <span>{failed ? (ko ? '연결을 다시 확인해 주세요' : '接続をもう一度確認してください') : status === 'ready' ? (ko ? '이야기할 준비가 됐어요' : 'おはなしの準備ができました') : status === 'interaction' ? (ko ? '아래 확인을 완료해 주세요' : '下の確認を完了してください') : (ko ? '안전하게 연결하고 있어요' : '接続を確認しています')}</span>
      {failed && <button className="verification-retry" type="button" onClick={retry}><RefreshCw size={13} />{copy[locale].retry}</button>}
    </div>
    <div ref={container} className="verification-widget" />
  </div>;
}
