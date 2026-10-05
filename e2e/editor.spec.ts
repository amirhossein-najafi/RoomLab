import { expect, test } from "@playwright/test";

test("creates a room, draws a wall, adds a sofa, undoes, and opens 3D", async ({ page }) => {
  await page.goto("/en");
  await page.getByTestId("create-room").click();
  await page.getByTestId("room-name").fill("Bedroom");
  await page.getByTestId("room-width").fill("4.2");
  await page.getByTestId("room-depth").fill("3.6");
  await page.getByTestId("room-submit").click();
  await expect(page.getByTestId("editor")).toBeVisible();

  await page.getByTestId("tool-wall").click();
  const canvas = page.getByTestId("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas missing");
  await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.42);
  await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.58);
  await expect(page.getByTestId("history-list")).toContainText(/wall/i);

  const sofa = page.getByTestId("catalog-generic-sofa");
  await sofa.dragTo(canvas, { targetPosition: { x: box.width / 2, y: box.height / 2 } });
  await expect(page.getByTestId("history-list")).toContainText(/sofa/i);

  await page.getByTestId("undo").click();
  await page.getByTestId("view-3d").click();
  await expect(page.getByTestId("view-3d-canvas")).toBeVisible();
});
