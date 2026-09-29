import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Beef,
  Carrot,
  Coffee,
  Cookie,
  Droplet,
  Fish,
  IceCreamCone,
  LayoutGrid,
  Milk,
  Package,
  ShoppingBasket,
  Snowflake,
  SprayCan,
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
  { match: /منظف|تنظيف|cleaning|detergent/i, icon: SprayCan },
  { match: /مكرون|أرز|حبوب|pasta|rice|grain/i, icon: Wheat },
  { match: /حلو|بسكويت|snack|sweet|cookie/i, icon: Cookie },
  { match: /جزر|carrot/i, icon: Carrot },
  { match: /علب|تغليف|pack/i, icon: Package },
];

export function categoryIconFor(name: string): LucideIcon {
  const normalized = name.trim();

  for (const rule of rules) {
    if (rule.match.test(normalized)) {
      return rule.icon;
    }
  }

  return LayoutGrid;
}
