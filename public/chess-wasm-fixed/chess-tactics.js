/**
 * ChessGrammar API 전술 분석 + Lichess CpAdvice 수 평가
 * [1단계] blunder / mistake / inaccuracy 판정
 * [2단계] 위 판정일 때만 ChessGrammar API 호출
 */
(function (global) {
  'use strict';

  const API_BASE = 'https://chessgrammar.com/api/v1';
  const MIN_ANALYSIS_INTERVAL = 2200; // 30 req/min (약 2초 간격, 안전하게 2.2초)
  const BAD_JUDGMENTS = ['blunder', 'mistake', 'inaccuracy'];
  const JUDGMENT_LABEL = {
    blunder: '블런더 (??)',
    mistake: '실수 (?)',
    inaccuracy: '부정확 (?!)',
  };

  // ── 단순 인메모리 캐시 ──────────────────────────────────────────
  const _cache = {
    fen: new Map(), // fen -> tactics
    pgn: new Map()  // pgn -> mappedResult
  };

  // ── 요청 큐 (전역 Rate Limit 보장) ────────────────────────────────
  class RequestQueue {
    constructor(interval) {
      this.queue = [];
      this.interval = interval;
      this.lastExecution = 0;
      this.timer = null;
    }

    add(fn) {
      return new Promise((resolve, reject) => {
        this.queue.push({ fn, resolve, reject });
        this.process();
      });
    }

    process() {
      if (this.timer || this.queue.length === 0) return;

      const now = Date.now();
      const elapsed = now - this.lastExecution;
      const wait = Math.max(0, this.interval - elapsed);

      this.timer = setTimeout(async () => {
        this.timer = null;
        if (this.queue.length === 0) return;

        const { fn, resolve, reject } = this.queue.shift();
        this.lastExecution = Date.now();
        try {
          const result = await fn();
          resolve(result);
        } catch (e) {
          reject(e);
        }
        this.process();
      }, wait);
    }
  }

  const _apiQueue = new RequestQueue(MIN_ANALYSIS_INTERVAL);

  function isBadJudgment(j) {
    return BAD_JUDGMENTS.indexOf(j) >= 0;
  }

  function evaluateMoveJudgment(cpBeforeWhite, cpAfterWhite, mover) {
    if (typeof global.lichessCpAdviceJudgment !== 'function') return null;
    return global.lichessCpAdviceJudgment(cpBeforeWhite, cpAfterWhite, mover);
  }

  /**
   * [1단계] 수 평가만 (API 호출 없음)
   */
  function evaluateMove(cpBeforeWhite, cpAfterWhite, mover) {
    const judgment = evaluateMoveJudgment(cpBeforeWhite, cpAfterWhite, mover);
    return {
      judgment,
      isBad: isBadJudgment(judgment),
      label: judgment ? JUDGMENT_LABEL[judgment] : null,
    };
  }

  /**
   * [2단계] ChessGrammar API — 판정과 무관하게 FEN 전술 추출
   */
  async function detectTactics(fen, options = {}) {
    if (!fen) return null;
    
    // 캐시 확인
    const cacheKey = `${fen}|${options.depth || 'l2'}`;
    if (_cache.fen.has(cacheKey)) return _cache.fen.get(cacheKey);

    return _apiQueue.add(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const requestBody = {
          fen: fen,
          depth: options.depth || 'l2',
          with_sequence: options.withSequence !== undefined ? options.withSequence : true
        };
        if (options.patterns && Array.isArray(options.patterns)) {
          requestBody.patterns = options.patterns;
        }

        const response = await fetch(`${API_BASE}/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
          console.warn(`[ChessGrammar API] HTTP ${response.status}`);
          return null;
        }

        const data = await response.json();
        const tactics = parseTacticResponse(data);
        if (tactics) _cache.fen.set(cacheKey, tactics); // 성공 시 캐시 저장
        return tactics;
      } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          console.error('[ChessGrammar] 전술 분석 타임아웃 (10초)');
        } else {
          console.error('[ChessGrammar] 전술 분석 실패:', error.message);
        }
        return null;
      }
    });
  }

  /**
   * PGN 전체 게임 분석 (1회 호출로 모든 전술 기회 파악)
   */
  async function detectTacticsGame(pgn, options = {}) {
    if (!pgn) return null;

    // 캐시 확인
    const cacheKey = `${pgn}|${options.mode || 'available'}|${options.depth || 'l2'}`;
    if (_cache.pgn.has(cacheKey)) return _cache.pgn.get(cacheKey);

    return _apiQueue.add(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const requestBody = {
          pgn: pgn,
          mode: options.mode || 'available',
          depth: options.depth || 'l2',
          with_sequence: options.withSequence !== undefined ? options.withSequence : false
        };
        if (options.patterns && Array.isArray(options.patterns)) {
          requestBody.patterns = options.patterns;
        }

        const response = await fetch(`${API_BASE}/extract_game`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
          console.warn(`[ChessGrammar API] HTTP ${response.status}`);
          return null;
        }

        const data = await response.json();
        const result = {};
        if (data && data.tactics && Array.isArray(data.tactics)) {
          data.tactics.forEach(t => {
            const ply = t.ply;
            if (ply == null) return;
            if (!result[ply]) result[ply] = [];
            result[ply].push(t);
          });
        }

        const mappedResult = {};
        Object.keys(result).forEach(ply => {
          mappedResult[ply] = parseTacticList(result[ply]);
        });

        if (Object.keys(mappedResult).length > 0) {
          _cache.pgn.set(cacheKey, mappedResult); // 성공 시 캐시 저장
        }
        return mappedResult;
      } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          console.error('[ChessGrammar] 게임 전술 분석 타임아웃 (10초)');
        } else {
          console.error('[ChessGrammar] 게임 전술 분석 실패:', error.message);
        }
        return null;
      }
    });
  }

  function parseTacticResponse(data) {
    if (!data || !data.tactics || !Array.isArray(data.tactics)) return null;
    return parseTacticList(data.tactics);
  }

  function parseTacticList(tacticList) {
    const tactics = {
      fork: null,
      absPin: null,
      relPin: null,
      pin: null,
      discovered: null,
      checkmate: null,
      trap: null,
      decoy: null,
      skewer: null,
      interference: null,
      doubleCheck: null,
      list: tacticList, // 모든 전술 목록 유지
      raw: tacticList
    };

    tacticList.forEach(t => {
      const pattern = (t.pattern || '').toLowerCase();
      const targets = t.targets || [];
      const hasKingTarget = targets.some(tgt => tgt.piece_name === 'king');

      if (pattern.includes('fork')) tactics.fork = t;
      if (pattern === 'pin') {
        tactics.pin = t;
        if (hasKingTarget) tactics.absPin = t;
        else tactics.relPin = t;
      }
      if (pattern.includes('skewer')) tactics.skewer = t;
      if (pattern.includes('discovered')) tactics.discovered = t;
      
      // 체크메이트 및 메이트 패턴
      if (pattern.includes('mate')) tactics.checkmate = t;
      if (pattern.includes('double_check') || pattern.includes('doublecheck')) tactics.doubleCheck = t;
      
      if (pattern.includes('trap')) tactics.trap = t;
      if (pattern.includes('deflection') || pattern.includes('decoy')) tactics.decoy = t;
      if (pattern.includes('interference')) tactics.interference = t;
    });

    return tactics;
  }

  /**
   * [1단계] → [2단계] 통합 (모든 수에 대해 전술 분석 호출)
   */
  async function analyzeMoveWorkflow(cpBeforeWhite, cpAfterWhite, mover, fenAfter) {
    const step1 = evaluateMove(cpBeforeWhite, cpAfterWhite, mover);
    // 모든 수에 대해 판별하도록 변경됨 (기존 step1.isBad 체크 제거)
    const tactics = await detectTactics(fenAfter);
    return { judgment: step1.judgment, tactics, grammarCalled: true };
  }

  /** @deprecated — analyzeMoveWorkflow 사용 권장 */
  async function detectTacticsIfBlunder(cpBeforeWhite, cpAfterWhite, mover, fen) {
    const step1 = evaluateMove(cpBeforeWhite, cpAfterWhite, mover);
    if (!step1.isBad) return null;
    return detectTactics(fen);
  }

  function buildMoveKey(opts) {
    if (opts.moveKey) return opts.moveKey;
    const fen = opts.fenAfter || opts.currentFen || '';
    const ply = opts.plyIndex != null ? opts.plyIndex : '';
    return `${fen}|${ply}`;
  }

  /**
   * 새 수/포지션당 1회 — debounce + moveKey 중복 방지
   * @param {object} opts
   * @param {number} opts.cpBeforeWhite
   * @param {number} opts.cpAfterWhite
   * @param {string} opts.mover 'w'|'b'
   * @param {string} opts.fenAfter
   * @param {string} [opts.moveKey]
   * @param {number} [opts.debounceMs]
   * @param {boolean} [opts.force]
   * @param {function} [onComplete]
   */
  function scheduleAutoAnalyzeMove(opts, onComplete) {
    if (pendingAnalysisTimer) clearTimeout(pendingAnalysisTimer);
    const debounceMs = opts.debounceMs != null ? opts.debounceMs : 450;

    pendingAnalysisTimer = setTimeout(() => {
      autoAnalyzeMove(opts, onComplete);
    }, debounceMs);
  }

  async function autoAnalyzeMove(opts, onComplete) {
    const moveKey = buildMoveKey(opts);
    const fenAfter = opts.fenAfter || opts.currentFen;

    if (!opts.force && moveKey === lastAnalyzedMoveKey) {
      return null;
    }

    const now = Date.now();
    if (!opts.force && now - lastAnalysisTime < MIN_ANALYSIS_INTERVAL) {
      if (pendingAnalysisTimer) clearTimeout(pendingAnalysisTimer);
      pendingAnalysisTimer = setTimeout(() => {
        autoAnalyzeMove(opts, onComplete);
      }, MIN_ANALYSIS_INTERVAL - (now - lastAnalysisTime));
      return null;
    }

    if (isAnalyzing) {
      return null;
    }

    if (opts.cpBeforeWhite == null || opts.cpAfterWhite == null || !opts.mover || !fenAfter) {
      console.warn('[ChessTactics] 평가치/ FEN 부족 — 분석 스킵');
      return null;
    }

    isAnalyzing = true;
    lastAnalysisTime = now;
    lastAnalyzedMoveKey = moveKey;
    lastAnalyzedFen = fenAfter;

    try {
      console.log('[ChessTactics] [1단계] 수 평가:', moveKey);
      const result = await analyzeMoveWorkflow(
        opts.cpBeforeWhite,
        opts.cpAfterWhite,
        opts.mover,
        fenAfter
      );

      if (result.judgment) {
        console.log('[ChessTactics] 판정:', result.judgment, result.grammarCalled ? '(Grammar API 호출)' : '(Grammar 스킵)');
      } else {
        console.log('[ChessTactics] 양호한 수 — Grammar API 미호출');
      }

      if (typeof onComplete === 'function') {
        onComplete(result);
      }
      return result;
    } catch (e) {
      console.error('[ChessTactics] 자동 분석 오류:', e);
      return null;
    } finally {
      isAnalyzing = false;
    }
  }

  /** @deprecated — scheduleAutoAnalyzeMove 사용 */
  async function autoAnalyzePosition(cpBeforeWhite, cpAfterWhite, mover, currentFen, onAnalysisComplete) {
    return scheduleAutoAnalyzeMove({
      cpBeforeWhite,
      cpAfterWhite,
      mover,
      fenAfter: currentFen,
      currentFen,
    }, onAnalysisComplete);
  }

  function snapshotFromState(st) {
    if (!st) return null;
    if (typeof st === 'string') return st;
    if (st.fen) return st.fen;
    if (typeof global.boardToFen === 'function' && st.board) {
      return global.boardToFen(st.board, st.turn, st.castling, st.enPassant, st.halfMove || 0, st.fullMove || 1);
    }
    return null;
  }

  function applyMoveSnapshot(prevFen, move) {
    if (!prevFen || !move) return null;
    if (typeof global.parseFen !== 'function' || typeof global.applyMoveToBoard !== 'function' || typeof global.boardToFen !== 'function') {
      return null;
    }
    const st = global.parseFen(prevFen);
    if (!st) return null;
    const board = st.board.map(r => [...r]);
    const afterBoard = global.applyMoveToBoard(board, move, st.turn);
    const nextTurn = st.turn === 'w' ? 'b' : 'w';
    const ep = move.doublePush ? [move.to[0] - (st.turn === 'w' ? -1 : 1), move.to[1]] : null;
    return global.boardToFen(afterBoard, nextTurn, st.castling, ep, st.halfMove || 0, (st.fullMove || 1) + (nextTurn === 'w' ? 1 : 0));
  }

  function resetAnalysisState() {
    lastAnalyzedMoveKey = null;
    lastAnalyzedFen = null;
    lastAnalysisTime = 0;
    isAnalyzing = false;
    if (pendingAnalysisTimer) clearTimeout(pendingAnalysisTimer);
    pendingAnalysisTimer = null;
  }

  function formatTacticsSummary(tactics) {
    if (!tactics) return '';
    const names = [];
    if (tactics.fork) names.push('포크');
    if (tactics.absPin) names.push('절대 핀');
    if (tactics.relPin) names.push('상대 핀');
    if (tactics.pin && !tactics.absPin && !tactics.relPin) names.push('핀');
    if (tactics.skewer) names.push('스큐어');
    if (tactics.discovered) names.push('디스커버드 어택');
    if (tactics.trap) names.push('트랩');
    if (tactics.decoy) names.push('유인');
    if (tactics.checkmate) names.push('체크메이트');
    return names.join(', ');
  }

  global.ChessTactics = {
    evaluateMove,
    evaluateMoveJudgment,
    isBadJudgment,
    detectTactics,
    detectTacticsGame,
    parseTacticList,
    analyzeMoveWorkflow,
    detectTacticsIfBlunder,
    scheduleAutoAnalyzeMove,
    autoAnalyzeMove,
    autoAnalyzePosition,
    snapshotFromState,
    applyMoveSnapshot,
    resetAnalysisState,
    formatTacticsSummary,
    BAD_JUDGMENTS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
