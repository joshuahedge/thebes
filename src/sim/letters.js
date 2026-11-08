// Version 9.2 wave 0 (ruling 1750): the court's one gate over the four letter streams ('event': city events, 'demand': demands, 'request' and 'card': the
// court's). Each scheduler asks letterMayCome before it issues its next letter and calls noteLetter after one is issued. Today the gate is open and
// notes nothing, so the schedulers behave as on 9.1; Track Q fills both (on an optional world field, ruling 1751).
export const LETTER_KINDS = ['event', 'demand', 'request', 'card'];

export function letterMayCome(world, kind) { return true; }

export function noteLetter(world, kind) {}
