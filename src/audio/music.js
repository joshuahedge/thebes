// Music (spec 5.5, rulings 266-270): an original, quiet loop generated with Web Audio, in hijaz on D at 72 beats a
// minute: a drone, a plucked voice, a ney-like flute about once a minute and a soft frame drum, built bar by bar from
// motifs by a seeded draw of the city's seed and the bar number (never the sim's random numbers). A tenser raid mood
// fades in over four bars while a raid warning or a raid is on. On by default at volume 30, separate from the effects.
// Stage 4 contract: Track 0 fixed the names and the boot wiring; Track G implements createMusic and owns this file.
//
// boot.js makes one for the page (it outlives each game, so the title card plays too) and:
//   calls unlock() on every pointerdown, pointerup and keydown until it returns true (the browser's autoplay rule:
//   nothing sounds before the first gesture);
//   calls stop() when the page is hidden and start() when it shows again;
//   calls refresh() whenever the settings change (music on or off, the volume);
//   calls tick(now) once a frame from the title's and the game's loops (now: performance.now() ms), so the music can
//   schedule notes a little ahead on that light timer;
//   calls destroy() when the page goes.
// The music reads everything else through its options when it needs it: enabled() (settings music), volume() (0-1),
// seed() (the city's seed, or the title city's), mood() ('calm' or 'raid', musicMood of the city on screen).
// It respects the iPhone silent switch as the effects do (navigator.audioSession.type = 'ambient', set by createSfx).

// The music's mood for a world: 'raid' while a raid warning or a raid is on (ruling 267), else 'calm'. Complete.
export const musicMood = (world) => (world && world.raid && (world.raid.warning || world.raid.active) ? 'raid' : 'calm');

// STUB. Returns the music's controls, each a safe no-op until Track G: unlock() -> false (nothing to unlock yet),
// start(), stop(), refresh(), tick(now), destroy(), and playing() -> false.
export function createMusic({
  context = null, create = null, enabled = () => false, volume = () => 0.3, seed = () => 1, mood = () => 'calm',
} = {}) {
  return {
    unlock: () => false,
    start() {},
    stop() {},
    refresh() {},
    tick(now) {},
    destroy() {},
    playing: () => false,
  };
}
