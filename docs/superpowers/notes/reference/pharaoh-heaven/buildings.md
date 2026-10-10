# Pharaoh Heaven - Buildings reference (mechanics and numbers only)

Source site: https://pharaoh.heavengames.com/ (fan site; site states contents are (c) their authors and reuse needs permission - this file is a design-reference digest of numbers and mechanics, not a copy of text or art).
Date read: 2026-10-10.

## Coverage and caveats

- The "Buildings" section (https://pharaoh.heavengames.com/buildings/) has NO per-building pages. It is an index of 9 category pages, each one table. Columns: Name, Cost (deben), Employees needed, Effect on Desirability (+/- symbols only, no radius), Risk of fire, Risk of collapse, Notes. No walker, no upkeep, no size, no production rates on those pages.
- The richer numeric data lives in VitruviusAIA's Charts (https://pharaoh.heavengames.com/strategy/charts/): Structures Chart parts 1-4 (size, employees, cost by difficulty, desirability radius per tile, fire and collapse risk by difficulty) and Housing Charts 1-2. These are reproduced below and used to fill the gaps. Walker types and ranges, upkeep, and production rates are NOT on any page I read; the site does not publish them there.
- There is no separate Housing building category in /buildings/. Housing is covered by the charts (section "Housing").
- Page-extraction caveat: the fetch tool flattens tables. Where the Fire and Damage (collapse) columns were ambiguous I cross-checked with the category pages (Yes/blank flags). Treat per-row fire/damage mapping in the chart tables as "probably right, verify against the original if it matters".
- Difficulty levels in the charts: VH = Very Hard, H = Hard, N = Normal, E = Easy, VE = Very Easy. Cost, fire risk and damage risk all vary by difficulty; employees and desirability do not. Cost figures below are Normal unless a row lists VH/H/N/E/VE.
- Desirability notation in charts: D1..D6 = effect at 1..6 tiles from the structure (D1 is adjacent). Max range is 6 tiles. Values identical across difficulties.
- (*) = needs Cleopatra expansion.

## Categories the site uses (Buildings section)

1. Food and Farming - https://pharaoh.heavengames.com/buildings/food/
2. Industrial Structures (sub-tables: Industry, Raw Materials, Construction Guilds) - https://pharaoh.heavengames.com/buildings/industry/
3. Storage and Distribution - https://pharaoh.heavengames.com/buildings/storage/
4. Entertainment - https://pharaoh.heavengames.com/buildings/entertainment/
5. Religion - https://pharaoh.heavengames.com/buildings/religion/
6. Education - https://pharaoh.heavengames.com/buildings/education/
7. Health and Sanitation - https://pharaoh.heavengames.com/buildings/health/
8. Municipal Structures (sub-tables: Municipal, Beautification, Water Crossings) - https://pharaoh.heavengames.com/buildings/municipal/
9. Military Structures (sub-tables: Military, Defensive) - https://pharaoh.heavengames.com/buildings/military/

Key stated on the index page: Name; Cost in deben; Employees needed "for maximum capacity and efficiency"; Desirability (whether people want it nearby); Risk of fire "without a nearby firehouse"; Risk of collapse "without an engineer passing by"; Notes (anything else needed).

Intro lines per category: Food/Farming keeps people fed and happy; Storage/Distribution moves food and goods from farms and workshops to homes; Entertainment evolves housing, keeps people happy and boosts the culture rating; Religion - gods get annoyed and take revenge on a city without them; Education affects culture and prosperity ratings, which suffer if you do not build enough; Health protects from plague and boosts culture rating.

---

## 1. Food and Farming
URL: https://pharaoh.heavengames.com/buildings/food/ (flags: fire/collapse from category page; sizes and desirability from https://pharaoh.heavengames.com/strategy/charts/struct1/ and struct2/)

| Building | Size | Cost | Employees | Fire | Collapse | Desirability (D1..D6) | Needs / notes |
|---|---|---|---|---|---|---|---|
| Farm (meadow) | 3x3 | 40 | 10 | No | No | -2,-1,0,0,0,0 | Grows one crop: barley, chickpea, lettuce, fig, flax, grain or pomegranate |
| Farm (floodplain) | 3x3 | 40 | 0 | No | No | -2,-1,0,0,0,0 | Floodplain farms need no workers |
| Cattle Ranch | 3x3 | 75 | 12 | Yes | No | -4,-3,-2,-1,0,0 | Needs straw to operate |
| Fishing Wharf | 2x2 | 60 | 6 | Yes | Yes | -8,-8,-6,-6,0,0 | Straight stretch of coastline; needs a shipwright (but not wood) to operate |
| Hunting Lodge | 2x2 | 25 | 6 | (fire 25 N) | none | -4,-2,0,+2,0,0 | In chart only (not on the Food page); odd desirability: positive at 4 tiles |
| Irrigation Ditch | 1x1 | 8 | - | No | No | 0 | - |
| Water Lift | 2x2 | 30 | 5 | No | No | -3,-2,-1,0,0,0 | Straight coastline or next to floodplain |
| Work Camp | 2x2 | 60 | 20 | Yes | - | -3,-2,-1,0,0,0 | Supplies labour for monuments (role not stated on page) |

Chart costs (VH/H/N/E/VE): Farm 60/48/40/32/8; Cattle Ranch 112/90/75/60/15; Fishing Wharf 90/72/60/48/12; Hunting Lodge 37/30/25/20/5; Irrigation Ditch 12/10/8/7/2; Water Lift 45/36/30/24/6; Work Camp 90/72/60/48/12.
Fire risk N: Cattle Ranch 5 (7/6/5/4/1); Fishing Wharf 20 (30/24/20/15/4); Hunting Lodge 25 (37/30/25/20/5); Work Camp 20. Damage N: Fishing Wharf 5 (7/6/5/4/1).

## 2. Industrial Structures
URL: https://pharaoh.heavengames.com/buildings/industry/ (flags/notes); sizes, desirability, risk from struct1/struct2 chart pages.

### 2a. Industry (processing)
| Building | Size | Cost (N) | Emp | Fire | Collapse | Desirability D1..D6 | Needs |
|---|---|---|---|---|---|---|---|
| Brewery | 2x2 | 75 | 12 | Yes | No | -5,-4,-3,-2,-1,0 | Barley |
| Brickworks | 2x2 | 60 | 12 | Yes | No | -4,-3,-2,-1,0,0 | Straw and clay (fire risk only 10 N) |
| Jeweler | 2x2 | 90 | 12 | Yes | No | -2,-1,0,0,0,0 | Gems |
| Papyrus Maker | 2x2 | 100 | 12 | Yes | No | -4,-3,-2,-1,0,0 | Reeds |
| Potter | 2x2 | 60 | 12 | Yes | No | -4,-3,-2,-1,0,0 | Clay |
| Shipwright | 3x3 | 350 | 20 | Yes | Yes | -12,-12,-10,-10,-8,-8 | Wood (except for fishing boats) |
| Weaver | 2x2 | 80 | 12 | Yes | No | -3,-2,-1,0,0,0 | Flax |
| Lamp Maker* | 2x2 | 100 | 12 | Yes | No | -4,-3,-2,-1,0,0 | Cleopatra expansion only |
| Paint Maker* | 2x2 | 100 | 12 | Yes (15 N) | Yes (5 N) | -4,-3,-2,-1,0,0 | Cleopatra only |

### 2b. Raw materials
| Building | Size | Cost (N) | Emp | Fire | Collapse | Desirability D1..D6 | Placement |
|---|---|---|---|---|---|---|---|
| Clay Pit | 2x2 | 40 | 8 | No | Yes | -3,-2,0,0,0,0 | Next to water or floodplain |
| Copper Mine | 2x2 | 150 | 10 | No | Yes | -12,-12,-10,-10,-8,-8 | Next to ore-bearing rock |
| Gemstone Mine | 2x2 | 400 | 8 | No | Yes | -12,-12,-10,-10,-8,-8 | Next to rocks |
| Gold Mine | 2x2 | 250 | 12 | No | Yes | -16,-16,-13,-13,-10,-10 | Next to ore-bearing rock |
| Granite Quarry | 2x2 | 100 | 12 | No | Yes | -6,-5,-4,-3,-2,-1 | Next to rocks |
| Limestone Quarry | 2x2 | 75 | 12 | No | Yes | -6,-5,-4,-3,-2,-1 | Next to rocks |
| Plain Stone Quarry | 2x2 | 75 | 12 | No | Yes | -6,-5,-4,-3,-2,-1 | Next to rocks |
| Sandstone Quarry | 2x2 | 50 (chart) / 80 (category page) | 12 | No | Yes | -6,-5,-4,-3,-2,-1 | Next to rocks. Costs disagree between the two pages |
| Reed Gatherer | 2x2 | 50 | 8 | Yes (10 N) | No | -2,-1,0,0,0,0 | Best near marshland |
| Wood Cutter | 2x2 | 80 (category) / 50 (chart) | 12 (category) / 8 (chart) | Yes | No | -4,-3,-2,0,0,0 | Best near forest. Cost and employees disagree between pages |

### 2c. Construction guilds (needed for monuments)
| Building | Size | Cost (N) | Emp | Fire | Collapse | Desirability D1..D6 | Notes |
|---|---|---|---|---|---|---|---|
| Bricklayers' Guild | 2x2 | 100 | 10 | Yes (10 N) | Yes (10 N) | -6,-5,-4,-3,0,0 | Monument bricks |
| Carpenters' Guild | 2x2 | 50 | 8 | Yes (20 N) | No | -6,-5,-4,-3,0,0 | |
| Stonemasons' Guild | 2x2 | 150 (category) / 225 VH.. N=150 | 12 | No | Yes (1 on chart rows) | -6,-5,-4,-3,0,0 | |
| Artisans' Guild* | 2x2 | 150 | 20 | Yes (10 N) | Yes (10 N) | -6,-5,-4,-3,0,0 | Cleopatra only |

Chart costs VH/H/N/E/VE: Brewery 112/90/75/60/15; Brickworks 90/72/60/48/12; Jeweler 135/110/90/75/18; Papyrus 150/120/100/80/20; Potter 90/72/60/48/12; Shipwright 525/420/350/280/70; Weaver 120/96/80/64/16; Clay Pit 60/48/40/32/8; Copper Mine 225/180/150/120/30; Gem Mine 600/480/400/320/80; Gold Mine 375/300/250/200/50; Granite 150/120/100/80/20; Limestone and Plain Stone 112/90/75/60/15; Sandstone 75/60/50/40/10; Reed 75/60/50/40/10; Wood Cutter 75/60/50/40/10; Bricklayers 150/120/100/80/20; Carpenters 75/60/50/40/10; Stonemasons 225/180/150/120/30; Artisans 225/180/150/120/30; Paint Maker 150/120/100/80/20; Lamp Maker 150/120/100/80/20.
Damage risk (collapse) VH/H/N/E/VE: quarries 7/6/5/4/1; mines 15/12/10/8/2; Shipwright 7/6/5/4/1; Clay Pit 7/6/5/4/1; Bricklayers and Artisans 15/12/10/8/2.
Fire risk VH/H/N/E/VE: most workshops 30/24/20/15/4 (N=20); Brickworks, Reed Gatherer, Bricklayers, Artisans 15/12/10/8/2; mines/quarries none.

## 3. Storage and Distribution
URL: https://pharaoh.heavengames.com/buildings/storage/ + chart pages

| Building | Size | Cost (N) | Emp | Fire | Collapse | Desirability | Notes |
|---|---|---|---|---|---|---|---|
| Bazaar | 2x2 | 40 | 5 | Yes | No | -2,-1,0,+1,+2,+3 | Chart: negative adjacent, positive further away. Page note: more desirable to live close to a bazaar than right next to one. Chart cost 60/48/40/32/8 |
| Dock | 3x3 | 100 | 12 | Yes | Yes | -12,-12,-10,-10,-8,-8 | Must be on straight Nile coastline. Chart cost 150/120/100/80/20 |
| Granary | 4x4 | 250 | 12 | Yes | Yes | -8,-6,-4,-2,0,0 | Chart cost 375/300/250/200/50 |
| Storage Yard | 3x3 | 70 | 12 (page) / 6 (chart) | Yes | Yes | only north corner square generates: -5,-5,-3 | Chart cost 105/84/70/56/14. Desirability only from the "N" corner tile where the worker stands, so a yard NE/NW of a road has no effect on houses across the road (https://pharaoh.heavengames.com/strategy/charts/struct3/) |

Fire N 20 (30/24/20/15/4); damage N 5 (7/6/5/4/1) for Dock, Granary, Storage Yard.

## 4. Entertainment
URL: https://pharaoh.heavengames.com/buildings/entertainment/ ; diagrams https://pharaoh.heavengames.com/strategy/charts/struct4/

| Building | Size | Cost (N) | Emp | Fire | Collapse | Desirability | Notes |
|---|---|---|---|---|---|---|---|
| Booth | 2x2 | 50 | 8 | Yes (20 N) | none | + (only the 1x1 juggler stage generates: +2,+1) | Fits one juggler; must sit over an intersection. Chart cost 75/60/50/40/10 |
| Bandstand | 3x3 | 150 | 12 | Yes (20 N) | none | + (diagram below) | Musician stage plus juggler booth; over an intersection. Chart cost 225/180/150/130/30 |
| Pavilion | 4x4 (chart) | 500 | 20 | Yes (20 N) | none | ++ (diagram below) | Dance floor + musician stage + juggler booth; over an intersection. Chart cost 750/600/500/400/100 |
| Juggler's School | 2x2 | 50 | 5 | Yes | none | +2,+1,0 | Trains jugglers for Booths, Bandstands, Pavilions. Chart cost 75/60/50/40/10 |
| Conservatory | 3x3 | 100 | 8 | Yes | none | -3,-2,-1,0 | Trains musicians (Bandstands and Pavilions). Chart cost 150/120/100/80/20 |
| Dance School | 4x4 | 150 | 10 | Yes | none | -3,-2,-1,0 | Trains dancers (Pavilions). Chart cost 225/180/150/120/30 |
| Senet House | 4x4 | 1500 | 25 | Yes (5 N) | Yes (5 N) | -6,-4,-2,0 | Requires a beer supply; consumes goods; chart cost 2250/1800/1500/1200/300 |
| Zoo* | 6x6 | 2000 | 30 | Yes (5 N) | Yes (5 N) | -6,-4,-2,0 | Cleopatra only; counts as a "40" entertainment for housing like Senet House; chart cost 2600/2200/2000/1500/500 |
| Festival Pavilion/Square | 5x5 | 500 | - | - | - | +++ : 16,16,13,13,10,0 | Must be on a crossroads; required to hold festivals (religion page calls it Festival Square) |

### Entertainment desirability diagrams (struct4)
Generating stage values only (not whole footprint): Pavilion dance stage 2x2 tiles: +6,+5,+4,+3,+2,+1; music stage (1x2, each tile): +4,+3,+2,+1; juggler stage: +2,+1; garden tiles +3,+2,+1; roads no effect. Fields sum where radii overlap. Example Pavilion peak at the dance floor is about 15 on the adjacent tiles; the outer ring is 1. Bandstand peak about 11. Booth peak about 2.
Entertainment value for housing evolution (hous1): Juggler = 10, Musician = 20, Dancer = 30, Senet House (or Zoo) = 40; "entertainment bonus" adds up to 20 points.

## 5. Religion
URL: https://pharaoh.heavengames.com/buildings/religion/ + chart pages

| Building | Size | Cost (N) | Emp | Fire | Collapse | Desirability | Notes |
|---|---|---|---|---|---|---|---|
| Shrine | 1x1 | 100 | 0 | none | Yes (5 N) | + : 2 at N (4,3,2,1,0,0 VH..?) chart row = 4/3/2/1/0/0 | Dedicated to Osiris, Ra, Ptah, Seth or Bast |
| Temple | 3x3 | 150 | 8 | none | Yes (10 N) | ++ : 6,6,4,4,2,2 | Any major god. Chart cost 225/180/150/120/30 |
| Temple Complex | 13x7 | 2000 | 50 | none | Yes (10 N) | ++++ : commonly cited +20,+20,+16,+16,+12,+12 but Brugle says true effect comes from the 3x9 built-up part as three 3x3 blocks; low part gives nothing; adjacent +36 at one end, +12 at the other, up to +48 along the sides | Altar and Oracle (minor gods) addable later for 900 db each (chart: 1350/1080/900/720/180 each); additions do not change desirability. Chart cost 3000/2400/2000/1600/400 |
| Festival Square | 5x5 | 500 | - | - | - | +++ | Crossroads; needed to hold festivals |

Housing links: Common Shanty needs access to 1 god; Fancy Residence needs 2 gods; Elegant Manor needs 3 gods (not required on Easy until Stately Manor).

## 6. Education
URL: https://pharaoh.heavengames.com/buildings/education/ + chart

| Building | Size | Cost (N) | Emp | Fire | Collapse | Desirability | Notes |
|---|---|---|---|---|---|---|---|
| Scribal School | 2x2 | 150 | 10 | Yes (30 N) | No | + : 4,3,2,1,0,0 | Needs papyrus; consumption rises with difficulty. Chart cost 225/180/150/120/30 |
| Library | 3x3 | 450 db + 500 papyrus (page) | 30 | Yes (30 N) | Yes (5 N) | ++ : 8,8,6,6,4,4 | Needs papyrus deliveries; consumption rises with difficulty. Chart cost 675/540/450/360/90; fire 45/36/30/25/6; damage 7/6/5/3/1 |

## 7. Health and Sanitation
URL: https://pharaoh.heavengames.com/buildings/health/ + chart

| Building | Size | Cost (N) | Emp | Fire | Collapse | Desirability | Notes |
|---|---|---|---|---|---|---|---|
| Apothecary | 1x1 | 30 | 5 | Yes (20 N) | none | + : 1 | Chart cost 45/36/30/24/6 |
| Dentist | 1x1 | 50 | 2 | Yes (20 N) | none | + : 2,1 | No effect on city health; boosts culture rating and desirability; chart cost 75/60/50/40/10 |
| Physician | 2x2 | 50 | 8 | Yes (15 N) | none | + : 2,1 | Chart cost 75/60/50/40/10 |
| Mortuary | 2x2 | 100 | 8 | Yes (20 N) | none | - : -3,-3,0 | Needs linen to function; consumption rises with difficulty |
| Water Supply | 2x2 | 50 | 5 | none | none | + : 4,3,2,1,0,0 | Must be on grassland; chart cost 75/60/50/40/10 |
| Well | 1x1 | 5 | 0 | none | none | + : 1 | Must be on grassland; chart cost 7/6/5/4/1 |

Page says health structures protect citizens from plague. Housing chart gives per-level disease risk and malaria risk (see Housing). Malaria risk only exists on maps with reeds.

## 8. Municipal Structures
URL: https://pharaoh.heavengames.com/buildings/municipal/ + chart pages

### 8a. Municipal
| Building | Size | Cost (N) | Emp | Fire | Collapse | Desirability | Notes |
|---|---|---|---|---|---|---|---|
| Architect's Post | 1x1 | 30 | 5 | none | Yes (2 N) | 0 (page: -?) | Collapse prevention walker. Chart cost 45/36/30/24/6 |
| Firehouse | 1x1 | 30 | 6 | Yes (2 N) | none | - : -2,-1 | Fire prevention walker. Chart cost 45/36/30/24/6 |
| Police Station | 1x1 | 30 | 6 | Yes (10 N) | none | - : -2,-1 | Chart cost 45/36/30/24/6 |
| Courthouse | 3x3 | 150 | 10 | none (page flags unclear) | Yes (5 N) | ++ : 8,8,6 | Stores part of the treasury; can be robbed by thieves. Chart cost 225/180/150/120/30. Also a housing evolution requirement (Spacious Apartment) |
| Tax Collector | 2x2 | 75 | 6 | Yes | none | + : 3,2,1 | Does not work until a palace is built; stores some city treasury |
| Palace, Village | 4x4 | 900 | 20 | Yes | Yes | +++ : 20,20,16,16,0,0 | Partly on grassland; collects taxes; stores part of city funds. Chart 1350/1080/900/720/180 |
| Palace, Town | 5x5 | 1000 | 25 | Yes | Yes | +++ : 22,22,17,17,12,0 | As above. Chart cost 1500/1200/1000/800/200 |
| Palace, City | 6x6 | 1200 | 30 | Yes | Yes | ++++ : 24,24,18,18,12,12 | As above. Chart cost 1800/1440/1200/950/240 |
| Mansion, Personal | 3x3 | 150 | 0 | Yes | Yes | ++ : 12,12,10,10,0,0 | Partly on grassland; stores personal savings. Chart 225/180/150/120/30 |
| Mansion, Family | 4x4 | 400 | 0 | Yes | Yes | +++ : 20,20,17,17,14,0 | Chart 600/480/400/320/80 |
| Mansion, Dynasty | 5x5 | 700 | 0 | Yes | Yes | ++++ : 28,28,24,24,20,20 | Chart 1050/840/700/560/140 |
| Road Block | 1x1 | 4 | 0 | none | none | 0 | Stops service walkers from getting out of hand (blocks walker pathing). Chart cost 6/5/4/4/1 |
| Road | 1 tile | 4 (chart 6/5/4/3/1) | 0 | none | none | 0 | |

Fire N for palaces and mansions 20; damage N 5 (7/6/5/4/1).

### 8b. Beautification
| Building | Size | Cost (N) | Desirability |
|---|---|---|---|
| Garden | 1x1 | 12 | + : 3,2,1 (chart cost 18/14/12/10/3) |
| Plaza | 1 tile | 15 | + : 4,2 ; must be on a paved road (chart cost 22/18/15/12/3) |
| Statue, Small | 1x1 | 12 | + : 3,2,1 |
| Statue, Medium | 2x2 | 60 | ++ : 10,8,6,4 (chart 90/72/60/48/12) |
| Statue, Large | 3x3 | 150 | +++ : 14,14,12,12,10,0 (chart 225/180/150/120/30) |

(Note: the page's category table lists plaza and gardens at 15/12 deben; the chart row for Plaza reads 4,2,0..)

### 8c. Water crossings
| Structure | Size | Cost | Emp | Notes |
|---|---|---|---|---|
| Bridge | 1 tile wide | depends on length (chart 40 N per... listed 60/48/40/32/8) | 0 | Max length 4 squares |
| Ferry Landing / Ferry Terminal | 2x2 | 40 | 5 | Must be placed in pairs on opposite sides of a river; without employees only immigrants and emigrants can cross. Desirability -5,-5,-3,-3 |

Other chart rows: Burning Structure and Collapsed Rubble both give -3,-2,-1 desirability. Clear/Demolish cost 3/3/2/2/1.

## 9. Military Structures
URL: https://pharaoh.heavengames.com/buildings/military/ + chart pages

### 9a. Military
| Building | Size | Cost (N) | Emp | Fire | Collapse | Desirability | Notes |
|---|---|---|---|---|---|---|---|
| Academy | 4x4 | 1000 | 20 | Yes (20 N) | Yes (5 N) | -3,-2,-1 | Trains soldiers. Chart 1500/1200/1000/800/200 |
| Chariot Maker | 4x4 | 250 | 30 | Yes | - | -6,-5,-4,-3,-2,-1 | Needs wood. Chart 375/300/250/200/50 |
| Weaponsmith | 2x2 | 120 | 12 | Yes | - | -3,-2,-1 | Needs copper. Chart 180/145/120/100/24 |
| Recruiter | 3x3 | 150 | 10 | Yes (20 N) | Yes (5 N) | -6,-5,-4 | Only one can be built; needs weapons for infantry, chariots for charioteers. Chart 225/180/150/120/30 |
| Fort (infantry / archers / charioteers) | 7x4 | 1000 | 0 | - | - | -20,-20,-18,-18,-16,-16 | Three types. Charioteer fort VE cost 500 (others 200) |
| Transport Wharf | 2x2 | 200 | 5 | Yes (5 N) | Yes (5 N) | -2,-1 | Straight coastline. Chart 300/240/200/160/40 |
| Warship Wharf | 3x3 | 600 | 15 | Yes (5 N) | Yes (5 N) | -4,-3,-2,-1 | Straight coastline. Chart 900/720/600/480/120 |

### 9b. Defensive
| Building | Size | Cost (N) | Emp | Desirability | Notes |
|---|---|---|---|---|---|
| Wall | 1 tile | 35 | 0 | 0 | Chart 52/42/35/28/7 |
| Gatehouse | 5x2 | 400 | 0 | -4,-3,-2,-1 | Chart 600/480/400/320/80 |
| Tower | 2x2 | 350 | 6 | -6,-5,-4,-3,-2,-1 | Must be built on a thick wall and connected by road to a recruiter. Chart 525/420/350/270/70 |

---

## Housing (from charts; no Buildings-section page)
URL: https://pharaoh.heavengames.com/strategy/charts/hous1/ and https://pharaoh.heavengames.com/strategy/charts/hous2/
Vacant lot cost (house tile): 15/12/10/8/2 (VH/H/N/E/VE), 1x1.

Page 1 (all values VH/H/N/E/VE where five numbers are given). "Evolve" = desirability required (for multi-tile houses at least one tile must meet it; requirements rise with difficulty). "Pop" = occupants at full. "Prosperity" = score contribution (city prosperity cap is recalculated every 3 months as sum(house prosperity x population) / total population, rounded down). Services are what the house needs to evolve to this level.

| Level | Size (1x1 / 2x2..) | Pop | Evolve (VH/H/N/E/VE) | Services needed | Prosperity | Tax mult | Desirability D1..D6 (the house's own) |
|---|---|---|---|---|---|---|---|
| Crude Hut | 1x1 (2x2=20) | 5 | -98 | none | 5/5/5/10/15 | 1/1/1/1/2 | -2,-1,0,0,0,0 |
| Sturdy Hut | 1x1 (2x2=28) | 7 | -10 | Well or Water Supply | 10/10/10/15/20 | 1/1/1/1/2 | -2,-1 |
| Meager Shanty | 1x1 (2x2=36) | 9 | -5/-5/-5/-6/-7 | 1 type of food | 15/15/15/20/25 | 1/1/1/2/3 | -2,-1 |
| Common Shanty | 1x1 (2x2=44) | 11 | 0/0/0/-1/-2 | access to 1 god | 20/20/20/25/30 | 1/1/1/2/3 | -2,-1 |
| Rough Cottage | 1x1 (2x2=52) | 13 | 4/4/4/3/2 | Water Supply | 25/25/25/30/35 | 1/2/2/2/3 | -2,-1 |
| Ordinary Cottage | 1x1 (2x2=60) | 15 | 9/8/8/7/6 | Entertainment (juggler 10) | 30/30/30/35/40 | 2/2/2/2/3 | -2,-1 |
| Modest Homestead | 1x1 (2x2=64) | 16 | 13/12/12/11/10 | Pottery | 35/35/35/40/45 | 2/2/2/3/4 | -1 |
| Spacious Homestead | 1x1 (2x2=68) | 17 | 17/16/16/15/14 | Physician or Mortician | 45/45/45/50/55 | 2/2/2/3/4 | -1 |
| Modest Apartment | 1x1 (2x2=72) | 18 | 21/20/20/19/18 | Beer | 50/50/50/55/60 | 2/3/3/3/4 | 0 |
| Spacious Apartment | 1x1 (2x2=76) | 19 | 26/25/25/23/22 | Courthouse | 55/55/55/60/70 | 2/3/3/3/4 | 0 |
| Common Residence | 2x2 | 80 | 33/32/32/30/29 | Scribe School or Library | 60/60/60/70/80 | 3/3/3/4/5 | 0 |
| Spacious Residence | 2x2 | 84 | 41/40/40/38/37 | Dentist and 2 types of food | 65/70/70/80/90 | 3/3/3/4/5 | 0 |
| Elegant Residence | 2x2 | 88 | 50/48/48/46/45 | Linen | 70/75/80/90/100 | 3/4/4/5/6 | +1,+1 |
| Fancy Residence | 2x2 | 92 | 55/53/53/51/50 | access to 2 gods | 75/80/90/100/120 | 4/4/4/5/6 | +2,+1 |
| Common Manor | 3x3 | 100 | 60/58/58/56/55 | 1 type of luxury good | 450/450/500/600/650 | 11/10/10/12/13 | 3,2,1 |
| Spacious Manor | 3x3 | 108 | 65/63/63/61/60 | Physician and Mortician | 550/600/600/700/750 | 11/10/11/13/14 | 3,2,1 |
| Elegant Manor | 3x3 | 116 | 70/68/68/66/64 | School and Library, access to 3 gods (3 gods not needed on Easy until Stately Manor) | 650/700/700/800/850 | 12/12/12/14/15 | 4,4,3,3,2,2 |
| Stately Manor | 3x3 | 124 | 76/74/74/72/70 | Senet House (Normal chart); with entertainment bonus can evolve on Normal without one | 750/800/800/900/950 | 12/12/13/15/16 | 4,4,3,3,2,2 |
| Modest Estate | 4x4 | 184 | 82/80/80/77/75 | 2 types of luxury goods | 1500/1600/1600/1900/2000 | 15/15/15/16/17 | 5,5,4,4,3,3 |
| Palatial Estate | 4x4 | 200 | 92/90/90/87/85 | 3 types of food (not needed on Very Easy) | 1800/1900/1900/2200/2300 | 15/16/16/17/18 | 5,5,4,4,3,3 |

Entertainment requirement (2x2 rows, VH/H/N/E/VE): Ordinary Cottage 10 flat; Modest Homestead 20/15/13/13/12; Spacious Homestead 25/20/16/15/14; Modest Apartment 30/25/20/18/16; Spacious Apartment 35/30/25/22/18; Common Residence 40/35/30/25/20; Spacious Residence 45/40/35/30/25; Elegant Residence 50/45/40/35/30; Fancy Residence 55/50/45/40/35; Common Manor 60/55/50/45/40; Spacious Manor 65/60/55/50/45; Elegant Manor 70/65/60/55/50; Stately Manor 80/75/70/60/55; Modest Estate 90/85/80/72/65; Palatial Estate 100/95/90/83/75.

Taxes: Annual tax = occupants x tax multiplier x city tax rate x 6. Example: 80 x 3 x 9% x 6 = 129 deben (full Common Residence, Hard). Full-house tax at a 10% rate by level (N column): Crude Hut 2x2 12; Sturdy 16; Meager 21; Common Shanty 26; Rough Cottage 62 (N); Ordinary Cottage 72; Modest Homestead 76; Spacious Homestead 81; Modest Apartment 129; Spacious Apartment 136; Common Residence 144; Spacious Residence 151; Elegant Residence 211; Fancy Residence 220; Common Manor 600; Spacious Manor 712; Elegant Manor 835; Stately Manor 967; Modest Estate 1656; Palatial Estate 1920. Scale linearly with tax rate.

Page 2 (VH/H/N/E/VE): Devolve = desirability at which the house drops a level (lower than the evolve value, so there is a hysteresis band).
| Level | Evolve (N) | Devolve (N) | Fire risk incr. (N) | Crime base (N) | Crime incr. (N) | Disease incr. (N) | Malaria incr. (N) |
|---|---|---|---|---|---|---|---|
| Crude Hut | -98 | -99 | 15 | 25 | 40 | 50 | 30 |
| Sturdy Hut | -10 | -12 | 15 | 25 | 30 | 40 | 27 |
| Meager Shanty | -5 | -7 | 20 | 22 | 20 | 40 | 24 |
| Common Shanty | 0 | -2 | 20 | 22 | 10 | 30 | 21 |
| Rough Cottage | 4 | 2 | 25 | 20 | 5 | 0 | 19 |
| Ordinary Cottage | 8 | 6 | 25 | 20 | 0 | 0 | 19 |
| Modest Homestead | 12 | 10 | 20 | 17 | 0 | 0 | 17 |
| Spacious Homestead | 16 | 14 | 20 | 17 | 0 | 0 | 17 |
| Modest Apartment | 20 | 18 | 20 | 15 | -10 | -10 | 15 |
| Spacious Apartment | 25 | 22 | 20 | 15 | -20 | -20 | 15 |
| Common Residence | 32 | 29 | 20 | 12 | -30 | -30 | 13 |
| Spacious Residence | 40 | 36 | 20 | 12 | -40 | -40 | 13 |
| Elegant Residence | 48 | 43 | 15 | 8 | -50 | -50 | 11 |
| Fancy Residence | 53 | 48 | 15 | 8 | -60 | -60 | 11 |
| Common Manor | 58 | 50 | 10 | 8 | -70 | -70 | 8 |
| Spacious Manor | 63 | 53 | 10 | 8 | -80 | -80 | 8 |
| Elegant Manor | 68 | 60 | 10 | 5 | -90 | -90 | 8 |
| Stately Manor | 74 | 68 | 10 | 5 | -100 | -100 | 5 |
| Modest Estate | 80 | 70 | 5 | 5 | -110 | -110 | 4 |
| Palatial Estate | 90 | 85 | 5 | 5 | -120 | -120 | 3 |
Full VH..VE rows for each column are in the source (hous2). Page notes: fire risk rises with difficulty and rises as housing evolves from Crude Hut to Ordinary Cottage, then falls; crime and disease/malaria risk fall as housing improves (disease and crime increments go negative at high levels, VE row -130 = effectively immune); crime risk = base plus increment; no malaria risk on maps without reeds.

---

## General rules (as stated or implied by the pages)

- Employees listed are the number needed for maximum capacity and efficiency; they do not change with difficulty. Floodplain farms need no workers; Ferry Landing without employees only lets immigrants/emigrants cross.
- Risk of fire is "without a nearby firehouse"; risk of collapse is "without an engineer passing by" (architect's post). Risk numbers climb with difficulty and fire marshal / architect protection lasts less time and reduces risk less at higher difficulty. Mines, quarries, temples, courthouse, shrines carry collapse but no fire risk; most workshops fire only; wharves, granary, storage yard, palaces, mansions both.
- Desirability is a per-tile radius decay (D1..D6, max 6 tiles); effects of overlapping buildings add. Houses evolve at a set desirability (evolve) and fall back at a lower value (devolve). For multi-tile houses at least one tile must meet the evolve value.
- Housing evolution also needs services (water, food types, gods, entertainment, pottery, medical, beer, courthouse, education, dentist, linen, luxury goods, Senet House), listed per level above, plus an "entertainment value" threshold (juggler 10, musician 20, dancer 30, senet/zoo 40, bonus up to +20).
- City prosperity is a population-weighted average of house prosperity, recalculated every 3 months. Taxes depend on occupants x multiplier x tax rate.
- Entertainment venues (Booth, Bandstand, Pavilion) must be placed over a road intersection and need trained performers from their schools (jugglers, musicians, dancers). Festival Square must be on a crossroads. Plaza must be on a paved road.
- Palace/mansion tiles must be partly on grassland; palace is required for tax collectors to work; palace, courthouse and tax collector store parts of the treasury and the courthouse can be robbed.
- Placement rules: wharves, docks, fishing wharf on straight coastline (dock on Nile); Water Lift on straight coastline or beside floodplain; Well and Water Supply on grassland; Clay Pit next to water/floodplain; mines next to ore-bearing rock; quarries next to rocks; reed gatherer near marshland; wood cutter near forest; Tower on thick wall and road-connected to a recruiter; only one recruiter allowed; bridges max 4 squares; ferries in pairs.
- Production chains named on the pages: barley -> Brewery -> beer; reeds -> Papyrus Maker -> papyrus (Library, Scribal School); flax -> Weaver -> linen (Mortuary, Elegant Residence); clay -> Potter / Brickworks (clay + straw); gems -> Jeweler; wood -> Shipwright, Chariot Maker; copper -> Weaponsmith; straw -> Cattle Ranch, Brickworks; shipwright builds boats for Fishing Wharf (without needing wood).
- Storage logic (granary / storage yard / bazaar): the pages state only that storage and distribution structures move food and goods from farms and workshops to homes; Bazaar is "more desirable to live close to than right next to" (desirability -2 adjacent rising to +3 at 6 tiles). No capacity numbers or walker ranges are given on this site's pages.
- Not found on these pages: walker types and ranges, upkeep/wages, capacity of granary/storage yard, production rates. Reference them from elsewhere if needed.
- Chart credits: VitruviusAIA (compiler), Nero Would, HG Cherub Brugle, Grumpus The Elder.

## Pages read (all fetched successfully)
- https://pharaoh.heavengames.com/buildings/ (index)
- https://pharaoh.heavengames.com/buildings/food/ , /industry/ , /storage/ , /entertainment/ , /religion/ , /education/ , /health/ , /municipal/ , /military/ (9 category pages)
- https://pharaoh.heavengames.com/strategy/charts/ (index), /struct1/ , /struct2/ , /struct3/ , /struct4/ , /hous1/ , /hous2/
- https://pharaoh.heavengames.com/strategy/housing/ (thumbnails of community housing blocks: MRed94, Buggi, Khufuh, Simon Righarts 3,000-pop block, Octavian II tri-road; no mechanics)
- https://pharaoh.heavengames.com/strategy/sheets/ (index of per-city commodity sheets; sub-pages not read)
- Not reached / not read: none unreachable; hous3+, individual city sheets.

## Images seen
No building illustrations are referenced in the content area of any page read (the "Pic" columns are empty and the pages' only images are site navigation icons, which are not building art):
- https://pharaoh.heavengames.com/wp-content/themes/pharaoh/images/navigation/court.png
- .../forum.png, .../strategy.png, .../downloads.png, .../faqs.png, .../buildings.png, .../links.png, .../misc.png, .../sitemap.png (same directory)
The community housing-block page uses thumbnails I did not enumerate (https://pharaoh.heavengames.com/strategy/housing/).
