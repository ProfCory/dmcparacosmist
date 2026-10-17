import { World } from "./world.js";
import {
  newGame,
  MODES,
  character,
  defineCharacter,
  toggleMode,
  generateTown,
  startTape,
  advanceTown,
  scavenge,
  repair,
  trade,
  tick,
  validateBuild,
  parseSave,
  applyPack,
  random,
  clamp,
} from "./core.js";
const $ = (s) => document.querySelector(s),
  panel = $("#panel"),
  body = $("#panel-body");
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const STORE = "dmc-basement-v1";
let state = newGame(),
  world,
  toastTimer,
  saveWarning = false,
  importKind = "save",
  creatorCounter = 0;
try {
  const stored = localStorage.getItem(STORE);
  if (stored) state = parseSave(stored);
} catch (e) {
  setTimeout(
    () =>
      notify(
        "Previous autosave could not be loaded. Import a backup or begin again.",
      ),
    500,
  );
}
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").style.display = "none"), 6000);
}
function save() {
  try {
    if (world)
      state.spatial = {
        x: world.position.x,
        z: world.position.z,
        yaw: world.yaw,
        driving: world.driving,
        car: world.car
          ? { x: world.car.position.x, z: world.car.position.z }
          : null,
      };
    if (state.scene === "wasteland" && state.phase === "road")
      state.roadPosition = structuredClone(state.spatial);
    localStorage.setItem(STORE, JSON.stringify(state));
    return true;
  } catch {
    if (!saveWarning) {
      notify(
        "Browser storage is unavailable or full. Export your save to keep it.",
      );
      saveWarning = true;
    }
    return false;
  }
}
function restoreSpatial() {
  const p = state.spatial;
  if (!p) return;
  world.position.set(p.x, 0, p.z);
  world.yaw = p.yaw;
  if (state.phase === "road" && state.scene === "wasteland") {
    world.driving = p.driving;
    if (p.car) world.car.position.set(p.car.x, 0, p.car.z);
    world.refreshRoad();
  }
}
function redraw(restore = false) {
  world.state = state;
  world.rebuild();
  if (restore) restoreSpatial();
  hud();
}
function open(html) {
  world?.keys.clear();
  document.exitPointerLock?.();
  body.innerHTML = html;
  if (!panel.open) panel.showModal();
  body.querySelector("[autofocus],button,input")?.focus();
}
function close() {
  panel.close();
  world?.keys.clear();
  $("#world").focus();
  save();
}
function title(kicker, text, closable = true) {
  return `${closable ? '<button class="close" data-action="close" aria-label="Close panel">×</button>' : ""}<span class="eyebrow">${kicker}</span><h2 id="panel-title">${text}</h2>`;
}
const button = (action, text, primary = false) =>
  `<button data-action="${action}" class="${primary ? "primary" : ""}">${text}</button>`;
function welcome() {
  open(
    title(
      "DARK MONKEY CHORUS / EXPERIMENT 01",
      "Escape in the Basement.",
      false,
    ) +
      `<p>A room full of switches. A road with no promises.</p><p>This is a playable <strong>early prototype</strong> of your customizable survival world. Begin with a portrait, gather your people, then choose the systems you want to live with.</p><div class="split"><div class="card"><span class="badge">THE BASEMENT</span><p>First-person exploration, character creation, squad photo, and a shelf of possible worlds.</p></div><div class="card"><span class="badge">THE FIRST TAPE</span><p>Landfall, a container lottery, a working car. See how far your supplies take you.</p></div></div><p class="muted">WASD to move · drag to look (or ← →) · E to interact · M for modes. Touch controls available. Menus pause the simulation. Placeholder art; multiplayer is not connected.</p><div class="actions">${button("begin", state.character ? "Continue journey" : "Step downstairs", true)}${button("import-save", "Import save")}</div>`,
  );
}
function begin() {
  if (state.tutorial === "welcome") {
    open(
      title("ORIENTATION / 01", "Make it your kind of game.", false) +
        `<p>Features are modes. Turn them on or off to shape the experience. Basic controls always stay loaded.</p><p>Move with <kbd>W A S D</kbd>, drag to look, and press <kbd>E</kbd> near an object to interact. Open the modes list with <kbd>M</kbd>.</p><div class="actions">${button("modes", "Open Modes · E", true)}</div>`,
    );
  } else close();
}
function modes() {
  open(
    title("LOADED SYSTEMS", "Choose your rules.") +
      `<p>Settings take effect immediately. Menus pause the world.</p>` +
      Object.entries(MODES)
        .map(
          ([id, m]) =>
            `<label class="mode"><input type="checkbox" data-mode="${id}" ${state.modes[id] ? "checked" : ""} ${m.locked || (state.tutorial !== "complete" && !["basic", "thirdPerson"].includes(id)) ? "disabled" : ""}><span><strong>${m.name} ${m.locked ? "· required" : ""}</strong><p>${m.description}</p></span></label>`,
        )
        .join("") +
      `<div class="actions">${button("close", "Back to the room", true)}</div>`,
  );
}
function menu() {
  save();
  open(
    title("PAUSE / THE WORLD CAN WAIT", "Your journey.") +
      `<div class="cards"><div class="card"><strong>${escape(state.build.name)}</strong><p>${escape(state.vehicle?.name || "No vehicle yet")} · ${(state.distance / 1000).toFixed(2)} km travelled · seed ${escape(state.build.seed)}</p></div></div><div class="actions">${button("close", "Resume", true)}${button("modes", "Modes")}${button("export-save", "Export save")}${button("import-save", "Import save")}${button("basement", "Return to basement")}${button("new", "New journey")}</div><h3>Custom content</h3><p class="muted">Import a JSON pack, or select a content folder. Only known categories and valid data load. Files stay on your device; no account or server is required.</p><div class="actions">${button("import-pack", "Import content pack")}${button("import-folder", "Scan content folder")}<a href="content/templates/names.json" download>Example names pack</a></div><h3>Field notes</h3><ul class="log">${state.log
        .slice(0, 8)
        .map((x) => `<li>${escape(x)}</li>`)
        .join("")}</ul>`,
  );
}
function creator(index = -1) {
  const existing = index < 0 ? state.character : state.squad[index];
  const c = structuredClone(
    existing ||
      character(state.build.seed + ":person:" + index + ":" + creatorCounter++),
  );
  const select = (name, options) =>
    `<select name="${name}">${options.map(([v, l]) => `<option value="${v}" ${c[name] === v ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  open(
    title(
      index < 0 ? "PORTRAIT / YOU" : "SQUAD PHOTO / " + (index + 1),
      index < 0 ? "Define yourself." : "Someone for the road.",
    ) +
      `<form id="character-form" data-index="${index}"><div class="creator"><aside class="portrait-preview"><div class="paper-person" style="--skin:hsl(27 ${c.saturation}% ${82 - c.melanin * 0.52}%);--hair:${c.hair}"><i class="head"></i><i class="body"></i><i class="arms"></i><i class="legs"></i></div><p id="preview-name">${escape(c.name)}</p><small>Clothed neutral mannequin.<br>All story uses they/them.</small></aside><div class="fields"><label>Name<input name="name" maxlength="32" required value="${escape(c.name)}"></label><label>Visual fidelity${select(
        "fidelity",
        [
          ["low", "Low-res"],
          ["poly", "Low-poly"],
          ["smooth", "Smooth 3D placeholder"],
        ],
      )}</label><label>Melanin<input name="melanin" type="range" min="0" max="100" value="${c.melanin}"></label><label>Saturation<input name="saturation" type="range" min="0" max="100" value="${c.saturation}"></label><label>Root hair color<input name="hair" type="color" value="${c.hair}"></label><label>Hair color reference<input name="hairCode" maxlength="32" required value="${escape(c.hairCode)}"></label><label>Eye color<input name="eye" type="color" value="${c.eye}"></label><label>World eye prevalence (%)<input name="eyeRarity" type="number" min="0" max="100" value="${c.eyeRarity}"></label><label>Presentation${select(
        "gender",
        [
          ["etcetera", "Etcetera / canonical"],
          ["male", "Male"],
          ["female", "Female"],
        ],
      )}</label>${["feet", "legs", "chest", "head"]
        .map(
          (k) =>
            `<label>${k[0].toUpperCase() + k.slice(1)}${select(k, [
              ["short", "Short"],
              ["medium", "Medium"],
              ["long", "Long"],
            ])}</label>`,
        )
        .join("")}<div class="checks">${[
        ["facialHair", "Facial hair"],
        ["bodyHair", "Body hair"],
        ["makeup", "Makeup"],
        ["piercings", "Piercings"],
      ]
        .map(
          ([k, l]) =>
            `<label><input type="checkbox" name="${k}" ${c[k] ? "checked" : ""}>${l}</label>`,
        )
        .join(
          "",
        )}</div></div></div><p class="muted">Color reference is a free-text label, not a licensed Pantone lookup. Eye prevalence is stored worldbuilding metadata; weighted genetics and equipment bonuses are future work.</p><div class="actions"><button class="primary" type="submit">Confirm ${index < 0 ? "portrait" : "squadmate"}</button><button type="button" data-action="random-character" data-index="${index}">Randomize</button>${button("close", "Back")}</div></form>`,
  );
  const form = $("#character-form");
  form.addEventListener("input", () => {
    const f = new FormData(form);
    $("#preview-name").textContent = f.get("name");
    const p = $(".paper-person");
    p.style.setProperty(
      "--skin",
      `hsl(27 ${f.get("saturation")}% ${82 - Number(f.get("melanin")) * 0.52}%)`,
    );
    p.style.setProperty("--hair", f.get("hair"));
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const result = Object.fromEntries(f);
    for (const k of ["melanin", "saturation", "eyeRarity"])
      result[k] = Number(result[k]);
    for (const k of ["facialHair", "bodyHair", "makeup", "piercings"])
      result[k] = f.has(k);
    try {
      defineCharacter(state, result, index);
      redraw();
      save();
      if (index === -1 && state.squad.length < 2) creator(state.squad.length);
      else if (index === 0 && state.squad.length < 2) creator(1);
      else squad();
    } catch (e) {
      notify(e.message);
    }
  });
}
function squad() {
  if (!state.character) {
    notify("Define your portrait first.");
    return;
  }
  open(
    title("THE PHOTO CLEARS", "Your people.") +
      `<p>Two companions defined. A third slot unlocks now; you can fill it whenever you like. Squadmates are visual companions in this prototype; autonomous party AI comes later.</p><div class="cards">${[0, 1, 2].map((i) => `<div class="card"><strong>${escape(state.squad[i]?.name || "Open slot")}</strong><p>${i === 2 ? "Optional third companion" : "Required squadmate " + (i + 1)}</p><button data-action="edit-squad" data-index="${i}" ${i > state.squad.length ? "disabled" : ""}>${state.squad[i] ? "Customize" : "Create"}</button></div>`).join("")}</div><div class="actions">${button("modes", "Enable third person", true)}${button("close", "Back to the basement")}</div>`,
  );
}
function editor() {
  const b = state.build;
  open(
    title("BULLETIN BOARD / VHS WORKBENCH", "A world, copied by hand.") +
      `<p>Duplicate this tape, adjust its world settings, and save the build to a floppy. The preview shows the layout; the 3D scene remains the current world until you load a floppy.</p><form id="build-form"><div class="fields"><label>Tape name<input name="name" maxlength="60" required value="${escape(b.name)} — copy"></label><label>World seed<input name="seed" maxlength="64" required value="${escape(b.seed)}"></label><label>Population<input name="population" type="number" min="12" max="240" value="${b.population}" required></label><label>Roadside density<input name="density" type="number" min="0.3" max="2" step="0.1" value="${b.density}" required></label><label>Creature density<input name="danger" type="number" min="0" max="2" step="0.1" value="${b.danger}" required></label><label>Creature skin<select name="skin">${state.content.skins.map((k) => `<option ${k.name === b.skin ? "selected" : ""}>${escape(k.name)}</option>`).join("")}</select></label></div><div class="grid-preview" id="grid" aria-label="Seeded overhead town preview"></div><p id="town-counts" class="muted"></p><div class="actions"><button type="submit" class="primary">Save to floppy</button>${button("import-build", "Import floppy")}${button("close", "Back")}</div></form>`,
  );
  const form = $("#build-form");
  const build = () => {
    const b = Object.fromEntries(new FormData(form));
    return {
      ...b,
      version: 1,
      population: Number(b.population),
      density: Number(b.density),
      danger: Number(b.danger),
    };
  };
  const preview = () => {
    try {
      const b = validateBuild(build()),
        t = generateTown(b, state.content),
        r = random(b.seed);
      $("#grid").innerHTML = Array.from(
        { length: t.buildings.reduce((n, x) => n + x.count, 0) },
        () => `<i style="left:${5 + r() * 85}%;top:${10 + r() * 70}%"></i>`,
      ).join("");
      $("#town-counts").textContent =
        t.buildings
          .map(
            (x) =>
              `${x.count} ${x.type.toLowerCase()}${x.count === 1 ? "" : "s"}`,
          )
          .join(" · ") + ` · ${b.population} connected residents`;
    } catch {
      $("#town-counts").textContent = "Enter settings within the shown limits.";
    }
  };
  form.addEventListener("input", preview);
  preview();
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      const b = validateBuild(build());
      state.floppies.push(b);
      state.floppies = state.floppies.slice(-20);
      save();
      notify("Floppy saved. Load it at the computer, or export it there.");
      computer();
    } catch (e) {
      notify(e.message);
    }
  });
}
function computer() {
  open(
    title("PORTABLE COMPUTER / DRIVE A:", "Insert a world.") +
      `<p>Load a saved build to begin a fresh journey. Your portrait, squad, modes, and imported content stay with you.</p><div class="cards">${state.floppies.length ? state.floppies.map((b, i) => `<div class="card"><strong>${escape(b.name)}</strong><p>Seed ${escape(b.seed)} · ${b.population} residents</p><button data-action="load-build" data-index="${i}">Load build…</button> <button data-action="export-build" data-index="${i}">Export floppy</button></div>`).join("") : '<div class="card">No floppies yet. Make a copy at the editor on the left wall.</div>'}</div><h3>Phone line / multiplayer</h3><p class="muted">Not connected in this version. Export and share a floppy to explore the same seed separately. Live hosting, joining, and synchronized sessions need a networking service.</p><div class="actions">${button("editor", "Open editor")}${button("import-build", "Import floppy")}${button("close", "Back", true)}</div>`,
  );
}
function freshJourney(build = state.build) {
  const old = state;
  state = newGame(build.seed);
  state.build = structuredClone(build);
  state.character = old.character;
  state.squad = old.squad;
  state.modes = old.modes;
  state.tutorial = old.tutorial;
  state.floppies = old.floppies;
  state.content = old.content;
  redraw();
  close();
  notify("Fresh journey ready on the CRT.");
}
function trading() {
  open(
    title("LANDFALL / TRADING POST", "Useful things, fair exchange.") +
      `<p>You have <strong>${state.resources.scrap} trade scrap</strong>. Starter supplies are limited; choose what gets you farther.</p><div class="cards">${[
        ["food", 2, 25],
        ["water", 2, 25],
        ["fuel", 3, 20],
        ["parts", 2, 1],
      ]
        .map(
          ([k, c, n]) =>
            `<div class="card">${k.toUpperCase()} · ${Math.floor(state.resources[k])} held <button data-action="trade" data-resource="${k}">Buy ${n} / ${c} scrap</button></div>`,
        )
        .join(
          "",
        )}</div><div class="actions">${button("close", "Back", true)}</div>`,
  );
}
function interact() {
  if (panel.open) {
    if (
      state.tutorial === "welcome" &&
      body.querySelector('[data-action="modes"]')
    )
      modes();
    return;
  }
  if (state.dead) {
    death();
    return;
  }
  const n = world.near();
  if (!n) {
    notify("Walk closer to a marked object. Drag the view to look around.");
    return;
  }
  try {
    if (n.id.startsWith("npc:")) {
      const town = generateTown(state.build, state.content),
        npc = town.npcs[Number(n.id.split(":")[1])],
        other = town.npcs[npc.connection];
      open(
        title("LANDFALL / " + escape(npc.job.toUpperCase()), escape(npc.name)) +
          `<p>“We’re some of the first people here. I work as a ${escape(npc.job.toLowerCase())}. What we need is ${escape(npc.needs)}—nothing new seems to be coming in.”</p><p>“${escape(other.name)}, the ${escape(other.job.toLowerCase())}, is who I depend on. Everyone here is waiting on somebody.”</p><div class="actions">${button("close", "Back")}</div>`,
      );
      return;
    }
    switch (n.id) {
      case "portrait":
        creator();
        break;
      case "squad":
        state.character
          ? state.squad.length < 2
            ? creator(state.squad.length)
            : squad()
          : notify("Define your own portrait first.");
        break;
      case "editor":
        editor();
        break;
      case "computer":
        if (state.tutorial === "complete") computer();
        else
          notify(
            "The computer is locked until your portrait, squad, and third-person tutorial are complete.",
          );
        break;
      case "tape":
        startTape(state);
        redraw();
        if (state.phase === "road" && state.roadPosition) {
          state.spatial = state.roadPosition;
          restoreSpatial();
        }
        save();
        break;
      case "register":
        if (advanceTown(state, "register")) notify(state.log[0]);
        else
          notify(
            "Your tent and lottery ticket are assigned. Talk to the traders before leaving.",
          );
        break;
      case "tent":
        if (advanceTown(state, "sleep")) notify(state.log[0]);
        else
          notify("Register with the quartermaster, then return here to rest.");
        break;
      case "lottery":
        if (advanceTown(state, "lottery"))
          notify(`${state.vehicle.name}. ${state.log[0]}`);
        else notify("The lottery opens after you rest in your tent.");
        break;
      case "vehicle":
        if (advanceTown(state, "drive")) {
          redraw();
          save();
        } else notify("Collect your lottery vehicle before leaving.");
        break;
      case "trade":
        trading();
        break;
      case "car":
        world.driving = !world.driving;
        if (world.driving) world.position.copy(world.car.position);
        else world.position.x += 2.5;
        notify(
          world.driving
            ? "WASD to drive. E to park and get out."
            : "On foot. Walk to a cache and press E to search. R repairs your vehicle.",
        );
        save();
        break;
      case "loot":
        notify(scavenge(state, n.index));
        save();
        break;
    }
  } catch (e) {
    notify(e.message);
  }
  save();
  hud();
}
function download(name, data) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importFile(kind) {
  importKind = kind;
  $("#file-input").value = "";
  $("#file-input").click();
}
async function readFile(file) {
  if (file.size > 2_000_000) throw Error("Files must be smaller than 2 MB.");
  return await file.text();
}
$("#file-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await readFile(file);
    if (importKind === "save") {
      const candidate = parseSave(text);
      open(
        title("RESTORE A JOURNEY", "Replace the current journey?") +
          `<p>The selected save is valid. Export your current save first if you want to keep both.</p><div class="actions">${button("export-save", "Export current")}${button("confirm-import", "Replace with selected save", true)}${button("close", "Cancel")}</div>`,
      );
      body.querySelector('[data-action="confirm-import"]').onclick = () => {
        state = candidate;
        redraw(true);
        close();
        notify("Journey restored.");
      };
    } else if (importKind === "build") {
      state.floppies.push(validateBuild(JSON.parse(text)));
      state.floppies = state.floppies.slice(-20);
      save();
      computer();
    } else {
      notify(applyPack(state, JSON.parse(text)));
      redraw(true);
      save();
    }
  } catch (e) {
    notify(e.message);
  }
});
$("#folder-input").addEventListener("change", async (e) => {
  let loaded = 0,
    skipped = 0;
  const files = [...e.target.files];
  if (files.length > 500) {
    notify("Folder scan limited to 500 files. Keep content folders tidy.");
    return;
  }
  for (const f of files) {
    try {
      if (!f.name.endsWith(".json")) {
        skipped++;
        continue;
      }
      const pack = JSON.parse(await readFile(f));
      const path = f.webkitRelativePath.split("/");
      if (!path.slice(0, -1).includes(pack.kind))
        throw Error("Misplaced content.");
      applyPack(state, pack);
      loaded++;
    } catch {
      skipped++;
    }
  }
  redraw(true);
  save();
  notify(
    `Folder scan: ${loaded} loaded, ${skipped} invalid or misplaced files skipped.`,
  );
});
function hud() {
  const road = state.scene === "wasteland",
    r = state.resources;
  $("#location").innerHTML =
    `<span class="eyebrow">${road ? "TAPE 01 / " + escape(state.phase.toUpperCase()) : "TAPE 00 / ORIGIN"}</span><h1>${road ? (state.phase === "road" ? "The open road." : "Landfall.") : "The basement."}</h1><p>${road ? (state.phase === "road" ? `${(state.distance / 1000).toFixed(2)} km · ${escape(state.vehicle?.name || "On foot")}` : "A fresh start. Supplies not included.") : "A room full of possible worlds."}</p>`;
  $("#resources").innerHTML = road
    ? ["health", "food", "water", "fuel", "condition"]
        .map(
          (k) =>
            `<div class="resource"><span>${k.toUpperCase()}${["food", "water"].includes(k) && !state.modes.needs ? " / OFF" : ["fuel", "condition"].includes(k) && !state.modes.vehicle ? " / OFF" : ""}</span><span>${Math.ceil(r[k])}</span><progress max="100" value="${r[k]}"></progress></div>`,
        )
        .join("") + `<small>${r.parts} parts · ${r.scrap} scrap</small>`
    : "";
  const objectives = {
    welcome: "E / Welcome. Open Modes to see what is loaded.",
    portrait:
      "01 / Walk to the framed portrait on the far wall. E to define yourself.",
    squad: "02 / Define two companions in the squad photo.",
    modes: "03 / Press M and enable Third person.",
    complete: "04 / Your room is ready. Play the first VHS at the CRT.",
  };
  const town = {
    arrival:
      "01 / Step off the pontoon and register at the quartermaster ahead.",
    tent: "02 / Walk right to your tent and sleep.",
    lottery: "03 / Claim ticket 017 at the container to the left.",
    vehicle: "04 / Trade if you like, then collect your car down the road.",
    road: world?.driving
      ? "WASD / Drive · E / Park & exit · R / Repair · M / Rules"
      : "Walk to roadside structures to search. Return to your car to drive. R repairs it when nearby.",
  };
  $("#objective").textContent = state.dead
    ? "JOURNEY ENDED / Open the menu to begin again."
    : road
      ? town[state.phase]
      : objectives[state.tutorial];
  const near = world?.near();
  $("#interact").textContent = near ? `${near.label} · E` : "Interact · E";
}
function death() {
  open(
    title("END OF THE ROAD", "Every journey has an end.", false) +
      `<p>You travelled ${(state.distance / 1000).toFixed(2)} km. This run has ended. Start a fresh journey, or import an earlier exported save.</p><div class="actions">${button("restart", "New journey", true)}${button("import-save", "Import save")}${button("export-save", "Export this record")}</div>`,
  );
}
body.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action;
  try {
    switch (a) {
      case "close":
        close();
        break;
      case "begin":
        begin();
        break;
      case "modes":
        modes();
        break;
      case "export-save":
        save();
        download("basement-save.json", state);
        break;
      case "import-save":
        importFile("save");
        break;
      case "import-pack":
        importFile("pack");
        break;
      case "import-build":
        importFile("build");
        break;
      case "import-folder":
        $("#folder-input").value = "";
        $("#folder-input").click();
        break;
      case "editor":
        editor();
        break;
      case "edit-squad":
        creator(Number(b.dataset.index));
        break;
      case "random-character": {
        const i = Number(b.dataset.index);
        const old = i < 0 ? state.character : state.squad[i];
        if (i < 0) state.character = null;
        else state.squad[i] = undefined;
        creator(i);
        if (i < 0) state.character = old;
        else if (old) state.squad[i] = old;
        else state.squad.splice(i, 1);
        break;
      }
      case "basement":
        save();
        state.scene = "basement";
        redraw();
        close();
        break;
      case "new":
        open(
          title("NEW JOURNEY", "Leave this run behind?") +
            `<p>This resets the road, supplies, and lottery. Your people, content, and floppies stay. Export first to keep this journey.</p><div class="actions">${button("export-save", "Export current")}${button("restart", "Start fresh", true)}${button("close", "Cancel")}</div>`,
        );
        break;
      case "restart":
        freshJourney();
        break;
      case "export-build":
        download(
          "basement-floppy.json",
          state.floppies[Number(b.dataset.index)],
        );
        break;
      case "load-build": {
        const i = Number(b.dataset.index);
        open(
          title("LOAD FLOPPY", "Begin this world?") +
            `<p>Loading this floppy resets the current journey. Your people and content remain.</p><div class="actions">${button("export-save", "Export current")}<button class="primary" data-action="confirm-build" data-index="${i}">Load and reset journey</button>${button("close", "Cancel")}</div>`,
        );
        break;
      }
      case "confirm-build":
        freshJourney(state.floppies[Number(b.dataset.index)]);
        break;
      case "trade":
        notify(trade(state, b.dataset.resource));
        save();
        trading();
        break;
    }
  } catch (e) {
    notify(e.message);
  }
});
body.addEventListener("change", (e) => {
  if (!e.target.dataset.mode) return;
  const id = e.target.dataset.mode;
  notify(toggleMode(state, id, e.target.checked));
  save();
  if (
    id === "thirdPerson" &&
    !state.modes.thirdPerson &&
    state.tutorial === "portrait"
  ) {
    close();
  } else modes();
  hud();
});
$("#menu-button").onclick = menu;
$("#modes-button").onclick = modes;
$("#interact").onclick = interact;
panel.addEventListener("cancel", (e) => {
  e.preventDefault();
  close();
});
window.addEventListener("keydown", (e) => {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code,
    )
  )
    e.preventDefault();
  if (e.repeat) return;
  if (e.code === "Escape") {
    if (!panel.open) menu();
    return;
  }
  if (e.code === "KeyM") {
    modes();
    return;
  }
  if (e.code === "KeyE") {
    interact();
    return;
  }
  if (panel.open) return;
  if (e.code === "KeyR") {
    if (
      state.scene === "wasteland" &&
      state.phase === "road" &&
      (world.driving || world.position.distanceTo(world.car.position) < 5)
    ) {
      notify(repair(state));
      save();
    }
    return;
  }
  world.keys.add(e.code);
});
window.addEventListener("keyup", (e) => world?.keys.delete(e.code));
window.addEventListener("blur", () => {
  world?.keys.clear();
  save();
});
document.addEventListener("visibilitychange", () => {
  world?.keys.clear();
  if (document.hidden) save();
});
let dragging = false,
  lastX = 0,
  lastY = 0;
$("#world").addEventListener("pointerdown", (e) => {
  if (panel.open) return;
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  $("#world").setPointerCapture(e.pointerId);
});
$("#world").addEventListener("pointermove", (e) => {
  if (!dragging || panel.open) return;
  world.yaw -= (e.clientX - lastX) * 0.006;
  world.pitch = clamp(world.pitch - (e.clientY - lastY) * 0.004, -0.75, 0.75);
  lastX = e.clientX;
  lastY = e.clientY;
});
for (const type of ["pointerup", "pointercancel"])
  $("#world").addEventListener(type, () => (dragging = false));
for (const b of document.querySelectorAll("[data-key]")) {
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (panel.open) return;
    world.keys.add(b.dataset.key);
    b.setPointerCapture(e.pointerId);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(type, () => world.keys.delete(b.dataset.key));
}
try {
  world = new World($("#world"), state, notify);
  restoreSpatial();
  hud();
  welcome();
  let previous = performance.now(),
    timer = 0,
    hudTimer = 0;
  function frame(now) {
    const dt = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    const paused = panel.open || document.hidden;
    const speed = world.update(document.hidden ? 0 : dt, paused);
    if (!paused) {
      const wasDead = state.dead;
      tick(state, dt, world.driving, speed);
      if (!wasDead && state.dead) {
        save();
        death();
      }
      timer += dt;
      if (timer > 5) {
        save();
        timer = 0;
      }
    }
    hudTimer += dt;
    if (hudTimer > 0.25) {
      hud();
      hudTimer = 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
} catch (e) {
  open(
    title("RENDERER UNAVAILABLE", "This browser could not start 3D.", false) +
      `<p>WebGL is required. Try a browser with hardware acceleration enabled.</p><p class="muted">${escape(e.message)}</p>`,
  );
}
window.addEventListener("pagehide", save);
