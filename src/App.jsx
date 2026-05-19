import { Routes, Route, Navigate } from 'react-router-dom';
import LegacyPage from './components/LegacyPage';

const routes = [
  { path: '/', pageId: 'analysis' },
  { path: '/play', pageId: 'play' },
  { path: '/puzzle', pageId: 'puzzle' },
  { path: '/records', pageId: 'records' },
  { path: '/opening-explorer', pageId: 'opening-explorer' },
  { path: '/study', pageId: 'study' },
  { path: '/study-opening', pageId: 'study-opening' },
  { path: '/study-endgame', pageId: 'study-endgame' },
  { path: '/practice', pageId: 'practice' },
  { path: '/auth', pageId: 'auth' },
];

const legacyRedirects = [
  ['chess-wasm-fixed.html', '/'],
  ['play.html', '/play'],
  ['puzzle.html', '/puzzle'],
  ['records.html', '/records'],
  ['opening-explorer.html', '/opening-explorer'],
  ['study.html', '/study'],
  ['study-opening.html', '/study-opening'],
  ['study-endgame.html', '/study-endgame'],
  ['practice.html', '/practice'],
  ['auth.html', '/auth'],
];

export default function App() {
  return (
    <Routes>
      {routes.map(({ path, pageId }) => (
        <Route key={path} path={path} element={<LegacyPage pageId={pageId} />} />
      ))}
      {legacyRedirects.map(([from, to]) => (
        <Route key={from} path={`/${from}`} element={<Navigate to={to} replace />} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
