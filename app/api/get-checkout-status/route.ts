import { handleRouteError, jsonOk } from "@/lib/api";
import { SquareClient } from "@/lib/square/client";
import { assertApiKey, getSquareEnv, HttpError } from "@/lib/square/env";

export async function GET(request: Request) {
  try {
    assertApiKey(request);
    const checkoutId = new URL(request.url).searchParams.get("checkoutId");
    if (!checkoutId) {
      throw new HttpError(400, "checkoutId query parameter is required");
    }

    const client = new SquareClient(getSquareEnv());
    const data = await client.getTerminalCheckout(checkoutId);
    const checkout =
      typeof data === "object" && data !== null && "checkout" in data
        ? (data as { checkout?: { status?: string } }).checkout
        : undefined;

    return jsonOk({
      status: checkout?.status ?? "UNKNOWN",
      checkout,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
