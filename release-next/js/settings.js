/* Candidate settings. Stored only in dys_rc_settings_v1.
   The engine writes the legacy keys while it applies a value. This file
   puts those keys back to whatever they were before this page loaded. */
(function () {
  const RC = (window.RC = window.RC || {});
  const KEY = 'dys_rc_settings_v1';
  const LEGACY = ['dystopia_brightness', 'dystopia_shadows', 'dys_music_vol', 'dys_music_on', 'dys_gfx', 'dys_look', 'dys_trailer_seen_v4', 'dys_name', 'dys_skin'];
  const snap = window.__RC_LEGACY_SNAP || {};

  function defaults() {
    return { bright: 1, shadows: true, sens: 1.25, assist: 0.8, look: 1, music: 0.55, musicOn: true, sfx: true, reduced: false, contrast: false, skill: '1.0' };
  }

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      return Object.assign(defaults(), raw || {});
    } catch (e) { return defaults(); }
  }

  function restoreLegacy() {
    LEGACY.forEach((k) => {
      try {
        if (snap[k] == null) localStorage.removeItem(k);
        else localStorage.setItem(k, snap[k]);
      } catch (e) {}
    });
  }

  function write(patch) {
    const next = Object.assign(read(), patch || {});
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  }

  const innerB = setBrightness;
  const innerSh = setShadows;
  const innerVol = musicSetVolume;
  const innerOn = musicSetOn;
  let lock = false;

  setBrightness = function (v) {
    innerB(v);
    restoreLegacy();
    if (!lock) write({ bright: BRIGHTNESS });
  };
  setShadows = function (on) {
    innerSh(on);
    restoreLegacy();
    if (!lock) write({ shadows: !!SHADOWS_ON });
  };
  musicSetVolume = function (v) {
    innerVol(v);
    restoreLegacy();
    if (!lock) write({ music: MUSIC.vol });
  };
  musicSetOn = function (on) {
    innerOn(on);
    restoreLegacy();
    if (!lock) write({ musicOn: !!MUSIC.on });
  };

  function apply(src) {
    const s = src || read();
    lock = true;
    try {
      innerB(s.bright);
      innerSh(!!s.shadows);
      STATE.sens = s.sens;
      STATE.aimAssist = s.assist;
      if (window.LOOK) LOOK.sens = s.look || 1;
      STATE.rcReduced = !!s.reduced;
      document.body.classList.toggle('rc-reduced', !!s.reduced);
      document.body.classList.toggle('rc-contrast', !!s.contrast);
      innerOn(!!s.musicOn);
      innerVol(s.music);
      if (window.SFX) SFX.muted = !s.sfx;
      const skill = document.getElementById('select-bot-diff');
      if (skill && s.skill) { skill.value = s.skill; STATE.botSkill = parseFloat(s.skill) || 1; }
      const sens = document.getElementById('slider-sens');
      if (sens) sens.value = Math.round(s.sens * 100);
      const assist = document.getElementById('slider-assist');
      if (assist) assist.value = Math.round((s.assist || 0) * 100);
      const sv = document.getElementById('sens-value');
      if (sv) sv.textContent = Math.round(s.sens * 100) + '%';
      const av = document.getElementById('assist-value');
      if (av) av.textContent = Math.round((s.assist || 0) * 100) + '%';
    } finally {
      lock = false;
      restoreLegacy();
    }
    return s;
  }

  function bind() {
    const skill = document.getElementById('select-bot-diff');
    if (skill) skill.addEventListener('change', () => { STATE.botSkill = parseFloat(skill.value) || 1; write({ skill: skill.value }); });
    const sens = document.getElementById('slider-sens');
    if (sens) sens.addEventListener('input', () => {
      STATE.sens = (parseFloat(sens.value) || 125) / 100;
      const sv = document.getElementById('sens-value');
      if (sv) sv.textContent = Math.round(STATE.sens * 100) + '%';
      write({ sens: STATE.sens });
    });
    const assist = document.getElementById('slider-assist');
    if (assist) assist.addEventListener('input', () => {
      STATE.aimAssist = (parseFloat(assist.value) || 0) / 100;
      const av = document.getElementById('assist-value');
      if (av) av.textContent = Math.round(STATE.aimAssist * 100) + '%';
      write({ assist: STATE.aimAssist });
    });
    const look = document.getElementById('mcs-sens');
    if (look) {
      look.oninput = () => {
        if (window.LOOK) LOOK.sens = look.value / 100;
        const lab = document.getElementById('mcs-sv');
        if (lab) lab.textContent = look.value + '%';
        restoreLegacy();
        write({ look: window.LOOK ? LOOK.sens : look.value / 100 });
      };
    }
    const snd = document.getElementById('mcs-snd');
    if (snd) snd.addEventListener('click', () => { write({ sfx: !(window.SFX && SFX.muted) }); restoreLegacy(); });
  }

  restoreLegacy();
  apply(read());
  bind();
  RC.settings = { read, write, apply, restoreLegacy, defaults, bind, KEY };
})();
