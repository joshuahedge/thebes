// Boot (spec 4.1): the title card, then the game. Everything lives in src/boot.js so tests can boot the
// page shell with a fake store and without animation frames.
import { boot } from './boot.js';

boot(document, window);
