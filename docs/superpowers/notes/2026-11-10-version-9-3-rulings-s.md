# 9.3 Track S rulings (1965-1974)

1965. The slot is a `createSaveStore` option; '' is the old store untouched, and 'decree' prefixes IndexedDB keys (`decree.current`) and localStorage keys (`thebes.save.decree.current`). Cost if wrong: a decree save that lands under the main keys would overwrite the city.
1966. Records version 3 adds `decrees`; `normalizeRecords` always returns version 3, so a v2 blob reads with `decrees: []` and is rewritten as v3 on its next write. Cost if wrong: an older game reading a v3 blob drops `decrees` (it already ignores unknown keys).
1967. A decree row's id is always `decree:<week>`; a week has one row, and a blob with two rows of one week is merged like an import. Cost if wrong: a duplicate row in the ruler list.
1968. `noteDecree(world, { now, score, mark, title })`: the caller passes `score` as decreeScore(world)'s `{ total, parts (six), medal }`, because track R owns that function. Without a score, a decree world, or six good parts it returns null. A missing `mark` falls back to the ids as words plus the week. Cost if wrong: U must pass the score.
1969. The link is `#d1.<week>.<six parts>.<seven splits>.<check>`; the check covers the first four parts of the text, as t2's does. Name and heir follow outside it. An unknown `d<n>` with n above 1 reads `newer_format`; `d0` and anything else bad reads `malformed`; a bad week is `malformed`.
1970. A decree rival is a rival row with `week`, seed `weeklySeed(week)`, Normal, classic layout, one per name and week (`name@decree.<week>`). `rivalsFor` and the rivals cap ignore week rows, so a main-game map never lists them. `rivalsForWeek(week)` lists them best first. Cost if wrong: a friend's decree score showing beside a city that happens to use the same seed.
1971. `addRival(link, now, { playing, week })` keeps a decree rival when the link has a good `week` or `week` is passed; a main link goes the old way.
1972. Merging decrees by week keeps the higher score (this device on a tie) and adds the tries, as the plan says. Cost if wrong: re-importing your own export doubles `tries`.
1973. Opening a decree link only adds a rival; it never touches a score or a decree row.
1974. `decreeShareText({ mark, total, medal, parts, link })` takes its words from `DECREE_SHARE_TEXT` under `// Version 9.3, Track S` in text.js, the sixth part labelled "Decree". U may reword it at the merge.
