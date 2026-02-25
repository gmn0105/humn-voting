import { test, expect } from "@playwright/test";

test("create poll page has form and can submit when API succeeds", async ({ page }) => {
  await page.route("**/api/polls", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "new-poll-1",
          title: "E2E Poll",
          status: "active",
        }),
      });
    } else {
      await route.continue();
    }
  });
  await page.goto("/polls/create");
  const titleInput = page.getByPlaceholder(/title/i).first();
  await titleInput.fill("E2E Poll");
  const optionInputs = page.locator('input[placeholder*="Option"]');
  await optionInputs.nth(0).fill("Option A");
  await optionInputs.nth(1).fill("Option B");
  await page.getByRole("button", { name: /Create|Submit/i }).click();
  await expect(page.getByText(/E2E Poll|created|success/i)).toBeVisible({ timeout: 10000 });
});
