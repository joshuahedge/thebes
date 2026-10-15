// Version 5.0: one aggregator. Each task adds its own files here (tests/v50/<task>/...); describe names start with 'v50 <area>', so
// tests/run-tests.ps1 -Grep "v50 <area>" runs one area. tests/all.js imports this file once.
import './contract/advice.test.js';
import './contract/contract.test.js';
import './advice/topbar.test.js';
import './advice/advice.test.js';
import './step/review.test.js';
import './step/step.test.js';
import './step/reasons.test.js';
import './layers/sim.test.js';
import './layers/slices.test.js';
import './layers/draw.test.js';
import './layers/budget.test.js';
import './layers/ui.test.js';
import './areas/sim.test.js';
import './areas/ui.test.js';
import './areas/budget.test.js';
import './roads/sim.test.js';
import './roads/ui.test.js';
import './roads/budget.test.js';
import './roads/walls.test.js';
import './camera/camera.test.js';
import './grand/sim.test.js';
import './grand/ui.test.js';
import './grand/balance.test.js';
import './balance/carried.test.js';
