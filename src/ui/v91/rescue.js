// Version 9.1 "First hours" (wave 0 seam, ruling 1651; Track R owns this file): the global error and unhandled-rejection handler and the error card
// (design 5b). boot.js calls installRescue once, before the title shows, with its context: { win, doc, root, store, settings, records, io, hooks,
// game: () => the running game ({ world, ui, loop, cam, lesson }) or null }. The stub installs nothing, so an error goes where it always has.
export function installRescue(ctx) {}
