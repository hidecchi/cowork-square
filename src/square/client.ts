import type { Env } from "../env";
import { HttpError, squareApiVersion, squareBaseUrl } from "../http";

export type SquarePaymentType =
  | "CARD_PRESENT"
  | "FELICA_TRANSPORTATION_GROUP"
  | "FELICA_ID"
  | "FELICA_QUICPAY"
  | "QR_CODE";

export const ALLOWED_PAYMENT_TYPES = new Set<SquarePaymentType>([
  "CARD_PRESENT",
  "FELICA_TRANSPORTATION_GROUP",
  "FELICA_ID",
  "FELICA_QUICPAY",
  "QR_CODE",
]);

type Money = { amount: number; currency: string };

type OrderLineItem = {
  catalog_object_id?: string;
  quantity: string;
  name?: string;
  base_price_money?: Money;
};

export type CreateCheckoutOrderInput = {
  lineItems: OrderLineItem[];
  referenceId?: string;
};

export type CreateTerminalCheckoutInput = {
  amountMoney: Money;
  paymentType?: SquarePaymentType;
  order?: CreateCheckoutOrderInput;
  note?: string;
  skipReceiptScreen?: boolean;
  showItemizedCart?: boolean;
};

export class SquareClient {
  constructor(private readonly env: Env) {}

  private headers(idempotencyKey?: string): HeadersInit {
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.env.SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "Square-Version": squareApiVersion(this.env),
    };
    if (idempotencyKey) h["Idempotency-Key"] = idempotencyKey;
    return h;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    const url = `${squareBaseUrl(this.env.SQUARE_ENVIRONMENT)}${path}`;
    const res = await fetch(url, {
      method,
      headers: this.headers(idempotencyKey),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    let payload: unknown = {};
    if (text) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        payload = { raw: text };
      }
    }

    if (!res.ok) {
      const detail =
        typeof payload === "object" &&
        payload !== null &&
        "errors" in payload &&
        Array.isArray((payload as { errors: unknown }).errors)
          ? (payload as { errors: { detail?: string; code?: string }[] }).errors
              .map((e) => e.detail || e.code || "unknown")
              .join("; ")
          : res.statusText;
      throw new HttpError(res.status, `Square API error: ${detail}`);
    }

    return payload as T;
  }

  async createOrder(input: CreateCheckoutOrderInput): Promise<string> {
    const res = await this.request<{ order?: { id?: string } }>(
      "POST",
      "/v2/orders",
      {
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: this.env.SQUARE_LOCATION_ID,
          reference_id: input.referenceId,
          line_items: input.lineItems,
        },
      },
      crypto.randomUUID(),
    );

    const orderId = res.order?.id;
    if (!orderId) {
      throw new HttpError(502, "Square did not return an order id");
    }
    return orderId;
  }

  async createTerminalCheckout(
    input: CreateTerminalCheckoutInput,
    idempotencyKey: string,
  ): Promise<unknown> {
    let orderId: string | undefined;
    if (input.order?.lineItems?.length) {
      orderId = await this.createOrder(input.order);
    }

    return this.request(
      "POST",
      "/v2/terminals/checkouts",
      {
        idempotency_key: idempotencyKey,
        checkout: {
          amount_money: {
            amount: input.amountMoney.amount,
            currency: input.amountMoney.currency,
          },
          device_options: {
            device_id: this.env.SQUARE_DEVICE_ID,
            skip_receipt_screen: input.skipReceiptScreen ?? true,
            show_itemized_cart: input.showItemizedCart ?? false,
          },
          reference_id: orderId ?? input.order?.referenceId,
          order_id: orderId,
          note: input.note ?? "Self-checkout",
          payment_type: input.paymentType ?? "CARD_PRESENT",
        },
      },
      idempotencyKey,
    );
  }

  async getTerminalCheckout(checkoutId: string): Promise<unknown> {
    return this.request(
      "GET",
      `/v2/terminals/checkouts/${encodeURIComponent(checkoutId)}`,
    );
  }

  async listCatalogObjects(types: string): Promise<unknown[]> {
    const objects: unknown[] = [];
    let cursor: string | undefined;

    do {
      const qs = new URLSearchParams({ types });
      if (cursor) qs.set("cursor", cursor);

      const page = await this.request<{
        objects?: unknown[];
        cursor?: string;
      }>("GET", `/v2/catalog/list?${qs.toString()}`);

      if (page.objects?.length) objects.push(...page.objects);
      cursor = page.cursor;
    } while (cursor);

    return objects;
  }
}
