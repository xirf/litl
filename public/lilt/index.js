// Native ESM entry point. Classic scripts expose the same API as window.Lilt3.
import './model.js';
import './core-pack.js';
import './migrate.js';
import './editing.js';
import './renderer.js';
import './player.js';
const Lilt = globalThis.Lilt3;
export default Lilt;
export const {
  Renderer,
  Player,
  validate,
  compileScene,
  evaluate,
  registerPack,
  schedule,
  activeClips,
  editText,
  migrateV2,
  keyframeValue,
  easeValue,
  pathPoint,
} = Lilt;
