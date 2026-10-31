# DYSTOPIA in Godot — Step 1 (beginner guide)

## 1. Import it on your Fold (Godot 4 Android editor)
1. Download `dystopia_godot_step1.zip` to your phone (it'll land in **Downloads**).
2. Open **Godot**. On the Project Manager screen, tap **Import**.
3. Browse to the zip and pick it. Godot 4.3+ can import a zip directly: it asks where to extract it. Choose a folder like `Documents/Godot` and tap **Import & Edit**.
   - If your version won't take the zip, unzip it first with the **My Files** app, then in Import choose the `dystopia_godot` folder (or its `project.godot` file).
4. If Godot asks for file access permission, allow it.

## 2. Press Play
Tap the **▶ Play** button (top right). The game opens full screen.
- **Left half of the screen:** put your thumb down and drag = joystick to walk.
- **Right half:** drag to look around.
- **FIRE** button (bottom right): shoot.
- Keyboard: WASD to move, click to lock the mouse and shoot, Esc to unlock.
Shoot the Sentinel 4 times → KILLS goes to 1. If it hits you to 0 health, the level restarts.
To stop, press the back button / ⏹.

## 3. Tour of the files
| File | What it does |
|---|---|
| `project.godot` | Settings: game name, first scene, and the **Compatibility** renderer (works on phones). |
| `main.tscn` | The starting scene. Just one node, "Main", with `main.gd` attached. |
| `main.gd` | Builds the level: fog, sun, red lamp, floor, walls, then adds the Player, a Sentinel and the HUD. |
| `player.gd` | You. Camera, walking, gravity, looking, and `shoot()` (an invisible ray + yellow muzzle flash). |
| `sentinel.gd` | The enemy: metal capsule + glowing red eye. Chases you, hits once per second, flashes white when shot, dies at 0 health. |
| `hud.gd` | Health/kills text, crosshair, FIRE button, and the touch joystick/look code. |

Tip: lines starting with `#` are comments (notes for humans). Look for `# --- TWEAK ME ---` at the top of each script.

## 4. Three tiny tweaks (change one number, press Play)
1. **Faster enemy:** in `sentinel.gd`, change `var speed = 3.0` to `6.0`. It runs at you twice as fast.
2. **Fog color:** in `main.gd`, change `var fog_color = Color(0.25, 0.08, 0.06)` to `Color(0.05, 0.15, 0.1)` for toxic green smog. (Numbers are red, green, blue from 0 to 1.)
3. **Super gun:** in `player.gd`, change `var gun_damage = 25` to `100`. One shot kills.

Bonus: `eye_color` in `sentinel.gd` → try `Color(0, 1, 1)` for a cyan eye.

## Next steps (later)
More Sentinels, drones, the Colossus, real 3D models (.glb), sounds.
