export type CatalogMoney = {
  amount?: number;
  currency?: string;
};

export type CatalogItem = {
  id?: string;
  name?: string;
  description?: string;
  catalogObjectId?: string | null;
  priceMoney?: CatalogMoney | null;
};

/** レジ画面で使う 1 商品分 */
export type SellableProduct = {
  itemId: string;
  name: string;
  unitPrice: number;
  currency: string;
  catalogObjectId: string;
};
