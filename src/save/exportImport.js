// Export (spec 4.17): shares the save as a .json file where the share sheet takes files, else downloads it. Nothing here touches the live world.
import { normalizeRecords, RECORDS_VERSION } from './records.js';
import { SAVE_VERSION } from './serialize.js';
// Version 8.0 (Track U, ruling 1146): the import half (pick a file, read it back) is gone with "Bring a city from Safari"; the export stays as a file copy.

export const exportFileName = (date = new Date()) => `thebes-city-${date.toISOString().slice(0, 10)}.json`;

export async function exportSave(text, { share = null, canShare = null, download, date = new Date() } = {}) {
  const file = new File([text], exportFileName(date), { type: 'application/json' });
  if (share && canShare) {
    let ok = false;
    try { ok = Boolean(canShare({ files: [file] })); } catch (e) { ok = false; }
    if (ok) {
      try { await share({ files: [file], title: 'Thebes city' }); return 'shared'; }
      catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }   // dismissed: nothing more to do
    }
  }
  download(file);
  return 'downloaded';
}

export function downloadFile(file, doc = document, urls = URL) {
  const url = urls.createObjectURL(file);
  const a = doc.createElement('a');
  a.href = url; a.download = file.name; a.rel = 'noopener'; a.hidden = true;
  doc.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => urls.revokeObjectURL(url), 1000);
}

// Version 9.0 (Track L, ruling 1586): Bring rulers from a file. Reads an exported city file for its records only, never its world, and says what merging would add.
// readRecordsFile(text) -> { ok: true, records } with the file's rulers, rivals and dynasty normalised (its city rows and stamps left out), or { ok: false, reason } ('unreadable': not JSON; 'bad': no records in it;
// 'newer': a newer save or records version). bringSummary(device, file) -> { rulers, rivals }: the rulers (by id) and the rivals (by name and map) in the file
// that the device does not have; a rival the device already has counts as nothing added (the newer one replaces it).

export function readRecordsFile(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { return { ok: false, reason: 'unreadable' }; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, reason: 'bad' };
  if (Number.isInteger(obj.version) && obj.version > SAVE_VERSION) return { ok: false, reason: 'newer' };
  const raw = obj.records;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'bad' };
  if (Number.isInteger(raw.version) && raw.version > RECORDS_VERSION) return { ok: false, reason: 'newer' };
  const all = normalizeRecords(raw);
  return { ok: true, records: { ...all, cities: [], chronicle: [] } };   // rulers, rivals and the dynasty only: a city row, a stamp or a world is never brought (ruling 1586)
}

export function bringSummary(device, file) {
  const have = normalizeRecords(device), other = normalizeRecords(file);
  const rulers = new Set(have.rulers.map((r) => r.id)), rivals = new Set(have.rivals.map((v) => v.id));
  return { rulers: other.rulers.filter((r) => !rulers.has(r.id)).length, rivals: other.rivals.filter((v) => !rivals.has(v.id)).length };
}

// Picks a file with the device's own picker and answers its text: null when the player cancels, a rejection when it cannot be read. Called from a tap's own handler
// (the browser only opens the picker then); the input is added to the page for the moment it takes and always removed.
export function pickTextFile(doc = document) {
  return new Promise((resolve, reject) => {
    const input = doc.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true;
    const done = () => { if (input.parentNode) input.remove(); };
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      done();
      if (!file) { resolve(null); return; }
      try { resolve(await file.text()); } catch (e) { reject(e); }
    });
    input.addEventListener('cancel', () => { done(); resolve(null); });
    doc.body.append(input);
    input.click();
  });
}
