import Link from "next/link";
import { Container } from "./Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteUrl } from "@/lib/site";

export type Crumb = { label: string; href?: string };

// Visible breadcrumb trail plus the matching BreadcrumbList structured data. The last item is the page.
export function Breadcrumbs({ items, label }: { items: Crumb[]; label: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${siteUrl}${item.href}` } : {}),
    })),
  };
  return (
    <nav aria-label={label} className="border-b border-fg/10 py-3 text-sm">
      <JsonLd data={data} />
      <Container>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-fg/70">
          {items.map((item, index) => (
            <li key={item.label} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden>/</span>}
              {item.href ? (
                <Link href={item.href} className="hover:text-accent">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-fg">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </Container>
    </nav>
  );
}
