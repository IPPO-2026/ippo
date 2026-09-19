import { useEffect, useRef, useState } from 'react';
import type { Locale } from './shared';
import { copy } from './copy';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; action: string; theme: 'light'; language: string; size: 'flexible'; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void }) => string;
      remove: (id: string) => void;
    };
  }
}

export default function Turnstile({ siteKey, locale, onToken }: { siteKey: string; locale: Locale; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    let widget: string | undefined;
    setFailed(false);
    onToken('');
    const render = () => {
      if (disposed || !container.current || !window.turnstile || widget !== undefined) return;
      try {
        widget = window.turnstile.render(container.current, {
          sitekey: siteKey, action: 'chat', theme: 'light', language: locale, size: 'flexible',
          callback: token => { if (!disposed) onToken(token); },
          'expired-callback': () => { if (!disposed) onToken(''); },
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

  return <div className="verification">
    <div ref={container} />
    {failed && <p className="inline-error" role="alert">{copy[locale].verificationError} <button className="text-button" type="button" onClick={retry}>{copy[locale].retry}</button></p>}
  </div>;
}
