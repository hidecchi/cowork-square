"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LanguageSwitch } from "@/components/LanguageSwitch";
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
  DEFAULT_LOCALE,
  displayProductName,
  formatMoney,
  isLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
  messages,
  resolveMessage,
  statusMessage,
} from "@/lib/i18n";
import { PAYMENT_METHODS, type PaymentType } from "@/lib/paymentMethods";
import type { SellableProduct } from "@/lib/types/catalog";

type Screen = "cart" | "payment" | "processing" | "complete" | "canceled";

function AppShell({
  locale,
  onLocaleChange,
  children,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="app">
      <div className="lang-bar">
        <LanguageSwitch locale={locale} onChange={onLocaleChange} />
      </div>
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
  label,
  busyLabel,
}: {
  onClick: () => void;
  busy?: boolean;
  label: string;
  busyLabel: string;
}) {
  return (
    <button
      type="button"
      className="ghost-btn"
      onClick={onClick}
      disabled={busy}
    >
      {busy ? busyLabel : label}
    </button>
  );
}

export function CheckoutApp() {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const t = messages[locale];

  const [product, setProduct] = useState<SellableProduct | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [screen, setScreen] = useState<Screen>("cart");
  const [quantity, setQuantity] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<PaymentType | null>(
    null,
  );
  const [checkoutStatus, setCheckoutStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

  const checkoutIdRef = useRef<string | null>(null);
  const inFlightCheckoutRef = useRef<Promise<string> | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const sessionRef = useRef(0);
  const paymentLockRef = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(saved)) setLocale(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const changeLocale = (next: Locale) => {
    setLocale(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  };

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
            err instanceof Error ? err.message : "catalogLoadFailed",
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
    paymentLockRef.current = false;
    setCheckoutId(null);
    setScreen("cart");
    setQuantity(1);
    setSelectedPayment(null);
    setCheckoutStatus("");
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
    if (!product || paymentLockRef.current) return;
    paymentLockRef.current = true;

    setError(null);
    setSelectedPayment(paymentType);
    setScreen("processing");
    setCheckoutStatus("PREPARING");

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
          setCheckoutStatus(status);
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

      const id = checkoutIdRef.current;
      if (id) {
        try {
          await cancelTerminalCheckout(id);
        } catch {
          // 完了済み・キャンセル済みでも支払い画面に戻す
        }
      }

      if (session !== sessionRef.current) return;

      paymentLockRef.current = false;
      setError(err instanceof Error ? err.message : "genericError");
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
      <AppShell locale={locale} onLocaleChange={changeLocale}>
        <section className="panel panel-center">
          <div className="spinner" aria-hidden="true" />
          <p className="status-text">{t.loadingCatalog}</p>
        </section>
      </AppShell>
    );
  }

  if (catalogError || !product) {
    return (
      <AppShell locale={locale} onLocaleChange={changeLocale}>
        <section className="panel panel-center">
          <h2 className="panel-title">{t.catalogUnavailable}</h2>
          <p className="status-text">
            {resolveMessage(t, catalogError, t.unknownError)}
          </p>
          <button
            type="button"
            className="primary-btn"
            onClick={() => window.location.reload()}
          >
            {t.reload}
          </button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell locale={locale} onLocaleChange={changeLocale}>
      {error && (
        <div className="banner banner-error" role="alert">
          {resolveMessage(t, error, t.genericError)}
        </div>
      )}

      {screen === "cart" && (
        <section className="panel" aria-label={t.cart}>
          <button
            type="button"
            className="line-item"
            onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
          >
            <div>
              <p className="product-name">
                {displayProductName(product.name, locale)}
              </p>
              <p className="product-meta">
                {formatMoney(product.unitPrice, product.currency, locale)}{" "}
                {t.perUnitTapToAdd}
              </p>
            </div>
            <p className="line-item-price">
              {formatMoney(
                product.unitPrice * quantity,
                product.currency,
                locale,
              )}
            </p>
          </button>

          <div className="quantity-row">
            <span className="quantity-label">{t.quantity}</span>
            <QuantityStepper
              quantity={quantity}
              max={MAX_QUANTITY}
              onChange={setQuantity}
              decreaseLabel={t.decreaseQuantity}
              increaseLabel={t.increaseQuantity}
            />
          </div>

          <div className="summary">
            <div className="summary-row summary-total">
              <span>{t.total}</span>
              <strong className="total-amount">
                {formatMoney(total, product.currency, locale)}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="primary-btn"
            onClick={() => setScreen("payment")}
          >
            {t.continueToPayment}
          </button>
        </section>
      )}

      {screen === "payment" && (
        <section className="panel" aria-labelledby="pay-title">
          <div className="panel-head">
            <h2 id="pay-title" className="panel-title">
              {t.paymentMethods}
            </h2>
            <p className="panel-head-total">
              {t.total} {formatMoney(total, product.currency, locale)}
            </p>
          </div>
          <ul className="payment-list">
            {PAYMENT_METHODS.map((type: PaymentType) => {
              const copy = t.payments[type];
              return (
                <li key={type}>
                  <button
                    type="button"
                    className="payment-btn"
                    onClick={() => void startPayment(type)}
                  >
                    <span className="payment-icon">
                      <PaymentIcon type={type} />
                    </span>
                    <span className="payment-copy">
                      <span className="payment-label">{copy.label}</span>
                      {copy.description ? (
                        <span className="payment-desc">{copy.description}</span>
                      ) : null}
                    </span>
                    <span className="payment-chevron" aria-hidden="true">
                      ›
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setScreen("cart")}
          >
            {t.changeQuantity}
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
              <h2 className="panel-title">{t.processing}</h2>
              <p className="status-text">{statusMessage(t, checkoutStatus)}</p>
              {selectedPayment && (
                <p className="muted">{t.payments[selectedPayment].label}</p>
              )}
              <RestartButton
                onClick={() => void startOver()}
                busy={restarting}
                label={t.startOver}
                busyLabel={t.canceling}
              />
            </>
          )}
          {screen === "complete" && (
            <>
              <div className="icon-success" aria-hidden="true">
                ✓
              </div>
              <h2 className="panel-title">{t.thankYou}</h2>
              <p className="status-text">{t.paymentComplete}</p>
              <RestartButton
                onClick={() => void startOver()}
                label={t.startOver}
                busyLabel={t.canceling}
              />
            </>
          )}
          {screen === "canceled" && (
            <>
              <div className="icon-cancel" aria-hidden="true">
                ×
              </div>
              <h2 className="panel-title">{t.paymentCanceled}</h2>
              <p className="status-text">{t.returningToStart}</p>
              <RestartButton
                onClick={() => void startOver()}
                label={t.startOver}
                busyLabel={t.canceling}
              />
            </>
          )}
        </section>
      )}
    </AppShell>
  );
}
