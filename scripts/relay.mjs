// Optional local transport between Studio and OBS. Serves no web pages or files.
import { WebSocketServer, WebSocket } from 'ws';
const port = Number(process.env.LILT_RELAY_PORT || 8787);
const server = new WebSocketServer({ host: '127.0.0.1', port, maxPayload: 8_500_000 });
const state = { score: null, time: 0, rate: 1, playing: false, loop: false, at: performance.now() };
const timestamp = () => {
  const time = state.time + (state.playing ? (performance.now() - state.at) * state.rate : 0);
  if (state.loop && state.playing && state.score) {
    let cursor = 0,
      end = 0;
    for (const clip of state.score.scenes) {
      cursor = (clip.start ?? cursor) + clip.duration;
      end = Math.max(end, cursor);
    }
    const a = state.score.loopRegion?.start ?? 0,
      b = state.score.loopRegion?.end ?? state.score.duration ?? end;
    if (b > a && time >= b) return a + ((time - a) % (b - a));
  }
  return time;
};
const send = (peer, data) => {
  if (peer.readyState === WebSocket.OPEN) peer.send(JSON.stringify({ type: 'lilt', ...data }));
};
server.on('connection', (peer, request) => {
  // Browser clients may connect from the local studio, OBS, or a local HTML file.
  // Remote web pages cannot drive a loopback relay through a browser origin.
  const origin = request.headers.origin;
  if (origin && origin !== 'null') {
    try {
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname)) {
        peer.close(1008, 'Local origins only');
        return;
      }
    } catch {
      peer.close(1008, 'Invalid origin');
      return;
    }
  }
  if (state.score) {
    send(peer, { action: 'load', score: state.score });
    send(peer, { action: 'rate', rate: state.rate });
    send(peer, { action: 'loop', loop: state.loop });
    send(peer, { action: state.playing ? 'play' : 'pause', time: timestamp() });
  }
  peer.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      if (
        message.type !== 'lilt' ||
        !['load', 'seek', 'play', 'pause', 'rate', 'loop'].includes(message.action)
      )
        return;
      if (
        ['seek', 'play', 'pause'].includes(message.action) &&
        message.time != null &&
        (!Number.isFinite(message.time) || message.time < 0 || message.time > 900000)
      )
        return;
      if (message.action === 'load') {
        if (
          !message.score ||
          ![2, 3].includes(message.score.v) ||
          !Array.isArray(message.score.scenes)
        )
          return;
        state.score = message.score;
        state.time = 0;
        state.at = performance.now();
        state.playing = false;
      }
      if (message.action === 'loop') {
        if (typeof message.loop !== 'boolean') return;
        state.time = timestamp();
        state.at = performance.now();
        state.loop = message.loop;
      }
      if (message.action === 'rate') {
        if (!Number.isFinite(message.rate) || message.rate < 0.1 || message.rate > 4) return;
        state.time = timestamp();
        state.at = performance.now();
        state.rate = message.rate;
      }
      if (['seek', 'play', 'pause'].includes(message.action)) {
        state.time = message.time ?? timestamp();
        state.at = performance.now();
        if (message.action === 'play') state.playing = true;
        if (message.action === 'pause') state.playing = false;
      }
      for (const client of server.clients) if (client !== peer) send(client, message);
    } catch {
      /* Malformed traffic does not interrupt playback. */
    }
  });
  peer.on('error', () => {});
});
server.on('listening', () => console.log(`Lilt relay listening at ws://127.0.0.1:${port}`));
server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    for (const peer of server.clients) peer.close();
    server.close();
  });
