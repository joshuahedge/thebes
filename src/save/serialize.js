import { migrate } from './migrate.js';

const REQUIRED = ['version', 'seed', 'size', 'day', 'gold', 'terrain', 'road', 'occ', 'buildings', 'nextId'];

export function serialize(world) {
  return JSON.stringify(world);
}

export function deserialize(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { throw new Error('corrupt_save'); }
  if (!obj || typeof obj !== 'object') throw new Error('corrupt_save');
  for (const k of REQUIRED) if (!(k in obj)) throw new Error('corrupt_save');
  const cells = obj.size * obj.size;
  if (obj.terrain.length !== cells || obj.road.length !== cells || obj.occ.length !== cells) throw new Error('corrupt_save');
  return migrate(obj);
}
