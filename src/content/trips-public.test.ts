import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { destinationIdFromSlug, destinationSlug } from "./destination-slugs";
import { Destination, Trip } from "./schema";
import { destinations as destinationSeed } from "./seed/destinations";
import { trips as tripSeed } from "./seed/trips";
import {
  durationBucket,
  filterViews,
  parseFilter,
  publicTripsFromSeed,
  toView,
  viewsFor,
  type PublicTrip,
} from "./trips-public";

const seed = publicTripsFromSeed(z.array(Trip).parse(tripSeed));
const published = ["published"] as const;
const withReview = ["published", "review"] as const;

describe("trip views", () => {
  it("shows each language only where it exists, never falling back to English", () => {
    const trip: PublicTrip = {
      ...seed[0],
      translations: { en: { ...seed[0].translations.en!, status: "published" } },
    };
    assert.ok(toView(trip, "en", published));
    assert.equal(toView(trip, "de", published), null);
  });
  it("hides review copy when only published is allowed, shows it pre-launch", () => {
    assert.equal(viewsFor(seed, "en", published).length, 0); // the seed is all "review"
    assert.equal(viewsFor(seed, "en", withReview).length, seed.length);
  });
  it("hides a translation without a slug (a draft in progress)", () => {
    const trip: PublicTrip = {
      ...seed[0],
      translations: { en: { ...seed[0].translations.en!, slug: "", status: "published" } },
    };
    assert.equal(toView(trip, "en", published), null);
  });
  it("lists the slug of every visible language, and uses the alt text of the page's language", () => {
    const trip: PublicTrip = {
      ...seed[0],
      image: { photoId: "sphinx", alt: { en: "Sphinx", de: "Sphinx DE" } },
    };
    const de = toView(trip, "de", withReview);
    assert.ok(de);
    assert.equal(de.image?.alt, "Sphinx DE");
    assert.equal(de.slugs.en, seed[0].translations.en?.slug);
    assert.equal(de.slugs.de, de.slug);
    assert.notEqual(de.slugs.de, de.slugs.en);
  });
  it("puts featured trips first", () => {
    const list = viewsFor(
      [
        { ...seed[1], featured: false },
        { ...seed[0], featured: true },
      ],
      "en",
      withReview,
    );
    assert.equal(list[0].id, seed[0].id);
  });
});

describe("listing filters", () => {
  const views = viewsFor(seed, "en", withReview);
  it("buckets durations", () => {
    assert.equal(durationBucket(4), "short");
    assert.equal(durationBucket(8), "medium");
    assert.equal(durationBucket(12), "long");
  });
  it("filters by style, destination and duration together", () => {
    const style = views[0].styleIds[0];
    const all = filterViews(views, { style });
    assert.ok(all.length >= 1 && all.every((t) => t.styleIds.includes(style)));
    assert.equal(filterViews(views, { style, destination: "nowhere" }).length, 0);
    assert.ok(filterViews(views, { duration: durationBucket(views[0].durationDays) }).length >= 1);
  });
  it("drops unknown or repeated query values instead of trusting them", () => {
    const known = { styles: ["classic"], destinations: ["giza"], budgets: ["lt1000"] };
    assert.deepEqual(
      parseFilter({ style: "evil", duration: "x", budget: "9", destination: "z" }, known),
      {
        style: undefined,
        destination: undefined,
        duration: undefined,
        budget: undefined,
      },
    );
    assert.equal(parseFilter({ style: ["classic", "x"] }, known).style, "classic");
    assert.equal(parseFilter({ duration: "long" }, known).duration, "long");
  });
});

describe("destinations", () => {
  const parsed = z.array(Destination).parse(destinationSeed);
  it("every destination has a localized slug and German text", () => {
    for (const d of parsed) {
      assert.ok(destinationSlug(d.id, "de"), d.id);
      assert.ok(d.name.de && d.tagline.de && d.summary.de, `${d.id} needs German text`);
      for (const lang of ["en", "de"] as const)
        assert.equal(destinationIdFromSlug(destinationSlug(d.id, lang), lang), d.id);
    }
  });
  it("uses the approved German slugs", () => {
    assert.equal(destinationSlug("giza", "de"), "gizeh");
    assert.equal(destinationSlug("aswan", "de"), "assuan");
  });
});
