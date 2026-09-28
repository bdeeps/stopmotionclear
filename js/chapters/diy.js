// Chapter 6: make your own. A desk with a sheet of card as a backdrop, the clay puppet, a cup, a desk lamp, a
// window, and a phone on a small tripod. The phone's view is a real second camera; its screen is shown large.
// A calculator gives frames and photos for a clip, a shot plan splits it into three shots, and a checklist of
// the five common mistakes shows each problem on the phone's screen until you fix it.
// Numbers
//  - Phone main camera ≈ 26 mm (35 mm equivalent), so a 16:9 landscape frame is 2·atan(10.125/26) ≈ 42.6° tall.
//    At 37 cm it sees a 29 cm tall slice: enough for the 25 cm puppet.
//  - Frames = seconds × fps. Photos = frames on ones, frames ÷ 2 on twos (the app shows each photo twice).
//  - Photo size: a 12-megapixel phone JPEG is typically 2 to 5 MB; we use 3.5 MB (estimate).
//  - Shooting time = photos × time per pose (your own pace; beginners often need 20 s to a minute).
import { THREE, M, clamp } from '../kit.js';
import {
  makeSet, makePuppet, makeLamp, makeCameraView, board, panelBg, title, text, COL, fitNarrow, reelBoards, SET_Y, box, sphere, hash01, stick, rrect, fmtInt, TAU, D2R,
} from '../stopmo.js';
import { walkPose } from './frames.js';

export const CHECKS = [
  { key: 'tape', name: 'Tripod taped down', bad: 'The phone gets knocked: the picture jumps.', fix: 'Tape or weigh the tripod to the desk.' },
  { key: 'remote', name: 'Hands off the phone', bad: 'Tapping the screen shakes it every frame.', fix: 'Use a timer, earphone button or remote.' },
  { key: 'lock', name: 'Focus and exposure locked', bad: 'The phone re-meters: brightness pumps.', fix: 'Long-press to lock AE/AF, or use a stop-motion app.' },
  { key: 'blinds', name: 'Curtains shut, lamp on', bad: 'Daylight drifts: the film flickers.', fix: 'Block the window and light with a lamp.' },
  { key: 'tie', name: 'Puppet stuck down', bad: 'The puppet slides and falls over.', fix: 'Use sticky tack under the feet.' },
];
const FOV = 2 * Math.atan(10.125 / 26) / D2R;
const MB = 3.5;

export default {
  id: 'diy',
  short: 'Make your own',
  title: 'Make your own stop-motion with a phone',
  subtitle: 'A phone, a tripod, a lamp and some clay. Plan the shots, count the frames, avoid the five classic mistakes.',
  view: { pos: [4.0, 7.0, 15.5], target: [2.4, 3.4, 0] },
  learn: `<p>You can make stop-motion with a phone. Put it on a small <b>tripod</b>, build a tiny set on a desk with a sheet of card behind it, and use a free <b>stop-motion app</b>: it takes the photos, shows onion skin and plays your film back.</p>
    <p><b>Plan first.</b> A 5-second clip at 12 frames a second is 60 frames. Split it into shots: a <b>wide</b> shot to show the place, a <b>close-up</b> for a feeling, and a <b>detail</b>. Move things in <b>small steps</b>: a few millimetres a frame for a slow walk. Keep a pose for a few frames when the character thinks.</p>
    <p><b>Avoid the five classic mistakes.</b> A phone that gets knocked makes the picture jump. Tapping the screen shakes it too. Auto exposure makes the brightness pump. Daylight from a window makes the film flicker. And a puppet that is not stuck down slides and falls. Fix all five and your film looks steady and smooth.</p>
    <p>Want more? The camera is explained in <b>CameraClear</b>, light in <b>LightingClear</b>, and sound effects in <b>SFXClear</b>.</p>
    <p class="tip"><b>Try it:</b> set your clip length and frame rate and read the numbers. Then tick off the checklist one by one and watch each problem disappear from the phone's screen.</p>`,
  terms: [
    { t: 'Stop-motion app', d: 'A phone app that takes the frames, shows onion skin and plays back the film.' },
    { t: 'AE/AF lock', d: 'Fixing the phone’s exposure (AE) and focus (AF) so they do not change between frames.' },
    { t: 'Shot plan', d: 'A short list of the shots in your film and how long each lasts.' },
    { t: 'Sticky tack', d: 'Reusable putty that holds a puppet’s feet to the set.' },
    { t: 'Hold', d: 'Shooting the same pose for several frames, so a character pauses.' },
  ],
  defaults: { len: 5, fps: 12, twos: false, pace: 30, tape: false, remote: false, lock: false, blinds: false, tie: false },
  controls: [
    { key: 'len', type: 'range', label: 'Clip length', min: 1, max: 30, step: 1, fmt: (v) => `${v} s` },
    { key: 'fps', type: 'seg', label: 'Frame rate', options: [8, 12, 15, 24].map((v) => ({ v, label: `${v} fps` })) },
    { key: 'twos', type: 'toggle', label: 'Shoot on twos (each photo used twice)' },
    { key: 'pace', type: 'range', label: 'Your time per pose', min: 10, max: 120, step: 5, fmt: (v) => `${v} s` },
    ...CHECKS.map((c) => ({ key: c.key, type: 'toggle', label: `✓ ${c.name}` })),
    { key: 'all', type: 'buttons', label: 'Checklist', items: [{ label: 'Fix all five', act: (s) => { CHECKS.forEach((c) => { s[c.key] = true; }); } }, { label: 'Undo all', act: (s) => { CHECKS.forEach((c) => { s[c.key] = false; }); } }] },
  ],
  quiz: [
    { q: 'How many frames is a 5-second clip at 12 fps?', options: ['17', '60', '120', '512'], answer: 1, why: '5 seconds × 12 frames a second = 60 frames.' },
    { q: 'Your film’s brightness pumps up and down. What is the likely fix?', options: ['Move the puppet more', 'Lock the phone’s exposure', 'Use more clay', 'Shoot faster'], answer: 1, why: 'The phone keeps re-metering each photo. Locking exposure (AE lock) keeps every frame the same.' },
    { q: 'Why stick the puppet’s feet down with sticky tack?', options: ['To make it taller', 'So it does not slide or fall between frames', 'To change its colour', 'So it can talk'], answer: 1, why: 'A puppet that shifts between frames jitters on screen, and one that falls ruins the shot.' },
  ],
  reel: [
    { ms: 5400, caption: 'Make your own: a phone on a tripod, a lamp, some clay, and about 60 photos for 5 seconds.', set: { len: 5, fps: 12, twos: false, tape: false, remote: false, lock: false, blinds: false, tie: false }, anim: { tape: [false, true], lock: [false, true], blinds: [false, true], tie: [false, true], remote: [false, true] }, spin: 0.15, view: { pos: [2.4, 5.2, 9.5], target: [0.8, 2.6, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const desk = makeSet({ w: 9, d: 6.4, backdrop: false }); root.add(desk);
    // a curved card "sweep" as the backdrop
    const sweep = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 5.2, 24, 1, true, Math.PI, Math.PI / 2), M.matte(0xf2c14e, { side: THREE.DoubleSide }));
    sweep.rotation.z = Math.PI / 2; sweep.position.set(0, SET_Y + 1.4, -1.6); root.add(sweep);
    const wallC = box(5.2, 3.2, 0.02, M.matte(0xf2c14e)); wallC.position.set(0, SET_Y + 1.4 + 1.6, -3.0); root.add(wallC);
    const pup = makePuppet(); pup.position.set(-0.4, SET_Y, -0.8); pup.rotation.y = -1.2; root.add(pup);
    const cup = new THREE.Group(); cup.position.set(0.9, SET_Y, -0.6); root.add(cup);
    const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.6, 24), M.plastic(0xf2efe8, { roughness: 0.3 })); c1.position.y = 0.3; cup.add(c1);
    const tea = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24), M.matte(0x8a4f22)); tea.rotation.x = -Math.PI / 2; tea.position.y = 0.58; cup.add(tea);
    // desk lamp and window
    const lamp = makeLamp(3.4); lamp.position.set(3.9, 0, 1.0); lamp.aim(0, SET_Y + 1.2, -0.8); root.add(lamp);
    const lampL = new THREE.SpotLight(0xfff1d6, 90, 40, 0.8, 0.6, 2); lampL.position.set(3.9, 3.4, 1.0); lampL.target.position.set(0, SET_Y + 1, -0.8); root.add(lampL, lampL.target);
    const win = new THREE.Group(); win.position.set(-5.4, 4.0, -1.2); win.rotation.y = Math.PI / 2; root.add(win);
    const wf = box(2.4, 2.4, 0.12, M.matte(0xe8e2d4)); win.add(wf);
    const panes = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), M.glow(0xcfe8ff)); panes.position.z = 0.07; win.add(panes);
    const curtain = box(2.5, 2.5, 0.06, M.matte(0x7a3b52)); curtain.position.z = 0.16; win.add(curtain);
    const sun = new THREE.SpotLight(0xdfeeff, 0, 40, 0.6, 0.6, 2); sun.position.set(-5.3, 4.0, -1.2); sun.target.position.set(0, SET_Y, -0.8); root.add(sun, sun.target);

    // phone on a small desk tripod, landscape, lens towards the puppet
    const phoneP = [0.1, SET_Y + 1.25, 2.9], phoneT = [-0.1, SET_Y + 1.2, -0.8];
    const phone = new THREE.Group(); root.add(phone);
    const pb = box(1.55, 0.75, 0.08, M.matte(0x16181d)); phone.add(pb);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16), M.metal(0x333)); lens.rotation.x = Math.PI / 2; lens.position.set(0.55, 0.22, 0.05); phone.add(lens);
    const view = makeCameraView(stage, { w: 384, h: 216, fov: FOV, near: 0.05 });
    const pscr = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.68), new THREE.MeshBasicMaterial({ map: view.rt.texture, toneMapped: true })); pscr.position.z = -0.045; pscr.rotation.y = Math.PI; phone.add(pscr);
    const tri = new THREE.Group(); root.add(tri);
    const tm = M.metal(0x2a2d34);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.4; tri.add(stick(0.03, tm)); tri.children[i].between([phoneP[0], phoneP[1] - 0.45, phoneP[2]], [phoneP[0] + Math.cos(a) * 0.7, SET_Y, phoneP[2] + Math.sin(a) * 0.7]); }
    const col = stick(0.035, tm); tri.add(col); col.between([phoneP[0], phoneP[1] - 0.45, phoneP[2]], [phoneP[0], phoneP[1], phoneP[2]]);
    const tape = [-1, 1].map((k) => { const t = box(0.5, 0.012, 0.18, M.matte(0x5b9bd5)); t.position.set(phoneP[0] + k * 0.55, SET_Y + 0.006, phoneP[2] + 0.2); root.add(t); return t; });
    const tack = [-1, 1].map((z) => { const t = sphere(0.07, M.matte(0x5b9bd5)); t.scale.y = 0.4; t.position.set(-0.33, SET_Y + 0.01, -0.8 + z * 0.12); root.add(t); return t; });

    // big copy of the phone's screen
    const SW = 3.8, SH = SW * 9 / 16;
    const big = new THREE.Group(); big.position.set(6.6, 6.0, -1.0); big.rotation.y = -0.4; root.add(big);
    const bez = box(SW + 0.3, SH + 0.3, 0.1, M.matte(0x0c0d10)); bez.position.z = -0.06; big.add(bez);
    const bigScr = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: view.rt.texture, toneMapped: true })); big.add(bigScr);
    const hudC = document.createElement('canvas'); hudC.width = 640; hudC.height = 360;
    const hudT = new THREE.CanvasTexture(hudC); hudT.colorSpace = THREE.SRGBColorSpace;
    const hud = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: hudT, transparent: true, toneMapped: false })); hud.position.z = 0.01; big.add(hud);

    // calculator and checklist board
    let bs = null;
    const bd = board(root, 4.6, 3.2, 690, 480, (g, w, h) => {
      panelBg(g, w, h); if (!bs) return;
      title(g, 'Plan your clip', `${bs.len} s at ${bs.fps} fps${bs.twos ? ', on twos' : ''}`);
      const frames = bs.len * bs.fps, photos = Math.ceil(frames / (bs.twos ? 2 : 1));
      text(g, `${fmtInt(frames)} frames · ${fmtInt(photos)} photos`, 22, 102, { font: 'bold 22px sans-serif', col: COL.hot });
      const plan = [['1 · Wide', 0.4, 'where we are'], ['2 · Close-up', 0.4, 'a face, a feeling'], ['3 · Detail', 0.2, 'the cup of chai']];
      let x = 22; const W = w - 44;
      plan.forEach(([n, f, why], i) => {
        const ww = W * f; g.fillStyle = ['#8ec5ff', '#ff9a5c', '#c49bff'][i]; g.fillRect(x, 120, ww - 6, 34);
        text(g, `${n}: ${Math.round(photos * f)} photos`, x + 6, 144, { font: 'bold 15px sans-serif', col: '#111' });
        text(g, why, x + 6, 176, { font: '14px sans-serif', col: COL.soft });
        x += ww;
      });
      text(g, 'Common mistakes', 22, 222, { font: 'bold 21px sans-serif' });
      CHECKS.forEach((c, i) => {
        const y = 252 + i * 44, ok = bs[c.key];
        g.strokeStyle = ok ? COL.good : COL.bad; g.lineWidth = 3; g.strokeRect(24, y - 4, 24, 24);
        if (ok) { g.beginPath(); g.moveTo(29, y + 8); g.lineTo(35, y + 15); g.lineTo(45, y + 1); g.stroke(); }
        text(g, c.name, 60, y + 14, { font: ok ? '18px sans-serif' : 'bold 18px sans-serif', col: ok ? COL.good : '#fff' });
        text(g, ok ? c.fix : c.bad, 60, y + 34, { font: '14px sans-serif', col: ok ? COL.soft : COL.bad });
      });
    }, [7.0, 2.3, -1.1]);
    bd.mesh.rotation.y = -0.4;
    const lblPhone = stage.label('Phone on a desk tripod', [phoneP[0], phoneP[1] + 0.9, phoneP[2]], root);
    const lblWin = stage.label('Window', [-5.3, 5.5, -1.2], root);
    const lblLamp = stage.label('Desk lamp', [3.9, 4.2, 1.0], root);

    let clock = 0, lastPose = -1, jit = [0, 0], bright = 1, slide = 0, fall = 0, walkN = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt); clock += dt;
        fitNarrow(stage, [lblWin, lblLamp, lblPhone]);
        reelBoards([[{ mesh: big }, [0.4, 7.4, -1], 1.25], [bd, [0.4, -1.8, 2.6], 1.0]]);
        const pose = Math.floor(clock * 12);
        if (pose !== lastPose) {
          lastPose = pose; walkN++;
          const shake = (!s.tape ? 0.6 : 0) + (!s.remote ? 0.5 : 0);
          jit = [(hash01(pose * 1.7) - 0.5) * shake, (hash01(pose * 2.9) - 0.5) * shake];
          const day = s.blinds ? 0 : 0.25 * Math.sin(pose * 0.37) + 0.2 * (hash01(pose * 4.1) - 0.5);
          const ae = s.lock ? 0 : 0.12 * (hash01(pose * 6.3) - 0.5);
          bright = 1 + day + ae;
          sun.intensity = s.blinds ? 0 : 60 * (1 + day);
        }
        // puppet: a slow walk on the spot; if not stuck down it creeps and then topples
        if (!s.tie) { slide = Math.min(1, slide + dt * 0.25); } else { slide = Math.max(0, slide - dt * 2); }
        fall = slide > 0.7 ? Math.min(1, (slide - 0.7) / 0.3) : 0;
        pup.pose(walkPose(walkN * 0.25));
        pup.rotation.z = -fall * 0.35; pup.position.x = -0.4 + slide * 0.25;
        tack.forEach((t) => { t.visible = s.tie; });
        tape.forEach((t) => { t.visible = s.tape; });
        curtain.visible = s.blinds; panes.material.color.setHex(s.blinds ? 0x333333 : 0xcfe8ff);
        // phone pose + camera
        phone.position.set(...phoneP); phone.lookAt(new THREE.Vector3(...phoneT));
        phone.rotateX(jit[1] * D2R); phone.rotateY(jit[0] * D2R);
        view.cam.position.set(...phoneP); view.cam.quaternion.copy(phone.quaternion); view.cam.rotateY(Math.PI);
        view.render([big, bd.mesh, phone, tri]);
        const lvl = clamp(bright, 0.5, 1.6);
        bigScr.material.color.setScalar(lvl); pscr.material.color.setScalar(lvl);
        // HUD with problems listed
        const g = hudC.getContext('2d'); g.clearRect(0, 0, 640, 360);
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1.5;
        for (const k of [1, 2]) { g.beginPath(); g.moveTo((640 * k) / 3, 0); g.lineTo((640 * k) / 3, 360); g.moveTo(0, (360 * k) / 3); g.lineTo(640, (360 * k) / 3); g.stroke(); }
        const probs = CHECKS.filter((c) => !s[c.key]);
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, 640, 34); g.fillStyle = '#fff'; g.font = 'bold 18px sans-serif';
        g.fillText(`PHONE · 26 mm · ${s.fps} fps · ${probs.length ? probs.length + ' problem' + (probs.length > 1 ? 's' : '') : 'all good'}`, 12, 23);
        if (probs.length) { g.fillStyle = 'rgba(255,90,138,.88)'; g.fillRect(0, 326, 640, 34); g.fillStyle = '#fff'; g.fillText(probs[0].bad, 12, 349); }
        hudT.needsUpdate = true;
        const key = [s.len, s.fps, s.twos, ...CHECKS.map((c) => s[c.key])].join('|');
        if (!bs || bs.key !== key) { bs = { key, len: s.len, fps: s.fps, twos: s.twos }; CHECKS.forEach((c) => { bs[c.key] = s[c.key]; }); bd.redraw(); }
      },
      readout(s) {
        const frames = s.len * s.fps, photos = Math.ceil(frames / (s.twos ? 2 : 1));
        const secs = photos * s.pace, time = secs >= 3600 ? `${(secs / 3600).toFixed(1)} hours` : `${Math.round(secs / 60)} minutes`;
        const probs = CHECKS.filter((c) => !s[c.key]).length;
        return `<div class="big">${fmtInt(photos)} photos for ${s.len} s</div>
          <div class="row"><span>Frames (${s.len} s × ${s.fps} fps)</span><b>${fmtInt(frames)}</b></div>
          <div class="row"><span>Photos to take</span><b>${fmtInt(photos)}${s.twos ? ' (each used twice)' : ''}</b></div>
          <div class="row"><span>Shooting time at ${s.pace} s a pose</span><b>${time}</b></div>
          <div class="row"><span>Phone storage (≈ ${MB} MB a photo)</span><b>${photos * MB >= 1000 ? (photos * MB / 1000).toFixed(1) + ' GB' : Math.round(photos * MB) + ' MB'}</b></div>
          <div class="row"><span>Phone sees at 37 cm (26 mm lens)</span><b>${(2 * 37 * Math.tan((FOV / 2) * D2R)).toFixed(0)} cm tall</b></div>
          ${probs ? `<div class="no">${probs} of 5 common mistakes still in the shot.</div>` : '<div class="ok">All five fixed: a steady, flicker-free film.</div>'}`;
      },
      dispose() { view.dispose(); },
    };
  },
};
