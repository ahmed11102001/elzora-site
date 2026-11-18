import type { Dictionary } from "@/i18n/dictionaries";
import { Container } from "@/components/ui/Container";
import { Photo } from "@/components/ui/Photo";

// Editorial split: a tall photograph on one side, the reasons as a numbered list on the other, then
// the plain explanation of how ELZORA earns. All copy lives in the dictionaries.
export function WhyElzora({ dict }: { dict: Dictionary }) {
  const t = dict.home.why;

  return (
    <section id="why" aria-labelledby="why-title" className="bg-sand py-16 text-ink sm:py-24">
      <Container className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
        <figure className="lg:sticky lg:top-28 lg:col-span-5">
          <Photo
            id="pyramid-closeup"
            alt={t.imageAlt}
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="aspect-[4/3] rounded-2xl sm:aspect-[16/9] lg:aspect-[4/5]"
          />
        </figure>

        <div className="lg:col-span-7">
          <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-ink/70 uppercase">
            {t.eyebrow}
          </p>
          <h2
            id="why-title"
            className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 max-w-xl text-lg text-ink/80">{t.intro}</p>

          <ol className="mt-10 divide-y divide-ink/15 border-y border-ink/15">
            {t.items.map((item, index) => (
              <li key={item.title} className="grid gap-1 py-6 sm:grid-cols-[3.5rem_1fr] sm:gap-4">
                <span aria-hidden className="font-display text-3xl leading-none text-ink/40">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-2xl font-semibold">{item.title}</h3>
                  <p className="mt-1 text-ink/80">{item.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <aside
            aria-labelledby="transparency-title"
            className="mt-10 rounded-2xl bg-ink p-6 text-sand sm:p-8"
          >
            <h3 id="transparency-title" className="font-display text-2xl font-semibold text-gold">
              {t.transparency.title}
            </h3>
            <p className="mt-3 text-sand/85">{t.transparency.text}</p>
          </aside>
        </div>
      </Container>
    </section>
  );
}
