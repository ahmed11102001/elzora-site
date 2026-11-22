import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugFromRedirectPath, tripPublicPath } from "./paths";
import { tagsForTrip } from "./tags";

describe("publishing helpers", () => {
  it("builds localized trip paths from the route map", () => {
    assert.equal(tripPublicPath("en", "nile-classic"), "/en/trips/nile-classic");
    assert.equal(tripPublicPath("de", "nil-klassik"), "/de/reisen/nil-klassik");
  });
  it("reads a slug back from a redirect path", () => {
    assert.equal(slugFromRedirectPath("de", "/de/reisen/alt"), "alt");
    assert.equal(slugFromRedirectPath("de", "/en/trips/alt"), null);
    assert.equal(slugFromRedirectPath("en", "/en/trips/a/b"), null);
  });
  it("invalidates the trip, the listings and the sitemap", () => {
    assert.deepEqual(tagsForTrip("abc"), ["trip:abc", "trips", "sitemap"]);
  });
});
