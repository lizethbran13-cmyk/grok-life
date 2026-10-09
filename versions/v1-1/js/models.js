/* Grok Life - 3D models: pets (from Grok Pets), people/avatars, cars, furniture, props */
(function () {
'use strict';
const GL = window.GL, T = window.THREE, TAU = Math.PI * 2;
const MD = GL.MD = {};
const mc = {};
function M(col, o) {
  const k = col + (o ? JSON.stringify(o) : '');
  if (!mc[k]) { const p = Object.assign({ color: col }, o || {}); mc[k] = new T.MeshLambertMaterial(p); }
  return mc[k];
}
const G = {
  box: new T.BoxGeometry(1, 1, 1), sph: new T.SphereGeometry(1, 16, 12), sphL: new T.SphereGeometry(1, 10, 8),
  cyl: new T.CylinderGeometry(1, 1, 1, 16), cone: new T.ConeGeometry(1, 1, 14), cone4: new T.ConeGeometry(1, 1, 4),
  hemi: new T.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2), torus: new T.TorusGeometry(1, 0.22, 8, 20), ring: new T.TorusGeometry(1, 0.08, 6, 24),
  plane: new T.PlaneGeometry(1, 1), circle: new T.CircleGeometry(1, 28)
};
MD.M = M; MD.G = G;
function mesh(geo, col, p, x, y, z, sx, sy, sz) { const m = new T.Mesh(geo, typeof col === 'string' ? M(col) : col); m.position.set(x || 0, y || 0, z || 0); m.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz); if (p) p.add(m); return m; }
const box = (w, h, d, col, p, x, y, z) => mesh(G.box, col, p, x, y, z, w, h, d);
const ell = (rx, ry, rz, col, p, x, y, z) => mesh(G.sph, col, p, x, y, z, rx, ry, rz);
const sph = (r, col, p, x, y, z) => mesh(G.sph, col, p, x, y, z, r, r, r);
const cyl = (r, h, col, p, x, y, z) => mesh(G.cyl, col, p, x, y, z, r, h, r);
const cone = (r, h, col, p, x, y, z) => mesh(G.cone, col, p, x, y, z, r, h, r);
const grp = (p, x, y, z) => { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (p) p.add(g); return g; };
MD.box = box; MD.ell = ell; MD.sph = sph; MD.cyl = cyl; MD.cone = cone; MD.grp = grp; MD.mesh = mesh;

/* ---------------- eyes ---------------- */
function eyes(head, r, ex, ey, ez, col, oneEye) {
  const out = [];
  [-1, 1].forEach((s) => {
    const e = grp(head, s * ex, ey, ez);
    if (oneEye && s < 0) { const l = box(r * 1.9, r * 0.35, r * 0.4, '#3a2a20', e, 0, 0, 0); l.rotation.z = 0.15; out.push({ g: e, closed: true }); return; }
    sph(r, col || '#1b1420', e, 0, 0, 0);
    sph(r * 0.36, '#ffffff', e, r * 0.32, r * 0.38, r * 0.72);
    out.push({ g: e });
  });
  return out;
}

/* ---------------- generic quadruped ---------------- */
function quad(P, o) {
  const c1 = o.c1, c2 = o.c2, L = o.len, H = o.bh, Wd = o.bw, lh = o.legH, hr = o.headR;
  const cy = lh + H * 0.5; P.cy = cy;
  P.rig.position.y = cy; const body = P.body = grp(P.rig, 0, -cy, 0);
  // torso
  if (o.shell) {
    const sh = mesh(G.hemi, c1, body, 0, lh + 0.02, 0, Wd * 0.62, H * 1.25, L * 0.6);
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; const pl = mesh(G.hemi, c2, body, Math.cos(a) * Wd * 0.34, lh + H * 0.55 + 0.02, Math.sin(a) * L * 0.32, Wd * 0.17, H * 0.32, Wd * 0.17); pl.rotation.x = Math.sin(a) * 0.5; pl.rotation.z = -Math.cos(a) * 0.5; }
    mesh(G.hemi, c2, body, 0, lh + H * 1.0, 0, Wd * 0.2, H * 0.28, Wd * 0.2);
    ell(Wd * 0.6, 0.04, L * 0.58, o.c3 || '#d9c08a', body, 0, lh + 0.02, 0);
  } else {
    ell(Wd / 2, H / 2, L / 2, c1, body, 0, cy, 0);
    if (!o.noBelly) ell(Wd * 0.4, H * 0.36, L * 0.4, c2, body, 0, cy - H * 0.16, L * 0.04);
  }
  if (o.stripes) for (let i = 0; i < 4; i++) box(Wd * 0.86, 0.035, 0.05, o.stripeCol || '#00000033', body, 0, cy + H * 0.47, -L * 0.28 + i * L * 0.17).scale.y = 0.02;
  if (o.spikes) { for (let i = 0; i < 26; i++) { const a = (i % 7) / 7 * Math.PI - Math.PI / 2, b = Math.floor(i / 7) / 4; const sx = Math.sin(a) * Wd * 0.48, sy = cy + Math.cos(a) * H * 0.5, sz = L * (0.3 - b * 0.6); const sp = cone(0.045, 0.16, o.spikeCol || '#5a3d26', body, sx, sy, sz); sp.rotation.set(-0.9, 0, -a * 0.9); } }
  // legs
  P.legs = [];
  const lw = o.legW || Math.max(0.05, Wd * 0.2), lz = L * (o.legZ || 0.32), lx = Wd * 0.3;
  [[-lx, lz], [lx, lz], [-lx, -lz], [lx, -lz]].forEach((q, i) => {
    const lg = grp(body, q[0], lh + 0.02, q[1]);
    const col = o.points ? c2 : (o.legCol || (i < 2 && o.frontCol) || c1);
    box(lw, lh + 0.04, lw, col, lg, 0, -(lh + 0.04) / 2, 0);
    ell(lw * 0.62, lw * 0.4, lw * 0.75, o.pawCol || (o.points ? c2 : o.mask ? c1 : c2), lg, 0, -lh + 0.01, lw * 0.15);
    P.legs.push(lg);
  });
  // head
  const hy = o.neckUp ? cy + H * 0.5 + hr * 0.9 : cy + H * 0.42 + hr * 0.25, hz = L * 0.47 + hr * 0.55;
  const head = P.head = grp(body, 0, hy, hz); P.headR = hr;
  if (o.neckUp) { const nk = cyl(hr * 0.55, hr * 2.4, c1, body, 0, (cy + hy) / 2, L * 0.4 + hr * 0.2); nk.rotation.x = 0.5; }
  if (o.robot) { box(hr * 1.9, hr * 1.6, hr * 1.7, c1, head, 0, 0, 0); box(hr * 1.6, hr * 0.5, 0.05, '#0f172a', head, 0, hr * 0.12, hr * 0.86); }
  else ell(hr, hr * (o.headSy || 0.92), hr * (o.headSz || 0.95), o.points ? c1 : c1, head, 0, 0, 0);
  const sn = o.snout == null ? 0.15 : o.snout;
  if (sn > 0.02) {
    const sl = o.pointy ? sn * 1.3 : sn;
    if (o.pointy) { const s = cone(hr * 0.5, sl * 1.6, o.points || o.mask ? c2 : c2, head, 0, -hr * 0.18, hr * 0.7 + sl * 0.5); s.rotation.x = Math.PI / 2; }
    else ell(hr * 0.55, hr * 0.42, sl, o.points || o.mask ? c2 : c2, head, 0, -hr * 0.28, hr * 0.72 + sl * 0.35);
    sph(hr * (o.pointy ? 0.14 : 0.17), o.nose || '#2a1a1a', head, 0, -hr * 0.16, hr * 0.72 + sl * (o.pointy ? 1.3 : 0.95));
  } else {
    ell(hr * 0.6, hr * 0.42, hr * 0.25, o.mask ? c2 : c2, head, 0, -hr * 0.3, hr * 0.82);
    sph(hr * 0.15, o.nose || '#2a1a1a', head, 0, -hr * 0.16, hr * 1.02);
  }
  if (o.mask) ell(hr * 0.7, hr * 0.45, hr * 0.3, c2, head, 0, -hr * 0.18, hr * 0.7);
  if (o.beard) { ell(hr * 0.5, hr * 0.5, hr * 0.42, c2, head, 0, -hr * 0.62, hr * 0.85); [-1, 1].forEach((s) => { const b = box(hr * 0.5, hr * 0.14, hr * 0.2, c2, head, s * hr * 0.32, hr * 0.38, hr * 0.78); b.rotation.z = s * -0.3; }); }
  if (o.robot) { P.eyes = []; [-1, 1].forEach((s) => { const e = grp(head, s * hr * 0.42, hr * 0.12, hr * 0.9); box(hr * 0.4, hr * 0.26, 0.04, M(c2, { emissive: c2 }), e, 0, 0, 0); P.eyes.push({ g: e }); }); }
  else P.eyes = eyes(head, hr * (o.eyeR || 0.2), hr * 0.42, hr * 0.15, hr * 0.78, o.eye, o.oneEye);
  if (o.jowls) { // bulldog: droopy jowls, little underbite teeth, wrinkly brow
    [-1, 1].forEach((s) => { ell(hr * 0.32, hr * 0.36, hr * 0.3, c2, head, s * hr * 0.3, -hr * 0.44, hr * 0.7); cone(hr * 0.06, hr * 0.15, '#ffffff', head, s * hr * 0.18, -hr * 0.4, hr * 1.0); });
    box(hr * 0.8, hr * 0.07, hr * 0.12, shade(c1, -0.25), head, 0, hr * 0.42, hr * 0.78);
  }
  if (o.cheeks) [-1, 1].forEach((s) => ell(hr * 0.35, hr * 0.3, hr * 0.3, o.cheekCol || c2, head, s * hr * 0.62, -hr * 0.3, hr * 0.4));
  // ears
  const ec = o.points ? c2 : (o.earCol || c1);
  P.ears = [];
  [-1, 1].forEach((s) => {
    const eg = grp(head, s * hr * 0.55, hr * 0.62, -hr * 0.05); P.ears.push(eg);
    switch (o.ears) {
      case 'flop': { const e = ell(hr * 0.22, hr * 0.5, hr * 0.32, o.earCol || c1, eg, s * hr * 0.25, -hr * 0.45, 0); e.rotation.z = s * 0.25; break; }
      case 'fold': { const e = box(hr * 0.42, hr * 0.12, hr * 0.42, o.earCol || '#5b6068', eg, s * hr * 0.05, 0.02, hr * 0.15); e.rotation.x = 0.6; e.rotation.z = s * -0.4; break; }
      case 'point': { const e = cone(hr * 0.3, hr * 0.75, ec, eg, 0, hr * 0.3, 0); e.rotation.z = s * -0.25; break; }
      case 'cat': { const e = mesh(G.cone4, ec, eg, 0, hr * 0.22, 0, hr * 0.36, hr * 0.55, hr * 0.2); e.rotation.z = s * -0.3; mesh(G.cone4, '#f9a8b8', eg, 0, hr * 0.2, hr * 0.06, hr * 0.2, hr * 0.38, hr * 0.1).rotation.z = s * -0.3; break; }
      case 'round': { const e = mesh(G.cyl, o.earCol || '#f3c1c6', eg, 0, hr * 0.12, 0, hr * (o.earR || 0.38), 0.03, hr * (o.earR || 0.38)); e.rotation.x = Math.PI / 2; mesh(G.cyl, c1, eg, 0, hr * 0.12, -0.012, hr * (o.earR || 0.38) * 1.12, 0.025, hr * (o.earR || 0.38) * 1.12).rotation.x = Math.PI / 2; break; }
      case 'bunny': { eg.position.x = s * hr * 0.3; eg.position.y = hr * 0.75; const e = ell(hr * 0.2, hr * 0.85, hr * 0.12, c1, eg, 0, hr * 0.7, 0); e.rotation.z = s * -0.15; const i2 = ell(hr * 0.11, hr * 0.68, hr * 0.06, '#ffc6d3', eg, 0, hr * 0.7, hr * 0.07); i2.rotation.z = s * -0.15; break; }
      case 'horn': { const e = cone(hr * 0.13, hr * 0.6, o.hornCol || '#fde68a', eg, 0, hr * 0.25, -hr * 0.1); e.rotation.x = -0.5; break; }
      case 'pony': { const e = cone(hr * 0.2, hr * 0.5, c1, eg, 0, hr * 0.15, -hr * 0.2); e.rotation.z = s * -0.2; break; }
      case 'antenna': if (s > 0) { cyl(0.012, hr * 0.8, '#64748b', eg, 0, hr * 0.4, 0); sph(hr * 0.12, M(c2, { emissive: c2 }), eg, 0, hr * 0.85, 0); } else { const e = box(hr * 0.3, hr * 0.3, hr * 0.12, c1, eg, 0, hr * 0.1, 0); e.rotation.z = 0.2; } break;
      default: break;
    }
  });
  if (o.uniHorn) { const hn = cone(hr * 0.15, hr * 1.1, '#fde047', head, 0, hr * 1.1, hr * 0.35); hn.rotation.x = 0.35; }
  if (o.mane) { for (let i = 0; i < 6; i++) ell(hr * 0.22, hr * 0.32, hr * 0.28, o.maneCol || c2, body, 0, hy - hr * 0.1 - i * hr * 0.32 + 0.0, hz - hr * 0.7 - i * hr * 0.32); }
  // tail
  const tg = P.tail = grp(body, 0, cy + H * (o.tailUp || 0.25), -L * 0.48);
  switch (o.tail) {
    case 'stub': ell(0.05, 0.11, 0.05, c1, tg, 0, 0.08, -0.02).rotation.x = -0.5; break;
    case 'fluffy': { const t = ell(0.08, 0.2, 0.08, c1, tg, 0, 0.12, -0.08); t.rotation.x = -0.9; break; }
    case 'curl': { const t = mesh(G.torus, c1, tg, 0, 0.1, -0.02, 0.07, 0.07, 0.07); t.rotation.y = Math.PI / 2; break; }
    case 'long': { const t = cyl(0.04, 0.42, o.points ? c2 : c1, tg, 0, 0.18, -0.08); t.rotation.x = -0.45; break; }
    case 'rat': { const t = cone(0.035, 0.6, '#f0b6b6', tg, 0, 0.0, -0.3); t.rotation.x = -Math.PI / 2 + 0.25; break; }
    case 'puff': sph(0.09, o.puffCol || '#ffffff', tg, 0, 0.0, -0.03); break;
    case 'dragon': { const t = cone(0.1, 0.6, c1, tg, 0, 0.0, -0.28); t.rotation.x = -Math.PI / 2 + 0.3; const tip = mesh(G.cone4, c2, tg, 0, 0.07, -0.58, 0.1, 0.16, 0.04); tip.rotation.x = -Math.PI / 2; break; }
    case 'mane': for (let i = 0; i < 3; i++) { const t = ell(0.06, 0.24, 0.06, o.maneCol || c2, tg, (i - 1) * 0.04, -0.08, -0.1); t.rotation.x = -0.4; } break;
    case 'robot': { const t = cyl(0.03, 0.3, '#64748b', tg, 0, 0.12, -0.05); t.rotation.x = -0.6; sph(0.05, M(c2, { emissive: c2 }), tg, 0, 0.25, -0.13); break; }
    default: break;
  }
  if (o.wings) {
    P.wings = [];
    [-1, 1].forEach((s) => { const wg = grp(body, s * Wd * 0.4, cy + H * 0.4, 0.02); const w = mesh(G.cone4, c2, wg, s * 0.2, 0.06, 0, 0.12, 0.42, 0.24); w.rotation.z = s * -1.35; w.rotation.y = 0.2; P.wings.push(wg); });
    for (let i = 0; i < 4; i++) cone(0.04, 0.1, c2, body, 0, cy + H * 0.5, L * 0.25 - i * 0.16);
  }
  if (o.galaxy) { for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, b = Math.random() * Math.PI * 0.8; sph(0.014, M('#ffffff', { emissive: '#ffffff' }), body, Math.cos(a) * Math.sin(b) * Wd * 0.5, cy + Math.cos(b) * H * 0.5, Math.sin(a) * Math.sin(b) * L * 0.5); } }
  P.h = hy + hr * 1.1;
  P.att.head.position.set(0, hr * (o.robot ? 0.8 : 0.88), 0); head.add(P.att.head);
  P.att.face.position.set(0, hr * 0.15, hr * 0.92); head.add(P.att.face);
  P.att.neck.position.set(0, hy - hr * 0.75, hz - hr * 0.35); body.add(P.att.neck); P.neckR = Math.max(Wd * 0.36, hr * 0.62);
  if (o.neckUp) { P.att.neck.position.set(0, (cy + hy) / 2 + 0.06, L * 0.42 + hr * 0.25); P.att.neck.rotation.x = 0.5; P.neckR = hr * 0.6; }
  P.legH = lh; P.hop = !!o.hop;
}

function bird(P, o) {
  const c1 = o.c1, c2 = o.c2; P.cy = 0.32; P.rig.position.y = P.cy; const body = P.body = grp(P.rig, 0, -P.cy, 0);
  const b = ell(0.17, 0.22, 0.2, c1, body, 0, 0.32, 0); b.rotation.x = 0.3;
  ell(0.12, 0.15, 0.1, c2, body, 0, 0.3, 0.1);
  const head = P.head = grp(body, 0, 0.56, 0.06); P.headR = 0.15;
  sph(0.15, c1, head, 0, 0, 0);
  const bk = cone(0.06, 0.12, '#f5d38a', head, 0, -0.03, 0.17); bk.rotation.x = Math.PI / 2 + 0.4;
  P.eyes = eyes(head, 0.032, 0.075, 0.03, 0.12, o.eye, o.oneEye);
  for (let i = 0; i < 3; i++) { const cr = ell(0.03, 0.08, 0.03, c2, head, 0, 0.15, -0.05 + i * 0.04); cr.rotation.x = -0.4; }
  P.wings = [];
  [-1, 1].forEach((s) => { const wg = grp(body, s * 0.16, 0.42, 0); const w = ell(0.05, 0.17, 0.13, c2, wg, s * 0.02, -0.1, -0.02); w.rotation.x = 0.3; P.wings.push(wg); });
  const tg = P.tail = grp(body, 0, 0.2, -0.16); for (let i = 0; i < 3; i++) { const t = box(0.05, 0.02, 0.26, i === 1 ? c2 : c1, tg, (i - 1) * 0.05, 0, -0.12); t.rotation.x = 0.5; }
  P.legs = [];
  [-1, 1].forEach((s) => { const lg = grp(body, s * 0.07, 0.14, 0.02); cyl(0.015, 0.14, '#9a8a6a', lg, 0, -0.07, 0); box(0.07, 0.015, 0.08, '#9a8a6a', lg, 0, -0.14, 0.02); P.legs.push(lg); });
  P.h = 0.75; P.legH = 0.14; P.hop = true;
  P.att.head.position.set(0, 0.14, 0); head.add(P.att.head); P.att.face.position.set(0, 0.03, 0.14); head.add(P.att.face);
  P.att.neck.position.set(0, 0.46, 0.04); body.add(P.att.neck); P.neckR = 0.12;
}

function fish(P, o) {
  P.cy = 0.55; P.rig.position.y = P.cy; const body = P.body = grp(P.rig, 0, -P.cy, 0);
  // floating bowl on a little cloud cushion
  const glass = new T.MeshLambertMaterial({ color: '#cdefff', transparent: true, opacity: 0.32, depthWrite: false });
  mesh(G.sph, glass, body, 0, 0.55, 0, 0.36, 0.34, 0.36).renderOrder = 2;
  const water = new T.MeshLambertMaterial({ color: '#38bdf8', transparent: true, opacity: 0.35, depthWrite: false });
  mesh(G.sph, water, body, 0, 0.5, 0, 0.33, 0.27, 0.33).renderOrder = 1;
  const rim = mesh(G.torus, '#e0f2fe', body, 0, 0.84, 0, 0.22, 0.22, 0.22); rim.rotation.x = Math.PI / 2;
  [[0, 0.17, 0], [0.16, 0.2, 0.06], [-0.15, 0.2, -0.05], [0.05, 0.21, -0.15]].forEach((q) => sph(0.12, '#ffffff', body, q[0], q[1], q[2]));
  cyl(0.18, 0.04, '#facc15', body, 0, 0.24, 0);
  const fg = P.fishG = grp(body, 0, 0.52, 0);
  const head = P.head = grp(fg, 0, 0, 0); P.headR = 0.12;
  ell(0.09, 0.1, 0.13, o.c1, head, 0, 0, 0);
  const tl = mesh(G.cone4, o.c2, head, 0, 0, -0.17, 0.08, 0.12, 0.03); tl.rotation.x = -Math.PI / 2; tl.rotation.y = Math.PI / 4;
  P.tail = grp(head, 0, 0, -0.12);
  const fin = mesh(G.cone4, o.c2, head, 0, 0.1, -0.02, 0.05, 0.08, 0.02); fin.rotation.x = -0.4;
  P.eyes = eyes(head, 0.028, 0.065, 0.025, 0.085, o.eye, o.oneEye);
  ell(0.02, 0.012, 0.012, '#c2410c', head, 0, -0.03, 0.125);
  P.legs = []; P.h = 0.95; P.legH = 0.2; P.headR = 0.12;
  P.att.head.position.set(0, 0.86, 0); body.add(P.att.head); P.att.face.position.set(0, 0.02, 0.12); head.add(P.att.face);
  P.att.neck.position.set(0, 0.84, 0); body.add(P.att.neck); P.neckR = 0.24; P.isFish = true;
}

const KIND = {
  dog: (o) => Object.assign({ len: 0.62, bh: 0.34, bw: 0.32, legH: o.short ? 0.14 : 0.27, headR: 0.22, tail: 'fluffy' }, o),
  cat: (o) => Object.assign({ len: 0.55, bh: 0.28, bw: 0.27, legH: 0.24, headR: 0.22, ears: 'cat', tail: 'long', snout: 0.04, eyeR: 0.22, tailUp: 0.4 }, o),
  rat: (o) => Object.assign({ len: 0.48, bh: 0.26, bw: 0.25, legH: 0.07, legW: 0.05, headR: 0.16, ears: 'round', earR: 0.42, tail: 'rat', pointy: 1, snout: 0.12, nose: '#f39cab', eyeR: 0.21, pawCol: '#f5b5bf', tailUp: -0.1 }, o),
  bunny: (o) => Object.assign({ len: 0.44, bh: 0.34, bw: 0.32, legH: 0.08, headR: 0.2, ears: 'bunny', tail: 'puff', snout: 0.05, nose: '#f39cab', hop: 1, cheeks: 1, legZ: 0.28 }, o),
  hamster: (o) => Object.assign({ len: 0.4, bh: 0.36, bw: 0.38, legH: 0.04, legW: 0.06, headR: 0.2, ears: 'round', earR: 0.3, tail: 'none', snout: 0.03, nose: '#f39cab', cheeks: 1, eyeR: 0.2, hop: 1 }, o),
  hedgehog: (o) => Object.assign({ len: 0.46, bh: 0.3, bw: 0.36, legH: 0.06, legW: 0.06, headR: 0.15, ears: 'round', earR: 0.28, tail: 'none', pointy: 1, snout: 0.1, spikes: 1, noBelly: 0 }, o),
  tortoise: (o) => Object.assign({ len: 0.6, bh: 0.3, bw: 0.48, legH: 0.12, legW: 0.11, headR: 0.13, ears: 'none', tail: 'none', snout: 0.04, shell: 1, legCol: '#9a8a5a', eyeR: 0.24, legZ: 0.3 }, o),
  dragon: (o) => Object.assign({ len: 0.62, bh: 0.34, bw: 0.32, legH: 0.24, headR: 0.22, ears: 'horn', tail: 'dragon', snout: 0.18, wings: 1, nose: '#7f1d1d', hornCol: '#fef3c7' }, o),
  pony: (o) => Object.assign({ len: 0.72, bh: 0.38, bw: 0.32, legH: 0.48, legW: 0.08, headR: 0.2, ears: 'pony', tail: 'mane', snout: 0.22, neckUp: 1, mane: 1, uniHorn: 1, headSz: 1.1 }, o),
  robodog: (o) => Object.assign({ len: 0.6, bh: 0.3, bw: 0.3, legH: 0.26, headR: 0.2, ears: 'antenna', tail: 'robot', snout: 0.0, robot: 1, legCol: '#64748b', pawCol: '#475569' }, o)
};

/* look = { sp, col:[c1,c2], eye, oneEye, lv, acc:{head,neck,face} } */
MD.pet = function (look) {
  const spc = GL.SPECIES[look.sp] || GL.SPECIES.schnauzer, kind = spc.kind;
  const g = new T.Group(), inner = grp(g), rig = grp(inner);
  const P = { g, inner, rig, att: { head: new T.Group(), neck: new T.Group(), face: new T.Group() }, act: null, actT: 0, actD: 1, ph: Math.random() * 6, blink: 2 + Math.random() * 3, mood: 1, look, kind };
  const o = Object.assign({}, spc.opt || {}, { c1: look.col[0], c2: look.col[1], eye: look.eye || (spc.opt && spc.opt.eye), oneEye: look.oneEye });
  if (o.stripes) o.stripeCol = shade(look.col[0], -0.35);
  if (kind === 'bird') bird(P, o);
  else if (kind === 'fish') fish(P, o);
  else quad(P, KIND[kind] ? KIND[kind](o) : KIND.dog(o));
  const sc = (spc.size || 1) * 1 * 1.3; P.scale = sc; g.scale.setScalar(sc);
  P.hTop = P.h * sc;
  MD.dress(P, look.acc || {});
  // blob shadow
  const sh = new T.Mesh(G.circle, shadowMat()); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.scale.setScalar(kind === 'pony' ? 0.5 : 0.36); sh.userData.noHit = 1; g.add(sh); P.shadow = sh;
  P.play = function (name, dur) { P.act = name; P.actT = 0; P.actD = dur || 1; };
  P.anim = animPet.bind(null, P);
  return P;
};
let _shadow = null;
function shadowMat() { if (!_shadow) _shadow = new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.18, depthWrite: false }); return _shadow; }
MD.shadowMat = shadowMat;
function shade(hex, k) { const c = new T.Color(hex); if (k < 0) c.multiplyScalar(1 + k); else c.lerp(new T.Color('#ffffff'), k); return '#' + c.getHexString(); }
MD.shade = shade;

/* accessories on a pet */
MD.dress = function (P, acc) {
  ['head', 'neck', 'face'].forEach((slot) => {
    const a = P.att[slot]; while (a.children.length) a.remove(a.children[0]);
    const id = acc && acc[slot]; if (!id || !GL.PET_ACC[id]) return;
    const m = MD.acc(id, P); if (m) a.add(m);
  });
};
MD.acc = function (id, P) {
  const g = new T.Group(), k = P ? P.headR / 0.2 : 1, nr = P ? P.neckR : 0.2;
  const s = grp(g); s.scale.setScalar(k);
  switch (id) {
    case 'partyhat': { const c = cone(0.12, 0.3, '#ec4899', s, 0, 0.15, 0); c.rotation.z = 0.15; sph(0.04, '#facc15', s, -0.02, 0.31, 0); for (let i = 0; i < 3; i++) { const r = mesh(G.ring, '#fde047', s, 0, 0.06 + i * 0.07, 0, 0.11 - i * 0.03, 0.11 - i * 0.03, 0.11 - i * 0.03); r.rotation.x = Math.PI / 2; } break; }
    case 'bow': { [-1, 1].forEach((d) => { const c = cone(0.07, 0.12, '#f472b6', s, d * 0.07, 0.04, 0.02); c.rotation.z = d * Math.PI / 2; }); sph(0.04, '#db2777', s, 0, 0.04, 0.03); g.position.x = 0.06; break; }
    case 'flower': { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; sph(0.045, ['#f472b6', '#facc15', '#a78bfa', '#ffffff'][i % 4], s, Math.cos(a) * 0.15, 0.01, Math.sin(a) * 0.15); } const r = mesh(G.ring, '#16a34a', s, 0, 0, 0, 0.15, 0.15, 0.15); r.rotation.x = Math.PI / 2; break; }
    case 'cap': { mesh(G.hemi, '#2563eb', s, 0, 0, 0, 0.17, 0.12, 0.17); box(0.2, 0.02, 0.14, '#1d4ed8', s, 0, 0.01, 0.17); sph(0.025, '#fff', s, 0, 0.12, 0); break; }
    case 'tophat': { cyl(0.2, 0.02, '#111827', s, 0, 0.01, 0); cyl(0.12, 0.22, '#111827', s, 0, 0.12, 0); cyl(0.125, 0.04, '#dc2626', s, 0, 0.05, 0); break; }
    case 'cowboy': { const b = cyl(0.27, 0.025, '#92400e', s, 0, 0.01, 0); b.scale.z = 0.22; cyl(0.12, 0.14, '#92400e', s, 0, 0.08, 0); cyl(0.125, 0.03, '#451a03', s, 0, 0.04, 0); break; }
    case 'wizard': { cyl(0.22, 0.02, '#5b21b6', s, 0, 0.01, 0); const c = cone(0.14, 0.38, '#6d28d9', s, 0, 0.2, 0); c.rotation.z = -0.12; for (let i = 0; i < 4; i++) sph(0.02, M('#fde047', { emissive: '#a16207' }), s, Math.cos(i * 1.6) * 0.1, 0.08 + i * 0.06, Math.sin(i * 1.6) * 0.1); break; }
    case 'crown': { const gold = M('#facc15', { emissive: '#7a5a00' }); const r = mesh(G.cyl, gold, s, 0, 0.04, 0, 0.13, 0.08, 0.13); r.material = gold; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; mesh(G.cone, gold, s, Math.cos(a) * 0.12, 0.11, Math.sin(a) * 0.12, 0.03, 0.08, 0.03); sph(0.018, '#ef4444', s, Math.cos(a) * 0.13, 0.05, Math.sin(a) * 0.13); } break; }
    case 'redcollar': case 'pinkcollar': case 'bellcollar': {
      const col = id === 'redcollar' ? '#dc2626' : id === 'pinkcollar' ? '#ec4899' : '#2563eb';
      const r = mesh(G.torus, col, g, 0, 0, 0, nr, nr, nr * 0.9); r.rotation.x = Math.PI / 2;
      if (id === 'bellcollar') sph(nr * 0.28, M('#facc15', { emissive: '#6b5200' }), g, 0, -nr * 0.18, nr * 1.08);
      else if (id === 'pinkcollar') { const h = grp(g, 0, -nr * 0.25, nr * 1.08); [-1, 1].forEach((d) => sph(nr * 0.13, '#fde047', h, d * nr * 0.08, 0, 0)); const c = cone(nr * 0.18, nr * 0.2, '#fde047', h, 0, -nr * 0.12, 0); c.rotation.z = Math.PI; }
      else sph(nr * 0.16, '#fbbf24', g, 0, -nr * 0.2, nr * 1.05);
      break;
    }
    case 'bandana': { const r = mesh(G.torus, '#ef4444', g, 0, 0, 0, nr, nr, nr * 0.9); r.rotation.x = Math.PI / 2; const t = mesh(G.cone4, '#ef4444', g, 0, -nr * 0.35, nr * 0.85, nr * 0.6, nr * 0.6, nr * 0.15); t.rotation.z = Math.PI; for (let i = 0; i < 3; i++) sph(nr * 0.06, '#fff', g, (i - 1) * nr * 0.22, -nr * 0.25, nr * 0.98); break; }
    case 'bowtie': { [-1, 1].forEach((d) => { const c = cone(nr * 0.3, nr * 0.5, '#7c3aed', g, d * nr * 0.25, -nr * 0.1, nr * 0.95); c.rotation.z = d * Math.PI / 2; }); sph(nr * 0.13, '#5b21b6', g, 0, -nr * 0.1, nr * 1.0); break; }
    case 'scarf': { const r = mesh(G.torus, '#0ea5e9', g, 0, 0, 0, nr * 1.02, nr * 1.02, nr * 1.4); r.rotation.x = Math.PI / 2; box(nr * 0.35, nr * 0.9, nr * 0.12, '#0ea5e9', g, nr * 0.4, -nr * 0.5, nr * 0.9); box(nr * 0.36, nr * 0.08, nr * 0.13, '#f8fafc', g, nr * 0.4, -nr * 0.75, nr * 0.9); break; }
    case 'grumpycap': { ell(0.19, 0.07, 0.2, '#6b5b4b', s, 0, 0.035, 0); box(0.27, 0.025, 0.13, '#57483a', s, 0, 0.015, 0.17); sph(0.022, '#3f3328', s, 0, 0.1, 0); box(0.3, 0.012, 0.012, '#a8956f', s, 0, 0.05, 0.12); break; }
    case 'sunglasses': { [-1, 1].forEach((d) => box(0.13, 0.08, 0.02, '#111827', s, d * 0.09, 0, 0.03)); box(0.06, 0.02, 0.02, '#111827', s, 0, 0.02, 0.03); break; }
    case 'heartglasses': { [-1, 1].forEach((d) => { const h = grp(s, d * 0.09, 0, 0.03); sph(0.04, '#ec4899', h, -0.025, 0.015, 0).scale.z = 0.3; sph(0.04, '#ec4899', h, 0.025, 0.015, 0).scale.z = 0.3; const c = cone(0.058, 0.07, '#ec4899', h, 0, -0.035, 0); c.rotation.z = Math.PI; c.scale.z = 0.012; }); box(0.05, 0.015, 0.015, '#db2777', s, 0, 0.02, 0.03); break; }
    default: return null;
  }
  return g;
};

/* pet animation: P.anim(dt, speed) */
function animPet(P, dt, sp) {
  sp = sp || 0; P.ph += dt * (sp > 0.15 ? 6 + sp * 2.2 : 3);
  const moving = sp > 0.15 && !P.act, rig = P.rig, b = P.body, mood = P.mood;
  let ry = 0, rx = 0, rz = 0, py = P.cy, hx = 0, hy = 0, legA = 0, wag = Math.sin(P.ph * (1.5 + mood * 2.5)) * (0.15 + mood * 0.5), eyesClosed = false, lift = -1, legTuck = 0, wingA = 0;
  if (moving) {
    legA = Math.sin(P.ph) * Math.min(0.8, 0.25 + sp * 0.12);
    if (P.hop) py += Math.abs(Math.sin(P.ph)) * 0.12; else py += Math.abs(Math.sin(P.ph * 2)) * 0.025;
    hx = mood < 0.35 ? 0.25 : 0;
  } else if (!P.act) { py += Math.sin(P.ph * 0.8) * 0.006; hy = Math.sin(P.ph * 0.35) * 0.25; hx = mood < 0.35 ? 0.3 : Math.sin(P.ph * 0.5) * 0.06; }
  if (P.act) {
    P.actT += dt; const k = Math.min(1, P.actT / P.actD), e = Math.sin(k * Math.PI);
    switch (P.act) {
      case 'sit': rx = -0.42 * Math.min(1, k * 4) * (k > 0.9 ? (1 - k) * 10 : 1); legTuck = rx; py -= P.legH * 0.25 * Math.min(1, k * 4); break;
      case 'jump': py += e * 0.75; rx = -0.3 * e; legA = 0.6 * e; wingA = e; break;
      case 'spin': ry = k * TAU; py += e * 0.1; break;
      case 'roll': rz = k * TAU; py += e * 0.12; break;
      case 'wave': rx = -0.25; lift = Math.sin(P.actT * 14) * 0.4 - 1.7; hy = 0.15; break;
      case 'eat': hx = 0.55 + Math.sin(P.actT * 18) * 0.18; break;
      case 'dig': rx = 0.25; hx = 0.4; legA = Math.sin(P.actT * 26) * 0.9; py -= 0.02; break;
      case 'sniff': hx = 0.45 + Math.sin(P.actT * 22) * 0.05; hy = Math.sin(P.actT * 3) * 0.4; break;
      case 'happy': py += Math.abs(Math.sin(P.actT * 10)) * 0.16; wag = Math.sin(P.actT * 30) * 0.8; wingA = Math.abs(Math.sin(P.actT * 10)); break;
      case 'nope': hy = Math.sin(P.actT * 22) * 0.45; break;
      case 'catch': py += e * 0.9; rx = -0.4 * e; wingA = e; break;
      case 'lean': hx = -0.15; rz = Math.sin(P.actT * 3) * 0.12; eyesClosed = true; wag = Math.sin(P.actT * 25) * 0.7; break;
      case 'sleep': py -= P.legH * 0.7; legTuck = 1; eyesClosed = true; hx = 0.2; rig.scale.y = 1 + Math.sin(P.actT * 2.4) * 0.03; if (k >= 1) P.actT = P.actD * 0.5; break;
      case 'bath': eyesClosed = true; hy = Math.sin(P.actT * 9) * 0.2; break;
      case 'shake': rz = Math.sin(P.actT * 40) * 0.25 * (1 - k); break;
      default: break;
    }
    if (P.act !== 'sleep') rig.scale.y = 1;
    if (k >= 1 && P.act !== 'sleep') P.act = null;
  } else rig.scale.y = 1;
  rig.position.y = py; rig.rotation.set(rx, ry, rz);
  if (P.head) { P.head.rotation.x = hx; P.head.rotation.y = hy; }
  P.legs.forEach((l, i) => {
    if (legTuck && P.act === 'sleep') { l.rotation.x = i < 2 ? -1.3 : 1.3; return; }
    if (legTuck && P.act === 'sit') { l.rotation.x = i < 2 ? -legTuck * 0.5 : -1.2; return; }
    l.rotation.x = (i === 0 || i === 3 ? legA : -legA);
    if (i === 1 && lift > -1.5 && P.act === 'wave') l.rotation.x = lift;
  });
  if (P.tail) P.tail.rotation.y = wag;
  if (P.wings) P.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (wingA ? Math.sin(P.actT * 30) * 0.7 * wingA : moving ? Math.sin(P.ph * 2) * 0.12 : 0); });
  if (P.isFish && P.fishG) { const t = P.ph * 0.6; P.fishG.position.set(Math.sin(t) * 0.12, 0.52 + (P.act === 'jump' || P.act === 'catch' ? 0 : Math.sin(t * 2) * 0.02), Math.cos(t) * 0.08); P.fishG.rotation.y = t + Math.PI / 2 + (P.act ? 0 : 0); if (P.tail) P.tail.rotation.y = Math.sin(P.ph * 8) * 0.5; }
  P.blink -= dt; const bl = P.blink < 0.12;
  if (P.blink < 0) P.blink = 2 + Math.random() * 4;
  P.eyes && P.eyes.forEach((e) => { if (!e.closed) e.g.scale.y = eyesClosed ? 0.12 : bl ? 0.15 : 1; });
}


/* ---------------- props ---------------- */
MD.tree = function (p, x, z, s, col) { const g = grp(p, x, 0, z); s = s || 1; cyl(0.18 * s, 1.4 * s, '#8b5a2b', g, 0, 0.7 * s, 0); sph(0.95 * s, col || '#22c55e', g, 0, 1.9 * s, 0); sph(0.7 * s, col ? shade(col, 0.15) : '#4ade80', g, 0.35 * s, 2.35 * s, 0.2 * s); return g; };
MD.palm = function (p, x, z) { const g = grp(p, x, 0, z); for (let i = 0; i < 6; i++) { const c = cyl(0.16 - i * 0.012, 0.6, '#a16207', g, Math.sin(i * 0.3) * 0.2, 0.3 + i * 0.55, 0); c.rotation.z = -0.08; } for (let i = 0; i < 6; i++) { const l = ell(0.9, 0.06, 0.25, '#16a34a', g, Math.cos(i / 6 * TAU) * 0.8 + 0.3, 3.4, Math.sin(i / 6 * TAU) * 0.8); l.rotation.y = -i / 6 * TAU; l.rotation.z = -0.3; } return g; };
MD.bush = function (p, x, z, s) { const g = grp(p, x, 0, z); s = s || 1; sph(0.6 * s, '#16a34a', g, 0, 0.45 * s, 0); sph(0.45 * s, '#22c55e', g, 0.4 * s, 0.4 * s, 0.2 * s); return g; };
MD.flowers = function (p, x, z) { const g = grp(p, x, 0, z); for (let i = 0; i < 5; i++) { cyl(0.02, 0.3, '#16a34a', g, Math.cos(i * 1.3) * 0.3, 0.15, Math.sin(i * 1.3) * 0.3); sph(0.08, ['#f472b6', '#facc15', '#a78bfa', '#fb7185', '#ffffff'][i], g, Math.cos(i * 1.3) * 0.3, 0.32, Math.sin(i * 1.3) * 0.3); } return g; };
MD.bench = function (p, x, z, ry) { const g = grp(p, x, 0, z); g.rotation.y = ry || 0; box(1.8, 0.08, 0.5, '#b45309', g, 0, 0.5, 0); box(1.8, 0.4, 0.08, '#b45309', g, 0, 0.8, -0.22); [-0.75, 0.75].forEach((q) => box(0.08, 0.5, 0.45, '#374151', g, q, 0.25, 0)); return g; };
MD.lampPost = function (p, x, z) { const g = grp(p, x, 0, z); cyl(0.07, 3, '#1f2937', g, 0, 1.5, 0); sph(0.22, M('#fef9c3', { emissive: '#a16207' }), g, 0, 3.1, 0); return g; };
MD.fence = function (p, x0, z0, x1, z1, col) { const g = grp(p); const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.2)); for (let i = 0; i <= n; i++) box(0.12, 0.8, 0.12, col || '#fff7ed', g, x0 + (x1 - x0) * i / n, 0.4, z0 + (z1 - z0) * i / n); const r = box(L, 0.08, 0.06, col || '#fff7ed', g, (x0 + x1) / 2, 0.6, (z0 + z1) / 2); r.rotation.y = -Math.atan2(z1 - z0, x1 - x0); const r2 = r.clone(); r2.position.y = 0.3; g.add(r2); return g; };


/* ======================================================================
   People: players + townsfolk. look = { skin, hair, hc, top, tc, bc, sc, hat, hatc, gl, apron, mustache, beard, cane, frown }
   Built facing +Z. ch.anim(dt, speed, wave) and ch.pose('sit'|'lie'|null)
   ====================================================================== */
MD.avatar = function (L) {
  L = Object.assign({ skin: '#f6c9a3', hair: 'short', hc: '#3b2414', top: 'tee', tc: '#ff4fd8', bc: '#334155', sc: '#f8fafc', hat: 'none', gl: 'none' }, L || {});
  const g = new T.Group(), body = grp(g), skin = L.skin, tc = L.tc, bc = L.bc;
  const legs = [], arms = [];
  const bare = L.top === 'dress';
  [-1, 1].forEach((s) => { const l = grp(body, s * 0.13, 0.62, 0); box(0.18, 0.52, 0.2, bare ? skin : bc, l, 0, -0.28, 0); box(0.22, 0.1, 0.3, L.sc || '#f8fafc', l, 0, -0.56, 0.04); legs.push(l); });
  const torsoCol = L.top === 'jacket' || L.top === 'suit' || L.top === 'coat' ? (L.top === 'coat' ? bc : '#f8fafc') : L.top === 'overalls' ? tc : tc;
  box(0.52, 0.52, 0.3, torsoCol, body, 0, 0.86, 0);
  const longSleeve = L.top !== 'tee' && L.top !== 'dress' && L.top !== 'overalls';
  const sleeveCol = L.top === 'jacket' || L.top === 'suit' || L.top === 'coat' ? tc : tc;
  [-1, 1].forEach((s) => { const a = grp(body, s * 0.33, 1.08, 0);
    if (longSleeve) box(0.14, 0.44, 0.16, sleeveCol, a, 0, -0.2, 0); else { box(0.145, 0.22, 0.165, sleeveCol, a, 0, -0.09, 0); box(0.12, 0.24, 0.14, skin, a, 0, -0.3, 0); }
    box(0.13, 0.11, 0.15, skin, a, 0, -0.46, 0); arms.push(a); });
  switch (L.top) {
    case 'hoodie': box(0.4, 0.3, 0.12, shade(tc, -0.15), body, 0, 1.18, -0.2); box(0.3, 0.12, 0.02, shade(tc, -0.1), body, 0, 0.72, 0.16); break;
    case 'dress': { const sk = mesh(G.cyl, tc, body, 0, 0.47, 0, 1, 1, 1); sk.geometry = SKIRT; sk.scale.set(1, 1, 1); box(0.54, 0.06, 0.32, shade(tc, -0.2), body, 0, 0.66, 0); break; }
    case 'overalls': box(0.4, 0.3, 0.02, bc, body, 0, 0.78, 0.16); [-1, 1].forEach((s) => box(0.07, 0.3, 0.02, bc, body, s * 0.16, 0.98, 0.16)); box(0.12, 0.08, 0.02, '#facc15', body, 0, 0.84, 0.17); break;
    case 'jacket': case 'suit': case 'coat': {
      [-1, 1].forEach((s) => box(0.2, 0.52, 0.02, tc, body, s * 0.16, 0.86, 0.16)); box(0.52, 0.52, 0.02, tc, body, 0, 0.86, -0.16);
      if (L.top === 'suit') { box(0.07, 0.3, 0.025, '#dc2626', body, 0, 0.88, 0.165); }
      if (L.top === 'coat') { [-1, 1].forEach((s) => box(0.24, 0.3, 0.3, tc, body, s * 0.14, 0.46, 0)); box(0.08, 0.06, 0.02, '#ef4444', body, 0.15, 0.98, 0.175); }
      break; }
    case 'sparkle': for (let i = 0; i < 10; i++) sph(0.025, M('#ffffff', { emissive: '#fde047' }), body, -0.22 + (i * 0.37) % 0.44, 0.66 + (i * 0.13) % 0.4, 0.16); box(0.54, 0.06, 0.32, '#fde047', body, 0, 0.62, 0); break;
    case 'sweater': box(0.53, 0.08, 0.31, shade(tc, 0.45), body, 0, 0.9, 0); box(0.53, 0.04, 0.31, shade(tc, 0.45), body, 0, 0.78, 0); break;
    default: break;
  }
  if (L.apron) box(0.44, 0.5, 0.02, L.apron, body, 0, 0.74, 0.165);
  const head = grp(body, 0, 1.42, 0);
  ell(0.3, 0.32, 0.3, skin, head, 0, 0, 0);
  [-1, 1].forEach((s) => { sph(0.045, '#1b1420', head, s * 0.1, 0.02, 0.27); ell(0.05, 0.03, 0.02, '#ff9aa8', head, s * 0.17, -0.07, 0.25); });
  let frownG = null, smileG = null;
  if (L.frown) {
    frownG = grp(head, 0, -0.115, 0.29); smileG = grp(head, 0, -0.115, 0.29); smileG.visible = false;
    [-1, 1].forEach((s) => { const f = box(0.075, 0.022, 0.02, '#7a2e24', frownG, s * 0.032, 0, 0); f.rotation.z = -s * 0.4; const m = box(0.075, 0.022, 0.02, '#a8483a', smileG, s * 0.032, 0.005, 0); m.rotation.z = s * 0.4; });
    [-1, 1].forEach((s) => { const b = box(0.12, 0.035, 0.03, L.hc, head, s * 0.1, 0.105, 0.28); b.rotation.z = s * 0.38; });
  } else { const m = mesh(G.torus, '#a8483a', head, 0, -0.1, 0.27, 0.06, 0.06, 0.03); m.rotation.z = Math.PI; m.scale.set(0.06, 0.035, 0.05); }
  if (L.mustache) [-1, 1].forEach((s) => { const m = ell(0.07, 0.03, 0.03, L.mustache, head, s * 0.05, -0.07, 0.295); m.rotation.z = s * 0.25; });
  if (L.beard) ell(0.24, 0.18, 0.16, L.beard, head, 0, -0.2, 0.16);
  hairOn(head, L.hair, L.hc);
  hatOn(head, L.hat, L.hatc);
  glassesOn(head, L.gl);
  const sh = new T.Mesh(G.circle, shadowMat()); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.scale.setScalar(0.42); g.add(sh);
  if (L.cane) { cyl(0.025, 0.66, '#5b3a1e', arms[1], 0, -0.82, 0.07); const crook = mesh(G.torus, '#5b3a1e', arms[1], 0.05, -0.5, 0.07, 0.05, 0.05, 0.05); crook.rotation.y = Math.PI / 2; }
  const ch = { g, body, head, legs, arms, ph: Math.random() * 6, h: 1.8, posed: null, shadow: sh };
  ch.setSmile = function (on) { if (!frownG) return; frownG.visible = !on; smileG.visible = !!on; };
  ch.pose = function (p) { ch.posed = p || null; };
  ch.anim = function (dt, sp, wave, act) {
    ch.ph += dt * (sp > 0.1 ? Math.min(10, 2.5 + sp * 4) : 2);
    let a = sp > 0.1 ? Math.sin(ch.ph) * Math.min(0.7, 0.25 + sp * 0.15) : 0;
    body.rotation.set(0, 0, 0); body.position.set(0, 0, 0); sh.visible = true;
    if (ch.posed === 'sit') { legs.forEach((l) => { l.rotation.x = -1.45; }); body.position.y = -0.2; arms[0].rotation.x = -0.4; arms[1].rotation.x = wave ? -2.6 + Math.sin(ch.ph * 3) * 0.3 : -0.4; if (act === 'game') { arms[0].rotation.x = -1.1 + Math.sin(ch.ph * 9) * 0.1; arms[1].rotation.x = -1.1 + Math.cos(ch.ph * 9) * 0.1; } return; }
    if (ch.posed === 'lie') { legs.forEach((l) => { l.rotation.x = 0; }); arms.forEach((m) => { m.rotation.x = 0; }); body.rotation.x = -Math.PI / 2; body.position.set(0, 0.62, -0.75); sh.visible = false; return; }
    if (ch.posed === 'drive') { legs.forEach((l) => { l.rotation.x = -1.45; }); body.position.y = -0.2; arms.forEach((m) => { m.rotation.x = -1.2; }); return; }
    if (act === 'cook' || act === 'work') { arms[0].rotation.x = -1.2 + Math.sin(ch.ph * 6) * 0.25; arms[1].rotation.x = -1.2 + Math.cos(ch.ph * 6) * 0.25; legs[0].rotation.x = legs[1].rotation.x = 0; return; }
    if (act === 'dance') { const d = Math.sin(ch.ph * 4); arms[0].rotation.x = -2.4 + d * 0.5; arms[1].rotation.x = -2.4 - d * 0.5; body.position.y = Math.abs(d) * 0.08; body.rotation.y = d * 0.4; legs[0].rotation.x = d * 0.3; legs[1].rotation.x = -d * 0.3; return; }
    if (act === 'shower') { arms[0].rotation.x = -2.6 + Math.sin(ch.ph * 8) * 0.3; arms[1].rotation.x = -2.6 + Math.cos(ch.ph * 8) * 0.3; legs[0].rotation.x = legs[1].rotation.x = 0; return; }
    if (act === 'spray') { arms[0].rotation.x = arms[1].rotation.x = -1.5; legs[0].rotation.x = legs[1].rotation.x = 0; return; }
    legs[0].rotation.x = a; legs[1].rotation.x = -a; arms[0].rotation.x = -a * 0.8; arms[1].rotation.x = wave ? -2.6 + Math.sin(ch.ph * 3) * 0.3 : a * 0.8;
    body.position.y = sp > 0.1 ? Math.abs(Math.sin(ch.ph)) * 0.05 : Math.sin(ch.ph) * 0.01;
  };
  return ch;
};
const SKIRT = new T.CylinderGeometry(0.29, 0.42, 0.42, 14);
function hairOn(h, st, c) {
  if (st === 'buzz') { ell(0.31, 0.25, 0.31, c, h, 0, 0.1, -0.02); return; }
  if (st === 'bob') { ell(0.34, 0.31, 0.33, c, h, 0, 0.05, -0.04); box(0.5, 0.1, 0.1, c, h, 0, 0.2, 0.22); [-1, 1].forEach((s) => box(0.1, 0.36, 0.3, c, h, s * 0.29, -0.08, -0.02)); return; }
  ell(0.315, 0.29, 0.31, c, h, 0, 0.08, -0.03);
  box(0.46, 0.08, 0.08, c, h, 0, 0.24, 0.24);
  switch (st) {
    case 'long': box(0.56, 0.6, 0.18, c, h, 0, -0.22, -0.17); [-1, 1].forEach((s) => box(0.08, 0.5, 0.2, c, h, s * 0.29, -0.15, -0.02)); break;
    case 'ponytail': sph(0.11, c, h, 0, 0.08, -0.33); ell(0.09, 0.24, 0.09, c, h, 0, -0.16, -0.38); break;
    case 'bun': sph(0.15, c, h, 0, 0.36, -0.06); break;
    case 'curly': for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; sph(0.12, c, h, Math.cos(a) * 0.27, 0.12 + Math.sin(i * 1.7) * 0.06, Math.sin(a) * 0.27 - 0.03); } sph(0.2, c, h, 0, 0.3, -0.02); break;
    case 'pigtails': [-1, 1].forEach((s) => { sph(0.11, c, h, s * 0.33, 0.0, -0.08); ell(0.08, 0.2, 0.08, c, h, s * 0.36, -0.2, -0.08); }); break;
    case 'spiky': for (let i = 0; i < 7; i++) { const sp = cone(0.08, 0.26, c, h, -0.21 + i * 0.07, 0.34, -0.05 + (i % 2) * 0.08); sp.rotation.z = (i - 3) * -0.15; } break;
    default: break;
  }
}
function hatOn(h, hat, col) {
  switch (hat) {
    case 'cap': { const c = col || '#2563eb'; mesh(G.hemi, c, h, 0, 0.2, -0.02, 0.33, 0.2, 0.33); box(0.36, 0.04, 0.22, shade(c, -0.15), h, 0, 0.2, 0.3); break; }
    case 'beanie': { mesh(G.hemi, col || '#ef4444', h, 0, 0.16, -0.02, 0.34, 0.28, 0.34); cyl(0.345, 0.08, shade(col || '#ef4444', 0.3), h, 0, 0.17, -0.02); sph(0.07, '#fff', h, 0, 0.45, -0.02); break; }
    case 'sunhat': { cyl(0.55, 0.03, '#fde68a', h, 0, 0.22, 0); mesh(G.hemi, '#fde68a', h, 0, 0.22, 0, 0.3, 0.22, 0.3); cyl(0.31, 0.06, '#f472b6', h, 0, 0.26, 0); break; }
    case 'cowboy': { const b = cyl(0.55, 0.03, '#92400e', h, 0, 0.24, 0); b.scale.z = 0.42; cyl(0.25, 0.26, '#92400e', h, 0, 0.36, 0); cyl(0.255, 0.05, '#451a03', h, 0, 0.27, 0); break; }
    case 'flower': for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; sph(0.06, ['#f472b6', '#facc15', '#a78bfa', '#ffffff'][i % 4], h, Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.3); } break;
    case 'headphones': { const r = mesh(G.torus, '#111827', h, 0, 0.12, 0, 0.33, 0.33, 0.33); r.rotation.y = Math.PI / 2; r.scale.set(0.33, 0.33, 0.2); [-1, 1].forEach((s) => cyl(0.1, 0.08, '#ff4fd8', h, s * 0.31, 0, 0).rotation.z = Math.PI / 2); break; }
    case 'crown': { const gold = M('#facc15', { emissive: '#7a5a00' }); mesh(G.cyl, gold, h, 0, 0.32, 0, 0.22, 0.12, 0.22); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; mesh(G.cone, gold, h, Math.cos(a) * 0.2, 0.43, Math.sin(a) * 0.2, 0.05, 0.12, 0.05); } break; }
    case 'bow': { [-1, 1].forEach((s) => { const c = cone(0.1, 0.18, col || '#f472b6', h, s * 0.1, 0.32, 0); c.rotation.z = s * Math.PI / 2; }); sph(0.05, '#db2777', h, 0, 0.32, 0); break; }
    case 'chef': cyl(0.3, 0.12, '#ffffff', h, 0, 0.26, -0.02); cyl(0.32, 0.3, '#ffffff', h, 0, 0.45, -0.02); sph(0.34, '#ffffff', h, 0, 0.62, -0.02).scale.y = 0.6; break;
    case 'helmet': { mesh(G.hemi, '#dc2626', h, 0, 0.16, -0.02, 0.36, 0.3, 0.36); const b = cyl(0.44, 0.03, '#b91c1c', h, 0, 0.16, -0.06); b.scale.z = 1.2; box(0.12, 0.14, 0.03, '#facc15', h, 0, 0.32, 0.33); break; }
    case 'police': { cyl(0.33, 0.12, '#1e3a8a', h, 0, 0.24, 0); cyl(0.36, 0.06, '#1e3a8a', h, 0, 0.33, 0.02); box(0.36, 0.03, 0.18, '#111827', h, 0, 0.2, 0.3); box(0.09, 0.09, 0.02, '#facc15', h, 0, 0.29, 0.33); break; }
    default: break;
  }
}
function glassesOn(h, gl) {
  if (!gl || gl === 'none') return;
  const z = 0.3;
  if (gl === 'round') { [-1, 1].forEach((s) => { const r = mesh(G.torus, '#1f2937', h, s * 0.1, 0.02, z, 0.065, 0.065, 0.065); }); box(0.06, 0.015, 0.015, '#1f2937', h, 0, 0.03, z); return; }
  const col = gl === 'shades' ? '#111827' : gl === 'stars' ? '#facc15' : '#ec4899';
  [-1, 1].forEach((s) => { const b = box(0.15, 0.1, 0.03, M(col, gl === 'shades' ? {} : { emissive: shade(col, -0.6) }), h, s * 0.1, 0.02, z); if (gl === 'stars') b.rotation.z = Math.PI / 4; });
  box(0.08, 0.02, 0.02, col, h, 0, 0.04, z);
}

/* ======================================================================
   Cars: built facing +Z. returns { g, wheels, seats:[[x,y,z]], L, Wd, lights }
   ====================================================================== */
const GLASS = () => M('#1e3a5f', { transparent: true, opacity: 0.75 });
MD.car = function (type, col) {
  const g = new T.Group(), body = grp(g), wheels = []; col = col || '#ef4444';
  let L = 3.6, Wd = 1.8, wr = 0.34, seatY = 0.55, seats = [[0.4, 0.55, 0.1], [-0.4, 0.55, 0.1], [0.4, 0.55, -0.9], [-0.4, 0.55, -0.9]], wz = 1.2, wx = 0.82, extra = {};
  const dark = shade(col, -0.3);
  switch (type) {
    case 'golf':
      L = 2.4; Wd = 1.35; wr = 0.24; wz = 0.78; wx = 0.6; seatY = 0.35; seats = [[0.3, 0.35, -0.1], [-0.3, 0.35, -0.1]];
      box(1.3, 0.35, 2.3, col, body, 0, 0.42, 0); box(1.2, 0.3, 0.5, '#f8fafc', body, 0, 0.75, -0.25); box(1.25, 0.1, 0.8, '#1f2937', body, 0, 0.6, -0.05);
      [[-0.55, 0.85], [0.55, 0.85], [-0.55, -0.75], [0.55, -0.75]].forEach((q) => cyl(0.03, 1.1, '#e5e7eb', body, q[0], 1.15, q[1]));
      box(1.4, 0.06, 1.9, '#f8fafc', body, 0, 1.72, 0.05); box(1.1, 0.4, 0.04, GLASS(), body, 0, 1.25, 0.85);
      box(0.9, 0.25, 0.5, '#94a3b8', body, 0, 0.75, -1.0); for (let i = 0; i < 3; i++) cyl(0.07, 0.5, ['#ef4444', '#3b82f6', '#22c55e'][i], body, -0.3 + i * 0.3, 1.05, -1.0);
      break;
    case 'compact':
      L = 3.6; box(1.75, 0.6, 3.5, col, body, 0, 0.62, 0); box(1.55, 0.62, 2.0, col, body, 0, 1.22, -0.35);
      box(1.5, 0.5, 0.05, GLASS(), body, 0, 1.24, 0.66).rotation.x = -0.35; box(1.56, 0.45, 1.6, GLASS(), body, 0, 1.25, -0.4).scale.x = 1.002;
      break;
    case 'van':
      L = 4.2; Wd = 1.9; wr = 0.36; wz = 1.35; seatY = 0.75; seats = [[0.42, 0.75, 1.0], [-0.42, 0.75, 1.0], [0, 0.75, -0.5]];
      box(1.9, 0.9, 4.2, col, body, 0, 0.8, 0); box(1.9, 0.85, 4.0, '#fef3c7', body, 0, 1.65, -0.1); box(1.92, 0.12, 4.22, '#fef3c7', body, 0, 1.2, 0);
      box(1.7, 0.55, 0.05, GLASS(), body, 0, 1.7, 1.91); [-1, 1].forEach((s) => { box(0.05, 0.5, 2.8, GLASS(), body, s * 0.96, 1.7, -0.4); }); box(1.8, 0.08, 0.9, '#f8fafc', body, 0, 0.6, 2.13);
      [-1, 1].forEach((s) => { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; sph(0.09, ['#f472b6', '#facc15'][i % 2], body, s * 0.96, 0.85 + Math.sin(a) * 0.18, -0.9 + Math.cos(a) * 0.18); } sph(0.08, '#fff', body, s * 0.96, 0.85, -0.9); });
      break;
    case 'pickup':
      L = 4.4; Wd = 1.95; wr = 0.42; wz = 1.4; seatY = 0.85; seats = [[0.42, 0.85, 0.5], [-0.42, 0.85, 0.5], [0, 1.0, -1.3]];
      box(1.95, 0.75, 4.4, col, body, 0, 0.85, 0); box(1.85, 0.8, 1.7, col, body, 0, 1.6, 0.45); box(1.7, 0.6, 0.05, GLASS(), body, 0, 1.65, 1.31); box(1.87, 0.5, 1.2, GLASS(), body, 0, 1.68, 0.4);
      box(1.85, 0.12, 2.0, '#1f2937', body, 0, 1.23, -1.15); [-1, 1].forEach((s) => box(0.08, 0.4, 2.0, dark, body, s * 0.93, 1.4, -1.15)); box(1.95, 0.4, 0.08, dark, body, 0, 1.4, -2.16);
      box(1.95, 0.15, 0.2, '#e5e7eb', body, 0, 0.55, 2.22);
      break;
    case 'suv':
      L = 4.3; Wd = 2.0; wr = 0.42; wz = 1.38; seatY = 0.85; seats = [[0.42, 0.85, 0.5], [-0.42, 0.85, 0.5], [0.42, 0.85, -0.6], [-0.42, 0.85, -0.6]];
      box(2.0, 0.85, 4.3, col, body, 0, 0.85, 0); box(1.9, 0.75, 3.1, col, body, 0, 1.62, -0.4); box(1.8, 0.55, 0.05, GLASS(), body, 0, 1.64, 1.16); box(1.92, 0.5, 2.7, GLASS(), body, 0, 1.66, -0.45);
      box(1.6, 0.08, 2.4, '#1f2937', body, 0, 2.05, -0.4); [-0.7, 0.7].forEach((x) => box(0.06, 0.08, 2.6, '#9ca3af', body, x, 2.12, -0.4));
      break;
    case 'convertible':
      L = 4.0; box(1.85, 0.55, 4.0, col, body, 0, 0.6, 0); box(1.86, 0.1, 4.01, '#f8fafc', body, 0, 0.72, 0);
      box(1.6, 0.45, 0.05, GLASS(), body, 0, 1.15, 0.55).rotation.x = -0.4; box(1.5, 0.3, 0.6, '#7c2d12', body, 0, 1.0, -0.5); box(1.5, 0.3, 0.6, '#7c2d12', body, 0, 1.0, 0.0);
      seats = [[0.4, 0.5, 0.1], [-0.4, 0.5, 0.1]];
      break;
    case 'sports':
      L = 4.2; Wd = 1.9; wr = 0.36; seatY = 0.42; seats = [[0.4, 0.42, -0.1], [-0.4, 0.42, -0.1]];
      box(1.9, 0.45, 4.2, col, body, 0, 0.52, 0); const cab = box(1.5, 0.45, 1.7, GLASS(), body, 0, 0.95, -0.3); cab.scale.x = 1.5;
      box(1.5, 0.06, 1.2, col, body, 0, 1.18, -0.4); box(1.9, 0.08, 0.4, '#111827', body, 0, 1.05, -2.0); [-0.7, 0.7].forEach((x) => box(0.08, 0.35, 0.1, '#111827', body, x, 0.85, -2.0));
      box(0.3, 0.46, 4.21, '#f8fafc', body, 0, 0.53, 0);
      break;
    case 'firetruck':
      L = 6.4; Wd = 2.3; wr = 0.5; wz = 2.2; wx = 1.0; seatY = 1.2; seats = [[0.5, 1.2, 2.2], [-0.5, 1.2, 2.2], [0, 1.6, -0.5]];
      box(2.3, 1.4, 6.4, '#dc2626', body, 0, 1.25, 0); box(2.2, 0.9, 1.9, '#dc2626', body, 0, 2.35, 2.1); box(2.0, 0.6, 0.05, GLASS(), body, 0, 2.4, 3.06); box(2.32, 0.18, 6.42, '#f8fafc', body, 0, 1.15, 0);
      const lad = grp(body, 0, 2.15, -1.0); [-0.4, 0.4].forEach((x) => box(0.08, 0.08, 4.4, '#e5e7eb', lad, x, 0, 0)); for (let i = 0; i < 9; i++) box(0.8, 0.05, 0.05, '#e5e7eb', lad, 0, 0, -2 + i * 0.5);
      extra.siren = [sph(0.16, M('#ef4444', { emissive: '#ef4444' }), body, 0.6, 2.9, 2.4), sph(0.16, M('#3b82f6', { emissive: '#3b82f6' }), body, -0.6, 2.9, 2.4)];
      for (let i = 0; i < 4; i++) cyl(0.12, 2.2, '#9ca3af', body, 0, 1.0, -2.5 + i * 0.01).rotation.z = Math.PI / 2;
      break;
    case 'police':
      L = 4.2; Wd = 1.9; seatY = 0.6;
      box(1.9, 0.6, 4.2, '#f8fafc', body, 0, 0.65, 0); box(1.92, 0.62, 1.6, '#111827', body, 0, 0.65, 1.3); box(1.92, 0.62, 1.2, '#111827', body, 0, 0.65, -1.5);
      box(1.7, 0.6, 2.1, '#f8fafc', body, 0, 1.25, -0.3); box(1.72, 0.45, 1.8, GLASS(), body, 0, 1.28, -0.3);
      box(1.2, 0.12, 0.35, '#111827', body, 0, 1.6, -0.3);
      extra.siren = [box(0.5, 0.18, 0.3, M('#ef4444', { emissive: '#ef4444' }), body, 0.3, 1.72, -0.3), box(0.5, 0.18, 0.3, M('#3b82f6', { emissive: '#3b82f6' }), body, -0.3, 1.72, -0.3)];
      [-1, 1].forEach((s) => box(0.03, 0.22, 0.6, '#facc15', body, s * 0.96, 0.75, 0.1));
      break;
    case 'ambulance':
      L = 4.6; Wd = 2.0; wr = 0.4; wz = 1.5; seatY = 0.8; seats = [[0.45, 0.8, 1.3], [-0.45, 0.8, 1.3], [0, 0.8, -0.8]];
      box(2.0, 1.0, 4.6, '#f8fafc', body, 0, 0.9, 0); box(2.0, 1.1, 3.0, '#f8fafc', body, 0, 1.9, -0.75); box(1.8, 0.55, 0.05, GLASS(), body, 0, 1.75, 1.36).rotation.x = -0.2;
      box(2.02, 0.22, 4.62, '#ef4444', body, 0, 1.15, 0); [-1, 1].forEach((s) => { box(0.05, 0.6, 0.18, '#ef4444', body, s * 1.01, 1.95, -0.8); box(0.05, 0.18, 0.6, '#ef4444', body, s * 1.01, 1.95, -0.8); });
      box(0.6, 0.18, 0.05, '#ef4444', body, 0, 2.0, -2.26); box(0.18, 0.6, 0.05, '#ef4444', body, 0, 2.0, -2.26);
      extra.siren = [box(0.45, 0.2, 0.3, M('#ef4444', { emissive: '#ef4444' }), body, 0.4, 2.55, 0.5), box(0.45, 0.2, 0.3, M('#3b82f6', { emissive: '#3b82f6' }), body, -0.4, 2.55, 0.5)];
      break;
    case 'acvan':
      L = 4.4; Wd = 1.95; wr = 0.38; wz = 1.4; seatY = 0.8; seats = [[0.42, 0.8, 1.1], [-0.42, 0.8, 1.1], [0, 0.8, -0.6]];
      box(1.95, 0.9, 4.4, '#f8fafc', body, 0, 0.85, 0); box(1.9, 0.9, 1.6, '#f8fafc', body, 0, 1.7, 1.2); box(1.75, 0.5, 0.05, GLASS(), body, 0, 1.75, 2.01);
      box(1.95, 0.25, 4.42, '#65a30d', body, 0, 1.0, 0);
      { const cage = grp(body, 0, 1.3, -0.95); box(1.8, 0.06, 2.3, '#64748b', cage, 0, 0.95, 0); for (let i = 0; i < 6; i++) { [-0.88, 0.88].forEach((x) => box(0.05, 0.95, 0.05, '#94a3b8', cage, x, 0.47, -1.1 + i * 0.44)); } for (let i = 0; i < 4; i++) box(0.05, 0.95, 0.05, '#94a3b8', cage, -0.66 + i * 0.44, 0.47, -1.15); extra.cage = cage; }
      extra.siren = [box(0.4, 0.16, 0.25, M('#facc15', { emissive: '#ca8a04' }), body, 0.35, 2.22, 1.2), box(0.4, 0.16, 0.25, M('#f97316', { emissive: '#c2410c' }), body, -0.35, 2.22, 1.2)];
      { const paw = W_paw(); paw.position.set(1.0, 1.4, 0.4); paw.rotation.y = Math.PI / 2; body.add(paw); const paw2 = W_paw(); paw2.position.set(-1.0, 1.4, 0.4); paw2.rotation.y = -Math.PI / 2; body.add(paw2); }
      break;
    case 'robber':
      L = 3.8; box(1.8, 0.6, 3.8, '#6d28d9', body, 0, 0.62, 0); box(1.55, 0.55, 1.9, '#6d28d9', body, 0, 1.2, -0.3); box(1.57, 0.4, 1.6, GLASS(), body, 0, 1.22, -0.3);
      for (let i = 0; i < 4; i++) box(1.82, 0.08, 0.2, '#111827', body, 0, 0.75, -1.5 + i * 1.0);
      { const bag = sph(0.42, '#a3a3a3', body, 0, 1.9, -0.6); bag.scale.y = 0.9; const tg = W_dollar(); tg.position.set(0, 1.95, -0.18); body.add(tg); }
      break;
    default: // npc sedan
      L = 4.0; box(1.8, 0.62, 4.0, col, body, 0, 0.62, 0); box(1.6, 0.58, 2.1, col, body, 0, 1.2, -0.3); box(1.62, 0.42, 1.8, GLASS(), body, 0, 1.22, -0.3);
  }
  // wheels
  const wg = new T.CylinderGeometry(wr, wr, 0.28, 14);
  const wz2 = type === 'golf' || type === 'firetruck' ? wz : Math.min(wz, L / 2 - 0.55);
  [[wx, wz2], [-wx, wz2], [wx, -wz2], [-wx, -wz2]].forEach((q) => { const w = new T.Mesh(wg, M('#1f2937')); w.rotation.z = Math.PI / 2; const h = grp(body, q[0] * (Wd / 1.8 > 1 ? Wd / 1.8 : 1), wr, q[1]); h.add(w); const hub = cyl(wr * 0.5, 0.3, '#d1d5db', h, 0, 0, 0); hub.rotation.z = Math.PI / 2; wheels.push(h); });
  // lights
  const hl = M('#fef9c3', { emissive: '#fde68a' }), tl = M('#ef4444', { emissive: '#7f1d1d' });
  if (type !== 'golf') [-1, 1].forEach((s) => { box(0.32, 0.16, 0.06, hl, body, s * (Wd / 2 - 0.3), type === 'van' ? 0.9 : 0.72, L / 2 + 0.01); box(0.3, 0.14, 0.06, tl, body, s * (Wd / 2 - 0.3), type === 'van' ? 0.9 : 0.72, -L / 2 - 0.01); });
  const sh = new T.Mesh(G.box, shadowMat()); sh.scale.set(Wd * 1.05, 0.01, L * 1.02); sh.position.y = 0.015; g.add(sh);
  return Object.assign({ g, body, wheels, seats, L, Wd, wr, seatY, type }, extra);
};
function W_paw() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.font = '48px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('\uD83D\uDC3E', 32, 36); const t = new T.CanvasTexture(c); const m = new T.Mesh(G.plane, new T.MeshBasicMaterial({ map: t, transparent: true, side: T.DoubleSide })); m.scale.set(0.8, 0.8, 1); return m; }
function W_dollar() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#16a34a'; x.font = '900 52px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$', 32, 34); const t = new T.CanvasTexture(c); const m = new T.Mesh(G.plane, new T.MeshBasicMaterial({ map: t, transparent: true })); m.scale.set(0.5, 0.5, 1); return m; }

/* ======================================================================
   Home furniture (footprints match GL.FURN). Front faces +Z.
   ====================================================================== */
MD.furn = function (id, col) {
  const g = new T.Group();
  switch (id) {
    case 'bed': case 'bigbed': {
      const big = id === 'bigbed', w = big ? 2.3 : 1.5, d = big ? 2.5 : 2.3, fc = big ? '#a16207' : '#92400e';
      box(w, 0.35, d, fc, g, 0, 0.18, 0); box(w - 0.1, 0.22, d - 0.15, '#f8fafc', g, 0, 0.46, 0.02); box(w - 0.08, 0.24, d * 0.62, col || (big ? '#c084fc' : '#60a5fa'), g, 0, 0.5, 0.38);
      box(w * 0.4, 0.14, 0.4, '#ffffff', g, -w * 0.22, 0.62, -d / 2 + 0.35); box(w * 0.4, 0.14, 0.4, '#ffffff', g, w * 0.22, 0.62, -d / 2 + 0.35);
      box(w, 1.0, 0.12, fc, g, 0, 0.5, -d / 2); if (big) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((q) => { cyl(0.06, 1.6, '#facc15', g, q[0] * w / 2, 0.8, q[1] * d / 2); sph(0.1, '#facc15', g, q[0] * w / 2, 1.62, q[1] * d / 2); });
      break; }
    case 'stove': box(1.2, 0.9, 0.9, '#f8fafc', g, 0, 0.45, 0); box(1.2, 0.04, 0.9, '#1f2937', g, 0, 0.92, 0); [[-0.28, -0.2], [0.28, -0.2], [-0.28, 0.2], [0.28, 0.2]].forEach((q) => { const r = mesh(G.torus, '#6b7280', g, q[0], 0.95, q[1], 0.12, 0.12, 0.12); r.rotation.x = Math.PI / 2; }); box(0.9, 0.5, 0.03, '#1f2937', g, 0, 0.42, 0.46); box(0.6, 0.04, 0.05, '#9ca3af', g, 0, 0.72, 0.48); const pan = cyl(0.16, 0.08, '#374151', g, 0.28, 1.0, 0.2); break;
    case 'fridge': box(1, 1.95, 0.9, '#e5e7eb', g, 0, 0.98, 0); box(1.01, 0.03, 0.91, '#9ca3af', g, 0, 1.3, 0); [0.9, 1.6].forEach((y) => box(0.05, 0.3, 0.05, '#6b7280', g, 0.38, y, 0.47)); sph(0.07, '#f472b6', g, -0.2, 1.6, 0.46); sph(0.06, '#facc15', g, -0.1, 0.9, 0.46); break;
    case 'shower': { box(1.3, 0.12, 1.3, '#e0f2fe', g, 0, 0.06, 0); const gl = M('#bae6fd', { transparent: true, opacity: 0.35 }); mesh(G.box, gl, g, 0, 1.1, 0.64, 1.3, 2.1, 0.03); mesh(G.box, gl, g, 0.64, 1.1, 0, 0.03, 2.1, 1.3); box(1.3, 2.2, 0.06, '#f1f5f9', g, 0, 1.1, -0.64); box(0.06, 2.2, 1.3, '#f1f5f9', g, -0.64, 1.1, 0); cyl(0.03, 0.4, '#9ca3af', g, 0, 2.0, -0.45).rotation.x = Math.PI / 2; cyl(0.12, 0.04, '#9ca3af', g, 0, 1.95, -0.25); break; }
    case 'tub': box(2, 0.6, 1.1, '#f8fafc', g, 0, 0.3, 0); box(1.8, 0.04, 0.9, '#7dd3fc', g, 0, 0.55, 0); for (let i = 0; i < 7; i++) sph(0.12, '#ffffff', g, -0.7 + i * 0.23, 0.6, (i % 2) * 0.25 - 0.12); [[-0.85, -0.4], [0.85, -0.4], [-0.85, 0.4], [0.85, 0.4]].forEach((q) => sph(0.07, '#facc15', g, q[0], 0.04, q[1])); break;
    case 'sofa': { const c = col || '#e11d48'; box(2.5, 0.45, 1, c, g, 0, 0.3, 0); box(2.5, 0.7, 0.3, shade(c, -0.15), g, 0, 0.6, -0.36); [-1, 1].forEach((s) => box(0.3, 0.6, 1, shade(c, -0.15), g, s * 1.15, 0.4, 0)); [-1, 1].forEach((s) => box(1, 0.16, 0.7, shade(c, 0.25), g, s * 0.52, 0.6, 0.08)); break; }
    case 'armchair': { const c = col || '#14b8a6'; box(1, 0.45, 1, c, g, 0, 0.3, 0); box(1, 0.7, 0.25, shade(c, -0.15), g, 0, 0.62, -0.38); [-1, 1].forEach((s) => box(0.2, 0.55, 1, shade(c, -0.15), g, s * 0.45, 0.4, 0)); box(0.65, 0.14, 0.7, shade(c, 0.25), g, 0, 0.58, 0.06); break; }
    case 'table': box(1.8, 0.08, 1.1, '#a16207', g, 0, 0.75, 0); [[-0.8, -0.45], [0.8, -0.45], [-0.8, 0.45], [0.8, 0.45]].forEach((q) => box(0.08, 0.74, 0.08, '#78350f', g, q[0], 0.37, q[1])); cyl(0.15, 0.06, '#f8fafc', g, -0.4, 0.82, 0); cyl(0.15, 0.06, '#f8fafc', g, 0.4, 0.82, 0); sph(0.1, '#ef4444', g, 0, 0.88, 0); break;
    case 'chair': box(0.6, 0.06, 0.6, '#b45309', g, 0, 0.48, 0); box(0.6, 0.6, 0.06, '#b45309', g, 0, 0.8, -0.28); [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].forEach((q) => box(0.05, 0.48, 0.05, '#78350f', g, q[0], 0.24, q[1])); break;
    case 'tv': box(1.9, 0.5, 0.55, '#78350f', g, 0, 0.25, 0); box(1.7, 1, 0.08, '#111827', g, 0, 1.05, -0.05); g.userData.screen = box(1.56, 0.86, 0.02, M('#38bdf8', { emissive: '#0c4a6e' }), g, 0, 1.05, 0.0); break;
    case 'console': box(1.4, 0.45, 0.6, '#1f2937', g, 0, 0.23, 0); box(1.3, 0.75, 0.06, '#111827', g, 0, 0.85, -0.15); box(1.2, 0.62, 0.02, M('#a78bfa', { emissive: '#4c1d95' }), g, 0, 0.85, -0.11); box(0.4, 0.1, 0.3, '#f8fafc', g, -0.3, 0.5, 0.1); box(0.2, 0.06, 0.12, '#ef4444', g, 0.3, 0.48, 0.15); break;
    case 'computer': box(1.6, 0.06, 0.8, '#d6d3d1', g, 0, 0.75, 0); [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]].forEach((q) => box(0.05, 0.74, 0.05, '#57534e', g, q[0], 0.37, q[1])); box(0.9, 0.55, 0.05, '#111827', g, 0, 1.15, -0.2); box(0.82, 0.47, 0.02, M('#60a5fa', { emissive: '#1e3a8a' }), g, 0, 1.15, -0.17); box(0.5, 0.03, 0.18, '#374151', g, 0, 0.79, 0.15); break;
    case 'bookshelf': box(1.7, 2, 0.5, '#92400e', g, 0, 1, 0); for (let r = 0; r < 4; r++) { box(1.56, 0.04, 0.46, '#78350f', g, 0, 0.25 + r * 0.48, 0.02); for (let i = 0; i < 6; i++) box(0.12, 0.34, 0.3, ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#a855f7', '#f97316'][(i + r) % 6], g, -0.6 + i * 0.24, 0.45 + r * 0.48, 0.05); } break;
    case 'wardrobe': box(1.6, 2.1, 0.7, '#c2a27a', g, 0, 1.05, 0); box(0.02, 1.9, 0.02, '#78350f', g, 0, 1.05, 0.36); [-0.12, 0.12].forEach((x) => sph(0.05, '#facc15', g, x, 1.1, 0.37)); box(1.7, 0.1, 0.75, '#a16207', g, 0, 2.12, 0); break;
    case 'piano': box(1.8, 1.3, 0.6, '#111827', g, 0, 0.65, -0.1); box(1.7, 0.06, 0.35, '#f8fafc', g, 0, 0.78, 0.3); for (let i = 0; i < 10; i++) box(0.06, 0.04, 0.2, '#111827', g, -0.75 + i * 0.17, 0.83, 0.24); box(1.8, 0.06, 0.5, '#111827', g, 0, 0.74, 0.25); break;
    case 'arcade': box(1, 1.8, 0.9, '#7c3aed', g, 0, 0.9, 0); box(0.8, 0.6, 0.05, M('#22d3ee', { emissive: '#0e7490' }), g, 0, 1.3, 0.43).rotation.x = -0.2; box(0.9, 0.12, 0.4, '#1f2937', g, 0, 0.95, 0.5); sph(0.06, '#ef4444', g, -0.2, 1.04, 0.55); sph(0.05, '#facc15', g, 0.15, 1.03, 0.55); box(1.02, 0.25, 0.92, '#ff4fd8', g, 0, 1.85, 0); break;
    case 'petbed': cyl(0.68, 0.18, '#a855f7', g, 0, 0.09, 0).scale.z = 0.55; cyl(0.55, 0.06, '#f5d0fe', g, 0, 0.2, 0).scale.z = 0.45; break;
    case 'plant': cyl(0.28, 0.4, '#c2410c', g, 0, 0.2, 0); for (let i = 0; i < 5; i++) ell(0.28, 0.42, 0.28, '#16a34a', g, Math.cos(i) * 0.15, 0.75 + (i % 2) * 0.2, Math.sin(i) * 0.15); break;
    case 'lamp': cyl(0.22, 0.05, '#334155', g, 0, 0.03, 0); cyl(0.03, 1.5, '#334155', g, 0, 0.78, 0); { const s = mesh(G.cone, M('#fef3c7', { emissive: '#a16207' }), g, 0, 1.55, 0, 0.3, 0.35, 0.3); s.rotation.x = Math.PI; } break;
    case 'rug': { const c = col || '#fb923c'; cyl(1.25, 0.02, c, g, 0, 0.01, 0); cyl(0.95, 0.022, '#fde68a', g, 0, 0.012, 0); cyl(0.6, 0.024, '#f472b6', g, 0, 0.014, 0); break; }
    case 'aquarium': { box(1.7, 0.6, 0.6, '#1f2937', g, 0, 0.3, 0); const gl = M('#7dd3fc', { transparent: true, opacity: 0.55 }); mesh(G.box, gl, g, 0, 0.95, 0, 1.6, 0.7, 0.5); for (let i = 0; i < 3; i++) ell(0.06, 0.05, 0.1, ['#f97316', '#facc15', '#ec4899'][i], g, -0.5 + i * 0.5, 0.9 + (i % 2) * 0.15, 0).rotation.y = Math.PI / 2; box(1.6, 0.06, 0.5, '#fde68a', g, 0, 0.63, 0); break; }
    case 'fireplace': box(1.9, 1.3, 0.7, '#b91c1c', g, 0, 0.65, 0); box(2.1, 0.12, 0.8, '#7f1d1d', g, 0, 1.36, 0); box(1, 0.7, 0.1, '#1f1f1f', g, 0, 0.42, 0.32); for (let i = 0; i < 3; i++) cone(0.12, 0.35, M(['#f97316', '#facc15', '#ef4444'][i], { emissive: '#9a3412' }), g, -0.2 + i * 0.2, 0.3, 0.3); break;
    case 'painting': box(0.08, 1.2, 0.08, '#78350f', g, -0.5, 0.6, 0); box(0.08, 1.2, 0.08, '#78350f', g, 0.5, 0.6, 0); box(1.3, 0.9, 0.06, '#a16207', g, 0, 1.4, 0); box(1.15, 0.75, 0.02, '#38bdf8', g, 0, 1.4, 0.04); sph(0.12, '#facc15', g, 0.3, 1.6, 0.06); cone(0.3, 0.4, '#16a34a', g, -0.2, 1.2, 0.06); break;
    case 'toybox': box(1.1, 0.6, 0.7, '#3b82f6', g, 0, 0.3, 0); box(1.14, 0.1, 0.74, '#facc15', g, 0, 0.62, 0); sph(0.12, '#ef4444', g, -0.3, 0.75, 0); sph(0.1, '#22c55e', g, 0.25, 0.72, 0.1); break;
    default: box(0.8, 0.8, 0.8, '#999', g, 0, 0.4, 0);
  }
  return g;
};

/* playground + street props */
MD.slide = function (p, x, z, ry) { const g = grp(p, x, 0, z); g.rotation.y = ry || 0; [-0.5, 0.5].forEach((s) => { cyl(0.06, 2.2, '#3b82f6', g, s, 1.1, -1.2); }); box(1.1, 0.08, 1.0, '#facc15', g, 0, 2.0, -1.2); const sl = box(0.9, 0.08, 3.2, '#ef4444', g, 0, 1.0, 0.4); sl.rotation.x = 0.62; for (let i = 0; i < 5; i++) box(0.9, 0.05, 0.08, '#e5e7eb', g, 0, 0.35 + i * 0.4, -1.75); return g; };
MD.swings = function (p, x, z, ry) { const g = grp(p, x, 0, z); g.rotation.y = ry || 0; [-1.6, 1.6].forEach((s) => { const a = cyl(0.07, 2.6, '#22c55e', g, s, 1.2, 0); a.rotation.z = s > 0 ? 0.15 : -0.15; }); cyl(0.07, 3.4, '#22c55e', g, 0, 2.45, 0).rotation.z = Math.PI / 2; g.userData.seats = []; [-0.7, 0.7].forEach((s) => { const sw = grp(g, s, 2.45, 0); cyl(0.015, 1.8, '#9ca3af', sw, -0.2, -0.9, 0); cyl(0.015, 1.8, '#9ca3af', sw, 0.2, -0.9, 0); box(0.55, 0.06, 0.25, '#f97316', sw, 0, -1.8, 0); g.userData.seats.push(sw); }); return g; };
MD.seesaw = function (p, x, z) { const g = grp(p, x, 0, z); box(0.3, 0.4, 0.3, '#a16207', g, 0, 0.2, 0); const b = box(3.2, 0.1, 0.35, '#8b5cf6', g, 0, 0.42, 0); g.userData.board = b; return g; };
MD.hydrant = function (p, x, z) { const g = grp(p, x, 0, z); cyl(0.14, 0.6, '#ef4444', g, 0, 0.3, 0); sph(0.15, '#ef4444', g, 0, 0.62, 0); cyl(0.06, 0.4, '#dc2626', g, 0, 0.4, 0).rotation.z = Math.PI / 2; return g; };
MD.trash = function (p, x, z) { const g = grp(p, x, 0, z); cyl(0.28, 0.8, '#15803d', g, 0, 0.4, 0); cyl(0.3, 0.06, '#166534', g, 0, 0.82, 0); return g; };
MD.mailbox = function (p, x, z, col) { const g = grp(p, x, 0, z); cyl(0.04, 1.0, '#78350f', g, 0, 0.5, 0); box(0.3, 0.3, 0.5, col || '#3b82f6', g, 0, 1.1, 0); box(0.04, 0.2, 0.04, '#ef4444', g, 0.17, 1.25, 0.1); return g; };
MD.stopSign = function (p, x, z, ry) { const g = grp(p, x, 0, z); g.rotation.y = ry || 0; cyl(0.04, 2.2, '#9ca3af', g, 0, 1.1, 0); const s = mesh(G.cyl, '#dc2626', g, 0, 2.2, 0.03, 0.32, 0.04, 0.32); s.geometry = OCT; s.rotation.x = Math.PI / 2; return g; };
const OCT = new T.CylinderGeometry(1, 1, 1, 8);
})();
