// Export and import (spec 4.17): export shares the save as a .json file where the share sheet takes files,
// else downloads it; import reads a chosen file back into an envelope. Nothing here touches the live world.
import { unpackSave } from './serialize.js';

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

export function pickFile(doc = document) {
  return new Promise((resolve) => {
    const input = doc.createElement('input');
    input.type = 'file'; input.accept = 'application/json,.json'; input.hidden = true;
    const done = (file) => { input.remove(); resolve(file); };
    input.addEventListener('change', () => done((input.files && input.files[0]) || null));
    input.addEventListener('cancel', () => done(null));
    doc.body.append(input);
    input.click();
  });
}

export function readFileText(file) {
  if (file && typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsText(file);
  });
}

export async function importSaveFile(file) {
  let text;
  try { text = await readFileText(file); } catch (e) { throw new Error('read_failed'); }
  return unpackSave(text);
}
