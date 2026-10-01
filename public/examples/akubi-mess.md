# I’m a mess · Reference lyric overlay

An editable approximation of the lyric typography and motion in the supplied
27.79-second あくび / でもんすぺーど cover excerpt. Times start at the beginning of
the uploaded cut, including its opening silence. The composition is 854 × 480 at
24 fps, with a transparent background.

Open **Project → Starting points → I’m a mess · Reference lyrics** in Studio, or use
**File → Open JSON** with `akubi-mess.json`. Every character has a stable ID;
colors, italics, placement, material effects, markers, and keyframes remain editable.
Attach the reference audio separately to hear the timing in Studio.

The overlay includes:

- Pink/white diagonal “I'm a mess” titles with staggered entrances.
- 明けない夜に, 失いかけた声を上げて, 振り返れない, and 僕の心は.
- Bold italic title repeats with grain and scan materials.
- Brackets around 僕の心は and a faint oversized echo.
- The final diagonal refrain, pull-back, and blur/fade transition.
- Blank intervals during the instrumental transition and end credits.

The source illustration, camera cuts, particle effects, ornamental framing, and
audio are not included. The existing serif font and grain/scan effects approximate
the reference fonts and distressed texture; this is not a pixel-exact recreation.
On an older Studio renderer the same JSON opens, but italic text appears upright.

For OBS, use `/player.html?score=/examples/akubi-mess.json` on a deployment containing
this example, at 854 × 480. Place your own visual background beneath that browser
source. The renderer stays available through `window.Lilt3` and `window.liltPlayer`.

Rebuild the score with `node scripts/reference-lyrics.mjs`. To make a portable OBS
HTML file with all runtime scripts and fonts embedded, run
`node scripts/export-reference-player.mjs /path/to/akubi-mess-player.html` after
`npm run build:player`. The HTML supports `?time=18000&autoplay=0`, `?loop=0`, and
the same player API as the hosted player.
