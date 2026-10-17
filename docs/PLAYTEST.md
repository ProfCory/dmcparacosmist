# Prototype acceptance walkthrough

Use a clean browser profile or export your save before clearing site storage. Menus pause simulation. The studio homepage should still load.

## Basement

1. Open `/game/`, step downstairs, and open Modes.
2. Basic controls must stay checked and disabled. Attempt Third person; it must explain the missing character requirements and return to the room.
3. Move around the CRT (A/D), then forward to the portrait. E opens the creator.
4. Change your name, skin/hair/eye colors, fidelity, clothing, and cosmetics. Confirm. Define two squadmates. The third slot is optional.
5. Turn on Third person. Your created mannequin should be visible. Turn it off and back on; the requirement should not reset.
6. Use the CRT to enter the first tape.

## Shore and road

1. Register at the counter ahead. Confirm the objective changes to your tent.
2. Walk right to the tent and sleep. Walk left to the lottery container and claim the car.
3. Talk to a resident; their job, resource need, and a named connection should be shown.
4. Trade at the trading post. Insufficient scrap must not grant supplies. Full resources must not consume scrap.
5. Collect the car down the road. W/S drive, A/D steer. The odometer and resources should change only while the simulation runs.
6. Park with E; walk to a structure cache; E searches it. A second search must not grant loot again.
7. Return to the car. R consumes one part for repairs, capped at 100 condition.
8. Disable food/water and vehicle upkeep. Those resources must freeze. Re-enable them and verify drains resume.
9. Enable Apex/Sub near a creature site. Large creatures pursue; small ones retreat, then attack at their retreat limit. Disabled creatures are invisible and harmless. Vehicles shelter the player in this prototype.
10. At zero food/water, health declines. At zero health, movement/simulation stop and the end screen appears. A fresh journey resets it.

## Saving, editing, imports

1. Exit your car; export a save. Reload: player position, parked car, people, modes and resources should persist.
2. Return to the basement, then use the CRT again. The previous road position and on-foot/driving state should restore.
3. At the editor, change name, seed and population. Check the generated building totals and map preview. Save a floppy.
4. At the computer, export it. Loading it must ask before resetting your journey.
5. Import a full save; it must validate before the replace confirmation. Cancel must preserve the current run.
6. Import an invalid JSON pack or out-of-range floppy. It should show an error without losing the current state.
7. Scan a folder with valid category subfolders and misplaced files. Only valid, correctly located packs should load; the summary reports skips.
8. The phone must say offline; it must not pretend a multiplayer session exists.

## Mobile

Test portrait and landscape. Dialogs must scroll, fields and buttons must remain reachable, and no horizontal document overflow should appear. Press/release touch movement and turn buttons; pointer cancellation or a hidden tab must clear movement. Drag the scene to look, tap Interact and Modes. Test on real Android hardware before claiming mobile performance support.
