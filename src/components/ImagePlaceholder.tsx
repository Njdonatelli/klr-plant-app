import { useState } from "react";
import {
  TreePine,
  Trees,
  Flower2,
  Sprout,
  Leaf,
  Flower,
  Palmtree,
  Wheat,
  Citrus,
  Shrub,
  Grape,
  Package,
  ImageOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  "annuals-bulbs": Flower,
  "bamboo": Sprout,
  "bulk-soils-mulches": Package,
  "cactus-succulents": Flower2,
  "camellias-azaleas-rhododendrons": Flower,
  "citrus-avocado": Citrus,
  "conifers": TreePine,
  "deciduous-shrubs": Shrub,
  "deciduous-trees": Trees,
  "dry-goods": Package,
  "edibles-fruit-vegetables": Wheat,
  "evergreen-shrubs": Shrub,
  "evergreen-trees": TreePine,
  "ferns": Leaf,
  "grasses-grass-like-plants": Wheat,
  "palms": Palmtree,
  "perennials-groundcovers": Sprout,
  "roses": Flower,
  "sod": Wheat,
  "strappy-leaf-perennials": Leaf,
  "tropicals": Palmtree,
  "vines": Grape,
};

const CATEGORY_GRADIENT: Record<string, string> = {
  "cactus-succulents": "from-amber-100 to-orange-50",
  "citrus-avocado": "from-orange-100 to-yellow-50",
  "roses": "from-rose-100 to-pink-50",
  "conifers": "from-emerald-100 to-teal-50",
  "evergreen-trees": "from-emerald-100 to-green-50",
  "deciduous-trees": "from-amber-100 to-lime-50",
  "palms": "from-lime-100 to-emerald-50",
  "tropicals": "from-fuchsia-100 to-emerald-50",
};

interface Props {
  category: string;
  imageUrl?: string | null;
  className?: string;
  iconClassName?: string;
}

export default function ImagePlaceholder({ category, imageUrl, className, iconClassName }: Props) {
  const [errorUrl, setErrorUrl] = useState<string | null>(null);

  const hasError = errorUrl === imageUrl;

  if (imageUrl && !hasError) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={className ?? "h-full w-full object-cover"}
        onError={() => setErrorUrl(imageUrl)}
      />
    );
  }

  const Icon = CATEGORY_ICON[category] ?? ImageOff;
  const gradient = CATEGORY_GRADIENT[category] ?? "from-klr-100 to-klr-50";

  return (
    <div
      className={
        className ??
        `flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br ${gradient} text-klr-700`
      }
    >
      <Icon className={iconClassName ?? "h-10 w-10 opacity-60"} strokeWidth={1.5} />
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-50">
        image pending
      </span>
    </div>
  );
}
