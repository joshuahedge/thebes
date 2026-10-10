// Pure transitions for the modes table (spec 6.4): one mode at a time, overlays combine with browsing,
// every mode has a visible exit and Back goes one step. Each function returns a patch for store.set.
export const isToolMode = (mode) => mode === 'placing' || mode === 'drawing' || mode === 'demolishing';

export const toolMode = (tool) => (tool.kind === 'building' ? 'placing' : tool.kind === 'demolish' ? 'demolishing' : 'drawing');

const CLEAR_TOOL = { tool: null, ghost: null, line: null, area: null };

export function startTool(state, tool) {
  return { ...CLEAR_TOOL, mode: toolMode(tool), tool, selectedId: null, sheet: null, dock: state.dock === 'tucked' ? 'slim' : state.dock };
}

// Cancelling a tool also drops any selection, so mode and selectedId stay in step (spec 6.4).
export function cancelTool(state) {
  return { ...CLEAR_TOOL, ...deselect(state) };
}

export function select(state, id) {
  return { ...CLEAR_TOOL, mode: 'selected', selectedId: id, sheet: { kind: 'info', id } };
}

export function deselect(state) {
  return { mode: 'browse', selectedId: null, sheet: state.sheet && state.sheet.kind === 'info' ? null : state.sheet };
}

export function openSheet(state, kind, id = null) {
  const patch = { sheet: { kind, id } };
  if (kind !== 'info') Object.assign(patch, CLEAR_TOOL, { mode: state.selectedId !== null ? 'selected' : 'browse' });
  return patch;
}

// Closing a panel that was opened over a selection brings the info sheet back (spec 6.4: Selected means it is open).
const afterPanel = (state) => ({ sheet: state.selectedId !== null ? { kind: 'info', id: state.selectedId } : null });

export function closeSheet(state) {
  const wasInfo = state.sheet && state.sheet.kind === 'info';
  return wasInfo ? { sheet: null, mode: 'browse', selectedId: null } : afterPanel(state);
}

export function back(state) {
  if (state.confirmDialog) return { confirmDialog: null };
  if (state.sheet && state.sheet.kind !== 'info') return afterPanel(state);
  if (isToolMode(state.mode)) return cancelTool(state);
  if (state.mode === 'selected') return { mode: 'browse', selectedId: null, sheet: null };
  if (state.dock === 'tray' && state.layout !== 'wide') return { dock: 'slim' };   // Esc closes an open tray or drawer; never a history step
  return null;
}

export const toggleOverlay = (state, kind) => ({ overlay: state.overlay === kind ? null : kind });

export function cycleOverlay(state, list) {
  const i = list.indexOf(state.overlay);
  return { overlay: i + 1 < list.length ? list[i + 1] : null };
}

export const setDock = (state, height) => ({ dock: height });

export const pickCategory = (state, category) => ({ category, dock: state.layout === 'wide' ? state.dock : 'tray' });
