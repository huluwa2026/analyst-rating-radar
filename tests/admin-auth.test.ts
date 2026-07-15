import { afterEach, describe, expect, it } from "vitest";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";

const originalSecret = process.env.CRON_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

describe("refresh endpoint authentication", () => {
  it("requires an exact bearer secret", () => {
    process.env.CRON_SECRET = "test-only-secret";
    expect(isAuthorizedAdminRequest(new Request("https://example.test"))).toBe(false);
    expect(isAuthorizedAdminRequest(new Request("https://example.test", {
      headers: { Authorization: "Bearer wrong-secret" },
    }))).toBe(false);
    expect(isAuthorizedAdminRequest(new Request("https://example.test", {
      headers: { Authorization: "Bearer test-only-secret" },
    }))).toBe(true);
  });

  it("fails closed when the deployment secret is absent", () => {
    delete process.env.CRON_SECRET;
    expect(isAuthorizedAdminRequest(new Request("https://example.test", {
      headers: { Authorization: "Bearer test-only-secret" },
    }))).toBe(false);
  });
});
