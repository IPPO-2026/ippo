import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUp, Check, CheckCheck, ChevronRight, CircleHelp, Clock3, ExternalLink, Globe2, Heart, Leaf, LoaderCircle, LockKeyhole, MessageCircle, Plus, RefreshCw, Settings2, ShieldCheck, Sparkles, Sprout, Sun, Trash2, X } from 'lucide-react';
import type { AppConfig, ChatResponse, Locale, Region } from './shared';
import { MAX_CONTEXT_CHARACTERS, MAX_MESSAGE_LENGTH } from './shared';
import { copy, getDemoReply, missions } from './copy';
import { IppoMark, StepScene } from './illustrations';
import { contextMessages, freshStep, loadHistory, loadPreferences, loadStep, localDate, STORAGE } from './local-state';
import type { DisplayMessage, Preferences, StepState } from './local-state';
import Turnstile from './Turnstile';

type Tab = 'chat' | 'steps' | 'settings';
const DEMO_CONFIG: AppConfig = { mode: 'demo', turnstileSiteKey: null, maxMessageLength: MAX_MESSAGE_LENGTH, maxContextCharacters: MAX_CONTEXT_CHARACTERS };
const initialPreferences = loadPreferences();

function validConfig(value: unknown): value is AppConfig {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as AppConfig;
  return ['demo', 'live'].includes(candidate.mode) && (candidate.turnstileSiteKey === null || typeof candidate.turnstileSiteKey === 'string') && candidate.maxMessageLength === MAX_MESSAGE_LENGTH && candidate.maxContextCharacters === MAX_CONTEXT_CHARACTERS;
}

function Brand({ locale }: { locale: Locale }) {
  return <div className="brand"><span className="wordmark">ippo<span className="brand-period">.</span></span><span className="brand-language">{copy[locale].brand}</span></div>;
}

export default function App() {
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences);
  const { locale, region, saveHistory } = preferences;
  const t = copy[locale];
  const [tab, setTab] = useState<Tab>('chat');
  const [messages, setMessages] = useState<DisplayMessage[]>(() => loadHistory(initialPreferences));
  const [step, setStep] = useState<StepState>(() => loadStep(initialPreferences.region));
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState('');
  const [verificationKey, setVerificationKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryMessages, setRetryMessages] = useState<DisplayMessage[] | null>(null);
  const [notice, setNotice] = useState('');
  const [clearConfirmation, setClearConfirmation] = useState<'all' | 'chat' | null>(null);
  const [storageError, setStorageError] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const session = useRef(0);
  const request = useRef<AbortController | null>(null);
  const configRequest = useRef<AbortController | null>(null);
  const lastMode = useRef<AppConfig['mode'] | null>(null);
  const composing = useRef(false);
  const busy = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  const isLive = config?.mode === 'live';
  const nav = [{ id: 'chat' as const, icon: MessageCircle, label: t.chat }, { id: 'steps' as const, icon: Sprout, label: t.steps }, { id: 'settings' as const, icon: Settings2, label: t.settings }];
  const supportUrl = region === 'JP' ? 'https://www.mhlw.go.jp/mamorouyokokoro/' : 'https://www.129.go.kr/109';
  const supportLabel = region === 'JP' ? t.supportJP : t.supportKR;

  const cancelRequest = useCallback(() => {
    session.current += 1;
    request.current?.abort();
    request.current = null;
    busy.current = false;
    setLoading(false);
    setToken('');
    setVerificationKey(value => value + 1);
  }, []);

  const resetConversation = useCallback(() => {
    cancelRequest();
    setMessages([]);
    setDraft('');
    setError('');
    setRetryMessages(null);
    setConsent(false);
    setClearConfirmation(null);
    try { localStorage.removeItem(STORAGE.history); } catch { setStorageError(true); }
  }, [cancelRequest]);

  const loadConfig = useCallback(async () => {
    configRequest.current?.abort();
    const controller = new AbortController();
    configRequest.current = controller;
    setConfigLoading(true);
    const timeout = window.setTimeout(() => controller.abort('timeout'), 8000);
    try {
      const response = await fetch('/api/config', { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Config unavailable');
      const result: unknown = await response.json();
      if (!validConfig(result)) throw new Error('Unexpected configuration');
      if (controller !== configRequest.current) return;
      if (lastMode.current && lastMode.current !== result.mode) resetConversation();
      lastMode.current = result.mode;
      setConfig(result);
      setConfigError(false);
    } catch {
      if (controller !== configRequest.current) return;
      if (controller.signal.aborted && controller.signal.reason !== 'timeout') return;
      if (lastMode.current === 'live') resetConversation();
      lastMode.current = 'demo';
      setConfig(DEMO_CONFIG);
      setConfigError(true);
    } finally {
      window.clearTimeout(timeout);
      if (controller === configRequest.current) setConfigLoading(false);
    }
  }, [resetConversation]);

  useEffect(() => { void loadConfig(); return () => { configRequest.current?.abort(); configRequest.current = null; }; }, [loadConfig]);
  useEffect(() => () => { request.current?.abort(); session.current += 1; }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = `ippo — ${t.tagline}`;
    try { localStorage.setItem(STORAGE.preferences, JSON.stringify(preferences)); } catch { setStorageError(true); }
  }, [preferences, locale, t.tagline]);
  useEffect(() => {
    try {
      if (saveHistory) localStorage.setItem(STORAGE.history, JSON.stringify({ locale, region, messages: messages.slice(-60) }));
      else localStorage.removeItem(STORAGE.history);
    } catch { setStorageError(true); }
  }, [messages, saveHistory, locale, region]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE.step, JSON.stringify(step)); } catch { setStorageError(true); }
  }, [step]);
  useEffect(() => {
    const checkDate = () => { const today = localDate(region); setStep(current => current.date === today ? current : freshStep(region)); };
    checkDate();
    const timer = window.setInterval(checkDate, 60000);
    window.addEventListener('focus', checkDate);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', checkDate); };
  }, [region]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' }); }, [messages, loading, error, tab]);
  useEffect(() => {
    if (!textarea.current) return;
    textarea.current.style.height = 'auto';
    textarea.current.style.height = `${Math.min(textarea.current.scrollHeight, 150)}px`;
  }, [draft]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 5000); return () => window.clearTimeout(timer); }, [notice]);
  useEffect(() => {
    if (!clearConfirmation || !dialog.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const buttons = Array.from(dialog.current.querySelectorAll<HTMLButtonElement>('button'));
    buttons[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setClearConfirmation(null); }
      if (event.key !== 'Tab') return;
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [clearConfirmation]);

  function updateStep(change: (current: StepState) => StepState) {
    setStep(current => change(current.date === localDate(region) ? current : freshStep(region)));
  }

  function changeLocale(next: Locale) {
    if (locale === next) return;
    resetConversation();
    setPreferences(current => ({ ...current, locale: next }));
    setNotice('');
  }
  function changeRegion(next: Region) {
    if (region === next) return;
    resetConversation();
    setPreferences(current => ({ ...current, region: next }));
    setNotice('');
  }

  async function sendMessage(supplied?: string, retry?: DisplayMessage[]) {
    if (busy.current || !config) return;
    const content = (supplied ?? draft).trim();
    if (!retry && !content) return;
    if (content.length > config.maxMessageLength) { setError(t.tooLong); return; }
    if (isLive && !consent) { setError(t.consentNeeded); return; }
    if (isLive && !token) { setError(t.tokenRequired); return; }
    const nextMessages = retry ?? [...messages, { id: crypto.randomUUID(), role: 'user' as const, content, mode: config.mode }];
    const currentSession = session.current;
    const controller = new AbortController();
    request.current = controller;
    busy.current = true;
    setLoading(true);
    setError('');
    setRetryMessages(null);
    setMessages(nextMessages);
    setDraft('');
    const currentToken = token;
    setToken('');
    let timeout: number | undefined;
    try {
      let answer: ChatResponse;
      if (config.mode === 'demo') {
        // Deliberately local and deterministic: demo conversations never leave the browser.
        const latest = nextMessages[nextMessages.length - 1].content;
        answer = { mode: 'demo', message: getDemoReply(latest, locale, nextMessages.filter(message => message.role === 'user').length - 1) };
      } else {
        timeout = window.setTimeout(() => controller.abort('timeout'), 45000);
        const response = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ locale, region, messages: contextMessages(nextMessages.filter(message => message.mode !== 'demo'), config.maxContextCharacters), consent: true, turnstileToken: currentToken }),
        });
        const result = await response.json() as ChatResponse & { code?: string };
        if (!response.ok) throw new Error(result?.code || 'provider_unavailable');
        if (!result || typeof result.message !== 'string' || !result.message.trim() || result.message.length > MAX_MESSAGE_LENGTH || result.mode !== 'live') throw new Error('provider_unavailable');
        answer = result;
      }
      if (session.current !== currentSession || controller.signal.aborted) return;
      setMessages(current => [...current, { id: crypto.randomUUID(), role: 'assistant', content: answer.message, mode: answer.mode }].slice(-60) as DisplayMessage[]);
    } catch (caught) {
      if (session.current !== currentSession) return;
      if (controller.signal.aborted && controller.signal.reason !== 'timeout') return;
      const labels: Record<string, string> = { daily_limit: t.dailyLimit, not_configured: t.notConfigured, verification_required: t.verificationError, consent_required: t.consentNeeded };
      setError(labels[caught instanceof Error ? caught.message : ''] || t.error);
      setRetryMessages(nextMessages);
    } finally {
      if (timeout !== undefined) window.clearTimeout(timeout);
      if (session.current === currentSession) {
        request.current = null;
        busy.current = false;
        setLoading(false);
        setToken('');
        setVerificationKey(value => value + 1);
      }
    }
  }

  function clearData() {
    resetConversation();
    if (clearConfirmation === 'all') {
      setPreferences(current => ({ ...current, saveHistory: false }));
      setStep(freshStep(region));
      try { localStorage.removeItem(STORAGE.step); localStorage.removeItem(STORAGE.history); } catch { setStorageError(true); }
      setNotice(t.clearDone);
    }
  }

  function exportChat() {
    if (!messages.length) { setNotice(t.emptyExport); return; }
    const text = `${t.exportTitle}\n${new Date().toISOString()}\n${t.exportNotice}\n\n${messages.map(message => `${message.role === 'user' ? t.you : `${t.assistant} (${message.mode === 'demo' ? t.responseDemo : t.responseAI})`}\n${message.content}`).join('\n\n')}`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `ippo-${localDate(region)}.txt`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const renderStepCard = (expanded = false) => {
    const mission = missions[locale][step.mission];
    const finished = step.status === 'completed';
    const deferred = step.status === 'deferred';
    return <div className={`step-card ${expanded ? 'expanded' : ''}`}>
      <div className="step-card-top"><span className="eyebrow">{t.littleStep}</span><Sprout size={18} strokeWidth={1.6} /></div>
      <div className="energy-section">
        <h3>{t.energyQuestion}</h3>
        <div className="energy-buttons" role="group" aria-label={t.energyQuestion}>
          {[1, 2, 3, 4, 5].map(value => <button key={value} className={`energy-button ${step.energy === value ? 'selected' : ''}`} aria-pressed={step.energy === value} aria-label={`${t.energyLabel} ${value}: ${t.energyNames[value - 1]}`} onClick={() => setStep({ date: localDate(region), energy: value, mission: value - 1, status: 'suggested' })}><span>{value === 1 ? '◡' : value === 2 ? '⌣' : value === 3 ? '–' : value === 4 ? '⌒' : '✦'}</span><small>{value}</small></button>)}
        </div>
        <div className="energy-labels"><span>{t.energyLow}</span><span>{t.energyHigh}</span></div>
      </div>
      <StepScene />
      <div className="mission-content">
        <div className="mission-overline">{finished ? <CheckCheck size={15} /> : <Leaf size={14} />}<span>{finished ? t.completed : deferred ? t.deferred : step.status === 'active' ? t.active : t.suggested}</span></div>
        <h3>{deferred ? t.deferred : mission.title}</h3>
        <p>{finished ? t.completedNote : deferred ? t.deferredNote : mission.body}</p>
        {!finished && !deferred && <span className="duration"><Clock3 size={13} />{mission.duration}{t.minutes}</span>}
        {!finished && !deferred && <button className={`primary-button step-action ${step.status === 'active' ? 'sage-button' : ''}`} onClick={() => updateStep(current => ({ ...current, status: current.status === 'active' ? 'completed' : 'active' }))}>{step.status === 'active' ? <Check size={17} /> : <ArrowRight size={17} />}{step.status === 'active' ? t.completeStep : t.startStep}</button>}
        {!finished && !deferred && <button className="defer-button" onClick={() => updateStep(current => ({ ...current, status: 'deferred' }))}>{t.defer}</button>}
        {(finished || deferred) && <button className="secondary-button another-step" onClick={() => updateStep(current => ({ ...current, mission: (current.mission + 1) % 5, status: 'suggested' }))}><RefreshCw size={15} />{t.another}</button>}
      </div>
    </div>;
  };

  const renderSupport = (compact = false) => <section className={`support-card ${compact ? 'compact' : ''}`} aria-label={t.support}>
    <Heart size={17} strokeWidth={1.5} /><h3>{t.support}</h3><p>{t.supportText}</p><a href={supportUrl} target="_blank" rel="noopener noreferrer" aria-label={`${supportLabel} (${t.externalLink})`}>{supportLabel}<ExternalLink size={13} /></a>
  </section>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div><Brand locale={locale} /><p className="brand-tagline">{t.tagline}</p></div>
      <nav className="desktop-nav" aria-label={locale === 'ja' ? 'メインメニュー' : '메인 메뉴'}>{nav.map(item => <button key={item.id} className={`nav-item ${tab === item.id ? 'active' : ''}`} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}><item.icon size={20} strokeWidth={1.7} /><span>{item.label}</span>{tab === item.id && <span className="nav-active-dot" />}</button>)}</nav>
      <button className="new-chat" onClick={() => { if (messages.length) setClearConfirmation('chat'); else { resetConversation(); setTab('chat'); textarea.current?.focus(); } }}><Plus size={17} />{t.newConversation}</button>
      <div className="sidebar-bottom"><IppoMark className="sidebar-mascot" /><p>{t.sidebarNote}</p><div className="sidebar-divider" /><span className="sidebar-footer">{t.sidebarFooter}</span><span className="project-label">IPPO PROJECT · 2026</span></div>
    </aside>

    <div className="workspace">
      <header className="topbar">
        <div className="mobile-brand"><Brand locale={locale} /></div>
        <div className="breadcrumb"><span>{t.today}</span><span className="breadcrumb-divider">/</span><strong>{tab === 'chat' ? t.chat : tab === 'steps' ? t.steps : t.settings}</strong></div>
        <div className="topbar-controls"><span className={`mode-pill ${isLive ? 'live' : ''}`}><span />{configLoading ? t.checking : isLive ? t.online : t.demo}</span><div className="language-control"><Globe2 size={15} /><select aria-label={t.language} title={t.languageHint} value={locale} onChange={event => changeLocale(event.target.value as Locale)}><option value="ja">日本語</option><option value="ko">한국어</option></select></div></div>
      </header>

      <div className={`workspace-body tab-${tab}`}>
        <main id="main-content" className={`main-panel ${tab === 'chat' ? 'chat-panel' : 'content-panel'}`}>
          {tab === 'chat' && <>
            <div className="chat-scroll">
              {messages.length === 0 ? <div className="welcome">
                <div className="welcome-overline"><span className="sun-icon"><Sun size={21} strokeWidth={1.5} /></span><span>{t.chapter}</span></div>
                <h1>{t.heading}</h1><p className="welcome-intro">{t.intro}</p>
                <div className="welcome-character"><span className="character-halo" /><IppoMark className="hero-mascot" decorative={false} label={t.mascot} /><span className="tiny-spark spark-one">✦</span><span className="tiny-spark spark-two">✳</span></div>
                <div className="welcome-greeting"><span className="tiny-dot" />{t.greeting}<span className="greeting-subtitle">{t.invitation}</span></div>
                <div className="starter-prompts">{t.prompts.map((prompt, index) => { const Icon = [Leaf, Sparkles, Sun][index]; return <button key={prompt} onClick={() => { setDraft(prompt); textarea.current?.focus(); }}><Icon size={18} strokeWidth={1.5} /><span><small>{t.promptHints[index]}</small><strong>{prompt}</strong></span><ChevronRight size={15} /></button>; })}</div>
              </div> : <div className="message-list" role="log" aria-label={t.chat} aria-live="polite" aria-relevant="additions text">
                <div className="conversation-date">{new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'ko-KR', { month: 'long', day: 'numeric', timeZone: region === 'JP' ? 'Asia/Tokyo' : 'Asia/Seoul' }).format(new Date())}<span>·</span>{t.today}</div>
                {messages.map(message => <div key={message.id} className={`message-row ${message.role}`}>
                  {message.role === 'assistant' && <div className="avatar"><IppoMark /></div>}
                  <div className="message-group"><div className="message-label">{message.role === 'user' ? t.you : t.assistant}{message.role === 'assistant' && <span>{message.mode === 'demo' ? t.responseDemo : t.responseAI}</span>}</div><div className="message-bubble">{message.content}</div></div>
                </div>)}
                {loading && <div className="message-row assistant"><div className="avatar"><IppoMark /></div><div className="loading-bubble" role="status"><LoaderCircle className="spinner" size={17} />{t.sending}</div></div>}
              </div>}
              {error && <div className="chat-error" role="alert"><CircleHelp size={18} /><div><p>{error}</p>{retryMessages && <button className="text-button" disabled={loading || (isLive && (!consent || !token))} onClick={() => void sendMessage('', retryMessages)}><RefreshCw size={14} />{t.retry}</button>}</div></div>}
              <div ref={messagesEnd} />
            </div>
            <div className="composer-area">
              {!isLive && <p className="demo-explanation"><span className="demo-dot" />{t.demoNote}</p>}
              {isLive && !consent && <section className="consent-card"><div className="consent-heading"><ShieldCheck size={17} /><strong>{t.consentTitle}</strong></div><label><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>{t.consent}</span></label><p>{t.consentHint}</p></section>}
              {isLive && consent && config.turnstileSiteKey && <Turnstile key={verificationKey} siteKey={config.turnstileSiteKey} locale={locale} onToken={setToken} />}
              {isLive && !config.turnstileSiteKey && <p role="alert" className="inline-error">{t.verificationError}</p>}
              <form className={`composer ${loading ? 'is-loading' : ''}`} onSubmit={event => { event.preventDefault(); void sendMessage(); }}>
                <textarea ref={textarea} aria-label={t.placeholder} placeholder={t.placeholder} value={draft} rows={1} maxLength={MAX_MESSAGE_LENGTH} disabled={loading} onChange={event => { setDraft(event.target.value); if (error && !retryMessages) setError(''); }} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !composing.current && event.keyCode !== 229) { event.preventDefault(); void sendMessage(); } }} />
                <div className="composer-bottom"><div><Leaf size={14} strokeWidth={1.5} /><span className="desktop-input-hint">{t.inputHint}</span><span className="mobile-input-hint">{t.mobileInputHint}</span>{draft.length > 800 && <span className="character-count">{draft.length}/{MAX_MESSAGE_LENGTH}</span>}</div>{loading ? <button type="button" className="send-button" aria-label={t.cancel} onClick={cancelRequest}><X size={21} /></button> : <button className="send-button" type="submit" aria-label={t.send} disabled={!draft.trim() || !config || (isLive && (!consent || !token))}><ArrowUp size={22} /></button>}</div>
              </form>
              <p className="privacy-note"><LockKeyhole size={11} />{saveHistory ? t.savedHint : t.privacyHint}<button className="text-button" onClick={() => setTab('settings')}>{t.settings}</button></p>
              <p className="medical-note">{t.disclaimer}</p>
            </div>
          </>}

          {tab === 'steps' && <div className="steps-page"><span className="eyebrow">ONE SMALL STEP, AT YOUR PACE</span><h1>{t.stepHeading}</h1><p className="page-intro">{t.stepIntro}</p>{renderStepCard(true)}<div className="step-page-note"><Heart size={18} /><p>{t.noCompetition}</p><small>{t.stepLocal}</small></div>{renderSupport()}</div>}

          {tab === 'settings' && <div className="settings-page"><span className="eyebrow">MAKE YOURSELF AT HOME</span><h1>{t.settingsHeading}</h1><p className="page-intro">{t.settingsIntro}</p>
            <section className="settings-section"><div className="section-heading"><Globe2 size={19} /><h2>{t.language}</h2></div><div className="segmented-control"><button className={locale === 'ja' ? 'selected' : ''} aria-pressed={locale === 'ja'} onClick={() => changeLocale('ja')}>日本語{locale === 'ja' && <Check size={16} />}</button><button className={locale === 'ko' ? 'selected' : ''} aria-pressed={locale === 'ko'} onClick={() => changeLocale('ko')}>한국어{locale === 'ko' && <Check size={16} />}</button></div><p className="setting-hint">{t.languageHint}</p><h3 className="setting-subheading">{t.region}</h3><div className="segmented-control"><button className={region === 'JP' ? 'selected' : ''} aria-pressed={region === 'JP'} onClick={() => changeRegion('JP')}>{t.japan}{region === 'JP' && <Check size={16} />}</button><button className={region === 'KR' ? 'selected' : ''} aria-pressed={region === 'KR'} onClick={() => changeRegion('KR')}>{t.korea}{region === 'KR' && <Check size={16} />}</button></div><p className="setting-hint">{t.regionHint}</p></section>
            <section className="settings-section"><div className="section-heading"><LockKeyhole size={19} /><h2>{t.privacy}</h2></div><label className="save-setting"><span>{t.saveHistory}</span><input type="checkbox" role="switch" checked={saveHistory} onChange={event => setPreferences(current => ({ ...current, saveHistory: event.target.checked }))} /><span className="switch-visual" aria-hidden="true" /></label><p className="setting-hint">{t.saveDescription}</p><div className="data-actions"><button className="secondary-button" onClick={exportChat} disabled={!messages.length}><ArrowDownToLine size={16} />{t.export}</button><button className="secondary-button danger-button" onClick={() => setClearConfirmation('all')}><Trash2 size={16} />{t.clear}</button></div>{consent && <button className="text-button revoke-button" onClick={() => { cancelRequest(); setConsent(false); setError(''); setRetryMessages(null); setNotice(t.consentRevoked); }}>{t.revokeConsent}</button>}</section>
            <section className="settings-section"><div className="section-heading"><ShieldCheck size={19} /><h2>{t.mode}</h2><span className={`mode-pill ${isLive ? 'live' : ''}`}><span />{isLive ? t.online : t.demo}</span></div><p className="setting-hint">{isLive ? t.liveDescription : t.demoDescription}</p>{configError && <div className="config-warning"><p>{t.configFallback}</p><button className="text-button" disabled={configLoading} onClick={() => void loadConfig()}><RefreshCw size={14} className={configLoading ? 'spinner' : ''} />{configLoading ? t.connectRetry : t.retryConnection}</button></div>}</section>
            {renderSupport()}<p className="settings-disclaimer">{t.disclaimer}</p><div className="settings-footer"><Brand locale={locale} /><span>v0.1 · IPPO PROJECT</span></div>
          </div>}
        </main>
        {tab === 'chat' && <aside className="right-panel"><div className="right-panel-heading"><span>{t.steps}</span><span className="today-date">{new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'ko-KR', { month: 'numeric', day: 'numeric', timeZone: region === 'JP' ? 'Asia/Tokyo' : 'Asia/Seoul' }).format(new Date())}</span></div>{renderStepCard()}<p className="gentle-reminder"><Heart size={13} />{t.noCompetition}</p>{renderSupport(true)}<p className="right-local-note">{t.stepLocal}</p></aside>}
      </div>
    </div>

    <nav className="mobile-nav" aria-label={locale === 'ja' ? 'メインメニュー' : '메인 메뉴'}>{nav.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}><item.icon size={21} strokeWidth={1.7} /><span>{item.label}</span></button>)}</nav>
    {(notice || storageError) && <div className="toast" role="status"><span>{notice || t.storageError}</span><button aria-label={t.cancel} onClick={() => { setNotice(''); setStorageError(false); }}><X size={15} /></button></div>}
    {clearConfirmation && <div className="dialog-backdrop"><div ref={dialog} className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="clear-title"><div className="dialog-icon"><Trash2 size={22} /></div><h2 id="clear-title">{clearConfirmation === 'all' ? t.clearQuestion : t.clearChatQuestion}</h2><div className="dialog-actions"><button className="secondary-button" autoFocus onClick={() => setClearConfirmation(null)}>{t.cancel}</button><button className="primary-button" onClick={() => { clearData(); if (clearConfirmation === 'chat') setTab('chat'); }}>{clearConfirmation === 'all' ? t.clearConfirm : t.clearChatConfirm}</button></div></div></div>}
  </div>;
}
