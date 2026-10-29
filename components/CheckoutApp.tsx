"use client";

import { useCallback, useEffect, useState } from "react";
import { QuantityStepper } from "@/components/QuantityStepper";
import { fetchSellableProduct } from "@/lib/client/catalog";
import {
  createTerminalCheckout,
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

  const total = product !== null ? product.unitPrice * quantity : 0;

  const resetToCart = useCallback(() => {
    setScreen("cart");
    setQuantity(1);
    setSelectedPayment(null);
    setStatusMessage("");
    setError(null);
  }, []);

  const startPayment = async (paymentType: PaymentType) => {
    if (!product) return;
    setError(null);
    setSelectedPayment(paymentType);
    setScreen("processing");
    setStatusMessage("決済を準備しています…");

    try {
      const checkoutId = await createTerminalCheckout(
        product,
        quantity,
        paymentType,
      );
      const result = await pollCheckoutUntilDone(checkoutId, (status) => {
        setStatusMessage(STATUS_LABEL[status] ?? "処理中…");
      });

      if (result === "completed") {
        setScreen("complete");
        window.setTimeout(resetToCart, 4000);
      } else {
        setScreen("canceled");
        window.setTimeout(resetToCart, 3500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setScreen("payment");
    }
  };

  if (catalogLoading) {
    return (
      <div className="app">
        <section className="panel panel-center">
          <div className="spinner" aria-hidden="true" />
          <p className="status-text">Square カタログを読み込んでいます…</p>
        </section>
      </div>
    );
  }

  if (catalogError || !product) {
    return (
      <div className="app">
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
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <p className="eyebrow">Self Checkout</p>
        <h1>セルフレジ</h1>
      </header>

      <main className="main">
        {error && (
          <div className="banner banner-error" role="alert">
            {error}
          </div>
        )}

        {screen === "cart" && (
          <section className="panel" aria-labelledby="cart-title">
            <h2 id="cart-title" className="panel-title">
              ご利用内容
            </h2>
            <button
              type="button"
              className="product-card"
              onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
            >
              <div>
                <p className="product-name">{product.name}</p>
                <p className="product-price">
                  {formatMoney(product.unitPrice, product.currency)} / 単位
                </p>
              </div>
              <span className="product-hint">タップで +1</span>
            </button>

            <div className="quantity-row">
              <span className="quantity-label">数量</span>
              <QuantityStepper
                quantity={quantity}
                max={MAX_QUANTITY}
                onChange={setQuantity}
              />
            </div>

            <div className="total-row">
              <span>お支払い合計</span>
              <strong className="total-amount">
                {formatMoney(total, product.currency)}
              </strong>
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={() => setScreen("payment")}
            >
              お支払い方法を選ぶ
            </button>
          </section>
        )}

        {screen === "payment" && (
          <section className="panel" aria-labelledby="pay-title">
            <h2 id="pay-title" className="panel-title">
              お支払い方法
            </h2>
            <p className="panel-sub">
              合計 {formatMoney(total, product.currency)}（{quantity} ×{" "}
              {product.name}）
            </p>
            <ul className="payment-list">
              {PAYMENT_METHODS.map((method: PaymentMethodOption) => (
                <li key={method.type}>
                  <button
                    type="button"
                    className="payment-btn"
                    onClick={() => void startPayment(method.type)}
                  >
                    <span className="payment-label">{method.label}</span>
                    {method.description ? (
                      <span className="payment-desc">{method.description}</span>
                    ) : null}
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
              </>
            )}
            {screen === "complete" && (
              <>
                <div className="icon-success" aria-hidden="true">
                  ✓
                </div>
                <h2 className="panel-title">ありがとうございました</h2>
                <p className="status-text">決済が完了しました</p>
              </>
            )}
            {screen === "canceled" && (
              <>
                <h2 className="panel-title">キャンセルされました</h2>
                <p className="status-text">最初の画面に戻ります…</p>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
