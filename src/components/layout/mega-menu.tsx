"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Search as SearchIcon,
  Shield,
  ShoppingBag,
  Image,
  Compass,
  Truck,
  Globe,
  Wrench,
  Code,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuCategory {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
  items?: { label: string; href: string }[];
}

const extensionCategories: MenuCategory[] = [
  {
    label: "Speed Suite",
    href: "/docs/extensions/speed",
    icon: Wrench,
    description: "Indexer optimization and performance",
    items: [
      { label: "Optimized Indexes", href: "/docs/extensions/speed/optimized-indexes" },
      { label: "STOP Protocol", href: "/docs/extensions/speed/stop-protocol" },
      { label: "Preloaders", href: "/docs/extensions/speed/preloaders" },
    ],
  },
  {
    label: "SEO Suite",
    href: "/docs/extensions/seo",
    icon: Globe,
    description: "Search engine optimisation tools",
    items: [
      { label: "Rich Snippets", href: "/docs/extensions/seo/rich-snippets" },
      { label: "Custom Tags", href: "/docs/extensions/seo/custom-tags" },
      { label: "Dynamic Descriptions", href: "/docs/extensions/seo/dynamic-descriptions" },
      { label: "HrefLangs", href: "/docs/extensions/seo/hreflangs" },
      { label: "Image Friendly URLs", href: "/docs/extensions/seo/images-friendly-urls" },
      { label: "OpenGraph Tags", href: "/docs/extensions/seo/opengraph-tags" },
      { label: "Pretty Filters", href: "/docs/extensions/seo/pretty-filters" },
      { label: "AI Advisor", href: "/docs/extensions/seo/ai-advisor" },
      { label: "Advanced Sitemaps", href: "/docs/extensions/seo/advanced-sitemaps" },
    ],
  },
  {
    label: "Compliance & Legal",
    href: "/docs/extensions/compliance",
    icon: Shield,
    description: "GDPR, GPSR, and EU directives",
    items: [
      { label: "GDPR Suite", href: "/docs/extensions/compliance/gdpr-suite" },
      { label: "GPSR", href: "/docs/extensions/compliance/gpsr" },
      { label: "Omnibus Directive", href: "/docs/extensions/compliance/omnibus-directive" },
    ],
  },
  {
    label: "Marketing",
    href: "/docs/extensions/marketing",
    icon: ShoppingBag,
    description: "Visual merchandising and promotions",
    items: [
      { label: "Product Labels", href: "/docs/extensions/marketing/product-labels" },
    ],
  },
  {
    label: "Catalog & Products",
    href: "/docs/extensions/catalog",
    icon: ShoppingBag,
    description: "Attachments, attribute navigation",
    items: [
      { label: "Product Attachments", href: "/docs/extensions/catalog/product-attachments" },
      { label: "Shop By Attribute", href: "/docs/extensions/catalog/shop-by-attribute" },
    ],
  },
  {
    label: "Media & Content",
    href: "/docs/extensions/media",
    icon: Image,
    description: "Media management and widgets",
    items: [
      { label: "Media Cleaner", href: "/docs/extensions/media/media-cleaner" },
      { label: "Media Player Widget", href: "/docs/extensions/media/media-player-widget" },
      { label: "Category Slider", href: "/docs/extensions/media/category-slider" },
    ],
  },
  {
    label: "Search & Navigation",
    href: "/docs/extensions/search",
    icon: Compass,
    description: "Fast search and navigation tools",
    items: [
      { label: "Fast Search", href: "/docs/extensions/search/fast-search" },
    ],
  },
  {
    label: "Checkout & Shipping",
    href: "/docs/extensions/checkout",
    icon: Truck,
    description: "Store pickup and delivery",
    items: [
      { label: "Store Pickup", href: "/docs/extensions/checkout/store-pickup" },
    ],
  },
];

const openSourceCategories: MenuCategory[] = [
  {
    label: "PHP Libraries & Tools",
    href: "/docs/open-source/php-libraries",
    icon: Code,
    description: "Framework-agnostic PHP packages",
    items: [
      { label: "MageBox", href: "/docs/open-source/php-libraries/magebox" },
      { label: "DJson", href: "/docs/open-source/php-libraries/djson" },
      { label: "Tsukuru", href: "/docs/open-source/php-libraries/tsukuru" },
      { label: "Calculon", href: "/docs/open-source/php-libraries/calculon" },
    ],
  },
  {
    label: "Magento 2 Modules",
    href: "/docs/open-source/magento",
    icon: Package,
    description: "Free community modules",
    items: [
      { label: "Data Patch Creator", href: "/docs/open-source/magento/data-patch-creator" },
      { label: "CloudFlare Cache Cleaner", href: "/docs/open-source/magento/cloudflare-cache-cleaner" },
      { label: "Migration Tool", href: "/docs/open-source/magento/magento-migration-tool" },
      { label: "Product Pack", href: "/docs/open-source/magento/product-pack" },
      { label: "Attribute Pagination", href: "/docs/open-source/magento/attribute-pagination" },
      { label: "Admin Locale Switcher", href: "/docs/open-source/magento/admin-locale-switcher" },
      { label: "Customer Timeout", href: "/docs/open-source/magento/customer-timeout-popup" },
    ],
  },
];

interface DropdownMenuProps {
  label: string;
  categories: MenuCategory[];
  allHref: string;
  allLabel: string;
}

function DropdownMenu({ label, categories, allHref, allLabel }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const isActive = categories.some(
    (cat) => pathname.startsWith(cat.href) || cat.items?.some((item) => pathname.startsWith(item.href))
  );

  function handleEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }

  function handleLeave() {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div
      ref={menuRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        className={cn(
          "flex items-center gap-1 text-sm transition-colors",
          isActive
            ? "text-brand-600 font-medium"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        )}
        onClick={() => setOpen(!open)}
      >
        {label}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl min-w-[640px]">
            <div className="grid grid-cols-2 gap-0 p-2">
              {categories.map((cat) => (
                <div key={cat.href} className="rounded-lg p-3 hover:bg-[var(--color-surface-secondary)] transition-colors">
                  <Link
                    href={cat.href}
                    className="flex items-start gap-3"
                  >
                    <div className="mt-0.5 rounded-md bg-brand-50 p-1.5 dark:bg-brand-950">
                      <cat.icon className="h-4 w-4 text-brand-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {cat.label}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {cat.description}
                      </div>
                      {cat.items && cat.items.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {cat.items.slice(0, 4).map((item) => (
                            <span
                              key={item.href}
                              className="rounded bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]"
                            >
                              {item.label}
                            </span>
                          ))}
                          {cat.items.length > 4 && (
                            <span className="rounded bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                              +{cat.items.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--color-border)] px-4 py-2.5">
              <Link
                href={allHref}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                {allLabel} →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "text-sm transition-colors",
        isActive
          ? "text-brand-600 font-medium"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      )}
    >
      {children}
    </Link>
  );
}

export function MegaMenu() {
  return (
    <nav className="hidden md:flex items-center gap-6">
      <NavLink href="/docs" exact>Documentation</NavLink>

      <DropdownMenu
        label="Extensions"
        categories={extensionCategories}
        allHref="/docs/extensions"
        allLabel="View all extensions"
      />

      <DropdownMenu
        label="Open Source"
        categories={openSourceCategories}
        allHref="/docs/open-source"
        allLabel="View all open source projects"
      />

      <NavLink href="/docs/trident">Trident</NavLink>
      <NavLink href="/docs/development-guidelines">Guidelines</NavLink>
      <NavLink href="/docs/partnership">Partnership</NavLink>
    </nav>
  );
}

export { extensionCategories, openSourceCategories };
