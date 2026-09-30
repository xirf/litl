const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { WebSocket } = require('ws');
(async () => {
  const child = spawn(process.execPath, ['scripts/relay.mjs'], {
    env: { ...process.env, LILT_RELAY_PORT: '8793' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const peers = [];
  const timer = setTimeout(() => {
    child.kill();
    console.error('Relay test timed out');
    process.exitCode = 1;
  }, 10000);
  try {
    await new Promise((resolve, reject) => {
      child.stdout.once('data', resolve);
      child.once('error', reject);
      child.once('exit', () => reject(Error('Relay exited before startup')));
    });
    const connect = async (origin = 'http://localhost:3000') => {
      const peer = new WebSocket('ws://127.0.0.1:8793', { origin });
      peers.push(peer);
      await once(peer, 'open');
      return peer;
    };
    const controller = await connect(),
      observer = await connect();
    const send = (message) => controller.send(JSON.stringify({ type: 'lilt', ...message }));
    let next = once(observer, 'message');
    send({ action: 'load', score: { v: 3, seed: 1, scenes: [] } });
    assert.equal(JSON.parse((await next)[0]).action, 'load');
    next = once(observer, 'message');
    send({ action: 'play', time: 2400 });
    assert.equal(JSON.parse((await next)[0]).time, 2400);
    const late = new WebSocket('ws://127.0.0.1:8793', { origin: 'null' });
    peers.push(late);
    const initial = [];
    await new Promise((resolve, reject) => {
      late.on('message', (raw) => {
        initial.push(JSON.parse(raw));
        if (initial.length === 3) resolve();
      });
      late.on('error', reject);
    });
    assert.deepEqual(
      initial.map((x) => x.action),
      ['load', 'rate', 'play'],
    );
    assert(initial[2].time >= 2400);
    const rejected = await connect('https://remote.invalid');
    const [code] = await once(rejected, 'close');
    assert.equal(code, 1008);
    next = once(observer, 'message');
    controller.send('not-json');
    send({ action: 'pause', time: 5000 });
    assert.equal(JSON.parse((await next)[0]).action, 'pause');
    console.log(
      'PASS relay: load forwarding, play clock, late-join state, origin checks, malformed-message recovery.',
    );
  } finally {
    clearTimeout(timer);
    for (const peer of peers) peer.terminate();
    child.kill();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
