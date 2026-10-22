import { describe, it, expect } from '../harness.js';
import { createTitleCard, createBackdrop, driftPoints } from '../../src/ui/titleCard.js';
import { createCameraControl } from '../../src/ui/cameraControl.js';
import { createCamera } from '../../src/render/camera.js';
import { createWorld } from '../../src/sim/world.js';

import { mount, fire } from '../helpers/dom.js';

describe('ui title card', () => {
  it('offers Continue only with a save, has no sound button (Version 6.0), and Install only where allowed', () => {
    const { root, cleanup } = mount('<div id="title" hidden></div>');
    const container = root.querySelector('#title');
    const log = [];
    const card = createTitleCard({ container, hasSave: false, canInstall: false, onContinue: () => log.push('continue'), onNewCity: () => log.push('new') });
    expect(container.hidden).toBe(false);
    expect(container.querySelector('.continue')).toBe(null);
    expect(container.querySelector('.install').hidden).toBe(true);
    expect(container.querySelector('.new-city').classList.contains('primary')).toBe(true);
    expect(document.activeElement).toBe(container.querySelector('.new-city'));
    expect(container.querySelector('.sound')).toBe(null);                               // sound is on by default; Settings mutes it
    expect(container.textContent.includes('Play with sound') || container.textContent.includes('Play muted')).toBe(false);
    fire(container.querySelector('.new-city'), 'click');
    expect(log).toEqual(['new']);
    card.destroy();
    expect(container.hidden).toBe(true);
    expect(container.children.length).toBe(0);
    const withSave = createTitleCard({ container, hasSave: true, canInstall: true, message: 'hello', onContinue: () => log.push('continue'), onNewCity: () => {}, onInstall: () => log.push('install') });
    expect(withSave.element.querySelector('h1').textContent).toBe('Thebes');
    expect(container.querySelector('.continue').classList.contains('primary')).toBe(true);
    expect(container.querySelector('.new-city').classList.contains('primary')).toBe(false);
    expect(document.activeElement).toBe(container.querySelector('.continue'));
    expect(container.querySelector('.message').textContent).toBe('hello');
    expect(container.querySelector('.install').hidden).toBe(false);
    fire(container.querySelector('.install'), 'click');
    fire(container.querySelector('.continue'), 'click');
    expect(log).toEqual(['new', 'install', 'continue']);
    withSave.destroy();
    cleanup();
  });
  it('drifts the camera between points of the city and stays still under reduced motion', () => {
    const world = createWorld({ seed: 3 });
    const cam = createCamera({ x: 0, y: 0, zoom: 1 });
    let reduced = false;
    const cc = createCameraControl({ cam, view: () => ({ width: 800, height: 600 }), reducedMotion: () => reduced, now: () => 0 });
    const points = driftPoints(world);
    expect(points.length).toBe(4);
    for (const [x, y] of points) { expect(x >= 0 && x < world.size).toBe(true); expect(y >= 0 && y < world.size).toBe(true); }
    const b = createBackdrop({ world, cam, cameraControl: cc, reducedMotion: () => reduced, driftMs: 1000, holdMs: 400 });
    expect(b.points).toEqual(points);
    expect([cam.x, cam.y]).toEqual(points[0]);
    b.tick(0);
    expect(cc.animating).toBe(false);                       // under Full it first holds the showcase
    b.tick(399);
    expect(cc.animating).toBe(false);
    b.tick(400);
    expect(cc.animating).toBe(true);
    cc.tick(1400);
    expect([cam.x, cam.y]).toEqual(points[1]);
    b.tick(900);                                            // too early for the next drift
    expect(cc.animating).toBe(false);
    b.tick(1400);
    cc.tick(2400);
    expect([cam.x, cam.y]).toEqual(points[2]);
    for (const [x, y] of points) expect(Math.hypot(x - points[0][0], y - points[0][1]) <= 2).toBe(true);   // it breathes round the showcase
    b.stop();
    b.tick(3000);
    expect(cc.animating).toBe(false);
    reduced = true;
    const still = createBackdrop({ world, cam, cameraControl: cc, reducedMotion: () => reduced, driftMs: 1000 });
    still.tick(0); still.tick(5000);
    expect(cc.animating).toBe(false);
    expect([cam.x, cam.y]).toEqual(points[0]);
    still.stop();
  });
});
