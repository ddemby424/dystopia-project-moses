/*
 * lobby.js — phone-friendly room browser for DMB Tech 1.
 *
 * This is just a menu. It talks to the server through mp.js:
 *
 *   connect(url, null, profile)  ≈  open the phone line and ask for the lobby
 *   on('rooms', list => …)       ≈  Winsock_DataArrival, a fresh room list
 *   createRoom({ name, level })  ≈  "make a new table, I'm the host"
 *   joinRoom(id)                 ≈  walk into an existing table
 *   listRooms()                  ≈  the Refresh button
 *
 * Usage:
 *
 *   import { mountLobby } from './lobby.js';
 *   const lobby = mountLobby(document.getElementById('root'), {
 *     url: 'ws://localhost:8080/ws',
 *     playerName: 'Darcy',
 *     levels: [ { id: 'e1m1', name: 'Factory Yard' } ],
 *     characters: [ { id: 'george', name: 'George' } ],  // picker hook
 *     onJoin(info) { ... }   // fired after a successful welcome
 *   });
 *   // later: lobby.destroy();
 *
 * The character picker is a hook: pass `characters` and the menu draws a
 * dropdown. The chosen id is sent as modelId when you Create or Join,
 * which is what the 1.2 player models will use.
 */

import { connect } from './mp.js?v=1.6.1';   // 1.6.1: same cache-busted URL as mp-dmbtech1.js (one shared module)

// Fallback lists so the menu works even if the caller passes nothing.
const DEFAULT_LEVELS = [
  { id: 'e1m1', name: 'Factory Yard' },
  { id: 'e1m2', name: 'Labs' },
  { id: 'e1m3', name: 'Reactor' },
  { id: 'clean-lab', name: 'Clean Lab' },
  { id: 'med-bay', name: 'Med Bay' }
];
const DEFAULT_CHARACTERS = [
  { id: 'george', name: 'George' },
  { id: 'leela', name: 'Leela' },
  { id: 'mike', name: 'Mike' },
  { id: 'stan', name: 'Stan' }
];

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function optionList(select, items, valueKey, labelKey) {
  select.innerHTML = '';
  (items || []).forEach(function (item) {
    const o = document.createElement('option');
    o.value = item[valueKey];
    o.textContent = item[labelKey];
    select.appendChild(o);
  });
}

// A small inline SVG chevron for the dropdowns (no icon font, no extra download).
const CHEVRON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * 1.6.1: a clean custom dropdown for the character picker (a native <option> cannot show a picture).
 * The real <select> stays the source of truth: picking here sets select.value and fires 'change',
 * and a 'change' from anywhere else (the miniature grid) updates this button.
 * Each item: { id, name, thumb?, sub? }.
 */
function makeDropdown(select, items, label) {
  const box = el('div', 'mpl-dd');                                   // wrapper: button + popup list
  const btn = el('button', 'mpl-dd-btn');                            // looks like a text field with a chevron
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'listbox');                     // screen readers: this opens a list
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', label);
  const icon = el('img', 'mpl-dd-ico'); icon.alt = '';               // miniature of the current pick
  const text = el('span', 'mpl-dd-text');                            // its name
  const chev = el('span', 'mpl-dd-chev'); chev.innerHTML = CHEVRON;  // the chevron icon
  btn.appendChild(icon); btn.appendChild(text); btn.appendChild(chev);
  const list = el('div', 'mpl-dd-list');                             // popup list (position: fixed, so no parent clips it)
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  items.forEach(function (it) {                                      // one row per character: miniature + name + licence
    const o = el('button', 'mpl-dd-opt');
    o.type = 'button'; o.setAttribute('role', 'option'); o.dataset.id = it.id;
    if (it.thumb) { const im = el('img'); im.src = it.thumb; im.alt = ''; im.onerror = function () { im.remove(); }; o.appendChild(im); }
    const t = el('span', 'mpl-dd-name', it.name);
    o.appendChild(t);
    if (it.sub) o.appendChild(el('small', '', it.sub));
    o.addEventListener('click', function () { choose(it.id); close(); btn.focus(); });
    list.appendChild(o);
  });
  box.appendChild(btn); document.body.appendChild(list);             // list lives on <body> so overflow never cuts it
  function sync() {                                                  // show the current select value on the button
    const it = items.find(function (x) { return x.id === select.value; }) || items[0] || { name: '' };
    text.textContent = it.name;
    if (it.thumb) { icon.src = it.thumb; icon.hidden = false; } else icon.hidden = true;
    list.querySelectorAll('.mpl-dd-opt').forEach(function (o) {
      const on = o.dataset.id === select.value;
      o.classList.toggle('on', on); o.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }
  function choose(id) {                                              // user picked a row
    if (select.value === id) return;
    select.value = id;
    select.dispatchEvent(new Event('change'));                       // the lobby + the 3D preview listen for this
  }
  function place() {                                                 // open under the button, or above it if there is no room
    const r = btn.getBoundingClientRect(), vh = window.innerHeight;
    const below = vh - r.bottom - 8, above = r.top - 8;
    const up = below < 180 && above > below;                         // flip up near the bottom of a short screen
    list.style.left = Math.round(r.left) + 'px';
    list.style.width = Math.round(r.width) + 'px';
    list.style.maxHeight = Math.round(Math.max(120, up ? above : below)) + 'px';
    list.style.top = up ? '' : Math.round(r.bottom + 4) + 'px';
    list.style.bottom = up ? Math.round(vh - r.top + 4) + 'px' : '';
  }
  function open() {
    if (!list.hidden) return;
    place(); list.hidden = false; btn.setAttribute('aria-expanded', 'true'); box.classList.add('open');
    const on = list.querySelector('.mpl-dd-opt.on') || list.querySelector('.mpl-dd-opt');
    if (on) { on.focus({ preventScroll: true }); on.scrollIntoView({ block: 'nearest' }); }
    setTimeout(function () { document.addEventListener('pointerdown', outside, true); }, 0);
    window.addEventListener('resize', close); window.addEventListener('scroll', onScroll, true);
  }
  function close() {
    if (list.hidden) return;
    list.hidden = true; btn.setAttribute('aria-expanded', 'false'); box.classList.remove('open');
    document.removeEventListener('pointerdown', outside, true);
    window.removeEventListener('resize', close); window.removeEventListener('scroll', onScroll, true);
  }
  function outside(e) { if (!list.contains(e.target) && !btn.contains(e.target)) close(); }   // tap anywhere else closes it
  function onScroll(e) { if (!list.contains(e.target)) close(); }   // the page scrolled away under the list
  btn.addEventListener('click', function () { if (list.hidden) open(); else close(); });
  btn.addEventListener('keydown', function (e) {                    // arrow keys open it like a native select
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
  });
  list.addEventListener('keydown', function (e) {                   // arrows move, Escape closes
    const opts = Array.from(list.querySelectorAll('.mpl-dd-opt')), i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (opts[i + 1] || opts[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (opts[i - 1] || opts[opts.length - 1]).focus(); }
    else if (e.key === 'Escape' || e.key === 'Tab') { close(); btn.focus(); }
  });
  select.addEventListener('change', sync);                          // picks from the miniature grid update the button
  sync();
  return { el: box, sync: sync, close: close, destroy: function () { close(); list.remove(); } };
}

// A labelled form row: <label> on top, the control under it.
function field(labelText, control, id) {
  const f = el('div', 'mpl-field');
  const l = el('label', '', labelText);
  if (id) { control.id = id; l.htmlFor = id; }                       // tapping the label focuses the input
  f.appendChild(l); f.appendChild(control);
  return f;
}

// A styled native <select> (Android/iOS keep their own picker; desktop gets the same chevron look).
function nativeSelect(sel) {
  const wrap = el('div', 'mpl-select');
  const chev = el('span', 'mpl-dd-chev'); chev.innerHTML = CHEVRON;
  wrap.appendChild(sel); wrap.appendChild(chev);
  return wrap;
}

/**
 * Build the lobby UI inside `container` and open a WebSocket to the relay.
 * Returns { mp, destroy, refresh, setStatus }.
 *
 * 1.6.1 layout (fresh redesign, no "boxed neon card" look):
 *   header:  ‹ Back · "Multiplayer" title · connection dot      [ Play | Open rooms ] tabs on narrow screens
 *   Play:    live 3D preview + miniature grid  |  Name, Character dropdown (with miniatures), New room (name, Map, Create)
 *   Rooms:   flat rows with hairlines: room name, map · host, players, Join
 *   Wide screens (≥ 880px) show Play and Open rooms side by side and hide the tabs.
 */
export function mountLobby(container, options) {
  options = options || {};
  const levels = options.levels && options.levels.length ? options.levels : DEFAULT_LEVELS;
  const characters = options.characters && options.characters.length ? options.characters : DEFAULT_CHARACTERS;

  // ---- DOM ----------------------------------------------------------
  // One wrapper so our CSS can stay scoped under .mp-lobby and not
  // leak into the rest of a page (the editor, for example).
  const root = el('div', 'mp-lobby');
  root.dataset.tab = 'play';                                         // which pane narrow screens show
  container.innerHTML = '';
  container.appendChild(root);

  // Header: back, title, status, tabs.
  const top = el('header', 'mpl-top');
  const backBtn = el('button', 'mpl-back');
  backBtn.type = 'button';
  backBtn.setAttribute('data-mp-back', '1');                         // tests / host pages find Back by this
  backBtn.innerHTML = '<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Back</span>';
  const titleBox = el('div', 'mpl-title');
  titleBox.appendChild(el('h1', '', 'Multiplayer'));                 // normal mixed-case title
  const statusEl = el('div', 'mpl-status is-wait', 'Connecting…');   // dot + text (dot drawn in CSS)
  titleBox.appendChild(statusEl);
  const tabs = el('div', 'mpl-tabs');                                // segmented control: Play | Open rooms
  tabs.setAttribute('role', 'tablist');
  const tabPlay = el('button', 'mpl-tab on', 'Play');
  const tabRooms = el('button', 'mpl-tab', 'Open rooms');
  const roomCount = el('span', 'mpl-tab-n', '0');                    // live room count on the tab
  tabRooms.appendChild(roomCount);
  [tabPlay, tabRooms].forEach(function (t, i) {
    t.type = 'button'; t.setAttribute('role', 'tab');
    t.addEventListener('click', function () { setTab(i ? 'rooms' : 'play'); });
  });
  tabs.appendChild(tabPlay); tabs.appendChild(tabRooms);
  top.appendChild(backBtn); top.appendChild(titleBox); top.appendChild(tabs);
  root.appendChild(top);
  function setTab(t) {                                               // narrow screens: swap panes
    root.dataset.tab = t;
    tabPlay.classList.toggle('on', t === 'play'); tabRooms.classList.toggle('on', t === 'rooms');
    tabPlay.setAttribute('aria-selected', t === 'play'); tabRooms.setAttribute('aria-selected', t === 'rooms');
  }

  const body = el('div', 'mpl-body');
  root.appendChild(body);
  const playPane = el('div', 'mpl-pane mpl-play');                   // left: you + new room
  const roomsPane = el('div', 'mpl-pane mpl-roomspane');             // right: open rooms
  body.appendChild(playPane); body.appendChild(roomsPane);

  // In-room strip (shown after a successful join).
  const inRoom = el('div', 'mpl-inroom');
  inRoom.hidden = true;
  const inRoomText = el('div', '', '');
  const leaveBtn = el('button', 'mpl-btn', 'Leave');
  inRoom.appendChild(inRoomText);
  inRoom.appendChild(leaveBtn);
  playPane.appendChild(inRoom);

  // Character stage: the host's picker hook draws the live 3D preview + miniature grid in here.
  const stageCol = el('div', 'mpl-stagecol');
  const forms = el('div', 'mpl-forms');                              // name, character, new room
  const playGrid = el('div', 'mpl-playgrid');
  playGrid.appendChild(stageCol); playGrid.appendChild(forms);
  playPane.appendChild(playGrid);

  // "You": name + character dropdown.
  const you = el('section', 'mpl-you');
  you.appendChild(el('h2', 'mpl-h', 'Your fighter'));
  const nameInput = el('input');
  nameInput.type = 'text';
  nameInput.maxLength = 24;
  nameInput.value = options.playerName || 'Player';
  nameInput.autocomplete = 'nickname';
  nameInput.spellcheck = false;
  you.appendChild(field('Name', nameInput, 'mpl-name'));
  const charSelect = el('select');
  charSelect.setAttribute('data-hook', 'character'); // tests / host pages can find this
  optionList(charSelect, characters, 'id', 'name');
  if (options.playerModel) charSelect.value = options.playerModel;
  charSelect.hidden = true;                                          // the dropdown + miniatures drive it
  const charDD = makeDropdown(charSelect, characters.map(function (c) {
    return { id: c.id, name: c.name, thumb: c.thumb, sub: c.license };
  }), 'Character');
  const charField = el('div', 'mpl-field');
  charField.appendChild(el('label', '', 'Character'));
  charField.appendChild(charDD.el);
  you.appendChild(charField);
  forms.appendChild(you);
  if (typeof options.renderCharacterPicker === 'function') {
    // Host hook: draws the live preview + miniatures; it keeps using the same <select>.
    options.renderCharacterPicker(stageCol, charSelect);
    if (!charSelect.parentNode) stageCol.appendChild(charSelect);
  } else {
    stageCol.hidden = true; playGrid.classList.add('no-stage');      // no hook: just the dropdown
    you.appendChild(charSelect);
  }
  charDD.sync();
  charSelect.addEventListener('change', function () {
    if (typeof options.onCharacterChange === 'function') options.onCharacterChange(charSelect.value);
  });
  nameInput.addEventListener('change', function () {
    if (typeof options.onNameChange === 'function') options.onNameChange(nameInput.value);
  });

  // "New room": name + map (styled native select) + Create.
  const createSec = el('section', 'mpl-create');
  createSec.appendChild(el('h2', 'mpl-h', 'New room'));
  const roomNameInput = el('input');
  roomNameInput.type = 'text';
  roomNameInput.maxLength = 32;
  roomNameInput.placeholder = 'Night Shift';
  roomNameInput.spellcheck = false;
  const levelSelect = el('select');
  optionList(levelSelect, levels, 'id', 'name');
  const createRow = el('div', 'mpl-create-row');                    // room name + map side by side when there is room
  createRow.appendChild(field('Room name', roomNameInput, 'mpl-room'));
  createRow.appendChild(field('Map', nativeSelect(levelSelect)));
  levelSelect.id = 'mpl-map'; createRow.lastChild.firstChild.htmlFor = 'mpl-map';
  createSec.appendChild(createRow);
  const createBtn = el('button', 'mpl-btn primary block', 'Create room');
  createSec.appendChild(createBtn);
  const errEl = el('div', 'mpl-error', '');
  createSec.appendChild(errEl);
  forms.appendChild(createSec);

  // "Open rooms": header + flat list.
  const roomsSec = el('section', 'mpl-rooms');
  const roomsHead = el('div', 'mpl-rooms-head');
  roomsHead.appendChild(el('h2', 'mpl-h', 'Open rooms'));
  const refreshBtn = el('button', 'mpl-btn ghost', 'Refresh');
  refreshBtn.type = 'button';
  roomsHead.appendChild(refreshBtn);
  roomsSec.appendChild(roomsHead);
  const listEl = el('div', 'mpl-list');
  roomsSec.appendChild(listEl);
  roomsPane.appendChild(roomsSec);

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'mpl-status' + (kind ? ' is-' + kind : '');
  }

  function setError(text) { errEl.textContent = text || ''; }

  function currentProfile() {
    return {
      name: (nameInput.value || 'Player').trim() || 'Player',
      modelId: charSelect.value || (characters[0] && characters[0].id) || 'default'
    };
  }

  function levelLabel(id) {
    for (let i = 0; i < levels.length; i++) if (levels[i].id === id) return levels[i].name;
    return id;
  }

  // Draw the room rows. Full rooms get a disabled "Full" button
  // instead of Join — no point sending a request that will bounce.
  function renderRooms(list) {
    listEl.innerHTML = '';
    roomCount.textContent = String((list && list.length) || 0);      // count on the "Open rooms" tab
    if (!list || !list.length) {
      const empty = el('div', 'mpl-empty');
      empty.appendChild(el('b', '', 'No open rooms yet'));
      empty.appendChild(el('span', '', 'Create one and it shows up here for everyone.'));
      listEl.appendChild(empty);
      return;
    }
    list.forEach(function (room) {
      const full = room.players >= room.max;
      const card = el('article', 'mpl-card' + (full ? ' is-full' : ''));
      const left = el('div', 'mpl-card-main');
      left.appendChild(el('div', 'mpl-card-title', room.name || room.id));
      const meta = el('div', 'mpl-card-meta');
      const levelName = room.levelName || levelLabel(room.level) || room.level || '';
      meta.appendChild(document.createTextNode(levelName + '  ·  host ' + (room.host || '—')));
      left.appendChild(meta);
      const names = el('div', 'mpl-names', (room.names && room.names.length) ? room.names.join(' · ') : '');
      left.appendChild(names);
      const count = el('div', 'mpl-count', String(room.players) + '/' + String(room.max));
      const btn = el('button', 'mpl-btn' + (full ? ' full' : ' primary'), full ? 'Full' : 'Join');
      btn.disabled = full;
      if (!full) {
        btn.addEventListener('click', function () {
          setError('');
          mp.joinRoom(room.id, currentProfile());
        });
      }
      const right = el('div', 'mpl-card-right');
      right.appendChild(count);
      right.appendChild(btn);
      card.appendChild(left);
      card.appendChild(right);
      listEl.appendChild(card);
    });
  }

  function showInRoom(welcome) {
    inRoom.hidden = false;
    const label = (welcome && (welcome.roomName || welcome.room)) || (mp && mp.room) || 'room';
    inRoomText.textContent = 'In ' + label;
  }

  function hideInRoom() {
    inRoom.hidden = true;
    inRoomText.textContent = '';
  }

  // ---- wire the socket ---------------------------------------------
  const url = options.url;
  if (!url) throw new Error('mountLobby: options.url is required');

  // Connect with no room code: browse the lobby, don't jump into a game.
  const mp = options.mp || connect(url, null, { name: options.playerName || 'Player' }, options);

  // If the phone line never comes up, say so clearly. Single-player
  // still works — just press Back and start a campaign as usual.
  let offlineTimer = setTimeout(function () {
    if (!mp.connected) setStatus('Server offline', 'bad');
  }, 2500);
  function clearOffline() { if (offlineTimer) { clearTimeout(offlineTimer); offlineTimer = null; } }

  mp.on('open', function () { setStatus('Connecting…', 'wait'); });
  mp.on('hello', function () { clearOffline(); setStatus('Connected', 'ok'); });
  mp.on('rooms', function (list) {
    if (mp.connected) { clearOffline(); setStatus('Connected', 'ok'); }
    renderRooms(list);
  });
  mp.on('welcome', function (w) {
    clearOffline();
    setStatus('Connected', 'ok');
    setError('');
    showInRoom(w);
    if (typeof options.onJoin === 'function') options.onJoin(w, currentProfile());
  });
  mp.on('parted', function () { hideInRoom(); });
  mp.on('disconnect', function (ev) {
    if (ev && ev.manual) { setStatus('Disconnected', 'bad'); return; }
    setStatus('Reconnecting…', 'wait');
    if (offlineTimer) clearTimeout(offlineTimer);
    offlineTimer = setTimeout(function () {
      if (!mp.connected) setStatus('Server offline', 'bad');
    }, 2500);
  });
  mp.on('reconnect', function () { setStatus('Reconnecting…', 'wait'); });
  mp.on('error', function (e) {
    const msg = (e && e.message) || 'error';
    // 1.6.1: socket-level failures ("WebSocket error") only change the status dot; the red line under
    // Create is kept for real answers from the server (room full, bad name …).
    if (!(e && (e.code === 'socket' || e.code === 'open'))) setError(msg);
    if (e && e.code === 'room_full') setError('That room is full.');
    if (!mp.connected) {
      // "WebSocket error" is cryptic; show the friendly offline line.
      setStatus('Server offline', 'bad');
    }
  });
  backBtn.addEventListener('click', function () {
    if (typeof options.onClose === 'function') options.onClose();
  });

  refreshBtn.addEventListener('click', function () {
    mp.listRooms();
  });
  createBtn.addEventListener('click', function () {
    const profile = currentProfile();
    const roomName = (roomNameInput.value || '').trim();
    if (!roomName) { setError('Give the room a name first.'); return; }
    const levelId = levelSelect.value;
    let levelName = levelId;
    for (let i = 0; i < levels.length; i++) if (levels[i].id === levelId) levelName = levels[i].name;
    setError('');
    mp.createRoom({
      name: roomName,
      level: levelId,
      levelName: levelName,
      playerName: profile.name,
      modelId: profile.modelId
    });
  });
  leaveBtn.addEventListener('click', function () { mp.leaveRoom(); });

  // If we already have a cached list (re-mount), draw it.
  renderRooms(mp.rooms || []);

  function hide() { root.style.display = 'none'; }
  function show() { root.style.display = ''; }

  function destroy(keepSocket) {
    if (offlineTimer) { clearTimeout(offlineTimer); offlineTimer = null; }
    charDD.destroy();                                                // its popup list lives on <body>
    if (!keepSocket) {
      try { mp.disconnect(); } catch (e) { /* ignore */ }
    }
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  return {
    mp: mp, destroy: destroy, hide: hide, show: show,
    refresh: function () { return mp.listRooms(); },
    setStatus: setStatus, renderRooms: renderRooms
  };
}

export default { mountLobby };
