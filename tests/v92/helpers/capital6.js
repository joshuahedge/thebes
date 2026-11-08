// Version 9.2 wave 0 (ruling 1753): the six-year Capital (runCapital(72, { dangers: true })) built once per suite run and handed out as a world and as a
// packed save, so Q, A and the final review open the same city. Callers must not change the shared world: take a fresh one with capital6Fresh().
import { runCapital } from '../../stage4/balance/capitalRun.js';
import { packSave, unpackSave } from '../../../src/save/serialize.js';

let run = null, packed = null;
const built = () => run || (run = runCapital(72, { dangers: true }));

export const capital6World = () => built().w;
export const capital6Elapsed = () => built().elapsed;
export const capital6Save = () => packed || (packed = packSave(built().w));
// A fresh copy of the six-year Capital, safe to change (the packed save, unpacked).
export const capital6Fresh = () => unpackSave(capital6Save()).world;
