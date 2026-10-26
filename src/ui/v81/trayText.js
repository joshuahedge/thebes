// Version 8.1 (Track D): the words of the layered tray, the drag to build and Ipi's lines about the tray. Every name comes from the game's own data; the scribe never says more than two short sentences.
export const TRAY_V81_TEXT = {
  // The "More" card that ends a layered tray, and "Fewer" once it is open. The name says how many it holds.
  more: 'More',
  fewer: 'Fewer',
  moreCount: (n) => `+${n}`,
  moreName: (n, category) => `More ${category.toLowerCase()}: ${n} more ${n === 1 ? 'building' : 'buildings'}`,
  fewerName: (category) => `Fewer ${category.toLowerCase()}: show the main ones only`,
  // The tag on the card the scribe suggests (words as well as the ring, so colour is never the only cue).
  advised: 'Ipi suggests',
  advisedName: (name) => `${name}, suggested by Ipi`,
  // Ipi's line when the Advice engine's top build changes: the item, then what holds the city back (the sim's own sentence).
  suggestLine: (name, what) => `Try the ${name}. ${what}.`,
  // Ipi's line when a card unlocks. One item, or a few named, then where to find it.
  unlockedOne: (name, category) => `${name} is yours to build. Find it under ${category}.`,
  unlockedMany: (names) => `Pharaoh grants you ${names}. Open the tray to see them.`,
};
