// Test-only stand-in for PeerJS (the box browser policy blocks WebRTC UDP). Pages in one browser context talk over BroadcastChannel.
(() => {
  const bc = new BroadcastChannel('fakepeer'); const peers = {};
  class Ev { constructor() { this._h = {}; } on(e, f) { (this._h[e] = this._h[e] || []).push(f); return this; } emit(e, ...a) { (this._h[e] || []).forEach(f => f(...a)); } }
  class Conn extends Ev { constructor(owner, remote, cid) { super(); this.owner = owner; this.peer = remote; this.cid = cid; this.open = false; }
    send(d) { bc.postMessage({ k: 'data', to: this.peer, from: this.owner.id, cid: this.cid, d: JSON.parse(JSON.stringify(d)) }); } close() { this.open = false; bc.postMessage({ k: 'close', to: this.peer, cid: this.cid }); this.emit('close'); } }
  class Peer extends Ev { constructor(id) { super(); if (typeof id !== 'string') id = 'p' + Math.random().toString(36).slice(2, 10); this.id = id; this.conns = {}; this.open = false; this.destroyed = false; this.disconnected = false;
      setTimeout(() => { peers[id] = this; this.open = true; this.emit('open', id); }, 60); }
    connect(to) { const cid = Math.random().toString(36).slice(2); const c = new Conn(this, to, cid); this.conns[cid] = c; bc.postMessage({ k: 'conn', to, from: this.id, cid });
      c._t = setTimeout(() => { if (!c.open) this.emit('error', { type: 'peer-unavailable' }); }, 700); return c; }
    reconnect() {} destroy() { this.destroyed = true; delete peers[this.id]; Object.values(this.conns).forEach(c => c.open && c.close()); }
    _msg(m) { if (m.k === 'conn') { const c = new Conn(this, m.from, m.cid); this.conns[m.cid] = c; this.emit('connection', c); c.open = true; c.emit('open'); bc.postMessage({ k: 'ack', to: m.from, cid: m.cid }); }
      const c = this.conns[m.cid]; if (!c) return; if (m.k === 'ack') { clearTimeout(c._t); c.open = true; c.emit('open'); } else if (m.k === 'data') c.emit('data', m.d); else if (m.k === 'close') { c.open = false; c.emit('close'); } } }
  bc.onmessage = e => { const p = peers[e.data.to]; if (p && !p.destroyed) p._msg(e.data); };
  window.Peer = Peer; Object.defineProperty(window, 'Peer', { value: Peer, writable: false });
})();
