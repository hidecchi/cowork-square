import type { PaymentType } from "../paymentMethods";
import type { SellableProduct } from "../types/catalog";
import { apiHeaders, apiUrl, readApiError } from "./client";

type TerminalCheckoutResponse = {
  checkout?: { id?: string };
};

type CheckoutStatusResponse = {
  status: string;
};

export async function createTerminalCheckout(
  product: SellableProduct,
  quantity: number,
  paymentType: PaymentType,
): Promise<string> {
  const amount = product.unitPrice * quantity;

  const res = await fetch(apiUrl("/api/create-terminal-checkout"), {
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

  const data = (await res.json()) as TerminalCheckoutResponse & {
    error?: string;
  };
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
  const res = await fetch(apiUrl(`/api/get-checkout-status?${qs}`), {
    headers: apiHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, "決済状態の確認に失敗しました"));
  }
  return (await res.json()) as CheckoutStatusResponse;
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
