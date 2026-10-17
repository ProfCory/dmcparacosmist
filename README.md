# DMC Paracosmist

Dark Monkey Chorus Paracosmist studio website, plus **Escape in the Basement**, a playable 3D browser prototype based on *Down in the basement*.

## Run it

Requires Node.js 22 or later for the development server and tests.

```sh
npm ci
npm start
```

Open **http://localhost:4173/game/**. The existing studio site remains at `/` and links to the prototype.

The game itself is static HTML/CSS/JavaScript. `game/vendor/` includes Three.js and its MIT license, so gameplay makes no CDN, model, telemetry, account, or paid API requests. Serve the repository through any static HTTP server; opening `index.html` directly as `file://` will not work with module imports. GitHub Pages can serve the existing root and `/game/` without a build step. This change does not configure or deploy hosting.

## Play

- **WASD:** move. In a vehicle, W/S drive and A/D steer.
- **Drag:** look; **left/right arrow:** turn; **up/down arrow:** forward/back.
- **E:** interact with the nearest object; the bottom-right prompt names it.
- **M:** modes. **Esc:** menu. **R:** repair when in/near your car.
- Touch devices have move/turn buttons, drag-to-look, and Interact/Modes controls.
- Menus and hidden tabs pause survival and creatures.

Start downstairs, try Third person in Modes, then create a portrait and two squadmates. Enable Third person, use the CRT/VHS, register on shore, sleep at your tent, claim the container lottery, and collect your car. Trade before leaving if you want. Drive, park, and search roadside structures for supplies. Toggle needs, vehicle upkeep, and Apex/Sub creatures to change the experience.

At the left-wall editor, duplicate a world and change its seed, population, structure density, creature density, or skin. Save it as a floppy, then load or export it at the right-wall computer. Loading a floppy starts a fresh journey after confirmation.

## Saves and content

Autosaves are local to this browser and origin, every five active seconds and at key transitions. **Export save** creates a portable JSON backup; **Import save** validates it before asking to replace the current run. Browser storage can be cleared or unavailable: export anything you care about. There is no cloud sync.

Floppies contain world settings, not a full game save. Share them to generate the same world independently. Custom packs are separate and must be shared too; full saves embed their content.

See [content instructions](game/content/README.md), [implementation scope](docs/IMPLEMENTATION.md), and [manual acceptance checks](docs/PLAYTEST.md).

## Test

```sh
npm test
npx playwright install chromium
npm run test:browser
```

Browser tests start their own server on port 4180. `CHROME_BIN=/path/to/chromium` optionally selects an existing executable. Screenshots go to ignored `test-results/`. CI runs simulation and browser checks without publishing the site.

## Current scope

This is a functional **single-player prototype**, not the finished game. Characters, vehicles, buildings, and creatures use primitive placeholder meshes. Multiplayer, a spatial level editor with live POV, polished art/animation, asset downloading, equipment capacity bonuses, advanced NPC/party behavior, and weighted genetics remain future work. Their UI does not claim those systems are running. See the implementation matrix for exact boundaries.
