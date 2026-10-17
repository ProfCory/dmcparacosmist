import * as T from "../vendor/three.module.js";
import { clamp, location, generateTown, enemyIntent, damage } from "./core.js";
export class World {
  constructor(canvas, state, onEvent) {
    this.state = state;
    this.onEvent = onEvent;
    this.canvas = canvas;
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.camera = new T.PerspectiveCamera(65, 1, 0.1, 450);
    this.position = new T.Vector3(0, 0, 4);
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.driving = false;
    this.elapsed = 0;
    this.intro = 3;
    this.enemyCooldown = 0;
    this.resize = () => {
      this.renderer.setSize(innerWidth, innerHeight, false);
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
    };
    this.resize();
    window.addEventListener("resize", this.resize);
    this.rebuild();
  }
  disposeScene() {
    if (!this.scene) return;
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          m.map?.dispose();
          m.dispose();
        }
      }
    });
  }
  box(x, y, z, w, h, d, color, parent = this.scene) {
    const mesh = new T.Mesh(
      new T.BoxGeometry(w, h, d),
      new T.MeshStandardMaterial({ color, roughness: 0.87 }),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  label(text, x, y, z, width = 2, color = "#e4d4b2", parent = this.scene) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#1b2422";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#927e53";
    ctx.lineWidth = 7;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = color;
    ctx.font = "bold 34px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 64, 480);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(
      new T.PlaneGeometry(width, width / 4),
      new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide }),
    );
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  avatar(c, parent = this.scene) {
    const group = new T.Group();
    const skin = new T.Color().setHSL(
      0.075,
      c.saturation / 160,
      0.82 - c.melanin * 0.0052,
    );
    const seg = c.fidelity === "low" ? 4 : c.fidelity === "poly" ? 6 : 16;
    const part = (x, y, z, w, h, d, color) =>
      this.box(x, y, z, w, h, d, color, group);
    part(
      0,
      1.08,
      0,
      0.48,
      0.58,
      0.3,
      c.gender === "etcetera" ? "#e4e0d2" : "#bcae93",
    );
    const head = new T.Mesh(
      new T.SphereGeometry(0.21, seg, seg),
      new T.MeshStandardMaterial({
        color: skin,
        flatShading: c.fidelity !== "smooth",
      }),
    );
    head.position.y = 1.61;
    group.add(head);
    part(0, 1.78, 0, 0.37, 0.12, 0.35, c.hair);
    part(-0.3, 1.08, 0, 0.12, 0.58, 0.15, skin);
    part(0.3, 1.08, 0, 0.12, 0.58, 0.15, skin);
    for (const x of [-0.14, 0.14]) {
      part(x, 0.39, 0, 0.19, 0.72, 0.23, c.legs === "short" ? skin : "#53635d");
      part(
        x,
        0.07,
        -0.055,
        0.22,
        c.feet === "long" ? 0.28 : 0.14,
        0.35,
        "#383c35",
      );
      part(x * 0.6, 1.64, -0.193, 0.055, 0.04, 0.03, c.eye);
    }
    if (c.chest === "long") part(0, 1.03, 0.01, 0.57, 0.73, 0.34, "#686f4b");
    else if (c.chest === "short") part(0, 1.15, 0, 0.49, 0.33, 0.31, "#dbd6c3");
    if (c.head !== "short")
      part(0, 1.85, 0, c.head === "long" ? 0.65 : 0.43, 0.1, 0.44, "#84724d");
    if (c.facialHair) part(0, 1.47, -0.17, 0.29, 0.13, 0.08, c.hair);
    if (c.bodyHair) part(-0.307, 1.1, -0.08, 0.025, 0.21, 0.02, c.hair);
    if (c.makeup) part(0, 1.52, -0.21, 0.1, 0.025, 0.02, "#a56165");
    if (c.piercings) part(0.22, 1.55, 0, 0.04, 0.07, 0.04, "#ddd6a6");
    // Neutral clothed mannequins with additional modesty bars for the requested variants.
    if (c.gender !== "etcetera")
      part(0, 0.79, -0.18, 0.5, 0.16, 0.04, "#121917");
    if (c.gender === "female") part(0, 1.21, -0.19, 0.5, 0.17, 0.04, "#121917");
    parent.add(group);
    return group;
  }
  station(id, x, z, label) {
    this.stations.push({ id, x, z, label });
  }
  rebuild() {
    this.disposeScene();
    this.scene = new T.Scene();
    this.stations = [];
    this.obstacles = [];
    this.enemies = [];
    this.roadGroups = new Map();
    this.driving = false;
    this.pitch = 0;
    this.yaw = 0;
    this.position.set(0, 0, 4);
    const basement = this.state.scene === "basement";
    this.scene.background = new T.Color(basement ? "#212721" : "#b7b49a");
    this.scene.fog = new T.Fog(
      basement ? "#212721" : "#b7b49a",
      basement ? 14 : 60,
      basement ? 40 : 230,
    );
    this.scene.add(
      new T.HemisphereLight(
        basement ? "#dfcda2" : "#d5e1de",
        basement ? "#22271f" : "#796747",
        basement ? 2.6 : 2.8,
      ),
    );
    const sun = new T.DirectionalLight("#ffe3af", basement ? 2 : 3);
    sun.position.set(20, 40, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    this.scene.add(sun);
    this.sun = sun;
    if (basement) this.basement();
    else if (this.state.phase === "road") this.road();
    else this.town();
    this.player = this.avatar(
      this.state.character || {
        fidelity: "poly",
        melanin: 35,
        saturation: 50,
        hair: "#302a23",
        eye: "#677776",
        gender: "etcetera",
        feet: "medium",
        legs: "long",
        chest: "medium",
        head: "short",
      },
    );
  }
  basement() {
    const bulb = new T.PointLight("#ffe0a4", 55, 22, 2);
    bulb.position.set(0, 3.2, 0);
    this.scene.add(bulb);
    this.box(0, 3.65, 0, 1, 0.08, 0.35, "#e5d7a0");
    this.box(0, -0.2, 0, 16, 0.4, 16, "#6c6857");
    this.box(0, 2, -8, 16, 4, 0.3, "#747765");
    this.box(-8, 2, 0, 0.3, 4, 16, "#595f52");
    this.box(8, 2, 0, 0.3, 4, 16, "#595f52");
    this.box(0, 3.9, 0, 16, 0.2, 16, "#434b40");
    for (let i = -7; i < 8; i += 2)
      this.box(i, 3.7, 0, 0.18, 0.3, 16, "#393c30");
    for (let i = 0; i < 7; i++)
      this.box(5, i * 0.18, 6 + i * 0.27, 2, 0.3, 0.3, "#777260");
    this.label("THE BASEMENT", 0, 3, -7.8, 5);
    this.label("01 / DEFINE YOURSELF", -2.6, 2.7, -5.85, 3);
    for (const [x, name] of [
      [-2.6, "YOU"],
      [1.7, "YOUR PEOPLE"],
    ]) {
      this.box(x, 1.8, -6, 0.13 + 2.3, 1.4, 0.2, "#8b7550");
      this.box(x, 1.8, -5.87, 2.1, 1.2, 0.04, "#34483d");
      this.label(name, x, 1.85, -5.82, 1.8);
    }
    if (this.state.character) {
      const a = this.avatar(this.state.character);
      a.scale.setScalar(0.6);
      a.position.set(-2.6, 1.13, -5.5);
      a.rotation.y = Math.PI;
    }
    this.state.squad.forEach((c, i) => {
      const a = this.avatar(c);
      a.scale.setScalar(0.45);
      a.position.set(1.1 + i * 0.55, 1.15, -5.5);
      a.rotation.y = Math.PI;
    });
    this.station("portrait", -2.6, -4.4, "Define your portrait");
    this.station("squad", 1.7, -4.4, "Arrange your squad photo");
    this.box(-5.8, 1.5, -0.5, 2.8, 2, 0.2, "#a18c60");
    this.box(-5.8, 1.55, -0.36, 2.5, 1.7, 0.02, "#c2b993");
    for (let n = 0; n < 9; n++) {
      this.box(-6.9 + n * 0.28, 1.55, -0.33, 0.012, 1.6, 0.01, "#889582");
      this.box(-5.8, 0.85 + n * 0.18, -0.33, 2.4, 0.01, 0.01, "#889582");
    }
    this.box(-5.8, 0.7, 0, 3, 0.16, 1.2, "#65583e");
    this.box(-5.5, 1.2, 0.02, 0.7, 0.85, 0.3, "#222e28");
    this.label("VHS EDITOR", -5.7, 2.8, -0.35, 2.7);
    this.station("editor", -5.8, 1.5, "Edit a VHS / save to floppy");
    this.box(5.4, 0.7, 0, 2, 0.15, 1.2, "#706048");
    this.box(5.4, 1.25, 0, 1.6, 1, 0.8, "#b3aa8f");
    this.box(5.13, 1.3, 0.43, 0.7, 0.55, 0.04, "#1f3c32");
    this.label("LINE OFFLINE", 5.14, 1.3, 0.46, 0.65);
    this.box(5.9, 1.4, 0.43, 0.4, 0.08, 0.05, "#302e24");
    this.box(5.4, 0.81, 0.7, 1.5, 0.1, 0.5, "#9b957d");
    this.box(6.5, 0.9, 0.3, 0.35, 0.2, 0.6, "#615f4e");
    this.station("computer", 5.4, 1.8, "Open the floppy computer");
    this.box(0, 0.65, 3, 2, 0.1, 1, "#736444");
    this.box(0, 1.2, 3, 1.5, 1, 0.8, "#403e33");
    this.box(0, 1.25, 3.43, 1.25, 0.7, 0.04, "#719078");
    this.label("INSERT VHS", 0, 1.25, 3.46, 1.1);
    this.label("02 / TAKE THE ROAD", 0, 2.2, 3.4, 3);
    this.station("tape", 0, 5, "Play: A road in the middle of nowhere");
    for (let i = 0; i < 5; i++)
      this.box(
        1.4,
        0.7 + i * 0.12,
        3,
        0.6,
        0.1,
        0.5,
        i === 0 ? "#b18a52" : "#373c34",
      );
    this.obstacles = [
      [-2.6, -6, 1.3, 0.3],
      [1.7, -6, 1.3, 0.3],
      [-5.8, 0, 1.6, 0.8],
      [5.4, 0, 1.3, 0.8],
      [0, 3, 1.1, 0.6],
    ];
  }
  town() {
    this.position.set(0, 0, 8);
    this.box(0, -0.25, -15, 160, 0.5, 140, "#ac9f78");
    this.box(0, -0.3, 43, 160, 0.2, 55, "#648c8b");
    this.box(0, 0.05, 14, 14, 0.3, 12, "#6c7265");
    for (let x = -5; x <= 5; x += 5) this.box(x, 1, 17, 3, 2, 3, "#8e6b4b");
    for (const x of [-11, 11]) {
      this.box(x, 0.5, 25, 3, 1.2, 7, "#4d625d");
      this.box(x, 1.6, 25, 2, 1.2, 2, "#ded6b8");
    }
    this.label("LANDFALL / NEW ARRIVALS", 0, 3, 1, 7);
    this.box(0, 0.7, 0, 3, 1.3, 1, "#7b7152");
    this.station("register", 0, 2, "Quartermaster / register arrival");
    const town = generateTown(this.state.build, this.state.content);
    let n = 0;
    for (const b of town.buildings)
      for (let i = 0; i < b.count; i++) {
        const x = (n % 2 ? 1 : -1) * (11 + Math.floor(n / 6) * 10),
          z = -7 - Math.floor(n / 2) * 10;
        this.box(x, 2, z, 7, 4, 6, ["#8c8a70", "#a08b64", "#76846a"][n % 3]);
        this.box(x, 4.1, z, 7.5, 0.25, 6.5, "#545f53");
        this.label(b.type.toUpperCase(), x, 3, z + 3.05, 5);
        this.obstacles.push([x, z, 3.5, 3]);
        n++;
      }
    for (let i = 0; i < Math.min(12, town.npcs.length); i++) {
      const a = this.avatar({
        ...this.state.character,
        hair: "#584638",
        chest: i % 2 ? "long" : "medium",
      });
      a.position.set((i % 2 ? 1 : -1) * (4 + (i % 3)), 0, -5 - i * 3);
      this.station(
        "npc:" + i,
        a.position.x,
        a.position.z,
        "Talk to " + town.npcs[i].name + " / " + town.npcs[i].job,
      );
    }
    this.box(8, 0.7, 7, 3, 1.5, 3, "#8d8956");
    this.label("YOUR TENT", 8, 2, 8.6, 2.7);
    this.station("tent", 8, 9, "Sleep in your assigned tent");
    this.box(-7, 1, 1, 3, 2, 2, "#94734d");
    this.label("LOTTERY 017", -7, 2.3, 2.05, 3);
    this.station("lottery", -7, 3, "Claim your container lottery");
    this.label("TRADING POST", -8, 2.5, -5, 3);
    this.station("trade", -8, -3, "Trade supplies");
    this.car = this.makeCar(0, -15);
    this.station("vehicle", 0, -12, "Collect vehicle / leave town");
    this.label("THE OPEN ROAD", 0, 4, -20, 5);
  }
  makeCar(x, z) {
    const g = new T.Group();
    this.box(0, 0.65, 0, 1.8, 0.7, 3.5, "#a88a51", g);
    this.box(0, 1.2, 0.1, 1.6, 0.7, 1.7, "#c1b58c", g);
    this.box(0, 1.25, -0.78, 1.4, 0.4, 0.03, "#426260", g);
    for (const a of [-1, 1])
      for (const b of [-1.1, 1.1])
        this.box(a, 0.4, b, 0.35, 0.65, 0.65, "#303b35", g);
    for (const a of [-0.6, 0.6])
      this.box(a, 0.7, -1.77, 0.4, 0.2, 0.04, "#f0dfb3", g);
    g.position.set(x, 0, z);
    this.scene.add(g);
    return g;
  }
  road() {
    this.position.set(0, 0, -this.state.distance);
    this.car = this.makeCar(0, this.position.z);
    this.driving = true;
    this.refreshRoad();
  }
  refreshRoad() {
    const spacing = 48 / this.state.build.density;
    const base = Math.max(0, Math.floor(-this.position.z / spacing));
    for (const [i, g] of this.roadGroups) {
      if (Math.abs(i - base) > 5) {
        this.scene.remove(g);
        g.traverse((o) => {
          o.geometry?.dispose();
          o.material?.map?.dispose();
          o.material?.dispose();
        });
        this.roadGroups.delete(i);
        this.enemies = this.enemies.filter((e) => e.index !== i);
      }
    }
    for (let i = Math.max(0, base - 3); i <= base + 5; i++) {
      if (this.roadGroups.has(i)) continue;
      const g = new T.Group();
      this.roadGroups.set(i, g);
      this.scene.add(g);
      const z = -i * spacing;
      this.box(0, -0.18, z, 170, 0.3, spacing + 0.1, "#a69d78", g);
      this.box(0, -0.015, z, 7, 0.05, spacing + 0.1, "#62655b", g);
      for (let k = 0; k < spacing; k += 9)
        this.box(0, 0.02, z + k - spacing / 2, 0.13, 0.02, 3, "#d8c495", g);
      const site = location(this.state, i);
      const x = site.x * (i % 2 ? 1 : -1);
      const size = { small: 2, medium: 4, large: 6 }[site.size];
      this.box(x, size * 0.35, z, size, size * 0.7, size, "#8c896b", g);
      this.box(x, size * 0.72, z, size + 0.4, 0.18, size + 0.4, "#596655", g);
      this.label(
        site.name.toUpperCase(),
        x,
        size + 0.4,
        z + size / 2,
        Math.max(3, size),
        "#e4d4b2",
        g,
      );
      this.box(x, 0.3, z + size / 2 + 1, 0.6, 0.6, 0.6, "#c5a462", g);
      if (site.enemy) {
        const enemy = this.box(
          x + 4,
          site.enemy === "apex" ? 0.9 : 0.35,
          z,
          site.enemy === "apex" ? 1.3 : 0.65,
          site.enemy === "apex" ? 1.8 : 0.7,
          site.enemy === "apex" ? 1.3 : 0.65,
          (this.state.content.skins.find(
            (k) => k.name === this.state.build.skin,
          ) || this.state.content.skins[0])[site.enemy],
          g,
        );
        this.enemies.push({
          mesh: enemy,
          kind: site.enemy,
          index: i,
          spawn: new T.Vector3(x + 4, 0, z),
        });
      }
    }
  }
  near() {
    if (this.state.scene === "wasteland" && this.state.phase === "road") {
      const spacing = 48 / this.state.build.density,
        index = Math.max(0, Math.round(-this.position.z / spacing));
      const site = location(this.state, index);
      const x = site.x * (index % 2 ? 1 : -1),
        z =
          -index * spacing +
          { small: 2, medium: 4, large: 6 }[site.size] / 2 +
          1;
      if (
        !this.driving &&
        Math.hypot(this.position.x - x, this.position.z - z) < 4
      )
        return {
          id: "loot",
          index,
          label: `Search ${site.name} (${site.zone.replace("away", "off-road")})`,
        };
      if (this.driving || this.position.distanceTo(this.car.position) < 5)
        return {
          id: "car",
          label: this.driving ? "Park / exit vehicle" : "Enter vehicle",
        };
      return null;
    }
    return (
      this.stations
        .map((s) => ({
          ...s,
          d: Math.hypot(this.position.x - s.x, this.position.z - s.z),
        }))
        .filter((s) => s.d < 3.2)
        .sort((a, b) => a.d - b.d)[0] || null
    );
  }
  update(dt, paused) {
    const s = this.state;
    this.elapsed += dt;
    let speed = 0;
    if (!paused && !s.dead) {
      const forward =
        (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0) -
        (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0);
      let side =
        (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
      if (this.driving) {
        this.yaw -= side * dt * 1.3;
        side = 0;
      }
      this.yaw +=
        ((this.keys.has("ArrowLeft") ? 1 : 0) -
          (this.keys.has("ArrowRight") ? 1 : 0)) *
        dt *
        1.7;
      let rate = this.driving ? 18 : 4;
      if (
        this.driving &&
        s.modes.vehicle &&
        (s.resources.fuel <= 0 || s.resources.condition <= 0)
      )
        rate = 0;
      const length = Math.max(1, Math.hypot(forward, side));
      const dx =
          ((-Math.sin(this.yaw) * forward + Math.cos(this.yaw) * side) *
            dt *
            rate) /
          length,
        dz =
          ((-Math.cos(this.yaw) * forward - Math.sin(this.yaw) * side) *
            dt *
            rate) /
          length;
      const old = this.position.clone();
      this.position.x += dx;
      this.position.z += dz;
      if (s.scene === "basement") {
        this.position.x = clamp(this.position.x, -7.3, 7.3);
        this.position.z = clamp(this.position.z, -7, 7.3);
        if (
          this.obstacles.some(
            ([x, z, w, d]) =>
              Math.abs(this.position.x - x) < w + 0.25 &&
              Math.abs(this.position.z - z) < d + 0.25,
          )
        )
          this.position.copy(old);
      } else if (s.phase !== "road") {
        this.position.x = clamp(this.position.x, -30, 30);
        this.position.z = clamp(this.position.z, -45, 20);
        if (
          this.obstacles.some(
            ([x, z, w, d]) =>
              Math.abs(this.position.x - x) < w + 0.25 &&
              Math.abs(this.position.z - z) < d + 0.25,
          )
        )
          this.position.copy(old);
      } else {
        this.position.x = clamp(this.position.x, -65, 65);
        this.position.z = Math.min(12, this.position.z);
        speed = this.position.distanceTo(old) / Math.max(dt, 0.001);
        if (this.driving) {
          this.car.position.copy(this.position);
          this.car.rotation.y = this.yaw;
        }
        this.refreshRoad();
      }
      this.enemyCooldown = Math.max(0, this.enemyCooldown - dt);
      for (const e of this.enemies) {
        e.mesh.visible = s.modes.apex;
        if (!s.modes.apex) continue;
        const distance = e.mesh.position.distanceTo(this.position);
        const cornered = Math.abs(e.mesh.position.x - e.spawn.x) > 8;
        const intent = enemyIntent(e.kind, distance, cornered);
        const dir = new T.Vector3().subVectors(this.position, e.mesh.position);
        dir.y = 0;
        dir.normalize();
        if (intent === "flee") dir.negate();
        if (intent !== "idle")
          e.mesh.position.addScaledVector(
            dir,
            dt * (intent === "pursue" ? 3 : 4),
          );
        if (
          distance < 2 &&
          !this.driving &&
          intent !== "flee" &&
          this.enemyCooldown === 0
        ) {
          damage(s, intent === "frenzy" ? 12 : 7);
          this.enemyCooldown = 1.5;
          this.onEvent("A creature strikes. Back away or reach your vehicle.");
        }
      }
    }
    this.player.visible = s.modes.thirdPerson && !this.driving;
    this.player.position.copy(this.position);
    this.player.rotation.y = this.yaw;
    const third = s.modes.thirdPerson || this.driving,
      dist = this.driving ? 6 : 3.5;
    const target = this.position
      .clone()
      .add(
        new T.Vector3(
          -Math.sin(this.yaw),
          Math.sin(this.pitch),
          -Math.cos(this.yaw),
        ).multiplyScalar(5),
      );
    target.y += 1.6;
    const cam = this.position.clone();
    cam.y = third ? 3.1 : 1.65;
    if (third) {
      cam.x += Math.sin(this.yaw) * dist;
      cam.z += Math.cos(this.yaw) * dist;
    }
    if (s.scene === "basement") {
      cam.x = clamp(cam.x, -7.6, 7.6);
      cam.z = clamp(cam.z, -7.6, 7.6);
      if (this.intro > 0) {
        this.intro = Math.max(0, this.intro - dt);
        cam.lerp(new T.Vector3(5, 3.4, 7), this.intro / 3);
      }
    }
    this.camera.position.copy(cam);
    this.camera.lookAt(target);
    this.renderer.render(this.scene, this.camera);
    return speed;
  }
}
