// Development scenes for the Stage 3 screenshots (tools/shots.ps1 -Stage3): window.__thebes.devScene(name) sets up one
// scene and resolves when it is ready to capture. boot.js exposes devScene before the title card shows. Stage 3 contract:
// a stub that resolves 'stub'; the integrator fills in the scenes ('peaceful', 'fire', 'tribute', 'battle', 'score',
// 'ambient') in Track F. api is boot's returned object ({ phase, game, startGame, hooks }).
export async function devScene(api, name) {
  return 'stub';
}
