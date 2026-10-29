import type { Env } from "./env";
import {
  corsHeaders,
  errorResponse,
  HttpError,
  jsonResponse,
  parseAllowedOrigins,
  readJson,
} from "./http";
import { getCatalogItems } from "./routes/catalog";
import {
  ALLOWED_PAYMENT_TYPES,
  SquareClient,
  type SquarePaymentType,
} from "./square/client";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
    const cors = corsHeaders(request, allowedOrigins);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      assertEnv(env);
      assertApiKey(request, env);

      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, "") || "/";

      if (request.method === "GET" && path === "/api/health") {
        return jsonResponse({ ok: true }, 200, cors);
      }

      const client = new SquareClient(env);

      if (request.method === "GET" && path === "/api/catalog-items") {
        const items = await getCatalogItems(client);
        return jsonResponse(items, 200, cors);
      }

      if (request.method === "GET" && path === "/api/get-checkout-status") {
        const checkoutId = url.searchParams.get("checkoutId");
        if (!checkoutId) {
          throw new HttpError(400, "checkoutId query parameter is required");
        }
        const data = await client.getTerminalCheckout(checkoutId);
        const checkout =
          typeof data === "object" && data !== null && "checkout" in data
            ? (data as { checkout?: { status?: string } }).checkout
            : undefined;
        return jsonResponse(
          {
            status: checkout?.status ?? "UNKNOWN",
            checkout,
          },
          200,
          cors,
        );
      }

      if (
        request.method === "POST" &&
        path === "/api/create-terminal-checkout"
      ) {
        const body = await readJson<{
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
        }>(request);

        const amount = body.amountMoney?.amount;
        const currency = body.amountMoney?.currency;
        if (
          typeof amount !== "number" ||
          !Number.isInteger(amount) ||
          amount < 0
        ) {
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

        return jsonResponse(result, 200, cors);
      }

      return errorResponse("Not found", 404, cors);
    } catch (err) {
      if (err instanceof HttpError) {
        return errorResponse(err.message, err.status, cors);
      }
      console.error(err);
      return errorResponse("Internal server error", 500, cors);
    }
  },
} satisfies ExportedHandler<Env>;

function assertEnv(env: Env): void {
  if (!env.SQUARE_ACCESS_TOKEN) {
    throw new HttpError(500, "SQUARE_ACCESS_TOKEN is not configured");
  }
  if (!env.SQUARE_DEVICE_ID) {
    throw new HttpError(500, "SQUARE_DEVICE_ID is not configured");
  }
  if (!env.SQUARE_LOCATION_ID) {
    throw new HttpError(500, "SQUARE_LOCATION_ID is not configured");
  }
}

function assertApiKey(request: Request, env: Env): void {
  if (!env.WORKER_API_KEY) return;
  const key = request.headers.get("X-Api-Key");
  if (!key || key !== env.WORKER_API_KEY) {
    throw new HttpError(401, "Unauthorized");
  }
}
