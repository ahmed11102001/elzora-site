import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { JourneyEnhancer } from "./JourneyEnhancer";
import { JourneyIntro } from "./JourneyIntro";

// Server component. It renders the intro (title + route map) into the HTML; JourneyEnhancer swaps it
// for the animated journey as soon as the animation code has loaded. There is no static version.
export function JourneyShell({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  return (
    <section id="journey" aria-labelledby="journey-title" className="bg-ink-deep">
      <JourneyEnhancer lang={lang} copy={dict.journey} intro={<JourneyIntro dict={dict} />} />
    </section>
  );
}
