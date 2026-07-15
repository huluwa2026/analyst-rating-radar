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
});
