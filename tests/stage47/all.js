// Stage 4.7: one aggregator. Each task adds its own files here (tests/stage47/<task>/...); describe names start with 's47 <area>', so
// tests/run-tests.ps1 -Grep "s47 <area>" runs one area. tests/all.js imports this file once.
import './contract/contract.test.js';
