// Sharing a score (spec 4.19): the weekly seed, the share link and its check, the emoji row and the picture card. Opt-in
// only, labelled "friends' honour". Stage 3 contract: Track E implements the STUBs. The interface reads the date; the
// sim never does.
//
// STUB. This week's Nile: ISO week-year x 100 + ISO week number of the local date (week 41 of 2026 is 202641).
export function weeklySeed(date) {
  return 0;
}

// STUB. The share link for a score: SHARE.base + '#t1.<seed>.<p|r|n|h>.<parts joined by ->.<months to each milestone
// joined by -, x where not reached>.<4 base-36 check characters>'.
export function shareLink({ seed, difficulty, parts, splits }) {
  return '';
}

// STUB. Reads a location hash: { ok: true, seed, difficulty, parts, splits } for a good link, { ok: false, reason }
// ('bad_check', 'newer_format', 'malformed') otherwise, and null for a hash that is not a share link at all.
export function parseShareLink(hash) {
  return null;
}

// STUB. One line per part, a square per 20 points ("People 🟩🟩🟩⬜⬜"), joined with new lines.
export function emojiRow(parts) {
  return '';
}

// STUB. The 1200x630 picture card as a canvas (the city, the four bars, the medal, the seed and level, "friends' honour").
export function pictureCard(world, score, { createCanvas } = {}) {
  return null;
}
