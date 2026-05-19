const KEY = 'chess_education_color_mode';

function stored() {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : 'dark';
  } catch {
    return 'dark';
  }
}

function clearInlineThemeOverrides() {
  const props = [
    '--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-card', '--bg-hover',
    '--border', '--border-light', '--text-primary', '--text-secondary', '--text-muted',
  ];
  for (const p of props) {
    try {
      document.documentElement.style.removeProperty(p);
    } catch { /* ignore */ }
  }
}

function applyTheme(mode) {
  const m = mode === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-color-mode', m);
  clearInlineThemeOverrides();
  try {
    localStorage.setItem(KEY, m);
  } catch { /* private mode */ }
}

export function initTheme() {
  applyTheme(stored());
  window.toggleColorMode = function toggleColorMode() {
    const cur = document.documentElement.getAttribute('data-color-mode') === 'light' ? 'light' : 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    if (typeof window.showToast === 'function') {
      window.showToast(next === 'light' ? '라이트 모드' : '다크 모드');
    }
  };
  window.applyStoredColorMode = function applyStoredColorMode() {
    applyTheme(stored());
  };
}
