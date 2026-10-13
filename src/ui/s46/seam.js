// Stage 4.6 (Track 0): the shape every track's interface seam has (createUI's seam protocol, src/ui/danger.js describes each part):
//   sheets      custom sheet kinds it owns -> render(body, { close, setTitle }) (headed T[kind] unless setTitle names one)
//   sheetParts  { building(b), house(h), actions(b), summary() } -> arrays of DOM nodes at the Stage 3 places
//   onEvents(events), refresh(), onAlertAction(alert, action), onCommand(e), destroy()
// A track spreads its own parts over this base, so a part it does not need stays empty.
export function seamBase() {
  return {
    sheets: {},
    sheetParts: { building: () => [], house: () => [], actions: () => [], summary: () => [] },
    onEvents() {}, refresh() {}, onAlertAction() {}, onCommand() {}, destroy() {},
  };
}
