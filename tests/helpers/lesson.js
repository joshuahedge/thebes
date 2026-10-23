// Version 7.0, Track P (ruling 1002): a lesson step opens as a card with the game paused behind it (src/ui/lessonCard.js). These helpers are what a player's first tap does,
// for the tests that look at the docked row, the ring or the map a step leaves free.

// The card's button, when a card is up.
export const stepCard = (root = document) => {
  const c = root.querySelector('.lesson-card');
  return c && c.offsetParent !== null ? c : null;
};

// Taps the card's button: the step docks to its row (a waiting step plays on, the others point at their place). Returns whether a card was up.
export function dockCard(root = document) {
  const c = stepCard(root);
  if (!c) return false;
  c.querySelector('.lc-go').click();
  return true;
}

// As dockCard, then puts away the tool its Show me started, so a test that measures the free map sees the row alone, as it did before the card.
export function dockPlain(api, root = document) {
  const docked = dockCard(root);
  const g = api.game();
  if (docked && g && g.ui && g.ui.placement) g.ui.placement.cancel();
  return docked;
}
