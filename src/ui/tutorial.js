// The picture cards (spec 4.1, rulings 261-265): six cards, each a real game screenshot with one ring or arrow drawn
// live over it, a title and one or two sentences, read before the first city and any time from How to play. Stage 4
// contract: Track 0 fixed the name and the wiring; Track G implements it (with src/data/tutorial.js, assets/tutorial/ and
// tools/tutorial.ps1) and owns this file.
//
// showPictureCards({ root, doc, settings, onDone }) shows the cards as a modal dialog over whatever is behind it (the
// title card, or a paused game), with focus kept inside and handed back on close. onDone() is called once, when the
// player reaches Start building, skips, or closes them (Back, Esc, X). It returns { close() }, which closes the cards
// without calling onDone (a page torn down under them). Under Full motion the cards slide; under Gentle and Still they
// change at once (settings.motionLevel()).
//
// The wiring (src/boot.js): New city and This week's Nile show them first when settings.get().cardsSeen is false, then
// set cardsSeen (seen or skipped, ruling 262) and start the city; hooks.pictureCards(onDone) shows them any time (the title
// card's How to play button and the How to play sheet's "Show the picture cards", both Track G's).
//
// STUB: calls onDone at once and shows nothing.
export function showPictureCards({ root = null, doc = null, settings = null, onDone = () => {} } = {}) {
  onDone();
  return { close() {} };
}
