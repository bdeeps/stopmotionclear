// Chapter 5: other kinds of stop-motion, on the same tabletop. Switch between a clay puppet, cut-out paper on
// a multiplane glass stage, pixilation (a real person shot frame by frame), object animation (matchsticks)
// and sand on a lit glass table. The camera moves to where each kind is shot from, and a monitor shows what
// it records. "Stop-motion look" holds each pose for 1/12 s, so the motion steps like the real thing.
// Multiplane parallax: in a real view, nearer things slide past faster. Layers are moved each frame by an
// amount ∝ 1 / (the distance they stand for): here elephant 5 m, trees 10 m, hills 25 m, so their speeds
// are 1 : 0.5 : 0.2.
// Pixilation: the person jumps (about 0.25 m high takes 2·√(2h/g) = 0.45 s in the air) and the photo is
// taken at the top of each jump, so in the film they seem to glide through the air.
// Examples named (dates checked in history.json): Starewicz's The Cameraman's Revenge (1912), Lotte
// Reiniger's The Adventures of Prince Achmed (1926), Norman McLaren's Neighbours (1952), Dadasaheb Phalke's
// matchstick film Agkadyanchi Mouj (1915), Caroline Leaf's Sand, or Peter and the Wolf (1969).
import { THREE, M, clamp } from '../kit.js';
import {
  makeSet, makePuppet, makeStillsCamera, makeCameraView, makeScreen, board, panelBg, title, text, wrap, COL, fitNarrow, reelBoards,
  SET_Y, box, sphere, rng, hash01, TAU, stick,
} from '../stopmo.js';
import { walkPose } from './frames.js';

export const KINDS = {
  puppet: { name: 'Puppet and clay', moved: 'A posable puppet with an armature, clay or silicone skin', cam: 'From the front, like a live-action camera', light: 'Film lamps on a miniature set', eg: 'Starewicz’s insect puppets (1910s), Gumby, Wallace & Gromit, Coraline' },
  cutout: { name: 'Cut-out on glass', moved: 'Flat paper shapes with pinned joints, on sheets of glass at different heights', cam: 'Straight down from a rostrum above', light: 'Lamps from above, or from below for silhouettes', eg: 'Lotte Reiniger’s silhouette film The Adventures of Prince Achmed (1926)' },
  pix: { name: 'Pixilation', moved: 'Real people, who pose and hold still for each photo', cam: 'From the front, on a tripod', light: 'Daylight or lamps', eg: 'Norman McLaren’s Neighbours (1952)' },
  object: { name: 'Object animation', moved: 'Everyday things: matchsticks, coins, cups, toys', cam: 'Often straight down at a tabletop', light: 'Lamps', eg: 'Dadasaheb Phalke’s matchstick film Agkadyanchi Mouj (1915)' },
  sand: { name: 'Sand on glass', moved: 'Sand pushed with fingers and brushes on a glass lit from below', cam: 'Straight down', light: 'A light box under the glass: sand shows as dark shapes', eg: 'Caroline Leaf’s Sand, or Peter and the Wolf (1969)' },
};
const ORDER = ['puppet', 'cutout', 'pix', 'object', 'sand'];
const DEPTH = { top: 5, mid: 10, back: 25 };

function paperShape(pts, color) {
  const sh = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide }));
  m.castShadow = true; return m;
}
function ellipsePts(cx, cy, rx, ry, n = 24) { const o = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return o; }

export default {
  id: 'kinds',
  short: 'Other kinds',
  title: 'Paper, people, matches and sand',
  subtitle: 'The same one-frame-at-a-time trick works with almost anything you can move.',
  view: { pos: [2.2, 8.8, 16.0], target: [1.0, 4.0, 0] },
  learn: `<p>Stop-motion is not only puppets. Anything you can move a little and photograph can be animated.</p>
    <p><b>Cut-out animation</b> uses flat paper shapes with pinned joints. On a <b>multiplane</b> stage, layers sit on sheets of glass at different heights under a camera pointing down. Near layers are moved further each frame than far ones, which gives a feeling of depth. <b>Lotte Reiniger</b> made a whole feature from paper silhouettes, <b>The Adventures of Prince Achmed</b> (1926).</p>
    <p><b>Pixilation</b> animates real people. Photograph someone at the top of every jump, a little further along each time, and they seem to float. <b>Norman McLaren</b>'s <b>Neighbours</b> (1952) made it famous. <b>Object animation</b> moves everyday things: in 1915 <b>Dadasaheb Phalke</b>, the father of Indian cinema, made a short film of dancing <b>matchsticks</b>. <b>Sand animation</b> pushes sand around on a glass sheet lit from below.</p>
    <p>And puppets go back a long way: in the 1910s <b>Ladislas Starewicz</b> made films with insect puppets.</p>
    <p class="tip"><b>Try it:</b> switch between the five kinds and watch the camera move to where each one is shot from. Turn the stop-motion look off to see the smooth motion, then on again to see the steps.</p>`,
  terms: [
    { t: 'Cut-out animation', d: 'Animating flat shapes of paper or card, often with pinned joints.' },
    { t: 'Multiplane', d: 'A stage of glass layers at different heights, shot from above, to give depth.' },
    { t: 'Parallax', d: 'Near things seem to move faster than far things when the view moves.' },
    { t: 'Pixilation', d: 'Stop-motion with real people, who pose for each frame.' },
    { t: 'Object animation', d: 'Stop-motion with everyday objects.' },
    { t: 'Sand animation', d: 'Pushing sand on a lit glass sheet between frames.' },
  ],
  defaults: { kind: 'cutout', stepped: true },
  controls: [
    { key: 'kind', type: 'seg', label: 'Kind', options: ORDER.map((v) => ({ v, label: KINDS[v].name.split(' ')[0].replace('Cut-out', 'Cut-out') })) },
    { key: 'stepped', type: 'toggle', label: 'Stop-motion look: 12 poses a second' },
  ],
  quiz: [
    { q: 'In a multiplane shot, which layer is moved furthest each frame?', options: ['The farthest background', 'The nearest layer', 'They all move the same', 'None of them move'], answer: 1, why: 'Near things slide past faster than far ones (parallax), so the nearest layer moves most.' },
    { q: 'What is pixilation?', options: ['Making a film blurry', 'Stop-motion with real people', 'Drawing with pixels', 'Colouring a film'], answer: 1, why: 'The actors hold each pose while a frame is shot. Norman McLaren’s Neighbours (1952) is a famous example.' },
    { q: 'Who made a stop-motion film of dancing matchsticks in India in 1915?', options: ['Satyajit Ray', 'Dadasaheb Phalke', 'Raja Ravi Varma', 'Nick Park'], answer: 1, why: 'Dadasaheb Phalke, who made India’s first feature film, also made the matchstick film Agkadyanchi Mouj.' },
  ],
  reel: [
    { ms: 5200, caption: 'Cut-out paper on layers of glass, pixilated people, even sand: anything can be animated.', set: { kind: 'cutout', stepped: true }, anim: { kind: ['cutout', 'pix'] }, spin: 0.2, view: { pos: [2.4, 8.5, 13.5], target: [1.0, 3.2, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const set = makeSet({ w: 10, d: 5.6 }); root.add(set);
    const groups = {};
    ORDER.forEach((k) => { groups[k] = new THREE.Group(); root.add(groups[k]); });

    // ---------------------------------------------------------------- puppet
    const pup = makePuppet(); pup.position.set(-2, SET_Y, 0.4); groups.puppet.add(pup);

    // ---------------------------------------------------------------- cut-out multiplane
    const cut = groups.cutout;
    const LV = { back: SET_Y + 0.9, mid: SET_Y + 2.1, top: SET_Y + 3.3 };
    const GW = 6.4, GD = 3.8;
    for (const y of Object.values(LV)) { const g = new THREE.Mesh(new THREE.BoxGeometry(GW, 0.03, GD), M.clear(0xcfe8ff, 0.14)); g.position.y = y; cut.add(g); }
    for (const x of [-GW / 2, GW / 2]) for (const z of [-GD / 2, GD / 2]) { const p = box(0.1, LV.top - SET_Y + 0.1, 0.1, M.metal(0x6b7280)); p.position.set(x, (LV.top + SET_Y) / 2, z); cut.add(p); }
    const layer = (y) => { const g = new THREE.Group(); g.position.y = y + 0.02; g.rotation.x = -Math.PI / 2; cut.add(g); return g; };
    const backL = layer(LV.back), midL = layer(LV.mid), topL = layer(LV.top);
    // paper wider than the glass is trimmed to the glass edges (clipping planes)
    stage.renderer.localClippingEnabled = true;
    const clipX = [new THREE.Plane(new THREE.Vector3(1, 0, 0), GW / 2), new THREE.Plane(new THREE.Vector3(-1, 0, 0), GW / 2)];
    const ground = paperShape([[-GW / 2, -GD / 2], [GW / 2, -GD / 2], [GW / 2, GD / 2], [-GW / 2, GD / 2]], 0xf6dcae); ground.position.z = -0.01; backL.add(ground);
    const hills = [];
    for (let i = 0; i < 6; i++) { const h = paperShape(ellipsePts(-5 + i * 2.1, 0.9, 1.3, 0.9), [0x9fbf6e, 0x7fa65a][i % 2]); backL.add(h); hills.push(h); }
    const sunP = paperShape(ellipsePts(2.2, 1.3, 0.4, 0.4), 0xf2a03d); backL.add(sunP);
    const clipAll = (o) => o.traverse((m) => { if (m.material) m.material.clippingPlanes = clipX; });
    const trees = new THREE.Group(); midL.add(trees);
    for (let i = 0; i < 7; i++) { const x = -5.4 + i * 1.8; const t = paperShape([[x - 0.06, -0.6], [x + 0.06, -0.6], [x + 0.06, 0.1], [x - 0.06, 0.1]], 0x6b4a2e); trees.add(t); const c = paperShape(ellipsePts(x, 0.45, 0.45, 0.5), 0x3d7a3a); c.position.z = 0.002; trees.add(c); }
    // the paper elephant: body, head, ear, trunk (two pinned pieces), four pinned legs, a saddle cloth
    const ele = new THREE.Group(); topL.add(ele); ele.position.set(-1.8, -0.55, 0.01); ele.scale.setScalar(0.9);
    const grey = 0x8a97ab, dark = 0x6f7b8f;
    const legs = [[-0.55, 0.004], [-0.3, 0.001], [0.35, 0.004], [0.6, 0.001]].map(([x, z]) => {
      const pin = new THREE.Group(); pin.position.set(x, 0.05, z); ele.add(pin);
      pin.add(paperShape([[-0.1, 0.05], [0.1, 0.05], [0.09, -0.55], [-0.09, -0.55]], z > 0.002 ? grey : dark));
      return pin;
    });
    const body = paperShape(ellipsePts(0, 0.25, 0.85, 0.5), grey); body.position.z = 0.003; ele.add(body);
    const cloth = paperShape([[-0.45, 0.72], [0.35, 0.72], [0.3, 0.05], [-0.4, 0.05]], 0xd9453b); cloth.position.z = 0.004; ele.add(cloth);
    const trim = paperShape([[-0.4, 0.1], [0.3, 0.1], [0.3, 0.02], [-0.4, 0.02]], 0xf2c14e); trim.position.z = 0.005; ele.add(trim);
    const headP = new THREE.Group(); headP.position.set(0.8, 0.45, 0.006); ele.add(headP);
    headP.add(paperShape(ellipsePts(0.1, 0, 0.34, 0.32), grey));
    const ear = paperShape(ellipsePts(-0.05, 0.02, 0.2, 0.26), dark); ear.position.z = 0.001; headP.add(ear);
    const eye = paperShape(ellipsePts(0.22, 0.08, 0.03, 0.03, 10), 0x16110e); eye.position.z = 0.002; headP.add(eye);
    const tusk = paperShape([[0.28, -0.18], [0.36, -0.2], [0.5, -0.1], [0.46, -0.08]], 0xf4efe4); tusk.position.z = 0.002; headP.add(tusk);
    const trunk1 = new THREE.Group(); trunk1.position.set(0.36, -0.12, 0.001); headP.add(trunk1);
    trunk1.add(paperShape([[-0.08, 0], [0.08, 0], [0.06, -0.38], [-0.06, -0.38]], grey));
    const trunk2 = new THREE.Group(); trunk2.position.set(0, -0.36, 0.001); trunk1.add(trunk2);
    trunk2.add(paperShape([[-0.06, 0], [0.06, 0], [0.1, -0.3], [-0.02, -0.32]], grey));
    const tail = paperShape([[-0.85, 0.35], [-1.05, 0.05], [-1.0, 0.03], [-0.83, 0.3]], dark); ele.add(tail);
    // rostrum column holding the overhead camera
    const rost = new THREE.Group(); root.add(rost);
    const col = box(0.25, 8.2, 0.25, M.metal(0x3a3f4b)); col.position.set(-4.4, SET_Y + 4.1, -2.4); rost.add(col);
    const arm = box(4.5, 0.18, 0.18, M.metal(0x3a3f4b)); arm.position.set(-2.2, SET_Y + 7.6, -2.4); rost.add(arm);
    const arm2 = box(0.18, 0.18, 2.2, M.metal(0x3a3f4b)); arm2.position.set(0, SET_Y + 7.6, -1.3); rost.add(arm2);

    // ---------------------------------------------------------------- pixilation: a person, shown small
    const pixG = groups.pix;
    const person = makeMannequin(0xe07a5f); pixG.add(person);
    const film = makeMannequin(0xe07a5f); pixG.add(film); film.visible = false;
    const ghostsP = [0, 1, 2, 3].map(() => { const m = makeMannequin(0xe07a5f, true); pixG.add(m); return m; });
    const car = new THREE.Group(); pixG.add(car);

    // ---------------------------------------------------------------- matchsticks
    const obj = groups.object;
    const NM = 14, ML = 0.9;
    const wood = M.matte(0xe6c79a), head = M.matte(0xc0392b, { roughness: 0.7 });
    const matches = [];
    for (let i = 0; i < NM; i++) {
      const g = new THREE.Group();
      const st = box(ML, 0.045, 0.045, wood); g.add(st);
      const hd = sphere(0.045, head, 12); hd.scale.set(1.5, 1, 1); hd.position.x = ML / 2; g.add(hd);
      g.position.y = SET_Y + 0.03; obj.add(g); matches.push(g);
    }
    // layouts: [x, z, angle] per match. A pile, a little house, a dancing figure, a star.
    const R0 = rng(4);
    const pile = matches.map(() => [(R0() - 0.5) * 1.6, (R0() - 0.5) * 1.0, R0() * Math.PI]);
    const house = [[-0.9, 0, Math.PI / 2], [0.9, 0, Math.PI / 2], [0, 0.45, 0], [0, -0.45, 0], [-0.45, -0.85, 0.72], [0.45, -0.85, -0.72], [-0.2, 0.2, Math.PI / 2], [0.2, 0.2, Math.PI / 2],
      [-2.2, 0.6, 0], [-2.2, -0.3, Math.PI / 2], [2.2, 0.45, 0.2], [2.4, -0.2, 1.2], [1.9, -0.3, -1.1], [2.6, 0.9, 0.5]];
    const figure = [[0, 0, Math.PI / 2], [0, -0.85, 0], [-0.35, 0.8, 1.1], [0.35, 0.8, -1.1], [-0.45, -0.3, 0.5], [0.45, -0.3, -0.5], [-0.2, -1.2, 0], [0.2, -1.2, 0],
      [-2.0, 0.6, 0], [-2.0, -0.2, 0], [-2.0, -1.0, 0], [2.0, 0.6, 0], [2.0, -0.2, 0], [2.0, -1.0, 0]];
    const star = matches.map((_, i) => { const a = (i / NM) * TAU; return [Math.cos(a) * 0.9, Math.sin(a) * 0.9, a]; });
    const LAYOUTS = [pile, house, figure, star];

    // ---------------------------------------------------------------- sand on a light box
    const sandG = groups.sand;
    const lb = box(6.2, 0.35, 3.6, M.matte(0x2a2d34)); lb.position.y = SET_Y + 0.18; sandG.add(lb);
    const sc = document.createElement('canvas'); sc.width = 620; sc.height = 360;
    const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 3.4), new THREE.MeshBasicMaterial({ map: st, toneMapped: false })); glass.rotation.x = -Math.PI / 2; glass.position.y = SET_Y + 0.37; sandG.add(glass);
    const NG = 2600, grains = new Float32Array(NG * 2), R1 = rng(11);
    const sandTargets = ['sun', 'bird', 'wave', 'cup'].map((k) => shapeTargets(k, NG, rng(20 + k.length)));
    for (let i = 0; i < NG; i++) { grains[2 * i] = sandTargets[0][2 * i]; grains[2 * i + 1] = sandTargets[0][2 * i + 1]; }
    const drawSand = () => {
      const g = sc.getContext('2d'); g.fillStyle = '#fff6e0'; g.fillRect(0, 0, 620, 360);
      g.fillStyle = 'rgba(70,45,20,.55)';
      for (let i = 0; i < NG; i++) g.fillRect(grains[2 * i], grains[2 * i + 1], 3, 3);
      st.needsUpdate = true;
    };
    drawSand();

    // ---------------------------------------------------------------- camera, monitor, labels
    const cam = makeStillsCamera(); root.add(cam);
    const legsG = cam.children[1];
    const view = makeCameraView(stage, { w: 320, h: 180, fov: 24 });
    const SW = 4.4, SH = SW * 9 / 16;
    const mon = makeScreen(SW, SH, view.rt.texture); mon.position.set(6.8, 6.6, -1.2); mon.rotation.y = -0.4; root.add(mon);
    hills.forEach(clipAll); clipAll(trees);
    let bk = '';
    const bd = board(root, 4.4, 1.9, 660, 285, (g, w, h) => {
      panelBg(g, w, h); const K = KINDS[bk] || KINDS.puppet;
      title(g, K.name, 'what the camera records, on the monitor above');
      wrap(g, 'Moved: ' + K.moved, 22, 100, w - 44, 26, { font: '18px sans-serif' });
      wrap(g, 'Camera: ' + K.cam, 22, 162, w - 44, 26, { font: '18px sans-serif', col: COL.cool });
      wrap(g, 'Famous: ' + K.eg, 22, 222, w - 44, 26, { font: '17px sans-serif', col: COL.hot });
    }, [6.8, 3.4, -0.5]);
    bd.mesh.rotation.y = -0.4;
    const lbl = stage.label('', [0, 0, 0], root);
    const lblGlass = stage.label('Glass layers', [-3.3, LV.mid, 1.9], root);
    const lblRost = stage.label('Rostrum camera', [0, SET_Y + 8.3, -0.2], root);

    const CAMS = {
      puppet: { pos: [0.4, SET_Y + 1.9, 9.2], tgt: [0, SET_Y + 1.25, 0], fov: 24, tripod: true },
      pix: { pos: [0.2, SET_Y + 2.2, 10.2], tgt: [0, SET_Y + 1.5, 0], fov: 26, tripod: true },
      object: { pos: [0.0, SET_Y + 5.0, 4.6], tgt: [0, SET_Y, 0], fov: 28, tripod: true },
      cutout: { pos: [0.0, SET_Y + 7.6, 0.25], tgt: [0, SET_Y, 0], fov: 30, tripod: false },
      sand: { pos: [0.0, SET_Y + 7.6, 0.25], tgt: [0, SET_Y, 0], fov: 30, tripod: false },
    };
    let lastKind = '', clock = 0, lastPose = -1, sandPose = 0, mPose = 0, mFrom = pile, mStep = 0;
    const jumpT = 0.45 + 0.35;  // in the air + crouch and land
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt); clock += dt;
        fitNarrow(stage, [lblGlass, lblRost, lbl]);
        reelBoards([[{ mesh: mon }, [1.0, 10.8, -1], 1.3], [bd, [1.0, -1.5, 3], 1.1]]);
        const T = s.stepped ? Math.floor(clock * 12) / 12 : clock;
        const pose = Math.floor(clock * 12);
        const newPose = pose !== lastPose; lastPose = pose;
        for (const k of ORDER) groups[k].visible = k === s.kind;
        set.flat.visible = s.kind === 'puppet' || s.kind === 'pix';
        rost.visible = s.kind === 'cutout' || s.kind === 'sand';
        lblGlass.visible = lblGlass.visible && s.kind === 'cutout'; lblRost.visible = lblRost.visible && rost.visible;
        if (s.kind !== lastKind) {
          lastKind = s.kind; bk = s.kind; bd.redraw();
          const C = CAMS[s.kind];
          cam.place(C.pos, C.tgt); legsG.visible = C.tripod;
          view.cam.fov = C.fov; view.cam.updateProjectionMatrix();
          root.updateMatrixWorld(true); view.cam.position.copy(cam.lensPos()); view.cam.lookAt(...C.tgt);
        }
        if (s.kind === 'puppet') {
          const d = (T * 0.9) % 6.4, x = -3.2 + d;
          pup.position.x = x; pup.pose(walkPose((d / 2.15) * TAU));
          lbl.element.textContent = 'Clay puppet'; lbl.position.set(x, SET_Y + 3.0, 0.4);
        }
        if (s.kind === 'cutout') {
          // the elephant walks; layers slide left at speeds ∝ 1/depth (parallax)
          const v = 0.5;
          ele.position.x = -0.6;
          const shiftMid = -((T * v * (DEPTH.top / DEPTH.mid)) % 1.8), shiftBack = -((T * v * (DEPTH.top / DEPTH.back)) % 2.1);
          trees.position.x = shiftMid; hills.forEach((h) => { h.position.x = shiftBack; });
          ground.position.x = 0;
          const ph = T * 5;
          legs.forEach((p, i) => { p.rotation.z = 0.28 * Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)); });
          trunk1.rotation.z = -0.15 + 0.12 * Math.sin(ph * 0.5); trunk2.rotation.z = 0.25 + 0.25 * Math.sin(ph * 0.5 + 0.6);
          ear.rotation.z = 0.08 * Math.sin(ph * 0.7);
          ele.position.y = -0.55 + 0.02 * Math.abs(Math.sin(ph));
          lbl.element.textContent = 'Paper elephant on the top glass'; lbl.position.set(0, LV.top + 0.9, 0.6);
        }
        if (s.kind === 'pix') {
          // a real jump: up and down continuously; photos are taken only at the top of each jump
          const cyc = clock / jumpT, n = Math.floor(cyc), ph = cyc - n;
          const air = 0.45 / jumpT, g = 9.81, v0 = Math.sqrt(2 * g * 0.25);
          const tt = ph * jumpT, yJ = ph < air ? (v0 * tt - 0.5 * g * tt * tt) * 10 * 0.18 : 0;   // shown at the person's 1:5.6 scale
          const x0 = -3.2, stepX = 0.45;
          person.position.set(x0 + ((n * stepX) % 6.4) + stepX * (ph < air ? ph / air : 1), SET_Y + yJ, 0.4);
          person.pose(ph < air ? 1 : 0.2 + 0.8 * Math.abs(Math.sin(((ph - air) / (1 - air)) * Math.PI)));
          const topY = 0.25 * 10 * 0.18;
          ghostsP.forEach((m, j) => { const k = n - j; m.visible = k >= 0; m.position.set(x0 + ((k * stepX) % 6.4) + stepX * 0.5, SET_Y + topY, 0.4); m.pose(1); });
          film.position.set(x0 + ((n * stepX) % 6.4) + stepX * 0.5, SET_Y + topY, 0.4); film.pose(1);
          lbl.element.textContent = 'A real person (shown small)'; lbl.position.set(person.position.x, SET_Y + 3.3, 0.4);
        }
        if (s.kind === 'object') {
          // every pose, each match moves one step towards the next layout; hold each layout a moment
          const stepsPer = 14, holdPer = 10;
          if (newPose || !s.stepped) {
            mStep += s.stepped ? 1 : dt * 12;
            if (mStep >= stepsPer + holdPer) { mStep = 0; mFrom = LAYOUTS[mPose]; mPose = (mPose + 1) % LAYOUTS.length; }
          }
          const to = LAYOUTS[mPose], k = clamp(mStep / stepsPer, 0, 1), e = k * k * (3 - 2 * k);
          matches.forEach((m, i) => {
            const a = mFrom[i], b = to[i];
            m.position.x = a[0] + (b[0] - a[0]) * e; m.position.z = a[1] + (b[1] - a[1]) * e; m.rotation.y = a[2] + (b[2] - a[2]) * e;
            m.position.y = SET_Y + 0.03 + (i % 3) * 0.046 * (1 - e);
          });
          lbl.element.textContent = 'Long matchsticks'; lbl.position.set(0, SET_Y + 1.0, 1.4);
        }
        if (s.kind === 'sand') {
          if (newPose || !s.stepped) {
            const idx = Math.floor(clock / 3) % sandTargets.length, tg = sandTargets[idx];
            const rate = s.stepped ? 0.18 : Math.min(1, dt * 2.2);
            for (let i = 0; i < NG; i++) { grains[2 * i] += (tg[2 * i] - grains[2 * i]) * rate; grains[2 * i + 1] += (tg[2 * i + 1] - grains[2 * i + 1]) * rate; }
            drawSand(); sandPose = idx;
          }
          lbl.element.textContent = 'Sand on a lit glass'; lbl.position.set(0, SET_Y + 1.0, 1.8);
        }
        // what the camera records: for pixilation only the photo taken at the top of the jump
        const pixOn = s.kind === 'pix';
        const vis = pixOn ? [person.visible, ...ghostsP.map((g) => g.visible)] : null;
        if (pixOn) { person.visible = false; ghostsP.forEach((g) => { g.visible = false; }); film.visible = true; }
        view.render([mon, bd.mesh, rost, legsG]);
        if (pixOn) { person.visible = vis[0]; ghostsP.forEach((g, i) => { g.visible = vis[i + 1]; }); film.visible = false; }
      },
      readout(s) {
        const K = KINDS[s.kind];
        let extra = '';
        if (s.kind === 'cutout') extra = `<div class="row"><span>Move per frame: elephant · trees · hills</span><b>1 : ${(DEPTH.top / DEPTH.mid).toFixed(1)} : ${(DEPTH.top / DEPTH.back).toFixed(1)}</b></div><div class="row"><span>Glass layers apart</span><b>12 cm</b></div>`;
        if (s.kind === 'pix') extra = `<div class="row"><span>Time in the air (25 cm jump)</span><b>${(2 * Math.sqrt(0.5 / 9.81)).toFixed(2)} s</b></div><div class="row"><span>Photo taken</span><b>at the top of each jump</b></div>`;
        if (s.kind === 'object') extra = `<div class="row"><span>Matchsticks</span><b>${NM}, moved a little each pose</b></div>`;
        if (s.kind === 'sand') extra = `<div class="row"><span>Sand grains shown</span><b>${NG.toLocaleString('en-IN')}</b></div><div class="row"><span>The sand is lit</span><b>from below: shapes show dark</b></div>`;
        return `<div class="big">${K.name}</div>
          <small>${K.moved}.</small>
          <div class="row"><span>Camera</span><b>${K.cam}</b></div>
          ${extra}
          <div class="row"><span>Motion</span><b>${s.stepped ? '12 poses a second' : 'smooth (not stop-motion)'}</b></div>`;
      },
      dispose() { view.dispose(); },
    };
  },
};

// A faceless mannequin about 3 units tall (a person shown at roughly 1:5.6), feet at y = 0, facing +x.
// pose(k): 0 = crouched to jump, 1 = tucked in the air.
function makeMannequin(color, ghost = false) {
  const g = new THREE.Group();
  const mat = ghost ? M.ghost(color, 0.22) : M.matte(color), skin = ghost ? M.ghost(0xd9b08c, 0.22) : M.matte(0xd9b08c), jeans = ghost ? M.ghost(0x2b3242, 0.22) : M.matte(0x2b3242);
  const hip = new THREE.Group(); hip.position.y = 1.55; g.add(hip);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.6, 6, 12), mat); torso.position.y = 0.55; torso.castShadow = !ghost; hip.add(torso);
  const headM = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), skin); headM.position.y = 1.3; headM.castShadow = !ghost; hip.add(headM);
  const leg = (z) => {
    const t = new THREE.Group(); t.position.set(0, 0, z); hip.add(t);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.55, 4, 8), jeans); a.position.y = -0.38; t.add(a);
    const k = new THREE.Group(); k.position.y = -0.76; t.add(k);
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.55, 4, 8), jeans); b.position.y = -0.38; k.add(b);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.16), ghost ? M.ghost(0x111111, 0.22) : M.matte(0x1b1d22)); shoe.position.set(0.08, -0.76, 0); k.add(shoe);
    return { t, k };
  };
  const arm = (z) => { const a = new THREE.Group(); a.position.set(0, 0.95, z); hip.add(a); const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.7, 4, 8), mat); m.position.y = -0.4; a.add(m); return a; };
  const L = [leg(-0.16), leg(0.16)], A = [arm(-0.38), arm(0.38)];
  g.pose = (k) => {
    // crouch (k = 0): hips 0.9 rad, knees 1.6; tuck in the air (k = 1): knees up, arms out
    const hipA = 0.9 * (1 - k) + 1.2 * k, knee = 1.6 * (1 - k) + 2.0 * k;
    L.forEach((l) => { l.t.rotation.z = hipA; l.k.rotation.z = -knee; });
    const drop = 0.76 * (1 - Math.cos(hipA)) + 0.76 * (1 - Math.cos(hipA - knee));
    hip.position.y = 1.55 - drop * (1 - k) + 0.3 * k;
    hip.rotation.z = -0.3 * (1 - k);
    A.forEach((a, i) => { a.rotation.z = 0.4 + 1.6 * k; a.rotation.x = (i ? -1 : 1) * 0.5 * k; });
  };
  g.pose(0);
  return g;
}

// Targets for sand grains, sampled inside a drawn shape on a 620 × 360 canvas.
function shapeTargets(kind, n, r) {
  const c = document.createElement('canvas'); c.width = 620; c.height = 360;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.strokeStyle = '#000'; g.lineCap = 'round'; g.lineWidth = 26;
  if (kind === 'sun') { g.beginPath(); g.arc(310, 180, 80, 0, TAU); g.fill(); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.beginPath(); g.moveTo(310 + Math.cos(a) * 110, 180 + Math.sin(a) * 110); g.lineTo(310 + Math.cos(a) * 160, 180 + Math.sin(a) * 160); g.stroke(); } }
  if (kind === 'bird') { g.lineWidth = 30; g.beginPath(); g.moveTo(130, 150); g.quadraticCurveTo(230, 60, 310, 190); g.quadraticCurveTo(390, 60, 490, 150); g.stroke(); g.beginPath(); g.ellipse(310, 205, 40, 26, 0, 0, TAU); g.fill(); }
  if (kind === 'wave') { g.lineWidth = 34; for (const y of [130, 230]) { g.beginPath(); for (let x = 60; x <= 560; x += 10) { const yy = y + 40 * Math.sin((x / 500) * TAU * 1.5); x === 60 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); } }
  if (kind === 'cup') { g.beginPath(); g.moveTo(220, 130); g.lineTo(400, 130); g.lineTo(380, 290); g.lineTo(240, 290); g.closePath(); g.fill(); g.lineWidth = 22; g.beginPath(); g.arc(410, 200, 42, -1.3, 1.3); g.stroke(); for (const x of [270, 310, 350]) { g.beginPath(); g.moveTo(x, 110); g.quadraticCurveTo(x - 20, 80, x, 50); g.stroke(); } }
  const d = g.getImageData(0, 0, 620, 360).data, out = new Float32Array(n * 2);
  let i = 0, guard = 0;
  while (i < n && guard < n * 60) { guard++; const x = r() * 620, y = r() * 360; if (d[(Math.floor(y) * 620 + Math.floor(x)) * 4 + 3] > 10) { out[2 * i] = x; out[2 * i + 1] = y; i++; } }
  for (; i < n; i++) { out[2 * i] = r() * 620; out[2 * i + 1] = r() * 360; }
  return out;
}
