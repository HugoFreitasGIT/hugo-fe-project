import "server-only";

import { shopifyAdminFetch } from "@/lib/shopify/admin-client";

const SHOP_OVERVIEW_QUERY = /* GraphQL */ `
  query ShopOverview($first: Int!) {
    shop {
      name
    }
    products(first: $first, sortKey: TITLE) {
      nodes {
        id
        handle
        title
        status
      }
    }
  }
`;

export type ShopOverviewProduct = {
  id: string;
  handle: string;
  title: string;
  status: string;
};

export type ShopOverview = {
  shopName: string;
  products: ShopOverviewProduct[];
};

type ShopOverviewQueryData = {
  shop: { name: string };
  products: { nodes: ShopOverviewProduct[] };
};

// Read-only query used to verify the Admin API connection.
export async function getShopOverview(first = 5): Promise<ShopOverview> {
  const data = await shopifyAdminFetch<ShopOverviewQueryData>(
    SHOP_OVERVIEW_QUERY,
    { first },
  );

  return { shopName: data.shop.name, products: data.products.nodes };
}
