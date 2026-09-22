import { useEffect, useRef, useState } from "react";
import {
  ANONYMOUS,
  loadTossPayments,
  type TossPaymentsWidgets,
  type WidgetAgreementWidget,
  type WidgetPaymentMethodWidget,
} from "@tosspayments/tosspayments-sdk";
import { Check, CreditCard, LoaderCircle, ShieldCheck, X } from "lucide-react";
import type { Locale } from "./shared";

// Toss Payments' public documentation key. It can only create test payments.
const TEST_CLIENT_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";
const DEMO_AMOUNT = 1000;

type PaymentResult = "success" | "fail" | null;

export default function PaymentDemo({
  locale,
  result,
  onClose,
  onGranted,
  onBeforeRedirect,
}: {
  locale: Locale;
  result: PaymentResult;
  onClose: () => void;
  onGranted: () => void;
  onBeforeRedirect: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    result ? "ready" : "loading",
  );
  const [requesting, setRequesting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [orderId, setOrderId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [confirmation, setConfirmation] = useState<
    "confirming" | "granted" | "failed"
  >(result === "success" ? "confirming" : "failed");
  const confirmationStarted = useRef(false);
  const ko = locale === "ko";

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    if (confirmation !== "granted") return;
    const timer = window.setTimeout(() => dialog.current?.close(), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmation]);

  useEffect(() => {
    if (result) return;
    let disposed = false;
    let paymentMethods: WidgetPaymentMethodWidget | undefined;
    let agreement: WidgetAgreementWidget | undefined;
    setStatus("loading");
    setWidgets(null);
    setLoadError("");
    document.querySelector("#ippo-payment-methods")?.replaceChildren();
    document.querySelector("#ippo-payment-agreement")?.replaceChildren();

    void (async () => {
      try {
        const [tossPayments, orderResponse] = await Promise.all([
          loadTossPayments(TEST_CLIENT_KEY),
          fetch("/api/demo-topup/order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locale }),
          }),
        ]);
        const order = (await orderResponse.json()) as {
          orderId?: string;
          amount?: number;
          code?: string;
        };
        if (
          !orderResponse.ok ||
          typeof order.orderId !== "string" ||
          order.amount !== DEMO_AMOUNT
        ) {
          throw Error(order.code || "payment_unavailable");
        }
        const nextWidgets = tossPayments.widgets({ customerKey: ANONYMOUS });
        await nextWidgets.setAmount({ currency: "KRW", value: order.amount });
        [paymentMethods, agreement] = await Promise.all([
          nextWidgets.renderPaymentMethods({
            selector: "#ippo-payment-methods",
            variantKey: "DEFAULT",
          }),
          nextWidgets.renderAgreement({
            selector: "#ippo-payment-agreement",
            variantKey: "AGREEMENT",
          }),
        ]);
        if (!disposed) {
          setOrderId(order.orderId);
          setWidgets(nextWidgets);
          setStatus("ready");
        }
      } catch (caught) {
        if (!disposed) {
          setLoadError(caught instanceof Error ? caught.message : "payment_unavailable");
          setStatus("error");
        }
      }
    })();

    return () => {
      disposed = true;
      void paymentMethods?.destroy().catch(() => undefined);
      void agreement?.destroy().catch(() => undefined);
    };
  }, [attempt, locale, result]);

  useEffect(() => {
    if (result !== "success" || confirmationStarted.current) return;
    confirmationStarted.current = true;
    const params = new URLSearchParams(location.search);
    const paymentKey = params.get("paymentKey");
    const returnedOrderId = params.get("orderId");
    const amount = Number(params.get("amount"));
    if (!paymentKey || !returnedOrderId || amount !== DEMO_AMOUNT) {
      setConfirmation("failed");
      return;
    }
    void (async () => {
      try {
        const response = await fetch("/api/demo-topup/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            paymentKey,
            orderId: returnedOrderId,
            amount,
          }),
        });
        const value = (await response.json()) as {
          granted?: boolean;
          extraUses?: number;
        };
        if (!response.ok || value.granted !== true || value.extraUses !== 10) {
          throw Error("payment_failed");
        }
        setConfirmation("granted");
        onGranted();
      } catch {
        setConfirmation("failed");
      }
    })();
  }, [locale, onGranted, result]);

  async function requestDemoPayment() {
    if (!widgets || !orderId || requesting) return;
    setRequesting(true);
    try {
      onBeforeRedirect();
      const params = new URLSearchParams({ paymentDemo: "success" });
      const failParams = new URLSearchParams({ paymentDemo: "fail" });
      await widgets.requestPayment({
        orderId,
        orderName: ko ? "잇포 추가 대화 10회 (데모)" : "いっぽ 追加10回（デモ）",
        successUrl: `${location.origin}${location.pathname}?${params}`,
        failUrl: `${location.origin}${location.pathname}?${failParams}`,
        windowTarget: "self",
      });
    } catch {
      setRequesting(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className={`payment-demo${result ? " payment-demo--result" : ""}`}
      aria-labelledby="payment-demo-title"
      onClose={onClose}
    >
      {!result && <header className="payment-demo-header">
        <div>
          <span className="payment-demo-badge">TOSS PAYMENTS · TEST</span>
          <h2 id="payment-demo-title">
            {ko ? "대화 이용권 결제 데모" : "追加トーク決済デモ"}
          </h2>
        </div>
        <button
          type="button"
          aria-label={ko ? "결제 데모 닫기" : "決済デモを閉じる"}
          onClick={() => dialog.current?.close()}
        >
          <X size={20} />
        </button>
      </header>}

      {result ? (
        <section className="payment-demo-result" role="status">
          {result === "success" && confirmation === "confirming" ? (
            <LoaderCircle className="verification-spinner" size={28} />
          ) : confirmation === "granted" ? (
            <Check size={28} />
          ) : (
            <CreditCard size={28} />
          )}
          <div className="payment-demo-result-copy">
          <h3 id="payment-demo-title">
            {result === "success" && confirmation === "confirming"
              ? ko
                ? "테스트 결제를 확인하고 있어요"
                : "テスト決済を確認しています"
              : confirmation === "granted"
                ? ko
                  ? "결제 성공"
                  : "決済成功"
                : ko
                ? "테스트 결제가 완료되지 않았어요"
                : "テスト決済は完了しませんでした"}
          </h3>
          <p className="payment-demo-result-primary">
            {confirmation === "granted"
              ? ko
                ? "대화 가능 횟수 10회 추가"
                : "トーク可能回数を10回追加"
              : confirmation === "confirming"
                ? ko
                  ? "결제 정보와 주문 금액을 서버에서 확인한 뒤 횟수를 추가합니다."
                  : "決済情報と注文金額をサーバーで確認してから回数を追加します。"
                : ko
                  ? "결제 정보를 확인할 수 없어 대화 횟수가 추가되지 않았어요. 다시 시도해주세요."
                  : "決済情報を確認できず、回数は追加されませんでした。もう一度お試しください。"}
          </p>
          {confirmation === "granted" && <small>{ko ? "잠시 후 대화로 돌아가요. · 테스트 결제" : "まもなく会話に戻ります。· テスト決済"}</small>}
          </div>
          {confirmation !== "confirming" && (
            <button type="button" onClick={() => dialog.current?.close()}>
              {ko ? "대화로 돌아가기" : "会話に戻る"}
            </button>
          )}
        </section>
      ) : (
        <div className="payment-demo-body">
          <section className="payment-demo-product">
            <div>
              <small>{ko ? "추가 대화" : "追加トーク"}</small>
              <strong>{ko ? "10회" : "10回"}</strong>
            </div>
            <div>
              <small>{ko ? "표시용 데모 금액" : "表示用デモ金額"}</small>
              <strong>₩1,000</strong>
            </div>
          </section>
          <p className="payment-demo-notice">
            <ShieldCheck size={16} />
            <span>
              {ko
                ? "공식 테스트 결제라 실제 금액은 차감되지 않아요. 성공하면 오늘의 AI 대화 10회가 추가돼요."
                : "公式テスト決済のため実際の請求はありません。成功すると本日のAIトークが10回追加されます。"}
            </span>
          </p>

          {status === "loading" && (
            <div className="payment-demo-loading" role="status">
              <LoaderCircle size={20} />
              {ko ? "결제 수단을 불러오고 있어요" : "決済方法を読み込んでいます"}
            </div>
          )}
          {status === "error" && (
            <div className="payment-demo-load-error" role="alert">
              <p>
                {ko
                  ? loadError === "topup_already_used"
                    ? "오늘 받을 수 있는 데모 추가 대화 10회를 이미 받았어요."
                    : "결제 데모를 불러오지 못했어요. 연결을 확인해주세요."
                  : loadError === "topup_already_used"
                    ? "本日のデモ追加10回はすでに受け取り済みです。"
                    : "決済デモを読み込めませんでした。接続をご確認ください。"}
              </p>
              <button type="button" onClick={() => setAttempt((value) => value + 1)}>
                {ko ? "다시 불러오기" : "もう一度読み込む"}
              </button>
            </div>
          )}
          <div id="ippo-payment-methods" />
          <div id="ippo-payment-agreement" />
          <button
            className="payment-demo-submit"
            type="button"
            disabled={status !== "ready" || requesting}
            onClick={() => void requestDemoPayment()}
          >
            {requesting
              ? ko
                ? "테스트 결제창을 열고 있어요…"
                : "テスト決済画面を開いています…"
              : ko
                ? "데모 결제 진행하기"
                : "デモ決済へ進む"}
          </button>
          <p className="payment-demo-footnote">
            {ko
              ? "데모 추가는 같은 IP에서 하루 한 번만 받을 수 있고, 서비스 전체 일일 한도가 먼저 소진되면 이용이 제한될 수 있어요."
              : "デモ追加は同じIPで1日1回までです。サービス全体の1日上限が先に終了すると利用できない場合があります。"}
          </p>
        </div>
      )}
    </dialog>
  );
}
