import { fetchPublicActiveProducts } from "@/app/actions/products";
import { allProducts } from "@/lib/products";
import TradeInClient, { type TradeInCategory } from "./TradeInClient";

export const dynamic = "force-dynamic";

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

function modelSortKey(model: string): [number, number] {
  const gen = parseInt(model.match(/(\d+)/)?.[1] ?? "0", 10);
  const m = model.toLowerCase();
  let variant = 4;
  if (m.includes("pro max"))                          variant = 0;
  else if (m.includes("pro"))                         variant = 1;
  else if (m.includes("plus") || (m.includes("max") && !m.includes("pro max"))) variant = 2;
  else if (m.includes("air"))                         variant = 3;
  else if (m.includes("mini") || /\d+e(\s|$)/.test(m)) variant = 5;
  return [gen, variant];
}

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

    const sorted = modelProducts.sort((a, b) => {
      const [genA, varA] = modelSortKey(a.model);
      const [genB, varB] = modelSortKey(b.model);
      if (genB !== genA) return genB - genA;
      return varA - varB;
    });

    return { ...cat, products: sorted };
  });

  return <TradeInClient categories={categories} />;
}
