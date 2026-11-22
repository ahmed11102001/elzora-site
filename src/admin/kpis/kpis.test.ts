import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFINITIONS,
  DIMENSIONS,
  bucketStart,
  buildFunnel,
  buildReport,
  buildSeries,
  defaultGroup,
  formatDuration,
  formatPercent,
  isoDay,
  kpiQueryString,
  parseKpiQuery,
  percent,
  windowFor,
  type Raw,
} from "./model";

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("parseKpiQuery", () => {
  it("defaults to 30 days grouped by day", () => {
    assert.deepEqual(parseKpiQuery({}), { range: "30d", group: "day" });
  });
  it("picks a sensible bucket for each period unless one is chosen", () => {
    assert.equal(defaultGroup("7d"), "day");
    assert.equal(defaultGroup("90d"), "week");
    assert.equal(defaultGroup("365d"), "month");
    assert.deepEqual(parseKpiQuery({ range: "365d" }), { range: "365d", group: "month" });
    assert.deepEqual(parseKpiQuery({ range: "90d", by: "day" }), { range: "90d", group: "day" });
  });
  it("drops unknown or malicious values instead of trusting them", () => {
    assert.deepEqual(parseKpiQuery({ range: "1y; drop table leads", by: "century" }), {
      range: "30d",
      group: "day",
    });
    assert.equal(parseKpiQuery({ range: ["7d", "90d"] }).range, "7d");
  });
  it("round-trips through kpiQueryString", () => {
    const q = parseKpiQuery({ range: "90d", by: "month" });
    assert.deepEqual(parseKpiQuery(Object.fromEntries(new URLSearchParams(kpiQueryString(q)))), q);
  });
});

describe("windowFor", () => {
  it("covers exactly N UTC calendar days and includes today", () => {
    const { from, to } = windowFor("7d", new Date("2026-11-22T17:49:00Z"));
    assert.equal(isoDay(from), "2026-11-16");
    assert.equal(isoDay(to), "2026-11-23"); // exclusive: start of tomorrow
    assert.equal((to.getTime() - from.getTime()) / 86_400_000, 7);
  });
  it("does not shift near midnight UTC", () => {
    const { from, to } = windowFor("30d", new Date("2026-11-22T23:59:59Z"));
    assert.equal(isoDay(to), "2026-11-23");
    assert.equal(isoDay(from), "2026-10-24");
  });
});

describe("bucketStart", () => {
  it("weeks start on Monday", () => {
    assert.equal(isoDay(bucketStart(at("2026-11-22"), "week")), "2026-11-16"); // Sunday
    assert.equal(isoDay(bucketStart(at("2026-11-16"), "week")), "2026-11-16"); // Monday
    assert.equal(isoDay(bucketStart(at("2026-11-18"), "week")), "2026-11-16"); // Wednesday
  });
  it("months start on the 1st, days stay days", () => {
    assert.equal(isoDay(bucketStart(at("2026-11-22"), "month")), "2026-11-01");
    assert.equal(isoDay(bucketStart(at("2026-11-22"), "day")), "2026-11-22");
  });
});

describe("buildSeries", () => {
  it("fills empty days with zeros", () => {
    const window = windowFor("7d", new Date("2026-11-22T10:00:00Z"));
    const series = buildSeries([{ bucket: "2026-11-18", leads: 3, converted: 1 }], window, "day");
    assert.equal(series.length, 7);
    assert.equal(series[0].bucket, "2026-11-16");
    assert.equal(series[6].bucket, "2026-11-22");
    assert.deepEqual(series[2], { bucket: "2026-11-18", leads: 3, converted: 1 });
    assert.equal(series.filter((p) => p.leads === 0).length, 6);
  });
  it("starts weekly buckets on the Monday before the window", () => {
    const window = windowFor("90d", new Date("2026-11-22T10:00:00Z"));
    const series = buildSeries([], window, "week");
    assert.equal(new Date(`${series[0].bucket}T00:00:00Z`).getUTCDay(), 1);
    assert.ok(series.length >= 13 && series.length <= 14);
    // consecutive buckets are exactly 7 days apart
    for (let i = 1; i < series.length; i++) {
      const gap = Date.parse(series[i].bucket) - Date.parse(series[i - 1].bucket);
      assert.equal(gap, 7 * 86_400_000);
    }
  });
  it("makes one point per month for a year", () => {
    const window = windowFor("365d", new Date("2026-11-22T10:00:00Z"));
    const series = buildSeries([{ bucket: "2026-11-01", leads: 5, converted: 2 }], window, "month");
    assert.equal(series.length, 13);
    assert.equal(series[series.length - 1].bucket, "2026-11-01");
    assert.equal(series[series.length - 1].leads, 5);
    assert.ok(series.every((p) => p.bucket.endsWith("-01")));
  });
});

describe("numbers", () => {
  it("never reports a percentage of nothing", () => {
    assert.equal(percent(0, 0), null);
    assert.equal(percent(5, 0), null);
    assert.equal(percent(1, 3), 33);
    assert.equal(percent(2, 3), 67);
    assert.equal(formatPercent(null), "–");
    assert.equal(formatPercent(40), "40%");
  });
  it("formats durations for people", () => {
    assert.equal(formatDuration(null), "–");
    assert.equal(formatDuration(-5), "–");
    assert.equal(formatDuration(20), "< 1 min");
    assert.equal(formatDuration(45 * 60), "45 min");
    assert.equal(formatDuration(3 * 3600), "3 h");
    assert.equal(formatDuration(3 * 3600 + 20 * 60), "3 h 20 min");
    assert.equal(formatDuration(2 * 86_400), "2 d");
    assert.equal(formatDuration(2 * 86_400 + 4 * 3600), "2 d 4 h");
  });
});

describe("buildFunnel", () => {
  it("counts a lead for every stage up to the furthest one it reached", () => {
    // 4 never contacted, 2 stopped at contacted, 1 at qualified, 1 skipped to converted
    const funnel = buildFunnel([
      { rank: 0, leads: 4 },
      { rank: 1, leads: 2 },
      { rank: 2, leads: 1 },
      { rank: 4, leads: 1 },
    ]);
    assert.deepEqual(
      funnel.map((s) => s.leads),
      [8, 4, 2, 1, 1],
    );
    assert.deepEqual(
      funnel.map((s) => s.stage),
      ["new", "contacted", "qualified", "proposal_sent", "converted"],
    );
    assert.equal(funnel[0].ofCreated, 100);
    assert.equal(funnel[1].ofCreated, 50);
  });
  it("is empty-safe", () => {
    const funnel = buildFunnel([]);
    assert.deepEqual(
      funnel.map((s) => s.leads),
      [0, 0, 0, 0, 0],
    );
    assert.ok(funnel.every((s) => s.ofCreated === null));
  });
});

describe("buildReport", () => {
  const raw: Raw = {
    rankCounts: [
      { rank: 0, leads: 6 },
      { rank: 1, leads: 2 },
      { rank: 4, leads: 2 },
    ],
    series: [{ bucket: "2026-11-20", leads: 4, converted: 1 }],
    response: { answered: 4, medianSeconds: 5400, averageSeconds: 7200, within24h: 3 },
    waiting: { count: 6, oldestAt: "2026-11-10T08:00:00.000Z" },
    breakdowns: Object.fromEntries(DIMENSIONS.map((d) => [d, []])) as unknown as Raw["breakdowns"],
  };
  const window = windowFor("7d", new Date("2026-11-22T10:00:00Z"));

  it("derives totals, conversion and response numbers", () => {
    const report = buildReport(raw, window, "day");
    assert.equal(report.total, 10);
    assert.equal(report.converted, 2);
    assert.equal(report.conversionRate, 20);
    assert.equal(report.response.answered, 4);
    assert.equal(report.response.unanswered, 6);
    assert.equal(report.response.medianSeconds, 5400);
    assert.equal(report.response.within24hShare, 75);
    assert.equal(report.waiting.count, 6);
    assert.equal(report.series.length, 7);
    assert.equal(report.window.from, "2026-11-16T00:00:00.000Z");
    assert.equal(report.window.to, "2026-11-23T00:00:00.000Z");
  });
  it("has no conversion rate and no response share for an empty period", () => {
    const empty = buildReport(
      {
        ...raw,
        rankCounts: [],
        response: { answered: 0, medianSeconds: null, averageSeconds: null, within24h: 0 },
      },
      window,
      "day",
    );
    assert.equal(empty.total, 0);
    assert.equal(empty.conversionRate, null);
    assert.equal(empty.response.within24hShare, null);
    assert.equal(empty.response.unanswered, 0);
  });
});

describe("definitions", () => {
  it("documents every number the page shows", () => {
    const terms = DEFINITIONS.map((d) => d.term);
    for (const needed of ["Leads", "Funnel", "Conversion rate", "Response time", "Waiting now"])
      assert.ok(terms.includes(needed), `missing definition: ${needed}`);
  });
});
