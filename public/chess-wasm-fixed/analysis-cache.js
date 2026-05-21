/**
 * Firestore tacticAnalysis 캐시 ↔ 분석 보드 연동
 * - 이미 분석된 기보는 Stockfish/Grammar 재계산 없이 주석·통계만 복원
 */
(function (global) {
  'use strict';

  function judgmentTagToCls(tag) {
    if (!tag || typeof tag !== 'string') return null;
    const m = tag.match(/(blunder|mistake|inaccuracy)$/i);
    return m ? m[1].toLowerCase() : null;
  }

  /** @param {number} [expectedMoveCount] 기보 수 개수 (ply) */
  function isTacticAnalysisComplete(ta, expectedMoveCount) {
    if (!ta || !Array.isArray(ta.moveJudgments) || ta.moveJudgments.length === 0) return false;
    if (expectedMoveCount > 0 && ta.moveJudgments.length < expectedMoveCount) return false;
    return ta.analyzedAt != null || (ta.analysisVersion != null && ta.analysisVersion >= 3);
  }

  function clearGameAnalysisCache(game) {
    if (game) game._preAnalyzedFromCache = false;
    global._pendingTacticAnalysis = null;
    global._pendingTacticAnalysisMyColor = null;
  }

  function setPendingTacticAnalysis(ta, myColor) {
    global._pendingTacticAnalysis = ta || null;
    global._pendingTacticAnalysisMyColor = myColor || null;
  }

  function applyTacticAnalysisToGame(game, ta) {
    if (!game || !game.history || !ta || !ta.moveJudgments) return false;
    const n = Math.min(game.history.length, ta.moveJudgments.length);
    for (let i = 0; i < n; i++) {
      game.history[i].annotation = judgmentTagToCls(ta.moveJudgments[i]);
      game.history[i].tactics = null;
    }
    game._preAnalyzedFromCache = true;
    game._cachedTacticAnalysis = ta; // 나중에 다시 표시할 수 있도록 보관
    if (typeof game.renderMoveList === 'function') game.renderMoveList();
    return true;
  }

  function displayTacticAnalysisPanel(ta, game) {
    const targetTa = ta || (game && game._cachedTacticAnalysis);
    if (!targetTa) return;

    const statusEl = document.getElementById('sf-analysis-status');
    const resultEl = document.getElementById('sf-analysis-result');
    const depthBadge = document.getElementById('sf-analysis-depth-badge');

    const myBlunders = targetTa.myBlunders || 0;
    const myMistakes = targetTa.myMistakes || 0;
    const myInaccuracies = targetTa.myInaccuracies || 0;
    const oppBlunders = targetTa.oppBlunders || 0;
    const oppMistakes = targetTa.oppMistakes || 0;
    const oppInaccuracies = targetTa.oppInaccuracies || 0;
    const myAccuracy = targetTa.myAccuracy || 0;

    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.innerHTML =
        '<span style="color:var(--accent-green-bright)">✓ 저장된 분석 결과 불러옴' +
        (targetTa.sfDepth ? ` (깊이 ${targetTa.sfDepth})` : '') +
        '</span>';
    }
    if (depthBadge && targetTa.sfDepth) depthBadge.textContent = `깊이 ${targetTa.sfDepth}`;

    const STAT_COLOR = { blunder: '#cc3333', mistake: '#e08c3a', inaccuracy: '#f6c94a' };
    let statsHtml = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px;">';
    const myStats = [['블런더 ??', myBlunders, 'blunder'], ['실수 ?', myMistakes, 'mistake'], ['부정확 ?!', myInaccuracies, 'inaccuracy']];
    for (const [label, count, key] of myStats) {
      statsHtml += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:5px 4px;text-align:center;">
          <div style="font-size:9px;font-weight:800;color:${STAT_COLOR[key]};">나 · ${label}</div>
          <div style="font-size:13px;font-weight:700;color:var(--text-primary);">${count}</div>
        </div>`;
    }
    statsHtml += '</div>';

    let oppHtml = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px;">';
    const oppStats = [['블런더', oppBlunders, 'blunder'], ['실수', oppMistakes, 'mistake'], ['부정확', oppInaccuracies, 'inaccuracy']];
    for (const [label, count, key] of oppStats) {
      oppHtml += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:5px 4px;text-align:center;">
          <div style="font-size:9px;font-weight:800;color:${STAT_COLOR[key]};opacity:.7;">상대 · ${label}</div>
          <div style="font-size:13px;font-weight:700;color:var(--text-primary);">${count}</div>
        </div>`;
    }
    oppHtml += '</div>';

    const accColor = myAccuracy >= 85 ? 'var(--accent-green-bright)' : myAccuracy >= 70 ? '#e0b040' : '#e07070';
    const accHtml = myAccuracy > 0
      ? `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:8px 12px;display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:11px;color:var(--text-muted);">내 정확도</span>
            <span style="font-size:16px;font-weight:900;color:${accColor};">${myAccuracy}%</span>
          </div>` : '';

    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = accHtml + statsHtml + oppHtml;
    }
  }

  function applyPendingToGame(game) {
    const ta = global._pendingTacticAnalysis;
    const myColor =
      global._pendingTacticAnalysisMyColor ||
      document.getElementById('sf-color-select')?.value ||
      'w';
    global._pendingTacticAnalysis = null;
    global._pendingTacticAnalysisMyColor = null;

    if (!ta || !game || game.history.length < 2) return false;
    if (!isTacticAnalysisComplete(ta, game.history.length)) return false;

    applyTacticAnalysisToGame(game, ta);
    displayTacticAnalysisPanel(ta);

    if (typeof global.markAutoGameAnalysisDone === 'function') {
      const pgn = typeof game.generatePgn === 'function' ? game.generatePgn() : '';
      global.markAutoGameAnalysisDone(pgn, myColor);
    }
    const CT = global.ChessTactics;
    if (CT && CT.resetAnalysisState) CT.resetAnalysisState();
    return true;
  }

  function isGamePreAnalyzed(game) {
    return !!(game && game._preAnalyzedFromCache);
  }

  global.AnalysisCache = {
    judgmentTagToCls,
    isTacticAnalysisComplete,
    clearGameAnalysisCache,
    setPendingTacticAnalysis,
    applyTacticAnalysisToGame,
    displayTacticAnalysisPanel,
    applyPendingToGame,
    isGamePreAnalyzed,
  };
})(typeof window !== 'undefined' ? window : globalThis);
