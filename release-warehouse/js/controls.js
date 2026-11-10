/* DYSTOPIA release candidate — touch hygiene.
   Phones cancel a finger when the browser chrome moves, the app backgrounds,
   or a second gesture steals the pointer. The legacy handlers clear the
   pointer they are told about; this also drops stuck move / look / fire
   state when the page hides or the window blurs, and refits after rotate. */
(function () {
  const RC = (window.RC = window.RC || {});

  function release(reason) {
    try { isFiringHeld = false; } catch (e) {}
    try { moveTouchId = null; lookTouchId = null; moveVec = { x: 0, y: 0 }; } catch (e) {}
    try { if (LOOK && LOOK.ptrs) LOOK.ptrs.clear(); LOOK.px = 0; LOOK.py = 0; } catch (e) {}
    try { if (typeof KEYS === 'object' && KEYS) { Object.keys(KEYS).forEach((k) => { KEYS[k] = false; }); } } catch (e) {}
    try { if (typeof resetJoystickHome === 'function') resetJoystickHome(); } catch (e) {}
    RC.controls.lastRelease = reason || 'unknown';
  }

  function bind() {
    document.addEventListener('visibilitychange', () => { if (document.hidden) release('hidden'); });
    window.addEventListener('pagehide', () => release('pagehide'));
    window.addEventListener('blur', () => release('blur'));
    window.addEventListener('pointercancel', () => release('pointercancel'), true);
    window.addEventListener('orientationchange', () => {
      release('orient');
      setTimeout(() => { try { scheduleFit(); } catch (e) {} }, 60);
    });
    window.addEventListener('pageshow', () => { try { scheduleFit(); } catch (e) {} });
  }

  RC.controls = { release, bind };
})();
