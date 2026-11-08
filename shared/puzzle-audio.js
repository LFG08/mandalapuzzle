/* Shared master volume for HTML media and synthesized Web Audio effects. */
(() => {
  const key = 'cacapalavras_volume';
  const stored = localStorage.getItem(key);
  let volume = stored !== null && Number.isFinite(Number(stored)) ? Math.max(0, Math.min(1, Number(stored))) : 1;
  const levels = new WeakMap();
  const media = new Set();
  const gains = new Set();
  const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
  function register(element) {
    if (!levels.has(element)) {
      levels.set(element, descriptor.get.call(element));
      element.addEventListener('ended', () => media.delete(element));
      element.addEventListener('pause', () => media.delete(element));
    }
    media.add(element);
  }
  Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
    ...descriptor,
    set(value) {
      const number = Number(value);
      // Let the native setter enforce its normal range and type errors.
      if (!Number.isFinite(number) || number < 0 || number > 1) {
        descriptor.set.call(this, value);
        return;
      }
      register(this);
      levels.set(this, number);
      descriptor.set.call(this, number * volume);
    }
  });
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    register(this);
    descriptor.set.call(this, levels.get(this) * volume);
    return play.apply(this, args);
  };
  if (window.AudioNode) {
    const connect = AudioNode.prototype.connect;
    const masters = new WeakMap();
    AudioNode.prototype.connect = function (destination, ...args) {
      if (destination !== this.context.destination) return connect.call(this, destination, ...args);
      let master = masters.get(this.context);
      if (!master) {
        master = this.context.createGain();
        master.gain.value = volume;
        connect.call(master, destination);
        masters.set(this.context, master);
        gains.add(master);
      }
      connect.call(this, master, ...args);
      return destination;
    };
  }
  function setVolume(next, persist = true) {
    if (!Number.isFinite(Number(next))) return;
    volume = Math.max(0, Math.min(1, Number(next)));
    for (const element of media) descriptor.set.call(element, levels.get(element) * volume);
    for (const gain of gains) gain.gain.setValueAtTime(volume, gain.context.currentTime);
    if (persist) localStorage.setItem(key, String(volume));
    window.dispatchEvent(new CustomEvent('puzzle-volume-change', { detail: volume }));
  }
  window.puzzleAudio = { get volume() { return volume; }, setVolume, hasPreference: stored !== null };
  window.addEventListener('storage', event => {
    if (event.key === key) setVolume(event.newValue === null ? 1 : Number(event.newValue), false);
  });
})();
