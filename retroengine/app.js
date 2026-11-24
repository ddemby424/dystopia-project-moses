/* =====================================================================
   RetroEngine — app.js  (editor + data)
   Play mode uses the standalone DMB Tech 1 library (dmbtech1.js).
   Sections:  1) createRuntime() from ./dmbtech1.js
              2) Data       — room/building templates + starter levels
              3) Editor     — 2D map editor UI
   ===================================================================== */
import { createRuntime } from './dmbtech1.js';
import { installMultiplayer } from './mp/mp-app.js';

const VERSION = '1.2.5';
function DFRuntime() { return createRuntime(); }

/* =====================================================================
   EDITOR DATA: text legend, building & room templates.
   Templates are drawn as text so you can easily add your own:
   every character is one grid cell (see TEMPLATE_LEGEND below).
   ===================================================================== */
const DEFAULT_LEGEND = {
  '#': { wall: 'concrete' }, '%': { wall: 'metal_panel' }, '&': { wall: 'brick' }, 'S': { wall: 'server' },
  '.': { floor: '', ceil: '' }, ',': { floor: 'tile', ceil: 'light_panel' }, '~': { floor: 'asphalt', ceil: 'sky' },
  ';': { floor: 'hazard', ceil: '' }, ':': { floor: 'grate', ceil: 'metal_panel' }
};
// Characters that place things (they also become floor, copying the floor to their left)
const ENTITY_CHARS = {
  '@': ['spawn'], 'X': ['exit'],
  'L': ['light', '#ffd9a0', 6, 1.4, false], 'F': ['light', '#ff8a3a', 5, 1.5, true], 'C': ['light', '#4ad8ff', 6, 1.3, false], 'V': ['light', '#ff3030', 5, 1.4, true],
  'g': ['enemy', 'grunt'], 'd': ['enemy', 'drone'], 'H': ['enemy', 'heavy'], 't': ['enemy', 'turret'], 'T': ['enemy', 'titan'],
  'h': ['pickup', 'health'], 'm': ['pickup', 'medkit'], 'a': ['pickup', 'armor'], 'A': ['pickup', 'armor_heavy'], 'u': ['pickup', 'ammo_bullets'], 's': ['pickup', 'ammo_shells'],
  'c': ['pickup', 'ammo_cells'], 'k': ['pickup', 'ammo_rockets'], 'R': ['pickup', 'key_red'], 'B': ['pickup', 'key_blue'], 'Y': ['pickup', 'key_yellow'],
  'w': ['pickup', 'w_shotgun'], 'q': ['pickup', 'w_rifle'], 'p': ['pickup', 'w_plasma'], 'z': ['pickup', 'w_rocket'], '$': ['pickup', 'chip'],
  'o': ['prop', 'barrel'], 'x': ['prop', 'crate'], 'K': ['prop', 'crate_tall'], 'P': ['prop', 'pillar'], 'e': ['prop', 'desk'], 'n': ['prop', 'terminal'], 'N': ['prop', 'server'],
  'i': ['prop', 'pipes'], 'G': ['prop', 'generator'], 'l': ['prop', 'locker'], 'f': ['prop', 'lamp'], 'v': ['prop', 'cone'], 'j': ['prop', 'debris'], 'Z': ['prop', 'sandbags'],
  'Q': ['prop', 'console'], 'M': ['prop', 'med_cabinet'], 'E': ['prop', 'lab_bench'], 'W': ['light', '#eef6ff', 8, 2.2, false],
  'U': ['prop', 'vat'], 'J': ['prop', 'fan'], 'O': ['prop', 'extinguisher'],
  'I': ['prop', 'vent'], '8': ['prop', 'shelves']
};
const DOOR_CHARS = { 'D': 'door', 'r': 'red', 'b': 'blue', 'y': 'yellow' };
const HEIGHT_CHARS = { '1': 0.15, '2': 0.3, '3': 0.45, '4': 0.6, '5': 0.75 };
const TEMPLATE_LEGEND_HELP = 'Walls: # % & S · Floors: . , ~(sky) ; : · Doors: D, r/b/y = keycard doors · Heights 1-4 = stairs/catwalk, 5 = cover block · @ start · X exit · L F C V W lights (W = bright white) · g d H t T enemies · h m a A u s c k pickups · R B Y keys · w q p z weapons · $ secret · o x K P e n N i G l f v j Z Q M E U J O props';

const TEMPLATES = [
  { id: 'small_room', name: 'Small Room', cat: 'Rooms', desc: '5x5 room, one door', rows: [
    '#######', '#L...x#', '#.....#', '#..g..#', '#.....#', '#h...L#', '###D###'] },
  { id: 'junction', name: 'Junction Room', cat: 'Rooms', desc: 'Doors on all 4 sides', rows: [
    '####D####', '#L.....L#', '#..x.x..#', '#.......#', 'D...g...D', '#.......#', '#..x.x..#', '#L.....L#', '####D####'] },
  { id: 'arena', name: 'Combat Arena', cat: 'Rooms', desc: 'Pillars, cover and raised corners', legend: { '#': { wall: 'concrete_dark' }, '.': { floor: 'plate', ceil: '' } }, rows: [
    '###############', '#F.....D.....F#', '#.22.......22.#', '#.22..P.P..22.#', '#.............#', '#..P...5...P..#', '#....g...g....#', 'D..5..hLa..5..D',
    '#....g...g....#', '#..P...5...P..#', '#.............#', '#.22..P.P..22.#', '#.22.......22.#', '#F.....D.....F#', '###############'] },
  { id: 'server_room', name: 'Server Room', cat: 'Rooms', desc: 'Glowing rack aisles', legend: { '%': { wall: 'tech' }, '.': { floor: 'grate', ceil: 'metal_panel' } }, rows: [
    '%%%%%D%%%%%', '%C.......C%', '%.SS.S.SS.%', '%.SS.S.SS.%', '%....d....%', '%.SS.S.SS.%', '%.SS.S.SS.%', '%C...n...C%', '%%%%%%%%%%%'] },
  { id: 'warehouse', name: 'Warehouse', cat: 'Rooms', desc: 'Crates, barrels, pipes and vents', legend: { '%': { wall: 'rust' }, '.': { floor: 'concrete', ceil: 'grate' } }, rows: [
    '%%%%%%%D%%%%%%%', '%L....x.x....L%', '%.xx..I.I..Kx.%', '%.xK..ooo..xx.%', '%..i.......i..%', 'D.....g.......D', '%..8.......Q..%', '%.Kx...U...xx.%', '%.xx...u...xK.%', '%L..J.....N..L%', '%%%%%%%D%%%%%%%'] },
  { id: 'reactor', name: 'Reactor Chamber', cat: 'Rooms', desc: 'Hazard ring around a core', legend: { '%': { wall: 'tech' }, '.': { floor: 'plate', ceil: '' } }, rows: [
    '%%%%%D%%%%%', '%F.......F%', '%.;;;;;;;.%', '%.;i...i;.%', '%.;.555.;.%', 'D.;.5G5.;.D', '%.;.555.;.%', '%.;i...i;.%', '%.;;;;;;;.%', '%F...c...F%', '%%%%%D%%%%%'] },
  { id: 'office', name: 'Office', cat: 'Rooms', desc: 'Desks, terminals, lockers', legend: { '.': { floor: 'tile_dark', ceil: 'light_panel' } }, rows: [
    '###########', '#L..e..e.L#', '#.........#', 'D..e..e..n#', '#.........#', '#l.h..g..f#', '#####D#####'] },
  { id: 'lockers', name: 'Locker Room', cat: 'Rooms', desc: 'Tiled, with a hidden secret', legend: { '#': { wall: 'tile' }, '.': { floor: 'tile', ceil: 'light_panel' } }, rows: [
    '#########', '#lllllll#', '#.......#', '#L.....L#', '#..m....#', '#.......#', '#lllllll#', '#...$...#', '####D####'] },
  { id: 'key_vault', name: 'Red Key Vault', cat: 'Rooms', desc: 'Locked with a red keycard door', legend: { '#': { wall: 'concrete_dark' } }, rows: [
    '###r###', '#V...V#', '#.....#', '#..m..#', '#.....#', '#.o.o.#', '#######'] },
  { id: 'exit_lift', name: 'Exit Lift', cat: 'Rooms', desc: 'Small room with the exit pad', rows: [
    '&&&&&', '&C.C&', '&.X.&', '&...&', '&&D&&'] },
  { id: 'corridor', name: 'Corridor', cat: 'Halls', desc: 'Open ends — butt it against a door', rows: [
    '%%%%%%%%%%%', '.L.......L.', '...........', '.....o.....', '%%%%%%%%%%%'] },
  { id: 'corridor_v', name: 'Corridor (N-S)', cat: 'Halls', desc: 'Vertical 3-wide hall', rows: [
    '%...%', '%L..%', '%...%', '%...%', '%...%', '%..L%', '%...%'] },
  { id: 'l_hall', name: 'L-Hall', cat: 'Halls', desc: 'Corner hallway', rows: [
    '%%%%%%%%%', '.L......%', '........%', '......L.%', '%%%%%...%', '    %...%', '    %...%', '    %.L.%', '    %...%'] },
  { id: 't_junction', name: 'T-Junction', cat: 'Halls', desc: 'Three-way split', rows: [
    '%%%%%%%%%%%', '.....L.....', '...........', '...........', '%%%%...%%%%', '   %...%   ', '   %...%   '] },
  { id: 'stairs', name: 'Stairs Up', cat: 'Halls', desc: 'Rises 0.6 — leads onto catwalks', rows: [
    '%...%', '%444%', '%333%', '%222%', '%111%', '%.L.%', '%...%'] },
  { id: 'bunker', name: 'Bunker', cat: 'Buildings', desc: 'Thick concrete, sandbags, heavy mech', legend: { '#': { wall: 'concrete_dark' } }, rows: [
    '###########', '#F.......F#', '#.Z.....Z.#', '#....H....#', '#.l.....l.#', '#Z.......Z#', '#.........#', '#A..s.u...#', '#####D#####'] },
  { id: 'tower', name: 'Guard Tower', cat: 'Buildings', desc: 'Two levels: stairs to a catwalk ring', legend: { '#': { wall: 'concrete_dark' }, '.': { floor: 'grate', ceil: '' } }, rows: [
    '#########', '#t.....t#', '#.......#', '#...L...#', '#...x...#', '#.......#', '#.......#', '#d.....d#', '####D####'], hrows: [
    '.........', '.4444444.', '.4.....4.', '.4.....4.', '.4.....4.', '.4.....4.', '.4.....4.', '.4321234.', '.........'] },
  { id: 'mezzanine', name: 'Mezzanine Hall', cat: 'Buildings', desc: 'Raised balcony with turrets', legend: { '.': { floor: 'plate', ceil: '' } }, rows: [
    '%%%%%%%%%%%', '%t.......t%', '%.........%', '%.........%', '%...g.....%', '%.L.....L.%', '%%%%%D%%%%%'], hrows: [
    '...........', '.444444444.', '.444444444.', '.3.......3.', '.2.......2.', '.1.......1.', '...........'] },
  { id: 'courtyard', name: 'Courtyard', cat: 'Buildings', desc: 'Open sky, planters, street lamps', rows: [
    '&&&&&&D&&&&&&', '&f~~~~~~~~~f&', '&~55~~~~~55~&', '&~55~~j~~55~&', '&~~~~~~~~~~~&', 'D~~~~~d~~~~~D', '&~~~v~~~v~~~&', '&~55~~~~~55~&', '&~55~~h~~55~&', '&f~~~~~~~~~f&', '&&&&&&D&&&&&&'] },
  { id: 'hangar', name: 'Hangar', cat: 'Buildings', desc: 'Huge open-roof bay with cargo', legend: { '%': { wall: 'rust' } }, rows: [
    '%%%%%%%%%%%%%%%%%', '%F~~~~~~~~~~~~~F%', '%~~~~~~~~~~~~~~~%', '%~~xxK~~~~~Kxx~~%', '%~~xx~~~~~~~xx~~%', '%~~~~~~~G~~~~~~~%', 'D~~~~~~~~~~~~~~~D', '%~~~~~~~o~~~~~~~%', '%~~xx~~~~~~~xx~~%', '%~~Kxx~~~~~xxK~~%', '%~~~~~~d~d~~~~~~%', '%F~~~~~~~~~~~~~F%', '%%%%%%%%D%%%%%%%%'] },
  { id: 'guard_hut', name: 'Guard Hut', cat: 'Buildings', desc: 'Tiny prefab checkpoint', legend: { '%': { wall: 'metal_panel' } }, rows: [
    '%%D%%', '%f.u%', '%...%', '%h.g%', '%%%%%'] },
  { id: 'start_room', name: 'Start Room', cat: 'Set pieces', desc: 'Player start + supplies', rows: [
    '#######', '#L...L#', '#.u.h.#', '#..@..#', '#.....#', '#.....#', '###D###'] }
,
  { id: 'clean_lab', name: 'Clean Lab', cat: 'Clean rooms', desc: 'White lab panels, polished floor, bright lights', legend: { '#': { wall: 'lab_panel' }, '.': { floor: 'polished_tile', ceil: 'bright_panel' }, '%': { wall: 'clean_metal' } }, rows: [
    '###########', '#W...Q...W#', '#.E.....E.#', '#.........#', '#....h....#', 'D.........D', '#.M.....n.#', '#W.......W#', '###########'] },
  { id: 'med_bay', name: 'Med Bay', cat: 'Clean rooms', desc: 'Clean infirmary with cabinets and benches', legend: { '#': { wall: 'med_wall' }, '.': { floor: 'polished_tile', ceil: 'bright_panel' } }, rows: [
    '#########', '#W..M..W#', '#.E...E.#', '#...m...#', 'D.......D', '#.h...M.#', '#W.....W#', '#########'] }
];

/* Turn text rows into a list of cell changes and entities.
   rot = 0..3 quarter turns clockwise (R key while stamping). */
function parseTemplate(tpl, rot) {
  rot = rot || 0;
  const legend = Object.assign({}, DEFAULT_LEGEND, tpl.legend || {});
  const rows = tpl.rows, H = rows.length, W = Math.max.apply(null, rows.map(r => r.length));
  const cells = [], ents = []; let spawn = null;
  const rotP = (x, y) => { let px = x, py = y, w = W, h = H; for (let r = 0; r < rot; r++) { const nx = h - 1 - py, ny = px; px = nx; py = ny; const t = w; w = h; h = t; } return [px, py]; };
  for (let y = 0; y < H; y++) {
    let lastFloor = '.';
    for (let x = 0; x < W; x++) {
      const ch = rows[y][x] || ' '; if (ch === ' ') continue;
      const hch = tpl.hrows && tpl.hrows[y] ? tpl.hrows[y][x] : '.';
      const [px, py] = rotP(x, y);
      const c = { x: px, y: py };
      const lg = legend[ch];
      if (lg && lg.wall) { c.wall = lg.wall; c.kind = ''; }
      else if (DOOR_CHARS[ch]) { c.wall = 'door'; c.kind = DOOR_CHARS[ch]; }
      else {
        let fl = lg && lg.floor !== undefined ? ch : (HEIGHT_CHARS[ch] !== undefined || ENTITY_CHARS[ch] ? lastFloor : '.');
        if (lg && lg.floor !== undefined) lastFloor = ch;
        const L2 = legend[fl] || legend['.'];
        c.wall = ''; c.kind = ''; c.floor = L2.floor || ''; c.ceil = L2.ceil || ''; c.fh = HEIGHT_CHARS[ch] !== undefined ? HEIGHT_CHARS[ch] : (HEIGHT_CHARS[hch] || 0);
        const ed = ENTITY_CHARS[ch];
        if (ed) {
          if (ed[0] === 'spawn') spawn = { x: px + 0.5, y: py + 0.5 };
          else if (ed[0] === 'light') ents.push({ t: 'light', x: px + 0.5, y: py + 0.5, color: ed[1], radius: ed[2], intensity: ed[3], flicker: ed[4] });
          else ents.push({ t: ed[0], s: ed[1], x: px + 0.5, y: py + 0.5, r: ed[0] === 'enemy' ? Math.PI / 2 : 0 });
        }
      }
      cells.push(c);
    }
  }
  const w = rot % 2 ? H : W, h = rot % 2 ? W : H;
  return { w, h, cells, ents, spawn };
}
// Build a full level from a text-drawn starter level.
function levelFromAscii(def, RT) {
  const H = def.rows.length, W = def.rows[0].length, L = RT.newLevel(def.name, W, H);
  Object.assign(L.props, def.props || {});
  const p = parseTemplate({ rows: def.rows, hrows: def.hrows, legend: def.legend });
  p.cells.forEach(c => { const i = c.y * W + c.x; L.wall[i] = c.wall || ''; L.kind[i] = c.kind || ''; if (c.floor !== undefined) { L.floor[i] = c.floor; L.ceil[i] = c.ceil; L.fh[i] = c.fh || 0; } });
  L.ents = p.ents.map((e, i) => Object.assign({ id: 'e' + i.toString(36) + Math.random().toString(36).slice(2, 6) }, e));
  if (p.spawn) L.spawn = { x: p.spawn.x, y: p.spawn.y, r: def.spawnR || 0 };
  // Enemies start facing the player start so they look alive.
  L.ents.forEach(e => { if (e.t === 'enemy') e.r = Math.atan2(L.spawn.y - e.y, L.spawn.x - e.x); });
  return L;
}

/* Starter levels, drawn as text. Each character is one cell — see TEMPLATE_LEGEND. hrows = floor heights. */
const DF_STARTER_LEVELS = [
 {
  "name": "E1M1: Outpost Breach",
  "rows": [
   "&&&&&&&&&&##########################",
   "&~~~~~~~~&############.............#",
   "&~L~~~hx~&%%%%%%%%%%%%.h.........F.#",
   "&~~~~~~~~&,,,,,,,g,,,%......g......#",
   "&~~@~~~~~D,,L,,,,,L,,D...P.....P...#",
   "&~~~~~~~~&,,,,,o,,,,,%...ZZ....ZZ..#",
   "&~x~~~uL~&%%%%%%%%%%%%.....dL......#",
   "&~~~~~~~~&############..g......g...#",
   "&&&&&&&&&&############...P.....P...#",
   "######################........g..x.#",
   "######################.ws.......xx.#",
   "######################.............#",
   "&&&&&&&&&&###########%%%%%%%D%%%%%%%",
   "&........&,,q,,,,,,,,%;;;;;;g;;;;;;%",
   "&.$......&,,,,,,,,,m,%;;;;;;;;;;;a;%",
   "&........&,,e,,e,,e,,%;;;L;;;;;g;;;%",
   "&........&,,,,,,,,,,,%;;;;xx;;;;;;;%",
   "&...C....b,,,L,,,,,,,D;;;;K;;;;;;;;%",
   "&........&,,,,,,,,,,,%;;ZZ;;;;;ZZ;;%",
   "&...X....&,,,,g,,,,,,%;;;g;;;;xx;;;%",
   "&........&,,n,,,,,L,,%;;;;;;d;;;;;;%",
   "&l.....F.&,u,,,,H,,,,%;oo;;;;;;L;B;%",
   "&l.......&,,,,,,,,,,,%;;;;;;;;;;;;;%",
   "&&&&&&&&&&###########%%%%%%%%%%%%%%%"
  ],
  "spawnR": 0,
  "legend": {
   "#": {
    "wall": "concrete"
   },
   "%": {
    "wall": "metal_panel"
   },
   "&": {
    "wall": "brick"
   },
   ".": {
    "floor": "concrete"
   },
   ",": {
    "floor": "tile_dark",
    "ceil": "light_panel"
   },
   "~": {
    "floor": "asphalt",
    "ceil": "sky"
   },
   ";": {
    "floor": "plate",
    "ceil": "grate"
   }
  },
  "props": {
   "sky": "night",
   "ambient": "#8d96ad",
   "ambientI": 0.55,
   "fogColor": "#0a0d14",
   "fog": 0.04,
   "wallH": 1.5,
   "floorTex": "concrete",
   "ceilTex": "ceiling",
   "track": "seismic",
   "script": "api.on('start', () => api.message('OUTPOST BREACH — find the BLUE keycard, reach the exit lift'));\napi.on('pickup', t => { if (t === 'w_rifle') api.message('Assault rifle: hold fire, R to reload'); if (t === 'key_blue') api.message('Blue keycard — the lift is west'); });\napi.on('kill', () => { if (api.enemiesLeft() === 0) api.message('Outpost clear'); });"
  }
 },
 {
  "name": "E1M2: Server Hall G",
  "rows": [
   "%%%%%%%%%%%#############################",
   "%,,,,,,,,,%#############################",
   "%,,,,L,,h,%#############################",
   "%,,,,,,,,,%................#############",
   "%,,@,,,,,,D...C.....g..Cg..#############",
   "%,,,,,,,,,%..............o.#############",
   "%,,,,,,,,,%SSSSSSSDSSSSSSSSSSSSS%%%%%%%%",
   "%,e,,L,,n,%:::::::::::::::::::RS;;;;;;m%",
   "%,,,,,,,,,%:sC:::d::::C::::::::S;;d;;;;%",
   "%%%%%D%%%%%:::SS:::SS:::SS:::::S;;;;;d;%",
   "#........#S:::SS:::SS:::SS:d:::r;;;G;;;%",
   "#l.....u.#S:::SS:::SS:::SS:::t:S;;;;;;;%",
   "#l.......#S::::ZZ:::::::ZZ:::::S;;;;H;;%",
   "#.L......#S::::::C::::::::C::::S;F;;;Y;%",
   "#...q....#S:::::::::::g::::::::S;;;;;;;%",
   "#......L.#S:::SS:::SS:::SS:::::S%%%%%%%%",
   "#...g....#S:::SS:::SS:::SS:::::S########",
   "#.a..s.u.#S:::SS:::SS:::SS:::::S########",
   "#........#S:g:::::::::::::g::::S########",
   "##########S::C::::::::C::::::::S########",
   "##########S:h:::::::::::::::::FS########",
   "##########SSSSSSSSSSDSSSSSSSSSSS########",
   "##########&i..................i&,,,,,,,#",
   "##########&...........oo.......&,,C,,,,#",
   "##########&...g......ZZ........&,,,,,,,#",
   "##########&....L.........H.....&,,,,X,,#",
   "##########&....................y,,,,,,,#",
   "##########&.zk......g....L...t.&,,,,,V,#",
   "##########&....................&,,,,,,$#",
   "##########&&&&&&&&&&&&&&&&&&&&&&########"
  ],
  "hrows": [
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "............................444.........",
   "............................444.........",
   "............................444.........",
   "............................444.........",
   "............................444.........",
   "............................444.........",
   "............................444.........",
   "............................444.........",
   "............................444.........",
   ".............................33.........",
   ".............................22.........",
   ".............................11.........",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................"
  ],
  "spawnR": 0,
  "legend": {
   "#": {
    "wall": "concrete"
   },
   "%": {
    "wall": "tech"
   },
   "&": {
    "wall": "rust"
   },
   "S": {
    "wall": "server"
   },
   ".": {
    "floor": "concrete"
   },
   ",": {
    "floor": "tile",
    "ceil": "light_panel"
   },
   ":": {
    "floor": "grate",
    "ceil": "metal_panel"
   },
   ";": {
    "floor": "plate",
    "ceil": "grate"
   }
  },
  "props": {
   "sky": "void",
   "ambient": "#7f93b8",
   "ambientI": 0.5,
   "fogColor": "#05070c",
   "fog": 0.05,
   "wallH": 1.6,
   "floorTex": "concrete",
   "ceilTex": "ceiling",
   "track": "griphop",
   "script": "api.on('start', () => api.message('SERVER HALL G — the RED key is up on the catwalk'));\napi.on('pickup', t => { if (t === 'key_red') api.message('Red keycard acquired'); if (t === 'key_yellow') api.message('Yellow keycard — the archive is open'); });"
  }
 },
 {
  "name": "E1M3: Foundry Core",
  "rows": [
   "&&&&&&&&&&&&&&&&########################",
   "&~~~~~~~~~~~~~~&#########&&&&&&&&&&&&&&&",
   "&~f~~~~~~~~~~h~&.........&.............&",
   "&~~~~~L~~~~d~u~&....L..c.&.t.........t.&",
   "&~~~~~~~Z~~~~~~&..Z......&......V......&",
   "&~~@~~~~~~~~~~~D.....H...&.............&",
   "&~~~~~~~Z~~~~~~&..Z......&.............&",
   "&~~~~~~~~~~~~~~&AF.....p.&...P.....P...&",
   "&~~~~~~~~~L~d~~&.........&.............&",
   "&~~~~vv~~~~~~f~&#########&.............&",
   "&~~~~~~~~~~~~~~&#########&..F...T...F..&",
   "&&&&&&&D&&&&&&&&%%%%%%%%%%.............&",
   "%;;;;;;;;;;;;;;;;;;;;;;;;%.............&",
   "%;;;;;;;;;;;;;;;F;;;k;;t;%...P.....P...&",
   "%;;;;G;;;;;;;;;;;;g;;;;;;%.............&",
   "%;;;;;;;;;;;g;;;;;;;;;;;;%.m.........a.&",
   "%;;;;;F;;;;;L;;;;;;;;;;;;y.............&",
   "%;;;;;;;;;;;;;;;;;;;;;;;;%.............&",
   "%;;;;G;;;;;;;;;;;;;;g;;;;%.............&",
   "%;Y;;;;;;;;;oo;;;;;;;;Fs;%...P.....P...&",
   "%;;;;;;;;;;;;;;;;;;;;;;;;%..g...L...g..&",
   "%%%%%%%%%%%%D%%%%%%%%%%%%%.............&",
   "#,,,,lll,,,,,,,,,,,,,,,,,&.............&",
   "#,,,,,,ZZ,,,,,,,,,,,g,,,,&.............&",
   "#,,,,,,,,,,,,,,,,,g,,,z,,&.k.........k.&",
   "#,,,,,L,,,g,,,,,L,,,,,,,,&..L.......L..&",
   "#,,,,,,,,,,,,,,,,,,,,,,,,&.............&",
   "#,,m,,,,,,,,,,,,,,,,m,,,,&&&&&&&D&&&&&&&",
   "#$,,,,,,,,,,,,,,,,,,,,,,,##%,,C,,,,X,%##",
   "###########################%%%%%%%%%%%##"
  ],
  "hrows": [
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "............................5.......5...",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   ".........122222.........................",
   ".........122222.........................",
   ".........122222.................55......",
   ".........122222.........................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "...............................5..5.....",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................"
  ],
  "spawnR": 0,
  "legend": {
   "#": {
    "wall": "concrete_dark"
   },
   "%": {
    "wall": "rust"
   },
   "&": {
    "wall": "brick"
   },
   ".": {
    "floor": "concrete"
   },
   ",": {
    "floor": "tile",
    "ceil": "light_panel"
   },
   "~": {
    "floor": "asphalt",
    "ceil": "sky"
   },
   ";": {
    "floor": "plate",
    "ceil": "metal_panel"
   }
  },
  "props": {
   "sky": "dusk",
   "ambient": "#a08a80",
   "ambientI": 0.55,
   "fogColor": "#120a0a",
   "fog": 0.045,
   "wallH": 1.7,
   "floorTex": "concrete",
   "ceilTex": "concrete_dark",
   "track": "metalmania",
   "script": "api.on('start', () => api.message('FOUNDRY CORE — something huge is waiting in the core'));\napi.on('kill', t => { if (t === 'titan') { api.message('TITAN DOWN — get to the exit'); api.heal(25); } });"
  }
 }
];

/* =====================================================================
   RetroEngine — THE EDITOR
   Everything below runs only in the editor (it is NOT copied into
   exported games). It edits a "project": { name, levels: [...], models }.
   ===================================================================== */
(function () {
'use strict';
const RT = DFRuntime();                 // one shared copy of the engine (textures, defs, play())
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const icon = n => `<svg class="i"><use href="#i-${n}"/></svg>`;
const AUTOSAVE_KEY = 'retroengine.autosave.v1', SLOTS_KEY = 'retroengine.slots.v1', SEEN_KEY = 'retroengine.seenHelp.v1';

/* ---------- editor state ---------- */
const ED = {
  project: null, li: 0,                  // current project & level index
  tool: 'wall', brush: { wall: 'concrete', floor: 'tile', ceil: 'ceiling', fh: 0.3, door: 'door', rect: 'room', size: 1, thing: { t: 'enemy', s: 'grunt' }, light: { color: '#ffd9a0', radius: 6, intensity: 1.4, flicker: false } },
  view: { cs: 22, ox: 20, oy: 20 },     // cs = pixels per cell, ox/oy = screen offset of cell (0,0)
  layers: { walls: true, floors: true, ceil: false, heights: true, things: true, lightRadius: true, grid: true, reach: false },
  sel: new Set(), region: null, clipboard: null, stamp: null, hover: null,
  undo: [], redo: [], reach: null, tab: 'build', snap: true
};
const L = () => ED.project.levels[ED.li];
const idx = (x, y) => y * L().w + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < L().w && y < L().h;

/* ---------- toasts & modals ---------- */
function toast(msg, kind) {
  const root = $('#toast-root'), last = root.lastElementChild;
  if (last && last.textContent === msg) { clearTimeout(last._t); last._t = setTimeout(() => last.remove(), 2600); return; } // merge repeats
  while (root.children.length >= 3) root.firstElementChild.remove();                    // never more than 3 on screen
  const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = msg;
  root.appendChild(t); t._t = setTimeout(() => t.remove(), 2600);
}
// modal({ title, body (html), wide, buttons: [{ label, cls, value }] }) -> Promise(value)
function modal(o) {
  return new Promise(res => {
    const back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML = `<div class="modal ${o.wide ? 'wide' : ''}"><header>${esc(o.title)}<button class="tb sm x" data-v="__close">✕</button></header><div class="body">${o.body || ''}</div>${o.buttons ? `<footer>${o.buttons.map((b, i) => `<button class="tb ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</footer>` : ''}</div>`;
    document.body.appendChild(back);
    const close = v => { back.remove(); document.removeEventListener('keydown', onK, true); res(v); };
    const onK = e => { if (e.key === 'Escape') { e.stopPropagation(); close(null); } };
    document.addEventListener('keydown', onK, true);
    back.addEventListener('click', e => {
      if (e.target === back || e.target.closest('[data-v="__close"]')) return close(null);
      const b = e.target.closest('footer [data-i]'); if (b) { const bt = o.buttons[+b.dataset.i]; close(typeof bt.value === 'function' ? bt.value(back) : bt.value); }
    });
    if (o.onOpen) o.onOpen(back, close);
  });
}
const confirmBox = (title, msg, okLabel, danger) => modal({ title, body: `<p class="note" style="font-size:13px">${esc(msg)}</p>`, buttons: [{ label: 'Cancel', value: false }, { label: okLabel || 'OK', cls: danger ? 'danger' : 'primary', value: true }] });
function promptBox(title, label, value) {
  return modal({ title, body: `<div class="row"><label>${esc(label)}</label><input type="text" class="inp" id="pr-in" value="${esc(value || '')}"></div>`,
    buttons: [{ label: 'Cancel', value: null }, { label: 'OK', cls: 'primary', value: b => $('#pr-in', b).value }],
    onOpen: (b, close) => { const i = $('#pr-in', b); i.focus(); i.select(); i.addEventListener('keydown', e => { if (e.key === 'Enter') close(i.value); }); } });
}

/* ---------- project creation & storage ---------- */
function starterProject() {
  return { format: 'retroengine-project', version: 2, name: 'Operation Forge', levels: DF_STARTER_LEVELS.map(d => levelFromAscii(d, RT)), models: {}, customTemplates: [] };
}
function starterLevelSlug(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
}
function listStarterLevels() {
  return DF_STARTER_LEVELS.map((d, i) => ({ id: 'starter-' + starterLevelSlug(d.name), name: d.name, index: i }));
}
function loadStarterLevel(idOrName) {
  const id = String(idOrName || '');
  const list = listStarterLevels();
  const hit = list.find(s => s.id === id || s.name === id || s.id === 'starter-' + starterLevelSlug(id));
  if (!hit) throw new Error('unknown starter level');
  return RT.normalizeLevel(levelFromAscii(DF_STARTER_LEVELS[hit.index], RT));
}
function blankLevel(name, w, h) {
  const lv = RT.newLevel(name, w || 40, h || 32);
  for (let x = 0; x < lv.w; x++) { lv.wall[x] = 'concrete'; lv.wall[(lv.h - 1) * lv.w + x] = 'concrete'; }
  for (let y = 0; y < lv.h; y++) { lv.wall[y * lv.w] = 'concrete'; lv.wall[y * lv.w + lv.w - 1] = 'concrete'; }
  lv.spawn = { x: 3.5, y: 3.5, r: 0 };
  return lv;
}
function normalizeProject(p) {
  if (p && p.project && /-project-file$/.test(p.format || '')) p = p.project;
  if (p && p.mapData && Array.isArray(p.mapData)) p = convertV1(p);          // old DOOMFORGE save
  if (!p || !Array.isArray(p.levels) || !p.levels.length) throw new Error('Not a RetroEngine (or DOOMFORGE) project');
  return { format: 'retroengine-project', version: 2, name: String(p.name || 'Untitled'), levels: p.levels.map(RT.normalizeLevel), models: Object.assign({}, p.models || {}), customTemplates: Array.isArray(p.customTemplates) ? p.customTemplates : [] };
}
// Converts the original DOOMFORGE (v1) JSON — mapData/lightsData/entitiesData — into the new format.
function convertV1(o) {
  const n = o.mapData.length, w = o.mapData[0].length, lv = RT.newLevel('Imported level', w, n);
  const texMap = { brick: 'brick', tech: 'tech', stone: 'concrete', wood: 'wood', hazard: 'hazard', door: 'door', gothic: 'concrete_dark', hellstone: 'rust' };
  o.mapData.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return; const i = y * w + x;
    if (c.type === 'door') { lv.wall[i] = 'door'; lv.kind[i] = 'door'; }
    else if (c.type === 'locked_door') { lv.wall[i] = 'door'; lv.kind[i] = 'yellow'; }
    else if (c.type === 'exit') { lv.ents.push({ id: uid(), t: 'exit', x: x + 0.5, y: y + 0.5 }); }
    else lv.wall[i] = texMap[c.texture] || 'concrete';
  }));
  const subMap = { imp: 'grunt', drone: 'drone', boss: 'titan' };
  (o.entitiesData || []).forEach(e => {
    if (e.kind === 'enemy') lv.ents.push({ id: uid(), t: 'enemy', s: subMap[e.sub] || 'grunt', x: e.x + 0.5, y: e.y + 0.5, r: 0 });
    else if (e.kind === 'pickup') lv.ents.push({ id: uid(), t: 'pickup', s: e.sub === 'ammo' ? 'ammo_bullets' : e.sub === 'key' ? 'key_yellow' : e.sub === 'gem' ? 'chip' : 'health', x: e.x + 0.5, y: e.y + 0.5 });
    else lv.ents.push({ id: uid(), t: 'prop', s: ({ table: 'desk', lamp: 'lamp', barrel: 'barrel', pillar: 'pillar' })[e.sub] || 'crate', x: e.x + 0.5, y: e.y + 0.5, r: 0 });
  });
  (o.lightsData || []).forEach(l => lv.ents.push({ id: uid(), t: 'light', x: l.x, y: l.y, color: l.color, radius: l.radius, intensity: l.intensity, flicker: !!l.flicker }));
  if (o.playerSpawn) lv.spawn = { x: o.playerSpawn.x + 0.5, y: o.playerSpawn.y + 0.5, r: o.playerSpawn.dir || 0 };
  if (o.worldSettings) { lv.props.ambientI = clamp((o.worldSettings.ambient || 0.4) * 1.3, 0.1, 1.5); lv.props.fog = o.worldSettings.fogDensity || 0.04; }
  return { name: 'Imported DOOMFORGE map', levels: [lv] };
}
let saveTimer = 0;
function markDirty() { clearTimeout(saveTimer); saveTimer = setTimeout(autosave, 600); $('#st-save').textContent = 'Saving…'; }
function autosave() {
  try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(ED.project)); $('#st-save').textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch (e) { $('#st-save').textContent = 'Not saved (storage full)'; toast('Browser storage is full — use Menu → Export JSON to keep your work', 'bad'); }
}
function loadSlots() { try { return JSON.parse(localStorage.getItem(SLOTS_KEY) || '{}'); } catch (e) { return {}; } }
function saveSlots(s) { localStorage.setItem(SLOTS_KEY, JSON.stringify(s)); }

/* ---------- undo / redo (whole-level snapshots, cheap enough for grid maps) ---------- */
function snapshot() { return JSON.stringify(L()); }
function pushUndo() { ED.undo.push({ li: ED.li, s: snapshot() }); if (ED.undo.length > 80) ED.undo.shift(); ED.redo.length = 0; updateUndoBtns(); }
function applySnap(stackFrom, stackTo) {
  const it = stackFrom.pop(); if (!it) return;
  if (it.li !== ED.li && ED.project.levels[it.li]) ED.li = it.li;
  stackTo.push({ li: ED.li, s: snapshot() });
  ED.project.levels[ED.li] = RT.normalizeLevel(JSON.parse(it.s));
  ED.sel.clear(); afterChange(true);
}
function undo() { if (!ED.undo.length) return toast('Nothing to undo'); applySnap(ED.undo, ED.redo); }
function redo() { if (!ED.redo.length) return toast('Nothing to redo'); applySnap(ED.redo, ED.undo); }
function updateUndoBtns() { $('[data-cmd="undo"]').disabled = !ED.undo.length; $('[data-cmd="redo"]').disabled = !ED.redo.length; }
// Call after any edit: redraw, refresh panel bits, autosave.
function afterChange(full) { ED.reach = null; requestDraw(); markDirty(); updateStatus(); if (full) { refreshLevelSelect(); renderPanel(); } else if (ED.tab === 'things') renderInspector(); updateUndoBtns(); }

/* =====================================================================
   2D MAP DRAWING (canvas). Screen = cell * cs + offset.
   ===================================================================== */
const cvs = $('#grid'), ctx = cvs.getContext('2d');
const THING_STYLE = {
  enemy: { grunt: ['#ff4b3a', 'G'], drone: ['#ff7a3a', 'D'], heavy: ['#d8263a', 'H'], turret: ['#ff9a3a', 'T'], titan: ['#ff2050', 'B'] },
  pickup: { health: ['#ff6b6b', '+'], medkit: ['#ff3b3b', '+'], armor: ['#37c25a', 'A'], armor_heavy: ['#2d7bff', 'A'], ammo_bullets: ['#d6b23a', 'b'], ammo_shells: ['#d8823a', 's'], ammo_cells: ['#3ad6ff', 'c'], ammo_rockets: ['#b0b0b0', 'r'],
    key_red: ['#ff2d2d', 'K'], key_blue: ['#2d8bff', 'K'], key_yellow: ['#ffd21f', 'K'], w_shotgun: ['#ffc21a', '3'], w_rifle: ['#ffc21a', '4'], w_plasma: ['#9dff4f', '5'], w_rocket: ['#ffc21a', '6'], chip: ['#2de2ff', '$'] },
  prop: { _: ['#8b95a8', ''] }, light: { _: ['#ffd9a0', ''] }, exit: { _: ['#2dffb0', 'X'] }
};
function thingStyle(e) { const g = THING_STYLE[e.t] || {}; return g[e.s] || g._ || ['#fff', '?']; }
let drawQueued = false;
function requestDraw() { if (!drawQueued) { drawQueued = true; requestAnimationFrame(draw); } }
function resizeCanvas() {
  const r = $('#stage').getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  ED.vw = r.width; ED.vh = r.height; cvs.width = Math.max(1, r.width * dpr); cvs.height = Math.max(1, r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); requestDraw();
}
const toCell = (sx, sy) => ({ fx: (sx - ED.view.ox) / ED.view.cs, fy: (sy - ED.view.oy) / ED.view.cs });

function draw() {
  drawQueued = false;
  const lv = L(), W = lv.w, H = lv.h, cs = ED.view.cs, ox = ED.view.ox, oy = ED.view.oy;
  const vw = ED.vw || 800, vh = ED.vh || 600;
  ctx.fillStyle = '#05070b'; ctx.fillRect(0, 0, vw, vh);
  const x0 = clamp(Math.floor(-ox / cs), 0, W), x1 = clamp(Math.ceil((vw - ox) / cs), 0, W), y0 = clamp(Math.floor(-oy / cs), 0, H), y1 = clamp(Math.ceil((vh - oy) / cs), 0, H);
  ctx.imageSmoothingEnabled = cs < 24;
  const showCeil = ED.layers.ceil || ED.tool === 'ceil';
  // board shadow
  ctx.fillStyle = '#0b0e15'; ctx.fillRect(ox - 4, oy - 4, W * cs + 8, H * cs + 8);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * W + x, px = ox + x * cs, py = oy + y * cs, wall = lv.wall[i], kind = lv.kind[i];
    if (wall && !kind) {
      if (ED.layers.walls) { ctx.drawImage(RT.getThumb(wall, 32), px, py, cs, cs); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(px, py, cs, Math.max(1, cs * 0.12)); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, cs - 1, cs - 1); }
      else { ctx.fillStyle = '#2a3140'; ctx.fillRect(px, py, cs, cs); }
      continue;
    }
    if (ED.layers.floors) {
      const t = showCeil ? (lv.ceil[i] || lv.props.ceilTex) : (lv.floor[i] || lv.props.floorTex);
      ctx.drawImage(RT.getThumb(t, 32), px, py, cs, cs);
      ctx.fillStyle = showCeil ? 'rgba(10,14,30,.35)' : 'rgba(5,7,11,.5)'; ctx.fillRect(px, py, cs, cs);
    } else { ctx.fillStyle = '#10141c'; ctx.fillRect(px, py, cs, cs); }
    if (!showCeil && (lv.ceil[i] || lv.props.ceilTex) === 'sky') { ctx.fillStyle = 'rgba(60,110,200,.16)'; ctx.fillRect(px, py, cs, cs); }
    const fh = lv.fh[i];
    if (fh > 0 && ED.layers.heights) {
      ctx.fillStyle = fh > RT.STEP_H * 2 ? `rgba(255,140,60,${0.12 + fh * 0.3})` : `rgba(140,200,255,${0.1 + fh * 0.45})`; ctx.fillRect(px, py, cs, cs);
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.strokeRect(px + 1.5, py + 1.5, cs - 3, cs - 3);
      if (cs >= 20) { ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.floor(cs * 0.34)}px Chakra Petch, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(fh.toFixed(2).replace(/0$/, ''), px + cs / 2, py + cs / 2); }
    }
    if (kind) {
      ctx.drawImage(RT.getThumb(kind === 'door' ? 'door' : 'door_' + kind, 32), px, py, cs, cs);
      ctx.fillStyle = kind === 'door' ? '#ffb020' : RT.KEY_COLORS[kind]; const vert = (lv.wall[i - 1] && !lv.kind[i - 1]) || (lv.wall[i + 1] && !lv.kind[i + 1]);
      if (vert) ctx.fillRect(px, py + cs * 0.42, cs, cs * 0.16); else ctx.fillRect(px + cs * 0.42, py, cs * 0.16, cs);
    }
  }
  // reachability overlay (from Validate)
  if (ED.layers.reach) {
    if (!ED.reach) ED.reach = RT.validateLevel(lv).reachable;
    ctx.fillStyle = 'rgba(45,255,176,.13)';
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (ED.reach[y * W + x]) ctx.fillRect(ox + x * cs, oy + y * cs, cs, cs);
  }
  // grid lines
  if (ED.layers.grid && cs >= 9) {
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = x0; x <= x1; x++) { ctx.moveTo(ox + x * cs + 0.5, oy + y0 * cs); ctx.lineTo(ox + x * cs + 0.5, oy + y1 * cs); }
    for (let y = y0; y <= y1; y++) { ctx.moveTo(ox + x0 * cs, oy + y * cs + 0.5); ctx.lineTo(ox + x1 * cs, oy + y * cs + 0.5); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath();
    for (let x = Math.ceil(x0 / 8) * 8; x <= x1; x += 8) { ctx.moveTo(ox + x * cs + 0.5, oy + y0 * cs); ctx.lineTo(ox + x * cs + 0.5, oy + y1 * cs); }
    for (let y = Math.ceil(y0 / 8) * 8; y <= y1; y += 8) { ctx.moveTo(ox + x0 * cs, oy + y * cs + 0.5); ctx.lineTo(ox + x1 * cs, oy + y * cs + 0.5); }
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,122,26,.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(ox, oy, W * cs, H * cs);
  // things
  if (ED.layers.things) lv.ents.forEach(e => drawThing(e, ox + e.x * cs, oy + e.y * cs, cs, ED.sel.has(e.id), 1));
  // player start arrow
  drawSpawn(ox + lv.spawn.x * cs, oy + lv.spawn.y * cs, cs, lv.spawn.r, 1);
  // selection region
  if (ED.region) { const r = normRect(ED.region); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#2de2ff'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(45,226,255,.08)'; ctx.fillRect(ox + r.x1 * cs, oy + r.y1 * cs, (r.x2 - r.x1 + 1) * cs, (r.y2 - r.y1 + 1) * cs); ctx.strokeRect(ox + r.x1 * cs, oy + r.y1 * cs, (r.x2 - r.x1 + 1) * cs, (r.y2 - r.y1 + 1) * cs); ctx.setLineDash([]); }
  // rectangle tool preview
  if (drag && drag.rect) { const r = normRect(drag.rect); ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(255,122,26,.12)'; ctx.fillRect(ox + r.x1 * cs, oy + r.y1 * cs, (r.x2 - r.x1 + 1) * cs, (r.y2 - r.y1 + 1) * cs); ctx.strokeRect(ox + r.x1 * cs, oy + r.y1 * cs, (r.x2 - r.x1 + 1) * cs, (r.y2 - r.y1 + 1) * cs); label(`${r.x2 - r.x1 + 1} × ${r.y2 - r.y1 + 1}`, ox + (r.x2 + 1) * cs + 4, oy + r.y1 * cs); }
  // stamp ghost
  if (ED.stamp && ED.hover) drawStampGhost();
  // hover cell
  if (ED.hover && !ED.stamp && inb(ED.hover.x, ED.hover.y)) {
    const s = ['wall', 'floor', 'ceil', 'height', 'erase'].includes(ED.tool) ? ED.brush.size : 1, o = Math.floor((s - 1) / 2);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5; ctx.strokeRect(ox + (ED.hover.x - o) * cs + 1, oy + (ED.hover.y - o) * cs + 1, s * cs - 2, s * cs - 2);
  }
}
function label(t, x, y) { ctx.font = '700 12px Chakra Petch, sans-serif'; const w = ctx.measureText(t).width + 10; ctx.fillStyle = 'rgba(10,13,20,.85)'; ctx.fillRect(x, y, w, 20); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, x + 5, y + 10); }
function drawThing(e, sx, sy, cs, selected, alpha) {
  const [col, ch] = thingStyle(e); ctx.globalAlpha = alpha;
  if (e.t === 'light') {
    if (ED.layers.lightRadius) { const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, (e.radius || 6) * cs * 0.5); g.addColorStop(0, hexA(e.color || '#ffd9a0', 0.28)); g.addColorStop(1, hexA(e.color || '#ffd9a0', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, (e.radius || 6) * cs * 0.5, 0, 7); ctx.fill(); }
    ctx.fillStyle = e.color || '#ffd9a0'; ctx.beginPath(); ctx.arc(sx, sy, Math.max(3, cs * 0.18), 0, 7); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
    if (e.flicker && cs > 14) { ctx.fillStyle = '#000'; ctx.font = `700 ${cs * 0.22}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('~', sx, sy); }
  } else if (e.t === 'prop') {
    const r = Math.max(4, cs * 0.3); ctx.fillStyle = '#5b6578'; ctx.strokeStyle = '#c3cad6'; ctx.lineWidth = 1.5; ctx.fillRect(sx - r, sy - r, r * 2, r * 2); ctx.strokeRect(sx - r, sy - r, r * 2, r * 2);
    if (cs >= 18) { ctx.fillStyle = '#fff'; ctx.font = `700 ${cs * 0.26}px Chakra Petch, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((RT.PROP_DEFS[e.s] || { name: '?' }).name.slice(0, 2).toUpperCase(), sx, sy + 1); }
  } else if (e.t === 'exit') {
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, cs * 0.1); ctx.beginPath(); ctx.arc(sx, sy, cs * 0.36, 0, 7); ctx.stroke();
    ctx.fillStyle = col; ctx.font = `700 ${Math.max(9, cs * 0.34)}px Chakra Petch, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('EXIT', sx, sy + 1);
  } else {
    const r = Math.max(4, cs * (e.t === 'enemy' ? (e.s === 'titan' ? 0.45 : 0.34) : 0.26));
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (e.t === 'enemy') { const a = e.r || 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * r * 1.5, sy + Math.sin(a) * r * 1.5); ctx.stroke(); }
    if (cs >= 14) { ctx.fillStyle = '#0a0a0a'; ctx.font = `700 ${r * 1.1}px Chakra Petch, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, sx, sy + 1); }
  }
  if (selected) { ctx.strokeStyle = '#2de2ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(sx, sy, cs * 0.5, 0, 7); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function drawSpawn(sx, sy, cs, a, alpha) {
  ctx.globalAlpha = alpha; ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
  const r = Math.max(6, cs * 0.42); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.7, -r * 0.65); ctx.lineTo(-r * 0.35, 0); ctx.lineTo(-r * 0.7, r * 0.65); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
}
function hexA(hex, a) { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
function normRect(r) { return { x1: Math.min(r.x1, r.x2), y1: Math.min(r.y1, r.y2), x2: Math.max(r.x1, r.x2), y2: Math.max(r.y1, r.y2) }; }
function drawStampGhost() {
  const st = ED.stamp, p = st.data, cs = ED.view.cs, ox = ED.view.ox, oy = ED.view.oy, bx = ED.hover.x, by = ED.hover.y;
  const fits = bx >= 0 && by >= 0 && bx + p.w <= L().w && by + p.h <= L().h;
  ctx.globalAlpha = 0.75;
  p.cells.forEach(c => {
    const px = ox + (bx + c.x) * cs, py = oy + (by + c.y) * cs;
    if (c.kind) ctx.drawImage(RT.getThumb(c.kind === 'door' ? 'door' : 'door_' + c.kind, 32), px, py, cs, cs);
    else if (c.wall) ctx.drawImage(RT.getThumb(c.wall, 32), px, py, cs, cs);
    else { ctx.drawImage(RT.getThumb(c.floor || L().props.floorTex, 32), px, py, cs, cs); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(px, py, cs, cs); if (c.fh) { ctx.fillStyle = `rgba(140,200,255,${0.15 + c.fh * 0.4})`; ctx.fillRect(px, py, cs, cs); } }
  });
  ctx.globalAlpha = 1;
  p.ents.forEach(e => drawThing(e, ox + (bx + e.x) * cs, oy + (by + e.y) * cs, cs, false, 0.85));
  if (p.spawn) drawSpawn(ox + (bx + p.spawn.x) * cs, oy + (by + p.spawn.y) * cs, cs, 0, 0.85);
  ctx.strokeStyle = fits ? '#2dffb0' : '#ff4d4d'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(ox + bx * cs, oy + by * cs, p.w * cs, p.h * cs); ctx.setLineDash([]);
  label(`${st.name} ${p.w}×${p.h}${fits ? '' : ' — doesn\'t fit'}`, ox + bx * cs, oy + by * cs - 24);
}

/* =====================================================================
   TOOLS & INPUT — mouse, touch (1 finger = tool, 2 fingers = pan/zoom)
   ===================================================================== */
const TOOLS = [
  ['select', 'Select', 'select', 'V', 'Tap a thing to select it, drag to move. Drag on empty space to select an area (copy, cut, save as template).'],
  ['pan', 'Pan', 'pan', 'H', 'Drag to move the map. Pinch or mouse-wheel to zoom.'], '-',
  ['wall', 'Wall', 'wall', 'B', 'Paint solid walls with the chosen texture.'],
  ['floor', 'Floor', 'floor', 'F', 'Paint floor texture (also carves through walls).'],
  ['ceil', 'Ceiling', 'ceil', 'C', 'Paint ceiling texture. Pick "Sky" for open air.'],
  ['height', 'Height', 'height', 'U', 'Raise floors: 0.15 steps = stairs, 0.6 = catwalk, 0.75 = cover block (can\'t climb).'],
  ['rect', 'Rect', 'rect', 'R', 'Drag a rectangle: room, solid block, carve floor or outline.'],
  ['fill', 'Fill', 'fill', 'G', 'Flood-fill a connected area that has the same texture.'],
  ['erase', 'Erase', 'erase', 'E', 'Erase things first, then walls, then floor details.'], '-',
  ['door', 'Door', 'door', 'D', 'Place doors. Keycard doors need the matching key.'],
  ['thing', 'Thing', 'thing', 'T', 'Place the chosen enemy, pickup, prop, light or exit (Things tab).'],
  ['spawn', 'Start', 'spawn', 'S', 'Set where the player starts. Tap it again to turn 90°.'],
  ['pick', 'Picker', 'pick', 'I', 'Tap a cell to copy its textures into your brushes.'], '-',
  ['rooms', 'Rooms', 'stamp', '', 'Open the building & room template library.']
];
function buildToolbar() {
  $('#toolbar').innerHTML = TOOLS.map(t => t === '-' ? '<div class="sep"></div>' : `<button class="tool" data-tool="${t[0]}" title="${esc(t[1])}${t[3] ? ' (' + t[3] + ')' : ''} — ${esc(t[4])}">${icon(t[2])}<span>${t[1]}</span></button>`).join('');
  $('#toolbar').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (!b) return; if (b.dataset.tool === 'rooms') { openTab('templates', true); return; } setTool(b.dataset.tool); });
}
function setTool(t, keepStamp) {
  if (!keepStamp) cancelStamp();
  ED.tool = t;
  $$('.tool').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  $('#stage').classList.toggle('pan', t === 'pan');
  const def = TOOLS.find(x => x[0] === t); $('#hint').textContent = def ? def[4] : '';
  if (['wall', 'floor', 'ceil', 'height', 'rect', 'fill', 'door'].includes(t) && ED.tab !== 'build' && innerWidth > 720) openTab('build');
  if (t === 'thing' && ED.tab !== 'things' && innerWidth > 720) openTab('things');
  updateStatus(); requestDraw();
  if (ED.tab === 'build') renderPanel();
}

/* ---------- view: zoom & pan ---------- */
function setZoom(cs, ax, ay) {
  cs = clamp(cs, 4, 90);
  if (ax === undefined) { ax = (ED.vw || 600) / 2; ay = (ED.vh || 400) / 2; }
  const k = cs / ED.view.cs; ED.view.ox = ax - (ax - ED.view.ox) * k; ED.view.oy = ay - (ay - ED.view.oy) * k; ED.view.cs = cs;
  $('#zoom-lbl').textContent = Math.round(cs / 22 * 100) + '%'; requestDraw();
}
function fitView() {
  const lv = L(), vw = ED.vw || 600, vh = ED.vh || 400, cs = clamp(Math.floor(Math.min((vw - 30) / lv.w, (vh - 30) / lv.h)), 4, 40);
  ED.view.cs = cs; ED.view.ox = (vw - lv.w * cs) / 2; ED.view.oy = (vh - lv.h * cs) / 2; setZoom(cs);
}

/* ---------- editing operations ---------- */
const thingsAt = (x, y) => L().ents.filter(e => Math.floor(e.x) === x && Math.floor(e.y) === y);
function removeThingsAt(x, y, keepLights) { const lv = L(); lv.ents = lv.ents.filter(e => !(Math.floor(e.x) === x && Math.floor(e.y) === y) || (keepLights && e.t === 'light')); }
const isSpawnCell = (x, y) => Math.floor(L().spawn.x) === x && Math.floor(L().spawn.y) === y;
function setWall(x, y, tex) { if (!inb(x, y) || isSpawnCell(x, y)) return false; const i = idx(x, y), lv = L(); lv.wall[i] = tex; lv.kind[i] = ''; lv.fh[i] = 0; removeThingsAt(x, y); return true; }
function carve(x, y, floorTex) { if (!inb(x, y)) return; const i = idx(x, y), lv = L(); lv.wall[i] = ''; lv.kind[i] = ''; if (floorTex !== undefined) lv.floor[i] = floorTex; }
function paintCell(x, y) {
  const s = ED.brush.size, o = Math.floor((s - 1) / 2), lv = L();
  for (let yy = y - o; yy < y - o + s; yy++) for (let xx = x - o; xx < x - o + s; xx++) {
    if (!inb(xx, yy)) continue; const i = idx(xx, yy);
    switch (ED.tool) {
      case 'wall': setWall(xx, yy, ED.brush.wall); break;
      case 'floor': carve(xx, yy, ED.brush.floor === lv.props.floorTex ? '' : ED.brush.floor); break;
      case 'ceil': if (!lv.wall[i] || lv.kind[i]) lv.ceil[i] = ED.brush.ceil === lv.props.ceilTex ? '' : ED.brush.ceil; break;
      case 'height': if (!lv.wall[i]) lv.fh[i] = ED.brush.fh; break;
      case 'erase':
        if (thingsAt(xx, yy).length) removeThingsAt(xx, yy);
        else if (lv.wall[i]) { lv.wall[i] = ''; lv.kind[i] = ''; }
        else { lv.fh[i] = 0; lv.floor[i] = ''; lv.ceil[i] = ''; }
        break;
    }
  }
}
function applyRect(r) {
  r = normRect(r); const mode = ED.brush.rect; let hitSpawn = false;
  for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) {
    if (!inb(x, y)) continue;
    const border = x === r.x1 || x === r.x2 || y === r.y1 || y === r.y2, i = idx(x, y);
    if (mode === 'solid' || ((mode === 'room' || mode === 'outline') && border)) { if (L().kind[i] && mode !== 'solid') continue; if (!setWall(x, y, ED.brush.wall)) hitSpawn = true; }
    else if (mode === 'room' || mode === 'floor') carve(x, y, ED.brush.floor === L().props.floorTex ? '' : ED.brush.floor);
  }
  if (hitSpawn) toast('Skipped the player start cell');
}
function floodFill(x, y) {
  const lv = L(), W = lv.w, start = idx(x, y), isWall = lv.wall[start] && !lv.kind[start];
  const showCeil = ED.layers.ceil;
  const key = i => isWall ? (lv.wall[i] && !lv.kind[i] ? lv.wall[i] : null) : (lv.wall[i] && !lv.kind[i] ? null : (showCeil ? (lv.ceil[i] || '') : (lv.floor[i] || '')));
  const target = key(start), newVal = isWall ? ED.brush.wall : showCeil ? (ED.brush.ceil === lv.props.ceilTex ? '' : ED.brush.ceil) : (ED.brush.floor === lv.props.floorTex ? '' : ED.brush.floor);
  if (target === newVal) return 0;
  const seen = new Uint8Array(W * lv.h), q = [start]; seen[start] = 1; let n = 0;
  while (q.length && n < 20000) {
    const c = q.pop(); n++;
    if (isWall) lv.wall[c] = newVal; else if (showCeil) lv.ceil[c] = newVal; else lv.floor[c] = newVal;
    const cx = c % W, cy = (c / W) | 0;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => { const nx = cx + d[0], ny = cy + d[1]; if (!inb(nx, ny)) return; const ni = ny * W + nx; if (!seen[ni] && key(ni) === target) { seen[ni] = 1; q.push(ni); } });
  }
  return n;
}
function placeThing(fx, fy) {
  const x = Math.floor(fx), y = Math.floor(fy), lv = L();
  if (!inb(x, y)) return;
  if (lv.wall[idx(x, y)]) { toast('Things go on open floor, not inside walls or doors'); return; }
  const px = ED.snap ? x + 0.5 : Math.round(fx * 4) / 4, py = ED.snap ? y + 0.5 : Math.round(fy * 4) / 4;
  const b = ED.brush.thing, e = { id: uid(), t: b.t, x: px, y: py };
  if (b.t !== 'light' && b.t !== 'exit') e.s = b.s;
  if (b.t === 'enemy') e.r = Math.atan2(lv.spawn.y - py, lv.spawn.x - px);
  if (b.t === 'prop') e.r = 0;
  if (b.t === 'light') Object.assign(e, ED.brush.light);
  if (b.t === 'pickup' || b.t === 'exit') lv.ents = lv.ents.filter(o => !(o.t === b.t && Math.floor(o.x) === x && Math.floor(o.y) === y));
  lv.ents.push(e); ED.sel.clear(); ED.sel.add(e.id);
}
function setSpawn(x, y) {
  const lv = L(); if (!inb(x, y)) return;
  if (lv.wall[idx(x, y)]) { toast('The start must be on open floor'); return; }
  if (isSpawnCell(x, y)) lv.spawn.r = ((lv.spawn.r || 0) + Math.PI / 2) % (Math.PI * 2);
  else { lv.spawn.x = x + 0.5; lv.spawn.y = y + 0.5; }
}
function pickAt(x, y) {
  if (!inb(x, y)) return; const lv = L(), i = idx(x, y);
  if (lv.wall[i] && !lv.kind[i]) { ED.brush.wall = lv.wall[i]; setTool('wall'); toast('Wall brush: ' + RT.TEX_DEFS[lv.wall[i]].name); }
  else { ED.brush.floor = lv.floor[i] || lv.props.floorTex; ED.brush.ceil = lv.ceil[i] || lv.props.ceilTex; ED.brush.fh = lv.fh[i] || ED.brush.fh; setTool('floor'); toast('Floor: ' + (RT.TEX_DEFS[ED.brush.floor] || { name: ED.brush.floor }).name + ' · Ceiling: ' + (ED.brush.ceil === 'sky' ? 'Sky' : (RT.TEX_DEFS[ED.brush.ceil] || {}).name)); }
}
function hitThing(fx, fy) {
  const lv = L(), rad = Math.max(0.45, 12 / ED.view.cs); let best = null, bd = rad;
  lv.ents.forEach(e => { const d = Math.hypot(e.x - fx, e.y - fy); if (d < bd) { bd = d; best = e; } });
  if (!best && Math.hypot(lv.spawn.x - fx, lv.spawn.y - fy) < rad) return 'spawn';
  return best;
}

/* ---------- region: copy / cut / templates ---------- */
function regionData(r) {
  r = normRect(r); const lv = L(), cells = [], ents = [];
  for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) { if (!inb(x, y)) continue; const i = idx(x, y); cells.push({ x: x - r.x1, y: y - r.y1, wall: lv.wall[i], kind: lv.kind[i], floor: lv.floor[i], ceil: lv.ceil[i], fh: lv.fh[i] }); }
  lv.ents.forEach(e => { if (e.x >= r.x1 && e.x < r.x2 + 1 && e.y >= r.y1 && e.y < r.y2 + 1) { const c = JSON.parse(JSON.stringify(e)); delete c.id; c.x -= r.x1; c.y -= r.y1; ents.push(c); } });
  const sp = lv.spawn.x >= r.x1 && lv.spawn.x < r.x2 + 1 && lv.spawn.y >= r.y1 && lv.spawn.y < r.y2 + 1 ? { x: lv.spawn.x - r.x1, y: lv.spawn.y - r.y1 } : null;
  return { w: r.x2 - r.x1 + 1, h: r.y2 - r.y1 + 1, cells, ents, spawn: sp };
}
function clearRegion(r, thingsOnly) {
  r = normRect(r); const lv = L();
  lv.ents = lv.ents.filter(e => !(e.x >= r.x1 && e.x < r.x2 + 1 && e.y >= r.y1 && e.y < r.y2 + 1));
  if (thingsOnly) return;
  for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) if (inb(x, y)) { const i = idx(x, y); lv.wall[i] = ''; lv.kind[i] = ''; lv.floor[i] = ''; lv.ceil[i] = ''; lv.fh[i] = 0; }
}
function rotateData(d) {
  // 90° clockwise: cell (x,y) -> (h-1-y, x); points (x,y) -> (h-y, x)
  return { w: d.h, h: d.w, cells: d.cells.map(c => Object.assign({}, c, { x: d.h - 1 - c.y, y: c.x })), ents: d.ents.map(e => Object.assign({}, e, { x: d.h - e.y, y: e.x, r: e.r !== undefined ? e.r + Math.PI / 2 : e.r })), spawn: d.spawn ? { x: d.h - d.spawn.y, y: d.spawn.x } : null };
}
function startStamp(name, data) {
  ED.stamp = { name, data: JSON.parse(JSON.stringify(data)) }; ED.region = null; ED.sel.clear();
  if (!ED.hover) { const c = toCell((ED.vw || 600) / 2, (ED.vh || 400) / 2); ED.hover = { x: Math.floor(c.fx - data.w / 2), y: Math.floor(c.fy - data.h / 2) }; }
  const bar = $('#stamp-bar'); bar.classList.remove('hidden');
  bar.innerHTML = `<b style="padding:0 6px">${esc(name)}</b><button class="tb sm" data-s="rot">⟳ Rotate (R)</button><button class="tb sm primary" data-s="place">Place here</button><button class="tb sm" data-s="cancel">Done (Esc)</button>`;
  $('#hint').textContent = 'Move over the map and tap/click to stamp. Stamp as many times as you like.';
  if (innerWidth <= 720) document.body.classList.remove('sheet');
  updateSelBar(); requestDraw();
}
function cancelStamp() { if (!ED.stamp) return; ED.stamp = null; $('#stamp-bar').classList.add('hidden'); requestDraw(); }
function rotateStamp() { if (ED.stamp) { ED.stamp.data = rotateData(ED.stamp.data); requestDraw(); } }
function placeStamp(bx, by) {
  ED.stats.stamps++;
  const d = ED.stamp.data, lv = L();
  if (bx < 0 || by < 0 || bx + d.w > lv.w || by + d.h > lv.h) { toast('Template doesn\'t fit there — move it inside the map', 'bad'); return; }
  pushUndo();
  d.cells.forEach(c => {
    const x = bx + c.x, y = by + c.y, i = idx(x, y);
    if (c.wall && !c.kind) { if (isSpawnCell(x, y) && !d.spawn) return; lv.wall[i] = c.wall; lv.kind[i] = ''; lv.fh[i] = 0; removeThingsAt(x, y); }
    else if (c.kind) { lv.wall[i] = c.wall || 'door'; lv.kind[i] = c.kind; removeThingsAt(x, y); }
    else { lv.wall[i] = ''; lv.kind[i] = ''; if (c.floor !== undefined) { lv.floor[i] = c.floor || ''; lv.ceil[i] = c.ceil || ''; lv.fh[i] = c.fh || 0; } }
  });
  const cx = bx + d.w / 2, cy = by + d.h / 2;
  d.ents.forEach(e => { const n = Object.assign({}, e, { id: uid(), x: bx + e.x, y: by + e.y }); if (n.t === 'enemy') n.r = Math.atan2(cy - n.y, cx - n.x) + (Math.random() - 0.5) * 0.6; lv.ents.push(n); });
  if (d.spawn) { lv.spawn.x = bx + d.spawn.x; lv.spawn.y = by + d.spawn.y; }
  afterChange(); toast('Stamped ' + ED.stamp.name, 'ok');
}
function updateSelBar() {
  const bar = $('#sel-bar'), r = ED.region, n = ED.sel.size;
  if (ED.stamp || (!r && !n)) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  if (r) { const q = normRect(r); bar.innerHTML = `<b style="padding:0 6px">${q.x2 - q.x1 + 1}×${q.y2 - q.y1 + 1}</b><button class="tb sm" data-r="copy">Copy</button><button class="tb sm" data-r="cut">Cut</button><button class="tb sm" data-r="walls">Walls</button><button class="tb sm" data-r="carve">Floor</button><button class="tb sm" data-r="clearThings">Del things</button><button class="tb sm" data-r="tpl">Save template</button><button class="tb sm" data-r="none">✕</button>`; }
  else bar.innerHTML = `<b style="padding:0 6px">${n} selected</b><button class="tb sm" data-r="dup">Duplicate</button><button class="tb sm" data-r="rotT">Rotate</button><button class="tb sm danger" data-r="del">Delete</button><button class="tb sm" data-r="none">✕</button>`;
}
async function regionAction(a) {
  const lv = L(), r = ED.region;
  if (a === 'none') { ED.region = null; ED.sel.clear(); }
  else if (a === 'copy') { ED.clipboard = regionData(r); toast('Copied — press Paste (Ctrl+V)', 'ok'); }
  else if (a === 'cut') { ED.clipboard = regionData(r); pushUndo(); clearRegion(r); ED.region = null; afterChange(); toast('Cut to clipboard'); }
  else if (a === 'walls') { pushUndo(); const q = normRect(r); for (let y = q.y1; y <= q.y2; y++) for (let x = q.x1; x <= q.x2; x++) setWall(x, y, ED.brush.wall); afterChange(); }
  else if (a === 'carve') { pushUndo(); const q = normRect(r); for (let y = q.y1; y <= q.y2; y++) for (let x = q.x1; x <= q.x2; x++) carve(x, y, ED.brush.floor === lv.props.floorTex ? '' : ED.brush.floor); afterChange(); }
  else if (a === 'clearThings') { pushUndo(); clearRegion(r, true); afterChange(); }
  else if (a === 'tpl') { const name = await promptBox('Save as template', 'Name', 'My Room'); if (name) { ED.project.customTemplates.push({ id: uid(), name, cat: 'My templates', desc: 'Saved from a selection', data: regionData(r) }); markDirty(); toast('Template saved — find it in Rooms', 'ok'); if (ED.tab === 'templates') renderPanel(); } }
  else if (a === 'del') { pushUndo(); lv.ents = lv.ents.filter(e => !ED.sel.has(e.id)); ED.sel.clear(); afterChange(); }
  else if (a === 'dup') { pushUndo(); const add = []; lv.ents.forEach(e => { if (ED.sel.has(e.id)) { const c = Object.assign({}, e, { id: uid(), x: Math.min(lv.w - 0.5, e.x + 1) }); add.push(c); } }); lv.ents.push(...add); ED.sel = new Set(add.map(e => e.id)); afterChange(); }
  else if (a === 'rotT') { pushUndo(); lv.ents.forEach(e => { if (ED.sel.has(e.id)) e.r = ((e.r || 0) + Math.PI / 4) % (Math.PI * 2); }); afterChange(); }
  updateSelBar(); requestDraw(); if (ED.tab === 'things') renderInspector();
}
$('#sel-bar').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) regionAction(b.dataset.r); });
$('#stamp-bar').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; const a = b.dataset.s; if (a === 'rot') rotateStamp(); else if (a === 'cancel') cancelStamp(); else if (a === 'place' && ED.hover) placeStamp(ED.hover.x, ED.hover.y); });

/* ---------- pointer events ---------- */
const pointers = new Map(); let drag = null, pinch = null, spaceHeld = false;
function evPos(e) { const r = cvs.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; }
function texLabel(id) { return id === 'sky' ? 'Sky (open air)' : ((RT.TEX_DEFS[id] || {}).name || id || 'Default'); }
function thingName(e) {
  if (!e) return '';
  if (e.t === 'exit') return 'Exit pad';
  if (e.t === 'light') return 'Light';
  if (e.t === 'enemy') return (RT.ENEMY_DEFS[e.s] || {}).name || e.s || 'Enemy';
  if (e.t === 'pickup') return (RT.PICKUP_DEFS[e.s] || {}).name || e.s || 'Pickup';
  if (e.t === 'prop') return (RT.PROP_DEFS[e.s] || {}).name || e.s || 'Prop';
  return e.t;
}
function lightLevelOf(e) {
  if (!e || e.t !== 'light') return '';
  if (e.flicker || (e.color && /#ff[0-4]/.test(e.color))) return 'alarm';
  const i = +e.intensity || 1.4;
  if (i >= 2) return 'bright';
  if (i <= 0.85) return 'dim';
  return 'normal';
}
function describeCell(x, y) {
  if (!inb(x, y)) return null;
  const lv = L(), i = idx(x, y), parts = [];
  if (lv.kind[i]) {
    const dn = { door: 'Door', red: 'Red key door', blue: 'Blue key door', yellow: 'Yellow key door' }[lv.kind[i]] || (lv.kind[i] + ' door');
    parts.push(dn);
    if (lv.wall[i] && RT.TEX_DEFS[lv.wall[i]] && !RT.TEX_DEFS[lv.wall[i]].door) parts.push('Frame: ' + texLabel(lv.wall[i]));
  } else if (lv.wall[i]) {
    parts.push('Wall: ' + texLabel(lv.wall[i]));
  } else {
    parts.push('Floor: ' + texLabel(lv.floor[i] || lv.props.floorTex));
    parts.push('Ceil: ' + texLabel(lv.ceil[i] || lv.props.ceilTex));
    if (lv.fh[i]) parts.push('Height ' + Number(lv.fh[i]).toFixed(2));
  }
  if (isSpawnCell(x, y)) parts.push('Player start');
  thingsAt(x, y).forEach(e => parts.push(thingName(e)));
  const lights = thingsAt(x, y).filter(e => e.t === 'light');
  if (lights.length) parts.push('Light: ' + (lightLevelOf(lights[0]) || 'on'));
  parts.push(ED.layers.ceil ? 'Layer: ceiling' : 'Layer: floor');
  return { x, y, parts, text: parts.join(' · ') };
}
let lastReadout = '';
function updateCellReadout(x, y) {
  if (x === undefined || y === undefined) {
    if (ED.hover) { x = ED.hover.x; y = ED.hover.y; }
    else { x = y = -1; }
  }
  const d = describeCell(x, y);
  const html = d ? `Cell <b>${d.x}, ${d.y}</b> · ${esc(d.text)}` : 'Cell -';
  const st = $('#st-cell'); if (st) st.innerHTML = html;
  const mr = $('#map-readout'); if (mr) mr.innerHTML = html;
  if (html !== lastReadout) { lastReadout = html; refreshPropsDock(); }
}
function hoverFrom(sx, sy) {
  const c = toCell(sx, sy);
  if (ED.stamp) ED.hover = { x: Math.round(c.fx - ED.stamp.data.w / 2), y: Math.round(c.fy - ED.stamp.data.h / 2) };
  else ED.hover = { x: Math.floor(c.fx), y: Math.floor(c.fy) };
  const x = Math.floor(c.fx), y = Math.floor(c.fy);
  updateCellReadout(x, y);
}
cvs.addEventListener('pointerdown', e => {
  cvs.setPointerCapture(e.pointerId);
  const p = evPos(e); pointers.set(e.pointerId, p);
  if (pointers.size === 2) {           // second finger: cancel the stroke and start pinch-zoom
    if (drag && drag.undoPushed) { const it = ED.undo.pop(); if (it) ED.project.levels[it.li] = RT.normalizeLevel(JSON.parse(it.s)); updateUndoBtns(); }
    drag = null; const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.sx - b.sx, a.sy - b.sy), cx: (a.sx + b.sx) / 2, cy: (a.sy + b.sy) / 2, cs: ED.view.cs, ox: ED.view.ox, oy: ED.view.oy }; requestDraw(); return;
  }
  if (pointers.size > 2) return;
  hoverFrom(p.sx, p.sy);
  const c = toCell(p.sx, p.sy), x = Math.floor(c.fx), y = Math.floor(c.fy);
  if (e.button === 1 || e.button === 2 || spaceHeld || ED.tool === 'pan') { drag = { pan: true, sx: p.sx, sy: p.sy, ox: ED.view.ox, oy: ED.view.oy }; return; }
  if (ED.stamp) { drag = { stamp: true }; requestDraw(); return; }
  switch (ED.tool) {
    case 'wall': case 'floor': case 'ceil': case 'height': case 'erase':
      pushUndo(); paintCell(x, y); drag = { paint: true, lx: x, ly: y, undoPushed: true }; afterChange(); break;
    case 'rect': drag = { rect: { x1: x, y1: y, x2: x, y2: y } }; break;
    case 'fill': if (inb(x, y)) { pushUndo(); const n = floodFill(x, y); if (!n) { ED.undo.pop(); toast('Already that texture'); } afterChange(); } break;
    case 'door': if (inb(x, y)) { if (isSpawnCell(x, y)) { toast('Move the player start first'); break; } pushUndo(); const lv = L(), i = idx(x, y); lv.wall[i] = 'door'; lv.kind[i] = ED.brush.door; lv.fh[i] = 0; removeThingsAt(x, y); afterChange(); } break;
    case 'thing': pushUndo(); placeThing(c.fx, c.fy); afterChange(); updateSelBar(); break;
    case 'spawn': pushUndo(); setSpawn(x, y); afterChange(); break;
    case 'pick': pickAt(x, y); break;
    case 'select': {
      const hit = hitThing(c.fx, c.fy);
      if (hit === 'spawn') { drag = { moveSpawn: true, moved: false }; }
      else if (hit) {
        if (e.shiftKey) { if (ED.sel.has(hit.id)) ED.sel.delete(hit.id); else ED.sel.add(hit.id); }
        else if (!ED.sel.has(hit.id)) { ED.sel.clear(); ED.sel.add(hit.id); }
        ED.region = null;
        drag = { move: true, fx: c.fx, fy: c.fy, start: L().ents.filter(o => ED.sel.has(o.id)).map(o => ({ o, x: o.x, y: o.y })), moved: false };
      } else { ED.sel.clear(); drag = { region: true, x, y, moved: false }; ED.region = null; }
      updateSelBar(); if (ED.tab === 'things') renderInspector(); requestDraw(); break;
    }
  }
});
cvs.addEventListener('pointermove', e => {
  const p = evPos(e); if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.sx - b.sx, a.sy - b.sy), cx = (a.sx + b.sx) / 2, cy = (a.sy + b.sy) / 2;
    const cs = clamp(pinch.cs * d / Math.max(10, pinch.d), 4, 90), k = cs / pinch.cs;
    ED.view.cs = cs; ED.view.ox = cx - (pinch.cx - pinch.ox) * k; ED.view.oy = cy - (pinch.cy - pinch.oy) * k; setZoom(cs, cx, cy); return;
  }
  hoverFrom(p.sx, p.sy);
  if (!drag) { requestDraw(); return; }
  const c = toCell(p.sx, p.sy), x = Math.floor(c.fx), y = Math.floor(c.fy);
  if (drag.pan) { ED.view.ox = drag.ox + p.sx - drag.sx; ED.view.oy = drag.oy + p.sy - drag.sy; }
  else if (drag.paint) {   // draw a line of cells from the last point so fast strokes have no gaps
    let x0 = drag.lx, y0 = drag.ly; const dx = Math.abs(x - x0), dy = Math.abs(y - y0), sx = x0 < x ? 1 : -1, sy = y0 < y ? 1 : -1; let err = dx - dy, guard = 0;
    while (!(x0 === x && y0 === y) && guard++ < 400) { const e2 = err * 2; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } paintCell(x0, y0); }
    drag.lx = x; drag.ly = y; afterChange();
  }
  else if (drag.rect) { drag.rect.x2 = x; drag.rect.y2 = y; }
  else if (drag.region) { if (x !== drag.x || y !== drag.y) drag.moved = true; if (drag.moved) { ED.region = { x1: drag.x, y1: drag.y, x2: clamp(x, 0, L().w - 1), y2: clamp(y, 0, L().h - 1) }; } }
  else if (drag.move) {
    if (!drag.moved) { pushUndo(); drag.moved = true; }
    const dx = c.fx - drag.fx, dy = c.fy - drag.fy;
    drag.start.forEach(s => { let nx = s.x + dx, ny = s.y + dy; if (ED.snap && !e.shiftKey) { nx = Math.floor(nx) + 0.5; ny = Math.floor(ny) + 0.5; } s.o.x = clamp(nx, 0.25, L().w - 0.25); s.o.y = clamp(ny, 0.25, L().h - 0.25); });
  }
  else if (drag.moveSpawn) { if (!drag.moved) { pushUndo(); drag.moved = true; } if (inb(x, y) && !L().wall[idx(x, y)]) { L().spawn.x = x + 0.5; L().spawn.y = y + 0.5; } }
  requestDraw();
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pinch) { if (pointers.size < 2) pinch = null; drag = null; return; }
  if (!drag) return;
  const d = drag; drag = null;
  if (d.rect) { pushUndo(); applyRect(d.rect); afterChange(); }
  else if (d.region) { if (!d.moved) ED.region = null; updateSelBar(); }
  else if (d.move) { if (d.moved) { L().ents.forEach(o => { if (ED.sel.has(o.id) && L().wall[idx(Math.floor(o.x), Math.floor(o.y))]) { toast('Moved a thing into a wall — undo or move it out', 'bad'); } }); afterChange(); } }
  else if (d.moveSpawn) { if (d.moved) afterChange(); }
  else if (d.stamp && ED.stamp && ED.hover) placeStamp(ED.hover.x, ED.hover.y);
  requestDraw();
}
cvs.addEventListener('pointerup', endPointer); cvs.addEventListener('pointercancel', endPointer);
cvs.addEventListener('pointerleave', () => { if (!drag && !ED.stamp) { ED.hover = null; updateCellReadout(-1, -1); requestDraw(); } });
cvs.addEventListener('contextmenu', e => e.preventDefault());
cvs.addEventListener('wheel', e => { e.preventDefault(); const p = evPos(e); if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) setZoom(ED.view.cs * Math.exp(-e.deltaY * 0.0015), p.sx, p.sy); else { ED.view.ox -= e.deltaX; requestDraw(); } }, { passive: false });

/* ---------- keyboard shortcuts ---------- */
document.addEventListener('keydown', e => {
  if ($('#play-host').classList.contains('on') || $('.modal-back')) return;
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName)) return;
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); redo(); return; }
  if (mod && k === 'c') { if (ED.region) regionAction('copy'); else if (ED.sel.size) { ED.clipboard = { w: 1, h: 1, cells: [], ents: L().ents.filter(o => ED.sel.has(o.id)).map(o => { const c = Object.assign({}, o); delete c.id; c.x -= Math.floor(o.x); c.y -= Math.floor(o.y); return c; }) }; toast('Copied things'); } e.preventDefault(); return; }
  if (mod && k === 'x') { if (ED.region) regionAction('cut'); e.preventDefault(); return; }
  if (mod && k === 'v') { if (ED.clipboard) startStamp('Clipboard', ED.clipboard); else toast('Clipboard is empty — select an area and Copy'); e.preventDefault(); return; }
  if (mod && k === 's') { e.preventDefault(); autosave(); toast('Saved in this browser', 'ok'); return; }
  if (mod) return;
  if (k === ' ') { spaceHeld = true; e.preventDefault(); return; }
  if (k === 'escape') { if (ED.stamp) cancelStamp(); ED.region = null; ED.sel.clear(); drag = null; updateSelBar(); requestDraw(); return; }
  if (k === 'delete' || k === 'backspace') { if (ED.sel.size) regionAction('del'); else if (ED.region) { pushUndo(); clearRegion(ED.region); afterChange(); } return; }
  if (k === 'r' && ED.stamp) { rotateStamp(); return; }
  if (k === '+' || k === '=') return setZoom(ED.view.cs * 1.2);
  if (k === '-') return setZoom(ED.view.cs / 1.2);
  if (k === '0') return fitView();
  if (k === 'p') return playtest();
  if (k === '[' || k === ']') { const list = ED.tool === 'floor' ? RT.FLOOR_TEXTURES : ED.tool === 'ceil' ? RT.CEIL_TEXTURES : RT.WALL_TEXTURES, key = ED.tool === 'floor' ? 'floor' : ED.tool === 'ceil' ? 'ceil' : 'wall'; const i = list.indexOf(ED.brush[key]); ED.brush[key] = list[(i + (k === ']' ? 1 : -1) + list.length) % list.length]; toast('Brush: ' + (RT.TEX_DEFS[ED.brush[key]] || { name: 'Sky' }).name); renderPanel(); return; }
  const t = TOOLS.find(x => x !== '-' && x[3] && x[3].toLowerCase() === k); if (t) setTool(t[0]);
  if (k === '?' || k === 'f1') openHelp();
});
document.addEventListener('keyup', e => { if (e.key === ' ') spaceHeld = false; });

/* =====================================================================
   SIDE PANEL — Build / Things / Rooms / Level / Project tabs
   ===================================================================== */
function openTab(t, showSheet) {
  ED.tab = t; $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); renderPanel();
  if (showSheet && innerWidth <= 720) document.body.classList.add('sheet');
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) openTab(b.dataset.tab); });
const body = $('#panel-body');
function swatchGrid(list, cur, attr) {
  return `<div class="swatches">${list.map(id => `<button class="sw ${id === cur ? 'on' : ''}" data-${attr}="${id}" title="${esc(id === 'sky' ? 'Sky (open air)' : RT.TEX_DEFS[id].name)}"><canvas data-thumb="${id}" width="48" height="48"></canvas><span class="nm">${esc(id === 'sky' ? 'Sky' : RT.TEX_DEFS[id].name)}</span></button>`).join('')}</div>`;
}
function paintThumbs(root) { $$('canvas[data-thumb]', root).forEach(c => { c.getContext('2d').drawImage(RT.getThumb(c.dataset.thumb, 48), 0, 0); }); }
const seg = (name, opts, cur) => `<div class="seg" data-seg="${name}">${opts.map(o => `<button class="${o[0] === cur ? 'on' : ''}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`;

function renderPanel() {
  const t = ED.tab, lv = L();
  if (t === 'build') {
    body.innerHTML = `
      <div class="sec"><h4>Wall texture <span>${esc(RT.TEX_DEFS[ED.brush.wall].name)}</span></h4>${swatchGrid(RT.WALL_TEXTURES, ED.brush.wall, 'wall')}</div>
      <div class="sec"><h4>Floor texture <span>${esc(RT.TEX_DEFS[ED.brush.floor].name)}</span></h4>${swatchGrid(RT.FLOOR_TEXTURES, ED.brush.floor, 'floor')}</div>
      <div class="sec"><h4>Ceiling <span>${ED.brush.ceil === 'sky' ? 'Sky' : esc(RT.TEX_DEFS[ED.brush.ceil].name)}</span></h4>${swatchGrid(RT.CEIL_TEXTURES, ED.brush.ceil, 'ceil')}</div>
      <div class="sec"><h4>Floor height</h4>${seg('fh', [[0, '0'], [0.15, '.15'], [0.3, '.30'], [0.45, '.45'], [0.6, '.60'], [0.75, 'Block']], ED.brush.fh)}<p class="note">Steps of 0.15 make stairs (you can climb up to ${RT.STEP_H}). 0.60 = catwalk. "Block" = waist-high cover you can't climb.</p></div>
      <div class="sec"><h4>Door type</h4>${seg('door', [['door', 'Door'], ['red', 'Red key'], ['blue', 'Blue key'], ['yellow', 'Yellow key']], ED.brush.door)}</div>
      <div class="sec"><h4>Rectangle mode</h4>${seg('rect', [['room', 'Room'], ['solid', 'Solid'], ['floor', 'Carve'], ['outline', 'Outline']], ED.brush.rect)}</div>
      <div class="sec"><h4>Brush size</h4>${seg('size', [[1, '1×1'], [2, '2×2'], [3, '3×3'], [5, '5×5']], ED.brush.size)}</div>`;
    paintThumbs(body);
  } else if (t === 'things') {
    const grp = (title, items) => `<div class="sec"><h4>${title}</h4><div class="things">${items.map(it => { const on = ED.brush.thing.t === it.t && (ED.brush.thing.s || '') === (it.s || ''); const st = thingStyle(it); return `<button class="thing ${on ? 'on' : ''}" data-t="${it.t}" data-s="${it.s || ''}"><span class="dot" style="background:${st[0]};${it.t === 'prop' ? 'border-radius:4px' : ''}">${esc(st[1])}</span>${esc(it.name)}</button>`; }).join('')}</div></div>`;
    const P = RT.PICKUP_DEFS, picks = s => s.map(k => ({ t: 'pickup', s: k, name: P[k].name }));
    body.innerHTML = `<div id="inspector"></div>` +
      grp('Enemies', Object.keys(RT.ENEMY_DEFS).map(k => ({ t: 'enemy', s: k, name: RT.ENEMY_DEFS[k].name }))) +
      grp('Health & armor', picks(['health', 'medkit', 'armor', 'armor_heavy'])) +
      grp('Ammo', picks(['ammo_bullets', 'ammo_shells', 'ammo_cells', 'ammo_rockets'])) +
      grp('Weapons', picks(['w_shotgun', 'w_rifle', 'w_plasma', 'w_rocket'])) +
      grp('Keys & goals', [...picks(['key_red', 'key_blue', 'key_yellow', 'chip']), { t: 'exit', name: 'Exit pad' }]) +
      grp('Props', Object.keys(RT.PROP_DEFS).map(k => ({ t: 'prop', s: k, name: RT.PROP_DEFS[k].name }))) +
      `<div class="sec"><h4>Light</h4><div class="things"><button class="thing ${ED.brush.thing.t === 'light' ? 'on' : ''}" data-t="light" data-s=""><span class="dot" style="background:${ED.brush.light.color}"></span>Light</button></div>
        <div class="row"><label>Color</label><input type="color" data-light="color" value="${ED.brush.light.color}"><div class="btns">${['#ffd9a0', '#ff8a3a', '#4ad8ff', '#ff3030', '#9dff4f', '#ffffff'].map(c => `<button class="tb sm" data-lc="${c}" style="background:${c};width:24px;min-width:24px;padding:0"></button>`).join('')}</div></div>
        <div class="row"><label>Radius</label><input type="range" min="2" max="14" step="0.5" data-light="radius" value="${ED.brush.light.radius}"><output>${ED.brush.light.radius}</output></div>
        <div class="row"><label>Brightness</label><input type="range" min="0.2" max="3" step="0.1" data-light="intensity" value="${ED.brush.light.intensity}"><output>${ED.brush.light.intensity}</output></div>
        <label class="check"><input type="checkbox" data-light="flicker" ${ED.brush.light.flicker ? 'checked' : ''}> Flicker (broken / alarm light)</label></div>
      <label class="check"><input type="checkbox" id="snap" ${ED.snap ? 'checked' : ''}> Snap things to cell centers</label>`;
    renderInspector();
  } else if (t === 'templates') {
    const all = TEMPLATES.map(x => ({ id: x.id, name: x.name, cat: x.cat, desc: x.desc, tpl: x })).concat(ED.project.customTemplates.map(x => ({ id: x.id, name: x.name, cat: 'My templates', desc: x.desc, data: x.data, custom: true })));
    const cats = [...new Set(all.map(x => x.cat))];
    body.innerHTML = `<p class="note">Tap a template, then tap the map to stamp it. <kbd>R</kbd> or ⟳ rotates. Select an area with the Select tool and press "Save template" to make your own.</p>` +
      cats.map(c => `<div class="sec"><h4>${esc(c)}</h4><div class="card-grid">${all.filter(x => x.cat === c).map(x => `<button class="tcard" data-tpl="${x.id}"><canvas width="160" height="123" data-prev="${x.id}"></canvas><b>${esc(x.name)}</b><small>${esc(x.desc || '')}</small>${x.custom ? `<span class="tb sm danger" data-deltpl="${x.id}" style="margin-top:4px">Delete</span>` : ''}</button>`).join('')}</div></div>`).join('') +
      `<div class="sec"><h4>Text legend (for adding your own in app.js)</h4><p class="note">${esc(TEMPLATE_LEGEND_HELP)}</p></div>`;
    all.forEach(x => { const c = $(`canvas[data-prev="${x.id}"]`, body); if (c) drawPreview(c, x.data || tplData(x.tpl)); });
  } else if (t === 'level') {
    const P = lv.props, opt = (list, cur, names) => list.map(id => `<option value="${id}" ${id === cur ? 'selected' : ''}>${esc(names ? names(id) : id)}</option>`).join('');
    const texName = id => id === 'sky' ? 'Sky (open air)' : RT.TEX_DEFS[id].name;
    body.innerHTML = `
      <div class="sec"><h4>Level</h4>
        <div class="row"><label>Name</label><input type="text" data-lp="name" value="${esc(lv.name)}"></div>
        <div class="row"><label>Size</label><input type="number" id="lv-w" min="8" max="128" value="${lv.w}"> × <input type="number" id="lv-h" min="8" max="128" value="${lv.h}"><button class="tb sm" data-act="resize">Apply</button></div>
        <div class="row"><label>Par time (s)</label><input type="number" data-p="par" min="0" value="${P.par || 0}"></div></div>
      <div class="sec"><h4>Atmosphere</h4>
        <div class="row"><label>Lighting preset</label><select data-act-preset="1">${['', 'gritty', 'clean', 'emergency'].map(id => { const n = id ? RT.LIGHT_PRESETS[id].name : 'Custom'; const cur = P.lightPreset || ''; return `<option value="${id}" ${id === cur ? 'selected' : ''}>${esc(n)}</option>`; }).join('')}</select></div>
        <p class="note">Gritty keeps the dark industrial look. Clean bright is for labs and offices. Emergency red is an alarm wash. You can still tweak the sliders after picking a preset.</p>
        <div class="row"><label>Sky</label><select data-p="sky">${opt(Object.keys(RT.SKIES), P.sky, k => RT.SKIES[k].name)}</select></div>
        <div class="row"><label>Ambient light</label><input type="color" data-p="ambient" value="${P.ambient}"><input type="range" min="0.05" max="1.8" step="0.05" data-p="ambientI" value="${P.ambientI}"><output>${P.ambientI}</output></div>
        <div class="row"><label>Fog</label><input type="color" data-p="fogColor" value="${P.fogColor}"><input type="range" min="0" max="0.15" step="0.005" data-p="fog" value="${P.fog}"><output>${P.fog}</output></div>
        <div class="row"><label>Wall height</label><input type="range" min="1.2" max="3" step="0.1" data-p="wallH" value="${P.wallH}"><output>${P.wallH}</output></div>
        <div class="row"><label>Default floor</label><select data-p="floorTex">${opt(RT.FLOOR_TEXTURES, P.floorTex, texName)}</select></div>
        <div class="row"><label>Default ceiling</label><select data-p="ceilTex">${opt(RT.CEIL_TEXTURES, P.ceilTex, texName)}</select></div>
        <label class="check"><input type="checkbox" data-p="music" ${P.music !== false ? 'checked' : ''}> Music on</label>
        <div class="row"><label>Track</label><select data-p="track"><option value="" ${!P.track ? 'selected' : ''}>Playlist (shuffle all)</option><option value="synth" ${P.track === 'synth' ? 'selected' : ''}>Synth ambient (built in)</option>${RT.MUSIC_TRACKS.map(t => `<option value="${t.id}" ${P.track === t.id ? 'selected' : ''}>${esc(t.title)} — ${esc(t.artist)} (${t.genre})</option>`).join('')}</select></div></div>
      <div class="sec"><h4>Share this level</h4><div class="btns"><button class="tb sm accent" data-act="shareLink">Share link</button><button class="tb sm" data-act="exportLevel">Export .retro</button><button class="tb sm" data-act="importLevel">Import level</button></div>
        <p class="note">A link holds the whole level, so opening it loads the level and starts playing. Big levels use a .retro file instead. You can also drag a .retro file onto the editor.</p></div>
      <div class="sec"><h4>Logic</h4>${P.scriptPending ? '<div class="issue warn">This imported level has a script that is <b>switched off</b>. Only turn it on if you trust its author: open <b>Edit level script</b>, review it, then press Apply.</div>' : ''}<div class="btns"><button class="tb sm" data-act="script">Edit level script</button><button class="tb sm" data-act="validate">Check level</button></div>
        <p class="note">Scripts react to events: start, tick, kill, pickup, door, use, exit. Example: <code>api.on('kill', () => { if (api.enemiesLeft() === 0) api.openDoor(10, 4); });</code></p></div>
      <div class="sec"><h4>Custom 3D models (.glb)</h4>${modelsUI()}</div>`;
  } else if (t === 'project') {
    body.innerHTML = `
      <div class="sec"><h4>Project <button class="tb sm" data-act="renameProject">Rename</button></h4><div class="note" style="font-size:13px;color:var(--text)">${esc(ED.project.name)}</div></div>
      <div class="sec"><h4>Levels (play in this order)</h4>${ED.project.levels.map((l, i) => `<div class="lvl-item ${i === ED.li ? 'on' : ''}"><span class="nm" data-lvl="${i}">${i + 1}. ${esc(l.name)}</span><button class="tb sm" data-lup="${i}" title="Move up">↑</button><button class="tb sm" data-ldup="${i}" title="Duplicate">⧉</button><button class="tb sm danger" data-ldel="${i}" title="Delete">✕</button></div>`).join('')}
        <div class="btns"><button class="tb sm" data-act="newLevel">+ Empty level</button><button class="tb sm" data-act="newStarter">+ Starter level</button></div></div>
      <div class="sec"><h4>Map layers (view only)</h4>${[['walls', 'Walls'], ['floors', 'Floor textures'], ['ceil', 'Show ceilings instead of floors'], ['heights', 'Floor heights'], ['things', 'Things'], ['lightRadius', 'Light radius glow'], ['grid', 'Grid lines'], ['reach', 'Reachable area (green)']].map(l => `<label class="check"><input type="checkbox" data-layer="${l[0]}" ${ED.layers[l[0]] ? 'checked' : ''}> ${l[1]}</label>`).join('')}</div>
      <div class="sec"><h4>Stats</h4><p class="note">${statsText()}</p></div>`;
  }
}
function statsText() { const lv = L(), c = t => lv.ents.filter(e => e.t === t).length; return `${lv.w}×${lv.h} cells · ${lv.wall.filter((w, i) => w && !lv.kind[i]).length} walls · ${lv.kind.filter(Boolean).length} doors · ${c('enemy')} enemies · ${c('pickup')} pickups · ${c('prop')} props · ${c('light')} lights · ${c('exit')} exits`; }
const tplCache = {};
function tplData(tpl) { return tplCache[tpl.id] || (tplCache[tpl.id] = parseTemplate(tpl, 0)); }
function drawPreview(c, d) {
  const g = c.getContext('2d'), s = Math.min(c.width / d.w, c.height / d.h), ox = (c.width - d.w * s) / 2, oy = (c.height - d.h * s) / 2;
  g.fillStyle = '#05070b'; g.fillRect(0, 0, c.width, c.height);
  d.cells.forEach(cl => { const t = cl.kind ? (cl.kind === 'door' ? 'door' : 'door_' + cl.kind) : cl.wall ? cl.wall : (cl.floor || 'concrete'); g.drawImage(RT.getThumb(t, 32), ox + cl.x * s, oy + cl.y * s, s + 0.5, s + 0.5); if (!cl.wall && !cl.kind) { g.fillStyle = cl.ceil === 'sky' ? 'rgba(10,30,80,.45)' : 'rgba(0,0,0,.5)'; g.fillRect(ox + cl.x * s, oy + cl.y * s, s + 0.5, s + 0.5); if (cl.fh) { g.fillStyle = `rgba(140,200,255,${0.15 + cl.fh * 0.5})`; g.fillRect(ox + cl.x * s, oy + cl.y * s, s + 0.5, s + 0.5); } } });
  d.ents.forEach(e => { const st = thingStyle(e); g.fillStyle = e.t === 'light' ? (e.color || '#ffd9a0') : e.t === 'prop' ? '#8b95a8' : st[0]; g.beginPath(); g.arc(ox + e.x * s, oy + e.y * s, Math.max(1.5, s * 0.3), 0, 7); g.fill(); });
  if (d.spawn) { g.fillStyle = '#fff'; g.beginPath(); g.arc(ox + d.spawn.x * s, oy + d.spawn.y * s, s * 0.4, 0, 7); g.fill(); }
}
// Inspector: edit the selected thing(s)
function renderInspector() {
  const box = $('#inspector'); if (!box) return;
  const lv = L(), sel = lv.ents.filter(e => ED.sel.has(e.id));
  if (!sel.length) { box.innerHTML = ''; return; }
  if (sel.length > 1) { box.innerHTML = `<div class="sec"><h4>Selection</h4><p class="note">${sel.length} things selected.</p><div class="btns"><button class="tb sm" data-r="dup">Duplicate</button><button class="tb sm danger" data-r="del">Delete</button></div></div>`; return; }
  const e = sel[0];
  const subs = e.t === 'enemy' ? RT.ENEMY_DEFS : e.t === 'pickup' ? RT.PICKUP_DEFS : e.t === 'prop' ? RT.PROP_DEFS : null;
  box.innerHTML = `<div class="sec" style="padding:10px;border:1px solid rgba(45,226,255,.35);border-radius:12px;background:rgba(45,226,255,.05)"><h4>Selected ${esc(e.t)} <button class="tb sm danger" data-r="del">Delete</button></h4>
    ${subs ? `<div class="row"><label>Type</label><select data-ep="s">${Object.keys(subs).map(k => `<option value="${k}" ${k === e.s ? 'selected' : ''}>${esc(subs[k].name)}</option>`).join('')}</select></div>` : ''}
    <div class="row"><label>Position</label><input type="number" step="0.25" data-ep="x" value="${e.x}"><input type="number" step="0.25" data-ep="y" value="${e.y}"></div>
    ${e.t === 'enemy' || e.t === 'prop' ? `<div class="row"><label>Facing</label><input type="range" min="0" max="360" step="15" data-ep="rdeg" value="${Math.round(((e.r || 0) * 180 / Math.PI + 360) % 360)}"><output>${Math.round(((e.r || 0) * 180 / Math.PI + 360) % 360)}°</output></div>` : ''}
    ${e.t === 'light' ? `<div class="row"><label>Color</label><input type="color" data-ep="color" value="${e.color || '#ffd9a0'}"></div><div class="row"><label>Radius</label><input type="range" min="2" max="14" step="0.5" data-ep="radius" value="${e.radius || 6}"><output>${e.radius || 6}</output></div><div class="row"><label>Brightness</label><input type="range" min="0.2" max="3" step="0.1" data-ep="intensity" value="${e.intensity || 1.4}"><output>${e.intensity || 1.4}</output></div><label class="check"><input type="checkbox" data-ep="flicker" ${e.flicker ? 'checked' : ''}> Flicker</label>` : ''}
  </div>`;
}
let inspUndo = false;
body.addEventListener('pointerdown', () => { inspUndo = false; });
body.addEventListener('input', ev => {
  const t = ev.target;
  if (t.dataset.actPreset !== undefined || t.hasAttribute('data-act-preset')) { applyLightPreset(t.value); return; }
  if (t.dataset.ep) {      // inspector field
    const e = L().ents.find(o => ED.sel.has(o.id)); if (!e) return;
    if (!inspUndo) { pushUndo(); inspUndo = true; }
    const k = t.dataset.ep;
    if (k === 'rdeg') { e.r = +t.value * Math.PI / 180; t.nextElementSibling.textContent = t.value + '°'; }
    else if (k === 'flicker') e.flicker = t.checked;
    else if (k === 'x' || k === 'y') e[k] = clamp(+t.value || 0, 0.25, (k === 'x' ? L().w : L().h) - 0.25);
    else if (k === 'radius' || k === 'intensity') { e[k] = +t.value; t.nextElementSibling.textContent = t.value; }
    else e[k] = t.value;
    requestDraw(); markDirty(); return;
  }
  if (t.dataset.light) { const k = t.dataset.light; ED.brush.light[k] = k === 'flicker' ? t.checked : k === 'color' ? t.value : +t.value; if (t.nextElementSibling && t.nextElementSibling.tagName === 'OUTPUT') t.nextElementSibling.textContent = t.value; return; }
  if (t.id === 'snap') { ED.snap = t.checked; return; }
  if (t.dataset.layer) { ED.layers[t.dataset.layer] = t.checked; if (t.dataset.layer === 'reach') ED.reach = null; requestDraw(); return; }
  if (t.dataset.lp === 'name') { L().name = t.value || 'Level'; refreshLevelSelect(); markDirty(); return; }
  if (t.dataset.p) {       // level property
    const k = t.dataset.p, P = L().props;
    P[k] = t.type === 'checkbox' ? t.checked : (t.type === 'range' || t.type === 'number') ? +t.value : t.value;
    if (t.nextElementSibling && t.nextElementSibling.tagName === 'OUTPUT') t.nextElementSibling.textContent = t.value;
    if (['ambient', 'ambientI', 'fog', 'fogColor'].includes(k)) P.lightPreset = '';
    requestDraw(); markDirty();
  }
  if (t.dataset.cp) { applyCellProp(t.dataset.cp, t.value); return; }
});
body.addEventListener('click', async ev => {
  const b = ev.target.closest('button, [data-lvl], [data-deltpl]'); if (!b) return;
  const d = b.dataset;
  if (d.deltpl) { ev.stopPropagation(); if (await confirmBox('Delete template', 'Delete this saved template?', 'Delete', true)) { ED.project.customTemplates = ED.project.customTemplates.filter(x => x.id !== d.deltpl); markDirty(); renderPanel(); } return; }
  if (d.wall) { ED.brush.wall = d.wall; setTool('wall'); renderPanel(); return; }
  if (d.floor) { ED.brush.floor = d.floor; setTool('floor'); renderPanel(); return; }
  if (d.ceil) { ED.brush.ceil = d.ceil; setTool('ceil'); renderPanel(); return; }
  if (d.lc) { ED.brush.light.color = d.lc; ED.brush.thing = { t: 'light' }; setTool('thing'); renderPanel(); return; }
  const sg = b.closest('[data-seg]');
  if (sg && d.v !== undefined) { const k = sg.dataset.seg, v = ['fh', 'size'].includes(k) ? +d.v : d.v; ED.brush[k] = v; setTool(k === 'fh' ? 'height' : k === 'door' ? 'door' : k === 'rect' ? 'rect' : ED.tool); renderPanel(); return; }
  if (b.classList.contains('thing')) { ED.brush.thing = { t: d.t, s: d.s || undefined }; setTool('thing'); renderPanel(); if (innerWidth <= 720) document.body.classList.remove('sheet'); return; }
  if (d.r) { regionAction(d.r); return; }
  if (d.tpl) { const custom = ED.project.customTemplates.find(x => x.id === d.tpl), tpl = TEMPLATES.find(x => x.id === d.tpl); startStamp(custom ? custom.name : tpl.name, custom ? custom.data : tplData(tpl)); return; }
  if (d.lvl !== undefined) { switchLevel(+d.lvl); return; }
  if (d.lup !== undefined) { const i = +d.lup; if (i > 0) { const a = ED.project.levels; [a[i - 1], a[i]] = [a[i], a[i - 1]]; if (ED.li === i) ED.li--; else if (ED.li === i - 1) ED.li++; ED.undo = []; ED.redo = []; afterChange(true); } return; }
  if (d.ldup !== undefined) { const c = RT.normalizeLevel(JSON.parse(JSON.stringify(ED.project.levels[+d.ldup]))); c.name += ' (copy)'; ED.project.levels.splice(+d.ldup + 1, 0, c); switchLevel(+d.ldup + 1); return; }
  if (d.ldel !== undefined) { if (ED.project.levels.length < 2) return toast('A project needs at least one level'); if (await confirmBox('Delete level', `Delete "${ED.project.levels[+d.ldel].name}"? (Can't be undone)`, 'Delete', true)) { ED.project.levels.splice(+d.ldel, 1); ED.undo = []; ED.redo = []; switchLevel(Math.min(ED.li, ED.project.levels.length - 1)); } return; }
  if (d.act) runAct(d.act, b);
  if (d.slot) modelAction(d.slot, d.ma);
});
async function runAct(a) {
  const lv = L();
  if (a === 'resize') {
    const w = clamp(+$('#lv-w').value | 0, 8, 128), h = clamp(+$('#lv-h').value | 0, 8, 128); if (w === lv.w && h === lv.h) return;
    pushUndo(); const n = RT.newLevel(lv.name, w, h); n.props = lv.props; n.spawn = { x: Math.min(lv.spawn.x, w - 0.5), y: Math.min(lv.spawn.y, h - 0.5), r: lv.spawn.r };
    for (let y = 0; y < Math.min(h, lv.h); y++) for (let x = 0; x < Math.min(w, lv.w); x++) { const a2 = y * lv.w + x, b2 = y * w + x; ['wall', 'kind', 'floor', 'ceil', 'fh'].forEach(k => { n[k][b2] = lv[k][a2]; }); }
    n.ents = lv.ents.filter(e => e.x < w && e.y < h); ED.project.levels[ED.li] = n; fitView(); afterChange(true); toast(`Resized to ${w}×${h}`);
  } else if (a === 'script') openCode('script');
  else if (a === 'shareLink') shareLink(); else if (a === 'exportLevel') exportLevelFile(); else if (a === 'importLevel') $('#file-retro').click();
  else if (a === 'validate') openValidate();
  else if (a === 'renameProject') { const n = await promptBox('Rename project', 'Name', ED.project.name); if (n) { ED.project.name = n; markDirty(); renderPanel(); updateProjectBtn(); } }
  else if (a === 'newLevel') { ED.project.levels.push(blankLevel('Level ' + (ED.project.levels.length + 1))); switchLevel(ED.project.levels.length - 1); }
  else if (a === 'newStarter') {
    const pick = await modal({ title: 'Add a starter level', body: DF_STARTER_LEVELS.map((d, i) => `<button class="tb" style="width:100%;margin:4px 0;justify-content:flex-start" data-i2="${i}">${esc(d.name)}</button>`).join(''), onOpen: (bk, close) => bk.addEventListener('click', e => { const t = e.target.closest('[data-i2]'); if (t) close(+t.dataset.i2); }) });
    if (pick !== null && pick !== undefined) { ED.project.levels.push(levelFromAscii(DF_STARTER_LEVELS[pick], RT)); switchLevel(ED.project.levels.length - 1); }
  }
}
function applyLightPreset(id) {
  const P = L().props;
  if (!id) { P.lightPreset = ''; markDirty(); return; }
  const pr = RT.LIGHT_PRESETS[id]; if (!pr) return;
  P.lightPreset = id; P.ambient = pr.ambient; P.ambientI = pr.ambientI; P.fogColor = pr.fogColor; P.fog = pr.fog;
  markDirty(); renderPanel(); toast('Lighting: ' + pr.name, 'ok');
}
function propTargetCells() {
  if (ED.region) { const r = (function (a, b, c, d) { return { x1: Math.min(a, c), y1: Math.min(b, d), x2: Math.max(a, c), y2: Math.max(b, d) }; })(ED.region.x1, ED.region.y1, ED.region.x2, ED.region.y2); const out = []; for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) if (inb(x, y)) out.push({ x, y }); return out; }
  if (ED.hover && inb(ED.hover.x, ED.hover.y)) return [{ x: ED.hover.x, y: ED.hover.y }];
  return [];
}
function uniqueOr(vals, empty) {
  const u = [...new Set(vals.map(v => v === undefined || v === null ? '' : String(v)))];
  return u.length === 1 ? u[0] : empty;
}
function applyCellProp(key, value) {
  const cells = propTargetCells(); if (!cells.length) { toast('Hover or select cells first'); return; }
  pushUndo();
  const lv = L();
  cells.forEach(({ x, y }) => {
    const i = idx(x, y);
    if (key === 'wall') {
      if (value === '') { if (lv.wall[i] && !lv.kind[i]) { lv.wall[i] = ''; lv.kind[i] = ''; } }
      else setWall(x, y, value);
    } else if (key === 'floor') {
      if (lv.wall[i] && !lv.kind[i]) return;
      lv.floor[i] = value === lv.props.floorTex ? '' : value;
    } else if (key === 'ceil') {
      if (lv.wall[i] && !lv.kind[i]) return;
      lv.ceil[i] = value === lv.props.ceilTex ? '' : value;
    } else if (key === 'fh') {
      if (!lv.wall[i] || lv.kind[i]) lv.fh[i] = +value;
    } else if (key === 'door') {
      if (value === '') { if (lv.kind[i]) { lv.kind[i] = ''; lv.wall[i] = ''; } }
      else if (!isSpawnCell(x, y)) { lv.wall[i] = 'door'; lv.kind[i] = value; lv.fh[i] = 0; removeThingsAt(x, y, true); }
    } else if (key === 'light') {
      const existing = thingsAt(x, y).filter(e => e.t === 'light');
      if (value === '' || value === 'none') {
        lv.ents = lv.ents.filter(e => !(e.t === 'light' && Math.floor(e.x) === x && Math.floor(e.y) === y));
      } else {
        const preset = { dim: { color: '#c8b090', radius: 5, intensity: 0.7, flicker: false }, normal: { color: '#ffd9a0', radius: 6, intensity: 1.4, flicker: false }, bright: { color: '#eef6ff', radius: 8, intensity: 2.2, flicker: false }, alarm: { color: '#ff3030', radius: 6, intensity: 1.6, flicker: true } }[value];
        if (!preset) return;
        if (existing[0]) Object.assign(existing[0], preset);
        else lv.ents.push(Object.assign({ id: uid(), t: 'light', x: x + 0.5, y: y + 0.5 }, preset));
      }
    }
  });
  afterChange();
}
function renderPropsDock() {
  const box = $('#props-dock'); if (!box) return;
  if (box.contains(document.activeElement) && document.activeElement.matches && document.activeElement.matches('select, input')) return;
  refreshPropsDock(true);
}
function refreshPropsDock(force) {
  const box = $('#props-dock'); if (!box) return;
  if (!force && box.contains(document.activeElement) && /^(SELECT|INPUT)$/.test(document.activeElement.tagName)) return;
  const cells = propTargetCells();
  const opt = (list, cur, names, emptyLabel, emptyVal) => {
    const mix = cur === '__multi__';
    return (emptyLabel !== undefined ? `<option value="${emptyVal === undefined ? '' : emptyVal}" ${cur === (emptyVal === undefined ? '' : emptyVal) && !mix ? 'selected' : ''}>${esc(emptyLabel)}</option>` : '') +
      (mix ? `<option value="__multi__" selected disabled>Multiple</option>` : '') +
      list.map(([id, label]) => `<option value="${id}" ${!mix && String(cur) === String(id) ? 'selected' : ''}>${esc(label)}</option>`).join('');
  };
  if (!cells.length) {
    box.innerHTML = `<div class="sec props-sec"><h4>Properties</h4><p class="note">Hover a cell or drag a selection to edit its floor, wall, ceiling, height, door and light.</p></div>`;
    return;
  }
  const lv = L();
  const walls = cells.map(({ x, y }) => { const i = idx(x, y); return lv.kind[i] ? '' : (lv.wall[i] || ''); });
  const floors = cells.map(({ x, y }) => { const i = idx(x, y); return lv.floor[i] || lv.props.floorTex; });
  const ceils = cells.map(({ x, y }) => { const i = idx(x, y); return lv.ceil[i] || lv.props.ceilTex; });
  const fhs = cells.map(({ x, y }) => String(lv.fh[idx(x, y)] || 0));
  const doors = cells.map(({ x, y }) => lv.kind[idx(x, y)] || '');
  const lights = cells.map(({ x, y }) => { const Lts = thingsAt(x, y).filter(e => e.t === 'light'); return Lts[0] ? lightLevelOf(Lts[0]) : 'none'; });
  const u = (arr) => { const s = [...new Set(arr)]; return s.length === 1 ? s[0] : '__multi__'; };
  const wallOpts = RT.WALL_TEXTURES.map(id => [id, texLabel(id)]);
  const floorOpts = RT.FLOOR_TEXTURES.map(id => [id, texLabel(id)]);
  const ceilOpts = RT.CEIL_TEXTURES.map(id => [id, texLabel(id)]);
  const title = cells.length > 1 ? `Properties · ${cells.length} cells` : `Properties · ${cells[0].x}, ${cells[0].y}`;
  box.innerHTML = `<div class="sec props-sec"><h4>${esc(title)}</h4>
    <div class="row"><label>Wall</label><select data-cp="wall">${opt(wallOpts, u(walls), null, '(Open floor)', '')}</select></div>
    <div class="row"><label>Floor</label><select data-cp="floor">${opt(floorOpts, u(floors))}</select></div>
    <div class="row"><label>Ceiling</label><select data-cp="ceil">${opt(ceilOpts, u(ceils))}</select></div>
    <div class="row"><label>Height</label><select data-cp="fh">${opt([[0, '0'], [0.15, '0.15 stair'], [0.3, '0.30'], [0.45, '0.45'], [0.6, '0.60 catwalk'], [0.75, '0.75 cover']], u(fhs))}</select></div>
    <div class="row"><label>Door</label><select data-cp="door">${opt([['door', 'Door'], ['red', 'Red key'], ['blue', 'Blue key'], ['yellow', 'Yellow key']], u(doors), null, '(None)', '')}</select></div>
    <div class="row"><label>Light level</label><select data-cp="light">${opt([['none', 'None'], ['dim', 'Dim'], ['normal', 'Normal'], ['bright', 'Bright'], ['alarm', 'Emergency red']], u(lights))}</select></div>
    <p class="note">Changes apply to the hovered cell, or to every cell in a Select-tool rectangle.</p>
  </div>`;
}
function renderExplorer() {
  const box = $('#explorer-body'); if (!box) return;
  if (!ED.project) { box.innerHTML = ''; return; }
  const p = ED.project;
  const modelCount = Object.keys(p.models || {}).length;
  const scripts = p.levels.map((l, i) => {
    const sc = (l.props && l.props.script) ? 'has script' : 'no script';
    const pend = l.props && l.props.scriptPending ? ' (off)' : '';
    return `<button class="ex-item" data-ex-script="${i}"><span>${esc(l.name)}</span><small>${sc}${pend}</small></button>`;
  }).join('');
  box.innerHTML = `
    <div class="ex-sec"><h4>Project</h4><div class="ex-name">${esc(p.name)}</div></div>
    <div class="ex-sec"><h4>Levels</h4>${p.levels.map((l, i) => `<button class="ex-item ${i === ED.li ? 'on' : ''}" data-ex-lvl="${i}"><span>${i + 1}. ${esc(l.name)}</span><small>${l.w}×${l.h}</small></button>`).join('')}</div>
    ${PACK_MAPS.length ? `<div class="ex-sec"><h4>Trial pack</h4>${PACK_MAPS.map(m => `<button class="ex-item" data-ex-pack="${esc(m.slug)}"><span>${esc(m.name)}</span><small>${m.w}×${m.h}</small></button>`).join('')}</div>` : ''}
    <div class="ex-sec"><h4>Models</h4><div class="note">${modelCount ? modelCount + ' custom model' + (modelCount === 1 ? '' : 's') : 'Default DMB Tech 1 pack'}</div>
      <button class="tb sm" data-ex-act="models" style="margin-top:6px">Open model slots</button></div>
    <div class="ex-sec"><h4>Scripts</h4>${scripts}</div>`;
}

function switchLevel(i) { ED.li = clamp(i, 0, ED.project.levels.length - 1); ED.sel.clear(); ED.region = null; cancelStamp(); fitView(); afterChange(true); }
function refreshLevelSelect() { $('#level-select').innerHTML = ED.project.levels.map((l, i) => `<option value="${i}" ${i === ED.li ? 'selected' : ''}>${i + 1}. ${esc(l.name)}</option>`).join(''); }
$('#level-select').addEventListener('change', e => switchLevel(+e.target.value));
function updateProjectBtn() { $('#btn-project').textContent = ED.project.name; }
function updateStatus() {
  const def = TOOLS.find(x => x !== '-' && x[0] === ED.tool);
  const stTool = $('#st-tool'); if (stTool) stTool.innerHTML = `Tool <b>${def ? def[1] : ''}</b>`;
  const lv = L(); const stCount = $('#st-count'); if (stCount) stCount.textContent = `${lv.ents.filter(e => e.t === 'enemy').length} enemies · ${lv.ents.filter(e => e.t === 'pickup').length} pickups · ${lv.ents.filter(e => e.t === 'light').length} lights`;
  updateCellReadout();
  renderExplorer();
}

/* ---------- custom GLB model slots ---------- */
const MODEL_SLOTS = [['enemy_grunt', 'Soldier'], ['enemy_drone', 'Gun Drone'], ['enemy_heavy', 'Heavy Walker'], ['enemy_turret', 'Sentry Turret'], ['enemy_titan', 'Titan boss'], ['prop_crate', 'Crate'], ['prop_barrel', 'Barrel'], ['prop_server', 'Server rack'], ['prop_desk', 'Desk'], ['prop_terminal', 'Terminal'], ['prop_pillar', 'Pillar'], ['prop_generator', 'Generator']];
const DYSTOPIA_BASE = 'https://ddemby424.github.io/dystopia-project-moses/';
const DYSTOPIA_PACK = { enemy_grunt: 'models/sentinel_guard.glb', enemy_drone: 'models/bot_drone.glb', enemy_titan: 'models/sentinel_colossus.glb', prop_barrel: 'models/barrel.glb', prop_crate: 'models/crate.glb', prop_desk: 'models/security_desk.glb', prop_server: 'models/server_rack.glb', prop_pillar: 'models/cooling_unit.glb' };
function modelsUI() {
  const m = ED.project.models;
  return `<p class="note">Optional. Every enemy and prop already has a built-in 3D model. You can swap in your own .glb (auto-sized and placed on the floor). Uploads are stored inside the project (keep files small, under ~2 MB).</p>` +
    MODEL_SLOTS.map(s => `<div class="row"><label>${s[1]}</label><span class="note" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m[s[0]] ? (m[s[0]].startsWith('data:') ? 'Uploaded file' : esc(m[s[0]].split('/').pop())) : 'Built-in'}</span><button class="tb sm" data-slot="${s[0]}" data-ma="file">File</button><button class="tb sm" data-slot="${s[0]}" data-ma="url">URL</button>${m[s[0]] ? `<button class="tb sm danger" data-slot="${s[0]}" data-ma="clear">✕</button>` : ''}</div>`).join('') +
    `<div class="btns"><button class="tb sm" data-slot="*" data-ma="dystopia">Use Dystopia pack (online)</button><button class="tb sm" data-slot="*" data-ma="none">All built-in</button></div>`;
}
let glbSlot = null;
async function modelAction(slot, a) {
  const m = ED.project.models;
  if (a === 'file') { glbSlot = slot; $('#file-glb').click(); return; }
  if (a === 'url') { const u = await promptBox('Model URL', '.glb link', m[slot] && !m[slot].startsWith('data:') ? m[slot] : 'https://'); if (u && /^https?:\/\//.test(u)) m[slot] = u.trim(); }
  if (a === 'clear') delete m[slot];
  if (a === 'dystopia') Object.keys(DYSTOPIA_PACK).forEach(k => { m[k] = DYSTOPIA_BASE + DYSTOPIA_PACK[k]; });
  if (a === 'none') Object.keys(m).forEach(k => delete m[k]);
  markDirty(); renderPanel();
}
$('#file-glb').addEventListener('change', e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || !glbSlot) return;
  if (f.size > 6e6) { toast('That model is over 6 MB — too big to store in the project', 'bad'); return; }
  const r = new FileReader(); r.onload = () => { ED.project.models[glbSlot] = r.result; markDirty(); renderPanel(); toast('Model added — Playtest to see it', 'ok'); }; r.readAsDataURL(f);
});

/* =====================================================================
   PLAYTEST · EXPORT · PROJECT FILES · CODE EDITOR · HELP
   ===================================================================== */
let playHandle = null;
let MP = null;
function applySpawnIndex(handle, index) {
  const G = handle && handle.game, lv = G && G.L;
  if (!G || !lv) return;
  const list = (lv.spawns && lv.spawns.length) ? lv.spawns : (lv.spawn ? [lv.spawn] : []);
  if (!list.length) return;
  const s = list[((index % list.length) + list.length) % list.length];
  if (!s) return;
  G.px = s.x; G.py = s.y; G.yaw = s.r || 0;
  const i = (Math.floor(s.y) * lv.w) + Math.floor(s.x);
  G.pz = (lv.fh && lv.fh[i]) || 0;
  G.vx = 0; G.vy = 0; G.vz = 0; G.onGround = true;
}
function applySpawnPoint(handle, p) {
  const G = handle && handle.game, lv = G && G.L;
  if (!G || !lv || !p || !isFinite(p.x) || !isFinite(p.y)) return;
  G.px = +p.x; G.py = +p.y; G.yaw = +p.r || 0;
  const i = (Math.floor(p.y) * lv.w) + Math.floor(p.x);
  G.pz = (lv.fh && lv.fh[i]) || 0;
  G.vx = 0; G.vy = 0; G.vz = 0; G.onGround = true;
}
function playtest(levelIndex, extra) {
  if (playHandle) return;
  extra = extra || {};
  const proj = JSON.parse(JSON.stringify(ED.project));
  let idx = levelIndex === undefined ? ED.li : levelIndex;
  if (extra.levelOverride) {
    proj.levels = [RT.normalizeLevel(extra.levelOverride)];
    idx = 0;
  }
  const lv = proj.levels[idx] || L();
  const v = RT.validateLevel(lv).issues.filter(i => i.level === 'error' && /start/i.test(i.msg));
  if (v.length) { toast(v[0].msg, 'bad'); return; }
  const host = $('#play-host'); host.classList.add('on'); document.body.classList.remove('sheet');
  playHandle = RT.play(host, proj, {
    level: idx,
    autoPlay: !!extra.autoPlay,
    skipEnemies: !!extra.skipEnemies,
    spawnIndex: extra.spawnIndex,
    spawnPoint: extra.spawnPoint,
    onQuit: stopPlaytest,
    onEvent: (ev, arg) => { if (MP && ev === 'tick') MP.tick(arg); },
    onMultiplayer: () => { if (MP) MP.openLobby(); }
  });
  if (playHandle && extra.spawnPoint) applySpawnPoint(playHandle, extra.spawnPoint);
  else if (playHandle && extra.spawnIndex != null) applySpawnIndex(playHandle, extra.spawnIndex);
}
function stopPlaytest() {
  if (MP) MP.teardown();
  if (!playHandle) return;
  playHandle.destroy(); playHandle = null;
  $('#play-host').classList.remove('on'); resizeCanvas();
}

/* ---------- standalone HTML export: engine source + your project in one file ---------- */
function buildStandaloneHtml() {
  const p = JSON.parse(JSON.stringify(ED.project));
  delete p.customTemplates;
  // Exported games load the asset pack and dmbtech1.js from wherever this editor is hosted.
  if (!p.assetBase) p.assetBase = /^https?:/.test(location.protocol) ? new URL('.', location.href).href : RT.HOSTED_BASE;
  const engineSrc = /^https?:/.test(location.protocol) ? new URL('dmbtech1.js', location.href).href : (RT.HOSTED_BASE + 'dmbtech1.js');
  const json = JSON.stringify(p).replace(/</g, '\\u003c');        // so a closing script tag can never appear inside the data
  const title = esc(p.name || 'RetroEngine game');
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">\n' +
    `<title>${title}</title>\n` +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;700&display=swap">\n' +
    '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/"}}</' + 'script>\n' +
    '<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}</style>\n</head>\n<body>\n<script type="module">\n' +
    `/* ${title} — made with RetroEngine v${VERSION}, powered by DMB Tech 1. Textures and sounds are generated by code; 3D models: CC0 asset pack by Quaternius (see CREDITS.md). */\n` +
    'import { createRuntime } from ' + JSON.stringify(engineSrc) + ';\n' +
    'var DF_PROJECT = ' + json + ';\n' +
    'createRuntime().boot(DF_PROJECT);\n</' + 'script>\n</body>\n</html>\n';
}

// Saving files: phones that can share files (Android Chrome/Samsung, iOS Safari 15+) get the share sheet
// ("Save to Files", Drive, messengers), which also works inside in-app browsers that ignore downloads.
async function download(name, text, type) {
  const blob = new Blob([text], { type: type || 'text/plain' });
  try {
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (coarse && window.File && navigator.canShare && navigator.share) {
      const f = new File([blob], name, { type: blob.type });
      if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); return 'shared'; }
    }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'downloaded';
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e2) {} ta.remove(); return ok; }
}
const safeName = s => (s || 'game').replace(/[^a-z0-9\-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'game';
async function openExport() {
  const issues = ED.project.levels.map((l, i) => RT.validateLevel(l).issues.filter(x => x.level === 'error').map(x => `Level ${i + 1}: ${x.msg}`)).flat();
  const html = buildStandaloneHtml(), kb = Math.round(html.length / 1024);
  const v = await modal({ title: 'Export standalone game', body: `
    <p class="note" style="font-size:13px">Creates an <b>.html file</b> with all ${ED.project.levels.length} level(s) and settings. It loads the standalone <b>DMB Tech 1</b> library (<code>dmbtech1.js</code>) and Three.js r128 from the network. Host the HTML next to a copy of <code>dmbtech1.js</code>, or keep the library URL that this editor baked in. Size: <b>${kb} KB</b>.</p>
    ${issues.length ? `<div class="issue error">${issues.map(esc).join('<br>')}</div>` : '<div class="issue ok">All levels passed the checks.</div>'}
    <p class="note">On a phone/Spck: use <b>Copy HTML</b>, make a new file <code>${safeName(ED.project.name)}.html</code> and paste.</p>`,
    buttons: [{ label: 'Copy HTML', value: 'copy' }, { label: 'Preview', value: 'preview' }, { label: 'Download .html', cls: 'primary', value: 'dl' }] });
  if (v === 'dl') { download(safeName(ED.project.name) + '.html', html, 'text/html'); toast('Downloaded ' + safeName(ED.project.name) + '.html', 'ok'); }
  else if (v === 'copy') { const ok = await copyText(html); toast(ok ? 'Game HTML copied to clipboard' : 'Copy blocked by the browser — use Download', ok ? 'ok' : 'bad'); }
  else if (v === 'preview') { const w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank'); if (!w) toast('Pop-up blocked — use Download instead', 'bad'); }
}
function exportJson() { download(safeName(ED.project.name) + '.retroengine.json', JSON.stringify(ED.project, null, 1), 'application/json'); toast('Project file downloaded', 'ok'); }
$('#file-json').addEventListener('change', e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const r = new FileReader();
  r.onload = async () => {
    try { const p = normalizeProject(JSON.parse(r.result)); if (await confirmBox('Open project', `Open "${p.name}" (${p.levels.length} levels)? Your current project stays in Projects if you saved it there.`, 'Open')) loadProject(p); }
    catch (err) { toast('Could not read that file: ' + err.message, 'bad'); }
  };
  r.readAsText(f);
});
function loadProject(p) { ED.project = p; ED.li = 0; ED.undo = []; ED.redo = []; ED.sel.clear(); ED.region = null; cancelStamp(); updateProjectBtn(); fitView(); afterChange(true); toast('Opened ' + p.name, 'ok'); }

/* ---------- Projects (named save slots in this browser) ---------- */
async function openProjects() {
  const render = () => { const s = loadSlots(), keys = Object.keys(s).sort((a, b) => s[b].time - s[a].time); return (keys.length ? keys.map(k => `<div class="slot"><div class="nm"><b>${esc(k)}</b><small>${new Date(s[k].time).toLocaleString()} · ${s[k].levels} level(s)</small></div><button class="tb sm" data-open="${esc(k)}">Open</button><button class="tb sm danger" data-del="${esc(k)}">✕</button></div>`).join('') : '<p class="note">No saved projects yet.</p>') + `<div class="btns" style="margin-top:12px"><button class="tb" data-saveas>Save current as…</button><button class="tb" data-new>New empty project</button><button class="tb" data-starter>New from starter campaign</button></div>`; };
  await modal({ title: 'Projects', body: `<div id="slots">${render()}</div>`, onOpen: (bk, close) => bk.addEventListener('click', async e => {
    const t = e.target.closest('button'); if (!t || !t.closest('#slots')) return; const s = loadSlots();
    if (t.dataset.open) { try { loadProject(normalizeProject(JSON.parse(s[t.dataset.open].data))); close(); } catch (err) { toast('That save is damaged', 'bad'); } }
    else if (t.dataset.del) { if (await confirmBox('Delete save', `Delete "${t.dataset.del}"?`, 'Delete', true)) { delete s[t.dataset.del]; saveSlots(s); $('#slots', bk).innerHTML = render(); } }
    else if (t.dataset.saveas !== undefined) { const n = await promptBox('Save project as', 'Name', ED.project.name); if (n) { try { s[n] = { time: Date.now(), levels: ED.project.levels.length, data: JSON.stringify(ED.project) }; saveSlots(s); ED.project.name = n; updateProjectBtn(); markDirty(); toast('Saved "' + n + '"', 'ok'); } catch (err) { toast('Browser storage is full — export JSON instead', 'bad'); } $('#slots', bk).innerHTML = render(); } }
    else if (t.dataset.new !== undefined) { if (await confirmBox('New project', 'Start a new empty project? (Save the current one first if you want to keep it.)', 'New project')) { loadProject({ format: 'retroengine-project', version: 2, name: 'New Project', levels: [blankLevel('Level 1')], models: {}, customTemplates: [] }); close(); } }
    else if (t.dataset.starter !== undefined) { loadProject(starterProject()); close(); }
  }) });
}

/* ---------- sharing maps: .retro level files and #map= share links ----------
   .retro = small versioned JSON: the level, its grids run-length encoded, plus custom model
   references (and embedded uploads in files). Links deflate that JSON (CompressionStream)
   and base64url it into the URL hash, which never reaches a server. */
const RETRO_FORMAT = 'retroengine-level', RETRO_VERSION = 1, LINK_MAX = 7500;
const GRID_KEYS = ['wall', 'kind', 'floor', 'ceil', 'fh'];
function rle(a) { const o = []; for (let i = 0; i < a.length;) { let j = i; while (j < a.length && a[j] === a[i]) j++; o.push(j - i === 1 ? [a[i]] : [a[i], j - i]); i = j; } return o; }
function unrle(r, n) { const o = []; if (!Array.isArray(r)) throw new Error('grid data damaged'); for (const run of r) { const c = Math.min(n, (run && run[1]) | 0 || 1); for (let k = 0; k < c; k++) o.push(run[0]); if (o.length > n) break; } if (o.length !== n) throw new Error('grid size mismatch'); return o; }
function packLevel(lv, withUploads) {
  const L = JSON.parse(JSON.stringify(lv)), grid = {};
  GRID_KEYS.forEach(k => { grid[k] = rle(L[k] || []); delete L[k]; });
  L.ents = (L.ents || []).map(e => { const c = Object.assign({}, e); delete c.id; return c; });
  if (L.props) delete L.props.scriptPending;
  const out = { format: RETRO_FORMAT, version: RETRO_VERSION, app: 'RetroEngine ' + VERSION, level: L, grid };
  const m = ED.project.models || {}, models = {};
  Object.keys(m).forEach(k => { if (withUploads || !String(m[k]).startsWith('data:')) models[k] = m[k]; });
  if (Object.keys(models).length) out.assets = { models };
  return out;
}
const MODEL_SRC_OK = v => /^https?:\/\/[^\s"'<>]+$/i.test(v) || /^data:(model\/gltf-binary|application\/octet-stream)?;base64,[A-Za-z0-9+/=]+$/.test(v);
function unpackLevel(o) {
  if (!o || typeof o !== 'object') throw new Error('not a RetroEngine level');
  if (Array.isArray(o.levels)) return { project: normalizeProject(o) };              // a whole project file also works
  if (o.format !== RETRO_FORMAT) throw new Error('not a RetroEngine level file');
  if ((o.version | 0) > RETRO_VERSION) throw new Error('made with a newer RetroEngine (format v' + o.version + ')');
  const L = Object.assign({}, o.level || {}), w = L.w | 0, h = L.h | 0;
  if (w < 8 || h < 8 || w > 128 || h > 128) throw new Error('level size must be 8–128 cells');
  GRID_KEYS.forEach(k => { if (o.grid && o.grid[k]) L[k] = unrle(o.grid[k], w * h); });
  const T = ['enemy', 'pickup', 'prop', 'light', 'exit'];
  L.ents = (Array.isArray(L.ents) ? L.ents : []).filter(e => e && T.includes(e.t) && isFinite(e.x) && isFinite(e.y) && e.x >= 0 && e.y >= 0 && e.x <= w && e.y <= h).slice(0, 3000);
  const lv = RT.normalizeLevel(L), models = {}, am = (o.assets && o.assets.models) || {};
  Object.keys(am).forEach(k => { if (/^(enemy|prop)_[a-z_]+$/.test(k) && MODEL_SRC_OK(String(am[k]))) models[k] = String(am[k]); });
  return { level: lv, models };
}
async function deflateBytes(str) {
  if (!window.CompressionStream) return null;
  try { const s = new Blob([new TextEncoder().encode(str)]).stream().pipeThrough(new CompressionStream('deflate-raw')); return new Uint8Array(await new Response(s).arrayBuffer()); } catch (e) { return null; }
}
// Tiny raw-DEFLATE decoder (RFC 1951), used only when the browser has no DecompressionStream (older Safari/Firefox/Samsung).
function inflateRaw(src) {
  let pos = 0, bit = 0, out = new Uint8Array(Math.max(1024, src.length * 4)), op = 0;
  const need = n => { if (op + n > out.length) { const o = new Uint8Array(Math.max(out.length * 2, op + n)); o.set(out); out = o; } };
  const bits = n => { let v = 0; for (let i = 0; i < n; i++) { if (pos >= src.length) throw new Error('link data is cut off'); v |= ((src[pos] >> bit) & 1) << i; if (++bit === 8) { bit = 0; pos++; } } return v; };
  const table = lens => { const cnt = new Uint16Array(16), offs = new Uint16Array(16), sym = new Uint16Array(lens.length);
    lens.forEach(l => cnt[l]++); cnt[0] = 0; for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + cnt[i - 1];
    lens.forEach((l, s) => { if (l) sym[offs[l]++] = s; }); return { cnt, sym }; };
  const decode = t => { let code = 0, first = 0, idx = 0; for (let l = 1; l < 16; l++) { code |= bits(1); const c = t.cnt[l]; if (code - c < first) return t.sym[idx + code - first]; idx += c; first = (first + c) << 1; code <<= 1; } throw new Error('bad link data'); };
  const LB = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258], LE = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const DB = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577], DE = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  let fixL = null, fixD = null, last = 0;
  do {
    last = bits(1); const type = bits(2);
    if (type === 0) { if (bit) { bit = 0; pos++; } const len = src[pos] | (src[pos + 1] << 8); pos += 4; need(len); out.set(src.subarray(pos, pos + len), op); op += len; pos += len; continue; }
    let lt, dt;
    if (type === 1) { if (!fixL) { const l = new Array(288); for (let i = 0; i < 288; i++) l[i] = i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8; fixL = table(l); fixD = table(new Array(30).fill(5)); } lt = fixL; dt = fixD; }
    else if (type === 2) {
      const hl = bits(5) + 257, hd = bits(5) + 1, hc = bits(4) + 4, ord = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15], cl = new Array(19).fill(0);
      for (let i = 0; i < hc; i++) cl[ord[i]] = bits(3);
      const ct = table(cl), ls = [];
      while (ls.length < hl + hd) { const s = decode(ct); if (s < 16) ls.push(s); else if (s === 16) { const p = ls[ls.length - 1], r = 3 + bits(2); for (let i = 0; i < r; i++) ls.push(p); } else { const r = s === 17 ? 3 + bits(3) : 11 + bits(7); for (let i = 0; i < r; i++) ls.push(0); } }
      lt = table(ls.slice(0, hl)); dt = table(ls.slice(hl, hl + hd));
    } else throw new Error('bad link data');
    for (;;) {
      const s = decode(lt); if (s === 256) break;
      if (s < 256) { need(1); out[op++] = s; continue; }
      const li = s - 257, len = LB[li] + bits(LE[li]), di = decode(dt), d = DB[di] + bits(DE[di]);
      if (d > op) throw new Error('bad link data'); need(len); for (let i = 0; i < len; i++, op++) out[op] = out[op - d];
      if (op > 16e6) throw new Error('link is too large');
    }
  } while (!last);
  return out.subarray(0, op);
}
async function inflateBytes(u8) {
  if (!window.DecompressionStream || window.__RE_FORCE_JS_INFLATE) return new TextDecoder().decode(inflateRaw(u8));
  try { const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return await new Response(s).text(); }
  catch (e) { return new TextDecoder().decode(inflateRaw(u8)); }   // e.g. 'deflate-raw' unsupported in that build
}
const b64u = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
async function encodeMap(obj) { const json = JSON.stringify(obj), z = await deflateBytes(json); return z ? 'z' + b64u(z) : 'j' + b64u(new TextEncoder().encode(json)); }
async function decodeMap(code) {
  const k = code[0], u = unb64u(code.slice(1).replace(/[^A-Za-z0-9\-_]/g, ''));
  if (u.length > 2e6) throw new Error('link is too large');
  const txt = k === 'z' ? await inflateBytes(u) : k === 'j' ? new TextDecoder().decode(u) : null;
  if (txt === null) throw new Error('unknown link format'); if (txt.length > 8e6) throw new Error('link is too large');
  return JSON.parse(txt);
}
function exportLevelFile() {
  const pk = packLevel(L(), true); pk.created = new Date().toISOString();
  download(safeName(L().name) + '.retro', JSON.stringify(pk), 'application/json').then(r => r !== 'cancelled' && toast('Saved ' + safeName(L().name) + '.retro — send it to a friend, they open it with Import level', 'ok'));
}
async function shareLink() {
  const lv = L(), code = await encodeMap(packLevel(lv, false)), url = location.href.split('#')[0] + '#map=' + code;
  ED.lastShareUrl = url;
  if (url.length > LINK_MAX) {
    const v = await modal({ title: 'Too big for a link', body: `<p class="note" style="font-size:13px">This level needs a <b>${(url.length / 1024).toFixed(1)} KB</b> link, and many apps cut links longer than about ${Math.round(LINK_MAX / 1024)} KB. Share the <b>.retro file</b> instead. It works everywhere and includes uploaded models.</p>`, buttons: [{ label: 'Cancel', value: 0 }, { label: 'Export .retro file', cls: 'primary', value: 1 }] });
    if (v) exportLevelFile(); return url;
  }
  const local = location.protocol === 'file:' || /^(localhost|127\.)/.test(location.hostname);
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ title: lv.name + ' — RetroEngine level', text: 'Play my RetroEngine level "' + lv.name + '"', url }); toast('Shared!', 'ok'); return url; }
    catch (e) { if (e && e.name === 'AbortError') return url; }
  }
  const copied = await copyText(url);
  modal({ title: 'Share link', body: `<p class="note" style="font-size:13px">${copied ? '<b>Link copied.</b> ' : ''}Anyone who opens this link gets <b>${esc(lv.name)}</b> in RetroEngine, ready to play.${local ? '<br><b>Heads up:</b> RetroEngine is running from this device, so the link only works here. Host it (for example on GitHub Pages) to share links with friends.' : ''}</p>
    <textarea class="share-url" readonly>${esc(url)}</textarea><p class="note">${(url.length / 1024).toFixed(1)} KB link${code[0] === 'z' ? ' (compressed)' : ''}. Custom models you uploaded are only included in .retro files.</p>`,
    buttons: [{ label: 'Copy', value: () => { copyText(url).then(ok => toast(ok ? 'Copied' : 'Select the text and copy it', ok ? 'ok' : 'bad')); return null; } }, { label: 'Done', cls: 'primary', value: 1 }],
    onOpen: bk => { const ta = $('.share-url', bk); ta.addEventListener('focus', () => ta.select()); } });
  return url;
}
// Add an imported/linked level to the project. Scripts from other people stay OFF until reviewed.
async function importMapObject(o, how) {
  const r = unpackLevel(o);
  if (r.project) { if (await confirmBox('Open project', `This file is a whole project: "${esc(r.project.name)}" (${r.project.levels.length} levels). Open it? Save your current one in Projects first if you want to keep it.`, 'Open')) loadProject(r.project); return null; }
  const lv = r.level; let scriptOff = false;
  // Official same-origin pack maps keep their script. Imported files and share links stay off until reviewed.
  if (how !== 'pack' && lv.props.script && lv.props.script.trim()) { lv.props.scriptPending = lv.props.script; lv.props.script = ''; scriptOff = true; }
  let addedModels = 0; Object.keys(r.models).forEach(k => { if (!ED.project.models[k]) { ED.project.models[k] = r.models[k]; addedModels++; } });
  pushUndo(); ED.project.levels.push(lv); switchLevel(ED.project.levels.length - 1); markDirty();
  const errs = RT.validateLevel(lv).issues.filter(i => i.level === 'error');
  const note = scriptOff ? 'Its level script is <b>switched off</b> for safety. Review it in Level → Logic before turning it on.' : '';
  if (how === 'link' || how === 'pack') { toast(`${how === 'pack' ? 'Loaded trial map' : 'Opened shared level'} "${lv.name}"${scriptOff ? ' (script off)' : ''}`, 'ok'); if (!errs.length) playtest(); return lv; }
  const v = await modal({ title: 'Level imported', body: `<p class="note" style="font-size:13px"><b>${esc(lv.name)}</b> (${lv.w}×${lv.h}) was added as level ${ED.project.levels.length}.${addedModels ? ` ${addedModels} custom model(s) added.` : ''}</p>${errs.length ? `<div class="issue error">${errs.map(e => esc(e.msg)).join('<br>')}</div>` : '<div class="issue ok">Level checks passed.</div>'}${note ? `<p class="note">${note}</p>` : ''}`,
    buttons: [{ label: 'Edit it', value: 'edit' }, { label: 'Play now', cls: 'primary', value: 'play' }] });
  if (v === 'play') playtest();
  return lv;
}
async function importLevelText(text, name) {
  if (text.length > 30e6) { toast('That file is too large (max 30 MB)', 'bad'); return; }
  let o; try { o = JSON.parse(text); } catch (e) { toast(`"${name || 'file'}" is not a RetroEngine .retro or .json file`, 'bad'); return; }
  try { await importMapObject(o, 'file'); } catch (e) { toast('Could not import: ' + e.message, 'bad'); }
}
function readFileThen(f, cb) { const r = new FileReader(); r.onload = () => cb(String(r.result)); r.onerror = () => toast('Could not read that file', 'bad'); r.readAsText(f); }
async function openFromHash() {
  const m = /^#map=([A-Za-z0-9\-_]+)/.exec(location.hash); if (!m) return false;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
  try { const o = await decodeMap(m[1]); await importMapObject(o, 'link'); return true; }
  catch (e) { toast('That share link is broken or incomplete: ' + e.message, 'bad'); return false; }
}
// Official trial maps hosted next to this app: #pack=maps/name.retro (same origin only).
const PACK_PATH = /^(?:maps|packs)\/[A-Za-z0-9][A-Za-z0-9._-]*\.retro$/;
let PACK_MAPS = [];
let packMapsReady = null;
function loadPackCatalog() {
  if (packMapsReady) return packMapsReady;
  packMapsReady = (async () => {
    try {
      const res = await fetch(new URL('maps/manifest.json', location.href));
      if (!res.ok) return [];
      const man = await res.json();
      PACK_MAPS = Array.isArray(man.maps) ? man.maps : [];
      renderExplorer();
      return PACK_MAPS;
    } catch (e) { PACK_MAPS = []; return PACK_MAPS; }
  })();
  return packMapsReady;
}
async function loadPackLevel(slug) {
  const path = 'maps/' + String(slug || '').replace(/[^A-Za-z0-9._-]/g, '') + '.retro';
  if (!PACK_PATH.test(path)) throw new Error('That map pack link is not valid');
  const url = new URL(path, location.href);
  if (url.origin !== location.origin) throw new Error('pack must be on this site');
  const res = await fetch(url.href);
  if (!res.ok) throw new Error('could not load ' + path + ' (' + res.status + ')');
  const text = await res.text();
  if (text.length > 30e6) throw new Error('file too large');
  return unpackLevel(JSON.parse(text)).level;
}
async function getPackLevels() {
  const maps = await loadPackCatalog();
  return maps.map(m => ({ id: 'pack-' + m.slug, name: m.name, file: 'maps/' + (m.file || (m.slug + '.retro')) }));
}
async function openFromPack(pathArg) {
  let path = pathArg;
  if (!path) {
    const raw = /^#pack=([^#]+)/.exec(location.hash); if (!raw) return false;
    path = decodeURIComponent(raw[1]);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
  }
  if (!PACK_PATH.test(path)) { toast('That map pack link is not valid', 'bad'); return false; }
  try {
    const url = new URL(path, location.href);
    if (url.origin !== location.origin) throw new Error('pack must be on this site');
    const res = await fetch(url.href);
    if (!res.ok) throw new Error('could not load ' + path + ' (' + res.status + ')');
    const text = await res.text();
    if (text.length > 30e6) throw new Error('file too large');
    const o = JSON.parse(text);
    await importMapObject(o, 'pack');
    return true;
  } catch (e) { toast('Could not load that trial map: ' + e.message, 'bad'); return false; }
}
$('#file-retro').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) readFileThen(f, t => importLevelText(t, f.name)); });
// drag & drop a .retro / .json file anywhere on the editor
let dragDepth = 0;
window.addEventListener('dragenter', e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) { dragDepth++; document.body.classList.add('dropping'); e.preventDefault(); } });
window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) document.body.classList.remove('dropping'); });
window.addEventListener('dragover', e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); });
window.addEventListener('drop', e => {
  if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); dragDepth = 0; document.body.classList.remove('dropping');
  const f = e.dataTransfer.files[0];
  if (!/\.(retro|json)$/i.test(f.name)) { toast('Drop a .retro level or .json project file', 'bad'); return; }
  readFileThen(f, t => importLevelText(t, f.name));
});
window.addEventListener('hashchange', () => { if (playHandle) return; if (/^#map=/.test(location.hash)) openFromHash(); else if (/^#pack=/.test(location.hash)) openFromPack(); });

/* ---------- main menu ---------- */
async function openMenu() {
  const items = [['projects', 'Projects (save / open)'], ['import', 'Import project file (.json)'], ['exportJson', 'Export project file (.json)'], ['export', 'Export playable game (.html)'], ['exportLevel', 'Export this level (.retro)'], ['importLevel', 'Import level (.retro)'], ['shareLink', 'Share level link'], ['code', 'Code editor (level.json / script)'], ['validate', 'Check level for problems'], ['playFirst', 'Play campaign from level 1'], ['multiplayer', 'Multiplayer'], ['tutorial', 'Tutorial: build your first level'], ['docsTutorial', 'Tutorial'], ['mapPack', 'Trial map pack'], ['help', 'Help & manual'], ['settings', 'Game settings'], ['about', 'About & credits']];
  const v = await modal({ title: 'Menu', body: `<div class="menu-list">${items.map(i => `<button class="tb" data-m="${i[0]}">${esc(i[1])}</button>`).join('')}</div>`, onOpen: (bk, close) => bk.addEventListener('click', e => { const t = e.target.closest('[data-m]'); if (t) close(t.dataset.m); }) });
  if (v === 'projects') openProjects(); else if (v === 'import') $('#file-json').click(); else if (v === 'exportJson') exportJson(); else if (v === 'export') openExport(); else if (v === 'exportLevel') exportLevelFile(); else if (v === 'importLevel') $('#file-retro').click(); else if (v === 'shareLink') shareLink();
  else if (v === 'code') openCode('level'); else if (v === 'validate') openValidate(); else if (v === 'playFirst') playtest(0); else if (v === 'multiplayer') { if (MP) MP.openLobby(); } else if (v === 'help') openHelp(); else if (v === 'tutorial') startTutorial(); else if (v === 'docsTutorial') { location.href = new URL('tutorial/', location.href).href; } else if (v === 'mapPack') { location.href = new URL('maps/', location.href).href; } else if (v === 'about') openAbout(); else if (v === 'settings') openGameSettings();
}
function openGameSettings() {
  const S = RT.S, r = (k, lab, a, b, st) => `<div class="row"><label>${lab}</label><input type="range" min="${a}" max="${b}" step="${st}" data-gs="${k}" value="${S[k]}"><output>${S[k]}</output></div>`;
  const models = RT.PLAYER_MODELS || {};
  const cur = models[S.playerModel] ? S.playerModel : 'george';
  const picker = `<div class="row" style="display:block"><label>Player model <span class="note">(how others see you in third person; the GLB loads only when used)</span></label>
    <div class="char-pick" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px">` +
    Object.keys(models).map(id => {
      const d = models[id], on = id === cur;
      return `<button type="button" class="char-pick-btn${on ? ' on' : ''}" data-gs-model="${id}" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border-radius:10px;border:1px solid ${on ? d.tintColor : 'rgba(255,255,255,.15)'};background:${on ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.03)'};color:inherit;cursor:pointer;font:inherit">
        <span style="width:22px;height:22px;border-radius:50%;background:${d.tintColor}"></span><b style="font-size:12px">${esc(d.name)}</b><span style="font-size:10px;opacity:.7">${esc(d.license || 'CC0 1.0')}</span></button>`;
    }).join('') + '</div></div>';
  modal({ title: 'Game settings (this device)', body: r('sens', 'Look sensitivity', 0.2, 3, 0.05) + r('fov', 'Field of view', 60, 100, 1) + r('volume', 'Volume', 0, 1, 0.05) + r('music', 'Music', 0, 1, 0.05) +
    `<div class="row"><label>Aim assist</label><input type="range" min="0" max="1" step="0.05" data-gs="aimAssist" value="${S.aimAssist}"><output>${Math.round((S.aimAssist || 0) * 100)}%</output></div>` +
    `<div class="row"><label>Quality</label><select data-gs="quality">${['low', 'medium', 'high'].map(q => `<option ${S.quality === q ? 'selected' : ''}>${q}</option>`).join('')}</select></div><label class="check"><input type="checkbox" data-gs="invertY" ${S.invertY ? 'checked' : ''}> Invert look up/down</label><label class="check"><input type="checkbox" data-gs="aimAssistMouse" ${S.aimAssistMouse ? 'checked' : ''}> Also use aim assist with mouse</label><label class="check"><input type="checkbox" data-gs="showFps" ${S.showFps ? 'checked' : ''}> Show FPS</label>` + picker,
    buttons: [{ label: 'Done', cls: 'primary', value: 1 }],
    onOpen: bk => {
      bk.addEventListener('input', e => { const t = e.target, k = t.dataset.gs; if (!k) return; S[k] = t.type === 'checkbox' ? t.checked : t.tagName === 'SELECT' ? t.value : +t.value; if (t.nextElementSibling) t.nextElementSibling.textContent = k === 'aimAssist' ? Math.round(S[k] * 100) + '%' : t.value; RT.saveSettings(); });
      bk.addEventListener('click', e => {
        const b = e.target.closest('[data-gs-model]'); if (!b) return;
        S.playerModel = b.dataset.gsModel; RT.saveSettings();
        bk.querySelectorAll('[data-gs-model]').forEach(el => {
          const d = models[el.dataset.gsModel], on = el === b;
          el.classList.toggle('on', on);
          el.style.borderColor = on ? d.tintColor : 'rgba(255,255,255,.15)';
          el.style.background = on ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.03)';
        });
      });
    } });
}
const MODEL_CREDITS = [
  ['Soldier (SWAT)', 'enemy', 'https://poly.pizza/m/Btfn3G5Xv4'], ['Robot Enemy Flying Gun (Gun Drone)', 'enemy', 'https://poly.pizza/m/UDTM6X1y9a'],
  ['Robot Enemy Legs Gun (Heavy Walker)', 'enemy', 'https://poly.pizza/m/lFZfDh2hzP'], ['Robot Enemy Large Gun (Titan)', 'enemy', 'https://poly.pizza/m/mWojM4i2IH'],
  ['Pistol', 'weapon', 'https://poly.pizza/m/J3i9KDQ3kt'], ['Shotgun', 'weapon', 'https://poly.pizza/m/ZmPTnh7njL'], ['Assault Rifle', 'weapon', 'https://poly.pizza/m/Bgvuu4CUMV'],
  ['Sci-fi Assault Rifle (Plasma Caster)', 'weapon', 'https://poly.pizza/m/j40c8VDdAQ'], ['Rocket Launcher', 'weapon', 'https://poly.pizza/m/GCqUvqleqN'],
  ['Supply Crate / Crate Stack / Barrel / Desk / Lab Bench / Lockers / Server Rack / Metal Shelves (Prop_Crate, Prop_Crate_Large, Prop_Barrel1, Prop_Desk_Medium, Prop_Desk_L, Prop_Locker, Prop_Shelves_WideTall, Prop_Shelves_WideShort)', 'prop, Sci-Fi Essentials Kit (Standard)', 'https://quaternius.com/packs/scifiessentialskit.html'],
  ['Pillar / Pipe Cluster / Terminal / Control Console / Chem Vat / Industrial Fan / Vent Grille (Column_Simple, Column_Pipes, Prop_Computer, Prop_AccessPoint, Prop_Barrel_Large, Prop_Fan_Small, Prop_Vent_Big)', 'prop, Modular Sci-Fi MegaKit (Standard)', 'https://quaternius.com/packs/modularscifimegakit.html', 'CC0 1.0'],
  ['George, Leela, Mike, Stan (remote / third-person player mechs)', 'player, Animated Mech Pack', 'https://quaternius.com/packs/animatedmech.html', 'CC0 1.0'],
  ['SWAT (player model and enemy grunt)', 'player / enemy', 'https://poly.pizza/m/Btfn3G5Xv4', 'CC0 1.0'],
  ['Sci Fi Character (player model)', 'player', 'https://poly.pizza/m/4pUXv5V8kq', 'CC-BY']];
function openAbout() {
  const link = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${esc(t || u.replace(/^https?:\/\//, ''))}</a>`;
  modal({ title: 'About & credits', wide: true, body: `<div class="about">
    <div class="about-hero"><div class="about-logo"><span>&#9670;</span> Retro<b>Engine</b></div><div class="note">Version ${VERSION} · powered by the standalone DMB Tech 1 library · a browser game maker for retro first-person shooters · formerly DOOMFORGE IDE</div></div>
    <h4>3D models: Quaternius (CC0 1.0, public domain)</h4><p class="note">Rigged characters and weapons by <b>Quaternius</b> (quaternius.com), from Poly Pizza. Arena player mechs (George, Leela, Mike, Stan) are from the <b>Animated Mech Pack</b> (CC0). SWAT is also CC0. <b>Sci Fi Character</b> is licensed <b>CC-BY</b> — please credit Quaternius when you use it (https://poly.pizza/m/4pUXv5V8kq). Environment props are from the <b>Sci-Fi Essentials Kit</b> and <b>Modular Sci-Fi MegaKit</b> (Standard versions), also by Quaternius, CC0. If a prop model fails to load, the engine keeps the procedural fallback. Player model GLBs are loaded only when that model is used.</p>
    <ul class="cred">${MODEL_CREDITS.map(c => `<li><b>${esc(c[0])}</b> <span>${c[1]} · ${esc(c[3] || 'CC0 1.0')} · ${link(c[2])}</span></li>`).join('')}</ul>
    <h4>Music (CC BY 4.0)</h4><ul class="cred">${RT.MUSIC_TRACKS.map(t => `<li><b>"${esc(t.title)}"</b> <span>${esc(t.artist)} · ${esc(t.genre)} · ${t.license} · ${link(t.url)}</span></li>`).join('')}</ul>
    <p class="note">Kevin MacLeod (incompetech.com) and Shane Ivers (silvermansound.com). Licensed under Creative Commons: By Attribution 4.0 — ${link('https://creativecommons.org/licenses/by/4.0/')}. The original five tracks were re-encoded to 112 kbps stereo. The five tracks added in 1.2.0 were re-encoded to 40 kbps mono to keep the download small. Nothing else was changed.</p>
    <h4>Code &amp; fonts</h4><ul class="cred"><li><b>Three.js r128</b> <span>MIT License · ${link('https://threejs.org')}</span></li><li><b>GLTFLoader, SkeletonUtils</b> <span>Three.js examples · MIT</span></li><li><b>Chakra Petch</b> <span>SIL Open Font License · Google Fonts</span></li></ul>
    <h4>Made by RetroEngine</h4><p class="note">Textures (procedural PBR materials, including a clean lab / office / med-bay set and industrial bulkheads, vents, stains and chevrons), fallback props (including the med cabinet, extinguisher, generator and floor lamp), pickups, turret, sound effects and synth music are generated by code in this app. Most placeable props use the Quaternius CC0 GLBs listed above. The editor, engine and starter levels are original work. Custom uploads are your responsibility: use CC0 or CC-BY assets and credit their authors. The full list is in CREDITS.md.</p></div>`,
    buttons: [{ label: 'Close', value: 1 }] });
}
async function openValidate() {
  const res = RT.validateLevel(L()); ED.layers.reach = true; ED.reach = res.reachable; requestDraw();
  await modal({ title: 'Check level: ' + L().name, body: (res.issues.length ? res.issues.map(i => `<div class="issue ${i.level}">${i.level === 'error' ? 'Problem' : 'Tip'}: ${esc(i.msg)}</div>`).join('') : '<div class="issue ok">Looks good! The exit is reachable and there are no problems.</div>') + `<p class="note">The reachable area is now tinted green on the map (turn it off in Project → Map layers). Keys found on the way: ${res.keysFound.length ? res.keysFound.join(', ') : 'none'}.</p>`, buttons: [{ label: 'Close', value: 1 }, { label: 'Playtest', cls: 'primary', value: 'play' }] }).then(v => { if (v === 'play') playtest(); });
}

/* ---------- code editor: level.json (editable), script.js (editable), project.json (view) ---------- */
function highlight(src, mode) {
  let h = esc(src);
  if (mode === 'script') h = h.replace(/(\/\/.*$)/gm, '<span class="tok-c">$1</span>').replace(/(&#39;[^&#\n]*?&#39;|&quot;[^\n]*?&quot;|`[^`]*`)/g, '<span class="tok-s">$1</span>').replace(/\b(const|let|var|function|return|if|else|for|while|true|false|null|new|of|in)\b/g, '<span class="tok-k">$1</span>').replace(/\b(api)\b/g, '<span class="tok-p">$1</span>').replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-n">$1</span>');
  else h = h.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)?/g, (m, s, c) => c ? `<span class="tok-k">${s}</span>${c}` : `<span class="tok-s">${s}</span>`).replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="tok-n">$1</span>').replace(/\b(true|false|null)\b/g, '<span class="tok-p">$1</span>');
  return h + '\n';
}
const SCRIPT_EXAMPLE = `// Level script — runs when the level starts.
// Events: 'start', 'tick'(dt), 'kill'(enemyType), 'pickup'(itemType), 'door'({x,y}), 'use'({x,y}), 'exit'
// api: message(text), heal(n), giveArmor(n), giveAmmo(type, n), openDoor(x, y),
//      enemiesLeft(), kills(), time(), win(), sound(name), player {x, y, hp, armor, keys}
api.on('start', () => api.message('Find the exit. Stay alive.'));
api.on('kill', () => {
  if (api.enemiesLeft() === 0) api.message('Sector clear!');
});
`;
function openCode(which) {
  let tab = which === 'script' ? 'script' : which === 'project' ? 'project' : 'level';
  const content = t => t === 'script' ? (L().props.script || L().props.scriptPending || SCRIPT_EXAMPLE) : t === 'project' ? JSON.stringify(ED.project, null, 1).slice(0, 400000) : JSON.stringify(L(), (k, v) => Array.isArray(v) && v.length > 50 && typeof v[0] !== 'object' ? '@@' + JSON.stringify(v) + '@@' : v, 1).replace(/"@@(.*?)@@"/g, (m, s) => s.replace(/\\"/g, '"'));
  modal({ title: 'Code editor', wide: true, body: `<div style="display:flex;flex-direction:column;height:100%;gap:8px"><div class="code-tabs">${[['level', 'level.json'], ['script', 'script.js'], ['project', 'project.json (read-only)']].map(t => `<button class="tb sm ${t[0] === tab ? 'accent' : ''}" data-ct="${t[0]}">${t[1]}</button>`).join('')}<span class="spacer"></span><span class="note" id="code-msg"></span></div>
    <div class="code-wrap" style="flex:1"><div class="code-gutter"></div><div class="code-area"><pre></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off"></textarea></div></div></div>`,
    buttons: [{ label: 'Copy', value: b => { copyText($('textarea', b).value); toast('Copied'); return null; } }, { label: 'Close', value: null }, { label: 'Apply', cls: 'primary', value: b => ({ tab: b.dataset.tab, text: $('textarea', b).value }) }],
    onOpen: (bk) => {
      const ta = $('textarea', bk), pre = $('pre', bk), gut = $('.code-gutter', bk);
      const sync = () => { pre.innerHTML = highlight(ta.value, tab); const n = ta.value.split('\n').length; let g = ''; for (let i = 1; i <= n; i++) g += i + '\n'; gut.textContent = g; };
      const load = t => { tab = t; bk.dataset.tab = t; ta.value = content(t); ta.readOnly = t === 'project'; sync(); $$('[data-ct]', bk).forEach(b => b.classList.toggle('accent', b.dataset.ct === t)); $('#code-msg', bk).textContent = t === 'level' ? 'Edit, then Apply. Bad JSON is rejected safely.' : t === 'script' ? 'JavaScript run by the game. Apply saves it.' : ''; };
      ta.addEventListener('input', sync);
      ta.addEventListener('scroll', () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gut.scrollTop = ta.scrollTop; });
      ta.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 2; sync(); } });
      bk.addEventListener('click', e => { const t = e.target.closest('[data-ct]'); if (t) load(t.dataset.ct); });
      load(tab);
    } }).then(r => {
    if (!r) return;
    if (r.tab === 'level') { try { const lv = RT.normalizeLevel(JSON.parse(r.text)); pushUndo(); ED.project.levels[ED.li] = lv; afterChange(true); toast('level.json applied', 'ok'); } catch (e) { toast('JSON error: ' + e.message, 'bad'); } }
    else if (r.tab === 'script') { try { new Function('api', r.text); pushUndo(); L().props.script = r.text; delete L().props.scriptPending; afterChange(); toast('Script saved — Playtest to run it', 'ok'); } catch (e) { toast('Script syntax error: ' + e.message, 'bad'); } }
  });
}

/* ---------- help / onboarding ---------- */
// The manual text is shared with help.html (the build injects help_content.html here).
const HELP_HTML = "<section id=\"h-start\"><h2>Getting started</h2>\n<p>RetroEngine is a game maker for retro-style first-person shooters. You draw levels on a top-down grid, drop in enemies, weapons, keys and lights, then press <b>Play</b> to walk through them in 3D. When you're happy, <b>Export</b> turns your project into one HTML file anyone can play in a browser.</p>\n<ol><li><b>Take the first-level tutorial.</b> Menu \u2192 <b>Tutorial: build your first level</b>. It takes about 5 minutes.</li>\n<li><b>Or open the Tutorial.</b> Menu \u2192 <b>Tutorial</b> (also at <a href=\"tutorial/\">tutorial/</a>) teaches adding maps, saving files, putting assets in code, changing engine knobs, and \u2014 in the advanced lessons \u2014 writing scripts and calling APIs.</li>\n<li><b>Or open a starter level.</b> The level picker in the top bar has three finished levels (E1M1\u2013E1M3). Play them, then take them apart to see how they work.</li>\n<li><b>Save often.</b> Work autosaves in this browser. Use Menu \u2192 <b>Projects</b> for named saves, and <b>Export project file (.json)</b> for real backups.</li></ol></section>\n\n<section id=\"h-tutorial\"><h2>Tutorial</h2>\n<p>Menu \u2192 <b>Tutorial</b> opens the Tinkerer tutorial: adding maps, saving and sharing files, loading assets in code, and changing engine knobs, with an advanced section on level scripts and APIs. You can also open <a href=\"tutorial/tutorial.html\">tutorial/tutorial.html</a> (or just <a href=\"tutorial/\">tutorial/</a>) directly. For a five-minute first level inside the editor, use Menu \u2192 <b>Tutorial: build your first level</b>.</p></section>\n\n<section id=\"h-ui\"><h2>The editor screen</h2>\n<ul><li><b>Top bar:</b> project name, level picker, undo/redo, <b>Play</b>, <b>Export</b> and the <b>Menu</b>.</li>\n<li><b>Explorer</b> (left on tablets and desktop; a slide-out sheet on phones, opened with the folder button): the project name, the levels list, custom models, and level scripts.</li>\n<li><b>Tool bar</b> (left on tablets and desktop, bottom on phones): the drawing tools.</li>\n<li><b>Map:</b> one finger or the mouse uses the current tool. Two fingers pan and pinch-zoom; on desktop use Space+drag and the mouse wheel. <b>Fit</b> frames the whole level.</li>\n<li><b>Properties / inspector</b> (top of the right panel): dropdowns for the wall, floor, ceiling, height, door type and light level of the hovered cell. If you drag a rectangle with the Select tool, the same dropdowns apply to every cell in that selection.</li>\n<li><b>Panel tabs</b> (right; a slide-up sheet on folded phones, opened with the panel button): <b>Build</b> (texture swatches, door types, heights), <b>Things</b> (enemies, items, props, lights), <b>Rooms</b> (template library), <b>Level</b> (sky, fog, lighting presets, music, script) and <b>Project</b> (levels, models, map layers).</li>\n<li><b>Status bar</b> (bottom on desktop and tablets; a floating readout on phones): the grid coordinates under the cursor or finger, plus a readable description of what is on that cell \u2014 wall or floor texture, height, door type, thing name (for example Soldier or Exit pad), light level and the current map layer.</li></ul></section>\n\n<section id=\"h-tools\"><h2>Tools</h2>\n<table><tr><th>Tool</th><th>Key</th><th>What it does</th></tr>\n<tr><td>Select</td><td>V</td><td>Tap a thing to select and inspect it, drag to move it. Drag on empty space to select an area, then Copy / Cut / Delete / Save as template.</td></tr>\n<tr><td>Pan</td><td>H</td><td>Drag to move the view.</td></tr>\n<tr><td>Wall</td><td>B</td><td>Paint solid walls with the chosen texture.</td></tr>\n<tr><td>Floor</td><td>F</td><td>Paint floor texture. Painting floor also removes walls.</td></tr>\n<tr><td>Ceiling</td><td>C</td><td>Paint ceiling texture. Choose <b>Sky</b> for outdoor areas.</td></tr>\n<tr><td>Height</td><td>U</td><td>Raise floors: 0.15 per step makes stairs, 0.6 a catwalk, 0.75 a cover block the player can't climb.</td></tr>\n<tr><td>Rect</td><td>R</td><td>Drag a rectangle: a room with walls, a solid block, a carved floor or an outline.</td></tr>\n<tr><td>Fill</td><td>G</td><td>Flood-fill a connected area that has the same texture.</td></tr>\n<tr><td>Erase</td><td>E</td><td>Removes things first, then walls, then floor details.</td></tr>\n<tr><td>Door</td><td>D</td><td>Place doors in wall gaps. Red, blue and yellow doors need the matching keycard.</td></tr>\n<tr><td>Thing</td><td>T</td><td>Place whatever is chosen in the Things tab.</td></tr>\n<tr><td>Start</td><td>S</td><td>Set the player start. Tap it again to turn it 90\u00b0.</td></tr>\n<tr><td>Picker</td><td>I</td><td>Copy a cell's textures into your brushes.</td></tr></table>\n<p>Shortcuts: <kbd>Ctrl+Z</kbd>/<kbd>Ctrl+Y</kbd> undo/redo \u00b7 <kbd>Ctrl+C</kbd>/<kbd>X</kbd>/<kbd>V</kbd> copy/cut/paste an area \u00b7 <kbd>Del</kbd> delete \u00b7 <kbd>[</kbd> <kbd>]</kbd> cycle textures \u00b7 <kbd>0</kbd> fit \u00b7 <kbd>P</kbd> playtest \u00b7 <kbd>?</kbd> help \u00b7 <kbd>Esc</kbd> cancel.</p></section>\n\n<section id=\"h-build\"><h2>Building good levels</h2>\n<ul><li><b>Start with rooms.</b> The <b>Rooms</b> tab has 24 rotatable templates: rooms, corridors, stairs and buildings such as Bunker, Guard Tower, Mezzanine, Courtyard, Hangar and Server Room, plus <b>Clean Lab</b> and <b>Med Bay</b> for well-lit white rooms. Tap one, tap the map, and press <kbd>R</kbd> or \u27f3 to rotate.</li>\n<li><b>Connect rooms with doors.</b> Use a plain door for flow and keycard doors to gate progress. Put the key somewhere the player must fight through.</li>\n<li><b>Use height.</b> Catwalks and raised platforms give enemies firing positions, and stairs let the player reach them.</li>\n<li><b>Light it.</b> Coloured light fixtures (Things \u2192 Light) set the mood. Flickering lights make horror corners. The <b>Level</b> tab has a lighting preset: <b>Gritty</b> for dark industrial maps, <b>Clean bright</b> for labs and offices, and <b>Emergency red</b> for an alarm wash. For a clean well-lit room, stamp Clean Lab or Med Bay, pick the Clean bright preset, and use Lab Wall Panels, Polished Tile and Bright Ceiling Lights from the Properties dropdowns.</li>\n<li><b>Give cover.</b> Crates, sandbags and barrels block bullets. The smarter enemies hide behind them, and barrels explode.</li>\n<li><b>Check it.</b> Menu \u2192 <b>Check level</b> confirms the exit can be reached and that keys come before their doors.</li></ul></section>\n\n<section id=\"h-things\"><h2>Enemies, items and props</h2>\n<table><tr><th>Enemy</th><th>Behaviour</th></tr>\n<tr><td>Soldier</td><td>Fast rifleman. Strafes while reloading, flanks, and calls in nearby allies.</td></tr>\n<tr><td>Gun Drone</td><td>Hovering, fast and fragile. Hard to hit.</td></tr>\n<tr><td>Heavy Walker</td><td>Slow armoured walker that fires 3-shot bursts.</td></tr>\n<tr><td>Sentry Turret</td><td>Never moves. Rapid fire with long sight lines.</td></tr>\n<tr><td>Titan (Boss)</td><td>Huge HP and twin rockets. Explodes when it dies.</td></tr></table>\n<p><b>How enemies think:</b> they stand idle until they <b>see</b> you (line of sight, roughly in front of them) or <b>hear</b> you (gunfire carries far; running footsteps carry a short way). An alerted enemy radios nearby allies. In a fight they strafe between shots, some swing wide to flank, and badly hurt ones run to cover and pop back out. They path around walls and open plain doors themselves. Difficulty (Easy / Normal / Hard, in game Settings) changes their health, damage, fire rate, speed and reaction time.</p>\n<p><b>Pickups:</b> health, medkit, armor, ammo (bullets, shells, cells, rockets), weapon pickups (shotgun, rifle, plasma, rockets; you start with the wrench and pistol), the three keycards, and data chips (secrets). <b>Props:</b> crates, barrels (explosive), lockers, server racks, metal shelves, terminals, desks, pillars, pipes, generators, sandbags, lamps, cones, debris, control consoles, lab benches, med cabinets, chem vats, industrial fans, vents and extinguishers. Most of these use real CC0 GLB models by Quaternius (Sci-Fi Essentials Kit and Modular Sci-Fi MegaKit); a procedural stand-in is used if a model fails to load, and for the med cabinet, extinguisher, generator and floor lamp.</p></section>\n\n<section id=\"h-play\"><h2>Playing</h2>\n<table><tr><th></th><th>Keyboard &amp; mouse</th><th>Touch</th></tr>\n<tr><td>Move</td><td>WASD \u00b7 Shift to run</td><td>Drag anywhere on the left half</td></tr>\n<tr><td>Look</td><td>Mouse (click the game to lock the pointer, or drag if your browser blocks that)</td><td>Drag on the right half</td></tr>\n<tr><td>Shoot</td><td>Left click</td><td>Hold FIRE (drag it to aim)</td></tr>\n<tr><td>Reload</td><td>R (reloads automatically when empty)</td><td>RLD</td></tr>\n<tr><td>Use / open</td><td>E</td><td>USE</td></tr>\n<tr><td>Jump</td><td>Space</td><td>JUMP</td></tr>\n<tr><td>Weapons</td><td>1\u20136, Q or mouse wheel</td><td>SWAP</td></tr>\n<tr><td>Map \u00b7 flashlight \u00b7 pause</td><td>M \u00b7 F \u00b7 Esc</td><td>Buttons at the top</td></tr></table>\n<p><b>Weapons:</b> Wrench (melee), Pulse Cannon (default starting gun, infinite ammo, automatic cyan pulses, tight spread), Combat Shotgun (6 shells, spread), Assault Rifle (30 rounds, automatic), Plasma Caster (40 cells, projectiles) and Rocket Launcher (1 rocket, big splash). The HUD shows <i>loaded / reserve</i> ammo, or \u221e when a gun does not use ammo. Touch aim assist is on by default; you can change its strength in Game settings.</p></section>\n\n<section id=\"h-levelprops\"><h2>Level settings &amp; music</h2>\n<p>The <b>Level</b> tab sets the name, sky (Night City, Red Dusk, Overcast, Toxic Haze, Black Void), fog, ambient light, wall height, default textures, par time and music. Use the <b>Lighting preset</b> dropdown for a one-tap mood: Gritty, Clean bright, or Emergency red. You can still tweak ambient light and fog after picking a preset.</p>\n<p>To paint floors faster, use the <b>Properties</b> dropdowns at the top of the right panel (wall, floor, ceiling, height, door, light level). They edit the hovered cell, or every cell in a Select-tool rectangle.</p>\n<p><b>Music:</b> pick <i>Playlist</i> to shuffle the bundled tracks, a single track, or <i>Synth ambient</i>, the built-in generative music that works offline. Ten CC BY 4.0 tracks ship with the editor (metal, industrial, dark synth, trap, hip-hop). During play, open Pause \u2192 <b>Music player</b> to switch tracks and see their credits. To add your own music, put MP3s in <code>assets/music/</code> and list them in <code>MUSIC_TRACKS</code> in <code>dmbtech1.js</code>. Only use music you have the rights to (CC0 or CC BY), never someone else's songs without a license, and credit it.</p></section>\n\n<section id=\"h-script\"><h2>Level scripting</h2>\n<p>Menu \u2192 Code editor \u2192 <b>script.js</b>. Scripts react to events: <code>start</code>, <code>tick</code>(dt), <code>kill</code>(type), <code>pickup</code>(type), <code>door</code>, <code>use</code>({x,y}) and <code>exit</code>.</p>\n<pre>api.on('start', () =&gt; api.message('Find the red keycard.'));\napi.on('kill', () =&gt; { if (api.enemiesLeft() === 0) { api.message('Vault unlocked'); api.openDoor(20, 8); } });\napi.on('use', c =&gt; { if (c.x === 5 &amp;&amp; c.y === 9) api.giveAmmo('rockets', 2); });</pre>\n<p>API: <code>message(t)</code>, <code>heal(n)</code>, <code>giveArmor(n)</code>, <code>giveAmmo(type, n)</code>, <code>openDoor(x, y)</code>, <code>enemiesLeft()</code>, <code>kills()</code>, <code>time()</code>, <code>win()</code>, <code>sound(name)</code> and <code>player</code> {x, y, hp, armor, keys}.</p></section>\n\n<section id=\"h-share\"><h2>Saving, exporting &amp; publishing</h2>\n<ul><li><b>Projects:</b> Menu \u2192 Projects keeps named save slots in this browser.</li>\n<li><b>Backups:</b> Export project file (.json) and Import project file. Old DOOMFORGE projects and saves are imported automatically.</li>\n<li><b>Export game:</b> makes one .html file with your levels. The 3D models and music load from where RetroEngine is hosted. Offline, the game falls back to built-in models and synth music, so it always works.</li>\n<li><b>Publish:</b> put the whole <code>retroengine/</code> folder (with <code>assets/</code>) on any static host, such as GitHub Pages, Netlify or itch.io (HTML5), and share the link.</li></ul></section>\n\n<section id=\"h-sharemaps\"><h2>Sharing your maps</h2>\n<p>Send a single level to a friend in one of two ways. Find both in the <b>Level</b> tab under <i>Share this level</i>, or in the Menu.</p>\n<ul><li><b>Share link:</b> the whole level is compressed into the link itself (the part after <code>#map=</code>), so no server or account is needed. On a phone, the share sheet opens (Messages, WhatsApp, Discord\u2026). On a computer, the link is copied. Opening the link loads the level and drops you straight into Playtest. Press <i>Back to editor</i> to look at how it was built, and it is added to your project as a new level.</li>\n<li><b>Export .retro file:</b> a small file holding the level plus any custom models (including uploaded .glb files). Use it when a level is too big for a link (about 7 KB). RetroEngine tells you when that happens. To open one, use Menu \u2192 <b>Import level (.retro)</b>, or drag the file onto the editor. On phones you pick it from Files, Drive or Downloads.</li></ul>\n<p><b>Safety:</b> level scripts from other people are <b>switched off</b> when you import. The Level tab shows a warning, and you can review the code in <i>Edit level script</i> and press Apply to turn it on. Imported files are checked for size, map dimensions and valid entities. A whole project .json also works with Import level.</p>\n<p><b>Tip:</b> links only work for others when RetroEngine is hosted (for example on GitHub Pages). A copy opened from a file on your own device makes links that only work there.</p></section>\n\n<section id=\"h-mobile\"><h2>Phones &amp; tablets</h2>\n<ul><li>Works in Chrome, Samsung Internet, Firefox, Safari (iPhone/iPad) and in-app browsers. Everything is touch-first: no mouse, keyboard or pointer lock needed.</li>\n<li><b>Editor:</b> one finger uses the tool, two fingers pan and pinch-zoom the map. The <i>Panel</i> button opens the side panel as a sheet.</li>\n<li><b>Game:</b> use the <b>Full screen</b> button (where the browser supports it) to hide the address bar. Turn the phone sideways for the best view. Sound starts on your first tap (a phone rule).</li>\n<li><b>Graphics quality: Auto</b> (the default) picks settings for your device and lowers the resolution on the fly to keep the game smooth. Choose Low/Medium/High in Settings to fix it.</li>\n<li>If a phone can't run 3D (no WebGL), Playtest explains why and the editor keeps working. Try another browser, or turn off battery saver.</li></ul></section>\n\n<section id=\"h-models\"><h2>Custom 3D models</h2>\n<p>Project \u2192 <b>Custom 3D models</b> lets you replace any enemy or prop with your own <code>.glb</code> file or URL. Models are auto-scaled and placed on the floor. Animated models use clips named Idle, Walk/Run, Shoot/Attack, HitReact and Death. Use only CC0 or CC-BY models, credit the authors, and keep files under about 2 MB because uploads are stored in the project.</p></section>\n\n<section id=\"h-trouble\"><h2>Troubleshooting</h2>\n<ul><li><b>Black screen or \"needs Three.js\":</b> the 3D engine loads from a CDN the first time, so connect to the internet once.</li>\n<li><b>Enemies look like simple robots and the music is synth:</b> the asset pack couldn't load. That happens when the page is opened straight from a file (file://) with no internet. Open it through a web server, or from the hosted link.</li>\n<li><b>Mouse look doesn't lock:</b> some in-app browsers block pointer lock. Drag to look instead.</li>\n<li><b>Slow on a phone:</b> keep Graphics quality on Auto, or choose Low. Close other apps, and turn off battery saver (it limits the frame rate).</li>\n<li><b>Share link does nothing:</b> some in-app browsers block the share sheet and clipboard. Select the link text in the box and copy it, or export a .retro file.</li>\n<li><b>\"3D not available\":</b> the browser has WebGL turned off or blocked. Open the page in a full browser (not an in-app one) and enable hardware acceleration.</li>\n<li><b>Storage full:</b> browser storage is about 5\u201310 MB. Remove uploaded models, or export a JSON backup and start a new project.</li></ul></section>\n\n<section id=\"h-credits\"><h2>Credits</h2><p>3D models by Quaternius: characters and weapons from Poly Pizza (CC0); arena player mechs (George, Leela, Mike, Stan) from the Animated Mech Pack (CC0); SWAT (CC0); Sci Fi Character (CC-BY, credit Quaternius); environment props from the Sci-Fi Essentials Kit and Modular Sci-Fi MegaKit (Standard, CC0). Music by Kevin MacLeod and Shane Ivers (CC BY 4.0), including the 1.2.0 tracks Hitman, Volatile Reaction, Industrial Revolution, Crypto and Danger Storm (Kevin MacLeod). Textures, fallback props, pickups and sounds are original procedural work. Three.js (MIT). See <a href=\"CREDITS.md\">CREDITS.md</a> for every asset, its license and its source URL.</p></section>";
function openHelp(first) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const quick = `<div class="help-steps">
    <div><i>1</i><span><b>Build.</b> Pick <b>Wall</b> or <b>Rect</b> in the tool bar and paint on the map. The <b>Build</b> tab has textures, door types and floor heights (stairs & catwalks).</span></div>
    <div><i>2</i><span><b>Stamp rooms.</b> Open <b>Rooms</b> for ready-made buildings: arena, server room, warehouse, bunker, guard tower and more. Tap one, then tap the map. Press ⟳ to rotate.</span></div>
    <div><i>3</i><span><b>Add things.</b> In <b>Things</b>, choose soldiers, drones, walkers, health, ammo, weapons, keys, props and lights. Every level needs a <b>Start</b> and an <b>Exit pad</b>.</span></div>
    <div><i>4</i><span><b>Play & share.</b> Press <b>Play</b> to test. <b>Export</b> makes a single .html game file. Your work autosaves in this browser.</span></div></div>
    <div class="keys">${touch ? '<span>1 finger</span><span>use the tool</span><span>2 fingers</span><span>pan & pinch-zoom</span><span>Panel button</span><span>show / hide the side panel</span>' : ''}
    <kbd>V H B F C U R G E D T S I</kbd><span>tools: select, pan, wall, floor, ceiling, height, rect, fill, erase, door, thing, start, picker</span>
    <kbd>Ctrl+Z / Ctrl+Y</kbd><span>undo / redo</span><kbd>Ctrl+C / X / V</kbd><span>copy, cut, paste an area (Select tool)</span><kbd>Del</kbd><span>delete selection</span>
    <kbd>Space + drag</kbd><span>pan · wheel = zoom · <kbd>0</kbd> fit</span><kbd>[ ]</kbd><span>previous / next texture</span><kbd>P</kbd><span>playtest</span><kbd>Esc</kbd><span>cancel</span></div>`;
  const manual = `<div class="help-doc">${HELP_HTML || '<p>Open help.html for the full manual.</p>'}</div>`;
  modal({ title: first ? 'Welcome to RetroEngine' : 'Help', wide: true,
    body: `<div class="help-tabs"><button class="tb sm accent" data-ht="quick">Quick start</button><button class="tb sm" data-ht="manual">Full manual</button><a class="tb sm" href="tutorial/" target="_blank" rel="noopener">Tutorial ↗</a><a class="tb sm" href="help.html" target="_blank" rel="noopener">help.html ↗</a></div>
      <div class="tut-cta"><div><b>New here?</b><span>Build and play your first level in about 5 minutes, step by step.</span></div><button class="tb primary" data-tut="1">Start tutorial</button></div>
      <div class="help-body">${quick}</div>`,
    buttons: [{ label: first ? 'Skip for now' : 'Close', value: 1 }],
    onOpen: (bk, close) => bk.addEventListener('click', e => {
      const t = e.target.closest('[data-ht]'); if (t) { $$('[data-ht]', bk).forEach(b => b.classList.toggle('accent', b === t)); $('.help-body', bk).innerHTML = t.dataset.ht === 'quick' ? quick : manual; $('.help-body', bk).scrollTop = 0; }
      if (e.target.closest('[data-tut]')) { close(0); startTutorial(); }
    }) });
  try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
}

/* ---------- interactive tutorial: "build your first level" (coach marks) ----------
   Each step highlights a control and waits until you have done the action (check()). */
ED.stats = { stamps: 0 };
const TUT = { i: -1, el: null, ring: null, timer: 0, base: null };
function tutCount(pred) { return L().ents.filter(pred).length; }
const TUT_STEPS = [
  { t: 'Your first level', d: 'We made you a fresh, empty level called <b>My First Level</b>. In the next few minutes you will build rooms, add enemies and play it. Tap <b>Next</b>.', aim: () => ({ el: $('[data-ta="next"]', TUT.el) }) },
  { t: 'Draw a room', d: 'Pick the <b>Rect</b> tool, then drag a rectangle on the map (follow the arrow). That builds a room with walls around it.', check: () => L().wall.filter(Boolean).length > TUT.base.walls + 6,
    aim: () => ED.tool !== 'rect' ? { el: '[data-tool="rect"]' } : tutDrag() },
  { t: 'Stamp a building', d: 'Open the <b>Rooms</b> library, tap any room (try <b>Bunker</b> or <b>Server Room</b>), then tap an empty part of the map to stamp it.', check: () => ED.stats.stamps > TUT.base.stamps,
    aim: () => ED.stamp ? tutCell((x, y, lv) => tutFree(lv, x, y, 3) ? 10 - Math.abs(x - lv.w * 0.65) - Math.abs(y - lv.h * 0.5) : null)
      : tutShown($('[data-tpl]')) ? { el: '[data-tpl]' } : { el: '[data-tool="rooms"]' } },
  { t: 'Add a door', d: 'Pick the <b>Door</b> tool and tap a wall between two rooms (the arrow shows a good spot).', check: () => L().kind.filter(Boolean).length > TUT.base.doors,
    aim: () => ED.tool !== 'door' ? { el: '[data-tool="door"]' } : tutCell((x, y, lv) => {
      const w = (a, b) => a < 0 || b < 0 || a >= lv.w || b >= lv.h || !!lv.wall[b * lv.w + a];
      if (!w(x, y) || lv.kind[y * lv.w + x] || isSpawnCell(x, y)) return null;
      if (x === 0 || y === 0 || x === lv.w - 1 || y === lv.h - 1) return (x === 0 || x === lv.w - 1) && (y === 0 || y === lv.h - 1) ? null : 0.5 - Math.abs(x - lv.w / 2) / 1000;
      return (!w(x - 1, y) && !w(x + 1, y)) || (!w(x, y - 1) && !w(x, y + 1)) ? 10 : 1; }) },
  { t: 'Place the player', d: 'Pick the <b>Start</b> tool and tap where the player should begin. Tap again to turn them.', check: () => L().spawn.x !== TUT.base.sx || L().spawn.y !== TUT.base.sy,
    aim: () => ED.tool !== 'spawn' ? { el: '[data-tool="spawn"]' } : tutFloor(d => d > 2.5 && d < 9 ? 10 - d : null) },
  { t: 'Add enemies', d: 'Pick the <b>Thing</b> tool. We selected the <b>Soldier</b>. Tap the map 2–3 times to place enemies (not too close to the start).', enter: () => { ED.brush.thing = { t: 'enemy', s: 'grunt' }; }, check: () => tutCount(e => e.t === 'enemy') >= TUT.base.enemies + 2,
    aim: () => ED.tool !== 'thing' ? { el: '[data-tool="thing"]' } : tutFloor((d, x, y) => d > 6 && !tutThingAt(x, y) ? 20 - Math.abs(d - 10) : null) },
  { t: 'Give the player supplies', d: 'Now we selected <b>Ammo</b>. Tap to drop a box or two near the start. You can pick health, armor and weapons in the <b>Things</b> tab.', enter: () => { ED.brush.thing = { t: 'pickup', s: 'ammo_bullets' }; if (ED.tool !== 'thing') setTool('thing'); }, check: () => tutCount(e => e.t === 'pickup') > TUT.base.pickups,
    aim: () => ED.tool !== 'thing' ? { el: '[data-tool="thing"]' } : tutFloor((d, x, y) => d > 1.2 && d < 4 && !tutThingAt(x, y) ? 10 - d : null) },
  { t: 'Add the exit', d: 'Every level needs a way out. We selected the <b>Exit pad</b>. Tap the far end of your level.', enter: () => { ED.brush.thing = { t: 'exit', s: '' }; if (ED.tool !== 'thing') setTool('thing'); }, check: () => tutCount(e => e.t === 'exit') > 0,
    aim: () => ED.tool !== 'thing' ? { el: '[data-tool="thing"]' } : tutFloor((d, x, y) => !tutThingAt(x, y) ? d : null) },
  { t: 'Play it!', d: 'Press <b>Play</b>. Fight to the exit pad. Use WASD + mouse, or the touch sticks. Come back with Pause → Back to editor.', check: () => TUT.played, aim: () => ({ el: '[data-cmd="play"]' }) },
  { t: 'You made a game', d: 'Nice work! Next steps: add lights and props, try keycard doors, set the sky and music in the <b>Level</b> tab, then share it: the <b>Level</b> tab → <b>Share link</b> sends the level in a link that opens straight into the game, and <b>Export</b> makes a playable .html. Help (Menu → Help) has the full manual.', aim: () => ({ el: '[data-cmd="export"]' }) }
];
/* --- tutorial pointer helpers: aim at the exact element or map cell the player must touch next --- */
function tutShown(el) { // visible on screen and not covered by something else
  if (!el) return false; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false;
  const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
  const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t));
}
function tutCellXY(x, y) { const D = ED.view, r = $('#grid').getBoundingClientRect(); return [r.left + D.ox + (x + 0.5) * D.cs, r.top + D.oy + (y + 0.5) * D.cs]; }
function tutOnMap(x, y) { const p = tutCellXY(x, y); if (p[0] < 0 || p[1] < 0 || p[0] > innerWidth || p[1] > innerHeight) return false; const t = document.elementFromPoint(p[0], p[1]); return !!t && t.id === 'grid'; }
function tutFree(lv, x, y, r) { for (let j = y - r; j <= y + r; j++) for (let i = x - r; i <= x + r; i++) { if (i < 1 || j < 1 || i >= lv.w - 1 || j >= lv.h - 1 || lv.wall[j * lv.w + i]) return false; } return true; }
function tutThingAt(x, y) { return (L().ents || []).some(e => Math.floor(e.x) === x && Math.floor(e.y) === y); }
function tutCell(score) { // best visible map cell by score(x, y, lv); null score = not allowed
  const lv = L(); let best = null, bs = -1e9;
  for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) { const s = score(x, y, lv); if (s == null || s <= bs || !tutOnMap(x, y)) continue; bs = s; best = [x, y]; }
  return best ? { cell: best } : (document.body.classList.contains('sheet') ? { el: '[data-cmd="sheet"]' } : null);
}
function tutFloor(f) { const lv = L(), sp = lv.spawn; return tutCell((x, y) => lv.wall[y * lv.w + x] ? null : f(Math.hypot(x + 0.5 - sp.x, y + 0.5 - sp.y), x, y)); }
function tutDrag() { // an empty patch to drag a rectangle across
  const lv = L(); let a = null;
  for (const sz of [6, 5, 4, 3]) { const c = tutCell((x, y) => x + sz < lv.w - 1 && y + sz < lv.h - 1 && tutFree(lv, x + (sz >> 1), y + (sz >> 1), sz >> 1) && tutOnMap(x + sz, y + sz) ? -Math.abs(x - 3) - Math.abs(y - 4) : null); if (c && c.cell) { a = c.cell; a.push(sz); break; } }
  return a ? { cell: [a[0], a[1]], to: [a[0] + a[2], a[1] + a[2]] } : tutCell((x, y) => lv.wall[y * lv.w + x] ? null : 0);
}
const TUT_ARROW = '<svg viewBox="0 0 24 32" width="30" height="40" aria-hidden="true"><path d="M2 2 L2 25 L8 19.5 L12 29 L16.5 27 L12.5 18 L20.5 18 Z" fill="#fff" stroke="#000" stroke-width="2" stroke-linejoin="round"/></svg>';
function startTutorial() {
  stopTutorial();
  ED.project.levels.push(blankLevel('My First Level', 28, 20)); switchLevel(ED.project.levels.length - 1); fitView();
  TUT.played = false; TUT.el = document.createElement('div'); TUT.el.id = 'tut'; TUT.ring = document.createElement('div'); TUT.ring.id = 'tut-ring';
  TUT.hand = document.createElement('div'); TUT.hand.id = 'tut-hand'; TUT.hand.innerHTML = `<div class="mv"><div class="fl"><div class="bob">${TUT_ARROW}</div></div></div>`;
  document.body.appendChild(TUT.ring); document.body.appendChild(TUT.el); document.body.appendChild(TUT.hand);
  TUT.el.addEventListener('click', e => { const a = e.target.closest('[data-ta]'); if (!a) return; const v = a.dataset.ta; if (v === 'next' || v === 'skip') tutGo(TUT.i + 1); else if (v === 'back') tutGo(TUT.i - 1); else stopTutorial(); });
  TUT.onAct = () => { TUT.act = Date.now(); }; TUT.onResize = () => setTimeout(tutTick, 60);
  document.addEventListener('pointerdown', TUT.onAct, true); document.addEventListener('keydown', TUT.onAct, true);
  window.addEventListener('resize', TUT.onResize); window.addEventListener('orientationchange', TUT.onResize);
  tutGo(0); TUT.timer = setInterval(tutTick, 250);
}
function tutGo(i) {
  if (i >= TUT_STEPS.length) { stopTutorial(); toast('Tutorial complete — have fun building!', 'ok'); return; }
  TUT.i = Math.max(0, i); const st = TUT_STEPS[TUT.i], lv = L();
  TUT.base = { walls: lv.wall.filter(Boolean).length, doors: lv.kind.filter(Boolean).length, stamps: ED.stats.stamps, sx: lv.spawn.x, sy: lv.spawn.y, enemies: tutCount(e => e.t === 'enemy'), pickups: tutCount(e => e.t === 'pickup') };
  if (st.enter) st.enter();
  TUT.act = TUT.t0 = Date.now(); TUT.lastEl = null;
  TUT.el.innerHTML = `<div class="tut-top"><span class="tut-n">Step ${TUT.i + 1} of ${TUT_STEPS.length}</span><button class="tut-x" data-ta="close" title="Close tutorial">✕</button></div><h3>${st.t}</h3><p>${st.d}</p>
    <div class="tut-dots">${TUT_STEPS.map((_, k) => `<i class="${k < TUT.i ? 'done' : k === TUT.i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="tut-btns">${TUT.i ? '<button class="tb sm" data-ta="back">Back</button>' : ''}<span class="tut-wait">${st.check ? 'Waiting for you…' : ''}</span><button class="tb sm" data-ta="skip" hidden>Skip step</button><button class="tb sm primary" data-ta="next" ${st.check ? 'disabled' : ''}>${TUT.i === TUT_STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
  tutTick();
}
function tutTick() {
  if (!TUT.el) return; const st = TUT_STEPS[TUT.i];
  const playing = $('#play-host').classList.contains('on'); if (playing) TUT.played = true;
  const hide = playing || !!$('.modal-back');
  TUT.el.style.display = TUT.ring.style.display = TUT.hand.style.display = hide ? 'none' : '';
  const nb = $('[data-ta="next"]', TUT.el), sk = $('[data-ta="skip"]', TUT.el);
  if (st.check && nb && nb.disabled && st.check()) { nb.disabled = false; if (sk) sk.hidden = true; const w = $('.tut-wait', TUT.el); w.textContent = '✓ Done!'; w.classList.add('ok'); Sound_ok(); setTimeout(() => { if (TUT_STEPS[TUT.i] === st) tutGo(TUT.i + 1); }, 900); }
  const now = Date.now(), idle = now - (TUT.act || now) > 6000;
  if (sk && nb && nb.disabled && now - TUT.t0 > 25000 && idle) sk.hidden = false; // never trap the player on a step
  if (hide) return;
  // where should the player touch next?
  let a = null; try { a = st.aim && st.aim(); } catch (e) { a = null; }
  let rect = null, tip = null, to = null;
  if (a && a.el) {
    let el = typeof a.el === 'string' ? $(a.el) : a.el;
    if (el && !tutShown(el) && el !== TUT.lastEl && el.scrollIntoView) { el.scrollIntoView({ block: 'nearest', inline: 'center' }); }
    if (el) TUT.lastEl = el;
    if (el && !el.getBoundingClientRect().width) el = $('[data-cmd="menu"]'); // hidden inside a collapsed menu: point at its opener
    if (el) { const r = el.getBoundingClientRect(); rect = { l: r.left, t: r.top, w: r.width, h: r.height }; tip = [r.left + r.width * 0.62, r.top + r.height * 0.62]; }
  } else if (a && a.cell) {
    const cs = ED.view.cs, p = tutCellXY(a.cell[0], a.cell[1]); rect = { l: p[0] - cs / 2, t: p[1] - cs / 2, w: cs, h: cs }; tip = p;
    if (a.to) to = tutCellXY(a.to[0], a.to[1]);
  }
  if (rect) Object.assign(TUT.ring.style, { left: rect.l - 4 + 'px', top: rect.t - 4 + 'px', width: rect.w + 8 + 'px', height: rect.h + 8 + 'px', opacity: 1 });
  else TUT.ring.style.opacity = 0;
  const H = TUT.hand;
  if (!tip) { H.style.opacity = 0; return; }
  H.style.opacity = 1; H.style.left = tip[0] + 'px'; H.style.top = tip[1] + 'px';
  // flip the arrow so it stays on screen (it points up-left by default, body below-right of the tip)
  H.classList.toggle('fx', tip[0] > innerWidth - 44); H.classList.toggle('fy', tip[1] > innerHeight - 56);
  H.classList.toggle('idle', idle); H.classList.toggle('drag', !!to);
  if (to) { H.style.setProperty('--dx', to[0] - tip[0] + 'px'); H.style.setProperty('--dy', to[1] - tip[1] + 'px'); }
  H.dataset.x = Math.round(tip[0]); H.dataset.y = Math.round(tip[1]); if (to) { H.dataset.tx = Math.round(to[0]); H.dataset.ty = Math.round(to[1]); } else { delete H.dataset.tx; delete H.dataset.ty; }
}
function Sound_ok() { try { RT.Sound.init(); RT.Sound.play('pickup'); } catch (e) {} }
function stopTutorial() {
  clearInterval(TUT.timer); if (TUT.el) TUT.el.remove(); if (TUT.ring) TUT.ring.remove(); if (TUT.hand) TUT.hand.remove();
  if (TUT.onAct) { document.removeEventListener('pointerdown', TUT.onAct, true); document.removeEventListener('keydown', TUT.onAct, true); window.removeEventListener('resize', TUT.onResize); window.removeEventListener('orientationchange', TUT.onResize); }
  TUT.el = TUT.ring = TUT.hand = TUT.onAct = null; TUT.i = -1;
}

/* ---------- top bar commands ---------- */
$('#topbar').addEventListener('click', e => {
  const b = e.target.closest('[data-cmd]'); if (b) runCmd(b.dataset.cmd);
});
$('#zoom-dock').addEventListener('click', e => { const b = e.target.closest('[data-cmd]'); if (b) runCmd(b.dataset.cmd); });
$('#btn-project').addEventListener('click', openProjects);
document.addEventListener('input', ev => {
  const t = ev.target;
  if (!t) return;
  if (t.closest && t.closest('#props-dock') && t.dataset.cp) { applyCellProp(t.dataset.cp, t.value); }
});
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-ex-lvl], [data-ex-script], [data-ex-act], [data-ex-pack]');
  if (!b) return;
  if (b.dataset.exLvl !== undefined) { switchLevel(+b.dataset.exLvl); document.body.classList.remove('exsheet'); }
  else if (b.dataset.exPack !== undefined) {
    document.body.classList.remove('exsheet');
    loadPackLevel(b.dataset.exPack).then(lv => { playtest(0, { levelOverride: lv }); }).catch(e => toast('Could not load that trial map: ' + e.message, 'bad'));
  }
  else if (b.dataset.exScript !== undefined) { switchLevel(+b.dataset.exScript); openTab('level'); runAct('script'); document.body.classList.remove('exsheet'); }
  else if (b.dataset.exAct === 'models') { openTab('level'); document.body.classList.remove('exsheet'); if (innerWidth <= 720) document.body.classList.add('sheet'); }
});
function runCmd(c) {
  if (c === 'undo') undo(); else if (c === 'redo') redo(); else if (c === 'play') playtest(); else if (c === 'export') openExport(); else if (c === 'menu') openMenu();
  else if (c === 'zoomIn') setZoom(ED.view.cs * 1.25); else if (c === 'zoomOut') setZoom(ED.view.cs / 1.25); else if (c === 'fit') fitView();
  else if (c === 'sheet') { document.body.classList.toggle('sheet'); document.body.classList.remove('exsheet'); }
  else if (c === 'explorer') { document.body.classList.toggle('exsheet'); document.body.classList.remove('sheet'); }
}

/* ---------- start the editor ---------- */
function boot() {
  try { const s = localStorage.getItem(AUTOSAVE_KEY); ED.project = s ? normalizeProject(JSON.parse(s)) : starterProject(); }
  catch (e) { console.warn('RetroEngine: autosave unreadable, loading starter project', e); ED.project = starterProject(); }
  buildToolbar(); setTool('select'); updateProjectBtn(); refreshLevelSelect(); renderPanel(); renderExplorer(); refreshPropsDock(true); updateUndoBtns();
  resizeCanvas(); fitView(); updateStatus();
  const sp = document.getElementById('splash'); if (sp) { sp.style.opacity = '0'; setTimeout(() => sp.remove(), 450); }
  window.addEventListener('resize', () => { resizeCanvas(); });
  if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe($('#stage'));
  // phones: address bar / rotation / keyboard change the visible area; iOS ignores user-scalable=no, so block page pinch
  const later = () => { resizeCanvas(); setTimeout(resizeCanvas, 300); };
  window.addEventListener('orientationchange', later); if (window.visualViewport) window.visualViewport.addEventListener('resize', later);
  ['gesturestart', 'gesturechange'].forEach(e => document.addEventListener(e, ev => ev.preventDefault(), { passive: false }));
  let seen = false; try { seen = !!localStorage.getItem(SEEN_KEY); } catch (e) {}
  if (/^#map=/.test(location.hash)) openFromHash(); else if (/^#pack=/.test(location.hash)) openFromPack(); else if (!seen) openHelp(true);
  loadPackCatalog();
  MP = installMultiplayer({
    RT, toast,
    getProject: () => ED.project,
    playtest, stopPlaytest,
    getPlayHandle: () => playHandle,
    getPackLevels, loadPackLevel, applySpawnIndex, applySpawnPoint,
    getStarterLevels: listStarterLevels, loadStarterLevel
  });
  // Debug / test hook (used by the automated tests)
  window.RETROENGINE = window.DOOMFORGE_IDE = { VERSION, packLevel, unpackLevel, encodeMap, decodeMap, inflateRaw, shareLink, exportLevelFile, importLevelText, openFromHash, openFromPack, ED, RT, L, setTool, startTutorial, stopTutorial, tutGo, openHelp, openAbout, get tut() { return TUT; }, placeStamp, startStamp, playtest, stopPlaytest, buildStandaloneHtml, loadProject, normalizeProject, undo, redo, regionData, fitView, get play() { return playHandle; }, TEMPLATES, tplData, autosave, describeCell, applyCellProp, applyLightPreset, updateCellReadout, renderExplorer, refreshPropsDock, openMultiplayer: () => MP && MP.openLobby(), get mp() { return MP; }, loadPackCatalog, loadPackLevel, getPackLevels, applySpawnIndex, applySpawnPoint, listStarterLevels, loadStarterLevel, starterLevelSlug, get packMaps() { return PACK_MAPS; } };
}
boot();
})();
