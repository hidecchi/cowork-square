import { handleRouteError, jsonOk } from "@/lib/api";
import {
  ALLOWED_PAYMENT_TYPES,
  SquareClient,
  type SquarePaymentType,
} from "@/lib/square/client";
import { assertApiKey, getSquareEnv, HttpError } from "@/lib/square/env";

export async function POST(request: Request) {
  try {
    assertApiKey(request);

    let body: {
      amountMoney?: { amount?: number; currency?: string };
      paymentType?: string;
      order?: {
        lineItems?: {
          catalog_object_id?: string;
          quantity?: string | number;
          name?: string;
          base_price_money?: { amount?: number; currency?: string };
        }[];
        referenceId?: string;
      };
      note?: string;
      skipReceiptScreen?: boolean;
      showItemizedCart?: boolean;
    };

    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON body");
    }

    const amount = body.amountMoney?.amount;
    const currency = body.amountMoney?.currency;
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 0) {
      throw new HttpError(
        400,
        "amountMoney.amount must be a non-negative integer",
      );
    }
    if (!currency) {
      throw new HttpError(400, "amountMoney.currency is required");
    }

    const paymentType = (body.paymentType ??
      "CARD_PRESENT") as SquarePaymentType;
    if (!ALLOWED_PAYMENT_TYPES.has(paymentType)) {
      throw new HttpError(400, "Unsupported paymentType");
    }

    const idempotencyKey =
      request.headers.get("Idempotency-Key") ?? crypto.randomUUID();

    const lineItems =
      body.order?.lineItems?.map((li) => ({
        catalog_object_id: li.catalog_object_id,
        quantity: String(li.quantity ?? "1"),
        name: li.name,
        base_price_money:
          li.base_price_money?.amount !== undefined &&
          li.base_price_money?.currency
            ? {
                amount: li.base_price_money.amount,
                currency: li.base_price_money.currency,
              }
            : undefined,
      })) ?? [];

    const client = new SquareClient(getSquareEnv());
    const result = await client.createTerminalCheckout(
      {
        amountMoney: { amount, currency },
        paymentType,
        order: lineItems.length
          ? { lineItems, referenceId: body.order?.referenceId }
          : undefined,
        note: body.note,
        skipReceiptScreen: body.skipReceiptScreen,
        showItemizedCart: body.showItemizedCart,
      },
      idempotencyKey,
    );

    return jsonOk(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
