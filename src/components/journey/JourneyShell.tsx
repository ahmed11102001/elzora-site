import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { JourneyEnhancer } from "./JourneyEnhancer";
import { JourneyIntro } from "./JourneyIntro";
import { StaticJourney } from "./StaticJourney";

// Server component. It renders the intro and the static journey into the HTML, then hands both to
// JourneyEnhancer, which upgrades them to the animated journey when the device and connection allow.
export function JourneyShell({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  return (
    <section id="journey" aria-labelledby="journey-title" className="bg-ink-deep">
      <JourneyEnhancer
        lang={lang}
        copy={dict.journey}
        intro={<JourneyIntro dict={dict} />}
        stack={<StaticJourney lang={lang} dict={dict} />}
      />
    </section>
  );
}
