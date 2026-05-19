const loaded = new Set();

export function loadScript(src) {
  const url = src.startsWith('http') ? src : src.startsWith('/') ? src : `/${src}`;
  if (loaded.has(url)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = url;
    el.async = false;
    el.dataset.legacySrc = url;
    el.onload = () => {
      loaded.add(url);
      resolve();
    };
    el.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.body.appendChild(el);
  });
}

export function loadScriptsSequential(srcs) {
  return srcs.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve());
}

export function runInlineScript(code, label = 'inline') {
  if (!code || !code.trim()) return;
  const el = document.createElement('script');
  el.textContent = code;
  el.dataset.legacy = label;
  document.body.appendChild(el);
}

export function clearLegacyScripts() {
  document.querySelectorAll('script[data-legacy]').forEach((el) => el.remove());
  document.querySelectorAll('script[data-legacy-src]').forEach((el) => el.remove());
}

/** Firebase compat 스크립트 순서 보정 */
export function normalizeScriptOrder(scripts) {
  const order = [
    'firebase-app-compat',
    'firebase-auth-compat',
    'firebase-firestore-compat',
    'firebase-database-compat',
    'theme-global',
    'auth-check',
    'sidebar-component',
    'chess.js',
    'engine.js',
    'parse-pgn-states',
    'lichess-judgment',
    'chess-tactics',
    'analysis-cache',
    'game.js',
    'position-brief',
    'coach.js',
    'ui.js',
    'endgame-practice',
    'hints.js',
    'practice-page',
  ];
  const score = (src) => {
    const i = order.findIndex((k) => src.includes(k));
    return i === -1 ? 1000 + scripts.indexOf(src) : i;
  };
  return [...scripts].sort((a, b) => score(a) - score(b));
}
