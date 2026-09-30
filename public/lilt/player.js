/* Framework-free playback and OBS transport. No React or network dependency. */
(function (G) {
  'use strict';
  const E = G.Lilt3;
  class Player {
    constructor(canvas, score, options = {}) {
      this.options = options;
      this.renderer = new E.Renderer(canvas, score, options);
      this.time = 0;
      this.rate = options.rate ?? 1;
      this.loop = options.loop ?? false;
      this.playing = false;
      this.frame = 0;
      this.audio = options.audio ?? null;
      this.onTime = options.onTime ?? (() => {});
      this.onError = options.onError ?? ((error) => console.error(error));
      this.tick = this.tick.bind(this);
      this.setRate(this.rate);
      this.seek(options.time ?? 0);
      if (options.channel) this.connect(options.channel);
      if (options.autoplay) this.play();
    }
    load(score) {
      this.pause();
      this.renderer.load(score);
      this.renderer.resize();
      this.seek(0);
      return this;
    }
    seek(ms) {
      if (!Number.isFinite(ms)) throw Error('Seek expects finite milliseconds.');
      this.time = E.clamp(ms, 0, this.renderer.duration);
      this.anchor = performance.now() - this.time / this.rate;
      if (this.audio?.src && Number.isFinite(this.audio.duration))
        this.audio.currentTime = Math.min(this.time / 1000, this.audio.duration);
      this.renderer.draw(this.time);
      this.onTime(this.time);
      return this;
    }
    async play() {
      if (this.playing) return;
      if (this.time >= this.renderer.duration) this.seek(0);
      if (this.audio?.src) {
        this.audio.playbackRate = this.rate;
        await this.audio.play();
      }
      this.playing = true;
      this.anchor = performance.now() - this.time / this.rate;
      this.frame = requestAnimationFrame(this.tick);
    }
    pause() {
      this.playing = false;
      cancelAnimationFrame(this.frame);
      this.audio?.pause();
      return this;
    }
    tick(now) {
      if (!this.playing) return;
      try {
        let time = this.audio?.src
          ? this.audio.currentTime * 1000
          : (now - this.anchor) * this.rate;
        if (time >= this.renderer.duration) {
          if (this.loop) {
            this.seek(time % this.renderer.duration);
            time = this.time;
          } else {
            time = this.renderer.duration;
            this.pause();
          }
        }
        this.time = time;
        this.renderer.draw(time);
        this.onTime(time);
        if (this.playing) this.frame = requestAnimationFrame(this.tick);
      } catch (error) {
        this.pause();
        this.onError(error);
      }
    }
    setRate(rate) {
      if (!Number.isFinite(rate) || rate < 0.1 || rate > 4)
        throw Error('Playback rate must be .1–4.');
      this.rate = rate;
      this.anchor = performance.now() - this.time / rate;
      if (this.audio) this.audio.playbackRate = rate;
      return this;
    }
    command(message) {
      if (!message || message.type !== 'lilt') return;
      try {
        if (message.action === 'load') this.load(E.migrateV2(message.score));
        if (message.action === 'seek') this.seek(message.time);
        if (message.action === 'play') {
          if (message.time != null) this.seek(message.time);
          this.play().catch(this.onError);
        }
        if (message.action === 'pause') {
          this.pause();
          if (message.time != null) this.seek(message.time);
        }
        if (message.action === 'rate') this.setRate(message.rate);
      } catch (error) {
        this.onError(error);
      }
    }
    connect(channel = 'lilt-studio') {
      this.channel?.close();
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(channel);
        this.channel.onmessage = (e) => this.command(e.data);
      }
      return this;
    }
    connectSocket(url) {
      this.socket?.close();
      const target = new URL(url);
      if (!['ws:', 'wss:'].includes(target.protocol)) throw Error('Use a ws: or wss: URL.');
      this.socket = new WebSocket(target);
      this.socket.onmessage = (e) => {
        try {
          this.command(JSON.parse(e.data));
        } catch (error) {
          this.onError(error);
        }
      };
      return this;
    }
    destroy() {
      this.pause();
      this.channel?.close();
      this.socket?.close();
      this.renderer.destroy();
    }
  }
  E.Player = Player;
  G.Lilt = E;
})(globalThis);
