import type { LucideIcon } from "lucide-react";
import {
  Apple,
  BatteryCharging,
  Beef,
  BookOpen,
  Candy,
  Carrot,
  Cigarette,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Drumstick,
  Fish,
  Flame,
  Footprints,
  GlassWater,
  Globe,
  Home,
  IceCreamCone,
  Milk,
  Package,
  PenTool,
  Plug,
  Shirt,
  ShoppingBasket,
  Snowflake,
  Sparkles,
  SprayCan,
  Utensils,
  Wheat,
} from "lucide-react";

const rules: { match: RegExp; icon: LucideIcon }[] = [
  { match: /أحذي|احذي|حذاء|shoes?|footwear/i, icon: Footprints },
  { match: /ملابس|shirt|cloth(?:es|ing)?/i, icon: Shirt },
  { match: /سجائر|سيجار|دخان|cigarette|tobacco/i, icon: Cigarette },
  { match: /بطاري|مستهلك|battery|consumable/i, icon: BatteryCharging },
  { match: /مكتبي|قرطاسي|stationery|office/i, icon: PenTool },
  { match: /كتاب|book/i, icon: BookOpen },
  { match: /كهرب|electric|plug/i, icon: Plug },
  { match: /أدوات منزل|منزلية|homeware|\bhome\b/i, icon: Home },
  { match: /منظف|تنظيف|cleaning|detergent/i, icon: SprayCan },
  { match: /عناية|عطور|تجميل|personal care|beauty/i, icon: Sparkles },
  { match: /أسماك|الاسماك|سمك|مأكولات بحر|fish|seafood/i, icon: Fish },
  { match: /لحم|لحوم|meat|beef/i, icon: Beef },
  { match: /دواجن|دجاج|فراخ|poultry|chicken/i, icon: Drumstick },
  { match: /ألبان|البان|أجبان|اجبان|جبن|dairy|milk|cheese/i, icon: Milk },
  { match: /فاكهة|فواكه|fruit/i, icon: Apple },
  { match: /خضار|خضروات|vegetable|produce|\bveg/i, icon: Carrot },
  { match: /مخبوز|خبز|bakery|bread/i, icon: Croissant },
  { match: /شاي|قهوة|tea|coffee/i, icon: Coffee },
  { match: /عصائر|عصير|juice/i, icon: GlassWater },
  { match: /مشروب|drink|beverage|soda/i, icon: CupSoda },
  { match: /آيس|ايسكريم|ice\s*cream/i, icon: IceCreamCone },
  { match: /تسال|سناكس|بسكويت|snack|cookie/i, icon: Cookie },
  { match: /حلويات|حلوى|شوكول|candy|chocolate/i, icon: Candy },
  { match: /آسيو|اسيو|صين|asian|chinese/i, icon: Utensils },
  { match: /مستورد|import/i, icon: Globe },
  { match: /معلب|صلص|canned|sauce/i, icon: Package },
  { match: /مكرون|أرز|ارز|حبوب|نشو|pasta|rice|grain|starch/i, icon: Wheat },
  { match: /مجمد|frozen/i, icon: Snowflake },
  { match: /بقالة|grocery|supermarket/i, icon: ShoppingBasket },
  { match: /^عام$/m, icon: ShoppingBasket },
  { match: /شعلة|flame/i, icon: Flame },
];

export function categoryIconFor(...names: Array<string | null | undefined>): LucideIcon {
  const haystack = names
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name))
    .join("\n");

  for (const rule of rules) {
    if (rule.match.test(haystack)) {
      return rule.icon;
    }
  }

  return ShoppingBasket;
}
