// Generate same-origin, single-thread FFmpeg assets. Each file stays below
// Cloudflare's 25 MiB asset limit; the browser assembles the WASM chunks.
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const core = new URL('node_modules/@ffmpeg/core/', root);
const wrapper = new URL('node_modules/@ffmpeg/ffmpeg/', root);
const corePackage = JSON.parse(await readFile(new URL('package.json', core), 'utf8'));
const wrapperPackage = JSON.parse(await readFile(new URL('package.json', wrapper), 'utf8'));
const version = `${corePackage.version}-${wrapperPackage.version}`;
const destination = new URL(`public/lilt/export/${version}/`, root);
await mkdir(destination, { recursive: true });
for (const name of await readdir(new URL('dist/esm/', wrapper))) {
  if (name.endsWith('.js'))
    await copyFile(new URL(`dist/esm/${name}`, wrapper), new URL(name, destination));
}
await copyFile(new URL('dist/esm/ffmpeg-core.js', core), new URL('ffmpeg-core.js', destination));
const wasm = await readFile(new URL('dist/esm/ffmpeg-core.wasm', core));
const prefix = `/lilt/export/${version}/`;
const parts = [];
for (let offset = 0, part = 0; offset < wasm.length; offset += 16 * 1024 * 1024, part++) {
  const name = `core-${part}.wasm-part`;
  await writeFile(new URL(name, destination), wasm.subarray(offset, offset + 16 * 1024 * 1024));
  parts.push(prefix + name);
}
await writeFile(
  new URL('public/lilt/export/manifest.json', root),
  JSON.stringify({
    coreURL: prefix + 'ffmpeg-core.js',
    classWorkerURL: prefix + 'worker.js',
    parts,
  }),
);
await writeFile(
  new URL('NOTICE.txt', destination),
  `FFmpeg WebAssembly core ${corePackage.version}: ${corePackage.license}\nhttps://github.com/ffmpegwasm/ffmpeg.wasm\nFFmpeg JavaScript API ${wrapperPackage.version}: ${wrapperPackage.license}\nSource and build recipes: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/packages/core\n`,
);
console.log(`Prepared video encoder assets in ${fileURLToPath(destination)}`);
