# Pharaoh Heaven research: FAQs, Walkthroughs, Downloads, Interviews, Egypt History

Source: https://pharaoh.heavengames.com/ (fan site, content (c) Heavengames; everything below is paraphrased for mechanics reference only. No art or data files were taken.)
Method note: pages were read through a summarising fetch tool, so numbers are as that tool reported them. Where a page was silent the gap is stated. No page was unreachable. Pages not read are listed at the end.

---
## 1. Walkers and labour access
Sources: https://pharaoh.heavengames.com/faqs/housing/ , /faqs/bazaars/ , /interviews/alexrodberg/4/
- Two walker classes. **Destination walkers** (cart pushers, entertainers going to a venue, bazaar buyers, hunters, soldiers, immigrants) head for a fixed target and IGNORE roadblocks. **Roaming walkers** (bazaar traders, fire marshals, police, magistrates, water carriers) wander and are stopped by roadblocks; they hand out service to the houses they pass.
- A citizen looking for work behaves like a roaming walker and also cannot pass a roadblock. So roadblocks are the player's tool to confine services and job-seekers to a district. Dev says roadblocks cost 4 deben and were added "for gameplay rather than historical accuracy" (interview p4).
- Labour is a city-wide pool of unemployed citizens, but a building only gets staff if a worker can physically reach it. A central industrial district can draw workers from a small housing block because the pool is city-wide (faqs/docks).
- Long supply trips can break labour access: if a storage yard's cart pushers are away on a very long "get" order, the home building stops sending its labour walker and can lose its workforce (faqs/bazaars).
- Water carriers: random route, turn around at roadblocks, rule of thumb about 27 tiles before turning back; upgraded carriers (near gardens/statues) look different and spawn more often. Water sources must sit on land with groundwater (overlay hotkey W).
- Fire marshals carry limited water and must return to refill; a house with no road access behind another building cannot be reached. Fires that burn too long cannot be saved and leave rubble.
- The starting "Road to Egypt" (map entry/exit road): blocking it makes Pharaoh's engineers demolish buildings starting at the blockage until cleared; leaving it intact causes long walker detours (advice: remove a tile at each end).
- Plazas: dirt roads get paved by citizens in high-desirability areas; plazas can only go on paved road and raise desirability, helping upgrade bazaars, water carriers and houses.
- Housing blocks (a player invention): long double-deep rectangle with services inside, gardens inside with services outside, square blocks, concentric blocks. They give control over goods/service delivery and keep walkers out of floodplains.

## 2. Nile flood, farming calendar and the work-camp labour model
Sources: /faqs/docks/ , /interviews/alexrodberg/ (p1) and /3/ , /faqs/monuments/
- **Flood plain farms** only produce outside flood season. They get no direct staff: they are served by **work camps**, which train farmers and supply monument labour. Farms need road links to camps; closer camps = quicker staffing. Camps themselves need direct labour. Flood plain farms can be irrigated.
- **Meadow farms**: only on meadow tiles (small yellow flowers), need direct labour, lower yield, but different harvest timing from flood farms. Irrigation: water lift on a straight coast or flood plain edge plus ditches (drawn like roads, any direction, no length cap; they pass under roads automatically). A meadow farm counts as irrigated if one corner touches a ditch or two ditch squares are adjacent.
- Work camps fill FARM labour first (food is top priority) and spill leftover workers to monuments. If staffing is short, monument work stops and everyone farms; with surplus both run at once (Rodberg p1). So harvest pauses construction (faqs/monuments).
- Low-fertility "straw farms": grain output under 2,000/yr but every harvest yields a full straw load regardless of fertility or staffing; about 9 small farms gave about 18 straw loads a year in the Itjtawy example. Straw feeds cattle ranches and brickworks/mastabas.
- Barley and flax go only to storage yards, never granaries. Harvest cart pushers need a road and a FULLY staffed accepting building.
- **Nilometer** (Rodberg p3): no building; a pop-up the priests fill with the coming flood forecast. Usually accurate. Players expand on a good-harvest forecast and hold off on a bad one.
- Osiris (god) can improve the flood and fertility, double harvests, or withhold the flood.
- Game autosaves each January and June (faqs/techtips). The FAQs give no month-by-month flood calendar.

## 3. Gods, temples, shrines, festivals
Source: https://pharaoh.heavengames.com/faqs/gods/
- One **patron god** per city; keep at least one more temple to the patron than to any other god. Non-patron ("local") gods want equal numbers of shrines and temples. Each god's total coverage should be >= population.
- Coverage per building: patron temple 375 people, patron shrine 187; local temple 750, local shrine 375.
- Shrines: cheap, need no staff, give no religious-access walkers, but raise the Religion rating; need only be within 2 tiles of a road.
- Temple complexes: very expensive, 50 employees, please the patron strongly, send a priest who raises local desirability; altar/oracle add-ons boost them. (Enhancement Pack gave Mortuary and Valley Temples 0 employees.)
- Festival plazas: 5-tile square over a crossroad; raise desirability but walkers stop and promenade (traffic jams). Hold a common festival roughly every 6 months for the god that has gone longest without one. Festivals take time to organise; a temple or a few shrines calm an angry god faster.
- God moods (11 steps): Enraged, Furious, Angry, Resentful, Displeased, Apathetic, Amiable, Congenial, Sympathetic, Approving, Benevolent. Blue ankhs show mood; lightning bolts warn of imminent bad events.
- Blessings/curses: Osiris = flood/harvest. Ra = Kingdom Rating and trade (12 months of partners paying 150%; angry = lower rating, traders stop). Ptah = fills storage yards with goods/materials (ignored = destroys stored goods). Seth = protects soldiers abroad and strikes enemies (ignored = no protection in next attack). Bast = fills bazaars, raises contentment (angered = plague/illness).

## 4. Kingdom rating, Pharaoh's requests and the four ratings
Sources: /faqs/ratings/ , /faqs/spoilers/ , /interviews/alexrodberg/2/
- Four ratings: **Culture, Prosperity, Monument, Kingdom** (replacing Caesar III's Culture/Empire/Prosperity). Rodberg: separate ratings show balance so a lopsided city is visible, and four keeps players "not concentrating so much on the numbers".
- Culture: count of cultural services (entertainment, education, dentist etc.) relative to population; a building only counts when it has labour (even if out of beer/papyrus). Health coverage counts by share of people reachable. The advisor lists what to add but not how many.
- Prosperity = city income (taxes, exports > imports) + employment (unemployment OR worker shortage hurts) + housing quality. Housing level sets a CEILING (best house Common Residence = prosperity capped). Many missions limit upgrades, so the max can be well below 100.
- Monument rating: per-mission cap, reached by finishing the monument and delivering required grave goods via the Monument overseer (can be dispatched gradually during construction).
- Kingdom rating: meet Pharaoh's requests on time; keep Ra happy; **gifts** to Pharaoh cost a percentage of personal savings, so give early (savings small), at most one per year; lavish gifts earn the most points. Political advisor tracks personal savings and salary.
- Score also includes completion time, money held and army experience.
- Request model (spoilers page): each request has 3 outcomes (on time / late / refuse), each branching the story. Quantity, type and timing are randomised within bounds; higher difficulty = larger quantity, shorter window. Rewards/penalties vary within ranges. Some branches make a mission unwinnable without a restart (refusing Dunqul in Dakhla Oasis; refusing the Saqqara pomegranate gift permanently cuts wood trade).
- Distant battles: losing may close a trade route temporarily (Rowarty) or repeat the request and lower rating (Thinis siege of Men-nefer, about 6 months to respond).

## 5. Entertainment, education, health, water
Sources: /faqs/health/ , /faqs/advisors/ , /faqs/docks/ , /faqs/techtips/
- **Entertainment**: stage buildings (juggler booths, musician/dancer stages, senet house) need a T-intersection; they glow green when valid. Trick: add a temporary road tile to make a T, place, then remove the tile. Feeds Culture rating and housing upgrades (together with goods/food). Variety keeps residents happy. The Diversions advisor counts booths, stages and senet houses. Bandstand/pavilion mechanics are not on the FAQ pages ("Pavilion Configurations" exists only as a download about intersection layouts).
- **Health**: advisor counts apothecaries, physicians, dentists, mortuaries. Physician needed to evolve housing past Spacious Homestead; dentist past Spacious Residence (dentist counts for culture only, not city health); mortuary (needs linen) past Spacious Manor and supports health. Apothecary: malaria near reed gathering sites, and apothecary walkers can contain plague victims. More than one food type improves city health. Plague breaks out when health is poor; victims spread along roads killing residents of houses passed; contain by deleting road tiles or an apothecary walker. Contaminated water is a scripted event in several missions.
- **Education**: Learning advisor reports active scribal schools and libraries and capacity. Enhancement Pack: Common and Spacious Residences require school/library access on all difficulties. Very Easy waives some food/religion/education housing requirements.
- **Water**: groundwater overlay; carriers (see section 1). The FAQ pages do not contrast wells with a water supply.
- **Housing goods in order**: pottery, beer, linen, luxury goods. Luxury turns residents into scribes: they leave the workforce but pay high taxes.

## 6. Police, crime, taxes, palace
Sources: /faqs/health/ , /faqs/advisors/ , /walkthroughs/predynastic/
- Crime comes from unemployment, high taxes, hunger, or missing festivals; police stations/courthouses cover housing and industrial blocks; crime overlay (C). Tax collectors get robbed when criminals spawn nearby. Crime lingers after the cause is fixed.
- Default tax rate 9%. Complaints appear if collection coverage is only about half the population. Short-term fix: cut the rate to 5% for a month or two. Long-term: more tax collectors, coverage well above 50%. Treasury advisor shows income/expenses, last year's ledger, tax rate and the percentage of residents registered.
- A "village palace" appears in early missions (Thinis) as a desirability building. Taxes matter early in Rostja (first 20 years).
- Wages: Workers overseer shows wages; the player's personal salary is set under Political.
- Wildlife control: police along animal paths, archers in groups, infantry best; towers/walls/statues/gardens as barriers (faqs/misc).

## 7. Trade, docks, industry, storage
Sources: /faqs/docks/ , /faqs/bazaars/ , /interviews/alexrodberg/4/
- Caravans/ships only arrive with a clear path to a FULLY staffed storage yard; ferry labour gaps can block trade. A trader leaves empty if yard stock is below the export level set in Commerce at arrival time. Trade capacity 800 units per trip; the number of caravans on the map is capped; each city has a yearly quota on the world map and stops trading when it is hit.
- Commerce advisor: manual import/export amounts stay fixed; advisor-set amounts rise as more workshops use a good.
- Storage yard controls (Rodberg p4): get / empty / accept / don't accept, plus a "get amount" of 1/4, 1/2, 3/4 or full. Dev calls storehouses more important than markets; new players can ignore the controls.
- Bazaar: 2 buyers (one food from granaries, one goods from storage yards); upgraded bazaars (near temples/gardens) have specialised buyers. The bazaar trader hands out to nearby houses. Home-grown food needs granaries; storage yards take food priority over granaries unless capped.
- Ferries: both banks need staff; one broken side stops it. A cut-off bank loses its road link; buildings devolve gradually with complaints first (softer than Caesar III).
- Fishing needs a shipwright; hunting has one game type per mission (ostrich, waterfowl or antelope); cattle ranches need straw.

## 8. Monuments (core goal system)
Sources: /faqs/monuments/ , /interviews/alexrodberg/ (p1)
- 19 monuments across 7 types (correcting an early "9" rumour); most come in 3 sizes, pyramids in 4 (Great = Khufu-size); Sun Temple and Sphinx one size.
- Monuments are usually the mission goal AND a visible progress marker; the dev logic is that a city able to build one is already thriving.
- Pyramid build uses the circling wooden ramp (not the long ramp), chosen for gameplay and ease of implementation. Burial chamber is auto-generated.
- Stone-block monuments need a minimum stockpile (about 240 blocks, about 8 storage yards) before work starts; bricks need at least 400 in one yard. Stockpiling a needed material freezes it. Stone haulers stall without carpenters/wood for ramps. Entrance mat must be unblocked. Rule of thumb about 2 work camps per stonemason guild. Construction can stall at 99% when a worker is stranded; delete/rebuild camps to respawn labour.
- Grave goods must be dispatched via the Monument overseer for score.
- Succession (Rodberg p5): if the ruler dies before finishing, the heir completes it; family name constant with a generation numeral; must finish the monument before the next scenario; time limits on monument missions.

## 9. Overlays, advisors and UI feel
Source: /faqs/advisors/ , /faqs/techtips/
- Advisors: Chief, Workers, Military, Political, Ratings, Commerce, Granaries (population stats lag one month), Public Health, Learning, Diversions, Temples, Treasury, Monuments. Some are hidden in early missions (progressive disclosure).
- Overlays/hotkeys: W water, F fire, D damage, C crime, T trouble, ~ workers, 9 temples. Map rotation via pyramid compass icon / PgUp PgDn, Home resets. Statues and temple complexes rotate with R.
- Beginner mistakes recorded: blocking the Road to Egypt; barley/flax to granaries; understaffed buildings refusing harvest; long-distance gets killing labour access; reading granary data as current; fixing trade quantities by hand; refusing early gifts; placing housing before monuments (monuments have strict terrain rules); unemployment readout lagging.
- Beginner advice: use the career path (first cities are tutorials), pause with P, 10% speed, Very Easy/Easy first (difficulty changes starting money, costs, fire/disease/damage risk and enemy strength; Very Easy waives some housing requirements), "for sale" signs by roads attract immigrants, save an untouched copy of the starting map.

## 10. Military (peripheral)
Sources: /faqs/military/ , /interviews/alexrodberg/6/
- Recruiter trains one soldier at a time; infantry need weapons (weaponsmith + copper), archers need none; academy raises effectiveness. Company size 16, boards a transport only when all are present. Chariots are strongest; Hyksos the hardest enemy. Sea invasions in late missions: kill transports first, then warships. Troops that leave the city cannot be directed (developer: Pharaoh is a city builder, not a war sim).

---
## Mission structure (from walkthroughs)
Index: https://pharaoh.heavengames.com/walkthroughs/ . 24 mission slots in 5 periods: Predynastic (3 teaching missions), Archaic (Nekhen, Men-Nefer, Timna, Behdet/Abedju), Old Kingdom (Selima/Abu, Saqqara, Serabit Khadim/Meidum, Buhen/S. Dahshur, N. Dahshur, Iunet/On, Rostja, Bahariya/Djedu, Dunqul/Dakhla), Middle Kingdom (Thinis/Waset, Kebet/Menat Khufu, Itjtawy, Iken/Sawu, Heh/Bubastis), New Kingdom (Khmun/Sauty, Byblos/Baki, Rowarty/Hetepsenusret). From mission 7 onward most slots offer a **military OR peaceful branch**, and the two branches reconverge. Rulers die and heirs take over (Saqqara: heir takes Serabit Khadim or Meidum).

Mission brief contents (as shown on walkthrough pages): a requirements list - population, a named housing level and count, Culture / Prosperity / Monument / Kingdom rating targets, sometimes extra buildings (e.g. 6 Stately Manors) - plus scripted request/gift/event timelines by month-year (60+ and 100+ game years in late missions). The briefing is reached via an Ankh on the control panel; after the Enhancement Pack the required housing level also shows on the Ratings panel.

| Mission | Win targets and notes |
|---|---|
| Nubt (1st) | 6 Meager Shanties (pop about 150 on the way); food = bazaar, granary, hunting lodge |
| Thinis (Predynastic) | 10 Ordinary Cottages; palace + Bast temples for desirability |
| Perwadjyt | pop 600 + 10 Modest Homesteads; work camps, fig farms, clay/potters, gardens/statues/plazas |
| Nekhen | pop 1,000 + 10 Modest Apartments; "simple", first housing evolution |
| Men-Nefer | pop 1,500, Culture 15, Prosperity 20, Monument 9 (small mastaba), Kingdom 40; first TRADE (papyrus), malaria, Pharaoh sends bricks for papyrus |
| Saqqara | pop 3,500, Culture 0, Prosperity 15, Monument 19 (medium step pyramid, 672 stone), Kingdom 50; requests (game meat, money, luxury), falling wages, sandstorms, contaminated water, trap gift |
| Rostja (Giza) | Monument 53 (Sphinx + pyramid complex + pyramid), Kingdom 50, no pop/culture/prosperity target; about 60 game years; gems/luxury trade, army of 2 infantry + 2 archer companies, Libyan invasions, extortion; advice not to upgrade housing past Ordinary Cottage |
| Itjtawy | pop 7,500, Culture 60, Prosperity 60, Monument 33, Kingdom 85, 6 Stately Manors; early meat requests, linen export, many dated requests with 6-10 month deadlines |
| Rowarty | pop 7,000, Culture 65, Prosperity 50, Monument 29, Kingdom 80; sea invasions, distant land/sea battles, papyrus export funds 6 warship wharves |
| Hetepsenusret (finale) | pop 12,000, Culture 80, Prosperity 80, Monument 70 (large mudbrick pyramid complex + pyramid + mausoleum), Kingdom 75; 10 request types, contaminated water, 100+ game years |

Ramp pattern: the first 3 missions are one-line housing-level goals that each teach a subsystem (food, desirability, industry). Ratings and trade enter together at Men-Nefer, then monuments scale from small mastaba (9) to step pyramid (19) to the Giza complex (53) to 70. Population goal rises about 150 -> 600 -> 1,000 -> 1,500 -> 3,500 -> 7,000-7,500 -> 12,000. Later missions lean on SCRIPTED scenario events (requests, extortion, invasions, price shocks) so difficulty comes from events, not just size. Not every mission uses all four ratings (Rostja zeroes culture and prosperity). Authors repeatedly note events are semi-random, so "your game may differ". Starting resources and full build orders were absent from most pages.
Pages read: /walkthroughs/predynastic/ , /nehken/ , /mennefer/ , /saqqara/ , /rostja/ , /itjtawy/ , /rowarty/ , /hetepsenusret/ (all under https://pharaoh.heavengames.com).

## Downloads (what players make)
Sources: https://pharaoh.heavengames.com/downloads/ , lister.php?category=scenarios , category=misc (nothing downloaded)
Categories: Pharaoh Scenarios (155), Pharaoh Completed cities (636), Cleopatra Scenarios (296), Cleopatra Completed cities (396), Miscellaneous (84), Patches (13). Newest uploads are from 2026, so the community is still active.
What players make: sieges and defence scenarios, resource-starved economy challenges (a game-meat-only prosperity map, thin-margin maps), rule-twist maps (hidden weapons industry, unpredictable Pharaoh, forced walkers), sandbox/test maps (80+ events), scale extremes (tiny map, huge pyramid complex, a whole campaign in one scenario). Utilities: desirability calculators, a labour calculator, a city layout designer, a minimap generator, housing-block testers and diagrams, a hotkey script for modern controls, a production/consumption/housing reference text, custom messages and audio. Takeaway: players love puzzles built from constraints, and spend effort optimising housing blocks and desirability.

## Developer intent (interviews)
Index https://pharaoh.heavengames.com/interviews/ . Alex Rodberg (Impressions, Sept 1999, 7 pages) /interviews/alexrodberg/ through /7/:
- Built on the Caesar III engine to refine existing systems from player feedback (for example gentler devolution: residents complain first, then the house regresses).
- Ratings kept to expose balance. Monuments chosen as goals and progress markers; mechanics are introduced gradually; early play is survival, not conquest.
- Work camps abstract labour: farm first, monument second; farms and monuments do not spawn walkers themselves.
- Ferries instead of bridges for placement flexibility; either bank can fail silently.
- Nilometer is information, not a building. The empire map is dynamic (armies and caravans visible) to inform decisions; troops cannot be commanded outside the city; opening trade routes still costs money/gifts.
- Roadblocks "mostly for gameplay"; redesigned bazaar with two buyers; storehouse controls with 1/4-1/2-3/4 fill levels as optional micro-management.
- Campaign is a family rising through the nobility, with succession and time limits on monument missions; veterans flee less; no fixed on-screen sprite cap. About 18 months, 40 people, about 40 cities of campaign content; map editor after release; no graphics customisation.
Cleopatra interview (/interviews/cleopatra/ , /2/): expansion fills the gap before Tutankhamun, Ramses II and Cleopatra; 20 new missions with lighter beginner settings; ships with Enhancement Pack and scenario editor (terrain, resources, events, invaders, requests); new henna/dye/lamp industries for underground tombs; new animals (scorpion, lion, asp); 4 campaigns (Valley of the Kings, Ramses II, Ancient Conquerors, Alexandria). Developed by Breakaway Games. Intent: variety.
Zeus interview (/interviews/zeus/ , /2/): contrasts Pharaoh (player is a servant rising in an empire, wider world layer) with Zeus (independent city-state, diplomacy, colonies); a mission becomes a goal inside a polis rather than a single city.

## Egypt History section
https://pharaoh.heavengames.com/egypt/ : educational background only. Has a list of Pharaohs, a general history (Old Kingdom so far), a Pyramids of Egypt intro and Trivia on daily life and death. Flavour reading, no mechanics.

## "Feel" details (what players praise or complain about)
- Praised or relied on: roadblocks and road tiles as the main control lever; housing blocks as a craft; monuments as visible progress; mission storylines that branch.
- Complained about (explicit in FAQs): Saqqara pomegranate trap "poorly designed"; Iunet kingdom-rating bug; monument construction stalling at 99%; hidden failure modes (understaffed ferry, drowning cart pushers, lost labour access) that give little feedback; some branches unwinnable; stale advisor data (granary population one month old, unemployment readout); fire marshals unable to reach back-row houses; fiddly T-junction placement for entertainment.

## Images seen
(all fan-site assets; mission shots are the author's screenshots of the original game, listed only as references, not to be reused)
- Advisor icon buttons: https://pharaoh.heavengames.com/wp-content/uploads/sites/2/2021/02/{chiefbutton,workersbutton,militarybutton,politicalbutton,ratingsbutton,commercebutton,popbutton2,healthbutton,learningbutton,diversionsbutton,templesbutton,treasurybutton,monumentsbutton}.jpg
- Mission screenshots/art: https://pharaoh.heavengames.com/wp-content/uploads/sites/2/2021/02/{nubt,thinis,perwadjyt,nekhen,mennefer,saqqara,rostja,itjtawy,rowarty,hetepsenusret,reflection}.jpg
- Site navigation icons: https://pharaoh.heavengames.com/wp-content/themes/pharaoh/images/navigation/{court,forum,strategy,downloads,faqs,buildings,links,misc,sitemap}.png

## Pages read / not read
Read: FAQ index and all 12 FAQ category pages (techtips, housing, bazaars, advisors, gods, health, docks, ratings, military, spoilers, monuments, misc); walkthrough index and 8 mission walkthroughs; downloads index plus scenarios and misc listings; interviews index, Rodberg pp1-7, Cleopatra pp1-2, Zeus pp1-2; Egypt index.
Not read: Cleopatra interview pp3-4, Zeus pp3-5, the other 16 walkthroughs, /strategy/ pages (charts, commodity data sheets, housing blocks), and /buildings/ (likely the best source of building stats; recommended next).
