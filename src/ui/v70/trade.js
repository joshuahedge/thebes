// Version 7.0, Track T: the interface of trade and the Quay (rulings 870-899), the seam (src/ui/s46/seam.js shape) createV70Seams makes once a
// game. Track T fills it: the Trade sheet (one card per route with its switches, next arrival and last year's profit, then "Keep at least";
// a phone accordion, one route open at a time; the desktop side panel), opened from the trading post, the Quay (sheetParts.building) and a
// Trade row in the summary (sheetParts.summary); an arrival's caption (onEvents). Track T owns this file and src/ui/tradeSheet.js.
import { seamBase } from '../s46/seam.js';

export const createTradeUi = () => seamBase();
