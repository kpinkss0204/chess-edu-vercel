/**
 * ChessGrammar API를 활용한 전술 패턴 감지
 * 블런더/실수/부정확 판정이 있을 때만 분석
 */
(function (global) {
  'use strict';

  const API_BASE = 'https://chessgrammar.com/api/v1';

  /**
   * ChessGrammar API로 FEN 포지션의 전술 패턴 분석
   * @param {string} fen 분석할 포지션 FEN
   * @returns {Promise<object|null>} 전술 정보 또는 실패 시 null
   */
  async function detectTactics(fen) {
    if (!fen) return null;
    try {
      const response = await fetch(`${API_BASE}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fen: fen })
      });

      if (!response.ok) {
        console.warn(`[ChessGrammar API] HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      // ChessGrammar API 응답 → 기존 로컬 로직 형식 변환
      const tactics = {
        fork: false,
        absPin: false,
        relPin: false,
        pin: false,
        discovered: false,
        checkmate: false,
        trap: false,
        decoy: false,
        skewer: false,
      };

      if (data && data.tactics && Array.isArray(data.tactics)) {
        data.tactics.forEach(t => {
          const patternName = (t.pattern || '').toLowerCase();
          if (patternName.includes('fork')) tactics.fork = true;
          if (patternName.includes('pin') && patternName.includes('absolute')) tactics.absPin = true;
          if (patternName.includes('pin') && patternName.includes('relative')) tactics.relPin = true;
          if (patternName.includes('pin')) tactics.pin = true;
          if (patternName.includes('discovered')) tactics.discovered = true;
          if (patternName.includes('checkmate') || patternName.includes('mate')) tactics.checkmate = true;
          if (patternName.includes('trap')) tactics.trap = true;
          if (patternName.includes('decoy')) tactics.decoy = true;
          if (patternName.includes('skewer')) tactics.skewer = true;
        });
      }

      return tactics;
    } catch (error) {
      console.error('[ChessGrammar] 전술 분석 실패:', error.message);
      return null;
    }
  }

  /**
   * 판정(blunder/mistake/inaccuracy)이 있는 경우만 전술 분석
   * @param {number} cpBeforeWhite 수 전 평가치
   * @param {number} cpAfterWhite 수 후 평가치
   * @param {string} mover 'w' 또는 'b'
   * @param {string} fen 분석할 FEN
   * @returns {Promise<object|null>} 판정 있으면 전술 분석, 없으면 null
   */
  async function detectTacticsIfBlunder(cpBeforeWhite, cpAfterWhite, mover, fen) {
    // lichessCpAdviceJudgment 호출 (lichess-judgment.js에서 제공)
    const hasJudgment = typeof lichessCpAdviceJudgment === 'function'
      ? lichessCpAdviceJudgment(cpBeforeWhite, cpAfterWhite, mover)
      : null;

    // 판정이 없으면 (null) 분석하지 않음
    if (!hasJudgment) {
      return null;
    }

    // 판정이 있으면 (blunder/mistake/inaccuracy) ChessGrammar API로 분석
    return await detectTactics(fen);
  }

  // ── 유틸: state/FEN 변환
  function snapshotFromState(st) {
    if (!st) return null;
    if (typeof st === 'string') return st; // 이미 FEN
    if (st.fen) return st.fen;
    if (typeof boardToFen === 'function' && st.board) {
      return boardToFen(st.board, st.turn, st.castling, st.enPassant, st.halfMove || 0, st.fullMove || 1);
    }
    return null;
  }

  // FEN + move → 새로운 FEN
  function applyMoveSnapshot(prevFen, move) {
    if (!prevFen || !move) return null;
    if (typeof parseFen !== 'function' || typeof applyMoveToBoard !== 'function' || typeof boardToFen !== 'function') {
      return null;
    }
    const st = parseFen(prevFen);
    if (!st) return null;
    const board = st.board.map(r => [...r]);
    const afterBoard = applyMoveToBoard(board, move, st.turn);
    const nextTurn = st.turn === 'w' ? 'b' : 'w';
    const ep = move.doublePush ? [move.to[0] - (st.turn === 'w' ? -1 : 1), move.to[1]] : null;
    return boardToFen(afterBoard, nextTurn, st.castling, ep, st.halfMove || 0, (st.fullMove || 1) + (nextTurn === 'w' ? 1 : 0));
  }

  global.ChessTactics = {
    detectTactics: detectTactics,
    detectTacticsIfBlunder: detectTacticsIfBlunder,
    snapshotFromState: snapshotFromState,
    applyMoveSnapshot: applyMoveSnapshot
  };
})(typeof window !== 'undefined' ? window : globalThis);
