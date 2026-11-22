import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFaqs } from "@/content";
import { getPublicTrips } from "@/content/public";
import { localize } from "@/content/schema";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { TripCard, TripCardSkeleton } from "@/components/trips/TripCard";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { icons } from "@/components/ui/icons";
import { Photo } from "@/components/ui/Photo";
import { Section } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/Skeleton";
import { Stepper } from "@/components/ui/Stepper";
import { ModalDemo } from "./ModalDemo";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const swatches = [
  { name: "ink", hex: "#0B1F3A", className: "bg-ink" },
  { name: "ink-deep", hex: "#050D1A", className: "bg-ink-deep" },
  { name: "gold", hex: "#C9A24B", className: "bg-gold" },
  { name: "sand", hex: "#F3E9D7", className: "bg-sand" },
  { name: "teal", hex: "#2AA6AB", className: "bg-teal" },
];

// Internal page to review the components. Hidden in production unless ENABLE_DESIGN_PAGE=true.
export default async function DesignPage({ params }: PageProps<"/[lang]/design">) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_PAGE !== "true")
    notFound();
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const [trips, faqs] = await Promise.all([getPublicTrips(lang), getFaqs()]);

  return (
    <>
      <Section
        eyebrow="Design system"
        title="Colors and type"
        description="Tokens live in src/app/globals.css."
      >
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {swatches.map((s) => (
            <div key={s.name}>
              <div className={`${s.className} h-20 rounded-xl border border-sand/20`} />
              <p className="mt-2 text-sm font-medium">{s.name}</p>
              <p className="text-xs text-sand/60">{s.hex}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <p className="font-display text-6xl leading-none font-semibold">Display 60 Cormorant</p>
          <p className="font-display text-4xl font-semibold italic">Italic accent 36</p>
          <h3 className="font-display text-2xl font-semibold">Heading 24</h3>
          <p className="text-lg">
            Body large 18 Inter. Äöüß for German. Egypt isn’t a destination.
          </p>
          <p className="text-sm text-sand/70">Small muted 14 Inter</p>
        </div>
      </Section>

      <Section tone="deep" eyebrow="Actions" title="Buttons, chips, icons">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button href="#">Primary</Button>
          <Button href="#" variant="ghost">
            Ghost
          </Button>
          <Button href="#" size="sm">
            Small
          </Button>
          <Chip>Gold chip</Chip>
          <Chip tone="neutral">Neutral chip</Chip>
        </div>
        <ul className="flex flex-wrap gap-5">
          {Object.entries(icons).map(([name, Icon]) => (
            <li key={name} className="flex w-20 flex-col items-center gap-2 text-xs text-sand/80">
              <Icon className="size-7 text-gold" />
              {name}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        eyebrow="Content"
        title="Trip cards"
        description="Real seed data, then the loading skeleton."
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} lang={lang} labels={dict.trips} />
          ))}
        </div>
        <p className="mt-10 mb-4 text-sm text-sand/60">Skeleton</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <TripCardSkeleton />
          <TripCardSkeleton />
          <TripCardSkeleton />
        </div>
      </Section>

      <Section tone="deep" eyebrow="Content" title="FAQ accordion">
        <div className="max-w-3xl">
          <Accordion
            name="faq"
            items={faqs.map((f) => ({
              id: f.id,
              question: localize(f.question, lang),
              answer: localize(f.answer, lang),
            }))}
          />
        </div>
      </Section>

      <Section eyebrow="Forms" title="Fields, stepper, modal">
        <div className="mb-10 max-w-xl">
          <Stepper
            label="Trip planner progress"
            current={2}
            steps={["When", "Who", "Interests", "Budget", "Contact"]}
          />
        </div>
        <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
          <Field label="Name" hint="As on your passport">
            {(p) => <Input placeholder="Anna Schmidt" {...p} />}
          </Field>
          <Field label="Email" error="Please enter a valid email">
            {(p) => <Input type="email" defaultValue="anna@" {...p} />}
          </Field>
          <Field label="When do you want to travel?">
            {(p) => (
              <Select defaultValue="" {...p}>
                <option value="" disabled>
                  Choose a month
                </option>
                <option>March</option>
                <option>April</option>
              </Select>
            )}
          </Field>
          <Field label="Anything we should know?" className="sm:col-span-2">
            {(p) => <Textarea {...p} />}
          </Field>
        </div>
        <div className="mt-8">
          <ModalDemo closeLabel={dict.common.close} />
        </div>
      </Section>

      <Section tone="deep" eyebrow="Media" title="Photo and cards">
        <div className="grid gap-6 lg:grid-cols-2">
          <Photo
            id="giza-pyramids"
            alt="The three pyramids of Giza under a blue sky"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-[16/10] rounded-2xl"
          />
          <Card>
            <CardBody className="space-y-4">
              <h3 className="font-display text-2xl font-semibold">Generic card</h3>
              <p className="text-sand/75">
                Cards, skeleton blocks and chips share the same borders and radii.
              </p>
              <Skeleton className="h-4 w-2/3" />
            </CardBody>
          </Card>
        </div>
      </Section>
    </>
  );
}
