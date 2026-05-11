import Link from "next/link";
import {
  Globe,
  Shield,
  ShoppingBag,
  Image,
  Compass,
  Truck,
  Zap,
} from "lucide-react";

interface CategoryCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  extensions: string[];
}

const categories: CategoryCard[] = [
  {
    title: "Speed Suite",
    description:
      "Performance optimization for Magento 2 — faster indexing, precompiled configurations, and runtime acceleration.",
    href: "/docs/extensions/speed",
    icon: Zap,
    extensions: [
      "Optimized Indexes",
      "STOP Protocol",
      "Preloaders",
    ],
  },
  {
    title: "SEO Suite",
    description:
      "Complete SEO toolkit — rich snippets, hreflangs, sitemaps, OpenGraph tags, pretty filters, and more.",
    href: "/docs/extensions/seo",
    icon: Globe,
    extensions: [
      "Rich Snippets",
      "Custom Tags",
      "Dynamic Descriptions",
      "HrefLangs",
      "Image URLs",
      "OpenGraph",
      "Pretty Filters",
      "AI Advisor",
      "Advanced Sitemaps",
    ],
  },
  {
    title: "Compliance & Legal",
    description:
      "EU regulatory compliance — GDPR privacy management, product safety (GPSR), and price transparency (Omnibus).",
    href: "/docs/extensions/compliance",
    icon: Shield,
    extensions: ["GDPR Suite", "GPSR", "Omnibus Directive"],
  },
  {
    title: "Marketing",
    description:
      "Visual merchandising — dynamic product labels, badges, and promotional campaign tools.",
    href: "/docs/extensions/marketing",
    icon: ShoppingBag,
    extensions: ["Product Labels"],
  },
  {
    title: "Catalog & Products",
    description:
      "Product enrichment — file attachments and attribute-based browsing.",
    href: "/docs/extensions/catalog",
    icon: ShoppingBag,
    extensions: ["Product Attachments", "Shop By Attribute"],
  },
  {
    title: "Media & Content",
    description:
      "Media management — unused media cleanup, video player widgets, and category sliders.",
    href: "/docs/extensions/media",
    icon: Image,
    extensions: ["Media Cleaner", "Media Player Widget", "Category Slider"],
  },
  {
    title: "Search & Navigation",
    description: "Lightning-fast search with autocomplete and smart filters.",
    href: "/docs/extensions/search",
    icon: Compass,
    extensions: ["Fast Search"],
  },
  {
    title: "Checkout & Shipping",
    description:
      "Store pickup with location management, opening hours, and checkout integration.",
    href: "/docs/extensions/checkout",
    icon: Truck,
    extensions: ["Store Pickup"],
  },
];

export function CategoryCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => (
        <Link
          key={cat.href}
          href={cat.href}
          className="group rounded-xl border border-[var(--color-border)] p-5 hover:border-brand-400 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-brand-50 p-2 dark:bg-brand-950">
              <cat.icon className="h-5 w-5 text-brand-600" />
            </div>
            <h2 className="text-base font-semibold group-hover:text-brand-600 transition-colors">
              {cat.title}
            </h2>
          </div>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {cat.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cat.extensions.map((ext) => (
              <span
                key={ext}
                className="rounded-md bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[11px] text-[var(--color-text-muted)]"
              >
                {ext}
              </span>
            ))}
          </div>
          <div className="mt-3 text-xs font-medium text-brand-600">
            {cat.extensions.length} extension{cat.extensions.length !== 1 ? "s" : ""} →
          </div>
        </Link>
      ))}
    </div>
  );
}
