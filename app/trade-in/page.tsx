import { fetchPublicActiveProducts } from "@/app/actions/products";
import { allProducts } from "@/lib/products";
import TradeInClient, { type TradeInCategory } from "./TradeInClient";

export const revalidate = 3600;

const NEW_MODELS = new Set(allProducts.filter(p => p.isNew).map(p => p.model));

const CATEGORY_META = [
  { key: "iphone",  label: "iPhone"      },
  { key: "ipad",    label: "iPad"        },
  { key: "macbook", label: "Mac"         },
  { key: "watch",   label: "Apple Watch" },
];

function roundPrice(n: number) {
  return Math.round(n / 500) * 500;
}

const PRODUCT_ORDER = new Map(allProducts.map((p, i) => [p.model, i]));

function parseStorageGB(s: string): number {
  const m = s.match(/(\d+)\s*(TB|GB)/i);
  if (!m) return 0;
  return m[2].toUpperCase() === "TB" ? parseInt(m[1]) * 1024 : parseInt(m[1]);
}

export default async function TradeInPage() {
  const products = await fetchPublicActiveProducts();

  const categories: TradeInCategory[] = CATEGORY_META.map(cat => {
    const catProds = products.filter(p => p.category === cat.key);

    const modelProducts = catProds.map(p => {
      // Build variants from storage_prices if available, else single variant
      const storagePrices = p.storage_prices;
      const variants =
        storagePrices && Object.keys(storagePrices).length > 0
          ? Object.entries(storagePrices)
              .sort(([a], [b]) => parseStorageGB(a) - parseStorageGB(b))
              .map(([storage, price]) => ({
                storage,
                priceGood: price,
                priceFair: roundPrice(price * 0.88),
                pricePoor: roundPrice(price * 0.65),
              }))
          : [{
              storage: p.storage,
              priceGood: p.price_good,
              priceFair: roundPrice(p.price_good * 0.88),
              pricePoor: roundPrice(p.price_good * 0.65),
            }];

      return {
        model: p.model,
        variants,
        isNew: NEW_MODELS.has(p.model),
        discontinued: !p.active,
      };
    });

    const sorted = modelProducts.sort((a, b) =>
      (PRODUCT_ORDER.get(a.model) ?? 9999) - (PRODUCT_ORDER.get(b.model) ?? 9999)
    );

    return { ...cat, products: sorted };
  });

  return <TradeInClient categories={categories} />;
}
