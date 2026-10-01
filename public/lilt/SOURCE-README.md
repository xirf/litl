# Lilt Studio 03

A browser lyric score, editor and Canvas 2D renderer. Open `index.html` directly.
The 13 supplied Japanese lines use illustrative timing (93.6 seconds), not timings
aligned to a recording. Load your own audio with Audio & text.

## What changed

V3 separates lyric content, effect instances, reusable effect definitions and
painting. Characters have stable identities; selectors refer to those identities.
The renderer does not contain a switch that must be extended for every new effect.
Built-in choreography lives in `core-pack.js`; custom packs use the same registry.
Old v2 scores are converted by `migrate.js` when imported.

Try these in the editor:

1. Select a glyph and change its font, size, color or offset.
2. In Motion lab, add effects, reorder the stack, change duration, grouping,
   staggering and targets. Template controls come from its definition.
3. In Score & code, register the provided helix example. Change its radius in
   Motion lab. Register another named template; both remain available.
4. Register the material example to paint texture inside glyphs.
5. In Audio & text, use Insert prefix demo: existing characters keep their IDs
   and their effect/style assignments.
6. Save player for a standalone HTML containing your score and custom definitions.
   Export score for JSON only; Export user pack for its reusable JavaScript.

## Layered timeline update

Click **Try duet + silence** to load a three-clip demonstration. Voice A starts at
1 second and Voice B at 3 seconds on opposite sides of the stage. Both stop by
10.2 seconds; there are no lyrics until 12.2 seconds. The shared line ends at
19.4 seconds, followed by an empty outro until the song ends at 22 seconds.
`example-duet.json` contains the same example for import.

A scene is now an independently scheduled lyric clip. `scenes` remains the JSON
field name for compatibility. The new fields are:

| Field | Meaning |
| --- | --- |
| `scenes[].start` | Absolute start on the song clock, in milliseconds |
| `scenes[].duration` | Clip length; the clip is active on `[start, start + duration)` |
| `scenes[].layer` | Layer ID; defaults to the first layer |
| `layers[]` | Named layers, with `id`, optional `name`, `z`, `rect`, `visible`, `opacity` |
| `layers[].rect` | Normalized `[x, y, width, height]` within the stage |
| `duration` | Optional song end, including empty intro/outro; otherwise maximum clip end |
| `background` | Shared background (`hue`, `backdrop`, `theme`) when layers are declared |

For example, the scheduling fields around existing lyric content are:

```json
{
  "duration": 22000,
  "layers": [
    {"id":"a", "z":0, "rect":[0,0,0.5,1]},
    {"id":"b", "z":1, "rect":[0.5,0,0.5,1]}
  ]
}
```

Put `"start":1000, "layer":"a"` on the first clip and
`"start":3000, "layer":"b"` on the second. Their content, effects and vocal unit
timings remain clip-local. Each active clip evaluates at `songTime - clip.start`.
Changing one clip's duration or start does not move other explicitly placed clips.

**Empty sections are gaps, not blank text clips.** When no clip covers the current
time, the background remains but glyphs, hit targets and captions are empty.
Loaded audio continues through these lyric-free intervals.
Use clip start times to create intro/interior gaps and Song end to retain an outro.
A song end shorter than an existing clip is rejected rather than silently cutting
it off. Hidden layers still contribute to the scheduled duration.

Multiple clips can overlap even on the same layer. Smaller z values paint first;
ties use clip array order. Layout fits within each layer rectangle, and drawing
and hit testing are clipped to that rectangle. The renderer paints the shared
background once, then composites active clips without clearing earlier lyrics.
Only active clips and the currently edited clip retain glyph caches.

The timeline editor supports absolute starts, layer assignment, preset positions,
z order, opacity, hide/show, duplicating and removing clips. Arbitrary normalized
rectangles and layer names are editable in JSON. Clip selection is separate from
playback: clicking a singer selects that clip at the same song time. In a gap,
the inspector retains the edited clip while the stage shows no lyrics.

Old scores without starts retain sequential placement. On import, the editor
makes those starts explicit. Old scores without layers retain scene backgrounds;
adding layers switches to a shared stage background. There is no forced
serialization when layers overlap. This update keeps the v3 content/effect schema.

Run `node tests/timeline.cjs` for scheduling and boundary tests, and
`node tests/layers-browser.cjs` for duet rendering, independent clocks, silence,
selection, timing isolation, visibility, export/reopen and mobile checks.

## Score format

`example-score.json` is a small example; load `example-user-pack.js` before applying
it in an integration. These examples demonstrate independent seeded character
routes that converge on the final layout, plus a texture on one character.

```json
{
  "v": 3,
  "seed": 42,
  "packs": { "core": "3.0.0" },
  "scenes": [{
    "id": "first", "duration": 6000, "layout": "line",
    "content": [{"id": "phrase", "type": "phrase", "children": [
      {"id": "word", "type": "word", "children": [
        {"id": "a", "text": "波"}, {"id": "b", "text": "音"}
      ]}
    ]}],
    "animations": [{
      "id": "arrival", "use": "core/enter-ribbon",
      "each": "character", "duration": 1400, "stagger": 60
    }],
    "materials": [{
      "id": "water", "use": "core/liquid", "select": {"ids": ["a"]}
    }]
  }]
}
```

All score times are milliseconds. Scene times are local to the scene. Units can
have `begin` and `end` vocal timing, `tags`, and inherited `style`. Use `children`
or `text` on a unit, never both. Explicit character leaf IDs give the strongest
identity guarantees; a longer text leaf generates positional glyph IDs. Unit IDs
must be unique within a scene; scene IDs must be unique within a score.

The migration groups old override boundaries into word units; it does not perform
linguistic word segmentation. Adjust the hierarchy and vocal timing yourself.

Style properties: `face`, six-digit hex `color`, `size` (.25–4), `dx`, `dy`,
`rotation`, and boolean `italic`. Scene style supplies defaults. Unit styles inherit down the tree.
`scene.styles` contains ordered `{select, style}` overrides. Font names are
`mincho`, `bold`, `sans`, `black`, `brush`, `display`.
The embedded Japanese fonts are subsets for the supplied lyrics; new characters
may use system fallback. License notices are embedded and included in the source.

## Selectors and groups

A missing selector means all characters; `ids: []` means none.

| Selector | Meaning |
| --- | --- |
| `{"ids":["word"]}` | Unit and its descendant glyphs |
| `{"tags":["accent"]}` | Any matching inherited tag |
| `{"exclude":["a"]}` | Remove these units and descendants |
| `{"range":[0,3]}` | First three candidates; end is exclusive |
| `{"range":[0,50],"units":"percent"}` | First half of candidates |
| `{"every":2,"offset":0}` | Every other candidate |
| `{"range":[0,2],"basedOn":"word"}` | First two word groups |

Combine fields to filter further. Range and stride use the ordering of candidates
remaining after ID/tag/exclusion filters. Numeric ranges are intentionally
positional. IDs survive supported text edits; they do not automatically make a
numeric range stable.

`each: character|word|phrase` controls transform grouping independently of the
selector. Word and phrase transforms act rigidly around the selected group's
center. Motion instances compose in list order as affine matrices: ordering
matters. Opacity and reveal multiply; blur adds. Materials paint in list order.

## Timing

Instances refer to a definition with `use` and may override `duration`, `phase`,
`stagger`, `order`, `at`, `anchor` and `params`.

- `phase`: `enter`, `exit` or `loop`.
- `anchor`: `scene` (default) or `unit` to use inherited vocal timing.
- `at`: explicit scene-local start time, before stagger.
- `order`: `forward`, `reverse`, `center` or seeded `random`.
- Exit defaults finish the last staggered group at its end time.
- Enter/exit samples clamp progress and hold endpoint transforms. Loop templates
  are active inside their timing interval and can use elapsed seconds for motion.

Random values are keyed by score seed, scene ID, instance ID and unit ID. A custom
sample should use `rand(key)`, not `Math.random()`, for repeatable seeking.

## Extend with code

```js
Lilt3.registerPack({
  id: 'myPack', version: '1.0.0',
  effects: {
    rise: {
      kind: 'motion', phase: 'enter', duration: 1200,
      defaults: { distance: 100 },
      controls: { distance: { min: 0, max: 300, step: 10 } },
      sample({ e, params }) {
        return { y: (1 - e) * params.distance, opacity: e };
      }
    }
  }
});
```

Declare `"myPack":"1.0.0"` in `packs`, then use `myPack/rise`. The editor builds
numeric parameter controls from `controls`. Change the definition once to update
its instances; each instance can supply its own parameters and duration.

Motion sample context: `p` (normalized progress), `e` (eased progress), `phase`,
`t` (scene seconds), `time` (seconds since this group's effect start), `i`, `n`,
`unitId`, `params`, `rand(key)` and its alias `r(key)`.
Return any of `x`, `y`, `rotation` (radians), `sx`, `sy`, `opacity`, `blur`, `reveal`.
Omitted properties are neutral. Definitions can choose easing `linear`, `out`,
`in`, `smooth` or `back`.

Materials use `kind: 'material'`, optional `fps`, and
`paint({ctx,width,height,time,index,rand,params,unitId})`. Painting is clipped to
the glyph mask. Optional `displace({y,time,index,rand,params})` returns horizontal
strip displacement. Material time is in seconds and quantized by its update rate.
Custom effects are ordinary trusted JavaScript, not a security sandbox. The code
editor runs only when explicitly registered; importing JSON never evaluates code
strings or downloads packs. Pack versions are exact strings, not content hashes.

For simple motion without JS, define a score-local template:

```json
"effects": {
  "floatIn": {
    "kind": "motion", "duration": 1400, "ease": "out",
    "tracks": {"y": [100, -15, 0], "opacity": [0, 1]}
  }
}
```

Use `"use":"floatIn"` in an animation. Track values are evenly spaced across
eased progress. Tracks are data; they do not contain executable source.

## Integrate and transmit

Load `model.js`, `core-pack.js`, additional packs and `renderer.js` once. Validate
received JSON with `Lilt3.validate(score)`. Use `Lilt3.compileScene` and
`Lilt3.evaluate` independently of the editor, or instantiate `Lilt3.Renderer`
(see `app.js` for the canvas integration). Renderer exposes `load`, `draw`,
`resize`, `invalidate`, `hit` and `destroy`. `editing.js` adds `Lilt3.editText`.

Cache code, fonts and effect packs separately from per-song JSON. The supplied
score is 23,670 UTF-8 bytes, about 3,604 bytes with gzip. The self-contained HTML
is about 1.12 MB, mostly embedded fonts. Stable IDs and explicit effect instances
cost more raw JSON than v2, but repeated keys compress well. These are file sizes,
not a runtime performance benchmark.

## Build and verify

Python 3 builds the standalone player without dependencies:

```sh
python3 build.py
node tests/model.cjs
```

Browser tests require Playwright and Chromium:

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/browser.cjs
```

Set `CHROMIUM_EXECUTABLE` to use an existing Chromium. Browser tests emit preview
PNGs and an export-test HTML in the working directory. They cover 39 scene/time
samples, visible glyphs, deterministic seek, selectors, duration/group editing,
custom motion and materials, multiple templates, export/reopen, mobile overflow,
reduced motion and page errors. Model tests cover migration, IDs, selectors,
parameter bounds, timing anchors, composition and deterministic evaluation.

## Limits

This is a Canvas 2D implementation, with cached glyph masks/material updates and
DPR capped at 2. Heavy custom painters still cost CPU; no 60 fps guarantee is made.
It does not implement WebGL shaders, TTML/ASS/Lottie imports, or arbitrary custom
layout plugins. Per-grapheme layout is best suited to this Japanese demo; it is
not a full shaping engine for connected scripts. Vertical punctuation is upright.
Text reconciliation uses longest-common-subsequence matching and preserves the
existing hierarchy where possible. Repeated identical characters make identity
ambiguous during large rewrites. Text edits do not realign audio timing.
