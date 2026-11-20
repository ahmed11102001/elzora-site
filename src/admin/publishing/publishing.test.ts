import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tripPublicPath } from "./paths";
import { tagsForTrip } from "./tags";

describe("publishing helpers", () => {
  it("builds localized, encoded trip paths", () => {
    assert.equal(tripPublicPath("en", "nile-classic"), "/en/trips/nile-classic");
    assert.equal(tripPublicPath("de", "nil-klassik"), "/de/reisen/nil-klassik");
  });
  it("invalidates the trip, the listings and the sitemap", () => {
    assert.deepEqual(tagsForTrip("abc"), ["trip:abc", "trips", "sitemap"]);
  });
});
