// Export (spec 4.17): shares the save as a .json file where the share sheet takes files, else downloads it. Nothing here touches the live world.
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
