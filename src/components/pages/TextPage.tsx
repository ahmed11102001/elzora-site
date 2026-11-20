import type { ReactNode } from "react";
import type { PageDocument } from "@/content/pages";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Container } from "@/components/ui/Container";

type TextPageProps = {
  lang: Locale;
  dict: Dictionary;
  page: PageDocument;
  /** Shows the "temporary placeholder text" notice. */
  draft: boolean;
  /** Extra content after the sections (a call to action). */
  children?: ReactNode;
};

// Shared layout of the about and legal pages: one h1, an intro, numbered-by-heading sections.
export function TextPage({ lang, dict, page, draft, children }: TextPageProps) {
  const updated = page.updated
    ? new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "UTC" }).format(
        new Date(`${page.updated}T00:00:00Z`),
      )
    : null;

  return (
    <article className="py-12 sm:py-20">
      <Container className="max-w-3xl">
        <header className="mb-10">
          <h1 className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl">
            {page.title}
          </h1>
          <p className="mt-5 text-lg text-sand/85">{page.intro}</p>
          {updated && (
            <p className="mt-4 text-sm text-sand/60">
              {dict.pages.updated}: <time dateTime={page.updated}>{updated}</time>
            </p>
          )}
          {draft && (
            <aside
              aria-label={dict.pages.draftNotice.title}
              className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm"
            >
              <p className="font-semibold text-gold">{dict.pages.draftNotice.title}</p>
              <p className="mt-1 text-sand/85">{dict.pages.draftNotice.text}</p>
            </aside>
          )}
        </header>

        <div className="space-y-10">
          {page.sections.map((section, index) => (
            <section key={section.heading} aria-labelledby={`section-${index}`}>
              <h2 id={`section-${index}`} className="font-display text-2xl font-semibold">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3 text-sand/85">
                {section.paragraphs?.map((text) => (
                  <p key={text}>{text}</p>
                ))}
                {section.list && (
                  <ul className="list-disc space-y-2 pl-5 marker:text-gold">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.after?.map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {children}
      </Container>
    </article>
  );
}
