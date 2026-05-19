const HTML_ROUTE_MAP = {
  '/chess-wasm-fixed.html': '/',
  '/play.html': '/play',
  '/puzzle.html': '/puzzle',
  '/records.html': '/records',
  '/opening-explorer.html': '/opening-explorer',
  '/study.html': '/study',
  '/study-opening.html': '/study-opening',
  '/study-endgame.html': '/study-endgame',
  '/practice.html': '/practice',
  '/auth.html': '/auth',
};

export function rewriteLegacyHtml(html) {
  let out = html;
  for (const [from, to] of Object.entries(HTML_ROUTE_MAP)) {
    out = out.split(`href="${from}"`).join(`href="${to}"`);
    out = out.split(`href='${from}'`).join(`href='${to}'`);
    out = out.split(`href="${from}?`).join(`href="${to}?`);
    out = out.split(`href='${from}?`).join(`href='${to}?`);
  }
  return out;
}
