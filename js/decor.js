/* Grok Life - home decorating (like Grok Pets): tap the floor to place with a ghost preview, rotate, move, store or sell,
   snap to the floor + walls, no overlaps. Works in co-op: friends can decorate your home if you allow it, and every change
   is applied by the home owner (their save is the truth) and synced to everyone. */
(function () {
'use strict';
const GL = window.GL, G = GL.G, W = GL.W, MD = GL.MD, Snd = GL.Snd, GN = window.GrokNet, T = window.THREE, UI = GL.UI, H = UI.H;
const $ = (id) => document.getElementById(id), esc = GN.esc, GS = G.GS, sv = () => G.save(), money = GL.money;
const btn = (a, v, txt, cls, dis) => '<button type="button" class="btn ' + (cls || '') + '" data-a="' + a + '"' + (v != null ? ' data-v="' + esc(String(v)) + '"' : '') + (dis ? ' disabled' : '') + '>' + txt + '</button>';
const D = GL.Decor = {};
const SNAP = 0.25, WALL_SNAP = 0.7;
// things that look best with their back against a wall (auto-turned when you drop them next to one)
const WALLISH = { bed: 1, bigbed: 1, stove: 1, fridge: 1, shower: 1, tub: 1, sofa: 1, tv: 1, console: 1, computer: 1, bookshelf: 1, wardrobe: 1, piano: 1, arcade: 1, aquarium: 1, fireplace: 1, painting: 1, toybox: 1 };
D.sellPrice = (id) => Math.floor((GL.FURN[id] ? GL.FURN[id].price : 0) / 2);

/* ---------------- shared rules ---------------- */
function dims(type) { const Hh = GL.HOUSES[type] || GL.HOUSES.apt; return { w: Hh.w, d: Hh.d }; }
function foot(id, r) { const it = GL.FURN[id]; return r % 2 ? [it.d, it.w] : [it.w, it.d]; }
const same = (f, ref) => f && ref && f.id === ref.id && Math.abs(f.x - ref.x) < 0.01 && Math.abs(f.z - ref.z) < 0.01 && ((f.r || 0) & 3) === ((ref.r || 0) & 3);
function findRef(layout, fi, ref) { if (same(layout[fi], ref)) return fi; for (let i = 0; i < layout.length; i++) if (same(layout[i], ref)) return i; return -1; }
// snap a spot to the grid, keep it inside the room and pull it flush against a nearby wall. Returns [x, z, r].
function snapSpot(dm, id, x, z, r, autoFace) {
  const hw = dm.w / 2 - 0.1, hd = dm.d / 2 - 0.1;
  for (let pass = 0; pass < 2; pass++) {
    const [sw, sd] = foot(id, r);
    x = Math.round(x / SNAP) * SNAP; z = Math.round(z / SNAP) * SNAP;
    x = GL.clamp(x, -hw + sw / 2, hw - sw / 2); z = GL.clamp(z, -hd + sd / 2, hd - sd / 2);
    let wall = null, best = WALL_SNAP;
    const gaps = [['b', z - sd / 2 + hd], ['l', x - sw / 2 + hw], ['r', hw - (x + sw / 2)], ['f', hd - (z + sd / 2)]];
    gaps.forEach((g) => { if (g[1] < best) { best = g[1]; wall = g[0]; } });
    if (x - sw / 2 + hw < WALL_SNAP) x = -hw + sw / 2; else if (hw - (x + sw / 2) < WALL_SNAP) x = hw - sw / 2;
    if (z - sd / 2 + hd < WALL_SNAP) z = -hd + sd / 2; else if (hd - (z + sd / 2) < WALL_SNAP) z = hd - sd / 2;
    if (!autoFace || !WALLISH[id] || !wall || wall === 'f') break;
    const nr = { b: 0, l: 1, r: 3 }[wall]; if (nr === r) break; r = nr;
  }
  return [+x.toFixed(3), +z.toFixed(3), r];
}
D.snapSpot = snapSpot;
function fits(dm, id, x, z, r, layout, skip) { return !!GL.FURN[id] && W.canPlace(dm, id, x, z, r, layout, skip); }
D.fits = fits;

// apply one decorating change to the OWNER's save. Used for my own edits and for friends' edits sent to me.
function applyOp(op, byFriend) {
  const s = sv(), dm = dims(s.house), L = s.home; if (!op) return 'bad';
  if (op.op === 'place') {
    if (!GL.FURN[op.id] || !(s.inv[op.id] > 0)) return 'That item is not in storage anymore.';
    if (!fits(dm, op.id, op.x, op.z, op.r & 3, L, -1)) return 'No room there.';
    s.inv[op.id]--; L.push({ id: op.id, x: op.x, z: op.z, r: op.r & 3 }); return null;
  }
  const i = findRef(L, op.fi, op.ref); if (i < 0) return 'Someone already changed that piece.';
  const f = L[i];
  if (op.op === 'move') { const r = op.r & 3; if (!fits(dm, f.id, op.x, op.z, r, L, i)) return 'No room there.'; f.x = op.x; f.z = op.z; f.r = r; return null; }
  if (op.op === 'store') { L.splice(i, 1); s.inv[f.id] = (s.inv[f.id] || 0) + 1; return null; }
  if (op.op === 'sell') { if (byFriend) return 'Only the owner can sell furniture.'; L.splice(i, 1); G.addMoney(D.sellPrice(f.id)); return null; }
  return 'bad';
}
D.applyOp = applyOp;
function cleanOp(o) {
  if (!o || typeof o !== 'object') return null;
  const n = (v, m) => GL.clamp(Math.round((+v || 0) / SNAP) * SNAP, -m, m);
  const out = { op: ['place', 'move', 'store', 'sell'].indexOf(o.op) >= 0 ? o.op : null, id: GL.FURN[o.id] ? o.id : null, x: n(o.x, 14), z: n(o.z, 8), r: (+o.r || 0) & 3, fi: GL.clamp(Math.round(+o.fi || 0), 0, 200) };
  if (o.ref && GL.FURN[o.ref.id]) out.ref = { id: o.ref.id, x: +o.ref.x || 0, z: +o.ref.z || 0, r: (+o.ref.r || 0) & 3 };
  if (!out.op || (out.op === 'place' && !out.id) || (out.op !== 'place' && !out.ref)) return null;
  return out;
}

/* ---------------- networking: friends send ops to the host, the host passes them to the owner ---------------- */
G.hooks.host.push(function (pid, m, S) {
  if (m.k === 'decorOp') {
    const owner = String(m.owner || ''), h = S.homes[owner], op = cleanOp(m.op);
    if (!op || !h || owner === pid) return;
    if (!h.allow) { G.pushEv({ type: 'decorNo', to: pid, msg: 'Decorating is turned off for this home.' }); return; }
    G.pushEv({ type: 'decorOp', to: owner, from: pid, by: G.playerInfo(pid).name, op });
  } else if (m.k === 'decorNo') {
    const to = String(m.to || ''); if (S.players.some((p) => p.pid === to)) G.pushEv({ type: 'decorNo', to, msg: String(m.msg || '').slice(0, 80) });
  }
});
G.hooks.ev.push(function (e) {
  if (e.type === 'decorOp' && e.to === GS.pid) {
    const s = sv();
    if (!s.decorAllow) { G.doAct({ k: 'decorNo', to: e.from, msg: 'Decorating is turned off for this home.' }); return; }
    const op = cleanOp(e.op), err = op ? applyOp(op, true) : 'bad';
    if (err) { G.doAct({ k: 'decorNo', to: e.from, msg: err }); return; }
    G.persist(); G.syncMe(); refresh(true);
    const it = GL.FURN[op.id || (op.ref && op.ref.id)];
    G.toast('\uD83D\uDECB\uFE0F ' + e.by + ' ' + { place: 'placed', move: 'moved', store: 'stored' }[op.op] + ' your ' + (it ? it.name : 'furniture') + '.');
  } else if (e.type === 'decorNo' && e.to === GS.pid) { G.toast(e.msg || 'That didn\u2019t work.', true); if (GS.decor) { GS.decor.wait = 0; draw(); } }
});

/* ---------------- whose home am I in? ---------------- */
function ctx() {
  const A = W.cur; if (!A || !A.homeKey) return null;
  const owner = A.homeKey, mine = owner === GS.pid, h = mine ? G.homeData() : G.homeOf(owner);
  if (!h) return null;
  return { A, owner, mine, h, layout: h.layout || [], inv: mine ? sv().inv : (h.inv || {}), dm: dims(h.type), allow: mine || !!h.allow, name: h.owner || 'Friend' };
}
D.canDecorHere = () => { const c = ctx(); return !!(c && c.allow); };

/* ---------------- start / stop ---------------- */
D.start = function () {
  const c = ctx();
  if (!c) { G.toast('Go inside your home first!'); return; }
  if (!c.allow) { G.toast('Ask ' + c.name + ' to turn on \u201CFriends can decorate\u201D first.', true); return; }
  G.closePanel(); GS.goal = null; if (GS.me.act && G.endAct) G.endAct();
  GS.decor = { mode: 'browse', id: null, sel: null, x: null, z: null, r: 0, ok: false, owner: c.owner, cam: [GS.me.x, GS.me.z], wait: 0 };
  document.body.classList.add('decorating'); $('decorBar').classList.remove('hidden'); draw(); Snd.fx('click');
};
D.end = function () {
  clearGhost(); clearSel(); showMoving(true); GS.decor = null; document.body.classList.remove('decorating'); $('decorBar').classList.add('hidden'); $('decorBar').dataset.k = '';
  G.persist(); G.syncMe();
};
UI.decorStart = D.start; UI.decorEnd = D.end;
H.decor = () => { G.closePanel(); D.start(); };

/* ---------------- ghost preview + selection ring ---------------- */
let ghost = null, ghostKey = '', selRing = null;
function ghostMats(o) { o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.6; m.material.depthWrite = false; m.userData.noHit = true; m.renderOrder = 5; } }); }
function clearGhost() { if (ghost) { W.scene.remove(ghost); ghost = null; ghostKey = ''; } }
function showGhost() {
  const d = GS.decor; if (!d || !d.id || d.x == null) { clearGhost(); return; }
  const k = d.id + ':' + d.r;
  if (k !== ghostKey) {
    clearGhost(); ghostKey = k; ghost = new T.Group();
    const m = MD.furn(d.id); m.rotation.y = d.r * Math.PI / 2; ghostMats(m); m.position.y = 0.02; ghost.add(m);
    const [w, dd] = foot(d.id, d.r);
    const pad = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: '#22c55e', transparent: true, opacity: 0.45, depthWrite: false })); pad.scale.set(w + 0.12, 0.04, dd + 0.12); pad.position.y = 0.03; pad.userData.noHit = true; ghost.add(pad); ghost.userData.pad = pad;
    const arrow = new T.Mesh(new T.ConeGeometry(0.22, 0.45, 3), new T.MeshBasicMaterial({ color: '#ffd23f' })); arrow.rotation.x = Math.PI / 2; arrow.position.set(0, 0.06, dd / 2 + 0.35); arrow.scale.set(1, 1, 0.3);
    const ar = new T.Group(); ar.add(arrow); ar.rotation.y = 0; ghost.add(ar); // arrow = which way the front faces
    if (d.r) { ar.rotation.y = d.r * Math.PI / 2; arrow.position.set(0, 0.06, (d.r % 2 ? w : dd) / 2 + 0.35); }
    W.scene.add(ghost);
  }
  ghost.userData.pad.material.color.set(d.ok ? '#22c55e' : '#ef4444');
  ghost.position.set(d.x, 0, d.z);
}
function clearSel() { if (selRing) { W.scene.remove(selRing); selRing = null; } }
function showSel() {
  clearSel(); const d = GS.decor, c = ctx(); if (!d || d.sel == null || !c) return; const f = c.layout[d.sel]; if (!f) return;
  const [w, dd] = foot(f.id, f.r || 0);
  selRing = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.55, depthWrite: false })); selRing.scale.set(w + 0.25, 0.05, dd + 0.25); selRing.position.set(f.x, 0.035, f.z); selRing.userData.noHit = true;
  W.scene.add(selRing);
}
function showMoving(force) { // hide the real piece while its ghost is being moved
  const A = W.cur, d = GS.decor; if (!A || !A.furnMeshes) return;
  A.furnMeshes.forEach((m) => { m.visible = force || !(d && d.mode === 'move' && m.userData.fi === d.fi); });
}

/* ---------------- validity ---------------- */
function revalidate() {
  const d = GS.decor, c = ctx(); if (!d || !c || !d.id || d.x == null) return;
  d.ok = fits(c.dm, d.id, d.x, d.z, d.r, c.layout, d.mode === 'move' ? d.fi : -1);
}
function setSpot(px, pz, auto) {
  const d = GS.decor, c = ctx(); if (!d || !c) return;
  const sp = snapSpot(c.dm, d.id, px, pz, d.r, auto && !d.userRot); d.x = sp[0]; d.z = sp[1]; d.r = sp[2];
  revalidate(); showGhost();
}

/* ---------------- input from the canvas (game.js forwards taps + drags here) ---------------- */
UI.decorTap = function (sx, sy) {
  const d = GS.decor, c = ctx(); if (!d || !c || d.wait) return;
  if (d.id) { const p = W.rayPlane(sx, sy, 0); if (!p) return; setSpot(p.x, p.z, true); draw(); Snd.fx('click'); return; }
  // browse: tap a piece to select it
  let hit = null;
  for (const m of c.A.furnMeshes || []) { const h = W.hitObj(sx, sy, m); if (h && (!hit || h.distance < hit.d)) hit = { m, d: h.distance }; }
  if (!hit) { const p = W.rayPlane(sx, sy, 0); if (p) c.layout.forEach((f, i) => { const [w, dd] = foot(f.id, f.r || 0); if (Math.abs(p.x - f.x) < w / 2 && Math.abs(p.z - f.z) < dd / 2 && (!hit || !GL.FURN[f.id].flat)) hit = { m: { userData: { fi: i } } }; }); }
  d.sel = hit ? hit.m.userData.fi : null; d.mode = d.sel == null ? 'browse' : 'sel';
  if (d.sel != null) d.selRef = Object.assign({}, c.layout[d.sel]);
  showSel(); draw(); if (hit) Snd.fx('click');
};
// press on the ghost and drag it around
UI.decorGrab = function (sx, sy) {
  const d = GS.decor; if (!d || !d.id || d.x == null) return false;
  const p = W.rayPlane(sx, sy, 0); if (!p) return false; const [w, dd] = foot(d.id, d.r);
  if (Math.abs(p.x - d.x) > w / 2 + 0.6 || Math.abs(p.z - d.z) > dd / 2 + 0.6) return false;
  d.grab = [d.x - p.x, d.z - p.z]; return true;
};
UI.decorDrag = function (sx, sy) { const d = GS.decor; if (!d || !d.grab) return; const p = W.rayPlane(sx, sy, 0); if (!p) return; setSpot(p.x + d.grab[0], p.z + d.grab[1], true); draw(); };
UI.decorDrop = function () { const d = GS.decor; if (d) d.grab = null; };
// one finger drags the camera around the room (pinch zooms)
UI.decorPan = function (dx, dy) {
  const d = GS.decor, c = ctx(); if (!d || !c) return;
  const yaw = W.camYaw || 0, k = 0.022 * (W.camUZ || 1) * (c.dm.w / 14), cy = Math.cos(yaw), sy = Math.sin(yaw);
  d.cam[0] = GL.clamp(d.cam[0] - cy * dx * k - sy * dy * k, -c.dm.w / 2, c.dm.w / 2);
  d.cam[1] = GL.clamp(d.cam[1] + sy * dx * k - cy * dy * k, -c.dm.d / 2, c.dm.d / 2);
};
G.camHook = (function (prev) { return () => { const d = GS.decor; if (d && d.cam) return d.cam; return prev ? prev() : null; }; })(G.camHook);
UI.decorKey = function (code) {
  const d = GS.decor; if (!d) return false;
  if (code === 'Escape') { if (d.id || d.sel != null) act('cancel'); else D.end(); return true; }
  if (code === 'Enter' || code === 'Space') { if (d.id) act('ok'); return true; }
  if (code === 'KeyT' || code === 'BracketRight' || code === 'Period') { act('rotR'); return true; }
  if (code === 'BracketLeft' || code === 'Comma') { act('rotL'); return true; }
  if (code === 'Delete' || code === 'Backspace') { if (d.sel != null) act('store'); return true; }
  return code === 'KeyE' || code === 'KeyP' || code === 'Tab';
};

/* ---------------- actions ---------------- */
function send(op) {
  const d = GS.decor, c = ctx(); if (!d || !c) return false;
  if (c.mine) { const err = applyOp(op, false); if (err) { G.toast(err, true); return false; } G.persist(); G.syncMe(); refresh(true); return true; }
  d.wait = 1; setTimeout(() => { if (GS.decor) { GS.decor.wait = 0; draw(); } }, 2500);
  G.doAct({ k: 'decorOp', owner: c.owner, op }); return true;
}
function pick(id) { // start placing a new piece from storage
  const d = GS.decor; if (!d) return;
  d.mode = 'place'; d.id = id; d.fi = null; d.sel = null; d.r = 0; d.userRot = false; d.x = null; d.z = null; d.ok = false; clearSel();
  showGhost(); draw();
}
function act(a) {
  const d = GS.decor, c = ctx(); if (!d || !c) return;
  if (a === 'rotR' || a === 'rotL') {
    const dir = a === 'rotR' ? 1 : 3;
    if (d.id) { d.r = (d.r + dir) % 4; d.userRot = true; if (d.x != null) setSpot(d.x, d.z, false); Snd.fx('click'); }
    else if (d.sel != null) { const f = c.layout[d.sel]; if (!f) return; const nr = ((f.r || 0) + dir) % 4; const sp = snapSpot(c.dm, f.id, f.x, f.z, nr, false);
      if (fits(c.dm, f.id, sp[0], sp[1], nr, c.layout, d.sel)) { const old = d.selRef; d.selRef = { id: f.id, x: sp[0], z: sp[1], r: nr }; if (send({ op: 'move', fi: d.sel, ref: Object.assign({ r: 0 }, f), x: sp[0], z: sp[1], r: nr })) Snd.fx('click'); else d.selRef = old; }
      else G.toast('Not enough room to turn it here.', true); }
  } else if (a === 'ok') {
    if (!d.id || d.x == null) { G.toast('Tap the floor where it should go.'); return; }
    if (!d.ok) { G.toast('It doesn\u2019t fit there \u2014 try another spot.', true); Snd.fx('no'); return; }
    const op = d.mode === 'move' ? { op: 'move', fi: d.fi, ref: d.ref, x: d.x, z: d.z, r: d.r } : { op: 'place', id: d.id, x: d.x, z: d.z, r: d.r };
    if (send(op)) { Snd.fx('buy'); W.fx('sparkle', d.x, 0.8, d.z, 8, 1); toBrowse(); }
  } else if (a === 'cancel') { toBrowse(); Snd.fx('click'); }
  else if (a === 'move' && d.sel != null) {
    const f = c.layout[d.sel]; if (!f) return;
    Object.assign(d, { mode: 'move', id: f.id, fi: d.sel, ref: Object.assign({ r: 0 }, f), x: f.x, z: f.z, r: f.r || 0, userRot: true, sel: null }); clearSel(); revalidate(); showGhost(); showMoving(); draw();
  } else if ((a === 'store' || a === 'sell') && d.sel != null) {
    const f = c.layout[d.sel]; if (!f) return; if (a === 'sell' && !c.mine) return;
    if (send({ op: a, fi: d.sel, ref: Object.assign({ r: 0 }, f) })) { Snd.fx(a === 'sell' ? 'cash' : 'pop'); if (a === 'sell') G.toast('Sold ' + GL.FURN[f.id].name + ' for ' + money(D.sellPrice(f.id)) + '.'); toBrowse(); }
  } else if (a === 'allow') { const s = sv(); s.decorAllow = !s.decorAllow; G.persist(); G.syncMe(); G.toast(s.decorAllow ? '\uD83D\uDC65 Friends can now decorate your home.' : '\uD83D\uDD12 Only you can decorate your home now.'); }
  else if (a === 'done') { D.end(); Snd.fx('click'); return; }
  draw();
}
function toBrowse() { const d = GS.decor; if (!d) return; Object.assign(d, { mode: 'browse', id: null, sel: null, fi: null, ref: null, x: null, z: null, ok: false, grab: null }); clearGhost(); clearSel(); showMoving(true); draw(); }
H.dPick = (v) => pick(v); H.dAct = (v) => act(v);
D.act = act; D.pick = pick;

/* ---------------- the bar ---------------- */
function draw() {
  const d = GS.decor, bar = $('decorBar'); if (!d) return;
  const c = ctx(); if (!c) return;
  let title, body = '', btns = '';
  if (d.mode === 'place' || d.mode === 'move') {
    const it = GL.FURN[d.id];
    title = it.icon + ' ' + (d.x == null ? 'Tap the floor where the <b>' + esc(it.name) + '</b> should go' : d.ok ? 'Looks good! Drag it, turn it, then \u2714' : 'Can\u2019t go there \u2014 it overlaps something. Tap another spot.');
    btns = btn('dAct', 'rotL', '\u21BA', 'small blue rot') + btn('dAct', 'rotR', '\u21BB', 'small blue rot') + btn('dAct', 'cancel', '\u2716 CANCEL', 'small alt') + btn('dAct', 'ok', '\u2714 PLACE', 'small green', !(d.ok && d.x != null) || d.wait);
  } else if (d.mode === 'sel' && c.layout[d.sel]) {
    const f = c.layout[d.sel], it = GL.FURN[f.id];
    title = it.icon + ' <b>' + esc(it.name) + '</b> selected';
    btns = btn('dAct', 'rotL', '\u21BA', 'small blue rot', d.wait) + btn('dAct', 'rotR', '\u21BB', 'small blue rot', d.wait) + btn('dAct', 'move', '\u2725 MOVE', 'small', d.wait) + btn('dAct', 'store', '\uD83D\uDCE6 STORE', 'small', d.wait) + (c.mine ? btn('dAct', 'sell', '\uD83D\uDCB0 SELL ' + money(D.sellPrice(f.id)), 'small red', d.wait) : '') + btn('dAct', 'cancel', '\u2716', 'small alt');
  } else {
    if (d.mode !== 'browse') { d.mode = 'browse'; d.sel = null; clearSel(); }
    const ks = GL.FURN_ORDER.filter((k) => c.inv[k] > 0);
    title = c.mine ? '\uD83D\uDECB\uFE0F Pick something to place, or tap furniture to move it' : '\uD83D\uDECB\uFE0F Decorating ' + esc(c.name) + '\u2019s home';
    body = '<div class="dinv">' + (ks.length ? ks.map((k) => '<button type="button" class="chip" data-a="dPick" data-v="' + k + '">' + GL.FURN[k].icon + ' ' + esc(GL.FURN[k].name) + ' \u00d7' + c.inv[k] + '</button>').join('') : '<span class="sub small">Storage is empty' + (c.mine ? ' \u2014 buy furniture at Cozy Home!' : '.') + '</span>') + '</div>';
    btns = (c.mine && G.online() ? btn('dAct', 'allow', sv().decorAllow ? '\uD83D\uDC65 FRIENDS CAN DECORATE: ON' : '\uD83D\uDD12 FRIENDS CAN DECORATE: OFF', 'small ' + (sv().decorAllow ? 'blue' : 'alt')) : '') + btn('dAct', 'done', '\u2714 DONE', 'small primary');
  }
  const html = '<div class="dtitle">' + title + '</div>' + body + '<div class="dbtns">' + btns + '</div><div class="dhint">tap = place/select \u00b7 drag = look around \u00b7 pinch = zoom</div>';
  if (bar.dataset.k !== html) { bar.dataset.k = html; bar.innerHTML = html; }
}
D.draw = draw;

/* ---------------- keep in sync with the home (friend edits, owner edits, leaving) ---------------- */
let rt = 0;
function refresh(force) {
  const A = W.cur; if (!A || !A.homeKey) return;
  const pid = A.homeKey, h = pid === GS.pid ? G.homeData() : G.homeOf(pid); if (!h) return;
  const before = A.layoutKey; W.homeArea(pid, h);
  if (A.layoutKey !== before || force) {
    const d = GS.decor, c = ctx();
    if (d && c) {
      d.wait = 0; // the owner's answer arrived
      if (d.mode === 'sel') { const i = findRef(c.layout, d.sel, d.selRef); if (i < 0) toBrowse(); else { d.sel = i; showSel(); } }
      if (d.mode === 'move') { const i = findRef(c.layout, d.fi, d.ref); if (i < 0) { G.toast('That piece was changed by someone else.'); toBrowse(); } else d.fi = i; }
      revalidate(); showGhost(); showMoving(); draw();
    }
    // never leave anyone stuck inside a new piece of furniture
    const f = W.freeNear(A, GS.me.x, GS.me.z, 0.36); GS.me.x = f[0]; GS.me.z = f[1];
  }
}
D.refresh = refresh;
G.hooks.tick.push(function (dt) {
  rt -= dt; if (rt <= 0) { rt = 0.25; refresh(false); }
  const d = GS.decor;
  if (d) { const c = ctx(); if (!c || !c.allow || c.owner !== d.owner) { if (c && !c.allow) G.toast(c.name + ' turned off decorating.', true); D.end(); } }
  const b = $('bDecor'); if (b) G.setHidden(b, !!d || !D.canDecorHere() || !!GS.me.act || !!GS.work);
});
G.hooks.reset.push(function () { if (GS.decor) D.end(); });
const bd = $('bDecor'); if (bd) bd.addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); Snd.fx('click'); D.start(); });
})();
