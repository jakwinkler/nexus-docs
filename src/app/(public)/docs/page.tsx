import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe,
  Shield,
  ShoppingBag,
  Image,
  Compass,
  Truck,
  Code,
  Package,
  BookOpen,
  ArrowRight,
  Zap,
  Server,
  Layout,
  Cpu,
} from "lucide-react";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://docs.example.com";

export const metadata: Metadata = {
  title: "Documentation — Magento 2 Extensions, Trident, and Open Source Tools",
  description: "Browse documentation for nexus Magento 2 extensions (SEO, GDPR, Speed Suite), Trident Velocity Engine, and open-source PHP libraries. Installation guides, configuration, and developer resources.",
  alternates: {
    canonical: `${siteUrl}/docs`,
  },
};

const sections = [
  {
    title: "Trident Velocity Engine",
    description: "High-performance HTTP caching and reverse proxy built in Rust. Sub-millisecond response times.",
    href: "/docs/trident",
    icon: Zap,
    categories: [
      { label: "Installation", href: "/docs/trident/install", icon: Server },
      { label: "Configuration", href: "/docs/trident/configuration", icon: Cpu },
      { label: "Web Servers", href: "/docs/trident/web-servers", icon: Layout },
      { label: "Templates", href: "/docs/trident/templates", icon: Code },
      { label: "Prism Dashboard", href: "/docs/trident/prism", icon: Compass },
    ],
  },
  {
    title: "Pro Extensions",
    description: "Magento 2 extensions for SEO, compliance, and store optimisation.",
    href: "/docs/extensions",
    icon: ShoppingBag,
    categories: [
      { label: "Speed Suite", href: "/docs/extensions/speed", icon: Zap },
      { label: "SEO Suite", href: "/docs/extensions/seo", icon: Globe },
      { label: "Compliance & Legal", href: "/docs/extensions/compliance", icon: Shield },
      { label: "Marketing", href: "/docs/extensions/marketing", icon: ShoppingBag },
      { label: "Catalog & Products", href: "/docs/extensions/catalog", icon: ShoppingBag },
      { label: "Media & Content", href: "/docs/extensions/media", icon: Image },
      { label: "Search & Navigation", href: "/docs/extensions/search", icon: Compass },
      { label: "Checkout & Shipping", href: "/docs/extensions/checkout", icon: Truck },
    ],
  },
  {
    title: "Open Source",
    description: "Free PHP libraries, developer tools, and Magento 2 modules.",
    href: "/docs/open-source",
    icon: Code,
    categories: [
      { label: "PHP Libraries & Tools", href: "/docs/open-source/php-libraries", icon: Code },
      { label: "Magento 2 Modules", href: "/docs/open-source/magento", icon: Package },
    ],
  },
];

export default function DocsIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Documentation
        </h1>
        <p className="mt-3 text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
          Guides, configuration references, and developer resources for all
          nexus products.
        </p>
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <div
            key={section.href}
            className="rounded-xl border border-[var(--color-border)] overflow-hidden"
          >
            <div className="flex items-center justify-between bg-[var(--color-surface-secondary)] px-6 py-4">
              <div className="flex items-center gap-3">
                <section.icon className="h-5 w-5 text-brand-600" />
                <div>
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {section.description}
                  </p>
                </div>
              </div>
              <Link
                href={section.href}
                className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-y divide-[var(--color-border)]">
              {section.categories.map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-[var(--color-surface-secondary)] transition-colors"
                >
                  <cat.icon className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <span className="text-sm font-medium">{cat.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/docs/development-guidelines"
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm hover:border-brand-400 transition-colors"
        >
          <BookOpen className="h-4 w-4 text-brand-600" />
          Development Guidelines
        </Link>
        <Link
          href="/docs/partnership"
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm hover:border-brand-400 transition-colors"
        >
          Partnership Program
        </Link>
      </div>
    </div>
  );
}
