import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { authorizeAdmin } from "../lib/admin/access-policy";
import { hashAdminPassword, verifyAdminPassword } from "../lib/security/password-hash";

test("unauthenticated requests are denied", () => {
  assert.deepEqual(authorizeAdmin(null, "admin.dashboard.view"), {
    allowed: false,
    reason: "unauthenticated",
  });
});

test("an administrator without the required permission is denied", () => {
  assert.deepEqual(
    authorizeAdmin({ id: "admin-1", permissions: [], eventIds: [] }, "admin.dashboard.view"),
    { allowed: false, reason: "permission_denied" },
  );
});

test("an administrator with the required permission is allowed", () => {
  assert.deepEqual(
    authorizeAdmin(
      { id: "admin-1", permissions: ["admin.dashboard.view"], eventIds: [] },
      "admin.dashboard.view",
    ),
    { allowed: true },
  );
});

test("event staff cannot access events outside their assignment", () => {
  const staff = {
    id: "staff-1",
    permissions: ["events.read"],
    eventIds: ["event-assigned"],
  };

  assert.deepEqual(authorizeAdmin(staff, "events.read", "event-unassigned"), {
    allowed: false,
    reason: "event_scope_denied",
  });
  assert.deepEqual(authorizeAdmin(staff, "events.read", "event-assigned"), {
    allowed: true,
  });
});

test("marketing director is denied sales management even when another role grants it", () => {
  assert.deepEqual(
    authorizeAdmin(
      {
        id: "director-1",
        permissions: ["sales.read", "sales.manage"],
        eventIds: ["event-1"],
        roleCodes: ["marketing_director", "admin_operator"],
      },
      "sales.manage",
      "event-1",
    ),
    { allowed: false, reason: "permission_denied" },
  );
  assert.deepEqual(
    authorizeAdmin(
      {
        id: "director-1",
        permissions: ["sales.read"],
        eventIds: ["event-1"],
        roleCodes: ["marketing_director"],
      },
      "sales.read",
      "event-1",
    ),
    { allowed: true },
  );
});

test("sales management requires the permission and event assignment", () => {
  assert.deepEqual(
    authorizeAdmin(
      { id: "admin-1", permissions: ["sales.manage"], eventIds: ["event-1"] },
      "sales.manage",
      "event-1",
    ),
    { allowed: true },
  );
  assert.deepEqual(
    authorizeAdmin(
      { id: "admin-1", permissions: ["sales.manage"], eventIds: ["event-1"] },
      "sales.manage",
      "event-2",
    ),
    { allowed: false, reason: "event_scope_denied" },
  );
});

test("admin passwords are stored as verifiable scrypt hashes", async () => {
  const password = "correct horse battery staple";
  const passwordHash = await hashAdminPassword(password);

  assert.notEqual(passwordHash, password);
  assert.match(passwordHash, /^scrypt\$32768\$8\$1\$/);
  assert.equal(await verifyAdminPassword(password, passwordHash), true);
  assert.equal(await verifyAdminPassword("incorrect password", passwordHash), false);
});

test("public route files and the public site shell remain present", async () => {
  const [layout, home, contact] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/contact/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /<SiteNavbar\s*\/>/);
  assert.match(layout, /<SiteFooter\s*\/>/);
  assert.match(home, /<HomeHero\s*\/>/);
  assert.match(contact, /Contact/);
});
