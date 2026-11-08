/* DYSTOPIA release candidate — victory presentation.
   This is not the startup trailer (media/dystopia_trailer_720p.mp4).
   It is a short in-engine epilogue: a captured WebM when we have one,
   otherwise the same camera move played live. Skip, a failed file, or a
   decode error always land on the epilogue card. The card can replay,
   start a new campaign, or drop the player back in the open yard. */
(function () {
  const RC = (window.RC = window.RC || {});
  const SRC = 'release/media/victory.webm';
  const POSTER = 'release/media/victory_poster.jpg';
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
        <track kind="captions" src="release/media/victory.vtt" srclang="en" label="English" default>
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

  /* t is 0..1 across DURATION seconds. Ends past the open gate, looking out. */
  function cinematic(t) {
    const y = RC.yard && RC.yard.layoutRef ? RC.yard.layoutRef() : null;
    const spawn = (y && y.spawn) || { x: 0, z: 124 };
    const gateZ = (y && y.fence && y.fence.maxZ) || 150;
    if (RC.fence && t > 0.22) RC.fence.setLive(false);
    const turn = Math.min(1, Math.max(0, (t - 0.08) / 0.18));
    const approach = Math.min(1, Math.max(0, (t - 0.22) / 0.38));
    const through = Math.min(1, Math.max(0, (t - 0.62) / 0.38));
    const zGate = gateZ - 6;
    const zOut = gateZ + 2.2;
    STATE.player.x = spawn.x + Math.sin(t * 4) * 0.15;
    STATE.player.z = spawn.z + (zGate - spawn.z) * approach + (zOut - zGate) * through;
    STATE.player.y = 0;
    STATE.player.yaw = turn * Math.PI;
    STATE.player.pitch = -0.08 - through * 0.06;
    if (typeof viewModelGroup !== 'undefined' && viewModelGroup && RC.victory.filming) viewModelGroup.visible = false;
    if (RC.fence && RC.fence.gate) {
      const lift = t > 0.28 ? Math.min(1, (t - 0.28) / 0.22) : 0;
      RC.fence.open = lift;
      RC.fence.gate.position.y = lift * 4.6;
    }
    camera.position.set(STATE.player.x, 1.7, STATE.player.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = STATE.player.yaw;
    camera.rotation.x = STATE.player.pitch;
    if (typeof renderFrame === 'function') renderFrame();
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
  RC.victory.SRC = SRC;
})();
