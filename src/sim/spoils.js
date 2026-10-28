// Version 8.4 (wave 0 seam; Track R owns this file): what a beaten raid leaves the city. src/sim/raids.js endRaid calls raidSpoils once a raid
// ends, after the report is made and the next warning drawn, with whether it was won; events is the tick's list, or null.
// Wave 0's body does nothing, so a raid ends as in 8.3. Track R fills it: the captured weapons (raid.spoils) and the celebration.
export function raidSpoils(world, report, won, events) {}
