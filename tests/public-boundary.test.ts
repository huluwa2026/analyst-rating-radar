import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("public request boundary", () => {
  it("does not import or invoke Drillr from the public page or health endpoint", () => {
    const publicSources = [
      "app/page.tsx",
      "app/api/health/route.ts",
      "lib/snapshot-store.ts",
      "lib/snapshot.ts",
    ]
      .map((pathname) => readFileSync(join(process.cwd(), pathname), "utf8"))
      .join("\n");
    expect(publicSources).not.toMatch(/@\/lib\/drillr|DRILLR_API_KEY|runSql|refreshPublishedSnapshot/);
    expect(publicSources).toContain("fetchPublishedManifest");
  });

  it("uses a stable project header for server-side Drillr requests", () => {
    const drillrSource = readFileSync(join(process.cwd(), "lib/drillr.ts"), "utf8");
    expect(drillrSource).toContain('"X-Drillr-Via": "analyst-rating-radar"');
  });
});
