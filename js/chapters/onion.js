// Chapter 4: onion skin and frame grab. A clay ball bounces across the set, one frame at a time. The frame-
// grab monitor shows the live view with the previous frames ghosted over it (onion skin), so the animator
// can check the spacing. A second demo shows flicker: light or exposure changing between frames.
// Physics of the bounce (1 unit = 10 cm): a 2.5 cm clay-coated rubber ball dropped from 20 cm, g = 9.81 m/s².
//   fall time t = √(2h/g) = 0.202 s, about 4.8 frames at 24 fps. Coefficient of restitution e = 0.7
//   (a lively ball; each bounce reaches e² = 49 % of the height before). It drifts sideways at 35 cm/s.
// "Even" spacing keeps the same key poses (the tops and the ground contacts) but moves the ball the same
// distance every frame in between, as a beginner might. Real falls speed up, so real spacing widens near
// the ground and closes up near the top (slow in and slow out; the 12 principles are covered in Anim2DClear).
// Flicker model (per captured frame, 12 poses a second):
//   - Daylight through a window drifts as clouds pass: here ±30 % on the window's share of the light
//     (illustrative), plus the animator's own shadow now and then.
//   - Auto exposure re-meters every frame and over-corrects by a few percent (illustrative ±2 %).
//   - An unlocked tripod gets bumped: up to ±0.08° per frame. On a 1920-pixel-wide frame with a 41° wide
//     view, 0.08° is 0.08 / 41.4 × 1920 ≈ 3.7 pixels of jump.
//   - People notice frame-to-frame brightness changes of roughly 1 to 2 % on large even areas (Weber
//     fraction for luminance, about 1–2 %); we flag changes over 2 %.
import { THREE, M, clamp } from '../kit.js';
import {
  makeSet, makePuppet, makeLamp, makeStillsCamera, makeCameraView, makeScreen, board, panelBg, title, text, COL, fitNarrow, reelBoards,
  SET_Y, sphere, box, hash01, fmtInt,
} from '../stopmo.js';

const FPS = 24, NF = 24, H0 = 0.2, G = 9.81, E = 0.7, VX = 0.35, R = 0.025, X_START = -0.2;   // metres
// Physics: height (m) of the ball's bottom above the floor at time t, and whether it is touching.
function bounceY(t) {
  let v0 = 0, h = H0, t0 = 0, first = true;
  for (let k = 0; k < 12; k++) {
    // first segment: fall from rest at H0; later: launch up at v0 from the ground
    const dur = first ? Math.sqrt((2 * H0) / G) : (2 * v0) / G;
    if (t <= t0 + dur) { const u = t - t0; return first ? H0 - 0.5 * G * u * u : v0 * u - 0.5 * G * u * u; }
    const vImpact = first ? Math.sqrt(2 * G * H0) : v0;
    v0 = E * vImpact; t0 += dur; first = false; h = (v0 * v0) / (2 * G);
  }
  return 0;
}
// Key times: contacts and apexes of the bounce inside the 1-second shot.
function keyTimes() {
  const out = [0]; let t = Math.sqrt((2 * H0) / G), v = Math.sqrt(2 * G * H0);
  while (t < 1.2 && out.length < 30) { out.push(t); v *= E; out.push(t + v / G); t += (2 * v) / G; }
  return out;
}
const PHYS = [], EVEN = [];
{
  for (let f = 0; f < NF; f++) PHYS.push(Math.max(0, bounceY(f / FPS)));
  const keys = [...new Set(keyTimes().map((t) => Math.round(t * FPS)).filter((f) => f < NF))].sort((a, b) => a - b);
  if (keys[keys.length - 1] !== NF - 1) keys.push(NF - 1);
  for (let f = 0; f < NF; f++) {
    let i = 0; while (i < keys.length - 1 && keys[i + 1] < f) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)], k = b === a ? 0 : (f - a) / (b - a);
    EVEN.push(PHYS[a] + (PHYS[b] - PHYS[a]) * k);
  }
}
export const FALL_FRAMES = Math.sqrt((2 * H0) / G) * FPS;
const flick = (n, s) => {
  // returns { light, exposure, jitter[2] } for captured frame n
  const cloud = 0.65 * Math.sin(n * 0.41) + 0.7 * (hash01(n) - 0.5);
  const shadow = hash01(n * 7.3) > 0.82 ? -0.12 : 0;
  const win = s.daylight ? 0.4 * (1 + 0.3 * cloud + shadow) : 0;
  const lamps = s.daylight ? 0.6 : 1;
  return { win, lamps, B: win + lamps, jitter: s.locked ? [0, 0] : [(hash01(n * 3.1) - 0.5) * 0.16, (hash01(n * 5.7) - 0.5) * 0.16] };
};

export default {
  id: 'onion',
  short: 'Onion skin',
  title: 'Onion skin, spacing and flicker',
  subtitle: 'See the last frames ghosted on the live view, space a bounce, and stop the flicker.',
  view: { pos: [3.6, 8.4, 17.5], target: [2.0, 3.7, 0] },
  learn: `<p>Stop-motion animators shoot through <b>frame-grab</b> software on a computer (Dragonframe is a popular one). It shows the camera's <b>live view</b> with the last few frames laid over it, faded, like thin layers of onion skin. This <b>onion skin</b> lets you see exactly how far you moved the puppet since the last frame.</p>
    <p>That distance is the <b>spacing</b>, and it is where the life comes from. A falling ball <b>speeds up</b>, so its spacing gets wider near the floor and closer at the top. Move it the same amount every frame and it looks mechanical. (Spacing and ease are two of the 12 principles of animation, see <b>Anim2DClear</b>.)</p>
    <p>A photo is taken minutes apart from the next one, so anything that changes in between shows up as a jump. Daylight drifting through a window, a camera that gets bumped, or a camera that re-sets its exposure each shot all make the picture <b>flicker</b>. The fix: black out the windows, use steady <b>lamps</b> (see <b>LightingClear</b>), set the camera to <b>manual</b>, and <b>lock off</b> the tripod.</p>
    <p class="tip"><b>Try it:</b> scrub through the bounce and watch the ghosts on the monitor. Switch to even spacing and play it. Then switch to the flicker demo, and turn the problems on and off.</p>`,
  terms: [
    { t: 'Onion skin', d: 'Faded copies of earlier frames shown over the live view.' },
    { t: 'Spacing', d: 'How far something moves from one frame to the next.' },
    { t: 'Ease in / ease out', d: 'Closer spacing near the start or end of a move, so it speeds up and slows down.' },
    { t: 'Frame grab', d: 'Software that captures frames from the camera and shows onion skin and playback.' },
    { t: 'Flicker', d: 'A brightness jump between frames, from changing light or exposure.' },
    { t: 'Locked off', d: 'A camera fixed firmly so it cannot move between frames.' },
  ],
  defaults: { demo: 'bounce', spacing: 'ease', f: 6, play: false, onion: 0.45, layers: 3, daylight: true, locked: false, autoexp: true },
  controls: [
    { key: 'demo', type: 'seg', label: 'Demo', options: [{ v: 'bounce', label: 'Bouncing ball' }, { v: 'flicker', label: 'Flicker problem' }] },
    { key: 'f', type: 'range', label: 'Frame (bounce)', min: 0, max: NF - 1, step: 1, fmt: (v) => `${Math.round(v) + 1} of ${NF}` },
    { key: 'play', type: 'toggle', label: 'Play the bounce (24 fps)' },
    { key: 'spacing', type: 'seg', label: 'Spacing', options: [{ v: 'ease', label: 'Real (gravity)' }, { v: 'even', label: 'Even' }] },
    { key: 'onion', type: 'range', label: 'Onion skin opacity', min: 0, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)} %` },
    { key: 'layers', type: 'seg', label: 'Onion skin frames', options: [1, 2, 3, 4].map((v) => ({ v, label: String(v) })) },
    { key: 'daylight', type: 'toggle', label: 'Flicker: daylight from a window' },
    { key: 'autoexp', type: 'toggle', label: 'Flicker: camera on auto exposure' },
    { key: 'locked', type: 'toggle', label: 'Flicker: tripod locked off' },
    { key: 'fix', type: 'buttons', label: 'Fix the flicker', items: [{ label: 'Blackout + lamps + manual + lock', act: (s) => { s.demo = 'flicker'; s.daylight = false; s.autoexp = false; s.locked = true; } }] },
  ],
  quiz: [
    { q: 'What does onion skinning show you?', options: ['The finished film', 'Earlier frames faded over the live view', 'The puppet’s armature', 'A colour grade'], answer: 1, why: 'It overlays the last frames, so you can see how far you have moved things since then.' },
    { q: 'A ball is falling. Where should its spacing be widest?', options: ['At the top', 'Near the floor, where it is fastest', 'The same everywhere', 'It should not move'], answer: 1, why: 'Gravity speeds it up, so it moves further each frame as it nears the floor.' },
    { q: 'Which of these causes flicker in stop-motion?', options: ['A locked-off tripod', 'Daylight changing between frames', 'Steady lamps', 'Manual exposure'], answer: 1, why: 'Frames are shot minutes apart, so changing daylight makes each frame a slightly different brightness.' },
  ],
  reel: [
    { ms: 5200, caption: 'Onion skin ghosts the last frames over the live view, so you can check the spacing.', set: { demo: 'bounce', spacing: 'ease', onion: 0.55, layers: 3, play: false }, anim: { f: [0, 12] }, spin: 0, view: { pos: [2.2, 6.4, 13.0], target: [1.6, 3.0, 0] } },
    { ms: 5000, caption: 'Daylight, auto exposure and a bumped tripod make frames flicker. Lamps and a locked camera fix it.', set: { demo: 'flicker', daylight: true, autoexp: true, locked: false }, anim: { daylight: [true, false], autoexp: [true, false], locked: [false, true] }, spin: 0, view: { pos: [2.2, 6.4, 13.0], target: [1.6, 3.0, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const set = makeSet({ w: 10, d: 5.2 }); root.add(set);
    const U = 10;   // metres to units
    const ball = sphere(R * U, M.matte(0xe0503a, { roughness: 0.8 }), 32); root.add(ball);
    const ghosts = new THREE.Group(); root.add(ghosts); ghosts.visible = false;
    const gh = [0, 1, 2, 3].map(() => { const m = sphere(R * U, M.ghost(0xe0503a, 0.4), 24); ghosts.add(m); return m; });
    const pup = makePuppet(); pup.position.set(-2.8, SET_Y, -0.4); pup.rotation.y = -0.5; root.add(pup);
    pup.pose({ shR: 1.2, elR: 0.6, shL: -0.1, neck: 0.4 });
    // window on the left for the flicker demo: a frame with glowing panes and a daylight spot
    const win = new THREE.Group(); win.position.set(-6.2, 4.2, -0.5); win.rotation.y = Math.PI / 2; root.add(win);
    const wf = box(2.4, 2.4, 0.12, M.matte(0xe8e2d4)); win.add(wf);
    const panes = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), M.glow(0xcfe8ff)); panes.position.z = 0.07; win.add(panes);
    const mull = box(0.1, 2.2, 0.16, M.matte(0xe8e2d4)); win.add(mull); const mull2 = box(2.2, 0.1, 0.16, M.matte(0xe8e2d4)); win.add(mull2);
    const blind = box(2.5, 2.5, 0.08, M.matte(0x111216)); blind.position.z = 0.16; win.add(blind);
    const sun = new THREE.SpotLight(0xdfeeff, 0, 40, 0.6, 0.6, 2); sun.position.set(-6.0, 4.2, -0.5); sun.target.position.set(0, SET_Y, 0); sun.castShadow = true; root.add(sun, sun.target);
    const lamp = makeLamp(4.2); lamp.position.set(5.0, 0, 3.6); lamp.aim(0, SET_Y + 1, 0); root.add(lamp);
    const lampL = new THREE.SpotLight(0xfff1d6, 0, 40, 0.7, 0.5, 2); lampL.position.set(5.0, 4.2, 3.6); lampL.target.position.set(0, SET_Y + 0.5, 0); root.add(lampL, lampL.target);

    // camera and the frame-grab monitor
    const camPos = [0.1, SET_Y + 1.35, 9.6], camTgt = [0.3, SET_Y + 1.0, 0];
    const cam = makeStillsCamera(); root.add(cam); cam.place(camPos, camTgt);
    const view = makeCameraView(stage, { w: 400, h: 225, fov: 24 });
    const baseCam = { p: new THREE.Vector3(...camPos).add(new THREE.Vector3(0, 0, -1.3)), t: new THREE.Vector3(...camTgt) };
    const SW = 5.0, SH = SW * 9 / 16;
    const mon = makeScreen(SW, SH, view.rt.texture); mon.position.set(7.4, 6.5, -1.0); mon.rotation.y = -0.4; root.add(mon);
    const hudC = document.createElement('canvas'); hudC.width = 640; hudC.height = 360;
    const hudT = new THREE.CanvasTexture(hudC); hudT.colorSpace = THREE.SRGBColorSpace;
    const hud = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: hudT, transparent: true, toneMapped: false })); hud.position.z = 0.01; mon.add(hud);

    // spacing chart / brightness chart board
    let bs = {};
    const bd = board(root, 5.0, 2.3, 760, 350, (g, w, h) => {
      panelBg(g, w, h);
      if (bs.demo === 'flicker') {
        title(g, 'Brightness of each frame', 'change from the frame before; over 2 % shows as flicker');
        const x0 = 30, x1 = w - 20, y0 = 90, y1 = h - 40, mid = (y0 + y1) / 2;
        g.fillStyle = 'rgba(123,224,140,.14)'; const band = ((y1 - y0) / 2) * (2 / 12); g.fillRect(x0, mid - band, x1 - x0, band * 2);
        g.strokeStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(x0, mid); g.lineTo(x1, mid); g.stroke();
        (bs.hist || []).forEach((d, i, a) => {
          const bw = (x1 - x0) / 24, x = x0 + i * bw, v = clamp(d, -12, 12), hh = ((y1 - y0) / 2) * (v / 12);
          g.fillStyle = Math.abs(d) > 2 ? COL.bad : COL.good; g.fillRect(x + 2, mid - Math.max(0, hh), bw - 4, Math.abs(hh) || 1);
        });
        text(g, '+12 %', x0 - 4, y0 + 6, { font: '13px sans-serif', col: COL.soft }); text(g, '−12 %', x0 - 4, y1 + 16, { font: '13px sans-serif', col: COL.soft });
      } else {
        title(g, 'Spacing chart: height of the ball each frame', bs.spacing === 'ease' ? 'real: gravity speeds it up near the floor' : 'even: the same step every frame, like a robot');
        const x0 = 40, x1 = w - 20, y0 = 84, y1 = h - 36, arr = bs.spacing === 'ease' ? PHYS : EVEN;
        const X = (f) => x0 + (f / (NF - 1)) * (x1 - x0), Y = (m) => y1 - (m / H0) * (y1 - y0);
        g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x0, y1, x1 - x0, 2);
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.5; g.beginPath(); PHYS.forEach((m, f) => (f ? g.lineTo(X(f), Y(m)) : g.moveTo(X(f), Y(m)))); g.stroke();
        arr.forEach((m, f) => {
          const on = f === bs.f, near = f < bs.f && f >= bs.f - bs.layers;
          g.fillStyle = on ? COL.hot : near ? 'rgba(255,154,92,.8)' : 'rgba(142,197,255,.75)';
          g.beginPath(); g.arc(X(f), Y(m), on ? 9 : 6, 0, 7); g.fill();
        });
        text(g, '20 cm', x0 - 6, y0 + 6, { font: '13px sans-serif', col: COL.soft, align: 'right' });
        text(g, 'frame 1', x0, h - 12, { font: '13px sans-serif', col: COL.soft }); text(g, `frame ${NF}`, x1, h - 12, { font: '13px sans-serif', col: COL.soft, align: 'right' });
      }
    }, [7.4, 3.0, -0.3]);
    bd.mesh.rotation.y = -0.4;
    const lblCam = stage.label('Camera on a tripod', [camPos[0], camPos[1] + 1.0, camPos[2]], root);
    const lblWin = stage.label('Window: daylight', [-6.1, 5.9, -0.5], root);
    lblWin.userData.flicker = true;
    const lblBall = stage.label('Clay ball', [0, 0, 0], root);

    let playT = 0, frameN = 0, fT = 0, prevR = 1, hist = [], fl = { win: 0, lamps: 1, B: 1, jitter: [0, 0] }, expo = 1, lastD = 0;
    const heightAt = (f, sp) => (sp === 'ease' ? PHYS : EVEN)[clamp(Math.round(f), 0, NF - 1)];
    const place = (obj, f, sp) => {
      const y = heightAt(f, sp) * U, x = (X_START + VX * (f / FPS)) * U;
      obj.position.set(x, SET_Y + R * U + y, 0.2);
      if (obj === ball || obj.isMesh) {
        const contact = y < 0.02 && sp === 'ease' && f > 0;
        const v = Math.abs(heightAt(f, sp) - heightAt(Math.max(0, f - 1), sp)) * FPS;
        const st = sp === 'ease' ? clamp(1 + v * 0.12, 1, 1.25) : 1;
        if (contact) { obj.scale.set(1.25, 0.72, 1.25); obj.position.y -= R * U * 0.28; } else obj.scale.set(1 / Math.sqrt(st), st, 1 / Math.sqrt(st));
      }
    };
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        fitNarrow(stage, [lblCam, lblWin, lblBall]);
        reelBoards([[{ mesh: mon }, [1.4, 8.4, 0], 1.25], [bd, [1.4, -1.6, 2.6], 1.1]]);
        const bounce = s.demo === 'bounce';
        ball.visible = bounce; pup.visible = !bounce; lblBall.visible = lblBall.visible && bounce; lblWin.visible = lblWin.visible && !bounce;
        // bounce
        if (s.play && bounce) { playT += dt; s.f = Math.floor(playT * FPS) % NF; } else playT = s.f / FPS;
        place(ball, s.f, s.spacing);
        lblBall.position.set(ball.position.x, ball.position.y + 0.6, 0.2);
        gh.forEach((m, j) => {
          const f = Math.round(s.f) - (j + 1);
          m.visible = bounce && j < s.layers && f >= 0 && s.onion > 0.01;
          if (m.visible) { place(m, f, s.spacing); m.material.opacity = s.onion * (1 - j / (s.layers + 1)) * 0.9; }
        });
        // flicker: advance one captured frame every 1/12 s
        if (!bounce) {
          fT += dt;
          if (fT >= 1 / 12) {
            fT = 0; frameN++;
            fl = flick(frameN, s);
            // auto exposure meters the frame and aims for the same brightness, but hunts a little
            expo = s.autoexp ? (1 / fl.B) * (1 + 0.04 * (hash01(frameN * 9.1) - 0.5)) : 1;
            const Rn = fl.B * expo;
            lastD = ((Rn - prevR) / prevR) * 100; prevR = Rn;
            hist.push(lastD); if (hist.length > 24) hist.shift();
            bd.redraw();
          }
        }
        blind.visible = bounce || !s.daylight; panes.material.color.setHex(bounce || !s.daylight ? 0x222222 : 0xcfe8ff);
        sun.intensity = bounce ? 0 : fl.win * 220;
        lampL.intensity = bounce ? 0 : fl.lamps * 140;
        lamp.face.material.color.setHex(bounce ? 0x777777 : 0xfff1d6);
        // camera view (jitter when not locked off), then the onion ghosts appear only on the monitor
        view.cam.position.copy(baseCam.p); view.cam.lookAt(baseCam.t);
        if (!bounce) { view.cam.rotateY(fl.jitter[0] * Math.PI / 180); view.cam.rotateX(fl.jitter[1] * Math.PI / 180); }
        ghosts.visible = bounce;
        view.render([mon, bd.mesh]);
        ghosts.visible = false;
        mon.screen.material.color.setScalar(bounce ? 1 : clamp(expo * fl.B, 0.4, 1.6));
        // monitor overlay
        const g = hudC.getContext('2d'); g.clearRect(0, 0, 640, 360);
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, 640, 36);
        g.fillStyle = '#ff3344'; g.beginPath(); g.arc(18, 18, 7, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.font = 'bold 19px sans-serif';
        g.fillText(bounce ? `LIVE + ONION SKIN · frame ${Math.round(s.f) + 1} · ${s.layers} ghost${s.layers > 1 ? 's' : ''} at ${Math.round(s.onion * 100)} %` : `PLAYBACK · frame ${frameN} · ${lastD >= 0 ? '+' : '−'}${Math.abs(lastD).toFixed(1)} % brightness`, 34, 25);
        if (!bounce && Math.abs(lastD) > 2) { g.fillStyle = 'rgba(255,90,138,.9)'; g.fillRect(0, 320, 640, 40); g.fillStyle = '#fff'; g.fillText('FLICKER: this frame jumps in brightness', 14, 347); }
        hudT.needsUpdate = true;
        const key = `${s.demo}|${s.spacing}|${Math.round(s.f)}|${s.layers}`;
        if (bs.key !== key) { bs = { key, demo: s.demo, spacing: s.spacing, f: Math.round(s.f), layers: s.layers, hist }; bd.redraw(); }
        bs.hist = hist;
      },
      readout(s) {
        if (s.demo === 'flicker') {
          const jpx = Math.hypot(...fl.jitter) / 41.4 * 1920;
          const ok = !s.daylight && !s.autoexp && s.locked;
          return `<div class="big">Flicker check</div>
            <div class="row"><span>Brightness change, last frame</span><b>${lastD >= 0 ? '+' : '−'}${Math.abs(lastD).toFixed(1)} %</b></div>
            <div class="row"><span>Camera jump, last frame</span><b>${jpx.toFixed(1)} px of 1,920</b></div>
            <div class="row"><span>Daylight share of the light</span><b>${s.daylight ? Math.round((fl.win / fl.B) * 100) + ' %' : 'blacked out'}</b></div>
            <div class="row"><span>Exposure</span><b>${s.autoexp ? 'auto, re-metered every frame' : 'manual, fixed'}</b></div>
            ${ok ? '<div class="ok">Steady light, fixed exposure, locked camera: no flicker.</div>' : '<div class="no">Frames shot minutes apart differ: the film will flicker or jitter.</div>'}`;
        }
        const arr = s.spacing === 'ease' ? PHYS : EVEN, f = Math.round(s.f);
        const hcm = arr[f] * 100, dmm = f ? Math.hypot(arr[f] - arr[f - 1], VX / FPS) * 1000 : 0;
        return `<div class="big">Frame ${f + 1}: ball ${hcm.toFixed(1)} cm up</div>
          <div class="row"><span>Moved since the last frame</span><b>${dmm.toFixed(1)} mm</b></div>
          <div class="row"><span>Speed on screen</span><b>${fmtInt((dmm / 1000) * FPS * 100)} cm/s</b></div>
          <div class="row"><span>First fall, 20 cm (√(2h/g))</span><b>${(FALL_FRAMES / FPS).toFixed(3)} s = ${FALL_FRAMES.toFixed(1)} frames</b></div>
          <div class="row"><span>Each bounce height (e = ${E})</span><b>${Math.round(E * E * 100)} % of the one before</b></div>
          ${s.spacing === 'ease' ? '<div class="ok">Real spacing: wide near the floor, tight at the top.</div>' : '<div class="no">Even spacing: same key poses, but it moves like a machine.</div>'}`;
      },
      dispose() { view.dispose(); },
    };
  },
};
