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
}: {
  locale: Locale;
  result: PaymentResult;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    result ? "ready" : "loading",
  );
  const [requesting, setRequesting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const ko = locale === "ko";

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    if (result) return;
    let disposed = false;
    let paymentMethods: WidgetPaymentMethodWidget | undefined;
    let agreement: WidgetAgreementWidget | undefined;
    setStatus("loading");
    setWidgets(null);
    document.querySelector("#ippo-payment-methods")?.replaceChildren();
    document.querySelector("#ippo-payment-agreement")?.replaceChildren();

    void (async () => {
      try {
        const tossPayments = await loadTossPayments(TEST_CLIENT_KEY);
        const nextWidgets = tossPayments.widgets({ customerKey: ANONYMOUS });
        await nextWidgets.setAmount({ currency: "KRW", value: DEMO_AMOUNT });
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
          setWidgets(nextWidgets);
          setStatus("ready");
        }
      } catch {
        if (!disposed) setStatus("error");
      }
    })();

    return () => {
      disposed = true;
      void paymentMethods?.destroy().catch(() => undefined);
      void agreement?.destroy().catch(() => undefined);
    };
  }, [attempt, result]);

  async function requestDemoPayment() {
    if (!widgets || requesting) return;
    setRequesting(true);
    try {
      const params = new URLSearchParams({ paymentDemo: "success" });
      const failParams = new URLSearchParams({ paymentDemo: "fail" });
      await widgets.requestPayment({
        orderId: `IPPO_DEMO_${crypto.randomUUID().replaceAll("-", "")}`,
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
      className="payment-demo"
      aria-labelledby="payment-demo-title"
      onClose={onClose}
    >
      <header className="payment-demo-header">
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
      </header>

      {result ? (
        <section className="payment-demo-result" role="status">
          {result === "success" ? <Check size={28} /> : <CreditCard size={28} />}
          <h3>
            {result === "success"
              ? ko
                ? "테스트 결제 화면에서 돌아왔어요"
                : "テスト決済画面から戻りました"
              : ko
                ? "테스트 결제가 완료되지 않았어요"
                : "テスト決済は完了しませんでした"}
          </h3>
          <p>
            {ko
              ? "승인 서버를 연결하지 않은 데모라 실제 결제나 대화 횟수 추가는 발생하지 않아요."
              : "承認サーバー未接続のデモのため、実際の決済や利用回数の追加は行われません。"}
          </p>
          <button type="button" onClick={() => dialog.current?.close()}>
            {ko ? "대화로 돌아가기" : "会話に戻る"}
          </button>
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
                ? "토스페이먼츠 공식 테스트 키를 사용합니다. 실제로 결제되거나 이용권이 지급되지 않아요."
                : "Toss Paymentsの公式テストキーを使用します。実際の請求や利用回数の追加はありません。"}
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
                  ? "결제 데모를 불러오지 못했어요. 연결을 확인해주세요."
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
              ? "실제 판매를 시작하려면 가격 정책, 토스페이먼츠 계약, 서버 승인 및 이용권 지급 검증이 별도로 필요해요."
              : "実販売には、価格設定・加盟店契約・サーバー承認・利用回数付与の検証が別途必要です。"}
          </p>
        </div>
      )}
    </dialog>
  );
}
