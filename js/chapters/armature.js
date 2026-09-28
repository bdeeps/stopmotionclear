// Chapter 2: puppets and armatures. The chai-wallah puppet large on the set, with an x-ray slider that shows
// the ball-and-socket armature inside, pose sliders for its joints, a choice of skin, tie-downs and a jump rig.
// Physics in the readout
//  - Mass: skin volume (estimated from this model's shapes, in cm³) × skin density, plus the metal
//    armature (≈ 25 g, estimate) and the kettle (12 g). Densities: modelling clay ≈ 1.6 g/cm³, cast
//    silicone ≈ 1.1 g/cm³, foam latex ≈ 0.2 g/cm³ (typical values; foam latex varies with the foaming).
//    Real puppets are often padded inside, so these are upper-end, solid-skin estimates.
//  - Balance: the puppet stays up on its own only while its centre of mass (CoM) is above its feet (heel to
//    toe). Otherwise gravity makes a tipping moment m·g·d (d = overhang) that a tie-down must hold.
//  - Joint stiffness: to hold the raised arm still, the shoulder's friction must resist m_arm·g·r, the arm's
//    weight times the horizontal distance from the shoulder to its CoM. Armature makers tighten ball joints
//    with screws to set this.
import { THREE, M, clamp } from '../kit.js';
import {
  makeSet, makePuppet, board, panelBg, title, text, wrap, COL, fitNarrow, reelBoards, SET_Y, SKINS, P, stick, box, sphere,
} from '../stopmo.js';

const G = 9.81;
// skin volume per part (cm³), estimated from the capsule and sphere sizes in makePuppet
const VOL = { head: 66, torso: 90, hips: 30, upper: 7, fore: 5, thigh: 14, shin: 9, foot: 5 };
const RHO = { clay: 1.6, silicone: 1.1, foam: 0.2 };
const ARM_G = 25, KETTLE_G = 12;
export const SKIN_INFO = {
  clay: { what: 'Soft modelling clay over the armature. Never dries, so it can be re-sculpted every frame, but it picks up fingerprints and softens under hot lights.', life: 'Repaired all day' },
  silicone: { what: 'Liquid silicone poured into a mould around the armature. Tough and skin-like, springs back to shape, but heavier and hard to repair.', life: 'Lasts a whole shoot' },
  foam: { what: 'A whipped latex foam baked in a mould. Very light and squashy, but it slowly breaks down, so studios make spare skins.', life: 'Wears out, spares needed' },
};

export default {
  id: 'armature',
  short: 'Puppets and armatures',
  title: 'Puppets and armatures',
  subtitle: 'A metal skeleton with stiff ball joints, a soft skin, and screws in the feet.',
  view: { pos: [2.2, 4.2, 6.6], target: [-1.6, 2.9, 0] },
  learn: `<p>A stop-motion puppet has to hold <b>any pose</b> you give it, for as long as the camera needs, and then move again. Inside most puppets is an <b>armature</b>: a small metal skeleton with <b>ball-and-socket joints</b>. Each joint is squeezed by a screw so it is stiff enough to hold a pose, but loose enough to move by hand.</p>
    <p>Over the armature goes the <b>skin</b>. <b>Clay</b> (plasticine) is easy to reshape, which is why clay films look so hand-made. <b>Silicone</b> is poured into a mould and is tough and skin-like. <b>Foam latex</b> is light and squashy but wears out, so spares are made.</p>
    <p>A puppet only stands on its own while its <b>centre of mass</b> is above its feet. In a walk or a lean it often isn't, so animators use <b>tie-downs</b>: a screw from under the baseboard into a threaded plate in the foot, or a magnet under the floor and a steel plate in the shoe.</p>
    <p>For a jump, a <b>rig</b> (a posable arm clamped to the puppet) holds it in the air. The rig shows in the photos, so it is painted out later, a job for the visual effects team (see <b>VFXClear</b>).</p>
    <p class="tip"><b>Try it:</b> slide the x-ray to see the armature. Lean the puppet forward until it would topple, then switch on a tie-down. Change the skin and watch the weight change. Turn on the rig for a mid-air jump.</p>`,
  terms: [
    { t: 'Armature', d: 'The posable metal skeleton inside a puppet.' },
    { t: 'Ball-and-socket joint', d: 'A ball clamped between two plates. A screw sets how stiff it is.' },
    { t: 'Plasticine', d: 'An oil-based modelling clay that never dries out.' },
    { t: 'Foam latex', d: 'Rubber whipped into foam and baked in a mould. Light but not long-lasting.' },
    { t: 'Tie-down', d: 'A screw or magnet that locks a puppet’s foot to the set.' },
    { t: 'Rig', d: 'A clamp-and-arm support that holds a puppet in the air. Removed later in VFX.' },
    { t: 'Centre of mass', d: 'The balance point of an object. It must be above the feet to stand unaided.' },
  ],
  defaults: { xray: 0.6, skin: 'clay', head: 0.2, arm: 0.9, elbow: 0.5, lean: 0, crouch: 0, tie: 'none', rig: false },
  controls: [
    { key: 'xray', type: 'range', label: 'X-ray: see the armature', min: 0, max: 1, step: 0.01, ends: ['skin', 'skeleton'], fmt: (v) => `${Math.round(v * 100)} %` },
    { key: 'skin', type: 'seg', label: 'Skin', options: [{ v: 'clay', label: 'Clay' }, { v: 'silicone', label: 'Silicone' }, { v: 'foam', label: 'Foam latex' }] },
    { key: 'head', type: 'range', label: 'Neck: turn the head', min: -0.9, max: 0.9, step: 0.01, fmt: (v) => `${Math.round(v * 57.3)}°` },
    { key: 'arm', type: 'range', label: 'Shoulder: raise the kettle arm', min: -0.4, max: 2.6, step: 0.01, fmt: (v) => `${Math.round(v * 57.3)}°` },
    { key: 'elbow', type: 'range', label: 'Elbow', min: 0, max: 2.2, step: 0.01, fmt: (v) => `${Math.round(v * 57.3)}°` },
    { key: 'crouch', type: 'range', label: 'Hips and knees: crouch', min: 0, max: 0.9, step: 0.01, fmt: (v) => `${Math.round(v * 57.3)}°` },
    { key: 'lean', type: 'range', label: 'Lean from the ankles', min: -0.4, max: 0.4, step: 0.005, ends: ['back', 'forward'], fmt: (v) => `${Math.round(v * 57.3)}°` },
    { key: 'tie', type: 'seg', label: 'Tie-down', options: [{ v: 'none', label: 'None' }, { v: 'screw', label: 'Screw' }, { v: 'magnet', label: 'Magnet' }] },
    { key: 'rig', type: 'toggle', label: 'Jump rig (painted out later)' },
  ],
  quiz: [
    { q: 'Why do armature joints need to be stiff?', options: ['To make the puppet heavier', 'So the puppet holds each pose while the frame is shot', 'So it can be washed', 'To stop the clay drying'], answer: 1, why: 'The pose must stay exactly still between frames. The joint’s friction has to hold the limb against gravity.' },
    { q: 'A puppet leans so far that its centre of mass is in front of its toes. What keeps it up?', options: ['Nothing, it cannot be done', 'A tie-down screw or magnet in the foot', 'More clay on the head', 'A faster camera'], answer: 1, why: 'A tie-down locks the foot to the baseboard, so it can hold the tipping moment.' },
    { q: 'How is a puppet shown in mid-air for a jump?', options: ['It is thrown and photographed', 'A rig holds it, and the rig is removed in VFX later', 'It floats on a magnet', 'The film is played backwards'], answer: 1, why: 'A rig arm clamps to the puppet between frames. Visual effects artists paint it out of each frame afterwards.' },
  ],
  reel: [
    { ms: 5000, caption: 'Inside the puppet is a metal skeleton with stiff ball-and-socket joints.', set: { xray: 0, skin: 'clay', head: 0.2, arm: 0.3, elbow: 0.3, lean: 0, crouch: 0, tie: 'none', rig: false }, anim: { xray: [0, 0.85], arm: [0.3, 1.6] }, spin: 0.35, view: { pos: [2.6, 4.2, 6.4], target: [0, 2.45, 0] } },
    { ms: 5000, caption: 'Screws or magnets in the feet hold it steady, and a rig holds it in mid-air.', set: { xray: 0.5, tie: 'screw', lean: 0.3, rig: false }, anim: { rig: [false, true] }, spin: 0.25, view: { pos: [2.6, 3.4, 6.8], target: [0, 2.3, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const set = makeSet({ w: 9, d: 5 }); root.add(set);
    // the lean pivot: forward leans pivot on the toes, backward leans on the heels
    const pivot = new THREE.Group(); pivot.position.set(0, SET_Y, 0.3); root.add(pivot);
    const pup = makePuppet(); pivot.add(pup);
    const TOE = 0.24, HEEL = -0.1;

    // tie-downs under the deck (visible because the deck edge is open to the viewer)
    const under = new THREE.Group(); root.add(under);
    const steel = M.metal(0xc7ccd4, { roughness: 0.25 });
    const screws = [-1, 1].map((z) => {
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 12), steel); shaft.position.y = -0.1; g.add(shaft);
      const wing = box(0.36, 0.05, 0.08, steel); wing.position.y = -0.38; g.add(wing);
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 6), steel); nut.position.y = -0.34; g.add(nut);
      g.position.set(0.07, SET_Y, 0.3 + z * 0.12); under.add(g); return g;
    });
    const magnets = [-1, 1].map((z) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 20), M.metal(0x9aa3b2, { roughness: 0.2 }));
      m.position.set(0.07, SET_Y - 0.34, 0.3 + z * 0.12); under.add(m);
      const n = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 20), M.matte(0xd9453b)); n.position.y = 0.05; m.add(n);
      return m;
    });

    // jump rig: base plate on the deck behind the puppet, a posable arm, and a clamp at the back
    const rigM = M.matte(0x3dd65c, { roughness: 0.6 });
    const rig = new THREE.Group(); root.add(rig);
    const base = box(0.6, 0.06, 0.6, M.metal(0x6b7280)); base.position.set(-1.1, SET_Y + 0.03, -0.9); rig.add(base);
    const seg1 = stick(0.045, rigM), seg2 = stick(0.04, rigM), seg3 = stick(0.035, rigM); rig.add(seg1, seg2, seg3);
    const knuckles = [sphere(0.07, rigM), sphere(0.07, rigM)]; rig.add(...knuckles);
    const clamp_ = box(0.12, 0.22, 0.22, M.metal(0x6b7280)); rig.add(clamp_);

    const lblArm = stage.label('Ball-and-socket joint', [0, 0, 0], root);
    const lblTie = stage.label('Tie-down under the baseboard', [1.6, SET_Y - 0.55, 1.2], root);
    const lblRig = stage.label('Rig, painted out in VFX', [-1.6, SET_Y + 2.9, -0.9], root);
    const lblCom = stage.label('Centre of mass', [0, 0, 0], root, 'hot');
    // centre of mass marker and plumb line
    const comDot = sphere(0.07, M.glow(0xffd166)); root.add(comDot); comDot.renderOrder = 5; comDot.material.depthTest = false;
    const plumb = stick(0.012, M.glow(0xffd166)); root.add(plumb); plumb.material.depthTest = false; plumb.renderOrder = 5;
    const support = box(TOE - HEEL, 0.02, 0.4, M.ghost(0x5ce1a9, 0.5)); root.add(support);

    // skins board
    let bs = { skin: 'clay', mass: 0 };
    const bd = board(root, 3.3, 2.5, 560, 424, (g, w, h) => {
      panelBg(g, w, h);
      title(g, 'Three kinds of skin', 'same 25 cm puppet, solid skin (estimates)');
      ['clay', 'silicone', 'foam'].forEach((k, i) => {
        const y = 104 + i * 104, on = k === bs.skin, m = massFor(k).total;
        if (on) { g.fillStyle = 'rgba(255,209,102,.13)'; g.fillRect(12, y - 28, w - 24, 98); }
        text(g, SKINS[k].name, 24, y, { font: on ? 'bold 21px sans-serif' : '20px sans-serif', col: on ? COL.hot : '#fff' });
        text(g, `≈ ${Math.round(m)} g`, w - 24, y, { font: 'bold 20px sans-serif', col: COL.clay, align: 'right' });
        g.fillStyle = COL.clay; g.fillRect(24, y + 12, (m / 520) * (w - 48), 10);
        wrap(g, SKIN_INFO[k].life + ' · ρ ≈ ' + RHO[k] + ' g/cm³', 24, y + 48, w - 48, 22, { font: '16px sans-serif', col: COL.soft });
      });
    }, [-2.7, 1.95, 0.6]);
    bd.mesh.rotation.y = 0.4;

    const tmp = new THREE.Vector3(), com = new THREE.Vector3();
    let cur = null, info = {};
    const parts = pup.parts;
    // segment masses for the CoM (skin volume × density, plus an armature share)
    function massFor(skin) {
      const r = RHO[skin], armShare = ARM_G / 14;
      const m = {
        head: VOL.head * r + armShare, torso: (VOL.torso + VOL.hips) * r + 3 * armShare,
        upper: VOL.upper * r + armShare, fore: VOL.fore * r + armShare, thigh: VOL.thigh * r + armShare, shin: VOL.shin * r + armShare, foot: VOL.foot * r + armShare,
      };
      m.total = m.head + m.torso + 2 * (m.upper + m.fore + m.thigh + m.shin + m.foot) + KETTLE_G;
      return m;
    }
    const wp = (o, y = 0) => o.localToWorld(tmp.set(0, y, 0)).clone();

    return {
      update(dt, s) {
        dt = Math.max(0, dt); cur = s;
        const narrow = fitNarrow(stage, [lblTie, lblArm, lblRig]);
        reelBoards([[bd, [0, 5.6, -1.2], 0.9]]);
        pup.setSkin(s.skin); pup.setXray(s.xray);
        const c = s.rig ? 0.75 : s.crouch;
        const drop = (P.thigh + P.shin) * (Math.cos(c) - 1);
        const pose = {
          neck: s.head, shR: s.arm, elR: s.elbow, abR: 0.12, shL: s.rig ? 1.2 : -0.1, elL: s.rig ? 0.8 : 0.3, abL: 0.1,
          hipL: c, hipR: c, knL: 2 * c, knR: 2 * c, bob: drop, shift: -(P.thigh - P.shin) * Math.sin(c), spine: -0.5 * c, nod: 0.3 * c,
        };
        pup.pose(pose);
        // lean around toe or heel; the rig lifts the puppet into the air
        const lean = s.rig ? -0.15 : s.lean;
        const piv = lean >= 0 ? TOE : HEEL;
        pivot.position.set(piv, SET_Y + (s.rig ? 1.0 : 0), 0.3); pup.position.x = -piv;
        pivot.rotation.z = -lean;
        root.updateMatrixWorld(true);
        // centre of mass from the segment positions
        const m = massFor(s.skin);
        com.set(0, 0, 0);
        const add = (v, w) => com.addScaledVector(v, w);
        add(wp(parts.head, 0), m.head); add(wp(parts.spine, 0.33), m.torso);
        for (const a of parts.arms) { add(wp(a.top, -P.upper / 2), m.upper); add(wp(a.mid, -P.fore / 2), m.fore); }
        for (const l of parts.legs) { add(wp(l.top, -P.thigh / 2), m.thigh); add(wp(l.mid, -P.shin / 2), m.shin); add(wp(l.tip, -0.04), m.foot); }
        if (parts.kettle) add(wp(parts.kettle), KETTLE_G);
        com.multiplyScalar(1 / m.total);
        // support: heel to toe of the feet, in world x (feet stay put when on the ground)
        const footW = wp(parts.legs[0].tip.foot);
        const heelX = footW.x - 0.1, toeX = footW.x + 0.24;
        support.position.set((heelX + toeX) / 2, SET_Y + 0.012, 0.3); support.visible = !s.rig;
        const over = com.x > toeX ? com.x - toeX : com.x < heelX ? heelX - com.x : 0;
        const topple = !s.rig && over > 0;
        support.material.color.setHex(topple ? 0xff5a8a : 0x5ce1a9);
        comDot.position.copy(com); plumb.between([com.x, com.y, com.z], [com.x, SET_Y + 0.01, com.z]);
        lblCom.position.set(com.x + 0.1, com.y + 0.25, com.z);
        // tipping moment (N·mm): m g d
        const tipNmm = (m.total / 1000) * G * over * 100;
        // shoulder torque to hold the raised arm (+ kettle)
        const sh = wp(parts.arms[1].top), el = wp(parts.arms[1].mid), hd = wp(parts.arms[1].tip);
        const armCx = ((wp(parts.arms[1].top, -P.upper / 2).x * m.upper) + (wp(parts.arms[1].mid, -P.fore / 2).x * m.fore) + hd.x * KETTLE_G) / (m.upper + m.fore + KETTLE_G);
        const shNmm = ((m.upper + m.fore + KETTLE_G) / 1000) * G * Math.abs(armCx - sh.x) * 100;
        lblArm.position.copy(el).add(new THREE.Vector3(0.25, 0.25, 0.3)); lblArm.visible = lblArm.visible && s.xray > 0.25;
        // tie-downs and rig
        screws.forEach((g) => { g.visible = s.tie === 'screw'; g.position.x = footW.x + 0.07; });
        magnets.forEach((g) => { g.visible = s.tie === 'magnet'; g.position.x = footW.x + 0.07; });
        lblTie.visible = lblTie.visible && s.tie !== 'none';
        rig.visible = s.rig; lblRig.visible = lblRig.visible && s.rig;
        if (s.rig) {
          const back = wp(parts.spine, 0.35).add(new THREE.Vector3(-0.3, 0, 0));
          const b0 = [-1.1, SET_Y + 0.06, -0.9], k1 = [-1.2, SET_Y + 1.5, -0.8], k2 = [back.x - 0.5, back.y + 0.3, back.z - 0.2];
          seg1.between(b0, k1); seg2.between(k1, k2); seg3.between(k2, back.toArray());
          knuckles[0].position.set(...k1); knuckles[1].position.set(...k2); clamp_.position.copy(back);
        }
        info = { mass: m.total, topple, over, tipNmm, shNmm, comH: (com.y - SET_Y) * 10 };
        if (bs.skin !== s.skin) { bs = { skin: s.skin }; bd.redraw(); }
      },
      readout(s) {
        const held = s.tie !== 'none';
        const tieNote = s.tie === 'screw' ? 'A screw holds far more than this.' : s.tie === 'magnet' ? 'A strong magnet holds a small puppet, but can let go if bumped.' : '';
        return `<div class="big">${SKINS[s.skin].name} puppet</div>
          <small>${SKIN_INFO[s.skin].what}</small>
          <div class="row"><span>Weight (estimate)</span><b>≈ ${Math.round(info.mass || 0)} g</b></div>
          <div class="row"><span>Centre of mass height</span><b>${(info.comH || 0).toFixed(0)} cm</b></div>
          <div class="row"><span>Shoulder must hold the arm</span><b>${(info.shNmm || 0).toFixed(1)} N·mm</b></div>
          ${s.rig ? '<div class="ok">The rig holds it in mid-air. It will be painted out of every frame.</div>'
          : info.topple ? `<div class="row"><span>Tipping moment</span><b>${(info.tipNmm || 0).toFixed(1)} N·mm</b></div>${held ? `<div class="ok">Would topple, but the ${s.tie} tie-down holds it. ${tieNote}</div>` : '<div class="no">Centre of mass is past the feet: it will topple. Add a tie-down.</div>'}`
          : '<div class="ok">Centre of mass is over the feet: it balances.</div>'}`;
      },
    };
  },
};
