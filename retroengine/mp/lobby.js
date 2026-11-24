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

import { connect } from './mp.js';

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

/**
 * Build the lobby UI inside `container` and open a WebSocket to the relay.
 * Returns { mp, destroy, refresh, setStatus }.
 */
export function mountLobby(container, options) {
  options = options || {};
  const levels = options.levels && options.levels.length ? options.levels : DEFAULT_LEVELS;
  const characters = options.characters && options.characters.length ? options.characters : DEFAULT_CHARACTERS;

  // ---- DOM ----------------------------------------------------------
  // One wrapper so our CSS can stay scoped under .mp-lobby and not
  // leak into the rest of a page (the editor, for example).
  const root = el('div', 'mp-lobby');
  container.innerHTML = '';
  container.appendChild(root);

  const top = el('header', 'mpl-top');
  const brand = el('div', 'mpl-brand');
  brand.appendChild(el('span', 'mpl-mark', '◆'));
  const brandText = el('div');
  const title = el('div');
  title.innerHTML = 'DMB TECH 1  <b>LOBBY</b>';
  brandText.appendChild(title);
  brandText.appendChild(el('small', '', 'MULTIPLAYER'));
  brand.appendChild(brandText);
  const statusEl = el('div', 'mpl-status is-wait', 'connecting…');
  const backBtn = el('button', 'mpl-btn', 'Back');
  backBtn.setAttribute('data-mp-back', '1');
  top.appendChild(brand);
  top.appendChild(statusEl);
  top.appendChild(backBtn);
  root.appendChild(top);

  const body = el('div', 'mpl-body');
  root.appendChild(body);

  const main = el('div', 'mpl-main');
  const side = el('div', 'mpl-side');
  body.appendChild(main);
  body.appendChild(side);

  // "You" strip: name + character picker (the hook for 1.2 models).
  const you = el('section', 'mpl-you');
  you.appendChild(el('h2', 'mpl-h', 'You'));
  const youRow = el('div', 'mpl-row');
  const nameField = el('div', 'mpl-field');
  nameField.appendChild(el('label', '', 'Name'));
  const nameInput = el('input');
  nameInput.type = 'text';
  nameInput.maxLength = 24;
  nameInput.value = options.playerName || 'Player';
  nameInput.autocomplete = 'nickname';
  nameField.appendChild(nameInput);
  const charField = el('div', 'mpl-field');
  charField.appendChild(el('label', '', 'Character'));
  const charSelect = el('select');
  charSelect.setAttribute('data-hook', 'character'); // tests / host pages can find this
  optionList(charSelect, characters, 'id', 'name');
  if (typeof options.renderCharacterPicker === 'function') {
    // Advanced hook: the host page can replace the default <select>.
    charField.innerHTML = '';
    charField.appendChild(el('label', '', 'Character'));
    options.renderCharacterPicker(charField, charSelect);
    if (!charField.querySelector('select, input')) charField.appendChild(charSelect);
  } else {
    charField.appendChild(charSelect);
  }
  youRow.appendChild(nameField);
  youRow.appendChild(charField);
  you.appendChild(youRow);
  side.appendChild(you);
  if (options.playerModel) charSelect.value = options.playerModel;
  charSelect.addEventListener('change', function () {
    if (typeof options.onCharacterChange === 'function') options.onCharacterChange(charSelect.value);
  });
  nameInput.addEventListener('change', function () {
    if (typeof options.onNameChange === 'function') options.onNameChange(nameInput.value);
  });

  const inRoom = el('div', 'mpl-inroom');
  inRoom.hidden = true;
  const inRoomText = el('div', '', '');
  const leaveBtn = el('button', 'mpl-btn', 'Leave');
  inRoom.appendChild(inRoomText);
  inRoom.appendChild(leaveBtn);
  main.appendChild(inRoom);

  const roomsSec = el('section', 'mpl-rooms');
  const roomsHead = el('h2', 'mpl-h', 'Rooms');
  const refreshBtn = el('button', 'mpl-btn', 'Refresh');
  roomsHead.appendChild(refreshBtn);
  roomsSec.appendChild(roomsHead);
  const listEl = el('div', 'mpl-list');
  roomsSec.appendChild(listEl);
  main.appendChild(roomsSec);

  const createSec = el('section', 'mpl-create');
  createSec.appendChild(el('h2', 'mpl-h', 'Create room'));
  const roomNameField = el('div', 'mpl-field');
  roomNameField.appendChild(el('label', '', 'Room name'));
  const roomNameInput = el('input');
  roomNameInput.type = 'text';
  roomNameInput.maxLength = 32;
  roomNameInput.placeholder = 'Night Shift';
  roomNameField.appendChild(roomNameInput);
  const levelField = el('div', 'mpl-field');
  levelField.appendChild(el('label', '', 'Level'));
  const levelSelect = el('select');
  optionList(levelSelect, levels, 'id', 'name');
  levelField.appendChild(levelSelect);
  createSec.appendChild(roomNameField);
  createSec.appendChild(levelField);
  const createBtn = el('button', 'mpl-btn primary block', 'Create room');
  createSec.appendChild(createBtn);
  const errEl = el('div', 'mpl-error', '');
  createSec.appendChild(errEl);
  side.appendChild(createSec);

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

  // Draw the room cards. Full rooms get a disabled "Full" button
  // instead of Join — no point sending a request that will bounce.
  function renderRooms(list) {
    listEl.innerHTML = '';
    if (!list || !list.length) {
      listEl.appendChild(el('div', 'mpl-empty', 'No rooms yet. Create one and it shows up here.'));
      return;
    }
    list.forEach(function (room) {
      const full = room.players >= room.max;
      const card = el('article', 'mpl-card' + (full ? ' is-full' : ''));
      const left = el('div');
      left.appendChild(el('div', 'mpl-card-title', room.name || room.id));
      const meta = el('div', 'mpl-card-meta');
      const levelName = room.levelName || levelLabel(room.level) || room.level || '';
      meta.appendChild(document.createTextNode(levelName + '  ·  host ' + (room.host || '—')));
      left.appendChild(meta);
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
      const names = el('div', 'mpl-names', (room.names && room.names.length) ? room.names.join(' · ') : '');
      card.appendChild(names);
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

  mp.on('open', function () { setStatus('connecting…', 'wait'); });
  mp.on('hello', function () { clearOffline(); setStatus('connected', 'ok'); });
  mp.on('rooms', function (list) {
    if (mp.connected) { clearOffline(); setStatus('connected', 'ok'); }
    renderRooms(list);
  });
  mp.on('welcome', function (w) {
    clearOffline();
    setStatus('connected', 'ok');
    setError('');
    showInRoom(w);
    if (typeof options.onJoin === 'function') options.onJoin(w, currentProfile());
  });
  mp.on('parted', function () { hideInRoom(); });
  mp.on('disconnect', function (ev) {
    if (ev && ev.manual) { setStatus('disconnected', 'bad'); return; }
    setStatus('reconnecting…', 'wait');
    if (offlineTimer) clearTimeout(offlineTimer);
    offlineTimer = setTimeout(function () {
      if (!mp.connected) setStatus('Server offline', 'bad');
    }, 2500);
  });
  mp.on('reconnect', function () { setStatus('reconnecting…', 'wait'); });
  mp.on('error', function (e) {
    const msg = (e && e.message) || 'error';
    setError(msg);
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
