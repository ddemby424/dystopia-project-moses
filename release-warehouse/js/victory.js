/* DYSTOPIA release candidate — victory presentation.
   This is not the startup trailer (media/dystopia_trailer_720p.mp4).
   It is a short in-engine epilogue: a captured WebM when we have one,
   otherwise the same camera move played live. Skip, a failed file, or a
   decode error always land on the epilogue card. The card can replay,
   start a new campaign, or drop the player back in the open yard. */
(function () {
  const RC = (window.RC = window.RC || {});
  const SRC = 'release-next/media/victory.webm';
  const POSTER = 'release-next/media/victory_poster.jpg';
  const DURATION = 6;
  const LINES = [
    { t: 0.0, text: 'Cradle 09. The Moses Protocol is terminated.' },
    { t: 1.8, text: 'The fence drops. The south gate opens.' },
    { t: 3.8, text: 'Walk out. The yard is no longer a cage.' }
  ];
  const victory = { open: false, mode: null, played: false, failed: false, node: null };

  function lineAt(t) {
    let s = LINES[0].text;
    LINES.forEach((L) => { if (t >= L.t) s = L.text; });
    return s;
  }

  function ensure() {
    if (victory.node) return victory.node;
    const el = document.createElement('div');
    el.id = 'victory-overlay';
    el.innerHTML = `
      <video id="victory-video" playsinline webkit-playsinline muted preload="none" poster="${POSTER}">
        <source src="${SRC}" type="video/webm">
        <track kind="captions" src="release-next/media/victory.vtt" srclang="en" label="English" default>
      </video>
      <div id="victory-caption"></div>
      <div id="victory-live"></div>
      <button type="button" id="victory-sound" class="rc-btn">TAP FOR SOUND</button>
      <button type="button" id="victory-skip" class="rc-btn">SKIP</button>
      <div id="victory-card" hidden>
        <div class="rc-kicker">EPILOGUE</div>
        <h2>CRADLE 09 IS OPEN</h2>
        <p id="victory-card-copy">The fence is cold. The south gate stays open. This is not the launch trailer.</p>
        <div class="rc-row">
          <button type="button" id="victory-replay" class="rc-btn">REPLAY EPILOGUE</button>
          <button type="button" id="victory-again" class="rc-btn">NEW CAMPAIGN</button>
          <button type="button" id="victory-stay" class="rc-btn solid">STAY IN THE YARD</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('#victory-skip').onclick = () => finish('skip');
    el.querySelector('#victory-sound').onclick = (e) => { e.stopPropagation(); unmute(); };
    el.querySelector('#victory-replay').onclick = () => play('replay');
    el.querySelector('#victory-again').onclick = () => { close('new'); if (RC.campaign) RC.campaign.reset(); };
    el.querySelector('#victory-stay').onclick = () => close('stay');
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'Enter') finish('key'); });
    victory.node = el;
    victory.video = el.querySelector('video');
    victory.cap = el.querySelector('#victory-caption');
    victory.card = el.querySelector('#victory-card');
    victory.copy = el.querySelector('#victory-card-copy');
    return el;
  }

  function unmute() {
    const v = victory.video;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    const b = victory.node.querySelector('#victory-sound');
    if (b) b.style.display = 'none';
    v.play().catch(() => {});
  }

  function showCard(why) {
    ensure();
    victory.open = true;
    victory.node.classList.add('on', 'card');
    victory.card.hidden = false;
    victory.cap.textContent = '';
    const v = victory.video;
    if (v) { try { v.pause(); } catch (e) {} }
    if (why === 'error' || victory.failed) {
      victory.copy.textContent = 'The epilogue file did not play. The win still stands: the fence is down and the south gate is open. You are not stuck.';
    } else {
      victory.copy.textContent = 'The fence is cold. The south gate stays open. Replay the epilogue, walk out, or start again. This is not the launch trailer.';
    }
    STATE.pausedForStudio = false;
    const stay = victory.node.querySelector('#victory-stay');
    if (stay) stay.focus();
  }

  function finish(why) {
    if (!victory.open) return;
    victory.played = true;
    showCard(why);
  }

  function close(why) {
    if (!victory.node) return;
    victory.open = false;
    victory.node.classList.remove('on', 'card', 'live');
    victory.card.hidden = true;
    if (victory.video) { try { victory.video.pause(); } catch (e) {} }
    STATE.pausedForStudio = false;
    STATE.running = true;
    if (RC.fence) RC.fence._gateLatch = true;
  }

  function playVideo() {
    const v = victory.video;
    victory.node.classList.remove('card', 'live');
    victory.card.hidden = true;
    victory.failed = false;
    v.muted = true;
    const snd = victory.node.querySelector('#victory-sound');
    if (snd) snd.style.display = '';
    let started = false;
    const arm = () => { started = true; };
    v.onplaying = arm;
    v.onended = () => finish('ended');
    v.onerror = () => { victory.failed = true; liveOrCard('error'); };
    v.ontimeupdate = () => { victory.cap.textContent = lineAt(v.currentTime || 0); };
    const pr = v.play();
    const giveUp = () => { if (started || (v.readyState >= 2 && !v.error)) return; victory.failed = true; liveOrCard('error'); };
    if (pr && pr.then) pr.then(arm).catch(() => { victory.failed = true; liveOrCard('error'); });
    else setTimeout(giveUp, 1200);
    setTimeout(giveUp, 4500);
  }

  /* Live camera fallback. Uses the real yard, fence, and vista — not the trailer. */
  function liveOrCard(why) {
    if (victory._fallbackRan) return;
    victory._fallbackRan = true;
    if (!RC.victory._cam) {
      showCard(why);
      return;
    }
    const v = victory.video;
    if (v) { try { v.pause(); } catch (e) {} }
    victory.node.classList.add('live');
    victory.node.classList.remove('card');
    victory.card.hidden = true;
    victory.cap.textContent = lineAt(0);
    const t0 = performance.now();
    const step = (now) => {
      if (!victory.open || victory.node.classList.contains('card')) return;
      const t = (now - t0) / 1000;
      victory.cap.textContent = lineAt(t);
      RC.victory._cam(Math.min(1, t / DURATION));
      if (t >= DURATION + 0.2) { finish('live-end'); return; }
      victory._raf = requestAnimationFrame(step);
    };
    victory._raf = requestAnimationFrame(step);
  }

  function play(reason) {
    ensure();
    if (victory._raf) cancelAnimationFrame(victory._raf);
    victory.open = true;
    victory.mode = reason || 'win';
    victory._fallbackRan = false;
    victory.node.classList.add('on');
    victory.card.hidden = true;
    STATE.pausedForStudio = true;
    STATE.running = true;
    /* Prefer the file. Tests can force the failure path with RC.victory.play('missing'). */
    if (reason === 'missing') { victory.failed = true; showCard('error'); return; }
    try { playVideo(); } catch (e) { victory.failed = true; showCard('error'); }
  }

  /* Staged shot, already facing the south gate. The panel and the gate wires
     finish rising before the eye crosses the gate line. The last second looks
     back through that opening at the yard, still standing on the apron. */
  function shotAt(t) {
    const y = RC.yard && RC.yard.layoutRef ? RC.yard.layoutRef() : null;
    const gateZ = (y && y.fence && y.fence.maxZ) || 150;
    const holdZ = gateZ - 12;
    const outZ = gateZ + 3.4;
    let live = true;
    let lift = 0;
    let z = holdZ;
    let yaw = Math.PI;
    if (t < 0.18) {
      live = true; lift = 0;
    } else if (t < 0.30) {
      live = false; lift = 0;
    } else if (t < 0.55) {
      live = false; lift = Math.min(1, (t - 0.30) / 0.22);
    } else if (t < 0.82) {
      live = false; lift = 1;
      z = holdZ + (outZ - holdZ) * ((t - 0.55) / 0.27);
    } else {
      live = false; lift = 1; z = outZ;
      yaw = Math.PI * (1 - Math.min(1, (t - 0.82) / 0.14));
    }
    return { x: 0, z, yaw, live, lift, gateZ, holdZ, outZ };
  }

  function cinematic(t) {
    const s = shotAt(t);
    if (RC.fence) {
      RC.fence.holdPose = true;
      if (RC.fence.live !== s.live) RC.fence.setLive(s.live);
      RC.fence.setOpen(s.lift);
    }
    STATE.player.x = s.x;
    STATE.player.z = s.z;
    STATE.player.y = 0;
    STATE.player.yaw = s.yaw;
    STATE.player.pitch = -0.04;
    if (typeof viewModelGroup !== 'undefined' && viewModelGroup && RC.victory.filming) viewModelGroup.visible = false;
    camera.position.set(STATE.player.x, 1.65, STATE.player.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = STATE.player.yaw;
    camera.rotation.x = STATE.player.pitch;
    if (typeof renderFrame === 'function') renderFrame();
    return s;
  }

  RC.victory = victory;
  RC.victory.play = play;
  RC.victory.finish = finish;
  RC.victory.close = close;
  RC.victory.showCard = showCard;
  RC.victory.lineAt = lineAt;
  RC.victory.LINES = LINES;
  RC.victory.DURATION = DURATION;
  RC.victory._cam = cinematic;
  RC.victory.shotAt = shotAt;
  RC.victory.SRC = SRC;
})();
