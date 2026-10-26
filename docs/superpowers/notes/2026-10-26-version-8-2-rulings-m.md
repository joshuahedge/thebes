# Thebes 8.2 "Song of the Nile", Track M (the music): rulings 1280-1294

Source: a friend's playtest note, approved by Josh: the music was one endless loop with a high pluck that repeated; make it "in the C418 way" (design section 7): sparse, soft, low pieces with silence between them. Nobody on the build could listen, so every piece's character comes from written-down choices (register, tempo, mode, density, instrument), and loudness and pitch are checked numerically against 8.1's measured levels.

## The pieces

1280. Seven pieces, data in `src/data/pieces.js` (a leaf), played by `composePiece` in `src/audio/music.js`. Each has its own mode, tonic, tempo, metre, instruments and density:

| Piece | Length (any playing) | Mood | Mode, tonic, tempo | Instruments |
|---|---|---|---|---|
| First light (`dawn`) | 92-143 s | open, hopeful morning | 'ajam (major) on F2, 66 bpm, 4/4 | harp arpeggios and harp tune (F3-D4), pad |
| The low reed (`reed`) | 91-132 s | longing, slow | hijaz on D3, 56 bpm | low flute over a pad, one low harp note a bar |
| Lullaby for the workers' village (`lullaby`) | 91-146 s | tender, rocking | kurd on A2, 60 bpm, 3/4 | low piano-like pluck (tune and rocking bass), pad |
| The river's turning (`river`) | 92-138 s | flowing water | nahawand on D3, 72 bpm | rippling low harp, harp tune, low flute in the middle section, pad |
| Black earth (`sowing`) | 99-151 s | patient, earthy | rast's shape (no quarter tones) on G2, 64 bpm | walking low harp, low pluck tune, pad later |
| Harvest song (`harvest`) | 91-134 s | warm, gently moving | hijaz on D3, 80 bpm | low pluck tune, swaying low harp, low pad, a soft dum |
| Night on the west bank (`night`) | 107-133 s | still, dark | nahawand on A2, 50 bpm | pad alone at first, low flute, one harp note a bar, up to four high accents |

   Cost if wrong: Josh dislikes a piece; each is one data entry to rewrite or drop (6 is still within the brief).

1281. The choice: `choosePiece(seed, n, last, season)` never returns the piece just played, and a piece written for the city's season is 3 times as likely (`MUSIC.seasonLean`): akhet (the flood) leans to The low reed and The river's turning; peret to First light and Black earth; shemu to the Lullaby and the Harvest song; Night leans nowhere; the title card (no season) leans nowhere. The brief's example put the river piece in peret; the flood is the river's season, so it leans to akhet and Black earth is peret's. Cost if wrong: a one-line data change per piece.

1282. Silence: each gap is drawn uniformly from 60 to 240 s (`gapSeconds(seed, gap index)`), counted from the end of the piece's 4-s ring-out tail; the first piece comes 5 to 20 s after the music is unlocked (`firstWaitSeconds(seed)`). Cost if wrong: a four-minute silence may read as "the music stopped"; nothing on screen says the quiet is intended.

1283. Instruments (all synthesised in the page): the harp is a Karplus-Strong string with a darker burst (soft 0.12), a 2.4-s fall and a little sine body, D2-A4; the low pluck ("piano-like") is the same string rounder (soft 0.2, 1.8-s fall, more body), G2-G4; the low flute is 8.1's ney wave with more second harmonic, G3-A4, a 0.28-s swell, a 4.6-Hz vibrato and a breath of band-passed noise; the pad is a warm saw-like wave through a 700-Hz low-pass, 1.6-s swell, 1.5-s fall, D2-D4; the accent is 8.1's high pluck unchanged, G4-A5; the dum is soft (20-ms front, 420-Hz low-pass), never a tek. Nothing but the accent goes above A4 (tested). Cost if wrong: the timbres are judged by numbers, not by ear; any one is a few constants in `MUSIC`/`STRINGS`.

1284. Seeded variation: each playing is `composePiece(id, seed, play)` with `play` the city's count of pieces begun. It varies how many times each section comes (so the length), the accompaniment pattern, an octave move of the accompaniment on repeats (only when it stays in range), the pad's voicing, grace notes on long tune notes, a 15% chance a tune bar rests on a repeat (never a section's last bar), a second ending, the tempo within 3%, and the accents. Every playing opens with the same written tune, so it stays recognisable (tested). Cost if wrong: a resting bar or a grace note may sound like a slip.

1285. The high pluck is a rare accent: 1 to the piece's own maximum (2, 3 for the river, 4 for night; never more than 4) per playing, on the third beat of bars drawn from the third to the second-last. Cost if wrong: still too present, or missed; one number per piece.

1286. Loudness: no piece louder than 8.1. 8.1's loop was measured with the test's own offline render at volume 1 (calm 180 s, seeds 1/11/99, every season; raid and tense 60 s), and the test holds every piece to the quietest 8.1 ever measured: peak 0.67, loudest 3 s -20.8 dBFS, RMS -23.3 dBFS, mean pitch 528 Hz. The pieces measure peak 0.21-0.40, loudest 3 s -22.1 to -24.1 dBFS, RMS -25.1 to -26.7 dBFS, mean pitch 351-462 Hz. Cost if wrong: at volume 30 the music may feel too faint; the volume setting makes up for it.

## Danger, the programme and the contract

1287. The danger tune is 8.1's raid music softened: `composeDanger` takes `composeBar`'s bar (unchanged) at the danger's tension, moves its pluck an octave lower onto the low string, replaces the frame drum with soft dums only (2 a bar when tense, 4 in a raid) and plays at 60 bpm (8.1: 72); the drones swell with a whole bar's time constant and sit lower (0.04, was 0.062). Measured: raid RMS -25.7 dBFS against 8.1's -22.3, mean pitch 300 Hz against 579. Both 'tense' and 'raid' moods play it (`musicMood` unchanged). Cost if wrong: in a city with frequent fires, tense cuts pieces off often.

1288. The crossfade: when danger starts, the piece's output fades to 0 over 3 s (its notes not yet started never sound, those sounding end with the fade) while the danger tune fades in over 4 s; its three drones start as soon as three voices are free for good. When danger ends, the tune fades out over 5 s, its drones stop, and a gap of silence follows before a newly chosen calm piece; a cut piece is not resumed. Cost if wrong: a cut piece may feel abrupt.

1289. The voice cap stays 8, counted over everything sounding: the drones now exist only during danger (8.1 held 3 of the 8 always), and a flute note counts 2 (its tone and its breath). Cost if wrong: none for the player; the same at most 8 sources a phone renders.

1290. `MUSIC.bpm` is now the danger tune's 60 and `barSeconds()` its bar. In the older tests: `composeBar`'s pure tests stay (it still feeds the danger tune) with the hijaz test's tempo moved to 60; the two that pinned the calm loop (never the same minute twice in half an hour; the ney about once a minute) went, replaced by tests/v82/m; the player tests were rewritten for the programme (first wait, the danger tune a bar at a time, the voice cap with dangers coming and going, hidden/off without catching up); the 40-s sound test renders a piece and the danger tune and no longer asks the calm music never to fall silent. The 7.0 season tests of `composeBar` at tension 0 stay though those calm bars are no longer heard. Cost if wrong: a little dead weight in the suite.

1291. The season's colour is kept per piece: at a piece's start its accent pluck takes `SEASON_MUSIC[season].tone` and the echo's send `wet x SEASON_MUSIC[season].wet` (`SEASON_MUSIC` itself unchanged). The echo is longer than 8.1's slapback for space: 0.36 s, feedback 0.32, low-passed at 1.6 kHz. Cost if wrong: the echo may blur the harp; three numbers.

1292. The contract is kept: createMusic's options and methods, boot.js's wiring, the silent-switch rule, the title card, Music on/off and volume (both act at once through the master gain, in a silence too). Added: an optional `plan` option (choose, gap, firstWait) for tools/music.html, and `state()` now reports phase ('rest', 'piece', 'danger'), until, played, piece, bar and tension. While the page is hidden the context is suspended, so a silence or a piece resumes where it was; notes missed by a jump in time are skipped, never caught up. `composePiece` is pure (no Math.random, Date or performance.now). Cost if wrong: none expected.

1293. tools/music.html lets Josh pick any piece (with seed, play count, volume and season), Render this piece (hear it, see its length, accents and levels, save a WAV), Play it live (3-s gaps), and Play as in game (all pieces, 5-s gaps, 1-s first wait) with a Mood button cycling calm, tense and raid to hear the danger fade in and out. Open it with `python tests/serve.py 8000 .` from the repo and http://127.0.0.1:8000/tools/music.html.

1294. Release: What's new 8.2 "Song of the Nile" (2026-10-26, build 'live') says the seven pieces by name, the one-to-four-minute quiet, each playing different and the season's lean, the softer danger music, and (fixed) the high pluck now rare; 8.1 carries its merge commit ad57f92; APP_VERSION 8.2; the older release pins moved down one place. The release test checks the words against the data (seven pieces, each named, gaps of 60-240 s).
