# Version 9.3.1, the regression fix: rulings 2041-2045

- 2041: the 795 failures after group N were one cascade. ui carry-overs' "Esc closes an open tray" still pinned the tray as no history step; ruling 2020 made a phone's open tray a Back step, so its first expectation failed before r.cleanup(), and the interface it left on the page broke every later rig test. The test now expects the step (one entry pushed, taken back by Esc) and cleans up in a finally. Cost if wrong: a later failure in that test cascades again.
- 2042: ui store's field list names explainerOpen and speedOpen (ruling 2020). Cost if wrong: none; it pins the conventions list.
- 2043: ui house sheet for the economy reads a City section's rows after its h3, or, on a phone where the page is folded (ruling 2024), after the h3's summary inside its details row; the rows and their order are the same. Cost if wrong: a section's rows read from the wrong place pass or fail falsely.
