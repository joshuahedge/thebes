// Version 9.0 "Dynasty" (wave 0 seam, ruling 1563; Track L owns this file): the rival toast at a new split. The interface (src/ui/createUI.js)
// calls onSplit once for each split whose first day the city records (the five milestones, the pyramids, the great pyramid: SPLITS), with the
// split's id and the interface's seam context (records through ctx.hooks.records, toasts through ctx.toasts). A split already recorded when the
// interface opens (a loaded city) never calls it. Wave 0's body says nothing.
export function onSplit(world, id, ctx) {}
