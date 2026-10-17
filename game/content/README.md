# Content packs

Runtime defaults live in `src/core.js`; matching editable JSON copies live here. The parity test catches accidental drift. Copy a template, edit its data, then import it from Menu → Import content pack. Single-file imports replace one category. They never execute code.

For folder scanning, use this structure:

```
my-content/
  names/custom.json
  vehicles/custom.json
  loot/custom.json
  structures/custom.json
  skins/custom.json
```

Each JSON file uses `{ "version": 1, "kind": "names", "data": [...] }` with the appropriate category and data shape. Folder scanning only accepts a file whose parent path contains its declared category. Invalid/misplaced files are skipped with a count. Scans stop above 500 files; each file is limited to 2 MB. Keep a single pack per category for predictable replacement order. The browser cannot silently enumerate or write arbitrary device folders: users explicitly select imports and export downloads.

- **names:** 1–500 names, each up to 32 characters.
- **vehicles:** 1–100 `{name, fuel, condition}` entries; fuel/condition 1–100.
- **loot:** nonempty `road`, `near`, and `away` arrays, up to 100 entries each. Each has `{name, resource, amount}`. Resources: `food`, `water`, `fuel`, `parts`, `scrap`; amounts 1–100.
- **structures:** nonempty `small`, `medium`, and `large` name arrays, up to 100 per size. These currently reskin descriptions around placeholder buildings; no arbitrary mesh importing yet.
- **skins:** 1–30 `{name, apex, sub}` entries. Color values must be six-digit hex colors. Creature behavior is independent from these colors/themes.

Imported data is embedded in autosaves and full save exports. JSON strings are escaped before display. Unknown categories, unsupported versions, missing fields, empty tables, and out-of-range values are rejected before replacing that category.

Changing a category changes future generation; previously searched site IDs remain searched. Start a fresh journey to evaluate a new pack consistently. To change shipped defaults, edit `DEFAULT_CONTENT` and regenerate the JSON copies together; `npm test` verifies they match.
