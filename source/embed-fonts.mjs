// Turns Google Fonts CSS into self-contained @font-face rules (latin subset only, woff2 inlined as base64).
import fs from 'node:fs';
const [cssFile, outFile] = process.argv.slice(2);
const css = fs.readFileSync(cssFile, 'utf8');
const blocks = [...css.matchAll(/\/\* ([a-z-]+) \*\/\s*(@font-face \{[^}]+\})/g)].filter((m) => m[1] === 'latin').map((m) => m[2]);
const cache = {};
let out = '';
for (const block of blocks) {
  const url = block.match(/url\(([^)]+)\)/)[1];
  if (!cache[url]) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    cache[url] = Buffer.from(await res.arrayBuffer()).toString('base64');
  }
  out += block.replace(/url\([^)]+\)/, `url(data:font/woff2;base64,${cache[url]})`) + '\n';
}
fs.writeFileSync(outFile, out);
console.log(blocks.length, 'faces,', Object.keys(cache).length, 'files,', Math.round(out.length / 1024), 'KB');
