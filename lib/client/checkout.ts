import {
  CHECKOUT_POLL_INTERVAL_MS,
  CHECKOUT_POLL_MAX_CONSECUTIVE_ERRORS,
} from "@/lib/config";
import type { PaymentType } from "@/lib/paymentMethods";
import type { SellableProduct } from "@/lib/types/catalog";

function apiHeaders(json = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const key = process.env.NEXT_PUBLIC_API_KEY;
  if (key) headers["X-Api-Key"] = key;
  return headers;
}

type TerminalCheckoutResponse = {
  checkout?: { id?: string };
  error?: string;
};

type CheckoutStatusResponse = {
  status: string;
  error?: string;
};

export async function createTerminalCheckout(
  product: SellableProduct,
  quantity: number,
  paymentType: PaymentType,
): Promise<string> {
  const amount = product.unitPrice * quantity;

  const res = await fetch("/api/create-terminal-checkout", {
    method: "POST",
    headers: {
      ...apiHeaders(true),
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      amountMoney: { amount, currency: product.currency },
      paymentType,
      order: {
        lineItems: [
          {
            catalog_object_id: product.catalogObjectId,
            quantity: String(quantity),
            name: product.name,
            base_price_money: {
              amount: product.unitPrice,
              currency: product.currency,
            },
          },
        ],
      },
      note: "cowork-square セルフレジ",
    }),
  });

  const data = (await res.json()) as TerminalCheckoutResponse;
  if (!res.ok) {
    throw new Error(data.error ?? "checkoutStartFailed");
  }

  const checkoutId = data.checkout?.id;
  if (!checkoutId) {
    throw new Error("checkoutIdMissing");
  }
  return checkoutId;
}

export async function getCheckoutStatus(
  checkoutId: string,
  signal?: AbortSignal,
): Promise<CheckoutStatusResponse> {
  const qs = new URLSearchParams({ checkoutId });
  const res = await fetch(`/api/get-checkout-status?${qs}`, {
    headers: apiHeaders(),
    signal,
  });
  const data = (await res.json()) as CheckoutStatusResponse;
  if (!res.ok) {
    throw new Error(data.error ?? "checkoutStatusFailed");
  }
  return data;
}

export async function cancelTerminalCheckout(
  checkoutId: string,
): Promise<void> {
  const res = await fetch("/api/cancel-terminal-checkout", {
    method: "POST",
    headers: apiHeaders(true),
    body: JSON.stringify({ checkoutId }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "checkoutCancelFailed");
  }
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

export function pollCheckoutUntilDone(
  checkoutId: string,
  onStatus: (status: string) => void,
  options?: {
    intervalMs?: number;
    maxConsecutiveErrors?: number;
    signal?: AbortSignal;
  },
): Promise<"completed" | "canceled"> {
  const intervalMs = options?.intervalMs ?? CHECKOUT_POLL_INTERVAL_MS;
  const maxConsecutiveErrors =
    options?.maxConsecutiveErrors ?? CHECKOUT_POLL_MAX_CONSECUTIVE_ERRORS;
  const signal = options?.signal;

  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let consecutiveErrors = 0;
    let settled = false;

    const clearTimer = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    };

    const stop = (err?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimer();
      if (err) reject(err);
    };

    const finish = (result: "completed" | "canceled") => {
      if (settled) return;
      settled = true;
      clearTimer();
      resolve(result);
    };

    if (signal?.aborted) {
      stop(new DOMException("Aborted", "AbortError"));
      return;
    }

    signal?.addEventListener(
      "abort",
      () => stop(new DOMException("Aborted", "AbortError")),
      { once: true },
    );

    const tick = async () => {
      if (settled) return;
      if (signal?.aborted) {
        stop(new DOMException("Aborted", "AbortError"));
        return;
      }

      try {
        const { status } = await getCheckoutStatus(checkoutId, signal);
        if (settled) return;
        if (signal?.aborted) {
          stop(new DOMException("Aborted", "AbortError"));
          return;
        }

        consecutiveErrors = 0;
        onStatus(status);

        if (status === "COMPLETED") {
          finish("completed");
          return;
        }
        if (status === "CANCELED") {
          finish("canceled");
          return;
        }

        timer = setTimeout(() => {
          void tick();
        }, intervalMs);
      } catch (err) {
        if (settled) return;
        if (isAbortError(err) || signal?.aborted) {
          stop(new DOMException("Aborted", "AbortError"));
          return;
        }

        consecutiveErrors += 1;
        if (consecutiveErrors >= maxConsecutiveErrors) {
          stop(err);
          return;
        }

        timer = setTimeout(() => {
          void tick();
        }, intervalMs);
      }
    };
    void tick();
  });
}
