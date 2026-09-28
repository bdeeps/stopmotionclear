// Chapter 3: faces and replacement animation. A big close-up of the puppet's head, a rack of eight
// replacement lower faces (one per mouth shape), and a line of dialogue: "Chai! Garam chai! Only five
// rupees!". Press "Say it" and a small formant voice (Web Audio, it respects the sound switch) speaks while
// the mouth changes in sync, frame by frame at 24 fps, on ones or on twos.
// Two ways to animate a face:
//  - Replacement: swap a whole pre-made piece each frame. Quick on set, consistent, but every shape must be
//    made in advance. LAIKA 3D-prints its faces: about 20,000 for Coraline (2009), 40,000 for ParaNorman
//    (2012), 56,000 for The Boxtrolls (2014), 64,000 for Kubo and the Two Strings (2016) and 102,000 for
//    Missing Link (2019) (TCT Magazine). Coraline's face could make about 207,000 expressions, Kubo's about
//    48 million, by mixing upper and lower halves (Inverse, 2016).
//  - Sculpting: reshape the clay mouth by hand each frame. Fully flexible, slower, and the look "boils".
// Timing: sculpting a mouth by hand is slow (minutes per frame; here an illustrative 3 minutes), a swap
// takes seconds (an illustrative 10 s). These are round, stated estimates, not studio figures.
import { THREE, M, clamp } from '../kit.js';
import {
  makePuppet, board, panelBg, title, text, COL, fitNarrow, reelBoards, MOUTHS, MOUTH_ORDER, LINE, LINE_FRAMES, mouthAt, mixMouth,
  drawMouth, speak, rrect, fmtInt, box,
} from '../stopmo.js';
import { audio } from '../ui.js';

export const LAIKA_FACES = [['Coraline', 2009, 20000], ['ParaNorman', 2012, 40000], ['The Boxtrolls', 2014, 56000], ['Kubo', 2016, 64000], ['Missing Link', 2019, 102000]];
const SWAP_S = 10, SCULPT_S = 180;

export default {
  id: 'faces',
  short: 'Faces and mouths',
  title: 'Faces and replacement animation',
  subtitle: 'Swap a mouth each frame, or sculpt it. Make a puppet talk in sync with a voice.',
  view: { pos: [1.0, 2.7, 4.6], target: [-0.2, 2.35, 0] },
  learn: `<p>To make a puppet talk, animators listen to the voice recording and write down which sound is heard on <b>which frame</b>. This is called <b>lip sync</b>. Most speech can be shown with about <b>eight mouth shapes</b>: M-B-P (lips shut), A-I, E, O, U, F-V, L, and rest.</p>
    <p>There are two ways to change the mouth. <b>Sculpting</b>: push the clay into a new shape every frame. It can make any shape, but it is slow, and each mouth is slightly different, so it shimmers. <b>Replacement animation</b>: make each mouth in advance as a separate piece, and swap it on, often held by tiny magnets. It is fast and neat on set.</p>
    <p>The studio <b>LAIKA</b> 3D-prints its replacement faces. It printed about <b>20,000 faces for Coraline</b> (2009), and over <b>100,000 for Missing Link</b> (2019). Upper and lower halves mix, so a face can make millions of expressions.</p>
    <p class="tip"><b>Try it:</b> press “Say it!” and watch the mouth swap in time with the voice. Switch to sculpting, and compare the time it takes. Or click a mouth on the rack to put it on.</p>`,
  terms: [
    { t: 'Lip sync', d: 'Matching mouth shapes to the sounds of the voice, frame by frame.' },
    { t: 'Replacement animation', d: 'Swapping pre-made pieces (like mouths or faces) between frames.' },
    { t: 'Mouth chart', d: 'A set of standard mouth shapes that covers the sounds of speech.' },
    { t: 'Phoneme', d: 'One sound of speech, like "m" or "ee".' },
    { t: 'Exposure sheet', d: 'A chart listing, for each frame, the sound and mouth to use.' },
    { t: 'Formant', d: 'A band of loud frequencies that gives each vowel its sound.' },
  ],
  defaults: { method: 'replace', mouth: 'rest', twos: true, talking: false },
  controls: [
    { key: 'say', type: 'buttons', label: 'Dialogue', items: [{ label: '▶ Say it!', act: (s, i) => i.say?.() }, { label: '■ Stop', act: (s, i) => i.hush?.() }] },
    { key: 'method', type: 'seg', label: 'How the mouth changes', options: [{ v: 'replace', label: 'Replace (swap)' }, { v: 'sculpt', label: 'Sculpt the clay' }] },
    { key: 'twos', type: 'toggle', label: 'Animate on twos (12 mouths a second)' },
    { key: 'mouth', type: 'seg', label: 'Put on a mouth', options: MOUTH_ORDER.map((v) => ({ v, label: MOUTHS[v].label })) },
  ],
  quiz: [
    { q: 'What is replacement animation?', options: ['Replacing the animator', 'Swapping pre-made pieces, like mouths, between frames', 'Re-shooting a scene', 'Replacing clay with paint'], answer: 1, why: 'Each shape is made in advance, and the right one is swapped onto the puppet for each frame.' },
    { q: 'About how many mouth shapes cover most speech in animation?', options: ['2', 'About 8', 'About 80', 'One per word'], answer: 1, why: 'A standard mouth chart has around eight shapes, like M-B-P, A-I, E, O, U, F-V, L and rest.' },
    { q: 'Which shape do you see for the sounds "m", "b" and "p"?', options: ['Wide open', 'Lips pressed together', 'Round pucker', 'Teeth on the lower lip'], answer: 1, why: 'M, B and P are all made by pressing the lips together, so they share one mouth.' },
  ],
  reel: [
    { ms: 5200, caption: 'To make a puppet talk, animators swap in a new mouth shape for each sound.', set: { method: 'replace', twos: true, mouth: 'rest' }, act: (s, i) => i.say?.(true), spin: 0, view: { pos: [0.5, 2.5, 3.0], target: [0.1, 2.3, 0] } },
    { ms: 4800, caption: 'LAIKA 3D-printed about 20,000 faces for Coraline, and over 100,000 for Missing Link.', set: { method: 'replace' }, act: (s, i) => i.say?.(true), spin: 0.25, view: { pos: [1.2, 2.6, 4.4], target: [0.2, 2.4, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const pup = makePuppet(); root.add(pup);
    pup.pose({ shR: 0.35, elR: 0.9, shL: 0.1, elL: 0.3, neck: 0.15, nod: -0.02 });
    pup.rotation.y = -Math.PI / 2;   // face the camera (+z)
    // no set here: a close-up of the puppet standing on the studio floor, head 22.5 cm up

    // the rack of replacement mouths, each on a little face shell sitting on a pin
    const rack = new THREE.Group(); rack.position.set(-1.25, 1.35, 0.2); rack.rotation.y = 0.35; root.add(rack);
    const shelf = box(1.9, 0.06, 0.4, M.matte(0x6b4a2e)); rack.add(shelf);
    const back = box(1.9, 0.9, 0.04, M.matte(0x3a2a1c)); back.position.set(0, 0.45, -0.2); rack.add(back);
    const mouths = MOUTH_ORDER.map((id, i) => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 96;
      const g = c.getContext('2d'); g.fillStyle = '#b9794d'; rrect(g, 0, 0, 128, 96, 30); g.fill();
      drawMouth(g, 64, 50, 26, 30, MOUTHS[id]);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 10, Math.PI - 0.8, 1.6, 1.2, 0.9), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }));
      m.rotation.y = -Math.PI / 2; m.scale.set(0.95, 0.7, 0.8);
      m.position.set(-0.8 + (i % 4) * 0.53, 0.2 + (i < 4 ? 0.42 : 0), 0.05); m.userData.id = id;
      rack.add(m);
      return m;
    });
    const hi = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 32), M.glow(0xffd166)); rack.add(hi);
    stage.pickables = mouths;
    const lblRack = stage.label('Replacement mouths', [-1.25, 2.35, 0.2], root);
    const lblFace = stage.label('Lower face swaps on', [0.45, 2.0, 0.4], root);

    // exposure sheet board: the line, frame by frame
    let st = { f: -1, method: 'replace', twos: true };
    const sheet = board(root, 2.4, 1.2, 720, 360, (g, w, h) => {
      panelBg(g, w, h);
      title(g, 'Exposure sheet', `“${LINE.text}” · ${LINE_FRAMES} frames at 24 fps`);
      const x0 = 20, x1 = w - 20, y0 = 96, bh = 70, sc = (x1 - x0) / LINE_FRAMES;
      let acc = 0;
      LINE.track.forEach(([id, n], i) => {
        const x = x0 + acc * sc, ww = n * sc, on = st.f >= acc && st.f < acc + n;
        g.fillStyle = on ? COL.hot : id === 'rest' ? 'rgba(255,255,255,.08)' : 'rgba(142,197,255,.28)';
        g.fillRect(x + 1, y0, ww - 2, bh);
        if (ww > 22) text(g, MOUTHS[id].label.split(' ')[0], x + ww / 2, y0 + 44, { font: 'bold 15px sans-serif', col: on ? '#111' : '#fff', align: 'center' });
        acc += n;
      });
      if (st.f >= 0) { const x = x0 + st.f * sc; g.fillStyle = '#ff3344'; g.fillRect(x - 1.5, y0 - 12, 3, bh + 24); }
      for (let f = 0; f <= LINE_FRAMES; f += 24) { const x = x0 + f * sc; g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x, y0 + bh + 6, 2, 10); text(g, `${f / 24}s`, x + 4, y0 + bh + 26, { font: '14px sans-serif', col: COL.soft }); }
      const poses = st.twos ? Math.ceil(LINE_FRAMES / 2) : LINE_FRAMES;
      const secs = poses * (st.method === 'replace' ? SWAP_S : SCULPT_S);
      text(g, `${poses} mouth changes · ${st.method === 'replace' ? 'swapping' : 'sculpting'} ≈ ${secs >= 3600 ? (secs / 3600).toFixed(1) + ' hours' : Math.round(secs / 60) + ' minutes'} of face work`, 20, h - 50, { font: 'bold 19px sans-serif', col: st.method === 'replace' ? COL.good : COL.clay });
      text(g, `illustrative: ${SWAP_S} s per swap, ${SCULPT_S / 60} min per sculpt`, 20, h - 22, { font: '14px sans-serif', col: COL.soft });
    }, [1.0, 3.35, -0.8]);
    sheet.mesh.rotation.y = -0.15;

    // LAIKA faces board
    const faces = board(root, 1.7, 1.25, 510, 375, (g, w, h) => {
      panelBg(g, w, h);
      title(g, 'Faces 3D-printed by LAIKA', 'per feature film (TCT Magazine)');
      const max = 110000, x0 = 150, x1 = w - 70;
      LAIKA_FACES.forEach(([name, yr, n], i) => {
        const y = 100 + i * 52;
        text(g, name, 20, y + 18, { font: '17px sans-serif' });
        text(g, String(yr), 20, y + 38, { font: '13px sans-serif', col: COL.soft });
        g.fillStyle = COL.violet; g.fillRect(x0, y + 2, ((x1 - x0) * n) / max, 24);
        text(g, fmtInt(n), x0 + ((x1 - x0) * n) / max + 8, y + 21, { font: 'bold 16px sans-serif', col: '#fff' });
      });
    }, [1.45, 1.45, 0.1]);
    faces.mesh.rotation.y = -0.35;

    let talkT = -1, voice = null, sref = null, sculptK = 1, prevShape = MOUTHS.rest, curShape = MOUTHS.rest, lastId = 'rest';
    const inst = {
      say(silent = false) {
        voice?.stop(); talkT = 0; if (sref) sref.talking = true;
        voice = silent ? null : speak(LINE.track, 24);
      },
      hush() { voice?.stop(); voice = null; talkT = -1; if (sref) sref.talking = false; },
      pick(o) { const id = o.userData.id; if (!id) return; inst.hush(); const b = [...document.querySelectorAll('#panel .seg button')].find((x) => x.dataset.v === id); b?.click(); },
      update(dt, s) {
        dt = Math.max(0, dt); sref = s;
        fitNarrow(stage, [lblRack, lblFace]);
        reelBoards([[sheet, [0, 3.45, -0.6], 0.8], [faces, [0, 0.55, 0.4], 0.8]]);
        let id = s.mouth, f = -1;
        if (talkT >= 0) {
          talkT += dt;
          f = Math.floor(talkT * 24);
          if (s.twos) f -= f % 2;
          if (f >= LINE_FRAMES) { talkT = -1; s.talking = false; f = -1; voice = null; }
          else id = mouthAt(f).id;
          if (voice && audio.muted) { voice.stop(); voice = null; }
        }
        // swap: snap to the new shape. sculpt: the clay is pushed part-way towards it each pose, so it lags
        if (id !== lastId) { prevShape = s.method === 'sculpt' ? mixMouth(prevShape, curShape, sculptK) : MOUTHS[id]; lastId = id; sculptK = 0; curShape = MOUTHS[id]; }
        if (s.method === 'sculpt') sculptK = Math.min(1, sculptK + dt * (s.twos ? 6 : 12)); else sculptK = 1;
        const shape = s.method === 'sculpt' ? mixMouth(prevShape, curShape, Math.round(sculptK * 3) / 3) : curShape;
        pup.setMouth(shape);
        // a small head bob while talking
        pup.parts.neck.rotation.z = talkT >= 0 ? -0.02 + 0.04 * Math.sin(talkT * 7) : -0.02;
        pup.parts.brows.forEach((b) => { b.position.y = 0.145 + (id === 'ai' || id === 'o' ? 0.015 : 0); });
        const i = MOUTH_ORDER.indexOf(id), m = mouths[i];
        hi.visible = s.method === 'replace';
        hi.position.copy(m.position).add(new THREE.Vector3(0, 0, 0.2));
        m.visible = !(s.method === 'replace' && talkT >= 0);
        mouths.forEach((x, k) => { if (k !== i) x.visible = true; });
        const key = `${f}|${s.method}|${s.twos}`;
        if (key !== `${st.f}|${st.method}|${st.twos}`) { st = { f, method: s.method, twos: s.twos }; sheet.redraw(); }
      },
      readout(s) {
        const talking = talkT >= 0;
        const f = talking ? Math.floor(talkT * 24) : -1;
        const id = talking ? mouthAt(s.twos ? f - (f % 2) : f).id : s.mouth;
        const M_ = MOUTHS[id];
        return `<div class="big">Mouth: ${M_.label}</div>
          <small>${M_.say}${M_.f[0] && id !== 'mbp' ? ` · voice formants F1 ${M_.f[0]} Hz, F2 ${fmtInt(M_.f[1])} Hz` : ''}</small>
          <div class="row"><span>Frame</span><b>${talking ? `${f + 1} of ${LINE_FRAMES} (${(f / 24).toFixed(2)} s)` : 'not talking'}</b></div>
          <div class="row"><span>Mouth changes for this line</span><b>${s.twos ? Math.ceil(LINE_FRAMES / 2) : LINE_FRAMES} (${s.twos ? 'on twos' : 'on ones'})</b></div>
          <div class="row"><span>Method</span><b>${s.method === 'replace' ? 'Swap a printed mouth' : 'Re-sculpt the clay'}</b></div>
          ${s.method === 'sculpt' ? '<div class="no">Sculpted mouths lag and never match exactly, so they shimmer.</div>' : '<div class="ok">Swapped mouths match perfectly every time.</div>'}`;
      },
      dispose() { voice?.stop(); },
    };
    return inst;
  },
};
