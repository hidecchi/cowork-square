"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QuantityStepper } from "@/components/QuantityStepper";
import { fetchSellableProduct } from "@/lib/client/catalog";
import {
  cancelTerminalCheckout,
  createTerminalCheckout,
  isAbortError,
  pollCheckoutUntilDone,
} from "@/lib/client/checkout";
import { MAX_QUANTITY } from "@/lib/config";
import {
  PAYMENT_METHODS,
  type PaymentMethodOption,
  type PaymentType,
} from "@/lib/paymentMethods";
import type { SellableProduct } from "@/lib/types/catalog";

type Screen = "cart" | "payment" | "processing" | "complete" | "canceled";

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency,
  }).format(amount);
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "端末で決済を開始しています…",
  IN_PROGRESS: "決済処理中です。端末の指示に従ってください",
  COMPLETED: "決済が完了しました",
  CANCELED: "決済がキャンセルされました",
  CANCEL_REQUESTED: "キャンセル処理中…",
};

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <main className="main">{children}</main>
    </div>
  );
}

function PaymentIcon({ type }: { type: PaymentType }) {
  if (type === "QR_CODE") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3 3h8v8H3V3zm2 2v4h4V5H5zm6-2h2v2h-2V3zm4 0h6v6h-2V5h-2v2h-2V3zm-4 4h2v2h-2V7zm4 2h2v2h-2V9zm2 2h4v2h-4v-2zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10-2h2v2h-2v-2zm4 0h2v8h-6v-2h4v-6zm-4 4h2v4h-2v-4z"
        />
      </svg>
    );
  }

  if (type === "CARD_PRESENT") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11zM5.5 6a.5.5 0 0 0-.5.5V8h14V6.5a.5.5 0 0 0-.5-.5h-13zM5 11v6.5a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V11H5zm2 3h4v2H7v-2z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm0 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 2.25a4.75 4.75 0 1 1 0 9.5 4.75 4.75 0 0 1 0-9.5z"
      />
    </svg>
  );
}

function RestartButton({
  onClick,
  busy = false,
}: {
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      className="ghost-btn"
      onClick={onClick}
      disabled={busy}
    >
      {busy ? "キャンセルしています…" : "はじめからやり直す"}
    </button>
  );
}

export function CheckoutApp() {
  const [product, setProduct] = useState<SellableProduct | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [screen, setScreen] = useState<Screen>("cart");
  const [quantity, setQuantity] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<PaymentType | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

  const checkoutIdRef = useRef<string | null>(null);
  const inFlightCheckoutRef = useRef<Promise<string> | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const sessionRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    fetchSellableProduct()
      .then((p) => {
        if (!cancelled) setProduct(p);
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogError(
            err instanceof Error ? err.message : "商品の読み込みに失敗しました",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const total = product !== null ? product.unitPrice * quantity : 0;

  const resetToCart = useCallback(() => {
    sessionRef.current += 1;
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    pollAbortRef.current?.abort();
    pollAbortRef.current = null;
    checkoutIdRef.current = null;
    setCheckoutId(null);
    setScreen("cart");
    setQuantity(1);
    setSelectedPayment(null);
    setStatusMessage("");
    setError(null);
    setRestarting(false);
  }, []);

  const startOver = async () => {
    if (restarting) return;
    setRestarting(true);
    sessionRef.current += 1;
    pollAbortRef.current?.abort();

    try {
      if (screen === "processing") {
        let id = checkoutIdRef.current ?? checkoutId;
        if (!id && inFlightCheckoutRef.current) {
          try {
            id = await inFlightCheckoutRef.current;
            checkoutIdRef.current = id;
            setCheckoutId(id);
          } catch {
            id = null;
          }
        }
        if (id) {
          try {
            await cancelTerminalCheckout(id);
          } catch {
            // 完了済み・キャンセル済みでもカートに戻す
          }
        }
      }
    } finally {
      resetToCart();
    }
  };

  const startPayment = async (paymentType: PaymentType) => {
    if (!product) return;
    setError(null);
    setSelectedPayment(paymentType);
    setScreen("processing");
    setStatusMessage("決済を準備しています…");

    const session = sessionRef.current;
    const ac = new AbortController();
    pollAbortRef.current = ac;

    const createPromise = createTerminalCheckout(
      product,
      quantity,
      paymentType,
    );
    inFlightCheckoutRef.current = createPromise;

    try {
      const id = await createPromise;
      if (session !== sessionRef.current) return;
      checkoutIdRef.current = id;
      setCheckoutId(id);

      if (ac.signal.aborted) return;

      const result = await pollCheckoutUntilDone(
        id,
        (status) => {
          setStatusMessage(STATUS_LABEL[status] ?? "処理中…");
        },
        { signal: ac.signal },
      );

      if (session !== sessionRef.current || ac.signal.aborted) return;

      if (result === "completed") {
        setScreen("complete");
        resetTimerRef.current = window.setTimeout(resetToCart, 4000);
      } else {
        setScreen("canceled");
        resetTimerRef.current = window.setTimeout(resetToCart, 3500);
      }
    } catch (err) {
      if (
        session !== sessionRef.current ||
        isAbortError(err) ||
        ac.signal.aborted
      ) {
        return;
      }
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setScreen("payment");
      checkoutIdRef.current = null;
      setCheckoutId(null);
    } finally {
      if (inFlightCheckoutRef.current === createPromise) {
        inFlightCheckoutRef.current = null;
      }
    }
  };

  if (catalogLoading) {
    return (
      <AppShell>
        <section className="panel panel-center">
          <div className="spinner" aria-hidden="true" />
          <p className="status-text">商品情報を読み込んでいます…</p>
        </section>
      </AppShell>
    );
  }

  if (catalogError || !product) {
    return (
      <AppShell>
        <section className="panel panel-center">
          <h2 className="panel-title">商品を表示できません</h2>
          <p className="status-text">{catalogError ?? "不明なエラー"}</p>
          <button
            type="button"
            className="primary-btn"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {error && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}

      {screen === "cart" && (
        <section className="panel" aria-label="カート">
          <button
            type="button"
            className="line-item"
            onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
          >
            <div>
              <p className="product-name">{product.name}</p>
              <p className="product-meta">
                {formatMoney(product.unitPrice, product.currency)} / 単位 ·
                タップで追加
              </p>
            </div>
            <p className="line-item-price">
              {formatMoney(product.unitPrice * quantity, product.currency)}
            </p>
          </button>

          <div className="quantity-row">
            <span className="quantity-label">数量</span>
            <QuantityStepper
              quantity={quantity}
              max={MAX_QUANTITY}
              onChange={setQuantity}
            />
          </div>

          <div className="summary">
            <div className="summary-row">
              <span>小計</span>
              <span>{formatMoney(total, product.currency)}</span>
            </div>
            <div className="summary-row summary-total">
              <span>合計</span>
              <strong className="total-amount">
                {formatMoney(total, product.currency)}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="primary-btn"
            onClick={() => setScreen("payment")}
          >
            お支払いへ進む
          </button>
        </section>
      )}

      {screen === "payment" && (
        <section className="panel" aria-labelledby="pay-title">
          <h2 id="pay-title" className="panel-title">
            お支払い方法
          </h2>
          <p className="panel-sub">
            合計 {formatMoney(total, product.currency)} ／ {quantity} ×{" "}
            {product.name}
          </p>
          <ul className="payment-list">
            {PAYMENT_METHODS.map((method: PaymentMethodOption) => (
              <li key={method.type}>
                <button
                  type="button"
                  className="payment-btn"
                  onClick={() => void startPayment(method.type)}
                >
                  <span className="payment-icon">
                    <PaymentIcon type={method.type} />
                  </span>
                  <span className="payment-copy">
                    <span className="payment-label">{method.label}</span>
                    {method.description ? (
                      <span className="payment-desc">{method.description}</span>
                    ) : null}
                  </span>
                  <span className="payment-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setScreen("cart")}
          >
            数量を変更する
          </button>
          <RestartButton onClick={() => void startOver()} />
        </section>
      )}

      {(screen === "processing" ||
        screen === "complete" ||
        screen === "canceled") && (
        <section className="panel panel-center" aria-live="polite">
          {screen === "processing" && (
            <>
              <div className="spinner" aria-hidden="true" />
              <h2 className="panel-title">決済中</h2>
              <p className="status-text">{statusMessage}</p>
              {selectedPayment && (
                <p className="muted">
                  {
                    PAYMENT_METHODS.find((m) => m.type === selectedPayment)
                      ?.label
                  }
                </p>
              )}
              <RestartButton
                onClick={() => void startOver()}
                busy={restarting}
              />
            </>
          )}
          {screen === "complete" && (
            <>
              <div className="icon-success" aria-hidden="true">
                ✓
              </div>
              <h2 className="panel-title">ありがとうございました</h2>
              <p className="status-text">決済が完了しました</p>
              <RestartButton onClick={() => void startOver()} />
            </>
          )}
          {screen === "canceled" && (
            <>
              <div className="icon-cancel" aria-hidden="true">
                ×
              </div>
              <h2 className="panel-title">キャンセルされました</h2>
              <p className="status-text">最初の画面に戻ります…</p>
              <RestartButton onClick={() => void startOver()} />
            </>
          )}
        </section>
      )}
    </AppShell>
  );
}
