// Builds the self-contained Silicofeller pitch deck (one HTML file, images inlined).
import fs from 'node:fs';
import path from 'node:path';

const [srcFile, imgDir, outFile] = process.argv.slice(2);
let src = fs.readFileSync(srcFile, 'utf8');

const sv = (b) => `<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${b}</svg></span>`;
const ICONS = {
  warn: sv('<path d="M12 3 22 20H2Z"/><path d="M12 9v5"/><path d="M12 17h.01"/>'),
  sparkles: sv('<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  layers: sv('<path d="M12 3 2 8l10 5 10-5z"/><path d="m2 13 10 5 10-5"/>'),
  route: sv('<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/>'),
  activity: sv('<path d="M3 12h4l3-8 4 16 3-8h4"/>'),
  shield: sv('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'),
  lock: sv('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  cloud: sv('<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9a4 4 0 0 1 0 9z"/>'),
  chip: sv('<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>'),
  plug: sv('<path d="M9 2v6M15 2v6"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>'),
  arrow: sv('<path d="M5 12h14M13 6l6 6-6 6"/>'),
};
src = src.replace(/\{\{icon:([a-z]+)\}\}/g, (_, n) => {
  if (!ICONS[n]) throw new Error('missing icon ' + n);
  return ICONS[n];
});
const cache = {};
src = src.replace(/\{\{img:([a-z0-9-]+)\}\}/g, (_, n) => {
  if (!cache[n]) {
    const file = ['jpg', 'png'].map((e) => path.join(imgDir, `${n}.${e}`)).find((f) => fs.existsSync(f));
    if (!file) throw new Error('missing image ' + n);
    const mime = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
    cache[n] = `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
  }
  return cache[n];
});
if (/\{\{/.test(src)) throw new Error('unreplaced placeholder');

const style = src.slice(0, src.indexOf('</style>') + 8);
const slides = src.slice(src.indexOf('</style>') + 8);

const player = `
<style>
* { margin: 0; box-sizing: border-box; }
html, body { height: 100%; }
body { background: #000; overflow: hidden; }
.viewport { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
.deck { position: relative; width: 1920px; height: 1080px; flex: none; }
.deck > section { display: none !important; }
.deck > section.active { display: flex !important; }
.deck aside { display: none; }
.hud { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); display: flex; gap: 10px; align-items: center; font: 500 14px Inter, Arial, sans-serif; color: #C9CED6; background: rgba(10,14,24,.82); padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(148,163,184,.2); opacity: 0; transition: opacity .3s; user-select: none; z-index: 10; }
body:hover .hud { opacity: 1; }
.hud button { font: inherit; color: inherit; background: none; border: 1px solid #39414E; border-radius: 999px; padding: 4px 12px; cursor: pointer; }
.hud button:hover { background: #1C2330; }
.notes { position: fixed; right: 16px; top: 16px; width: min(480px, 42vw); max-height: 72vh; overflow: auto; font: 16px/1.55 Inter, Arial, sans-serif; color: #E6E9EE; background: rgba(10,14,24,.94); border: 1px solid #2A3242; border-radius: 14px; padding: 18px 20px; display: none; z-index: 10; }
.notes.show { display: block; }
.notes b { display: block; margin-bottom: 6px; color: #7DA8FF; font-size: 12px; letter-spacing: 1.5px; }
@media print {
  @page { size: 1920px 1080px; margin: 0; }
  html, body { height: auto; overflow: visible; background: #FAF8F3; }
  .viewport { position: static; display: block; }
  .deck { transform: none !important; width: 1920px; height: auto; }
  .deck > section { position: relative !important; display: flex !important; break-after: page; page-break-after: always; }
  .deck .r, .deck .zoom { animation: none !important; }
  .hud, .notes { display: none !important; }
}
</style>`;

const script = `
<script>
(() => {
  const deck = document.querySelector('.deck');
  const slides = [...deck.querySelectorAll(':scope > section')];
  const counter = document.getElementById('counter');
  const notes = document.getElementById('notes');
  let i = 0;
  const fit = () => { deck.style.transform = 'scale(' + Math.min(innerWidth / 1920, innerHeight / 1080) + ')'; };
  function show(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, j) => {
      const on = j === i;
      s.classList.toggle('active', on);
      if (!on) s.querySelectorAll('video').forEach((v) => v.pause());
    });
    counter.textContent = (i + 1) + ' / ' + slides.length;
    const aside = slides[i].querySelector('aside');
    notes.innerHTML = '<b>SPEAKER NOTES · SLIDE ' + (i + 1) + '</b>';
    notes.appendChild(document.createTextNode(aside ? aside.textContent.trim() : 'No notes for this slide.'));
    history.replaceState(null, '', '#' + (i + 1));
  }
  const go = (d) => show(i + d);
  const full = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}));
  addEventListener('resize', fit);
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('video') && [' ', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(1); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(-1); }
    else if (e.key === 'Home') show(0);
    else if (e.key === 'End') show(slides.length - 1);
    else if (e.key === 'f' || e.key === 'F') full();
    else if (e.key === 'n' || e.key === 'N') notes.classList.toggle('show');
  });
  document.querySelector('.viewport').addEventListener('click', (e) => {
    if (e.target.closest('video')) return;
    go(e.clientX > innerWidth / 3 ? 1 : -1);
  });
  document.getElementById('prev').onclick = () => go(-1);
  document.getElementById('next').onclick = () => go(1);
  document.getElementById('full').onclick = full;
  document.getElementById('note').onclick = () => notes.classList.toggle('show');
  let tx = null;
  addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (tx === null || e.target.closest('video')) { tx = null; return; }
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    tx = null;
  });
  fit();
  show((parseInt(location.hash.slice(1), 10) || 1) - 1);
})();
</script>`;

const out = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Silicofeller — Quantum Studio Pitch</title>
<style>${fs.readFileSync(path.join(path.dirname(srcFile), "classic-fonts.css"), "utf8")}</style>
${player}
${style}
</head>
<body>
<!-- Keys: Right/Left or Space to move, F full screen, N speaker notes, Home/End first/last. Ctrl+P saves a PDF, one slide per page.
     Demo video: put your video next to this file as "silicofeller-demo.mp4"; otherwise the demo from silicofeller.com plays (needs internet). -->
<div class="viewport"><div class="deck">
${slides}
</div></div>
<div class="notes" id="notes"></div>
<div class="hud"><button id="prev" aria-label="Previous slide">&#8592;</button><span id="counter"></span><button id="next" aria-label="Next slide">&#8594;</button><button id="note">Notes (N)</button><button id="full">Full screen (F)</button></div>
${script}
</body>
</html>
`;
fs.writeFileSync(outFile, out);
// Web hosts (Vercel, Netlify, GitHub Pages) open index.html at the site's main address.
fs.writeFileSync(path.join(path.dirname(outFile), 'index.html'), out);
console.log('Wrote', outFile, Math.round(out.length / 1024) + ' KB');
