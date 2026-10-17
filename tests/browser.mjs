import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import {
  newGame,
  character,
  defineCharacter,
  toggleMode,
  startTape,
  advanceTown,
  parseSave,
} from "../game/src/core.js";
const server = spawn(process.execPath, ["scripts/serve.mjs"], {
  env: { ...process.env, PORT: "4180" },
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((resolve, reject) => {
  server.stdout.once("data", resolve);
  server.once("error", reject);
});
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || undefined,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const errors = [];
await mkdir("test-results", { recursive: true });
try {
  let page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4180/game/");
  await page
    .getByRole("heading", { name: "Escape in the Basement." })
    .waitFor();
  await page.screenshot({ path: "test-results/welcome.png" });
  await page.getByRole("button", { name: "Step downstairs" }).click();
  await page.getByRole("button", { name: "Open Modes · E" }).click();
  await page.locator('[data-mode="thirdPerson"]').check();
  await page.waitForFunction(() => !document.querySelector("#panel").open);
  assert.match(await page.locator("#objective").textContent(), /portrait/);
  // Walk around the CRT, then approach the portrait using the real movement input.
  // Check progress through the normal pause/autosave UI instead of assuming a frame rate.
  let x = 0;
  for (let attempt = 0; attempt < 20 && x > -2.1; attempt++) {
    await page.keyboard.down("KeyA");
    await page.waitForTimeout(250);
    await page.keyboard.up("KeyA");
    await page.getByRole("button", { name: "Open game menu" }).click();
    x = await page.evaluate(
      () => JSON.parse(localStorage.getItem("dmc-basement-v1")).spatial.x,
    );
    await page.getByRole("button", { name: "Resume", exact: true }).click();
  }
  assert.ok(x <= -2.1 && x > -3.8, "Walked around the CRT");
  await page.keyboard.down("KeyW");
  await page.waitForFunction(
    () =>
      document
        .querySelector("#interact")
        .textContent.includes("Define your portrait"),
    {},
    { timeout: 30000 },
  );
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyE");
  await page.locator('[name="name"]').fill("Cory");
  await page.getByRole("button", { name: "Confirm portrait" }).click();
  await page.locator('[name="name"]').fill("Rowan");
  await page.getByRole("button", { name: "Confirm squadmate" }).click();
  await page.locator('[name="name"]').fill("Kit");
  await page.getByRole("button", { name: "Confirm squadmate" }).click();
  await page.getByRole("button", { name: "Enable third person" }).click();
  await page.locator('[data-mode="thirdPerson"]').check();
  await page.getByRole("button", { name: "Back to the room" }).click();
  await page.screenshot({ path: "test-results/basement.png" });
  // Creator confirmation returns to the room's center, within range of the CRT.
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() =>
    document.querySelector("#location").textContent.includes("Landfall"),
  );
  await page.keyboard.down("KeyW");
  await page.waitForFunction(
    () =>
      document.querySelector("#interact").textContent.includes("Quartermaster"),
    {},
    { timeout: 30000 },
  );
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() =>
    document.querySelector("#objective").textContent.includes("your tent"),
  );
  await page.getByRole("button", { name: "Open game menu" }).click();
  const save = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dmc-basement-v1")),
  );
  assert.equal(save.character.name, "Cory");
  assert.equal(save.squad.length, 2);
  assert.equal(save.phase, "tent");
  assert.doesNotThrow(() => parseSave(JSON.stringify(save)));
  console.log(
    "PASS desktop: welcome, mode requirement, real movement, character + squad creation, third person, VHS, arrival registration.",
  );
  // Exercise later stages from a valid, portable road save without a test-only app API.
  const road = newGame("BROWSER-ROAD");
  defineCharacter(road, character("me"));
  defineCharacter(road, character("a"), 0);
  defineCharacter(road, character("b"), 1);
  toggleMode(road, "thirdPerson", true);
  startTape(road);
  for (const action of ["register", "sleep", "lottery", "drive"])
    advanceTown(road, action);
  await page.close();
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((s) => {
    if (!localStorage.getItem("dmc-basement-v1"))
      localStorage.setItem("dmc-basement-v1", JSON.stringify(s));
  }, road);
  await page.goto("http://127.0.0.1:4180/game/");
  await page.getByRole("button", { name: "Continue journey" }).click();
  await page.keyboard.down("KeyW");
  await page.waitForFunction(
    () =>
      document.querySelector("#location p").textContent.match(/0\.0[1-9] km/),
    {},
    { timeout: 20000 },
  );
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyE");
  await page.getByRole("button", { name: "Open game menu" }).click();
  const moved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dmc-basement-v1")),
  );
  assert.ok(moved.distance > 5);
  assert.ok(moved.resources.fuel < road.resources.fuel);
  assert.equal(moved.spatial.driving, false);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.screenshot({ path: "test-results/road.png" });
  await page.reload();
  await page.getByRole("button", { name: "Continue journey" }).click();
  await page.getByRole("button", { name: "Open game menu" }).click();
  const reloaded = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dmc-basement-v1")),
  );
  assert.equal(reloaded.spatial.driving, false);
  assert.equal(reloaded.spatial.z, moved.spatial.z);
  await page.getByRole("button", { name: "Return to basement" }).click();
  await page.getByRole("button", { name: "Open game menu" }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.keyboard.press("KeyE");
  await page.getByRole("button", { name: "Open game menu" }).click();
  const returned = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dmc-basement-v1")),
  );
  assert.equal(returned.spatial.z, moved.spatial.z);
  console.log(
    "PASS road: driving, fuel drain, vehicle exit, persisted on-foot position, basement roundtrip.",
  );
  await page.getByRole("button", { name: "Return to basement" }).click();
  await page.keyboard.down("KeyA");
  await page.waitForFunction(
    () =>
      document.querySelector("#interact").textContent.includes("Edit a VHS"),
    {},
    { timeout: 30000 },
  );
  await page.keyboard.up("KeyA");
  await page.keyboard.press("KeyE");
  await page.locator('[name="name"]').fill("Test floppy");
  await page.locator('[name="population"]').fill("120");
  await page
    .getByRole("button", { name: "Save to floppy", exact: true })
    .click();
  await page.getByRole("button", { name: "Load build…" }).click();
  await page.getByRole("button", { name: "Load and reset journey" }).click();
  await page.getByRole("button", { name: "Open game menu" }).click();
  const edited = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dmc-basement-v1")),
  );
  assert.equal(edited.build.name, "Test floppy");
  assert.equal(edited.build.population, 120);
  assert.equal(edited.distance, 0);
  assert.equal(edited.squad.length, 2);
  await page.getByRole("button", { name: "Import content pack" }).click();
  await page.locator("#file-input").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1,"kind":"names","data":[]}'),
  });
  await page.waitForFunction(() =>
    document.querySelector("#toast").textContent.includes("Skipped invalid"),
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export save", exact: true }).click();
  assert.equal((await download).suggestedFilename(), "basement-save.json");
  console.log(
    "PASS editor/import/export: floppy settings, confirmed journey reset, character preservation, invalid pack rejection, save download.",
  );
  // Mobile portrait: readable modal, visible touch controls, no page overflow.
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto("http://127.0.0.1:4180/game/");
  await mobile.getByRole("button", { name: "Step downstairs" }).waitFor();
  await mobile.screenshot({ path: "test-results/mobile.png" });
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await mobile.getByRole("button", { name: "Step downstairs" }).click();
  await mobile.getByRole("button", { name: "Open Modes · E" }).click();
  await mobile.locator('[data-mode="thirdPerson"]').check();
  assert.equal(await mobile.locator("#touch").isVisible(), true);
  console.log(
    "PASS mobile: 390×844 layout, tutorial dialogs, mode lock, touch controls.",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS no JavaScript runtime errors. Screenshots in test-results/.",
  );
} finally {
  await browser.close();
  server.kill();
}
