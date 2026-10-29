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
): Promise<CheckoutStatusResponse> {
  const qs = new URLSearchParams({ checkoutId });
  const res = await fetch(`/api/get-checkout-status?${qs}`, {
    headers: apiHeaders(),
  });
  const data = (await res.json()) as CheckoutStatusResponse;
  if (!res.ok) {
    throw new Error(data.error ?? "決済状態の確認に失敗しました");
  }
  return data;
}

export function pollCheckoutUntilDone(
  checkoutId: string,
  onStatus: (status: string) => void,
  intervalMs = 2000,
): Promise<"completed" | "canceled"> {
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const { status } = await getCheckoutStatus(checkoutId);
        onStatus(status);

        if (status === "COMPLETED") {
          resolve("completed");
          return;
        }
        if (status === "CANCELED" || status === "CANCEL_REQUESTED") {
          resolve("canceled");
          return;
        }

        setTimeout(tick, intervalMs);
      } catch (err) {
        reject(err);
      }
    };
    void tick();
  });
}
