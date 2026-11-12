// Version 10.0, Track Q: the game's own style sheets, in the order index.html links them, put on the test page for a test that reads computed styles; the returned function takes them off again.
export async function useGameCss() {
  const html = await (await fetch('/index.html')).text();
  const hrefs = [...html.matchAll(/<link rel="stylesheet" href="\.\/([^"]+)"/g)].map((m) => m[1]);
  const texts = await Promise.all(hrefs.map(async (h) => (await fetch(`/${h}`)).text()));
  const style = document.createElement('style');
  style.textContent = texts.join('\n');
  document.head.appendChild(style);
  return () => style.remove();
}
