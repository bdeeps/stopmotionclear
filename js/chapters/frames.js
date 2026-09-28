// Chapter 1: one frame at a time. A tabletop set (baseboard, backdrop flat, two LED lamps), a stills
// camera on a tripod and the clay chai-wallah. Each "Nudge + capture" moves the puppet a few millimetres
// along a walk cycle, the animator's hand leaves the shot, and the camera grabs a real frame from its own
// view (a second three.js camera rendered to a texture). Frames pile up in a filmstrip, and play back on
// the monitor at 12 or 24 frames a second.
// Numbers
//  - Frames: 24 fps is the cinema standard. Many stop-motion films are animated "on twos": each pose is held
//    for two frames, 12 poses a second (see FilmClear for frame rates and "ones and twos").
//  - Output: an Aardman animator averaged about 4.2 seconds of finished animation a week on Wallace & Gromit:
//    Vengeance Most Fowl (Post Magazine, Nov/Dec 2024), with up to 30 animators at once. On Coraline, 29
//    full-time animators together made 90–100 seconds a week (Focus Features), about 3 to 3.5 s each.
//  - Walk speed check: the puppet is 25 cm tall, about 1:6.8 of a 1.7 m person. A person's comfortable
//    walking speed is about 1.2–1.4 m/s (Bohannon 1997, Age and Ageing 26:15–19).
//  - Walk cycle: legs swing ±0.32 rad; one full cycle (two steps) moves the body 2π·L·A ≈ 2.15 units, which
//    keeps the planted foot close to still (L = hip-to-ankle length).
import { THREE, M, clamp } from '../kit.js';
import {
  makeSet, makePuppet, makeLamp, makeStillsCamera, makeCameraView, makeScreen, makeHand, board, panelBg, title, text, COL,
  fitNarrow, reelBoards, inReel, SET_Y, P, rrect, fmtInt,
} from '../stopmo.js';

const A = 0.32, LEG = P.thigh + P.shin, STRIDE = 2 * Math.PI * LEG * A;
const X0 = -4.2, X1 = 4.2, Z = 0.4;
const SCALE = 1.7 / 0.25;           // puppet to person
export const OUTPUT = { aardman: 4.2, coraline: 95 / 29 };
export function walkPose(phase) {
  const s = Math.sin(phase), c = Math.cos(phase);
  return {
    hipL: A * s, hipR: -A * s,
    knL: 0.6 * Math.max(0, c) * 0.9, knR: 0.6 * Math.max(0, -c) * 0.9,
    shL: -0.36 * s, shR: 0.18 * s, elL: 0.25 + 0.1 * Math.max(0, -s), elR: 0.35,
    bob: -0.045 * s * s, spine: 0.04, nod: -0.03, neck: 0.1 * Math.sin(phase * 0.5),
  };
}
const TIMING = { reach: 0.22, push: 0.42, leave: 0.66, snap: 0.72, done: 0.82 };

export default {
  id: 'frames',
  short: 'One frame at a time',
  title: 'One frame at a time',
  subtitle: 'Nudge the puppet, take a photo, repeat. Play the photos fast and it walks.',
  view: { pos: [3.6, 8.6, 20.5], target: [2.2, 3.9, 0] },
  learn: `<p>Nothing on a stop-motion set ever moves on its own. An animator bends the puppet a tiny bit, steps out of the way, and the camera takes <b>one photo</b>, called a <b>frame</b>. Then they do it again. And again.</p>
    <p>Play the photos back quickly and your brain joins them into smooth movement (the same trick as all film, see <b>FilmClear</b>). Cinema runs at <b>24 frames a second</b>. Many stop-motion films are animated <b>on twos</b>: each pose is held for two frames, so the animator makes <b>12 poses</b> for each second.</p>
    <p>That means <b>1 minute of film needs 1,440 frames</b>, or 720 poses on twos. No wonder it is slow. At Aardman, the studio behind <b>Wallace &amp; Gromit</b>, one animator makes about <b>4 seconds of film a week</b>. On Laika's <b>Coraline</b> (2009), 29 animators together made about 90 to 100 seconds a week.</p>
    <p>The size of each nudge sets the speed. Big moves between frames make a fast, jumpy walk. Tiny moves make a slow, smooth one.</p>
    <p class="tip"><b>Try it:</b> press “Nudge + capture” a few times and watch the filmstrip fill up. Press “Capture 12 more”, then turn on playback. Switch between 12 and 24 frames a second, and change the nudge size.</p>`,
  terms: [
    { t: 'Frame', d: 'One photo in the film. Stop-motion is built one frame at a time.' },
    { t: 'Frames per second (fps)', d: 'How many frames are shown each second. Cinema uses 24.' },
    { t: 'On ones / on twos', d: 'A new pose every frame, or each pose held for two frames (12 poses a second at 24 fps).' },
    { t: 'Baseboard', d: 'The raised, drilled board the set is built on, so animators can reach under it.' },
    { t: 'Walk cycle', d: 'The repeating set of poses that makes a character walk: two steps.' },
    { t: 'Frame grab', d: 'Software that captures each frame from the camera and plays the film back.' },
  ],
  defaults: { step: 8, fps: 12, play: false, count: 0 },
  controls: [
    { key: 'shoot', type: 'buttons', label: 'Animate', items: [
      { label: '✋ Nudge + capture', act: (s, i) => i.queue?.(1) },
      { label: 'Capture 12 more', act: (s, i) => i.queue?.(12) },
      { label: 'Clear the film', act: (s, i) => i.clearFilm?.() },
    ] },
    { key: 'step', type: 'range', label: 'Nudge per frame', min: 2, max: 20, step: 1, ends: ['tiny', 'big'], fmt: (v) => `${v} mm` },
    { key: 'play', type: 'toggle', label: 'Play back the film on the monitor' },
    { key: 'fps', type: 'seg', label: 'Playback speed', options: [{ v: 12, label: '12 fps' }, { v: 24, label: '24 fps' }] },
  ],
  quiz: [
    { q: 'How many frames are in one minute of film at 24 frames a second?', options: ['240', '1,440', '24', '14,400'], answer: 1, why: '60 seconds × 24 frames = 1,440 frames. On twos that is still 720 separate poses.' },
    { q: 'Animating "on twos" at 24 fps means…', options: ['Two animators work at once', 'Each pose is shot for two frames, 12 poses a second', 'The film plays twice', 'Two cameras film the set'], answer: 1, why: 'Each pose is held for two frames. The film still runs at 24 fps, but there are only 12 new poses each second.' },
    { q: 'You make the puppet move twice as far between frames. On screen it…', options: ['Moves twice as fast', 'Moves at the same speed', 'Moves half as fast', 'Stops'], answer: 0, why: 'Speed on screen is the move per frame times the frames per second. Double the nudge and the speed doubles.' },
  ],
  reel: [
    { ms: 5200, caption: 'Stop-motion: move a puppet a few millimetres, take one photo, and repeat.', set: { step: 8, fps: 12, play: false }, act: (s, i) => { i.clearFilm?.(); i.queue?.(8); }, spin: 0, view: { pos: [0.8, 6.8, 13], target: [0, 3.2, 0] } },
    { ms: 5200, caption: 'One minute of film needs 1,440 frames. A good animator makes about four seconds a week.', set: { play: true, fps: 12 }, act: (s, i) => { i.queue?.(12); }, spin: 0.3, view: { pos: [3.6, 8.6, 20.5], target: [2.2, 3.9, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const set = makeSet(); root.add(set);
    const pup = makePuppet(); pup.position.set(X0, SET_Y, Z); root.add(pup);
    const lamps = [makeLamp(4.4), makeLamp(3.8)];
    lamps[0].position.set(-6.2, 0, 4.6); lamps[1].position.set(6.6, 0, 3.4); root.add(...lamps);
    lamps[0].aim(0, SET_Y + 1.2, 0); lamps[1].aim(0, SET_Y + 1.2, 0);
    // the stills camera, front and centre, on a tripod standing on the studio floor
    const camPos = [0.6, SET_Y + 1.9, 9.2], camTgt = [0, SET_Y + 1.25, 0];
    const cam = makeStillsCamera(); root.add(cam); cam.place(camPos, camTgt);
    const view = makeCameraView(stage, { w: 320, h: 180, fov: 24 });
    view.cam.position.copy(new THREE.Vector3(...camPos)).add(new THREE.Vector3(0, 0, -1.3));
    view.cam.lookAt(...camTgt);
    const hand = makeHand(); root.add(hand); hand.visible = false;

    // monitor: live view (render target) or playback (canvas)
    const SW = 4.2, SH = SW * 9 / 16;
    const mon = makeScreen(SW, SH, view.rt.texture); mon.position.set(8.0, 7.2, -1.0); mon.rotation.y = -0.4; root.add(mon);
    const pbC = document.createElement('canvas'); pbC.width = 320; pbC.height = 180;
    const pbT = new THREE.CanvasTexture(pbC); pbT.colorSpace = THREE.SRGBColorSpace;
    const pb = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: pbT, toneMapped: false })); pb.position.z = 0.01; mon.add(pb);
    const tagC = document.createElement('canvas'); tagC.width = 512; tagC.height = 48;
    const tagT = new THREE.CanvasTexture(tagC); tagT.colorSpace = THREE.SRGBColorSpace;
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(SW, SW * 48 / 512), new THREE.MeshBasicMaterial({ map: tagT, transparent: true, toneMapped: false })); tag.position.set(0, SH / 2 + 0.3, 0.01); mon.add(tag);
    let tagTxt = '';
    const setTag = (s, col) => {
      if (s === tagTxt) return; tagTxt = s;
      const g = tagC.getContext('2d'); g.clearRect(0, 0, 512, 48); g.fillStyle = 'rgba(10,12,18,.85)'; g.fillRect(0, 0, 512, 48);
      g.fillStyle = col; g.beginPath(); g.arc(22, 24, 9, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 24px sans-serif'; g.fillText(s, 42, 32); tagT.needsUpdate = true;
    };

    // filmstrip of the last frames
    const frames = [];
    const strip = board(root, 4.6, 1.25, 736, 200, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = '#16120e'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.75)';
      for (let x = 8; x < w; x += 24) { rrect(g, x, 8, 12, 12, 2); g.fill(); rrect(g, x, h - 20, 12, 12, 2); g.fill(); }
      const n = frames.length, show = 5, fw = 136, fh = 76.5;
      for (let k = 0; k < show; k++) {
        const i = n - show + k, x = 12 + k * (fw + 8), y = 38;
        g.fillStyle = '#0a0a0a'; g.fillRect(x, y, fw, fh);
        if (i >= 0) { g.drawImage(frames[i], x, y, fw, fh); text(g, `${i + 1}`, x + 4, y + fh + 26, { font: 'bold 18px sans-serif', col: COL.hot }); }
      }
      text(g, n ? `${n} frame${n > 1 ? 's' : ''}` : 'no frames yet', w - 12, h - 30, { font: 'bold 18px sans-serif', col: '#fff', align: 'right' });
    }, [8.0, 5.0, -0.8]);
    strip.mesh.rotation.y = -0.4;

    // how many frames board
    let bs = { fps: 12 };
    const count = board(root, 4.4, 2.9, 616, 406, (g, w, h) => {
      panelBg(g, w, h);
      title(g, 'How many frames?', 'at 24 fps; poses if animated on twos');
      const rows = [['1 second', 1], ['10 seconds', 10], ['1 minute', 60], ['A 90-minute feature', 5400]];
      rows.forEach(([name, sec], i) => {
        const y = 108 + i * 44;
        text(g, name, 24, y, { font: '19px sans-serif' });
        text(g, fmtInt(sec * 24), 420, y, { font: 'bold 20px sans-serif', col: COL.hot, align: 'right' });
        text(g, fmtInt(sec * 12), 580, y, { font: '19px sans-serif', col: COL.cool, align: 'right' });
      });
      text(g, 'frames', 420, 82, { font: '15px sans-serif', col: COL.soft, align: 'right' });
      text(g, 'poses on twos', 580, 82, { font: '15px sans-serif', col: COL.soft, align: 'right' });
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(20, 282, w - 40, 2);
      text(g, 'One animator makes about 4 seconds a week', 24, 314, { font: 'bold 19px sans-serif', col: COL.clay });
      text(g, `1 minute = ${(60 / OUTPUT.aardman).toFixed(0)} animator-weeks. A 90-minute film:`, 24, 344, { font: '17px sans-serif' });
      text(g, `≈ ${fmtInt(5400 / OUTPUT.aardman)} animator-weeks, or 30 animators for ${Math.round(5400 / OUTPUT.aardman / 30)} weeks.`, 24, 370, { font: '17px sans-serif' });
      text(g, 'Aardman figure (2024); Coraline: 29 animators, 90–100 s a week', 24, 396, { font: '13px sans-serif', col: COL.soft });
    }, [8.0, 2.3, -0.4]);
    count.mesh.rotation.y = -0.4;

    const lblCam = stage.label('Stills camera, locked off', [camPos[0], camPos[1] + 1.0, camPos[2]], root);
    const lblPup = stage.label('Clay puppet, 25 cm', [0, SET_Y + 3.0, Z], root);
    const lblLamp = stage.label('LED lamp', [-6.2, 5.1, 4.6], root);
    const lblBoard = stage.label('Baseboard with tie-down holes', [3.5, SET_Y + 0.05, 2.9], root);

    // animation state
    let n = 0;                // poses made
    let pending = 0, act = -1, from = null, to = null, playT = 0, flash = 0;
    const cur = walkPose(0);
    const poseAt = (k, step) => {
      const d = (step / 10) * k, span = X1 - X0;
      const x = X0 + (d % span);
      return { x, pose: walkPose((d / STRIDE) * Math.PI * 2) };
    };
    let stepNow = 8;
    const apply = (st) => { pup.position.x = st.x; pup.pose(st.pose); };
    apply(poseAt(0, stepNow));
    const hide = [mon, strip.mesh, count.mesh];
    const lerpPose = (a, b, k) => { const o = {}; for (const key in b) o[key] = a[key] + (b[key] - a[key]) * k; return o; };
    let sref = null;
    const capture = () => {
      view.render(hide);
      frames.push(view.grab(160, 90));
      if (frames.length > 240) frames.shift();
      strip.redraw();
      if (sref) sref.count = frames.length;
    };

    const inst = {
      queue(k) { pending += k; },
      clearFilm() { frames.length = 0; pending = 0; act = -1; n = 0; apply(poseAt(0, stepNow)); hand.visible = false; strip.redraw(); if (sref) sref.count = 0; },
      update(dt, s) {
        dt = Math.max(0, dt); sref = s; stepNow = s.step;
        const narrow = fitNarrow(stage, [lblLamp, lblBoard, lblCam]);
        reelBoards([[{ mesh: mon }, [0.2, 9.3, 0], 1.25], [strip, [0.2, 6.4, 0], 1.25], [count, [0.2, -2.0, 3.2], 1.2]]);
        lblPup.position.set(pup.position.x, SET_Y + 3.0, Z);
        // start a new nudge
        if (act < 0 && pending > 0) {
          pending--; act = 0;
          from = { x: pup.position.x, pose: poseAt(n, s.step).pose };
          n++; to = poseAt(n, s.step);
          if (to.x < from.x) from = { x: to.x, pose: to.pose };   // walked off the end: start again on the left
        }
        if (act >= 0) {
          const speed = pending > 3 ? 2.2 : 1;               // batches go quicker
          act += dt * speed;
          const k = act / TIMING.done;
          // hand: in, push, out
          const hk = act < TIMING.reach ? act / TIMING.reach : act < TIMING.push ? 1 : act < TIMING.leave ? 1 - (act - TIMING.push) / (TIMING.leave - TIMING.push) : 0;
          hand.visible = hk > 0.01;
          const hx = pup.position.x - 0.1, hy = SET_Y + 2.05;
          hand.position.set(hx - 2.5 * (1 - hk), hy + 4.5 * (1 - hk), Z - 0.55 - 1.5 * (1 - hk));
          hand.rotation.set(0.25, 0, -0.25);
          if (act >= TIMING.reach) {
            const pk = clamp((act - TIMING.reach) / (TIMING.push - TIMING.reach), 0, 1);
            pup.position.x = from.x + (to.x - from.x) * pk;
            pup.pose(lerpPose(from.pose, to.pose, pk));
          }
          if (act >= TIMING.snap && flash <= 0 && k < 1.2 && !inst._snapped) { inst._snapped = true; capture(); flash = 0.12; }
          if (act >= TIMING.done) { act = -1; inst._snapped = false; apply(to); }
        }
        flash = Math.max(0, flash - dt);
        cam.tally.material.color.setHex(flash > 0 ? 0xff3344 : 0x552222);
        // monitor
        const playing = s.play && frames.length > 1;
        if (playing) {
          playT += dt;
          const i = Math.floor(playT * s.fps) % frames.length;
          const g = pbC.getContext('2d'); g.drawImage(frames[i], 0, 0, 320, 180);
          g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 150, 320, 30); g.fillStyle = '#fff'; g.font = 'bold 15px sans-serif';
          g.fillText(`frame ${i + 1} / ${frames.length} · ${s.fps} fps`, 10, 170);
          pbT.needsUpdate = true;
          setTag(`PLAYBACK · ${(frames.length / s.fps).toFixed(1)} s of film`, '#5ce1a9');
        } else { playT = 0; view.render(hide); setTag(act >= 0 && act < TIMING.leave ? 'LIVE VIEW · hand in shot, wait…' : 'LIVE VIEW · ready to capture', '#ff3344'); }
        pb.visible = playing;
        if (bs.fps !== s.fps) { bs = { fps: s.fps }; }
        lblBoard.visible = lblBoard.visible && !narrow;
      },
      readout(s) {
        const nF = frames.length, secs = nF / s.fps;
        const mmps = s.step * s.fps, human = (mmps / 1000) * SCALE;
        const pace = human < 0.8 ? 'a slow stroll' : human <= 1.6 ? 'a normal walk' : human <= 2.5 ? 'a fast march' : 'a jumpy rush';
        const weeks = secs / OUTPUT.aardman;
        return `<div class="big">${nF} frame${nF === 1 ? '' : 's'} = ${secs.toFixed(2)} s</div>
          <div class="row"><span>Nudge per frame</span><b>${s.step} mm</b></div>
          <div class="row"><span>Speed on screen at ${s.fps} fps</span><b>${fmtInt(mmps)} mm/s</b></div>
          <div class="row"><span>As a full-size person (×${SCALE.toFixed(1)})</span><b>${human.toFixed(2)} m/s, ${pace}</b></div>
          <div class="row"><span>1 minute at ${s.fps} fps needs</span><b>${fmtInt(60 * s.fps)} frames</b></div>
          <div class="row"><span>Your film at 4.2 s a week</span><b>${weeks < 0.2 ? (weeks * 5 * 8).toFixed(1) + ' work hours' : weeks.toFixed(1) + ' weeks'}</b></div>
          ${s.play && nF < 2 ? '<div class="no">Capture at least two frames to play.</div>' : ''}`;
      },
      dispose() { view.dispose(); },
    };
    return inst;
  },
};
