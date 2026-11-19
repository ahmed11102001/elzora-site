import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLeadSchema, parseIsoDate, toFieldErrors } from "./schema";
import { NOW, validInput } from "./fixtures";

const schema = createLeadSchema(() => NOW);
const errorsFor = (over: Record<string, unknown>) => {
  const r = schema.safeParse(validInput(over));
  return r.success ? {} : toFieldErrors(r.error);
};

describe("lead schema", () => {
  it("accepts a valid payload and normalises it", () => {
    const r = schema.safeParse(validInput());
    assert.ok(r.success);
    assert.equal(r.data.email, "anna@example.de");
    assert.equal(r.data.country, "DE");
    assert.deepEqual(r.data.interests, ["history", "nile"]);
    assert.equal(r.data.attribution.utmSource, "google");
  });

  it("sanitises control characters, bidi marks and whitespace", () => {
    const r = schema.safeParse(
      validInput({ fullName: "  Anna\u0000 \u202EMüller\n ", notes: "a\r\n\r\n\r\n\r\nb\u0007" }),
    );
    assert.ok(r.success);
    assert.equal(r.data.fullName, "Anna Müller");
    assert.equal(r.data.notes, "a\n\nb");
  });

  it("rejects an invalid email", () => {
    assert.equal(errorsFor({ email: "not-an-email" }).email, "invalid_email");
  });

  it("requires departure after arrival", () => {
    assert.equal(errorsFor({ departure: "2027-03-01" }).departure, "departure_before_arrival");
    assert.equal(errorsFor({ departure: "2027-02-20" }).departure, "departure_before_arrival");
  });

  it("rejects past, impossible and far-future dates", () => {
    assert.equal(
      errorsFor({ arrival: "2026-11-18", departure: "2026-11-25" }).arrival,
      "date_in_past",
    );
    assert.equal(errorsFor({ arrival: "2027-02-30" }).arrival, "invalid_date");
    assert.equal(
      errorsFor({ arrival: "2030-01-01", departure: "2030-01-05" }).arrival,
      "date_too_far",
    );
    assert.equal(
      errorsFor({ arrival: "2027-03-01", departure: "2027-09-01" }).departure,
      "stay_too_long",
    );
  });

  it("allows arrival today (UTC)", () => {
    assert.deepEqual(errorsFor({ arrival: "2026-11-19", departure: "2026-11-22" }), {});
  });

  it("validates traveler counts and children's ages", () => {
    assert.equal(errorsFor({ adults: 0 }).adults, "required");
    assert.equal(errorsFor({ adults: 13 }).adults, "too_many_travelers");
    assert.equal(
      errorsFor({ adults: 12, children: 6, childrenAges: [1, 2, 3, 4, 5, 6] }).children,
      "too_many_travelers",
    );
    assert.equal(errorsFor({ children: 2, childrenAges: [4] }).childrenAges, "age_invalid");
    assert.equal(errorsFor({ children: 1, childrenAges: [18] })["childrenAges.0"], "age_invalid");
    assert.equal(errorsFor({ children: 1, childrenAges: [null] })["childrenAges.0"], "age_invalid");
    assert.deepEqual(errorsFor({ children: 0, childrenAges: [] }), {});
  });

  it("validates budget and duration against the allowed options", () => {
    assert.equal(errorsFor({ budget: "5000" }).budget, "required");
    assert.equal(errorsFor({ duration: "2 weeks" }).duration, "required");
    assert.deepEqual(errorsFor({ budget: "unsure", duration: "unsure" }), {});
  });

  it("requires explicit consent", () => {
    assert.equal(errorsFor({ consent: false }).consent, "consent_required");
    assert.equal(errorsFor({ consent: undefined }).consent, "consent_required");
    assert.equal(errorsFor({ consent: "true" }).consent, "consent_required");
  });

  it("requires contact fields and limits lengths", () => {
    assert.equal(errorsFor({ fullName: "" }).fullName, "required");
    assert.equal(errorsFor({ country: "" }).country, "required");
    assert.equal(errorsFor({ country: "XX" }).country, "invalid_option");
    assert.equal(errorsFor({ notes: "x".repeat(1501) }).notes, "too_long");
    assert.equal(errorsFor({ phone: "abc" }).phone, "invalid_phone");
    assert.deepEqual(errorsFor({ phone: "" }), {});
  });

  it("handles flexible and undecided date modes", () => {
    assert.equal(
      errorsFor({ dateMode: "flexible", arrival: undefined, departure: undefined }).flexibleWhen,
      "required",
    );
    assert.deepEqual(errorsFor({ dateMode: "flexible", flexibleWhen: "month:2027-03" }), {});
    assert.deepEqual(errorsFor({ dateMode: "flexible", flexibleWhen: "season:winter" }), {});
    assert.equal(
      errorsFor({ dateMode: "flexible", flexibleWhen: "month:2020-01" }).flexibleWhen,
      "date_in_past",
    );
    assert.equal(
      errorsFor({ dateMode: "flexible", flexibleWhen: "soon" }).flexibleWhen,
      "invalid_option",
    );
    const r = schema.safeParse(validInput({ dateMode: "undecided" }));
    assert.ok(r.success);
    assert.equal(r.data.arrival, undefined);
  });

  it("rejects malformed payloads", () => {
    assert.equal(schema.safeParse(null).success, false);
    assert.equal(schema.safeParse("x").success, false);
    assert.equal(errorsFor({ idempotencyKey: "nope" }).idempotencyKey, "invalid");
  });

  it("clips attribution fields and keeps UTM values", () => {
    const r = errorsFor({ attribution: { utmSource: "x".repeat(500) } });
    assert.equal(r["attribution.utmSource"], "too_long");
  });

  it("parseIsoDate only accepts real calendar days", () => {
    assert.ok(parseIsoDate("2028-02-29"));
    assert.equal(parseIsoDate("2027-02-29"), null);
    assert.equal(parseIsoDate("2027-2-1"), null);
  });
});
