import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Clock3,
  MoreHorizontal,
  Plus,
  Sprout,
  X,
  LoaderCircle,
} from "lucide-react";
import type { AppConfig, ChatResponse, Locale, Region } from "./shared";
import { MAX_CONTEXT_CHARACTERS, MAX_MESSAGE_LENGTH } from "./shared";
import { copy, getDemoReply } from "./copy";
import BrandMark from "./BrandMark";
import {
  contextMessages,
  loadHistory,
  loadPreferences,
  STORAGE,
} from "./local-state";
import type { DisplayMessage } from "./local-state";
import {
  demoMission,
  canSuggestMission,
  isMissionId,
  missionContent,
  type MissionState,
} from "./chat-missions";
import Turnstile from "./Turnstile";
import { usePwa } from "./usePwa";
import { pwaCopy } from "./pwa-copy";
import "./conversation.css";
const initial = loadPreferences();
const demoConfig: AppConfig = {
  mode: "demo",
  turnstileSiteKey: null,
  maxMessageLength: MAX_MESSAGE_LENGTH,
  maxContextCharacters: MAX_CONTEXT_CHARACTERS,
};
export default function App() {
  const [preferences, setPreferences] = useState(initial);
  const { locale, region, saveHistory } = preferences;
  const t = copy[locale],
    pt = pwaCopy[locale];
  const ko = locale === "ko";
  const [messages, setMessages] = useState<DisplayMessage[]>(() =>
    loadHistory(initial),
  );
  const [draft, setDraft] = useState("");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState("");
  const [verification, setVerification] = useState(0);
  const [storageError, setStorageError] = useState(false);
  const [retry, setRetry] = useState<DisplayMessage[] | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const session = useRef(0),
    busy = useRef(false),
    composing = useRef(false);
  const configRequest = useRef<AbortController | null>(null);
  const mode = useRef<AppConfig["mode"] | null>(null);
  const pwa = usePwa();
  const isLive = config?.mode === "live";
  const active = messages.find((m) => m.mission?.status === "active");
  const cancel = useCallback(() => {
    session.current++;
    request.current?.abort();
    busy.current = false;
    setLoading(false);
    setToken("");
    setVerification((v) => v + 1);
  }, []);
  const clear = useCallback(() => {
    cancel();
    setMessages([]);
    setDraft("");
    setConsent(false);
    setError("");
    setRetry(null);
    try {
      localStorage.removeItem(STORAGE.history);
    } catch {
      setStorageError(true);
    }
  }, [cancel]);
  const loadConfig = useCallback(async () => {
    configRequest.current?.abort();
    const controller = new AbortController();
    configRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch("/api/config", {
        cache: "no-store",
        signal: controller.signal,
      });
      const value = (await response.json()) as AppConfig;
      if (
        !response.ok ||
        !["live", "demo"].includes(value.mode) ||
        value.maxMessageLength !== MAX_MESSAGE_LENGTH ||
        value.maxContextCharacters !== MAX_CONTEXT_CHARACTERS ||
        !(
          value.turnstileSiteKey === null ||
          typeof value.turnstileSiteKey === "string"
        )
      )
        throw Error();
      if (configRequest.current !== controller) return;
      if (mode.current && mode.current !== value.mode) clear();
      mode.current = value.mode;
      setConfig(value);
      setConfigError(false);
    } catch {
      if (configRequest.current === controller) {
        setConfig((current) => current ?? demoConfig);
        setConfigError(true);
      }
    } finally {
      clearTimeout(timeout);
    }
  }, [clear]);
  useEffect(() => {
    void loadConfig();
    const online = () => void loadConfig();
    window.addEventListener("online", online);
    return () => {
      configRequest.current?.abort();
      configRequest.current = null;
      window.removeEventListener("online", online);
      request.current?.abort();
      session.current++;
    };
  }, [loadConfig]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = `IPPO · ${t.tagline}`;
    try {
      localStorage.setItem(STORAGE.preferences, JSON.stringify(preferences));
      localStorage.removeItem(STORAGE.step);
    } catch {
      setStorageError(true);
    }
  }, [preferences, locale, t.tagline]);
  useEffect(() => {
    try {
      if (saveHistory)
        localStorage.setItem(
          STORAGE.history,
          JSON.stringify({ locale, region, messages: messages.slice(-60) }),
        );
      else localStorage.removeItem(STORAGE.history);
    } catch {
      setStorageError(true);
    }
  }, [messages, locale, region, saveHistory]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [messages, loading, error]);
  useEffect(() => {
    if (input.current) {
      input.current.style.height = "auto";
      input.current.style.height = `${Math.min(input.current.scrollHeight, 120)}px`;
    }
  }, [draft]);
  useEffect(() => {
    const vv = window.visualViewport;
    let baselineHeight = vv?.height ?? innerHeight;
    let keyboardWasOpen = false;
    const resize = () => {
      const visibleHeight = vv?.height ?? innerHeight;
      const inputFocused = document.activeElement === input.current;
      if (!inputFocused) baselineHeight = visibleHeight;
      const keyboardOpen =
        inputFocused && baselineHeight - visibleHeight > 120;

      document.documentElement.style.setProperty(
        "--app-height",
        `${visibleHeight}px`,
      );
      document.documentElement.style.setProperty(
        "--app-top",
        `${vv?.offsetTop ?? 0}px`,
      );
      if (keyboardOpen) {
        document.documentElement.dataset.keyboardOpen = "true";
        if (!keyboardWasOpen) {
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              end.current?.scrollIntoView({ block: "nearest", behavior: "instant" }),
            ),
          );
        }
      } else {
        delete document.documentElement.dataset.keyboardOpen;
      }
      keyboardWasOpen = keyboardOpen;
    };
    resize();
    vv?.addEventListener("resize", resize);
    vv?.addEventListener("scroll", resize);
    window.addEventListener("resize", resize);
    document.addEventListener("focusin", resize);
    document.addEventListener("focusout", resize);
    return () => {
      vv?.removeEventListener("resize", resize);
      vv?.removeEventListener("scroll", resize);
      window.removeEventListener("resize", resize);
      document.removeEventListener("focusin", resize);
      document.removeEventListener("focusout", resize);
      delete document.documentElement.dataset.keyboardOpen;
    };
  }, []);
  function changeLocale(value: Locale) {
    if (value === locale) return;
    if (messages.length && !confirm(t.clearChatQuestion)) return;
    clear();
    setPreferences((p) => ({ ...p, locale: value }));
  }
  function changeRegion(value: Region) {
    if (value === region) return;
    if (messages.length && !confirm(t.clearChatQuestion)) return;
    clear();
    setPreferences((p) => ({ ...p, region: value }));
  }
  function newChat() {
    if ((messages.length || draft) && !confirm(t.clearChatQuestion)) return;
    clear();
    menu.current?.close();
    input.current?.focus();
  }
  function updateMission(messageId: string, status: MissionState["status"]) {
    setMessages((current) =>
      current.map((m) =>
        m.id === messageId && m.mission
          ? { ...m, mission: { ...m.mission, status } }
          : m,
      ),
    );
  }
  async function send(previous?: DisplayMessage[]) {
    if (busy.current || !config || configError || pwa.offline || (!previous && !draft.trim()))
      return;
    if (isLive && (!consent || !token)) return;
    const next = previous ?? [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: "user" as const,
        content: draft.trim(),
        mode: config.mode,
      },
    ];
    const allowMission = canSuggestMission(next);
    const generation = session.current,
      controller = new AbortController();
    request.current = controller;
    busy.current = true;
    setLoading(true);
    setError("");
    setRetry(null);
    setMessages(next);
    setDraft("");
    const currentToken = token;
    setToken("");
    const timeout = setTimeout(() => controller.abort("timeout"), 45000);
    try {
      let answer: ChatResponse;
      if (config.mode === "demo") {
        const latest = next.at(-1)!.content,
          turn = next.filter((m) => m.role === "user").length - 1;
        const mission = allowMission ? demoMission(latest, turn) : undefined;
        answer = {
          mode: "demo",
          message: mission
            ? ko
              ? "지금 할 수 있는 아주 작은 일부터 시작해볼까요? 부담된다면 미뤄도 괜찮아요."
              : "今できそうな、小さなことから始めてみませんか。気が向かなければ、見送っても大丈夫です。"
            : getDemoReply(latest, locale, turn),
          mission,
        };
      } else {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            locale,
            region,
            consent: true,
            allowMission,
            turnstileToken: currentToken,
            messages: contextMessages(
              next.filter((m) => m.mode !== "demo"),
              config.maxContextCharacters,
            ),
          }),
        });
        const value = (await response.json()) as ChatResponse & {
          code?: string;
        };
        if (!response.ok) throw Error(value.code || "provider_unavailable");
        if (
          value.mode !== "live" ||
          typeof value.message !== "string" ||
          !value.message.trim() ||
          value.message.length > MAX_MESSAGE_LENGTH
        )
          throw Error("provider_unavailable");
        answer = value;
      }
      if (session.current !== generation || controller.signal.aborted) return;
      setMessages((current) =>
        [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            content: answer.message,
            mode: answer.mode,
            ...(allowMission && isMissionId(answer.mission) &&
            !current.some((m) => m.mission?.status === "active")
              ? {
                  mission: { id: answer.mission, status: "suggested" as const },
                }
              : {}),
          },
        ].slice(-60),
      );
    } catch (caught) {
      if (session.current !== generation) return;
      if (controller.signal.aborted && controller.signal.reason !== "timeout")
        return;
      const labels: Record<string, string> = {
        daily_limit: t.dailyLimit,
        not_configured: t.notConfigured,
        verification_required: t.verificationError,
      };
      setError(
        labels[caught instanceof Error ? caught.message : ""] || t.error,
      );
      setRetry(next);
    } finally {
      clearTimeout(timeout);
      if (session.current === generation) {
        busy.current = false;
        setLoading(false);
        setToken("");
        setVerification((v) => v + 1);
      }
    }
  }
  const help =
    region === "JP"
      ? "https://www.mhlw.go.jp/mamorouyokokoro/"
      : "https://www.129.go.kr/109";
  return (
    <div className="conversation-app" lang={locale}>
      <header className="app-header">
        <a className="app-brand" href="#chat" aria-label="IPPO">
          <img
            src="/brand/ippo-wordmark.svg"
            width="1200"
            height="600"
            alt="IPPO"
          />
        </a>
        <div className="header-title">
          <strong>{t.chat}</strong>
          <span>
            {pwa.offline
              ? pt.offline
              : isLive
                ? ko
                  ? "당신의 속도로, 함께"
                  : "あなたのペースで"
                : t.demo}
          </span>
        </div>
        <div className="header-actions">
          <button
            aria-label={t.newConversation}
            title={t.newConversation}
            onClick={newChat}
          >
            <Plus size={20} />
          </button>
          <button
            aria-label={ko ? "메뉴" : "メニュー"}
            title={ko ? "메뉴" : "メニュー"}
            onClick={() => menu.current?.showModal()}
          >
            <MoreHorizontal size={23} />
          </button>
        </div>
      </header>
      {pwa.offline && (
        <div className="connection-banner" role="status">
          {pt.offlineText}
        </div>
      )}
      {configError && !pwa.offline && (
        <div className="connection-banner" role="status">
          <span>{pt.connectionError}</span><button onClick={() => void loadConfig()}>{t.retryConnection}</button>
        </div>
      )}
      {pwa.update && (
        <div className="connection-banner" role="status">
          <span>{pt.update}</span>
          <button
            onClick={() => {
              if ((!draft && !messages.length) || confirm(pt.updateWarning))
                pwa.applyUpdate();
            }}
          >
            {pt.apply}
          </button>
        </div>
      )}
      <main className="conversation-scroll" aria-label={t.chat}>
        {!messages.length ? (
          <div className="conversation-welcome">
            <BrandMark className="welcome-symbol" />
            <span className="welcome-overline">
              {ko ? "천천히, 이야기해요" : "ゆっくり、おはなししよう。"}
            </span>
            <h1>{t.heading}</h1>
            <p>
              {ko
                ? "정리되지 않은 마음도 괜찮아요.\n이야기 속에서 작은 한 걸음을 찾아봐요."
                : "まとまらない気持ちも、そのままで。\nおはなしの中から、小さな一歩を。"}
            </p>
            <div className="conversation-prompts">
              {t.prompts.slice(0, 2).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setDraft(prompt);
                    input.current?.focus();
                  }}
                >
                  {prompt}
                  <Plus size={15} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="conversation-messages"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.map((message) => (
              <article
                id={`message-${message.id}`}
                key={message.id}
                className={`message-row ${message.role}`}
              >
                {message.role === "assistant" && (
                  <BrandMark className="message-avatar" />
                )}
                <div className="message-content">
                  {message.role === "assistant" && (
                    <div className="message-author">
                      IPPO{" "}
                      <span>
                        {message.mode === "demo"
                          ? t.responseDemo
                          : t.responseAI}
                      </span>
                    </div>
                  )}
                  <div className="message-bubble">{message.content}</div>
                  {message.mission &&
                    (() => {
                      const m = missionContent(message.mission.id, locale),
                        status = message.mission.status;
                      return (
                        <section
                          className={`inline-mission ${status}`}
                          aria-label={
                            ko ? "이야기 속 작은 미션" : "おはなしの小さな一歩"
                          }
                        >
                          <div className="mission-eyebrow">
                            <Sprout size={16} />
                            <span>
                              {ko
                                ? "이야기 속 작은 한 걸음"
                                : "おはなしから、小さな一歩"}
                            </span>
                            <small>
                              <Clock3 size={12} />
                              {m.duration}
                              {ko ? "분" : "分"}
                            </small>
                          </div>
                          <h2>{m.title}</h2>
                          <p>{m.body}</p>
                          {status === "completed" ? (
                            <div className="mission-result" role="status">
                              <Check size={17} />
                              {ko
                                ? "해냈어요. 이 한 걸음이면 충분해요."
                                : "できました。この一歩で十分です。"}
                            </div>
                          ) : status === "deferred" ? (
                            <div className="mission-result">
                              {ko
                                ? "괜찮아요. 마음이 내킬 때 다시 해봐요."
                                : "大丈夫。また気が向いたときに。"}
                            </div>
                          ) : (
                            <div className="mission-actions">
                              <button
                                className="mission-primary"
                                disabled={status === "suggested" && !!active}
                                onClick={() =>
                                  updateMission(
                                    message.id,
                                    status === "active"
                                      ? "completed"
                                      : "active",
                                  )
                                }
                              >
                                {status === "active"
                                  ? t.completeStep
                                  : ko
                                    ? "시작하기"
                                    : "やってみる"}
                              </button>
                              <button
                                onClick={() =>
                                  updateMission(message.id, "deferred")
                                }
                              >
                                {ko ? "나중에 할게요" : "また今度"}
                              </button>
                            </div>
                          )}
                        </section>
                      );
                    })()}
                </div>
              </article>
            ))}
            {loading && (
              <div className="reply-loading" role="status">
                <LoaderCircle size={16} />
                {t.sending}
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="conversation-error" role="alert">
            <p>{error}</p>
            {retry && (
              <button
                disabled={
                  loading || configError || pwa.offline || (isLive && (!consent || !token))
                }
                onClick={() => void send(retry)}
              >
                {t.retry}
              </button>
            )}
          </div>
        )}
        <div ref={end} />
      </main>
      <footer className="conversation-footer">
        {active?.mission && (
          <button
            className="active-step"
            onClick={() =>
              document
                .getElementById(`message-${active.id}`)
                ?.scrollIntoView({ block: "center", behavior: "instant" })
            }
          >
            <Sprout size={16} />
            <span>{missionContent(active.mission.id, locale).title}</span>
            <small>{ko ? "진행 중" : "取り組み中"}</small>
            <ChevronDown size={14} />
          </button>
        )}
        {isLive && !consent && (
          <label className="chat-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>{t.consent}</span>
          </label>
        )}
        {isLive && consent && config?.turnstileSiteKey && (
          <Turnstile
            key={verification}
            siteKey={config.turnstileSiteKey}
            locale={locale}
            onToken={setToken}
          />
        )}
        {isLive && !config?.turnstileSiteKey && (
          <p className="conversation-error" role="alert">
            {t.verificationError}
          </p>
        )}
        <form
          className="conversation-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            aria-label={t.placeholder}
            placeholder={t.placeholder}
            disabled={loading}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                !composing.current &&
                e.keyCode !== 229
              ) {
                e.preventDefault();
                void send();
              }
            }}
          />
          {loading ? (
            <button
              type="button"
              className="send-button"
              aria-label={t.cancel}
              onClick={cancel}
            >
              <X size={20} />
            </button>
          ) : (
            <button
              type="submit"
              className="send-button"
              aria-label={t.send}
              disabled={
                !draft.trim() ||
                !config ||
                configError || pwa.offline ||
                (isLive && (!consent || !token))
              }
            >
              <ArrowUp size={21} />
            </button>
          )}
        </form>
        <p className="composer-caption">
          {!isLive
            ? ko
              ? "체험 모드 · AI가 아닌 예시 답변이에요."
              : "体験モード · AIではなく、例文で応答します。"
            : t.disclaimer}
        </p>
      </footer>
      <dialog
        ref={menu}
        className="app-menu"
        onClick={(e) => {
          if (e.target === menu.current) menu.current.close();
        }}
      >
        <div className="menu-content">
          <header>
            <h2>{ko ? "이야기 설정" : "おはなしの設定"}</h2>
            <button
              aria-label={ko ? "닫기" : "閉じる"}
              onClick={() => menu.current?.close()}
            >
              <X size={21} />
            </button>
          </header>
          <label className="menu-row">
            <span>{t.language}</span>
            <select
              aria-label={t.language}
              value={locale}
              onChange={(e) => changeLocale(e.target.value as Locale)}
            >
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
          </label>
          <label className="menu-row">
            <span>{t.region}</span>
            <select
              aria-label={t.region}
              value={region}
              onChange={(e) => changeRegion(e.target.value as Region)}
            >
              <option value="JP">{t.japan}</option>
              <option value="KR">{t.korea}</option>
            </select>
          </label>
          <label className="menu-row">
            <span>{t.saveHistory}</span>
            <input
              type="checkbox"
              role="switch"
              checked={saveHistory}
              onChange={(e) =>
                setPreferences((p) => ({ ...p, saveHistory: e.target.checked }))
              }
            />
          </label>
          <p className="menu-note">
            {ko
              ? "기본은 저장하지 않아요. 켜면 대화와 미션이 이 브라우저에 남아요."
              : "初期設定では保存しません。オンにすると会話と一歩をこのブラウザに保存します。"}
          </p>
          <button
            className="menu-delete"
            onClick={() => {
              if (confirm(t.clearQuestion)) {
                clear();
                setPreferences((p) => ({ ...p, saveHistory: false }));
                menu.current?.close();
              }
            }}
          >
            {t.clear}
          </button>
          <details>
            <summary>{pt.app}</summary>
            <p>{pwa.installed ? pt.installed : pt.description}</p>
            {pwa.canInstall && (
              <button onClick={() => void pwa.install()}>{pt.install}</button>
            )}
            <p>{pt.iosSteps}</p>
            <p>{pt.androidSteps}</p>
            <p>
              {pwa.ready
                ? pt.ready
                : pwa.failed
                  ? pt.unavailable
                  : pt.preparing}
            </p>
          </details>
          {configError && (
            <button onClick={() => void loadConfig()}>
              {t.retryConnection}
            </button>
          )}
          {consent && (
            <button
              onClick={() => {
                cancel();
                setConsent(false);
              }}
            >
              {t.revokeConsent}
            </button>
          )}
          <a
            className="help-link"
            href={help}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.support} ↗
          </a>
          <p className="menu-note">{t.disclaimer}</p>
        </div>
      </dialog>
      {storageError && (
        <div className="storage-notice" role="alert">
          {t.storageError}
          <button aria-label={t.cancel} onClick={() => setStorageError(false)}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
