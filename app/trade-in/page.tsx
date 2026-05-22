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

export default async function TradeInPage() {
  const products = await fetchPublicActiveProducts();

  // Group by model within each category, combine storage variants
  const categories: TradeInCategory[] = CATEGORY_META.map(cat => {
    const catProds = products.filter(p => p.category === cat.key);

    // Deduplicate by model — combine storage labels, take max price_good
    const modelMap = new Map<string, { storages: string[]; maxPrice: number; active: boolean }>();
    for (const p of catProds) {
      const entry = modelMap.get(p.model);
      if (entry) {
        if (!entry.storages.includes(p.storage)) entry.storages.push(p.storage);
        if (p.price_good > entry.maxPrice) entry.maxPrice = p.price_good;
        if (p.active) entry.active = true;
      } else {
        modelMap.set(p.model, { storages: [p.storage], maxPrice: p.price_good, active: p.active });
      }
    }

    const modelProducts = Array.from(modelMap.entries()).map(([model, { storages, maxPrice, active }]) => ({
      model,
      storage: storages.join(" / "),
      priceGood: maxPrice,
      priceFair: roundPrice(maxPrice * 0.88),
      pricePoor: roundPrice(maxPrice * 0.65),
      isNew: NEW_MODELS.has(model),
      discontinued: !active,
    }));

    return { ...cat, products: modelProducts };
  });

  return <TradeInClient categories={categories} />;
}
