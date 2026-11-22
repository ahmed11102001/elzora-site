import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FollowUpInput,
  NoteInput,
  StatusInput,
  filterQuery,
  followUpState,
  isClosed,
  likePattern,
  parseLeadFilter,
} from "./model";

const ID = "5b7c1c0e-3b0a-4c0e-9a55-0f6f5f1d2a11";

describe("parseLeadFilter", () => {
  it("accepts known values and normalizes them", () => {
    const f = parseLeadFilter({
      status: "qualified",
      locale: "de",
      country: "de",
      trip: "Nile-Cruise",
      due: "1",
      page: "3",
      q: "  anna ",
    });
    assert.deepEqual(f, {
      q: "anna",
      status: "qualified",
      locale: "de",
      country: "DE",
      trip: "nile-cruise",
      due: true,
      page: 3,
    });
  });
  it("drops unknown or malicious values instead of trusting them", () => {
    const f = parseLeadFilter({
      status: "x'; drop table leads",
      locale: "fr",
      country: "GER",
      trip: "a b",
      page: "-4",
      due: "yes",
    });
    assert.equal(f.status, undefined);
    assert.equal(f.locale, undefined);
    assert.equal(f.country, undefined);
    assert.equal(f.trip, undefined);
    assert.equal(f.page, 1);
    assert.equal(f.due, false);
  });
  it("takes the first of repeated parameters and caps the search text", () => {
    assert.equal(parseLeadFilter({ status: ["lost", "new"] }).status, "lost");
    assert.equal(parseLeadFilter({ q: "x".repeat(500) }).q.length, 80);
  });
  it("round-trips through filterQuery", () => {
    const f = parseLeadFilter({ status: "new", country: "AT", q: "mü" });
    assert.deepEqual(parseLeadFilter(Object.fromEntries(new URLSearchParams(filterQuery(f)))), f);
  });
});

describe("search pattern", () => {
  it("escapes LIKE wildcards", () => {
    assert.equal(likePattern("100%_x\\"), "%100\\%\\_x\\\\%");
  });
});

describe("follow-up state", () => {
  const today = "2026-11-22";
  it("is overdue, today or upcoming for open leads", () => {
    assert.equal(followUpState("2026-11-01", "new", today), "overdue");
    assert.equal(followUpState(today, "contacted", today), "today");
    assert.equal(followUpState("2026-12-01", "qualified", today), "upcoming");
  });
  it("is nothing for closed leads or without a date", () => {
    assert.equal(followUpState("2026-11-01", "converted", today), null);
    assert.equal(followUpState("2026-11-01", "lost", today), null);
    assert.equal(followUpState(null, "new", today), null);
    assert.equal(isClosed("proposal_sent"), false);
  });
});

describe("form input", () => {
  it("validates status changes", () => {
    assert.equal(StatusInput.safeParse({ id: ID, status: "proposal_sent" }).success, true);
    assert.equal(StatusInput.safeParse({ id: ID, status: "rejected" }).success, false);
    assert.equal(StatusInput.safeParse({ id: "1; drop", status: "new" }).success, false);
  });
  it("validates notes", () => {
    assert.equal(NoteInput.safeParse({ id: ID, text: "  " }).success, false);
    assert.equal(NoteInput.safeParse({ id: ID, text: "Called, will call back" }).success, true);
    assert.equal(NoteInput.safeParse({ id: ID, text: "x".repeat(2001) }).success, false);
  });
  it("validates follow-up dates, an empty one clears it", () => {
    assert.deepEqual(FollowUpInput.parse({ id: ID, date: "" }).date, null);
    assert.equal(FollowUpInput.parse({ id: ID, date: "2026-12-01" }).date, "2026-12-01");
    assert.equal(FollowUpInput.safeParse({ id: ID, date: "01/12/2026" }).success, false);
    assert.equal(FollowUpInput.safeParse({ id: ID, date: "2026-13-45" }).success, false);
  });
});
