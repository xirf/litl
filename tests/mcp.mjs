import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ProjectStore } from '../scripts/mcp/projects.mjs';
const root = await mkdtemp(path.join(tmpdir(), 'lilt-mcp-'));
const outside = await mkdtemp(path.join(tmpdir(), 'lilt-outside-'));
let client;
try {
  const store = new ProjectStore(root);
  await store.create('song.json', 'Song', [
    { text: 'Hello', start: 0, end: 1000 },
    { text: '世界', start: 1000, end: 2000 },
  ]);
  const first = await store.get('song.json');
  assert.equal(first.clips[0].text, 'Hello');
  const raw = await readFile(path.join(root, 'song.json'), 'utf8');
  const score = JSON.parse(raw);
  score.scenes[0].styles = [{ select: { ids: ['line-1-text-0'] }, style: { color: '#ff0000' } }];
  // Use the renderer's actual grapheme IDs for preservation checks.
  const matched = globalThis.Lilt3.flatten(score.scenes[0]).glyphs[0].id;
  score.scenes[0].styles[0].select.ids = [matched];
  await writeFile(path.join(root, 'song.json'), JSON.stringify(score));
  const version = await store.get('song.json'),
    edits = [{ clipId: 'line-1', text: 'Hello!', duration: 33 }];
  const preview = await store.preview('song.json', version.revision, edits);
  assert.equal(preview.changes[0].after.duration, 33);
  assert.equal((await store.get('song.json')).revision, version.revision);
  const changed = await store.update('song.json', version.revision, edits);
  assert.equal((await store.get('song.json')).clips[0].text, 'Hello!');
  assert.equal(
    JSON.parse(await readFile(path.join(root, changed.backup), 'utf8')).scenes[0].duration,
    1000,
  );
  const saved = JSON.parse(await readFile(path.join(root, 'song.json'), 'utf8'));
  assert.equal(globalThis.Lilt3.flatten(saved.scenes[0]).glyphs[0].id, matched);
  assert.deepEqual(saved.scenes[0].styles[0].select.ids, [matched]);
  await assert.rejects(store.update('song.json', version.revision, edits), /Revision conflict/);
  await assert.rejects(
    store.update('song.json', changed.revision, [{ clipId: 'line-1', text: '' }]),
    /graphemes/,
  );
  assert.equal((await store.get('song.json')).revision, changed.revision);
  await assert.rejects(
    store.create('song.json', 'Overwrite', [{ text: 'x', start: 0, end: 100 }]),
    /EEXIST/,
  );
  await assert.rejects(store.read('../outside.json'), /inside/);
  await mkdir(path.join(root, 'sub'));
  await symlink(outside, path.join(root, 'escape'));
  await assert.rejects(
    store.create('escape/new.json', 'Escape', [{ text: 'x', start: 0, end: 100 }]),
    /Symlinks/,
  );
  const wrapped = {
    score: saved,
    packSources: { keep: 'never evaluated' },
    metadata: { label: 'keep' },
  };
  await writeFile(path.join(root, 'wrapped.json'), JSON.stringify(wrapped));
  const w = await store.get('wrapped.json');
  await store.update('wrapped.json', w.revision, [{ clipId: 'line-2', text: '新しい歌詞' }]);
  const preserved = JSON.parse(await readFile(path.join(root, 'wrapped.json'), 'utf8'));
  assert.deepEqual(preserved.packSources, wrapped.packSources);
  assert.deepEqual(preserved.metadata, wrapped.metadata);
  const custom = structuredClone(saved);
  custom.packs.user = '1.0.0';
  custom.scenes[0].animations = [{ id: 'user-fx', use: 'user/helix' }];
  await writeFile(
    path.join(root, 'custom.json'),
    JSON.stringify({ score: custom, packSources: { helix: 'throw new Error("must not run")' } }),
  );
  const customRead = await store.get('custom.json');
  const customEdit = await store.update('custom.json', customRead.revision, [
    { clipId: 'line-1', text: 'Hello custom' },
  ]);
  assert.equal(customEdit.warnings.length, 1);
  assert.equal(
    JSON.parse(await readFile(path.join(root, 'custom.json'), 'utf8')).score.scenes[0].animations[0]
      .use,
    'user/helix',
  );
  const cli = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('../scripts/lyrics.mjs', import.meta.url)), 'read', 'song.json'],
    { env: { ...process.env, LILT_PROJECT_DIR: root }, encoding: 'utf8' },
  );
  assert.equal(cli.status, 0);
  assert.equal(JSON.parse(cli.stdout).clips[0].text, 'Hello!');
  const r = await store.get('song.json');
  const results = await Promise.allSettled([
    store.update('song.json', r.revision, [{ clipId: 'line-2', name: 'A' }]),
    store.update('song.json', r.revision, [{ clipId: 'line-2', name: 'B' }]),
  ]);
  assert.equal(results.filter((x) => x.status === 'fulfilled').length, 1);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../scripts/mcp/server.mjs', import.meta.url))],
    env: { ...process.env, LILT_PROJECT_DIR: root },
    stderr: 'pipe',
  });
  client = new Client({ name: 'lilt-test', version: '1.0.0' });
  await client.connect(transport);
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 6);
  assert.ok(tools.tools.find((t) => t.name === 'update_lyrics').annotations.destructiveHint);
  const response = await client.callTool({
    name: 'get_lyrics',
    arguments: { project: 'song.json' },
  });
  const data = JSON.parse(response.content[0].text);
  assert.equal(data.clips[0].text, 'Hello!');
  const invalid = await client.callTool({
    name: 'update_lyrics',
    arguments: {
      project: 'song.json',
      expectedRevision: '0'.repeat(64),
      edits: [{ clipId: 'line-1', text: 'stale' }],
    },
  });
  assert.equal(invalid.isError, true);
  const created = await client.callTool({
    name: 'create_lyric_project',
    arguments: {
      project: 'via-mcp.json',
      name: 'Protocol',
      cues: [{ text: 'Through MCP', start: 10, end: 100 }],
    },
  });
  assert.ok(!created.isError);
  assert.equal((await store.get('via-mcp.json')).clips[0].start, 10);
  console.log(
    'PASS MCP: protocol discovery and calls, Unicode, grapheme/style preservation, previews, timing, atomic saves, backups, stale/concurrent writes, wrappers, path boundaries and symlinks.',
  );
} finally {
  if (client) await client.close();
  await rm(root, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
}
