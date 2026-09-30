# Lilt Studio

A visual lyric animation editor built with Vinext, React, and Canvas 2D. The model,
renderer, effect packs, and player are plain JavaScript and have no React dependency.
Ported from the supplied Lilt Studio 03 source; its v2 migration and v3 scores remain supported.

## Live site

- Studio: https://litl.andka.id/studio
- OBS player: https://litl.andka.id/player.html
- Home: https://litl.andka.id/

Deployed to the Cloudflare account that owns `andka.id`. API credentials are not
stored in this repository. The local WebSocket relay remains a separate utility;
an HTTPS-hosted studio needs a reachable `wss://` relay for OBS control.

## Run locally

Node.js 22 or newer is required.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000/studio` for the editor. `/` is the landing page.
The studio saves score data in this browser's local storage. Export JSON for a
portable backup. Audio is local to the session and is never uploaded or embedded.

```sh
npm run build       # Cloudflare Worker production output
npm run start       # Preview the production build locally
npm run typecheck
npm test            # Original model/scheduling suites + extension tests
npm run test:browser
npm run format:check
```

Browser tests require Chromium. Set `CHROMIUM_EXECUTABLE` to its path (default:
`/usr/bin/chromium`). Start `npm run dev` before running them; `TEST_URL` can point
at a production preview instead. The tests also run an optional local relay.
`npm run deploy` requires your authenticated Cloudflare account. Source repository: https://github.com/xirf/litl. The site is deployed to Cloudflare.

## Editor

- Multi-layer timeline with overlapping clips, absolute starts, silence, waveform,
  draggable clips, and edge trimming. Movement snaps to 100 ms; hold Alt to bypass.
- Character selection in the Canvas or glyph strip, with Shift for multiple targets.
  Text reconciliation preserves matching glyph IDs and their effect/style assignments.
- Typography, layout, position, layer region, stacking, visibility, opacity,
  composition size, frame rate, background, and deterministic seed controls.
- Built-in entrance, hold, exit, and material effects with grouping, selectors,
  duration, staggering, order, vocal timing anchors, and definition-based parameters.
- Timestamped transform keyframes, per-segment interpolation, curve preview, and
  timeline markers. They compose with the original effect stack.
- New compositions default to transparency. Background presets are optional; your own
  image or video can sit behind the lyric player in OBS.
- Local autosave, undo/redo, JSON import/edit/export, custom JavaScript effect packs,
  PNG snapshots, and self-contained HTML player export with embedded fonts.
- Space plays/pauses; arrows step frames; Shift+arrows step seconds; Home seeks to
  zero. Ctrl/Cmd+Z undoes; Shift+Ctrl/Cmd+Z redoes; Ctrl/Cmd+S saves locally.

Custom code only executes after an explicit **Register trusted code** action.
A saved project with custom code requires **Restore & run trusted code** before
reopening. JSON imports never evaluate source strings or fetch effect packs.
For JSON scores referencing a custom pack, register that pack first. Custom packs
are exported separately, and included automatically in standalone HTML exports.

## Vanilla JavaScript integration

Public assets are served unchanged under `/lilt/`. Use native browser ESM:

```html
<link rel="stylesheet" href="/lilt/fonts.css" />
<canvas id="lyrics" style="width:1280px;height:720px"></canvas>
<script type="module">
  import Lilt, { Player, validate } from '/lilt/index.js';
  const score = await (await fetch('/examples/score.json')).json();
  validate(score);
  const player = new Player(document.querySelector('#lyrics'), score, {
    transparent: true,
    loop: true,
    onError: (error) => console.error(error),
  });
  await document.fonts.ready;
  player.renderer.invalidate();
  player.seek(2400); // All score and transport timestamps are milliseconds.
  // await player.play();
  window.player = player;
</script>
```

For classic script tags, load these files in order:
`model.js`, `core-pack.js`, your additional packs, `migrate.js`, `editing.js`,
`renderer.js`, `player.js`. The API is available as `globalThis.Lilt3`
(and `globalThis.Lilt` after loading `player.js`). The model can run without the DOM.
`Renderer` needs a canvas, ResizeObserver, and Canvas 2D.

`Player` exposes `load(score)`, `seek(ms)`, `play()`, `pause()`, `setRate(rate)`,
`connect(channel)`, `connectSocket(url)`, `command(message)`, and `destroy()`.
The low-level `Renderer` exposes `load`, `draw`, `resize`, `invalidate`, `hit`,
`destroy`, and the original evaluation/debug state. Original model and pack docs
are in [public/lilt/SOURCE-README.md](public/lilt/SOURCE-README.md).

## OBS

**Offline:** Studio → Export → Standalone player. In OBS, add a Browser Source,
check “Local file”, and select `lilt-player.html`. Match the source dimensions to
your composition (default 1280 × 720). This file embeds the score, fonts, runtime,
and registered user pack. It needs no server or package install. Background is
transparent by default. Audio is a separate OBS audio source.

**Hosted:** Use `/player.html` as the Browser Source URL. It is a plain HTML page
with no React runtime. `/overlay` is a convenience wrapper for the default player.
Use `/player.html` directly when passing query options:

| Parameter     | Default                | Meaning                                    |
| ------------- | ---------------------- | ------------------------------------------ |
| `score`       | `/examples/score.json` | JSON URL; cross-origin URLs need CORS      |
| `transparent` | `1`                    | Set `0` to draw the configured background  |
| `autoplay`    | `1`                    | Set `0` for external transport             |
| `loop`        | `1`                    | Set `0` to stop at song end                |
| `time`        | `0`                    | Initial time in milliseconds               |
| `channel`     | `lilt-studio`          | Same-origin BroadcastChannel name          |
| `socket`      | unset                  | WebSocket relay URL for external transport |

**Live control from Studio to OBS on this computer:**

```sh
npm run relay
```

In Studio → Export, connect to `ws://127.0.0.1:8787`. Use this OBS URL:

```
http://localhost:3000/player.html?autoplay=0&socket=ws%3A%2F%2F127.0.0.1%3A8787
```

The relay forwards project loads and play/pause/seek/rate messages. New clients
receive the current score and clock. It binds to loopback and accepts local browser
origins; it is a local development utility, not a public service. It forwards JSON
only, never executes user code. When using custom packs, preload them in your
player or use the exported standalone HTML. The relay runs on the OBS computer;
a relay inside a remote workspace does not become your computer's loopback.
An HTTPS-hosted studio needs a `wss://` relay that is reachable by both clients.

“Sync local player” uses BroadcastChannel for same-origin tabs in the same browser.
OBS has a separate browser context; use WebSocket for OBS. Audio is not transmitted;
remote control synchronizes the animation clock, not the recording.

Transport messages have this shape:

```js
{ type: 'lilt', action: 'load', score }
{ type: 'lilt', action: 'play', time: 2400 }
{ type: 'lilt', action: 'pause', time: 2400 }
{ type: 'lilt', action: 'seek', time: 2400 }
{ type: 'lilt', action: 'rate', rate: 1 }
```

## Score extensions

Original numeric `tracks` remain supported. Timestamped keyframes use clip/effect
local milliseconds and hold the endpoint values outside their range:

```json
{
  "stage": { "width": 1280, "height": 720, "fps": 30 },
  "background": { "transparent": true, "hue": 190, "backdrop": "rings" },
  "effects": {
    "rise": {
      "kind": "motion",
      "duration": 2000,
      "keyframes": {
        "y": [
          { "time": 0, "value": 100, "ease": "smooth" },
          { "time": 2000, "value": 0 }
        ]
      }
    }
  }
}
```

Use `rise` from a clip's `animations` list. Available properties: `x`, `y`,
`rotation` (radians), `sx`, `sy`, `opacity`, `blur`, `reveal`. Interpolation lives
on the departing keyframe: `linear`, `smooth`, `in`, `out`, `back`, or `[x1,y1,x2,y2]` for a CSS-style cubic Bézier curve. Keyframe times
must be unique and sorted. Composition dimensions keep layout consistent between
the studio and OBS, regardless of preview size. Frame rate controls editor stepping;
playback uses requestAnimationFrame and the audio/performance clock.

## Shapes, images and Bézier curves

Use **Shape** or **Image** in the timeline to add a visual clip on its own layer.
Shapes include rounded rectangles, ellipses, triangles, stars, polygons and lines.
The Object inspector controls geometry, fill, stroke, size and transform. Image
imports accept PNG, JPEG and WebP, preserve transparency, and embed raster assets
in project JSON and standalone HTML. Imports are resized to at most 1536 pixels;
embedded assets have a 2 MB limit each and projects an 8 MB limit. Large projects
may exceed your browser's local storage quota; export JSON to keep a copy.

Shapes and images use the same motion effects, materials and keyframes as text.
In **Motion**, choose **Custom cubic Bézier** under Animation easing; in **Keys**,
change the departing keyframe's interpolation. Drag handles, edit all four values,
or start from an ease in/out preset. Timing control X values stay within 0–1;
Y values may overshoot. Continuous procedural loops keep their own clock.

In **Keys → Add Bézier path**, drag four spatial points and optionally rotate
along the tangent. Path offsets use stage pixels. The curve controls the route;
Path timing controls how quickly the object moves along it. All controls are
keyboard accessible. The framework-free runtime supports the same score format:

```js
const score = {
  v: 3,
  seed: 1,
  packs: { core: '3.0.0' },
  stage: { width: 1280, height: 720, fps: 30 },
  background: { transparent: true },
  effects: {
    route: {
      kind: 'motion',
      ease: [0.42, 0, 0.58, 1],
      path: {
        points: [
          [-240, 120],
          [-140, -220],
          [160, 220],
          [240, -120],
        ],
        orient: true,
      },
    },
  },
  scenes: [
    {
      id: 'badge',
      type: 'shape',
      duration: 6000,
      shape: { kind: 'star', width: 160, height: 160, fill: '#c4a2ff' },
      animations: [{ id: 'move', use: 'route', each: 'phrase', at: 0, duration: 6000 }],
    },
  ],
};
const player = new Lilt3.Player(canvas, score, { transparent: true, loop: true });
await player.renderer.ready(); // wait for embedded/remote image assets
player.play();
```

Image clips use `type: 'image'` and `image: {asset: 'logo', width: 240,
height: 140, fit: 'contain'}`; declare `assets.logo = {type: 'image', src:
'data:image/png;base64,…'}` on the score. Remote HTTPS images must allow CORS.
`Lilt3.easeValue(curve, progress)` and `Lilt3.pathPoint(path, progress)` are also
available directly and through the ES module entry.

Connected-script shaping means choosing contextual letter forms, joins and
ligatures for scripts such as Arabic and Indic writing. Lilt currently rasterizes
graphemes independently, so it cannot preserve all word-level shaping. For now,
import shaped lettering as a transparent image to animate the intact word.

## Scope and attribution

This is a focused lyric/motion editor, not a full After Effects implementation.
It does not yet include video import/export, audio export,
connected-script shaping, WebGL shaders, cloud project storage, or collaboration.
Font subsets cover the supplied Japanese lyrics; additional characters can use
system fallback. The supplied 13 movements have illustrative timing, not timing
aligned to a recording. The renderer caps DPR at 2; heavy custom materials cost CPU.

The supplied Lilt v3 source is preserved and extended under `public/lilt/`. Font
license notices are retained in `public/lilt/font-licenses/` and the embedded CSS.
