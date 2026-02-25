import { test, expect } from "@playwright/test";

test("home shows HUMN and Create Poll link", async ({ page }) => {
  await page.route("**/api/polls*", (route) =>
    route.fulfill({ status: 200, body: JSON.stringify([]) })
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /HUMN/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Create Poll/i })).toBeVisible();
});

test("Create Poll link goes to /polls/create", async ({ page }) => {
  await page.route("**/api/polls*", (route) =>
    route.fulfill({ status: 200, body: JSON.stringify([]) })
  );
  await page.goto("/");
  await page.getByRole("link", { name: /Create Poll/i }).click();
  await expect(page).toHaveURL(/\/polls\/create/);
});
