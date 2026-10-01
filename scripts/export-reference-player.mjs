// Export this reference example without requiring a Studio browser session.
import { readFile, writeFile } from 'node:fs/promises';

const destination = process.argv[2];
if (!destination)
  throw Error('Usage: node scripts/export-reference-player.mjs /path/to/player.html');
const root = new URL('../public/', import.meta.url);
const files = ['model', 'core-pack', 'migrate', 'editing', 'renderer', 'player'];
const sources = await Promise.all(
  files.map((name) => readFile(new URL(`lilt/${name}.js`, root), 'utf8')),
);
const [fonts, css, score] = await Promise.all([
  readFile(new URL('lilt/fonts.css', root), 'utf8'),
  readFile(new URL('lilt/player.css', root), 'utf8'),
  readFile(new URL('examples/akubi-mess.json', root), 'utf8'),
]);
const safe = (source) => source.replace(/<\/script/gi, '<\\/script');
await writeFile(
  destination,
  `<!doctype html>
<html lang="en" class="h-full"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>I’m a mess · Lilt lyric overlay</title><style>${fonts}\n${css}</style></head><body class="m-0 h-full overflow-hidden bg-transparent"><canvas class="block h-full w-full" id="stage" aria-label="Animated lyrics"></canvas><script>${safe(sources.join('\n'))}
const score=${JSON.stringify(JSON.parse(score)).replace(/</g, '\\u003c')};
const query=new URLSearchParams(location.search);
const player=window.liltPlayer=new Lilt3.Player(document.getElementById('stage'),score,{transparent:query.get('transparent')!=='0',loop:query.get('loop')!=='0',channel:'lilt-reference'});
Promise.all([document.fonts.ready,player.renderer.ready()]).then(()=>{player.renderer.invalidate();player.seek(Number(query.get('time')||0));if(query.get('socket'))player.connectSocket(query.get('socket'));if(query.get('autoplay')!=='0')player.play();});
</script></body></html>\n`,
);
console.log(`Exported standalone player to ${destination}`);
