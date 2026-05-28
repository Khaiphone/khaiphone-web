import { fetchPublicActiveProducts } from "@/app/actions/products";
import { allProducts } from "@/lib/products";
import SellPageClient, { type SellCategory } from "./SellPageClient";

export const revalidate = 3600; // รายการรุ่น revalidate ทุกชั่วโมง

const NEW_MODELS = new Set(allProducts.filter(p => p.isNew).map(p => p.model));
const MODEL_ORDER = new Map(allProducts.map((p, i) => [p.model, i]));

function toSlug(model: string) {
  return model.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const CATEGORY_META = [
  { key: "iphone",  label: "iPhone"      },
  { key: "ipad",    label: "iPad"        },
  { key: "macbook", label: "Mac"         },
  { key: "watch",   label: "Apple Watch" },
];

export default async function SellPage() {
  const products = await fetchPublicActiveProducts();

  const categories: SellCategory[] = CATEGORY_META.map(cat => {
    const seen = new Set<string>();
    const catProducts = products
      .filter(p => p.category === cat.key)
      .sort((a, b) => (MODEL_ORDER.get(a.model) ?? 9999) - (MODEL_ORDER.get(b.model) ?? 9999))
      .reduce<SellCategory["products"]>((acc, p) => {
        if (seen.has(p.model)) return acc;
        seen.add(p.model);
        acc.push({
          slug: toSlug(p.model),
          model: p.model,
          isNew: NEW_MODELS.has(p.model),
          discontinued: !p.active,
        });
        return acc;
      }, []);

    return { ...cat, products: catProducts };
  });

  return <SellPageClient categories={categories} />;
}
