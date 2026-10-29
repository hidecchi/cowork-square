import type { CatalogItem, SellableProduct } from "../types/catalog";
import { apiHeaders, apiUrl, readApiError } from "./client";

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
    throw new Error(
      "Square カタログに価格付きの商品がありません。Square 管理画面で商品を確認してください。",
    );
  }

  const variationFilter = import.meta.env.VITE_CATALOG_VARIATION_ID?.trim();
  if (variationFilter) {
    const match = sellable.find((p) => p.catalogObjectId === variationFilter);
    if (!match) {
      throw new Error(
        "指定した VITE_CATALOG_VARIATION_ID の商品が見つかりません",
      );
    }
    return match;
  }

  const itemFilter = import.meta.env.VITE_CATALOG_ITEM_ID?.trim();
  if (itemFilter) {
    const match = sellable.find((p) => p.itemId === itemFilter);
    if (!match) {
      throw new Error("指定した VITE_CATALOG_ITEM_ID の商品が見つかりません");
    }
    return match;
  }

  if (sellable.length === 1) {
    return sellable[0];
  }

  throw new Error(
    "カタログに複数商品があります。web/.env に VITE_CATALOG_ITEM_ID を設定してください。",
  );
}

export async function fetchSellableProduct(): Promise<SellableProduct> {
  const res = await fetch(apiUrl("/api/catalog-items"), {
    headers: apiHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, "商品情報の取得に失敗しました"));
  }
  const items = (await res.json()) as CatalogItem[];
  return pickProduct(items);
}
