import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminInternalPath, isAdminHost, isAdminPath, ownerEmails, supabaseConfig } from "./config";
import { PERMISSIONS, can, roleFor } from "./auth/permissions";

describe("admin host", () => {
  it("matches admin.* hosts by default, including admin.localhost", () => {
    assert.equal(isAdminHost("admin.elzora.com", {}), true);
    assert.equal(isAdminHost("ADMIN.localhost:3000", {}), true);
    assert.equal(isAdminHost("elzora.com", {}), false);
    assert.equal(isAdminHost("www.admin.elzora.com", {}), false);
    assert.equal(isAdminHost(null, {}), false);
  });
  it("uses an exact ADMIN_HOST when configured", () => {
    const env = { ADMIN_HOST: "Console.Elzora.com" };
    assert.equal(isAdminHost("console.elzora.com", env), true);
    assert.equal(isAdminHost("admin.elzora.com", env), false);
  });
  it("blocks /admin on the public host and maps admin paths internally", () => {
    assert.equal(isAdminPath("/admin"), true);
    assert.equal(isAdminPath("/admin/trips"), true);
    assert.equal(isAdminPath("/administrator"), false);
    assert.equal(adminInternalPath("/"), "/admin");
    assert.equal(adminInternalPath("/trips/new"), "/admin/trips/new");
  });
});

describe("configuration", () => {
  it("parses owner e-mails", () => {
    assert.deepEqual(ownerEmails({ DASHBOARD_OWNER_EMAILS: " A@x.com, b@x.com ,," }), [
      "a@x.com",
      "b@x.com",
    ]);
    assert.deepEqual(ownerEmails({}), []);
  });
  it("needs both Supabase values", () => {
    assert.equal(supabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "u" }), null);
    assert.deepEqual(
      supabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "u", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" }),
      {
        url: "u",
        anonKey: "k",
      },
    );
  });
});

describe("roles", () => {
  const owners = ["owner@elzora.com"];
  it("grants owner only to confirmed listed e-mails", () => {
    assert.equal(
      roleFor({ id: "1", email: "Owner@Elzora.com", emailConfirmed: true }, owners),
      "owner",
    );
    assert.equal(
      roleFor({ id: "1", email: "owner@elzora.com", emailConfirmed: false }, owners),
      null,
    );
    assert.equal(
      roleFor({ id: "2", email: "other@elzora.com", emailConfirmed: true }, owners),
      null,
    );
    assert.equal(roleFor({ id: "3", email: null, emailConfirmed: true }, owners), null);
    assert.equal(roleFor({ id: "1", email: "owner@elzora.com", emailConfirmed: true }, []), null);
  });
  it("owner has every permission; admin cannot manage users", () => {
    for (const p of PERMISSIONS) assert.equal(can("owner", p), true);
    assert.equal(can("admin", "users.manage"), false);
    assert.equal(can("admin", "trips.manage"), true);
  });
});
