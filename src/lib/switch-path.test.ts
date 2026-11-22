import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { switchPath, type TripSlugMap } from "./switch-path";

const slugs: TripSlugMap = {
  en: { "nile-cruise": { en: "nile-cruise", de: "nilkreuzfahrt" }, "en-only": { en: "en-only" } },
  de: { nilkreuzfahrt: { en: "nile-cruise", de: "nilkreuzfahrt" } },
};

describe("switchPath", () => {
  it("maps a trip to its translated slug", () => {
    assert.equal(switchPath("/en/trips/nile-cruise", "de", slugs), "/de/reisen/nilkreuzfahrt");
    assert.equal(switchPath("/de/reisen/nilkreuzfahrt", "en", slugs), "/en/trips/nile-cruise");
  });
  it("goes to the list when the other language has no such trip", () => {
    assert.equal(switchPath("/en/trips/en-only", "de", slugs), "/de/reisen");
    assert.equal(switchPath("/en/trips/unknown", "de", slugs), "/de/reisen");
  });
  it("maps destinations to their localized slugs", () => {
    assert.equal(switchPath("/en/destinations/giza", "de", slugs), "/de/reiseziele/gizeh");
    assert.equal(switchPath("/de/reiseziele/assuan", "en", slugs), "/en/destinations/aswan");
  });
  it("keeps other pages working", () => {
    assert.equal(switchPath("/en/privacy", "de", slugs), "/de/datenschutz");
    assert.equal(switchPath("/en/trips", "de", slugs), "/de/reisen");
    assert.equal(switchPath("/en", "de", slugs), "/de");
  });
});
