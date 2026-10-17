# Escape in the Basement — Implementation 0.1

Source brief: [Down in the basement](https://docs.google.com/document/d/1H8TfffcxfAlB-G_TmJU5ISxCRM0DkARXq0UV0r_l7ik/edit). Read October 16, 2026. The original studio website and CNAME remain in place; the new game is under `/game/`.

## Architecture

- `core.js`: renderer-independent state, seeded generation, progression, mode rules, resource simulation, and validation. Tested with Node's built-in runner.
- `world.js`: Three.js scenes, placeholder mesh construction, cameras, collision bounds, movement/vehicle steering, interaction proximity, streaming road sections, and creature movement.
- `app.js`: accessible DOM dialogs, character forms, mode UI, editor/floppies, keyboard/touch input, storage, and import/export.
- `vendor/`: pinned Three.js 0.186.1, locally served and license-preserved.
- `content/`: editable category examples. Explicit user-selected imports avoid assumptions about browser filesystem access.
- `scripts/serve.mjs`: development-only static server, no backend game state.

Simulation pauses in dialogs and hidden tabs. Delta time is capped at 100 ms to prevent large resource/death jumps after a stalled frame. This slows simulated time on extremely slow devices. Road sections are generated and disposed around the player; visited IDs persist. Distance is an odometer for driving, while the actual player/car position is separately saved.

## Brief-to-code matrix

| Brief requirement | Implemented behavior | Remaining work |
|---|---|---|
| Basement / stairs / first person | Procedural room, opening camera descent, portrait, squad photo, CRT, editor, portable computer | Authored environment, cinematic polish |
| WASD / E / M, mandatory controls | Keyboard and touch movement, proximity interactions, required basic mode | Remapping, gamepad, accessibility audio |
| Third-person dependency interruption | Blocks until character and two squadmates are defined; explicit explanation | Downloadable mode packages |
| Character definition | Fidelity geometry variants, skin/hair/eyes, presentation, cosmetics, clothing lengths | Production meshes, licensed Pantone lookup, 3D live creator preview |
| Gender defaults/modesty | Neutral clothed mannequins; extra modesty bars for male/female; Etcetera default | Authored modular outfit meshes |
| Eye rarity and hair reference | Saved/exported metadata | Population genetics weighting and color-catalog mapping |
| Squad photo | Two customizable companions plus optional third | Autonomous following, combat and companion simulation |
| Third-person controllable avatar | Uses saved character attributes | Animation rig and camera obstruction raycasts |
| Raft / town / lottery / car | Static pontoon/tugs, town jobs/connections, registration, tent rest, deterministic lottery, trading, car | Animated landing and time-of-day transition |
| Population scales settlement | Gas stations, diners, farms, fisheries and connected NPC records scale with population; first 12 residents rendered | Full population streaming, job simulation, richer dialogue |
| Road / near / away loot | Seeded sites, three loot pools and structure sizes, one-time search tracking | Hand-authored POIs, richer items/collectibles and interiors |
| Needs and vehicle loop | Food/water depletion, starvation damage, fuel/condition drain, repair, trade, death, mode toggles | Physics driving, collisions for road structures, detailed inventory |
| Apex/Sub | Apex pursues; Sub flees, frenzies beyond retreat boundary; themed color packs | Navmesh, actual trapped-space detection, authored combat/animations |
| Modular folders | Validated JSON category packs and explicit browser folder selection; invalid/misplaced files skipped | Mesh/texture asset packs, installed-mode manifests, asset downloader |
| VHS editor / floppy | Copy seeded world settings, overhead town diagram, save/load/export/import floppies | Spatial placement tools, live POV view, complete level authoring |
| Computer / phone multiplayer | Floppy management; phone truthfully marked offline | Hosting/joining service, synchronization, permissions and session recovery |
| Stylized realism | Cohesive muted palette, local shaders, warm basement lighting | Production art pass, clean UVs/material slots, LODs and asset budgets |
| Equipment bonuses | Not enabled | Waist/back/head capacities, weather/impact rules after values are specified |

## Decisions and boundaries

- Browser-first implementation: the existing repository is a static website, so a local Three.js client provides a playable entry without replacing the studio site or requiring an engine installation.
- No backend, accounts, paid services, AI-generated NPC text, or cloud storage are silently introduced.
- No horror framing. Threats are optional and begin disabled.
- Default needs/upkeep rates, supply amounts, NPC quotas, interaction ranges, and collision sizes are provisional balance constants, not values specified by the brief.
- Food/water loot directly refills resources; parts/scrap are abstract counters. Inventory slots and equipment bonuses need a separate design pass.
- Smooth fidelity is a more finely tessellated placeholder, not a finished realistic human.
- The editor is a parameter editor with an overhead preview, not a completed spatial map editor.
- “Same seed” means the same content version and packs. Imported packs intentionally alter the generated result.
- Exported saves are editable local single-player data. Validation protects the application from malformed data; this is not anti-cheat or an authority model for multiplayer.
- Only passive data imports are accepted. No executable mod scripts.

## Next implementation milestones

1. **Playable art/controls pass:** character rig and walk/drive animations; physical collision for road structures, camera collision, car acceleration/braking; profiling on an actual midrange Android device.
2. **Complete the builder:** versioned placed-object layout, graph selection/placement, live scene preview, asset IDs/material templates, import dependency report.
3. **Content depth:** equipment/inventory rules, weighted NPC genetics, companion behavior, structured tasks, more road encounters, improved Apex/Sub navigation.
4. **Networked sessions:** choose an explicit hosting model; authoritative state, join codes/phone interface, reconnection and save ownership. Keep multiplayer disabled until two independent clients pass integration tests.
5. **Release hardening:** save migration beyond v1, accessibility controls, user-facing content diagnostics, cross-browser/mobile performance, art licensing review.
