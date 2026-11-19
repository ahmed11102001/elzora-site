import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CSV_COLUMNS, escapeCsvCell, leadsToCsv } from "./csv";
import { fakeStorage, toNew, validInput } from "./fixtures";
import { createLeadSchema } from "./schema";
import { NOW } from "./fixtures";
import { authorizeAdmin } from "./admin-auth";

describe("CSV export", () => {
  it("quotes and escapes values", () => {
    assert.equal(escapeCsvCell('say "hi", ok\nnext'), '"say ""hi"", ok\nnext"');
    assert.equal(escapeCsvCell(null), '""');
    assert.equal(escapeCsvCell(["a", "b"]), '"a; b"');
    assert.equal(escapeCsvCell(new Date("2026-01-02T03:04:05Z")), '"2026-01-02T03:04:05.000Z"');
  });

  it("defuses spreadsheet formulas", () => {
    for (const bad of ["=1+1", "+SUM(A1)", "-2+3", "@cmd", "\t=1", "\r=1", '  =HYPERLINK("x")']) {
      assert.match(escapeCsvCell(bad), /^"'/, bad);
    }
    assert.equal(escapeCsvCell("Anna = Müller"), '"Anna = Müller"');
  });

  it("writes a UTF-8 BOM, a header row and German characters", async () => {
    const { storage } = fakeStorage();
    const parsed = createLeadSchema(() => NOW).parse(
      validInput({ fullName: "Jürgen Groß", notes: "=cmd|' /C calc'!A0" }),
    );
    await storage.insert(toNew(parsed));
    const csv = leadsToCsv(await storage.listForExport(10));
    assert.equal(csv.charCodeAt(0), 0xfeff);
    assert.ok(csv.includes("Jürgen Groß"));
    assert.ok(csv.includes("\"'=cmd"));
    const [header, row] = csv.slice(1).split("\r\n");
    assert.equal(header.split('","').length, CSV_COLUMNS.length);
    assert.ok(header.startsWith('"reference_code","status"'));
    for (const col of [
      "utm_source",
      "utm_campaign",
      "referrer",
      "consented_at",
      "locale",
      "interests",
    ]) {
      assert.ok(header.includes(`"${col}"`), col);
    }
    assert.ok(row.includes("google"));
  });
});

describe("export authorization", () => {
  const token = "x".repeat(40);
  const req = (auth?: string) => new Headers(auth ? { authorization: auth } : {});

  it("is disabled (404) without a sufficiently long token", () => {
    assert.equal(authorizeAdmin(req(`Bearer ${token}`), undefined), "disabled");
    assert.equal(authorizeAdmin(req("Bearer short"), "short"), "disabled");
  });
  it("rejects missing or wrong credentials", () => {
    assert.equal(authorizeAdmin(req(), token), "unauthorized");
    assert.equal(authorizeAdmin(req("Bearer nope"), token), "unauthorized");
    assert.equal(authorizeAdmin(req(`Basic ${token}`), token), "unauthorized");
  });
  it("accepts the right bearer token", () => {
    assert.equal(authorizeAdmin(req(`Bearer ${token}`), token), "ok");
  });
});
