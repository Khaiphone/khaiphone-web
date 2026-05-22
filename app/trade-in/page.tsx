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

function parseStorageGB(s: string): number {
  const m = s.match(/(\d+)\s*(TB|GB)/i);
  if (!m) return 0;
  return m[2].toUpperCase() === "TB" ? parseInt(m[1]) * 1024 : parseInt(m[1]);
}

export default async function TradeInPage() {
  const products = await fetchPublicActiveProducts();

  const categories: TradeInCategory[] = CATEGORY_META.map(cat => {
    const catProds = products.filter(p => p.category === cat.key);

    const modelMap = new Map<string, {
      variants: { storage: string; priceGood: number; priceFair: number; pricePoor: number }[];
      active: boolean;
    }>();

    for (const p of catProds) {
      const variant = {
        storage: p.storage,
        priceGood: p.price_good,
        priceFair: roundPrice(p.price_good * 0.88),
        pricePoor: roundPrice(p.price_good * 0.65),
      };
      const entry = modelMap.get(p.model);
      if (entry) {
        if (!entry.variants.find(v => v.storage === p.storage)) entry.variants.push(variant);
        if (p.active) entry.active = true;
      } else {
        modelMap.set(p.model, { variants: [variant], active: p.active });
      }
    }

    const modelProducts = Array.from(modelMap.entries()).map(([model, { variants, active }]) => ({
      model,
      variants: [...variants].sort((a, b) => parseStorageGB(a.storage) - parseStorageGB(b.storage)),
      isNew: NEW_MODELS.has(model),
      discontinued: !active,
    }));

    return { ...cat, products: modelProducts };
  });

  return <TradeInClient categories={categories} />;
}
