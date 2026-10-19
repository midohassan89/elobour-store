import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Beef,
  Candy,
  Carrot,
  Coffee,
  Cookie,
  Croissant,
  Droplet,
  Fish,
  IceCreamCone,
  Milk,
  Package,
  Plug,
  ShoppingBasket,
  Snowflake,
  SprayCan,
  Utensils,
  Wheat,
} from "lucide-react";

const rules: { match: RegExp; icon: LucideIcon }[] = [
  { match: /ألبان|جبن|dairy|milk|cheese/i, icon: Milk },
  { match: /شاي|قهوة|tea|coffee/i, icon: Coffee },
  { match: /مشروب|عصير|drink|beverage|juice/i, icon: Droplet },
  { match: /لحم|دجاج|لحوم|meat|beef|chicken/i, icon: Beef },
  { match: /سمك|مأكولات بحر|fish|seafood/i, icon: Fish },
  { match: /خضار|فاكهة|خضروات|fruit|produce|veg/i, icon: Apple },
  { match: /مجمد|frozen/i, icon: Snowflake },
  { match: /آيس|آيسكريم|ice\s*cream/i, icon: IceCreamCone },
  { match: /بقالة|grocery|supermarket/i, icon: ShoppingBasket },
  { match: /منظف|تنظيف|عناية|cleaning|detergent|personal/i, icon: SprayCan },
  { match: /مكرون|أرز|حبوب|نشو|pasta|rice|grain/i, icon: Wheat },
  { match: /حلو|بسكويت|تسال|سناكس|snack|sweet|cookie/i, icon: Cookie },
  { match: /مخبوز|خبز|bakery|bread/i, icon: Croissant },
  { match: /آسيو|صين|مستورد|asian|import/i, icon: Utensils },
  { match: /معلب|صلص|canned|sauce/i, icon: Package },
  { match: /كهرب|أدوات منزل|home|electric/i, icon: Plug },
  { match: /حلوى|candy|chocolate/i, icon: Candy },
  { match: /جزر|carrot/i, icon: Carrot },
];

const fallbacks: LucideIcon[] = [
  Apple,
  Beef,
  Fish,
  Milk,
  Cookie,
  Wheat,
  SprayCan,
  Croissant,
  Utensils,
  Coffee,
  ShoppingBasket,
  Snowflake,
];

export function categoryIconFor(name: string): LucideIcon {
  const normalized = name.trim();

  for (const rule of rules) {
    if (rule.match.test(normalized)) {
      return rule.icon;
    }
  }

  let hash = 0;
  for (const char of normalized) hash = (hash + char.charCodeAt(0)) % fallbacks.length;
  return fallbacks[hash] ?? ShoppingBasket;
}
