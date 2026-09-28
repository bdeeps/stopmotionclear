// Shared parts for StopMotionClear: chart boards, stage helpers, a tabletop stop-motion set (a raised
// baseboard with tie-down holes, a painted backdrop flat, small LED lamps, a stills camera on a tripod),
// the box's own clay chai-wallah puppet with a ball-and-socket armature inside, an animator's hand,
// replacement mouths and a tiny formant "voice" made with Web Audio.
//
// Scale: 1 scene unit = 10 cm, so the grid squares are 10 cm and the 25 cm puppet is 2.5 units tall.
// +x is the puppet's forward, +y up, +z towards the viewer. Every puppet, set and prop here is generic and
// made for this box; nothing copies a real studio's characters, sets or frames.
import { THREE, M, box, beam, sphere, clamp, lerp } from './kit.js';
import { audio } from './ui.js';

export const TAU = Math.PI * 2;
export const D2R = Math.PI / 180;
export const UNIT_CM = 10;
export const fmtInt = (v) => Math.round(v).toLocaleString('en-IN');

// ---------------------------------------------------------------- boards
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.93)'; g.fillRect(0, 0, w, h); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return { tex, redraw, canvas: c, mesh: m };
}
export function title(g, s, sub = '', y = 36) {
  g.fillStyle = '#e8eef8'; g.font = 'bold 26px sans-serif'; g.fillText(s, 22, y);
  if (sub) { g.font = '18px sans-serif'; g.fillStyle = 'rgba(255,255,255,.62)'; g.fillText(sub, 22, y + 26); }
}
export function text(g, s, x, y, { font = '18px sans-serif', col = 'rgba(255,255,255,.82)', align = 'left' } = {}) {
  g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left';
}
export function wrap(g, s, x, y, maxW, lh, opts = {}) {
  g.font = opts.font || '18px sans-serif';
  const words = s.split(' '); let line = '', yy = y;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { text(g, line, x, yy, opts); line = w; yy += lh; } else line = t;
  }
  if (line) text(g, line, x, yy, opts);
  return yy + lh;
}
export function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export const COL = { hot: '#ffd166', clay: '#ff9a5c', cool: '#8ec5ff', good: '#7be08c', bad: '#ff5a8a', soft: 'rgba(255,255,255,.55)', mint: '#5ce1a9', violet: '#c49bff' };

// ---------------------------------------------------------------- stage helpers
export const inReel = () => document.body.classList.contains('gb-reel');
// Phone-width stage: hide minor labels and nudge the picture down, clear of the readout.
export function fitNarrow(stage, minor = [], y0 = -0.12) {
  const narrow = stage.host.clientWidth < 560;
  minor.forEach((l) => { if (l) l.visible = !narrow && !inReel(); });
  const y = narrow && !inReel() ? y0 : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}
// Boards sit beside the model on a wide screen; in the tall reel video they move to reelPos.
export function reelBoards(list) {
  const r = inReel();
  list.forEach(([b, pos, scale = 1, rotY = 0]) => {
    if (!b.home) b.home = { p: b.mesh.position.clone(), r: b.mesh.rotation.clone(), s: b.mesh.scale.x };
    if (r) { b.mesh.position.set(...pos); b.mesh.scale.setScalar(scale); b.mesh.rotation.set(0, rotY, 0); }
    else { b.mesh.position.copy(b.home.p); b.mesh.scale.setScalar(b.home.s); b.mesh.rotation.copy(b.home.r); }
  });
}
// Deterministic pseudo-random numbers, so every run and every video frame looks the same.
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export const hash01 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// A rod you can re-aim every frame: between([x,y,z], [x,y,z]).
export function stick(r, mat, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, seg), mat);
  m.castShadow = true;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  m.between = (a, b) => {
    A.set(...a); B.set(...b);
    const L = A.distanceTo(B); m.visible = L > 1e-4; if (!m.visible) return;
    m.position.copy(A).add(B).multiplyScalar(0.5); m.scale.set(1, L, 1);
    m.quaternion.setFromUnitVectors(Y, B.sub(A).normalize());
  };
  return m;
}

// ---------------------------------------------------------------- the set
export const SET_Y = 1.2;                 // top of the baseboard (the "floor" the puppet stands on)
// A raised baseboard on trestle legs, drilled with a grid of tie-down holes, and a painted backdrop flat.
export function makeSet({ w = 12, d = 6.4, backdrop = true } = {}) {
  const g = new THREE.Group();
  const top = document.createElement('canvas'); top.width = 1024; top.height = 544;
  const t = top.getContext('2d');
  t.fillStyle = '#9b7a55'; t.fillRect(0, 0, 1024, 544);
  const r = rng(7);
  for (let i = 0; i < 90; i++) { t.strokeStyle = `rgba(60,40,20,${0.05 + r() * 0.08})`; t.lineWidth = 1 + r() * 3; t.beginPath(); const y = r() * 544; t.moveTo(0, y); t.bezierCurveTo(300, y + r() * 20 - 10, 700, y + r() * 20 - 10, 1024, y + r() * 16 - 8); t.stroke(); }
  // a dusty painted "road" strip across the middle, where the puppet walks
  t.fillStyle = 'rgba(190,160,120,.55)'; t.fillRect(0, 200, 1024, 150);
  // tie-down holes: a 5 cm grid (every half unit)
  t.fillStyle = 'rgba(30,20,12,.8)';
  for (let x = 21; x < 1024; x += 42.7) for (let y = 21; y < 544; y += 42.5) { t.beginPath(); t.arc(x, y, 3.2, 0, TAU); t.fill(); }
  const tex = new THREE.CanvasTexture(top); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), [M.matte(0x5b3f28), M.matte(0x5b3f28), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), M.matte(0x5b3f28), M.matte(0x5b3f28), M.matte(0x5b3f28)]);
  deck.position.y = SET_Y - 0.15; deck.receiveShadow = true; deck.castShadow = true; g.add(deck);
  const legM = M.matte(0x3a2a1c);
  for (const x of [-w / 2 + 0.5, w / 2 - 0.5]) for (const z of [-d / 2 + 0.4, d / 2 - 0.4]) { const l = box(0.3, SET_Y - 0.3, 0.3, legM); l.position.set(x, (SET_Y - 0.3) / 2, z); g.add(l); }
  g.deck = deck;
  if (backdrop) {
    const bc = document.createElement('canvas'); bc.width = 1024; bc.height = 400; paintStreet(bc.getContext('2d'), 1024, 400);
    const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
    const flat = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 400 / 1024), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.95 }));
    flat.position.set(0, SET_Y + (w * 400 / 1024) / 2 - 0.05, -d / 2 + 0.05); flat.receiveShadow = true; g.add(flat);
    const brace = box(0.12, w * 400 / 1024, 0.12, legM); brace.position.set(0, flat.position.y, -d / 2 - 0.1); g.add(brace);
    g.flat = flat;
  }
  return g;
}
// The backdrop: a painted street corner with a tea stall. Original art for this box.
function paintStreet(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#7fc4e8'); sky.addColorStop(1, '#f6dcae');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const r = rng(3);
  // houses
  const cols = ['#e8a87c', '#c38d9e', '#f2c14e', '#85c7b4', '#e27d60', '#9fb4d9'];
  let x = 0;
  while (x < w) {
    const bw = 110 + r() * 90, bh = 180 + r() * 150;
    g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, h - bh, bw, bh);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, h - bh, bw, 10);
    for (let yy = h - bh + 30; yy < h - 90; yy += 60) for (let xx = x + 16; xx < x + bw - 30; xx += 44) { g.fillStyle = 'rgba(40,50,70,.55)'; g.fillRect(xx, yy, 24, 30); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(xx, yy, 24, 4); }
    x += bw + 4;
  }
  // tea stall with a striped awning
  const sx = 360, sw = 300;
  g.fillStyle = '#6b3e26'; g.fillRect(sx, h - 150, sw, 150);
  for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#f4f1ea' : '#d9534f'; g.fillRect(sx - 10 + i * 32, h - 190, 32, 44); }
  g.fillStyle = '#f2c14e'; g.fillRect(sx + 70, h - 250, 160, 50);
  g.fillStyle = '#6b3e26'; g.font = 'bold 36px sans-serif'; g.textAlign = 'center'; g.fillText('CHAI', sx + 150, h - 212); g.textAlign = 'left';
  // string of bulbs
  g.strokeStyle = 'rgba(40,30,20,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 70); g.quadraticCurveTo(w / 2, 130, w, 60); g.stroke();
  for (let i = 1; i < 16; i++) { const t = i / 16, bx = t * w, by = (1 - t) * (1 - t) * 70 + 2 * (1 - t) * t * 130 + t * t * 60; g.fillStyle = ['#ffd166', '#ff7a59', '#5ce1a9'][i % 3]; g.beginPath(); g.arc(bx, by + 8, 6, 0, TAU); g.fill(); }
}

// A small LED panel lamp on a stand; its face points along +z of the head. aim(target).
export function makeLamp(h = 4.2) {
  const g = new THREE.Group(), stand = M.metal(0x3a3f4b);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; g.add(beam([Math.cos(a) * 0.5, 0.02, Math.sin(a) * 0.5], [0, 0.7, 0], 0.03, stand)); }
  g.add(beam([0, 0.7, 0], [0, h, 0], 0.04, stand));
  const head = new THREE.Group(); head.position.y = h; g.add(head);
  const body = box(0.9, 0.6, 0.18, M.matte(0x1f2229)); head.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), M.glow(0xfff1d6)); face.position.z = 0.095; head.add(face);
  g.head = head; g.face = face;
  g.aim = (x, y, z) => { head.lookAt(new THREE.Vector3(x, y, z)); };
  return g;
}

// A stills camera (lens along +z) on a geared tripod. place(pos, target) aims it; lensPos gives its lens.
export function makeStillsCamera() {
  const g = new THREE.Group();
  const cam = new THREE.Group(); g.add(cam);
  const dark = M.matte(0x1b1d22), metal = M.metal(0x9aa3b2, { roughness: 0.35 });
  const body = box(1.4, 0.95, 0.75, dark); cam.add(body);
  const grip = box(0.35, 0.9, 0.5, M.matte(0x111216)); grip.position.set(-0.6, -0.02, 0.15); cam.add(grip);
  const hump = box(0.55, 0.35, 0.55, dark); hump.position.set(0, 0.6, -0.05); cam.add(hump);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.9, 32), M.matte(0x16181d)); lens.rotation.x = Math.PI / 2; lens.position.z = 0.8; cam.add(lens);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.12, 32), metal); ring.rotation.x = Math.PI / 2; ring.position.z = 0.6; cam.add(ring);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.28, 32), M.glass({ color: 0x9fd8ff })); glass.position.z = 1.26; cam.add(glass);
  const tally = sphere(0.06, M.glow(0x552222)); tally.position.set(0.5, 0.35, 0.38); cam.add(tally);
  const tripodM = M.metal(0x3a3f4b);
  const legs = new THREE.Group(); g.add(legs);
  const head = box(0.5, 0.25, 0.5, M.matte(0x2a2d34)); legs.add(head);
  const legSticks = [0, 1, 2].map(() => { const s = stick(0.05, tripodM); legs.add(s); return s; });
  const col = stick(0.07, tripodM); legs.add(col);
  g.cam = cam; g.tally = tally;
  g.place = (pos, target, floorY = 0) => {
    cam.position.set(...pos); cam.lookAt(new THREE.Vector3(...target));
    head.position.set(pos[0], pos[1] - 0.62, pos[2]);
    const hy = pos[1] - 0.75;
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.5; legSticks[i].between([pos[0], hy, pos[2]], [pos[0] + Math.cos(a) * 1.6, floorY, pos[2] + Math.sin(a) * 1.6]); }
    col.between([pos[0], hy, pos[2]], [pos[0], hy - 1.2, pos[2]]);
  };
  g.lensPos = () => new THREE.Vector3(0, 0, 1.3).applyMatrix4(cam.matrixWorld);
  return g;
}

// A monitor showing what the camera sees. rt is rendered each frame by render(); hide lists objects
// that must not appear in the camera's own picture (the monitor itself, boards, labels' anchors).
export function makeCameraView(stage, { w = 320, h = 180, fov = 24, near = 0.1 } = {}) {
  // The target holds linear light (three.js tone-maps only when drawing to the screen). A screen that shows
  // it uses a tone-mapped material; grab() applies the same filmic curve and sRGB gamma by lookup table.
  const rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true });
  const aces = (x) => clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0, 1);
  const srgb = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  const LUT = new Uint8Array(256); for (let i = 0; i < 256; i++) LUT[i] = Math.round(255 * srgb(aces((i / 255) * 0.6 / 0.6)));
  const cam = new THREE.PerspectiveCamera(fov, w / h, near, 200);
  const px = new Uint8Array(w * h * 4);
  const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
  const tctx = tmp.getContext('2d'), img = tctx.createImageData(w, h);
  const BG = new THREE.Color(0x14161c);
  return {
    rt, cam,
    render(hide = [], exposure = 1) {
      const r = stage.renderer;
      const vis = hide.map((o) => o.visible); hide.forEach((o) => { o.visible = false; });
      const fl = stage.floor.visible, bg = stage.scene.background, ex = r.toneMappingExposure;
      stage.floor.visible = false; stage.scene.background = BG; r.toneMappingExposure = exposure;
      r.setRenderTarget(rt); r.clear(); r.render(stage.scene, cam); r.setRenderTarget(null);
      stage.floor.visible = fl; stage.scene.background = bg; r.toneMappingExposure = ex;
      hide.forEach((o, i) => { o.visible = vis[i]; });
    },
    // Copy the last rendered picture into a new small canvas (a captured frame).
    grab(tw = 160, th = 90) {
      stage.renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
      for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      for (let i = 0; i < img.data.length; i += 4) { img.data[i] = LUT[img.data[i]]; img.data[i + 1] = LUT[img.data[i + 1]]; img.data[i + 2] = LUT[img.data[i + 2]]; img.data[i + 3] = 255; }
      tctx.putImageData(img, 0, 0);
      const c = document.createElement('canvas'); c.width = tw; c.height = th;
      c.getContext('2d').drawImage(tmp, 0, 0, tw, th);
      return c;
    },
    dispose() { rt.dispose(); },
  };
}
// A screen on a thin stand, facing +z, showing map.
export function makeScreen(W, H, map) {
  const g = new THREE.Group();
  const bez = box(W + 0.2, H + 0.2, 0.12, M.matte(0x0c0d10)); bez.position.z = -0.07; g.add(bez);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map, toneMapped: true }));
  g.add(scr); g.screen = scr;
  return g;
}

// ---------------------------------------------------------------- the puppet
// Skins (their look here; their properties are explained in chapter 2).
export const SKINS = {
  clay: { name: 'Clay (plasticine)', rough: 0.92, clear: 0, sheen: 0 },
  silicone: { name: 'Cast silicone', rough: 0.38, clear: 0.5, sheen: 0 },
  foam: { name: 'Foam latex', rough: 0.78, clear: 0, sheen: 0.4 },
};
// Proportions in units (10 cm): a 25 cm puppet. Joint pivots sit where a real armature's balls sit.
export const P = { hip: 1.15, thigh: 0.55, shin: 0.52, foot: 0.08, spine: 0.72, upper: 0.42, fore: 0.38, neck: 0.12, head: 0.26 };
export const PUPPET_H = P.hip + 0.1 + P.spine + P.neck + 0.16 + 2 * P.head * 0.95;
// Mass model for chapter 2 (grams): a 25 cm clay-over-armature puppet, about 250 g in all (estimate;
// studio puppets of this size weigh roughly 150 to 400 g depending on skin and armature).
export const MASS = { head: 32, torso: 80, upper: 11, fore: 9, thigh: 20, shin: 14, foot: 12, kettle: 12 };

// makePuppet() returns a group standing with its feet at y = 0, facing +x, with:
//   pose({ spine, lean, neck, nod, shL, shR, abL, abR, elL, elR, hipL, hipR, knL, knR, bob })  (radians)
//   setXray(k 0..1), setSkin(kind), face (the replacement lower face), setMouth(canvasTexture)
export function makePuppet({ shirt = 0x4f9fcf, pants = 0x6b4a33, skin = 0xb9794d, scarf = 0xd9453b, kettle = true } = {}) {
  const g = new THREE.Group();
  const skinMats = [];
  const mk = (hex) => { const m = new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.92, metalness: 0, transparent: true, opacity: 1 }); skinMats.push(m); return m; };
  const mShirt = mk(shirt), mPants = mk(pants), mSkin = mk(skin), mScarf = mk(scarf), mHair = mk(0x1d1714), mShoe = mk(0x2a211b);
  const steel = M.metal(0xc7ccd4, { roughness: 0.25 }), brass = M.metal(0xd4a24a, { roughness: 0.3 });
  const armature = new THREE.Group(); armature.visible = false;
  const balls = [];
  const joint = (parent, pos, r = 0.055) => {
    const j = new THREE.Group(); j.position.set(...pos); parent.add(j);
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), brass); b.castShadow = false; j.add(b); balls.push(b);
    return j;
  };
  const bone = (parent, a, b, r = 0.03) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), steel); const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); s.position.copy(A).add(B).multiplyScalar(0.5); s.scale.y = A.distanceTo(B); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); parent.add(s); balls.push(s); return s; };
  const cap = (parent, r, len, mat, y) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 16), mat); m.position.y = y; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  const pelvis = joint(g, [0, P.hip, 0], 0.07);
  const hips = cap(pelvis, 0.2, 0.18, mPants, 0.02); hips.rotation.x = Math.PI / 2; hips.scale.set(1, 1, 0.9);
  bone(pelvis, [0, 0, -0.17], [0, 0, 0.17], 0.035);
  // spine and chest
  const spine = joint(pelvis, [0, 0.1, 0], 0.06);
  const torso = cap(spine, 0.23, 0.3, mShirt, 0.33); torso.scale.set(0.85, 1, 1.05);
  bone(spine, [0, 0, 0], [0, P.spine - 0.1, 0], 0.038);
  bone(spine, [0, P.spine - 0.12, -0.3], [0, P.spine - 0.12, 0.3], 0.032);
  const neck = joint(spine, [0, P.spine, 0], 0.05);
  const scarfM = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.06, 10, 24), mScarf); scarfM.rotation.x = Math.PI / 2; scarfM.position.y = -0.02; neck.add(scarfM);
  const tail = cap(neck, 0.045, 0.28, mScarf, -0.2); tail.position.set(0.1, -0.2, 0.08); tail.rotation.z = 0.15;
  cap(neck, 0.07, 0.08, mSkin, 0.06);
  bone(neck, [0, 0, 0], [0, 0.18, 0], 0.03);
  const head = new THREE.Group(); head.position.y = P.neck + 0.16; neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(P.head, 32, 24, 0, TAU, 0, Math.PI * 0.56), mSkin); skull.castShadow = true; skull.scale.set(0.95, 1.05, 0.9); head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(P.head, 32, 16, 0, TAU, Math.PI * 0.56, Math.PI * 0.44), mSkin); jaw.castShadow = true; jaw.scale.set(0.95, 1.05, 0.9); head.add(jaw);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(P.head * 1.03, 28, 12, 0, TAU, 0, 1.15), mHair); hair.scale.set(0.95, 1.05, 0.92); hair.rotation.z = 0.35; head.add(hair);
  const ears = [-1, 1].map((z) => { const e = sphere(0.055, mSkin, 12); e.scale.set(0.5, 1, 0.6); e.position.set(-0.01, 0, z * 0.235); head.add(e); return e; });
  const nose = sphere(0.055, mSkin, 14); nose.scale.set(1.1, 0.9, 0.8); nose.position.set(0.245, -0.01, 0); head.add(nose);
  const eyeW = M.plastic(0xf6f3ea, { roughness: 0.3 }), pupil = M.plastic(0x16110e, { roughness: 0.2 });
  const eyes = [-1, 1].map((z) => { const e = sphere(0.05, eyeW, 16); e.position.set(0.2, 0.07, z * 0.085); head.add(e); const p = sphere(0.026, pupil, 12); p.position.set(0.045, 0, 0); e.add(p); return e; });
  const brows = [-1, 1].map((z) => { const b = box(0.03, 0.025, 0.09, mHair); b.position.set(0.2, 0.145, z * 0.085); head.add(b); return b; });
  const stache = cap(head, 0.028, 0.14, mHair, 0); stache.rotation.x = Math.PI / 2; stache.position.set(0.235, -0.065, 0);
  // replacement lower face: a shell section in front of the jaw carrying the mouth texture
  const faceTexC = document.createElement('canvas'); faceTexC.width = 256; faceTexC.height = 160;
  const faceTex = new THREE.CanvasTexture(faceTexC); faceTex.colorSpace = THREE.SRGBColorSpace;
  const faceMat = new THREE.MeshPhysicalMaterial({ map: faceTex, roughness: 0.9, transparent: true }); skinMats.push(faceMat);
  const face = new THREE.Mesh(new THREE.SphereGeometry(P.head * 1.012, 32, 16, Math.PI - 0.75, 1.5, 1.62, 0.72), faceMat);
  face.scale.set(0.95, 1.05, 0.9); head.add(face);
  const skinHex = '#' + new THREE.Color(skin).getHexString();
  // armature for head/limbs
  const limb = (parent, pos, len1, len2, mat, r1, r2, end) => {
    const top = joint(parent, pos);
    cap(top, r1, len1 - 2 * r1 + 0.04, mat, -len1 / 2);
    bone(top, [0, 0, 0], [0, -len1, 0]);
    const mid = joint(top, [0, -len1, 0], 0.05);
    cap(mid, r2, len2 - 2 * r2 + 0.04, mat, -len2 / 2);
    bone(mid, [0, 0, 0], [0, -len2, 0]);
    const tip = new THREE.Group(); tip.position.y = -len2; mid.add(tip);
    end?.(tip);
    return { top, mid, tip };
  };
  const arms = [-1, 1].map((z) => limb(spine, [0, P.spine - 0.12, z * 0.3], P.upper, P.fore, mShirt, 0.075, 0.065, (tip) => {
    const hand = sphere(0.075, mSkin, 14); hand.scale.set(1, 1.15, 0.8); hand.position.y = -0.03; tip.add(hand);
    // the forearm is shirt: give it skin at the wrist
  }));
  const legs = [-1, 1].map((z) => limb(pelvis, [0, 0, z * 0.12], P.thigh, P.shin, mPants, 0.09, 0.075, (tip) => {
    const ankle = joint(tip, [0, 0, 0], 0.04);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.15), mShoe); shoe.position.set(0.07, -0.04, 0); shoe.castShadow = true; ankle.add(shoe);
    // the foot plate of the armature, drilled for a tie-down
    const plate = box(0.3, 0.02, 0.11, steel); plate.position.set(0.07, -0.075, 0); plate.castShadow = false; ankle.add(plate); balls.push(plate);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 12), M.matte(0x111111)); hole.position.set(0.07, -0.075, 0); ankle.add(hole); balls.push(hole);
    tip.foot = ankle;
  }));
  // Facing +x, the puppet's right side is +z (towards the viewer): arms[0]/legs[0] are its left (z = -1),
  // arms[1]/legs[1] its right. A small brass kettle hangs from the right hand.
  let kettleG = null;
  if (kettle) {
    kettleG = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), brass); pot.scale.y = 0.85; kettleG.add(pot);
    const lid = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.07, 16), brass); lid.position.y = 0.13; kettleG.add(lid);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.18, 10), brass); spout.position.set(0.14, 0.05, 0); spout.rotation.z = -0.9; kettleG.add(spout);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 8, 20, Math.PI), brass); handle.position.y = 0.12; handle.rotation.y = Math.PI / 2; kettleG.add(handle);
    kettleG.position.y = -0.24; arms[1].tip.add(kettleG);
  }
  // all brass/steel parts form the armature: hidden inside the skin until x-ray
  balls.forEach((b) => { b.userData.arm = true; b.visible = false; });

  g.add(armature);
  g.parts = { pelvis, spine, neck, head, arms, legs, face, eyes, brows, kettle: kettleG, hips, torso };
  g.skinMats = skinMats;
  g.face = face;
  g.pose = (p = {}) => {
    pelvis.position.y = P.hip + (p.bob || 0);
    pelvis.position.x = p.shift || 0;
    pelvis.rotation.z = p.lean || 0;
    spine.rotation.z = p.spine || 0;
    spine.rotation.y = p.twist || 0;
    neck.rotation.y = p.neck || 0;
    neck.rotation.z = p.nod || 0;
    // abduction (arm out to the side): +x rotation swings the left arm (z = -1) outwards, -x the right
    arms[0].top.rotation.set(p.abL || 0, 0, p.shL || 0);
    arms[1].top.rotation.set(-(p.abR || 0), 0, p.shR || 0);
    arms[0].mid.rotation.z = p.elL || 0; arms[1].mid.rotation.z = p.elR || 0;
    legs[0].top.rotation.z = p.hipL || 0; legs[1].top.rotation.z = p.hipR || 0;
    legs[0].mid.rotation.z = -(p.knL || 0); legs[1].mid.rotation.z = -(p.knR || 0);
    // keep feet flat on the ground: the foot undoes the lean, hip and knee angles above it
    legs[0].tip.foot.rotation.z = -((p.hipL || 0) - (p.knL || 0)) - (p.lean || 0);
    legs[1].tip.foot.rotation.z = -((p.hipR || 0) - (p.knR || 0)) - (p.lean || 0);
  };
  g.setXray = (k) => {
    skinMats.forEach((m) => { m.opacity = 1 - 0.85 * k; m.depthWrite = k < 0.05; });
    balls.forEach((b) => { b.visible = k > 0.02; });
    hair.material.opacity = 1 - 0.85 * k;
  };
  g.setSkin = (kind) => {
    const S = SKINS[kind] || SKINS.clay;
    skinMats.forEach((m) => { m.roughness = S.rough; m.clearcoat = S.clear; m.clearcoatRoughness = 0.3; m.sheen = S.sheen; m.sheenColor = new THREE.Color(0xffffff); m.sheenRoughness = 0.5; m.needsUpdate = true; });
  };
  // mouth: draw shape params onto the lower face
  g.setMouth = (shape) => { drawFace(faceTexC.getContext('2d'), 256, 160, shape, skinHex); faceTex.needsUpdate = true; };
  g.setMouth(MOUTHS.rest);
  g.pose({});
  return g;
}

// ---------------------------------------------------------------- mouths (replacement animation)
// Eight mouth shapes, the classic lip-sync set used by 2D and stop-motion animators (after Preston Blair's
// mouth chart). Params: open (0–1), wide (0–1), round (0–1 pucker), teeth, tongue, bite (lip under teeth).
export const MOUTHS = {
  mbp: { id: 'mbp', label: 'M B P', open: 0, wide: 0.5, round: 0, press: 1, f: [250, 1000], amp: 0.12, say: 'lips pressed shut' },
  ai: { id: 'ai', label: 'A I', open: 0.9, wide: 0.75, round: 0, teeth: 1, f: [730, 1090], amp: 1, say: 'jaw open wide' },
  e: { id: 'e', label: 'E', open: 0.38, wide: 1, round: 0, teeth: 1, f: [530, 1840], amp: 0.85, say: 'wide, teeth showing' },
  o: { id: 'o', label: 'O', open: 0.75, wide: 0.42, round: 1, f: [570, 840], amp: 0.95, say: 'round and open' },
  u: { id: 'u', label: 'U W Q', open: 0.3, wide: 0.28, round: 1, f: [300, 870], amp: 0.7, say: 'small pucker' },
  fv: { id: 'fv', label: 'F V', open: 0.16, wide: 0.62, round: 0, teeth: 1, bite: 1, f: [0, 0], noise: 1, amp: 0.35, say: 'top teeth on the lower lip' },
  l: { id: 'l', label: 'L Th', open: 0.55, wide: 0.6, round: 0, teeth: 1, tongue: 1, f: [360, 1300], amp: 0.7, say: 'tongue behind the teeth' },
  rest: { id: 'rest', label: 'Rest', open: 0.06, wide: 0.55, round: 0, f: [0, 0], amp: 0, say: 'relaxed, lips just parted' },
};
export const MOUTH_ORDER = ['mbp', 'ai', 'e', 'o', 'u', 'fv', 'l', 'rest'];
// Blend two shapes (used when clay is re-sculpted in small steps).
export function mixMouth(a, b, k) {
  const o = {};
  for (const key of ['open', 'wide', 'round', 'teeth', 'tongue', 'bite', 'press']) o[key] = lerp(a[key] || 0, b[key] || 0, k);
  return o;
}
// Draw a mouth on the face plate canvas. The plate maps its centre to the middle of the canvas.
export function drawFace(g, w, h, m, skinHex = '#b9794d') {
  g.fillStyle = skinHex; g.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.6;
  drawMouth(g, cx, cy, w * 0.23, h * 0.36, m);
}
export function drawMouth(g, cx, cy, W, H, m) {
  const open = m.open || 0, wide = m.wide ?? 0.5, round = m.round || 0;
  const hw = W * (0.45 + 0.55 * wide) * (1 - 0.35 * round), hh = H * (0.05 + 0.95 * open);
  const lip = '#7a3326', inside = '#2a0d0d';
  g.save();
  // mouth opening
  g.beginPath();
  if (round > 0.5) g.ellipse(cx, cy, hw * 0.75, Math.max(hh * 0.8, H * 0.12), 0, 0, TAU);
  else { g.moveTo(cx - hw, cy); g.quadraticCurveTo(cx, cy - hh * 0.9, cx + hw, cy); g.quadraticCurveTo(cx, cy + hh * 1.3, cx - hw, cy); }
  g.closePath();
  g.fillStyle = inside; g.fill();
  g.save(); g.clip();
  if (m.teeth > 0.5) { g.fillStyle = '#f4efe4'; g.fillRect(cx - hw, cy - hh * 0.95, hw * 2, Math.max(4, hh * 0.35)); }
  if (m.bite > 0.5) { g.fillStyle = '#f4efe4'; g.fillRect(cx - hw, cy - hh, hw * 2, hh * 1.2); }
  if (m.tongue > 0.5) { g.fillStyle = '#d65f6b'; g.beginPath(); g.ellipse(cx, cy + hh * 0.2, hw * 0.45, hh * 0.45, 0, 0, TAU); g.fill(); }
  g.restore();
  // lips
  g.lineWidth = m.press > 0.5 ? 9 : 6; g.strokeStyle = lip; g.lineJoin = 'round';
  g.stroke();
  if (m.press > 0.5) { g.lineWidth = 3; g.strokeStyle = '#5a2218'; g.beginPath(); g.moveTo(cx - hw * 0.9, cy); g.lineTo(cx + hw * 0.9, cy); g.stroke(); }
  if (m.bite > 0.5) { g.strokeStyle = lip; g.lineWidth = 7; g.beginPath(); g.moveTo(cx - hw * 0.85, cy + hh * 0.35); g.quadraticCurveTo(cx, cy + hh * 0.9, cx + hw * 0.85, cy + hh * 0.35); g.stroke(); }
  g.restore();
}

// A line of dialogue as mouth shapes, each held for n frames at 24 fps ("Chai! Garam chai! Only five rupees!").
export const LINE = {
  text: 'Chai! Garam chai! Only five rupees!',
  track: [['rest', 4], ['e', 3], ['ai', 6], ['e', 4], ['rest', 4], ['e', 2], ['ai', 5], ['l', 3], ['ai', 4], ['mbp', 4], ['e', 3], ['ai', 6], ['e', 5], ['rest', 8],
    ['o', 6], ['l', 3], ['e', 4], ['rest', 2], ['fv', 3], ['ai', 5], ['e', 3], ['fv', 3], ['rest', 2], ['l', 2], ['u', 5], ['mbp', 3], ['e', 5], ['fv', 3], ['rest', 10]],
};
export const LINE_FRAMES = LINE.track.reduce((a, [, n]) => a + n, 0);
// Which shape is on screen at frame f (24 fps). onTwos snaps f to even frames.
export function mouthAt(f) {
  let acc = 0;
  for (let i = 0; i < LINE.track.length; i++) { const [id, n] = LINE.track[i]; if (f < acc + n) return { id, i, into: f - acc, n }; acc += n; }
  return { id: 'rest', i: LINE.track.length - 1, into: 0, n: 1 };
}

// ---------------------------------------------------------------- a tiny formant voice
// A buzzy source (sawtooth at a speaking pitch) through two band-pass filters at the vowel's first two
// formants (F1, F2; typical adult values after Peterson & Barney 1952) makes a robot-ish voice whose
// vowels match the mouth shapes. F and V use a hiss. Respects the box's sound switch.
let AC = null;
export function speak(track = LINE.track, fps = 24) {
  if (audio.muted) return null;
  try { AC ||= new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  if (AC.state === 'suspended') AC.resume();
  const t0 = AC.currentTime + 0.06;
  const master = AC.createGain(); master.gain.value = 0.22; master.connect(AC.destination);
  const src = AC.createOscillator(); src.type = 'sawtooth';
  const f1 = AC.createBiquadFilter(), f2 = AC.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.Q.value = 7; f2.Q.value = 9;
  const g1 = AC.createGain(), g2 = AC.createGain(); g2.gain.value = 0.55;
  const env = AC.createGain(); env.gain.value = 0;
  src.connect(f1).connect(g1).connect(env); src.connect(f2).connect(g2).connect(env); env.connect(master);
  // hiss for F/V
  const nb = AC.createBuffer(1, AC.sampleRate, AC.sampleRate), d = nb.getChannelData(0), r = rng(9);
  for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
  const noise = AC.createBufferSource(); noise.buffer = nb; noise.loop = true;
  const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500;
  const nEnv = AC.createGain(); nEnv.gain.value = 0; noise.connect(hp).connect(nEnv).connect(master);
  let t = t0;
  for (const [id, n] of track) {
    const m = MOUTHS[id], dur = n / fps;
    if (m.f[0]) { f1.frequency.setTargetAtTime(m.f[0], t, 0.012); f2.frequency.setTargetAtTime(m.f[1], t, 0.012); }
    env.gain.setTargetAtTime(m.noise ? 0 : m.amp * 0.9, t, 0.015);
    nEnv.gain.setTargetAtTime(m.noise ? 0.08 : 0, t, 0.01);
    src.frequency.setTargetAtTime(150 - 30 * ((t - t0) % 1.4) / 1.4 + (id === 'ai' ? 12 : 0), t, 0.03);
    t += dur;
  }
  env.gain.setTargetAtTime(0, t, 0.02); nEnv.gain.setTargetAtTime(0, t, 0.02);
  src.start(t0); noise.start(t0); src.stop(t + 0.3); noise.stop(t + 0.3);
  return { t0: performance.now() + 60, stop() { try { master.gain.value = 0; src.stop(); noise.stop(); } catch { /* already stopped */ } } };
}

// ---------------------------------------------------------------- the animator's hand
// A stylised hand and forearm that reaches in from above. reach(k 0..1): 0 = out of shot, 1 = at target.
export function makeHand(skin = 0xd9b08c) {
  const g = new THREE.Group(), m = M.matte(skin, { roughness: 0.6 });
  const palm = box(0.42, 0.14, 0.36, m); g.add(palm);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.26, 4, 8), m); f.rotation.z = Math.PI / 2 - 0.3; f.position.set(0.32, -0.06, -0.13 + i * 0.087); f.castShadow = true; g.add(f); }
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 4, 8), m); th.position.set(0.1, -0.05, 0.22); th.rotation.x = 1.1; g.add(th);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 2.6, 6, 12), M.matte(0x2d3b55)); arm.position.set(-1.1, 0.9, 0); arm.rotation.z = Math.PI / 2 - 0.65; arm.castShadow = true; g.add(arm);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export { clamp, lerp, THREE, M, box, beam, sphere };
