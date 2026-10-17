// Pure simulation: no DOM, renderer, storage, or unseeded randomness.
export const VERSION = 1;
export const MODES = {
  basic: {
    name: "Basic controls",
    description: "Movement and interaction. Always loaded.",
    locked: true,
  },
  thirdPerson: {
    name: "Third person",
    description:
      "See the person you made. Requires your portrait and two squadmates.",
  },
  needs: {
    name: "Food & water",
    description: "Travel consumes supplies. Empty supplies slowly cost health.",
  },
  vehicle: {
    name: "Vehicle upkeep",
    description: "Driving uses fuel and condition; parts repair the engine.",
  },
  apex: {
    name: "Apex & Sub",
    description:
      "Large creatures pursue. Small creatures flee, then frenzy when cornered.",
  },
};
export const DEFAULT_CONTENT = {
  names: ["Rowan", "Kit", "Morgan", "Ash", "Sam", "River", "Jules", "Alex"],
  vehicles: [
    { name: "Sun-faded estate", fuel: 26, condition: 65 },
    { name: "Utility pickup", fuel: 22, condition: 75 },
    { name: "Old delivery van", fuel: 30, condition: 55 },
  ],
  loot: {
    road: [
      { name: "Siphon can", resource: "fuel", amount: 12 },
      { name: "Tool roll", resource: "parts", amount: 2 },
      { name: "Lost lunchbox", resource: "food", amount: 12 },
    ],
    near: [
      { name: "Sealed water jug", resource: "water", amount: 20 },
      { name: "Pantry tin", resource: "food", amount: 18 },
      { name: "Spare components", resource: "parts", amount: 3 },
    ],
    away: [
      { name: "Rainwater cache", resource: "water", amount: 25 },
      { name: "Forager’s crate", resource: "food", amount: 25 },
      { name: "Collector’s keepsake", resource: "scrap", amount: 6 },
    ],
  },
  structures: {
    small: ["Abandoned kiosk", "Roadside shelter", "Pump shed"],
    medium: ["Quiet diner", "Repair garage", "Empty farmhouse"],
    large: ["Container depot", "Grain warehouse", "Derelict service plaza"],
  },
  skins: [
    { name: "Beasts", apex: "#a96e48", sub: "#d2b68b" },
    { name: "Robots", apex: "#719eaa", sub: "#abc4c8" },
    { name: "Undead", apex: "#76865f", sub: "#b2ba87" },
  ],
};
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const number = (v, min, max) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const str = (v, n = 80) =>
  typeof v === "string" && v.length > 0 && v.length <= n;
export function hash(text) {
  let h = 2166136261;
  for (const c of String(text)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function random(seed) {
  let n = hash(seed);
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (items, rng) => items[Math.floor(rng() * items.length)];
export function character(seed = "traveler") {
  const r = random(seed);
  return {
    name: pick(DEFAULT_CONTENT.names, r),
    fidelity: "poly",
    melanin: Math.round(r() * 80 + 10),
    saturation: 55,
    hair: "#3c2b24",
    hairCode: "Custom",
    eye: "#687d6a",
    eyeRarity: 20,
    gender: "etcetera",
    facialHair: false,
    bodyHair: false,
    makeup: false,
    piercings: false,
    feet: "medium",
    legs: "long",
    chest: "medium",
    head: "short",
  };
}
export function validateCharacter(c) {
  return (
    plain(c) &&
    str(c.name, 32) &&
    ["low", "poly", "smooth"].includes(c.fidelity) &&
    number(c.melanin, 0, 100) &&
    number(c.saturation, 0, 100) &&
    /^#[0-9a-f]{6}$/i.test(c.hair) &&
    str(c.hairCode, 32) &&
    /^#[0-9a-f]{6}$/i.test(c.eye) &&
    number(c.eyeRarity, 0, 100) &&
    ["male", "female", "etcetera"].includes(c.gender) &&
    ["facialHair", "bodyHair", "makeup", "piercings"].every(
      (k) => typeof c[k] === "boolean",
    ) &&
    ["feet", "legs", "chest", "head"].every((k) =>
      ["short", "medium", "long"].includes(c[k]),
    )
  );
}
export function validateBuild(b) {
  if (
    !plain(b) ||
    b.version !== VERSION ||
    !str(b.name, 60) ||
    !str(b.seed, 64) ||
    !Number.isInteger(b.population) ||
    !number(b.population, 12, 240) ||
    !number(b.density, 0.3, 2) ||
    !number(b.danger, 0, 2) ||
    !str(b.skin, 40)
  )
    throw Error(
      "Invalid floppy: expected version 1, name, seed, population 12–240, density 0.3–2, danger 0–2, and skin.",
    );
  return {
    version: VERSION,
    name: b.name,
    seed: b.seed,
    population: b.population,
    density: b.density,
    danger: b.danger,
    skin: b.skin,
  };
}
export function newGame(seed = "FIRST-LIGHT") {
  return {
    version: VERSION,
    scene: "basement",
    tutorial: "welcome",
    character: null,
    squad: [],
    modes: {
      basic: true,
      thirdPerson: false,
      needs: true,
      vehicle: true,
      apex: false,
    },
    build: {
      version: VERSION,
      name: "A road in the middle of nowhere",
      seed,
      population: 48,
      density: 1,
      danger: 1,
      skin: "Beasts",
    },
    content: structuredClone(DEFAULT_CONTENT),
    phase: "arrival",
    distance: 0,
    time: 0,
    resources: {
      health: 100,
      food: 70,
      water: 70,
      fuel: 0,
      condition: 0,
      parts: 2,
      scrap: 5,
    },
    vehicle: null,
    visited: [],
    log: ["A room full of possible worlds."],
    dead: false,
    floppies: [],
  };
}
export function log(s, message) {
  s.log.unshift(message);
  s.log = s.log.slice(0, 30);
  return message;
}
export function toggleMode(s, id, value) {
  if (!MODES[id]) throw Error("Unknown mode.");
  if (id === "basic")
    return log(
      s,
      "Basic controls stay on. Some things really are non-negotiable.",
    );
  if (id === "thirdPerson" && value && (!s.character || s.squad.length < 2)) {
    s.tutorial = "portrait";
    return log(
      s,
      "Too fast! Define your portrait and two squadmates first. Modes can have requirements.",
    );
  }
  s.modes[id] = Boolean(value);
  if (id === "thirdPerson" && value) s.tutorial = "complete";
  return log(s, `${MODES[id].name}: ${value ? "on" : "off"}.`);
}
export function defineCharacter(s, c, index = -1) {
  if (!validateCharacter(c))
    throw Error(
      "Character fields are incomplete or outside their allowed range.",
    );
  if (index === -1) {
    s.character = structuredClone(c);
    if (s.squad.length < 2) s.tutorial = "squad";
  } else {
    if (!s.character || index < 0 || index > 2 || index > s.squad.length)
      throw Error("This squad slot is not unlocked.");
    s.squad[index] = structuredClone(c);
    if (s.squad.length >= 2) s.tutorial = "modes";
  }
}
export function generateTown(build, content = DEFAULT_CONTENT) {
  const r = random(build.seed + ":town");
  const jobs = [
    "Fuel attendant",
    "Diner cook",
    "Farmer",
    "Fisher",
    "Mechanic",
    "Quartermaster",
  ];
  const buildings = [
    {
      type: "Gas station",
      count: Math.max(1, Math.ceil(build.population / 60)),
    },
    { type: "Diner", count: Math.max(1, Math.ceil(build.population / 40)) },
    { type: "Farm", count: Math.max(1, Math.ceil(build.population / 32)) },
    { type: "Fishery", count: Math.max(1, Math.ceil(build.population / 50)) },
  ];
  const npcs = Array.from({ length: build.population }, (_, i) => ({
    id: i,
    name: pick(content.names, r),
    job: jobs[i % jobs.length],
    needs: ["water", "food", "parts"][i % 3],
    connection: (i + 1) % build.population,
  }));
  return { buildings, npcs };
}
export function startTape(s) {
  if (s.tutorial !== "complete")
    throw Error(
      "Finish your portrait, squad photo, and third-person tutorial first.",
    );
  s.scene = "wasteland";
  return log(
    s,
    s.phase === "arrival"
      ? "The tugboats bring your pontoon to the shore. Find the quartermaster."
      : "The road is still here. So are you.",
  );
}
export function advanceTown(s, action) {
  if (s.scene !== "wasteland" || s.dead) return false;
  const transitions = {
    register: [
      "arrival",
      "tent",
      "Tent assigned. Lottery ticket 017. Rest on the far side of the beach.",
    ],
    sleep: ["tent", "lottery", "Morning. The container lottery is ready."],
    lottery: [
      "lottery",
      "vehicle",
      "Your ticket wins a vehicle. Visit the garage to collect it.",
    ],
    drive: [
      "vehicle",
      "road",
      "Your first road trip begins. Supplies are finite; possibilities less so.",
    ],
  };
  const t = transitions[action];
  if (!t || s.phase !== t[0]) return false;
  s.phase = t[1];
  if (action === "lottery") {
    s.vehicle = structuredClone(
      pick(s.content.vehicles, random(s.build.seed + ":lottery")),
    );
    s.resources.fuel = s.vehicle.fuel;
    s.resources.condition = s.vehicle.condition;
  }
  log(s, t[2]);
  return true;
}
export function location(s, index) {
  const r = random(s.build.seed + ":location:" + index);
  const zone = pick(["road", "near", "away"], r);
  const size = pick(["small", "medium", "large"], r);
  return {
    id: `${index}:${zone}`,
    index,
    zone,
    size,
    name: pick(s.content.structures[size], r),
    loot: structuredClone(pick(s.content.loot[zone], r)),
    x: zone === "road" ? 4 : zone === "near" ? 11 : 24,
    enemy: r() < 0.45 * s.build.danger ? (r() < 0.5 ? "apex" : "sub") : null,
  };
}
export function scavenge(s, index) {
  if (s.dead || s.phase !== "road") return "You cannot scavenge here.";
  const site = location(s, index);
  if (s.visited.includes(site.id))
    return log(s, "Already searched. Leave something for the dust.");
  s.visited.push(site.id);
  const item = site.loot;
  s.resources[item.resource] = clamp(
    s.resources[item.resource] + item.amount,
    0,
    ["parts", "scrap"].includes(item.resource) ? 999 : 100,
  );
  return log(
    s,
    `${site.name}: ${item.name} (+${item.amount} ${item.resource}).`,
  );
}
export function repair(s) {
  if (!s.vehicle || s.resources.parts < 1 || s.resources.condition >= 100)
    return log(s, "Repairs need a vehicle, damage, and a spare part.");
  s.resources.parts--;
  s.resources.condition = clamp(s.resources.condition + 20, 0, 100);
  return log(s, "One part fitted. Vehicle condition +20.");
}
export function trade(s, resource) {
  const offers = {
    food: [2, 25],
    water: [2, 25],
    fuel: [3, 20],
    parts: [2, 1],
  };
  const offer = offers[resource];
  if (!offer || s.resources.scrap < offer[0])
    return log(s, "Not enough trade scrap.");
  const cap = resource === "parts" ? 999 : 100;
  if (s.resources[resource] >= cap) return log(s, "Already fully stocked.");
  s.resources.scrap -= offer[0];
  s.resources[resource] = clamp(s.resources[resource] + offer[1], 0, cap);
  return log(s, `Traded ${offer[0]} scrap for ${resource}.`);
}
export function tick(s, seconds, driving = false, speed = 0) {
  if (s.scene !== "wasteland" || s.phase !== "road" || s.dead) return;
  const dt = clamp(seconds, 0, 0.1);
  s.time += dt;
  if (s.modes.needs) {
    s.resources.food = Math.max(0, s.resources.food - dt * 0.08);
    s.resources.water = Math.max(0, s.resources.water - dt * 0.12);
    if (s.resources.food <= 0 || s.resources.water <= 0)
      s.resources.health = Math.max(0, s.resources.health - dt * 1.4);
  }
  if (
    driving &&
    Math.abs(speed) > 0.1 &&
    (!s.modes.vehicle || (s.resources.fuel > 0 && s.resources.condition > 0))
  ) {
    s.distance += Math.abs(speed) * dt;
    if (s.modes.vehicle) {
      s.resources.fuel = Math.max(
        0,
        s.resources.fuel - Math.abs(speed) * dt * 0.012,
      );
      s.resources.condition = Math.max(
        0,
        s.resources.condition - Math.abs(speed) * dt * 0.003,
      );
    }
  }
  if (s.resources.health <= 0) {
    s.dead = true;
    log(
      s,
      "Your journey ends here. Load an earlier export or start a new journey.",
    );
  }
}
export function enemyIntent(kind, distance, cornered) {
  return kind === "apex"
    ? distance < 18
      ? "pursue"
      : "idle"
    : distance < 7
      ? cornered
        ? "frenzy"
        : "flee"
      : "idle";
}
export function damage(s, amount) {
  if (s.dead) return;
  s.resources.health = Math.max(0, s.resources.health - amount);
  if (s.resources.health === 0) {
    s.dead = true;
    log(s, "Your journey ends here.");
  }
}
export function applyPack(s, pack) {
  if (!plain(pack) || pack.version !== VERSION || !str(pack.kind, 20))
    throw Error("Content pack needs version: 1 and a supported kind.");
  const d = pack.data;
  let ok = false;
  if (pack.kind === "names")
    ok =
      Array.isArray(d) &&
      d.length > 0 &&
      d.length <= 500 &&
      d.every((x) => str(x, 32));
  if (pack.kind === "vehicles")
    ok =
      Array.isArray(d) &&
      d.length > 0 &&
      d.length <= 100 &&
      d.every(
        (x) =>
          plain(x) &&
          str(x.name, 60) &&
          number(x.fuel, 1, 100) &&
          number(x.condition, 1, 100),
      );
  if (pack.kind === "loot")
    ok =
      plain(d) &&
      ["road", "near", "away"].every(
        (k) =>
          Array.isArray(d[k]) &&
          d[k].length > 0 &&
          d[k].length <= 100 &&
          d[k].every(
            (x) =>
              plain(x) &&
              str(x.name, 60) &&
              ["food", "water", "fuel", "parts", "scrap"].includes(
                x.resource,
              ) &&
              number(x.amount, 1, 100),
          ),
      );
  if (pack.kind === "structures")
    ok =
      plain(d) &&
      ["small", "medium", "large"].every(
        (k) =>
          Array.isArray(d[k]) &&
          d[k].length > 0 &&
          d[k].length <= 100 &&
          d[k].every((x) => str(x, 60)),
      );
  if (pack.kind === "skins")
    ok =
      Array.isArray(d) &&
      d.length > 0 &&
      d.length <= 30 &&
      d.every(
        (x) =>
          plain(x) &&
          str(x.name, 40) &&
          /^#[0-9a-f]{6}$/i.test(x.apex) &&
          /^#[0-9a-f]{6}$/i.test(x.sub),
      );
  if (!ok)
    throw Error(`Skipped invalid ${pack.kind} pack. No content changed.`);
  s.content[pack.kind] = structuredClone(d);
  return log(s, `Loaded ${pack.kind} content pack.`);
}
export function parseSave(text) {
  if (text.length > 2_000_000) throw Error("Save exceeds 2 MB.");
  const s = JSON.parse(text);
  if (
    !plain(s) ||
    s.version !== VERSION ||
    !["basement", "wasteland"].includes(s.scene) ||
    !["welcome", "portrait", "squad", "modes", "complete"].includes(
      s.tutorial,
    ) ||
    !["arrival", "tent", "lottery", "vehicle", "road"].includes(s.phase)
  )
    throw Error("Unsupported or invalid save.");
  validateBuild(s.build);
  if (
    (s.character !== null && !validateCharacter(s.character)) ||
    !Array.isArray(s.squad) ||
    s.squad.length > 3 ||
    !s.squad.every(validateCharacter)
  )
    throw Error("Invalid characters.");
  if (
    !plain(s.modes) ||
    !Object.keys(MODES).every((k) => typeof s.modes[k] === "boolean") ||
    !s.modes.basic
  )
    throw Error("Invalid modes.");
  if (
    (s.tutorial === "complete" ||
      s.modes.thirdPerson ||
      s.scene === "wasteland") &&
    (!s.character || s.squad.length < 2)
  )
    throw Error("Missing tutorial requirements.");
  if (
    !plain(s.resources) ||
    !Object.keys(newGame().resources).every((k) =>
      number(s.resources[k], 0, ["parts", "scrap"].includes(k) ? 999 : 100),
    ) ||
    !number(s.distance, 0, 1e9) ||
    !number(s.time, 0, 1e9) ||
    typeof s.dead !== "boolean"
  )
    throw Error("Invalid resources.");
  if (
    !Array.isArray(s.visited) ||
    s.visited.length > 100000 ||
    !s.visited.every((x) => /^\d+:(road|near|away)$/.test(x)) ||
    !Array.isArray(s.log) ||
    s.log.length > 30 ||
    !s.log.every((x) => str(x, 300))
  )
    throw Error("Invalid journey history.");
  if (
    s.vehicle !== null &&
    (!plain(s.vehicle) ||
      !str(s.vehicle.name, 60) ||
      !number(s.vehicle.fuel, 1, 100) ||
      !number(s.vehicle.condition, 1, 100))
  )
    throw Error("Invalid vehicle.");
  if (["vehicle", "road"].includes(s.phase) && !s.vehicle)
    throw Error("Journey is missing its vehicle.");
  if (!Array.isArray(s.floppies) || s.floppies.length > 20)
    throw Error("Invalid floppy shelf.");
  s.floppies = s.floppies.map(validateBuild);
  if (!plain(s.content)) throw Error("Missing content.");
  const check = newGame();
  for (const kind of Object.keys(DEFAULT_CONTENT))
    applyPack(check, { version: 1, kind, data: s.content[kind] });
  s.content = check.content;
  for (const p of [s.spatial, s.roadPosition])
    if (p !== undefined) {
      if (
        !plain(p) ||
        !number(p.x, -10000, 10000) ||
        !number(p.z, -1e9, 10000) ||
        !number(p.yaw, -1e9, 1e9) ||
        typeof p.driving !== "boolean" ||
        (p.car !== null &&
          (!plain(p.car) ||
            !number(p.car.x, -10000, 10000) ||
            !number(p.car.z, -1e9, 10000)))
      )
        throw Error("Invalid saved position.");
    }
  return s;
}
