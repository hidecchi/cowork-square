import { handleRouteError, jsonOk } from "@/lib/api";
import { SquareClient } from "@/lib/square/client";
import { assertApiKey, getSquareEnv, HttpError } from "@/lib/square/env";

export async function POST(request: Request) {
  try {
    assertApiKey(request);

    let body: { checkoutId?: string };
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON body");
    }

    const checkoutId = body.checkoutId?.trim();
    if (!checkoutId) {
      throw new HttpError(400, "checkoutId is required");
    }

    const client = new SquareClient(getSquareEnv());
    const result = await client.cancelTerminalCheckout(checkoutId);
    return jsonOk(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
