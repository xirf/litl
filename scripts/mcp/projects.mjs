import {
  readFile,
  writeFile,
  rename,
  unlink,
  realpath,
  mkdir,
  readdir,
  stat,
} from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import '../../public/lilt/model.js';
import '../../public/lilt/core-pack.js';
import '../../public/lilt/editing.js';
import '../../public/lilt/migrate.js';
import { z } from 'zod';
const E = globalThis.Lilt3;
const hash = (text) => createHash('sha256').update(text).digest('hex');
const patch = z
  .object({
    clipId: z.string().min(1),
    text: z.string().optional(),
    name: z.string().max(120).optional(),
    start: z.number().int().min(0).max(900000).optional(),
    duration: z.number().int().min(1).max(60000).optional(),
  })
  .strict();
export const editsSchema = z.array(patch).min(1).max(100);
export const cuesSchema = z
  .array(
    z
      .object({
        text: z.string().min(1),
        start: z.number().int().nonnegative(),
        end: z.number().int().positive(),
      })
      .strict(),
  )
  .min(1)
  .max(100);
function checkScore(score) {
  const copy = structuredClone(score),
    warnings = [];
  for (const [id, version] of Object.entries(copy.packs || {})) {
    if (id === 'core') continue;
    warnings.push(
      `Custom pack ${id}@${version} is preserved; its JavaScript is not executed or validated.`,
    );
    delete copy.packs[id];
    for (const clip of copy.scenes || [])
      for (const key of ['animations', 'materials'])
        clip[key] = clip[key]?.filter((fx) => !fx.use?.startsWith(id + '/'));
  }
  E.validate(copy);
  return warnings;
}
export function editScore(score, edits) {
  const next = structuredClone(score),
    ids = new Set();
  for (const edit of editsSchema.parse(edits)) {
    if (ids.has(edit.clipId)) throw Error('Each clip may appear only once in a batch.');
    ids.add(edit.clipId);
    const clip = next.scenes.find((c) => c.id === edit.clipId);
    if (!clip) throw Error(`Unknown clip: ${edit.clipId}`);
    if (edit.text !== undefined) {
      if (['shape', 'image'].includes(clip.type)) throw Error('Only text clips have lyrics.');
      E.editText(clip, edit.text);
    }
    if (edit.name !== undefined) clip.name = edit.name;
    if (edit.start !== undefined) clip.start = edit.start;
    if (edit.duration !== undefined) {
      const ratio = edit.duration / clip.duration;
      E.walk(clip.content || [], (n) => {
        if (n.begin != null) n.begin = Math.round(n.begin * ratio);
        if (n.end != null) n.end = Math.round(n.end * ratio);
      });
      clip.duration = edit.duration;
    }
  }
  if (next.duration != null)
    next.duration = Math.max(
      next.duration,
      ...E.schedule({ ...next, duration: undefined }).clips.map((c) => c.end),
    );
  return { score: next, warnings: checkScore(next) };
}
export function scoreFromCues(name, cues) {
  cues = cuesSchema.parse(cues);
  for (const c of cues)
    if (c.end <= c.start || c.end - c.start > 60000)
      throw Error('Each cue needs an end after its start and a duration of at most 60 seconds.');
  const score = {
    v: 3,
    seed: 1,
    name,
    packs: { core: '3.0.0' },
    stage: { width: 1280, height: 720, fps: 30 },
    background: { transparent: true },
    layers: [{ id: 'main', name: 'Lyrics', z: 0, rect: [0, 0, 1, 1] }],
    scenes: cues.map((c, i) => ({
      id: `line-${i + 1}`,
      name: c.text.slice(0, 60),
      layer: 'main',
      start: c.start,
      duration: c.end - c.start,
      layout: 'line',
      content: [{ id: `line-${i + 1}-text`, text: c.text }],
      animations: [],
      materials: [],
    })),
  };
  checkScore(score);
  return score;
}
export class ProjectStore {
  constructor(root) {
    this.root = path.resolve(root);
    this.queue = Promise.resolve();
  }
  async resolve(name, existing = true) {
    if (!name || path.extname(name).toLowerCase() !== '.json')
      throw Error('Use a relative .json file path.');
    const root = await realpath(this.root),
      file = path.resolve(root, name);
    if (!file.startsWith(root + path.sep))
      throw Error('Project must stay inside LILT_PROJECT_DIR.');
    const checked = await realpath(existing ? file : path.dirname(file));
    if (checked !== root && !checked.startsWith(root + path.sep))
      throw Error('Symlinks may not leave LILT_PROJECT_DIR.');
    return file;
  }
  async list() {
    const out = [];
    async function walk(dir, prefix = '') {
      for (const e of await readdir(dir, { withFileTypes: true })) {
        if (e.name.startsWith('.')) continue;
        const name = path.join(prefix, e.name);
        if (e.isDirectory()) await walk(path.join(dir, e.name), name);
        else if (e.isFile() && e.name.toLowerCase().endsWith('.json')) out.push(name);
        if (out.length > 1000) throw Error('Project directory has too many files.');
      }
    }
    await walk(this.root);
    return out.sort();
  }
  async read(name) {
    const file = await this.resolve(name);
    if ((await stat(file)).size > 8500000) throw Error('Project exceeds 8.5 MB.');
    const raw = await readFile(file, 'utf8'),
      document = JSON.parse(raw),
      wrapped = !!document.score;
    let score = wrapped ? document.score : document;
    if (score.v === 2) score = E.migrateV2(score);
    if (score.v !== 3 || !Array.isArray(score.scenes)) throw Error('Not a Lilt project.');
    return { file, raw, document, wrapped, score, revision: hash(raw) };
  }
  async get(name) {
    const p = await this.read(name);
    return {
      project: name,
      revision: p.revision,
      name: p.score.name,
      stage: p.score.stage,
      duration: E.schedule(p.score).duration,
      clips: E.schedule(p.score).clips.map((c) => {
        const scene = p.score.scenes.find((s) => s.id === c.id);
        return {
          id: c.id,
          name: scene.name,
          type: scene.type || 'text',
          start: c.start,
          duration: scene.duration,
          text: ['shape', 'image'].includes(scene.type) ? undefined : E.contentText(scene.content),
        };
      }),
    };
  }
  async preview(name, revision, edits) {
    const p = await this.read(name);
    if (p.revision !== revision)
      throw Error('Revision conflict: read the project again before editing.');
    const result = editScore(p.score, edits);
    return {
      revision: p.revision,
      warnings: result.warnings,
      changes: edits.map((edit) => ({
        clipId: edit.clipId,
        before: p.score.scenes.find((c) => c.id === edit.clipId),
        after: result.score.scenes.find((c) => c.id === edit.clipId),
      })),
    };
  }
  serial(fn) {
    const result = this.queue.then(fn);
    this.queue = result.catch(() => {});
    return result;
  }
  async update(name, revision, edits) {
    return this.serial(async () => {
      const p = await this.read(name);
      if (p.revision !== revision)
        throw Error('Revision conflict: read the project again before editing.');
      const { score, warnings } = editScore(p.score, edits),
        document = p.wrapped ? { ...p.document, score } : score,
        next = JSON.stringify(document, null, 2) + '\n';
      const backupDir = path.join(path.dirname(p.file), '.lilt-backups');
      await mkdir(backupDir, { recursive: true });
      if (!(await realpath(backupDir)).startsWith((await realpath(this.root)) + path.sep))
        throw Error('Backup directory must remain inside project root.');
      const backup = path.join(
        backupDir,
        `${path.basename(p.file, '.json')}-${Date.now()}-${randomUUID()}.json`,
      );
      await writeFile(backup, p.raw, { flag: 'wx', mode: 0o600 });
      await this.atomic(p.file, next, false, p.revision);
      return {
        project: name,
        revision: hash(next),
        backup: path.relative(this.root, backup),
        updated: edits.map((e) => e.clipId),
        warnings,
      };
    });
  }
  async atomic(file, raw, createOnly, revision) {
    const temp = path.join(path.dirname(file), `.lilt-${randomUUID()}.tmp`);
    try {
      await writeFile(temp, raw, { flag: 'wx', mode: 0o600 });
      if (createOnly) {
        const { link } = await import('node:fs/promises');
        await link(temp, file);
      } else {
        if (hash(await readFile(file, 'utf8')) !== revision)
          throw Error('Revision conflict during save.');
        await rename(temp, file);
      }
    } finally {
      await unlink(temp).catch(() => {});
    }
  }
  async create(name, title, cues) {
    return this.serial(async () => {
      const file = await this.resolve(name, false),
        score = scoreFromCues(title, cues),
        raw = JSON.stringify(score, null, 2) + '\n';
      await this.atomic(file, raw, true);
      return { project: name, revision: hash(raw), clips: score.scenes.length };
    });
  }
}
