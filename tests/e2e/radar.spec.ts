import { expect, test } from "@playwright/test";

test("renders the fixture radar and switches views", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What changed on Wall Street?" })).toBeVisible();
  await expect(page.getByText("Apple Inc.")).toBeVisible();
  await page.getByRole("button", { name: /Disagreement/ }).click();
  await expect(page.getByText("International Business Machines Corporation")).toBeVisible();
});

test("opens company detail without exposing a credential", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /AAPL Apple Inc/ }).first().click();
  await expect(page.getByRole("complementary", { name: /AAPL analyst detail/ })).toBeVisible();
  const html = await page.content();
  expect(html).not.toContain("drl_");
  expect(html).not.toContain("DRILLR_API_KEY");
});
