import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  newGame,
  character,
  defineCharacter,
  toggleMode,
  startTape,
  advanceTown,
  generateTown,
  location,
  scavenge,
  tick,
  repair,
  trade,
  enemyIntent,
  damage,
  applyPack,
  parseSave,
  validateBuild,
  DEFAULT_CONTENT,
} from "../game/src/core.js";
function ready() {
  const s = newGame();
  defineCharacter(s, character("me"));
  defineCharacter(s, character("one"), 0);
  defineCharacter(s, character("two"), 1);
  toggleMode(s, "thirdPerson", true);
  return s;
}
function road() {
  const s = ready();
  startTape(s);
  for (const a of ["register", "sleep", "lottery", "drive"])
    assert.equal(advanceTown(s, a), true);
  return s;
}
test("tutorial requirements cannot be bypassed through modes or tape", () => {
  const s = newGame();
  toggleMode(s, "basic", false);
  assert.equal(s.modes.basic, true);
  toggleMode(s, "thirdPerson", true);
  assert.equal(s.modes.thirdPerson, false);
  assert.equal(s.tutorial, "portrait");
  assert.throws(() => startTape(s));
  defineCharacter(s, character("me"));
  assert.throws(() => defineCharacter(s, character("skip"), 2));
  defineCharacter(s, character("one"), 0);
  toggleMode(s, "thirdPerson", true);
  assert.equal(s.modes.thirdPerson, false);
  defineCharacter(s, character("two"), 1);
  toggleMode(s, "thirdPerson", true);
  startTape(s);
  assert.equal(s.scene, "wasteland");
});
test("town progression enforces sleep and lottery and produces a usable car", () => {
  const s = ready();
  startTape(s);
  assert.equal(advanceTown(s, "drive"), false);
  assert.equal(advanceTown(s, "lottery"), false);
  advanceTown(s, "register");
  advanceTown(s, "sleep");
  advanceTown(s, "lottery");
  assert.ok(s.resources.fuel > 0);
  assert.ok(s.resources.condition > 0);
  assert.equal(advanceTown(s, "lottery"), false);
  advanceTown(s, "drive");
  assert.equal(s.phase, "road");
});
test("world seed reproducibly generates towns, relationships, loot and lottery", () => {
  const a = road(),
    b = road();
  assert.deepEqual(a.vehicle, b.vehicle);
  assert.deepEqual(generateTown(a.build), generateTown(b.build));
  assert.deepEqual(location(a, 20), location(b, 20));
  const t = generateTown({ ...a.build, population: 240 });
  assert.equal(t.npcs.length, 240);
  assert.ok(t.npcs.every((n) => t.npcs[n.connection]));
  assert.notDeepEqual(location(a, 20), location(a, 21));
});
test("scavenging is once per site and caps resources", () => {
  const s = road(),
    l = location(s, 0);
  s.resources[l.loot.resource] = 0;
  scavenge(s, 0);
  assert.equal(s.resources[l.loot.resource], l.loot.amount);
  scavenge(s, 0);
  assert.equal(s.resources[l.loot.resource], l.loot.amount);
  assert.equal(s.visited.length, 1);
});
test("modes actually disable drains and dead or non-road simulations stop", () => {
  const s = road();
  s.modes.needs = false;
  s.modes.vehicle = false;
  const r = structuredClone(s.resources);
  for (let i = 0; i < 100; i++) tick(s, 0.1, true, 18);
  assert.deepEqual(s.resources, r);
  assert.ok(s.distance > 100);
  s.modes.needs = true;
  s.modes.vehicle = true;
  tick(s, 0.1, true, 18);
  assert.ok(s.resources.food < r.food);
  assert.ok(s.resources.fuel < r.fuel);
  s.resources.health = 0.01;
  s.resources.food = 0;
  tick(s, 0.1);
  assert.equal(s.dead, true);
  const snapshot = JSON.stringify(s);
  tick(s, 0.1, true, 18);
  assert.equal(JSON.stringify(s), snapshot);
});
test("empty or broken vehicles do not consume fuel or gain distance", () => {
  const s = road();
  s.resources.fuel = 0;
  const d = s.distance;
  tick(s, 0.1, true, 18);
  assert.equal(s.distance, d);
  s.resources.fuel = 10;
  s.resources.condition = 0;
  tick(s, 0.1, true, 18);
  assert.equal(s.distance, d);
  assert.equal(s.resources.fuel, 10);
});
test("trade and repair enforce costs and caps", () => {
  const s = road();
  s.resources.condition = 95;
  const p = s.resources.parts;
  repair(s);
  assert.equal(s.resources.condition, 100);
  assert.equal(s.resources.parts, p - 1);
  repair(s);
  assert.equal(s.resources.parts, p - 1);
  s.resources.scrap = 1;
  const food = s.resources.food;
  trade(s, "food");
  assert.equal(s.resources.food, food);
  s.resources.scrap = 2;
  trade(s, "food");
  assert.equal(s.resources.scrap, 0);
  assert.equal(s.resources.food, 95);
});
test("apex pursues while sub flees and frenzies only when cornered", () => {
  assert.equal(enemyIntent("apex", 10, false), "pursue");
  assert.equal(enemyIntent("apex", 20, false), "idle");
  assert.equal(enemyIntent("sub", 3, false), "flee");
  assert.equal(enemyIntent("sub", 3, true), "frenzy");
  const s = road();
  damage(s, 120);
  assert.equal(s.resources.health, 0);
  assert.equal(s.dead, true);
});
test("save roundtrip preserves content, progression, modes and locations", () => {
  const s = road();
  scavenge(s, 3);
  s.spatial = { x: 0, z: -123, yaw: 1, driving: false, car: { x: 0, z: -120 } };
  s.roadPosition = structuredClone(s.spatial);
  s.floppies.push({ ...s.build, name: "Second world" });
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
});
test("malformed, huge, incompatible and inconsistent saves rejected", () => {
  for (const alter of [
    (s) => (s.version = 99),
    (s) => (s.resources.health = -2),
    (s) => (s.resources.parts = "7"),
    (s) => (s.modes.basic = false),
    (s) => (s.squad = []),
    (s) => (s.vehicle = null),
    (s) => (s.spatial = { x: "bad" }),
    (s) => (s.content.names = []),
    (s) => (s.build.population = 100000),
  ]) {
    const s = road();
    alter(s);
    assert.throws(() => parseSave(JSON.stringify(s)));
  }
  assert.throws(() => parseSave(" ".repeat(2_000_001)));
  assert.throws(() => parseSave("{"));
});
test("floppy settings bounded and custom content transactional", () => {
  const s = ready();
  assert.throws(() => validateBuild({ ...s.build, density: 0 }));
  assert.throws(() => validateBuild({ ...s.build, population: 22.4 }));
  const before = structuredClone(s.content);
  assert.throws(() =>
    applyPack(s, { version: 1, kind: "loot", data: { road: [] } }),
  );
  assert.deepEqual(s.content, before);
  applyPack(s, { version: 1, kind: "names", data: ["Cory", "Em"] });
  assert.ok(
    generateTown(s.build, s.content).npcs.every((x) =>
      ["Cory", "Em"].includes(x.name),
    ),
  );
});
test("checked-in packs match runtime defaults and satisfy validation", async () => {
  for (const [kind, data] of Object.entries(DEFAULT_CONTENT)) {
    const pack = JSON.parse(
      await readFile(
        new URL(`../game/content/${kind}/default.json`, import.meta.url),
        "utf8",
      ),
    );
    assert.deepEqual(pack.data, data);
    assert.doesNotThrow(() => applyPack(newGame(), pack));
  }
});
