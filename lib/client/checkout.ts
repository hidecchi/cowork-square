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
    throw new Error(data.error ?? "決済の開始に失敗しました");
  }

  const checkoutId = data.checkout?.id;
  if (!checkoutId) {
    throw new Error("決済 ID を取得できませんでした");
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
    throw new Error(data.error ?? "決済状態の確認に失敗しました");
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
    throw new Error(data.error ?? "決済のキャンセルに失敗しました");
  }
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

export function pollCheckoutUntilDone(
  checkoutId: string,
  onStatus: (status: string) => void,
  options?: { intervalMs?: number; signal?: AbortSignal },
): Promise<"completed" | "canceled"> {
  const intervalMs = options?.intervalMs ?? 2000;
  const signal = options?.signal;

  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const stop = (err?: unknown) => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      if (err) reject(err);
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
      if (signal?.aborted) {
        stop(new DOMException("Aborted", "AbortError"));
        return;
      }

      try {
        const { status } = await getCheckoutStatus(checkoutId, signal);
        if (signal?.aborted) {
          stop(new DOMException("Aborted", "AbortError"));
          return;
        }

        onStatus(status);

        if (status === "COMPLETED") {
          resolve("completed");
          return;
        }
        if (status === "CANCELED" || status === "CANCEL_REQUESTED") {
          resolve("canceled");
          return;
        }

        timer = setTimeout(() => {
          void tick();
        }, intervalMs);
      } catch (err) {
        stop(err);
      }
    };
    void tick();
  });
}
