# Version 9.2 wave 0: rulings 1750-1754

1750. Wave 0 adds seams only: the roll-up shape, the court's gate, score v3's slot, the text sections, the rigs; the suite passes as on 9.1. Cost if wrong: a seam that changes behaviour moves a 9.1 pin before any track owns it.
1751. No world-version bump (WORLD_VERSION stays 12): every new world field is optional and absent means today's behaviour. Cost if wrong: old saves refuse to open or a migration is needed late.
1752. `SCORE_VERSION` 3 is flipped by Track S with the formula, not by wave 0, so no best changes label before the score does. Cost if wrong: a best is labelled "older scoring" while its formula is unchanged.
1753. The six-year Capital fixture is built once per suite run from `runCapital(72, { dangers: true })`. Cost if wrong: a test that changes the shared world leaks into the next (tests take `capital6Fresh()` for a copy they change).
1754. D13 moves from Track L to Track D: its files are the Pass's (`passSheet.js`, `boot.js` `startHeir`). Cost if wrong: Track L and D both edit `boot.js` and merge badly.
