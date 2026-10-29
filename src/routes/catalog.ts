import type { SquareClient } from "../square/client";

type CatalogObject = {
  type?: string;
  id?: string;
  is_deleted?: boolean;
  item_data?: {
    name?: string;
    description?: string;
    is_archived?: boolean;
    category_id?: string;
    image_ids?: string[];
    variations?: { id?: string; type?: string }[];
  };
  item_variation_data?: {
    item_id?: string;
    name?: string;
    sku?: string;
    price_money?: { amount?: number; currency?: string };
  };
  category_data?: { name?: string };
  image_data?: { url?: string };
};

export async function getCatalogItems(
  client: SquareClient,
): Promise<unknown[]> {
  const objects = (await client.listCatalogObjects(
    "ITEM,ITEM_VARIATION,CATEGORY,IMAGE",
  )) as CatalogObject[];

  const imageMap = new Map<string, string>();
  const categoryMap = new Map<string, string>();
  const variationMap = new Map<string, CatalogObject>();

  for (const obj of objects) {
    if (obj.is_deleted) continue;
    if (obj.type === "IMAGE" && obj.id && obj.image_data?.url) {
      imageMap.set(obj.id, obj.image_data.url);
    }
    if (obj.type === "CATEGORY" && obj.id && obj.category_data?.name) {
      categoryMap.set(obj.id, obj.category_data.name);
    }
    if (obj.type === "ITEM_VARIATION" && obj.id) {
      variationMap.set(obj.id, obj);
    }
  }

  return objects
    .filter((o) => o.type === "ITEM" && !o.is_deleted)
    .map((item) => {
      const data = item.item_data;
      const variationIds = data?.variations?.map((v) => v.id).filter(Boolean) as
        | string[]
        | undefined;

      const variations = (variationIds ?? [])
        .map((id) => variationMap.get(id))
        .filter((v): v is CatalogObject => v !== undefined)
        .map((v) => {
          const vd = v.item_variation_data;
          return {
            id: v.id,
            name: vd?.name,
            sku: vd?.sku,
            priceMoney: vd?.price_money,
            itemId: vd?.item_id,
          };
        });

      const primaryVariation = variations[0];
      const imageUrl =
        data?.image_ids?.map((id) => imageMap.get(id)).find(Boolean) ?? null;

      return {
        id: item.id,
        name: data?.name,
        description: data?.description,
        isArchived: data?.is_archived ?? false,
        category: data?.category_id
          ? (categoryMap.get(data.category_id) ?? null)
          : null,
        imageUrl,
        variations,
        sku: primaryVariation?.sku ?? null,
        priceMoney: primaryVariation?.priceMoney ?? null,
        catalogObjectId: primaryVariation?.id ?? null,
      };
    })
    .filter((item) => !item.isArchived);
}
