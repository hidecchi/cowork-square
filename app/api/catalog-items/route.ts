import { handleRouteError, jsonOk } from "@/lib/api";
import { getCatalogItems } from "@/lib/square/catalog";
import { SquareClient } from "@/lib/square/client";
import { assertApiKey, getSquareEnv } from "@/lib/square/env";

export async function GET(request: Request) {
  try {
    assertApiKey(request);
    const client = new SquareClient(getSquareEnv());
    const items = await getCatalogItems(client);
    return jsonOk(items);
  } catch (err) {
    return handleRouteError(err);
  }
}
