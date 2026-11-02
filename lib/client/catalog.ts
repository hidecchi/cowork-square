import type { CatalogItem, SellableProduct } from "@/lib/types/catalog";

function apiHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  const key = process.env.NEXT_PUBLIC_API_KEY;
  if (key) headers["X-Api-Key"] = key;
  return headers;
}

function toSellable(item: CatalogItem): SellableProduct | null {
  const catalogObjectId = item.catalogObjectId?.trim();
  const amount = item.priceMoney?.amount;
  const name = item.name?.trim();
  const itemId = item.id?.trim();

  if (!itemId || !name || !catalogObjectId || typeof amount !== "number") {
    return null;
  }

  return {
    itemId,
    name,
    unitPrice: amount,
    currency: item.priceMoney?.currency ?? "JPY",
    catalogObjectId,
  };
}

function pickProduct(items: CatalogItem[]): SellableProduct {
  const sellable = items
    .map(toSellable)
    .filter((p): p is SellableProduct => p !== null);

  if (sellable.length === 0) {
    throw new Error("catalogNoPricedItems");
  }

  const variationFilter = process.env.NEXT_PUBLIC_CATALOG_VARIATION_ID?.trim();
  if (variationFilter) {
    const match = sellable.find((p) => p.catalogObjectId === variationFilter);
    if (!match) {
      throw new Error("catalogVariationNotFound");
    }
    return match;
  }

  const itemFilter = process.env.NEXT_PUBLIC_CATALOG_ITEM_ID?.trim();
  if (itemFilter) {
    const match = sellable.find((p) => p.itemId === itemFilter);
    if (!match) {
      throw new Error("catalogItemNotFound");
    }
    return match;
  }

  if (sellable.length === 1) {
    return sellable[0];
  }

  throw new Error("catalogMultipleItems");
}

export async function fetchSellableProduct(): Promise<SellableProduct> {
  const res = await fetch("/api/catalog-items", { headers: apiHeaders() });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "catalogFetchFailed");
  }
  const items = (await res.json()) as CatalogItem[];
  return pickProduct(items);
}
