// Version 9.0 "Dynasty" (Track L, rulings 1586, 1593): the two rows Options > Saves gains (src/ui/menu.js settingsSheet places them): the ruler's name, a labelled
// field of at most 16 characters, and Bring rulers from a file, which says what a merge would add before Merge. Both read and write the device's records through
// hooks.records, and Bring rulers picks its file through hooks.bringRulers() (boot.js; it answers the file's text, or null when none was picked).
import { RULER_NAME_MAX, cleanName } from '../../save/records.js';
import { readRecordsFile, bringSummary } from '../../save/exportImport.js';
import { el, button, clear } from '../components.js';
import { V90_L_TEXT } from '../text.js';

// The ruler name field: a label, the field (kept on change: Enter or leaving it), the limit in words and a status line for what was kept or refused.
export function rulerNameRow(hooks) {
  const L = V90_L_TEXT;
  const records = hooks.records;
  const current = () => { try { return records.dynasty().name; } catch (e) { return ''; } };
  const input = el('input', { type: 'text', id: 'ruler-name', class: 'ruler-name-input', maxlength: String(RULER_NAME_MAX), autocomplete: 'off', spellcheck: 'false', 'aria-describedby': 'ruler-name-hint ruler-name-status', placeholder: L.nameDefault });
  input.value = current();
  const status = el('p', { class: 'ruler-name-status small', id: 'ruler-name-status', role: 'status' });
  input.addEventListener('change', () => {
    const typed = input.value.trim(), kept = cleanName(typed);
    if (!kept) {
      input.value = current();
      status.textContent = typed ? L.nameRefused(current() || L.nameDefault) : '';
      return;
    }
    let saved = kept;
    try { saved = records.setDynasty({ name: kept }).name || kept; } catch (e) { /* a blocked store keeps the name for this page only */ }
    input.value = saved;
    status.textContent = saved === typed ? L.nameSaved(saved) : L.nameCleaned(saved);
  });
  return el('div', { class: 'row ruler-name-row' }, [
    el('label', { for: 'ruler-name', class: 'ruler-name-label', text: L.nameLabel }),
    input,
    el('p', { class: 'ruler-name-hint small muted', id: 'ruler-name-hint', text: L.nameHint }),
    status,
  ]);
}

// Bring rulers from a file: Pick, then the question (what it adds, Merge, Cancel) or the reason it cannot (a bad file, a newer one, nothing new).
export function bringRulersRow(hooks) {
  const L = V90_L_TEXT;
  const answer = el('div', { class: 'bring-answer', role: 'status' });
  const say = (text, ...more) => { clear(answer); answer.append(el('p', { class: 'bring-text small', text }), ...more); };
  const REASONS = { bad: L.bringBad, newer: L.bringNewer, unreadable: L.bringUnreadable };
  const pick = button(L.bringLabel, { class: 'bring-rulers', 'aria-describedby': 'bring-rulers-note', onClick: async () => {
    clear(answer);
    let text = null;
    try { text = await hooks.bringRulers(); } catch (e) { say(L.bringUnreadable); return; }
    if (typeof text !== 'string') return;                                   // no file was picked
    const read = readRecordsFile(text);
    if (!read.ok) { say(REASONS[read.reason] || L.bringBad); return; }
    const adds = bringSummary(hooks.records.load(), read.records);
    if (!adds.rulers && !adds.rivals) { say(L.bringNothing); return; }
    say(L.bringAdds(adds.rulers, adds.rivals), el('div', { class: 'actions' }, [
      button(L.bringMerge, { class: 'bring-merge primary', onClick: () => { hooks.records.merge(read.records); say(L.bringDone(adds.rulers, adds.rivals)); } }),
      button(L.bringCancel, { class: 'bring-cancel', onClick: () => clear(answer) }),
    ]));
  } });
  return el('div', { class: 'row bring-row' }, [pick, el('p', { class: 'bring-note small muted', id: 'bring-rulers-note', text: L.bringNote }), answer]);
}
