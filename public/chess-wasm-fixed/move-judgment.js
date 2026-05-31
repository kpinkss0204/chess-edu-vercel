/**
 * move-judgment.js
 * ─────────────────────────────────────────────────────────────────
 * 현재 플레이어가 방금 둔 수를 lichess-judgment.js 기준으로 평가하고
 * "왜 좋은지 / 왜 나쁜지"를 순수 코드로 계산하여 AI 프롬프트 블록을 조립한다.
 *
 * 의존성:
 *   lichess-judgment.js  — lichessCpAdviceJudgment, lichessMoveAccuracyPercent,
 *                          lichessWinPercentForMover, lichessWinningChancesWhitePov
 *   position-brief.js    — buildPositionBrief (state 객체 board 형식: 'wP','bN' 등)
 *   chess.js             — parseFenBoard, parseFenCastling, parseFenEP,
 *                          getAllLegalMoves, applyMoveToBoard,
 *                          uciToMove, moveToSAN, boardToFen
 *   coach.js             — extractPositionInsights (window 전역)
 *   analysis-cache.js    — window.evalCache, window.normFen
 *
 * 보드 셀 형식: 'wP' | 'wN' | 'bK' | ... | null  (chess.js / position-brief.js 공통)
 *
 * 파이프라인:
 *   Step 1  평가값 수집    fenBefore/After → evalCache or 단발 Stockfish
 *   Step 2  lichess 판정   cpAdvice / accuracyPercent / wpLoss
 *   Step 3  fenAfterBest   엔진 최선수 적용 FEN 생성
 *   Step 4  reasons 계산   10개 항목 독립 분석
 *   Step 4.5 정합성 필터   판정 등급 ↔ reasons 불협화음 제거
 *   Step 5  prompt 조립    buildCommentaryPrompt()에 주입할 블록 반환
 * ─────────────────────────────────────────────────────────────────
 */
(function (global) {
  'use strict';

  // ── 상수 ────────────────────────────────────────────────────────
  // 보드 셀 형식: 'wP','bN' 등 2글자 문자열 (chess.js / position-brief.js 공통)
  const PIECE_VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
  const PIECE_KR  = { P: '폰', N: '나이트', B: '비숍', R: '룩', Q: '퀸', K: '킹' };
  const COLOR_KR  = { w: '백', b: '흑' };

  // wpLoss 임계값
  const WP_GOOD = -5; // 승률 증가 5% 이상 → 좋은 수

  // ── 유틸: FEN → state ───────────────────────────────────────────
  function fenToState(fen) {
    if (!fen || typeof global.parseFenBoard !== 'function') return null;
    const parts = fen.trim().split(/\s+/);
    const board = global.parseFenBoard(parts[0]);
    if (!board) return null;
    return {
      board,
      turn:      parts[1] || 'w',
      castling:  global.parseFenCastling ? global.parseFenCastling(parts[2] || '-') : {},
      enPassant: global.parseFenEP ? global.parseFenEP(parts[3] || '-') : null,
      fen,
    };
  }

  function cloneBoard(board) {
    return board.map(r => [...r]);
  }

  // ── 유틸: 보드 기물 집계 ────────────────────────────────────────
  // 보드 셀 형식: 'wP' | 'bN' | null
  function countPieces(board) {
    const cnt = {
      w: { P:0, N:0, B:0, R:0, Q:0 },
      b: { P:0, N:0, B:0, R:0, Q:0 },
    };
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (!cell || cell.length < 2) continue;
        const color = cell[0], piece = cell[1];
        if (cnt[color] && cnt[color][piece] !== undefined) cnt[color][piece]++;
      }
    }
    return cnt;
  }

  // ── 유틸: 칸 공격자 계산 (getAttackers — coach.js와 동일 로직) ──
  function idxToSq(r, f) { return 'abcdefgh'[f] + (8 - r); }

  function getAttackersOnSquare(board, targetR, targetF) {
    const out = { w: [], b: [] };
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (!cell || cell.length < 2) continue;
        const color = cell[0], piece = cell[1];
        const dr = targetR - r, df = targetF - f;

        if (piece === 'P') {
          const dir = color === 'w' ? -1 : 1;
          if (dr === dir && Math.abs(df) === 1) out[color].push({ sq: idxToSq(r,f), piece, r, f });
          continue;
        }
        if (piece === 'N') {
          if ((Math.abs(dr)===2 && Math.abs(df)===1)||(Math.abs(dr)===1 && Math.abs(df)===2))
            out[color].push({ sq: idxToSq(r,f), piece, r, f });
          continue;
        }
        if (piece === 'K') {
          if (Math.abs(dr)<=1 && Math.abs(df)<=1 && (dr!==0||df!==0))
            out[color].push({ sq: idxToSq(r,f), piece, r, f });
          continue;
        }
        const straight = dr===0 || df===0;
        const diagonal = Math.abs(dr)===Math.abs(df);
        if (piece==='R' && !straight) continue;
        if (piece==='B' && !diagonal) continue;
        if (piece==='Q' && !straight && !diagonal) continue;

        const sr = dr===0 ? 0 : dr/Math.abs(dr);
        const sf = df===0 ? 0 : df/Math.abs(df);
        let blocked = false;
        let cr = r+sr, cf = f+sf;
        while (cr!==targetR || cf!==targetF) {
          if (board[cr][cf]) { blocked=true; break; }
          cr+=sr; cf+=sf;
        }
        if (!blocked) out[color].push({ sq: idxToSq(r,f), piece, r, f });
      }
    }
    return out;
  }

  // ── 유틸: 핸깅 기물 감지 (position-brief.js detectHangingPieces 동일 로직) ──
  function detectHanging(board) {
    const hanging = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (!cell || cell.length < 2) continue;
        const color = cell[0], piece = cell[1];
        if (piece === 'K') continue;
        const val = PIECE_VAL[piece] || 0;
        if (val < 3) continue; // 폰은 제외 (3점 이상만)

        const atks = getAttackersOnSquare(board, r, f);
        const opp = color === 'w' ? 'b' : 'w';
        const oppAtks = atks[opp];
        const defAtks = atks[color].filter(a => !(a.r===r && a.f===f));
        if (oppAtks.length === 0) continue;
        if (defAtks.length === 0 || oppAtks.length > defAtks.length) {
          const sq = idxToSq(r, f);
          const atkDesc = oppAtks.map(a => `${PIECE_KR[a.piece]}(${a.sq})`).join('+');
          hanging.push({
            sq, piece, color,
            detail: defAtks.length === 0
              ? `${COLOR_KR[color]} ${PIECE_KR[piece]}(${sq}) 무방비 — ${atkDesc}에게 공격받음`
              : `${COLOR_KR[color]} ${PIECE_KR[piece]}(${sq}) — 공격 ${oppAtks.length} vs 수비 ${defAtks.length}`,
          });
        }
      }
    }
    return hanging;
  }

  // ── 유틸: 메이트 인 원 감지 (position-brief.js detectMateInOne 동일 로직) ──
  function detectMateInOne(state) {
    if (typeof global.getAllLegalMoves !== 'function' ||
        typeof global.moveToSAN !== 'function') return [];
    const { board, turn, castling, enPassant } = state;
    const legal = global.getAllLegalMoves(board, turn, castling, enPassant);
    const mates = [];
    for (const move of legal) {
      const san = global.moveToSAN(board, move, turn, legal);
      if (san && san.endsWith('#')) {
        mates.push({ san, detail: `${COLOR_KR[turn]}이 ${san}로 즉시 메이트 가능` });
      }
    }
    return mates;
  }

  // ── 유틸: 킹 안전 점수 (간이) ───────────────────────────────────
  function kingSafetyScore(board, color) {
    let score = 0;
    let kingR = -1, kingF = -1;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (cell && cell === color + 'K') { kingR = r; kingF = f; }
      }
    }
    if (kingR < 0) return 0;
    const opp = color === 'w' ? 'b' : 'w';

    // 폰 방패
    const shieldR = color === 'w' ? kingR - 1 : kingR + 1;
    if (shieldR >= 0 && shieldR < 8) {
      for (let sf = Math.max(0, kingF-1); sf <= Math.min(7, kingF+1); sf++) {
        if (board[shieldR][sf] === color + 'P') score += 1;
      }
    }
    // 열린 파일 패널티
    for (let df = -1; df <= 1; df++) {
      const cf = kingF + df;
      if (cf < 0 || cf > 7) continue;
      let friendlyPawn = false, enemyHeavy = false;
      for (let r = 0; r < 8; r++) {
        const cell = board[r][cf];
        if (!cell) continue;
        if (cell === color + 'P') friendlyPawn = true;
        if (cell === opp + 'R' || cell === opp + 'Q') enemyHeavy = true;
      }
      if (!friendlyPawn) score -= 1;
      if (!friendlyPawn && enemyHeavy) score -= 1;
    }
    return score;
  }

  // ── 유틸: 합법 수 개수 ─────────────────────────────────────────
  function mobilityCount(state) {
    if (!state || typeof global.getAllLegalMoves !== 'function') return 0;
    try {
      return global.getAllLegalMoves(
        state.board, state.turn, state.castling, state.enPassant
      ).length;
    } catch(e) { return 0; }
  }

  // ── Step 1: evalCache 조회 ────────────────────────────────────
  function getCpFromCache(fen) {
    if (!fen || !global.evalCache || typeof global.normFen !== 'function') return null;
    const key = global.normFen(fen);
    const cached = global.evalCache[key];
    if (!cached || !cached.pvs || !cached.pvs[1]) return null;
    const cpw = cached.pvs[1].cpFromWhite;
    return (cpw !== null && cpw !== undefined) ? cpw : null;
  }

  function getBestUciFromCache(fen) {
    if (!fen || !global.evalCache || typeof global.normFen !== 'function') return null;
    const key = global.normFen(fen);
    const cached = global.evalCache[key];
    if (!cached || !cached.pvs || !cached.pvs[1]) return null;
    const pv = cached.pvs[1].pv;
    if (!pv || !pv.length) return null;
    const head = pv[0].trim().split(/\s+/)[0];
    const m = head.match(/^([a-h][1-8][a-h][1-8][qrbn]?)$/i);
    return m ? m[1].toLowerCase() : null;
  }

  async function ensureCpForFen(fen) {
    const cached = getCpFromCache(fen);
    if (cached !== null) return cached;
    if (typeof global.createStockfishWorker !== 'function' ||
        typeof global.analyzeWithWorker !== 'function') return null;
    try {
      const workerRaw = await global.createStockfishWorker(1, 32);
      const workerObj = { worker: workerRaw, busy: false };
      const result = await global.analyzeWithWorker(
        workerObj, fen,
        global.LICHESS_SF_DEPTH    || 18,
        global.LICHESS_SF_MOVETIME || 900,
        1
      );
      try { workerRaw.terminate(); } catch(e) {}
      if (result && result.pvs && result.pvs[1] && result.pvs[1].cpFromWhite != null) {
        if (global.evalCache && typeof global.normFen === 'function') {
          const key = global.normFen(fen);
          if (!global.evalCache[key]) global.evalCache[key] = { pvs: {} };
          global.evalCache[key].pvs[1] = result.pvs[1];
        }
        return result.pvs[1].cpFromWhite;
      }
    } catch(e) {
      console.warn('[MoveJudgment] 단발 Stockfish 실패:', e);
    }
    return null;
  }

  // ── Step 3: fenAfterBest 생성 ─────────────────────────────────
  function buildFenAfterBest(fenBefore, bestUci) {
    if (!fenBefore || !bestUci) return null;
    if (typeof global.uciToMove !== 'function' ||
        typeof global.applyMoveToBoard !== 'function' ||
        typeof global.boardToFen !== 'function') return null;
    try {
      const parts = fenBefore.trim().split(/\s+/);
      const board = global.parseFenBoard(parts[0]);
      const turn  = parts[1] || 'w';
      const cast  = global.parseFenCastling(parts[2] || '-');
      const ep    = global.parseFenEP(parts[3] || '-');
      const fm    = parseInt(parts[5] || '1', 10);
      if (!board) return null;

      const move = global.uciToMove(bestUci, board, turn, cast, ep);
      if (!move) return null;

      const boardAfter = global.applyMoveToBoard(cloneBoard(board), move, turn);
      const oppTurn    = turn === 'w' ? 'b' : 'w';

      const newCast = { ...cast };
      if (move.from[0]===7 && move.from[1]===4) { newCast.wK=false; newCast.wQ=false; }
      if (move.from[0]===0 && move.from[1]===4) { newCast.bK=false; newCast.bQ=false; }
      if (move.from[0]===7 && move.from[1]===7) newCast.wK=false;
      if (move.from[0]===7 && move.from[1]===0) newCast.wQ=false;
      if (move.from[0]===0 && move.from[1]===7) newCast.bK=false;
      if (move.from[0]===0 && move.from[1]===0) newCast.bQ=false;

      const newEp = move.doublePush
        ? [move.to[0] - (turn==='w' ? -1 : 1), move.to[1]]
        : null;

      return global.boardToFen(boardAfter, oppTurn, newCast, newEp, 0, fm);
    } catch(e) {
      console.warn('[MoveJudgment] fenAfterBest 생성 실패:', e);
      return null;
    }
  }

  function bestUciToSan(fenBefore, bestUci) {
    if (!fenBefore || !bestUci) return bestUci || null;
    if (typeof global.uciToMove !== 'function' ||
        typeof global.moveToSAN !== 'function' ||
        typeof global.getAllLegalMoves !== 'function') return bestUci;
    try {
      const parts = fenBefore.trim().split(/\s+/);
      const board = global.parseFenBoard(parts[0]);
      const turn  = parts[1] || 'w';
      const cast  = global.parseFenCastling(parts[2] || '-');
      const ep    = global.parseFenEP(parts[3] || '-');
      const move  = global.uciToMove(bestUci, board, turn, cast, ep);
      if (!move) return bestUci;
      const legal = global.getAllLegalMoves(board, turn, cast, ep);
      return global.moveToSAN(board, move, turn, legal) || bestUci;
    } catch(e) { return bestUci; }
  }

  // ── Step 4: reasons 10개 계산 ─────────────────────────────────

  // ① lostMaterial
  function calcLostMaterial(boardBefore, boardAfterPlayed, mover) {
    const before = countPieces(boardBefore);
    const after  = countPieces(boardAfterPlayed);
    const opp    = mover === 'w' ? 'b' : 'w';

    // 내가 잃은 기물 (before - after)
    const myLoss = ['N','B','R','Q'].filter(p => before[mover][p] > after[mover][p])
      .map(p => ({ piece: p, cnt: before[mover][p] - after[mover][p], val: PIECE_VAL[p] }));
    // 내가 얻은 기물 (상대가 잃음)
    const oppLoss = ['P','N','B','R','Q'].filter(p => before[opp][p] > after[opp][p])
      .map(p => ({ piece: p, cnt: before[opp][p] - after[opp][p], val: PIECE_VAL[p] }));

    const myLossVal  = myLoss.reduce((s,x)=>s+x.val*x.cnt,0);
    const oppLossVal = oppLoss.reduce((s,x)=>s+x.val*x.cnt,0);
    const netLoss    = myLossVal - oppLossVal;

    if (myLossVal===0 && oppLossVal===0) return null; // quiet move

    const lostStr = myLoss.map(x=>`${PIECE_KR[x.piece]}(${x.val}점)`).join('+');
    const gainStr = oppLoss.map(x=>`${COLOR_KR[opp]} ${PIECE_KR[x.piece]}(${x.val}점) 포획`).join(' / ');

    if (netLoss > 0) {
      return {
        sign: 'minus', netLoss,
        text: `기물 교환: ${lostStr} 잃고 ${gainStr||'획득 없음'} → 순손실 ${netLoss}점`,
      };
    } else if (netLoss < 0) {
      return {
        sign: 'plus', netGain: -netLoss,
        text: `기물 교환: ${gainStr} — 순이득 ${-netLoss}점`,
      };
    } else {
      return {
        sign: 'neutral',
        text: `기물 교환: ${gainStr} — 등가 교환`,
      };
    }
  }

  // ② hangingAfterPlayed
  function calcHangingAfterPlayed(boardAfterPlayed, mover) {
    const hanging = detectHanging(boardAfterPlayed);
    const mine = hanging.filter(h => h.color === mover);
    if (!mine.length) return null;
    return {
      sign: 'minus',
      items: mine,
      text: mine.map(h =>
        `수 이후 ${COLOR_KR[mover]} ${PIECE_KR[h.piece]||h.piece}(${h.sq}) 무방비 — 상대가 즉시 포획 가능`
      ).join(' / '),
    };
  }

  // ③ hangingAfterBest
  function calcHangingAfterBest(boardAfterBest, mover) {
    if (!boardAfterBest) return null;
    const hanging = detectHanging(boardAfterBest);
    const opp = mover === 'w' ? 'b' : 'w';
    const oppHanging = hanging.filter(h => h.color === opp);
    if (!oppHanging.length) return null;
    return {
      sign: 'plus',
      items: oppHanging,
      text: oppHanging.map(h =>
        `최선수 이후 ${COLOR_KR[opp]} ${PIECE_KR[h.piece]||h.piece}(${h.sq}) 무방비 — 즉시 포획 가능`
      ).join(' / '),
    };
  }

  // ④ kingSafetyChange
  function calcKingSafetyChange(boardAfterPlayed, boardAfterBest, mover) {
    const scorePlayed = kingSafetyScore(boardAfterPlayed, mover);
    const scoreBest   = boardAfterBest ? kingSafetyScore(boardAfterBest, mover) : null;

    let playedItem = null;
    if (scorePlayed <= -1) {
      playedItem = {
        sign: 'minus', score: scorePlayed,
        text: `실제 수 이후 ${COLOR_KR[mover]} 킹 안전도 저하 (방패 폰 부족 / 열린 파일 노출)`,
      };
    }

    let diffItem = null;
    if (scoreBest !== null) {
      const diff = scoreBest - scorePlayed;
      if (diff >= 2) {
        diffItem = {
          sign: 'minus', diff,
          text: `최선수 대비 킹 안전도 차이 큼 (+${diff}점) — 최선수가 킹을 훨씬 안전하게 유지`,
        };
      } else if (diff >= 1) {
        diffItem = {
          sign: 'minor_minus', diff,
          text: `최선수 대비 킹 안전도 소폭 불리 (+${diff}점)`,
        };
      }
    }
    return { played: playedItem, diff: diffItem };
  }

  // ⑤ mobilityChange
  function calcMobilityChange(stateAfterPlayed, stateAfterBest, mover) {
    const opp = mover === 'w' ? 'b' : 'w';
    const oppState = stateAfterPlayed
      ? { ...stateAfterPlayed, board: stateAfterPlayed.board, turn: opp }
      : null;
    const oppMobPlayed = oppState ? mobilityCount(oppState) : 0;

    const myMobPlayed = mobilityCount(stateAfterPlayed);
    const myMobBest   = stateAfterBest ? mobilityCount(stateAfterBest) : null;

    let oppMobBest = null;
    if (stateAfterBest) {
      const oppStateBest = { ...stateAfterBest, turn: opp };
      oppMobBest = mobilityCount(oppStateBest);
    }

    const results = [];
    if (oppMobBest !== null) {
      const oppDiff = oppMobPlayed - oppMobBest;
      if (oppDiff >= 4) {
        results.push({
          sign: 'minus',
          text: `실제 수 이후 상대 합법 수 ${oppDiff}개 더 많음 (${oppMobPlayed}개 vs 최선수 후 ${oppMobBest}개) — 상대 활동성 증가`,
        });
      }
    }
    if (myMobBest !== null) {
      const myDiff = myMobBest - myMobPlayed;
      if (myDiff >= 4) {
        results.push({
          sign: 'minus',
          text: `최선수 대비 내 합법 수 ${myDiff}개 적음 (${myMobPlayed}개 vs ${myMobBest}개) — 기물 활동성 감소`,
        });
      }
    }
    return results;
  }

  // ⑥ mateCreated: 최선수 이후 내가 메이트 위협 생성 가능한지
  function calcMateCreated(stateAfterBest, bestSan, mover) {
    if (!stateAfterBest) return null;
    // stateAfterBest.turn은 상대 차례. 내 차례(mover)로 바꿔서 detectMateInOne
    const myState = { ...stateAfterBest, turn: mover };
    const m1 = detectMateInOne(myState);
    if (m1.length) {
      return {
        sign: 'plus', depth: 1,
        text: `${bestSan} 이후 ${m1[0].san} 1수 메이트 위협 생성 — 상대 반드시 응수 필요`,
      };
    }
    return null;
  }

  // ⑦ mateMissed: 수 두기 전에 이미 메이트가 있었는지
  function calcMateMissed(stateBefore, playedSan) {
    const m1 = detectMateInOne(stateBefore);
    if (m1.length) {
      const mateSan = m1[0].san || '';
      if (mateSan && mateSan !== playedSan) {
        return {
          sign: 'minus',
          text: `현재 포지션에서 ${mateSan}로 즉시 메이트가 있었음 — ${playedSan}은 이 기회를 놓침`,
        };
      }
    }
    return null;
  }

  // ⑧ materialGainBest
  function calcMaterialGainBest(boardBefore, boardAfterBest, mover, bestSan) {
    if (!boardAfterBest) return null;
    const before = countPieces(boardBefore);
    const after  = countPieces(boardAfterBest);
    const opp    = mover === 'w' ? 'b' : 'w';

    const oppLoss = ['P','N','B','R','Q'].filter(p => before[opp][p] > after[opp][p])
      .map(p => ({ piece: p, cnt: before[opp][p] - after[opp][p], val: PIECE_VAL[p] }));
    const myLoss  = ['N','B','R','Q'].filter(p => before[mover][p] > after[mover][p])
      .map(p => ({ piece: p, cnt: before[mover][p] - after[mover][p], val: PIECE_VAL[p] }));

    const gainVal = oppLoss.reduce((s,x)=>s+x.val*x.cnt, 0);
    const lossVal = myLoss.reduce((s,x)=>s+x.val*x.cnt, 0);
    const net = gainVal - lossVal;

    if (gainVal === 0) {
      return { sign: 'neutral', text: `${bestSan}는 즉시 포획 없음 — 장기적 포지션 우세 노림` };
    }
    if (net > 0) {
      const gainStr = oppLoss.map(x=>`${PIECE_KR[x.piece]}(${x.val}점)`).join('+');
      return {
        sign: 'plus', net,
        text: `${bestSan}로 ${COLOR_KR[opp]} ${gainStr} 즉시 포획 가능 — 순이득 +${net}점`,
      };
    }
    return null;
  }

  // ⑨ tacticsAfterBest: coach.js의 extractPositionInsights 재사용
  const TACTIC_TAGS = ['[포크]','[이중 압박]','[킹존 압박]','[디스커버드 어택]',
                       '[집중 압박]','[수적 우세]','[추크추방]'];
  function calcTacticsAfterBest(fenAfterBest, bestSan) {
    if (!fenAfterBest || typeof global.extractPositionInsights !== 'function') return [];
    try {
      const insights = global.extractPositionInsights(fenAfterBest) || [];
      return insights
        .filter(s => TACTIC_TAGS.some(tag => s.startsWith(tag)))
        .slice(0, 3)
        .map(t => ({ sign: 'plus', text: `${bestSan} 이후 ${t}` }));
    } catch(e) { return []; }
  }

  // ⑩ missedTactic
  function calcMissedTactic(mateCreated, hangingAfterBest, tacticsAfterBest, bestSan) {
    if (mateCreated) {
      return { sign: 'minus', priority: 'mate', text: `[놓친 기회] ${bestSan}를 뒀다면 메이트 위협 생성 가능` };
    }
    if (hangingAfterBest && hangingAfterBest.items && hangingAfterBest.items.length) {
      const first = hangingAfterBest.items[0];
      return {
        sign: 'minus', priority: 'capture',
        text: `[놓친 포획] ${bestSan} 이후 ${PIECE_KR[first.piece]||first.piece}(${first.sq}) 즉시 포획 가능`,
      };
    }
    if (tacticsAfterBest.length) {
      return {
        sign: 'minus', priority: 'tactic',
        text: `[놓친 전술] ${bestSan} 이후 ${tacticsAfterBest[0].text.replace(bestSan+' 이후 ','')}`,
      };
    }
    return null;
  }

  // ── Step 4.5: 정합성 필터 ─────────────────────────────────────
  function filterReasons(judgment, wpLoss, raw) {
    const isGood       = wpLoss <= WP_GOOD;
    const isOk         = wpLoss > WP_GOOD && wpLoss <= 0;
    const isInaccuracy = judgment === 'inaccuracy';
    const isMistake    = judgment === 'mistake';
    const isBlunder    = judgment === 'blunder';

    const allMinus = [], allPlus = [];
    function collect(item) {
      if (!item) return;
      if (Array.isArray(item)) { item.forEach(collect); return; }
      if (item.sign === 'minus' || item.sign === 'minor_minus') allMinus.push(item);
      if (item.sign === 'plus' || item.sign === 'neutral') allPlus.push(item);
    }

    collect(raw.lostMaterial);
    collect(raw.hangingAfterPlayed);
    collect(raw.hangingAfterBest);
    collect(raw.kingSafety.played);
    collect(raw.kingSafety.diff);
    collect(raw.mobility);
    collect(raw.mateCreated);
    collect(raw.mateMissed);
    collect(raw.materialGainBest);
    collect(raw.tacticsAfterBest);
    collect(raw.missedTactic);

    // Case 1: Best/OK — 마이너스 제거, 플러스만
    if (isGood || isOk) {
      return { playedSection: [], bestSection: allPlus, quietBlunder: false, contradictionNote: null };
    }

    // Case 2: Blunder인데 유효 reasons 없음 → Quiet Blunder
    const validMinus = allMinus.filter(x => x.sign !== 'minor_minus');
    if (isBlunder && validMinus.length === 0) {
      return {
        playedSection: [], bestSection: allPlus,
        quietBlunder: true,
        contradictionNote:
          '코드 레벨에서 즉각적인 기물·전술 실수는 감지되지 않았으나 ' +
          '엔진 분석 결과 장기적인 주도권·포지션 제어력을 크게 잃는 수입니다. ' +
          '활동성 감소·공간 손실·포지션적 열세 위주로 설명하세요.',
      };
    }

    // Case 3: Mistake인데 기물 획득 있음 → 컨텍스트 주석
    let contextNote = null;
    if (isMistake && raw.lostMaterial && raw.lostMaterial.sign === 'plus') {
      contextNote = '기물을 획득했지만 포지션적으로 손해인 수입니다. 포지션적 약점 위주로 설명하세요.';
    }

    // Case 4: Inaccuracy — minor_minus 제거
    let playedItems = allMinus;
    if (isInaccuracy) {
      playedItems = allMinus.filter(x => x.sign !== 'minor_minus');
    }

    return {
      playedSection: playedItems,
      bestSection: allPlus,
      quietBlunder: false,
      contradictionNote: contextNote,
    };
  }

  // ── Quiet Blunder 강제 계산 ───────────────────────────────────
  function buildQuietBlunderData(stateAfterPlayed, stateAfterBest, mover, cpLoss) {
    const lines = [];
    const opp = mover === 'w' ? 'b' : 'w';

    const myMob  = mobilityCount(stateAfterPlayed);
    const myMobB = stateAfterBest ? mobilityCount(stateAfterBest) : null;
    const oppState = stateAfterPlayed ? { ...stateAfterPlayed, turn: opp } : null;
    const oppMob = oppState ? mobilityCount(oppState) : 0;
    const oppMobBest = stateAfterBest ? mobilityCount({ ...stateAfterBest, turn: opp }) : null;

    if (myMobB !== null && myMobB - myMob >= 3) {
      lines.push(`내 기물 활동성: 실제 수 후 ${myMob}개 → 최선수 후 ${myMobB}개 (${myMobB-myMob}개 차이)`);
    }
    if (oppMobBest !== null && oppMob - oppMobBest >= 3) {
      lines.push(`상대 활동성: 실제 수 후 상대 합법 수 ${oppMob}개 → 최선수 후 ${oppMobBest}개`);
    }

    const ksPlayed = kingSafetyScore(stateAfterPlayed.board, mover);
    const ksBest   = stateAfterBest ? kingSafetyScore(stateAfterBest.board, mover) : null;
    if (ksBest !== null && ksBest - ksPlayed >= 1) {
      lines.push(`킹 안전: 실제 수 후 점수 ${ksPlayed} → 최선수 후 ${ksBest} (차이 ${ksBest-ksPlayed}점)`);
    }

    if (cpLoss !== null && cpLoss > 1.0) {
      lines.push(`포지션 제어력 손실: 엔진 평가 ${cpLoss.toFixed(1)}폰 상당 — 장기적 주도권 상실`);
    }

    return lines;
  }

  // ── Step 5: prompt 블록 조립 ──────────────────────────────────
  function buildPromptBlock(params) {
    const {
      judgment, accuracy, wpLoss,
      mover, playedSan, bestSan,
      wasEngineMove, filtered, quietLines,
    } = params;

    const moverKr = COLOR_KR[mover];
    const lines   = [];

    // "수 옆에 평가 딱지는 붙이지 말고" 요청에 따라 이모지 제거
    const judgmentKr = {
      blunder:    '블런더',
      mistake:    '실수',
      inaccuracy: '부정확한 수',
    }[judgment] || (wpLoss <= WP_GOOD ? '좋은 수' : '정확한 수');

    lines.push(`[방금 둔 수 평가 — 코드 계산 사실, AI는 이 데이터만 사용]`);
    lines.push(``);
    lines.push(`${moverKr}이 ${playedSan}을(를) 두었습니다`);
    lines.push(`판정: ${judgmentKr} | 정확도: ${accuracy}% | 승률 변화: ${wpLoss > 0 ? '-' : '+'}${Math.abs(wpLoss).toFixed(1)}%`);

    if (wasEngineMove) {
      lines.push(`※ 엔진 최선수와 일치하는 수입니다.`);
    } else if (bestSan) {
      lines.push(`엔진 최선수: ${bestSan}`);
    }
    lines.push(``);

    if (filtered.playedSection.length > 0) {
      lines.push(`━━ 실제로 둔 수(${playedSan}) 이후 상태 ━━`);
      filtered.playedSection.forEach(item => lines.push(`• ${item.text}`));
      lines.push(``);
    }

    if (filtered.quietBlunder && quietLines.length > 0) {
      lines.push(`━━ 포지션적 손실 (즉각 전술 없음) ━━`);
      quietLines.forEach(l => lines.push(`• ${l}`));
      lines.push(``);
    }

    if (filtered.bestSection.length > 0 && bestSan && !wasEngineMove) {
      lines.push(`━━ 엔진 최선수(${bestSan})를 뒀다면 ━━`);
      filtered.bestSection.forEach(item => lines.push(`• ${item.text}`));
      lines.push(``);
    }

    if (filtered.contradictionNote) {
      lines.push(`[AI 해설 지침] ${filtered.contradictionNote}`);
      lines.push(``);
    }

    lines.push(`[AI 해설 지침]`);
    if (judgment === 'blunder' || judgment === 'mistake') {
      const jLabel = judgment === 'blunder' ? '블런더' : '실수';
      lines.push(`• **직전 수 분석** 섹션 첫 문장을 "${moverKr}이 ${playedSan}을(를) 두었는데 이는 ${jLabel}입니다"로 시작하세요.`);
      lines.push(`• 위 코드 계산 근거만 사용하세요. 수치(승률%, cp)는 언급하지 마세요.`);
      lines.push(`• 이 데이터에 없는 이유를 만들어내지 마세요.`);
    } else if (wpLoss <= WP_GOOD) {
      lines.push(`• **직전 수 분석** 섹션에서 ${moverKr}의 ${playedSan}이 좋은 이유를 위 데이터 기반으로 설명하세요.`);
      lines.push(`• 마이너스 요인은 언급하지 마세요 (이미 필터링됨).`);
    } else {
      lines.push(`• 직전 수에 대한 평가를 **직전 수 분석** 섹션에 자연스럽게 서술하세요.`);
    }

    return lines.join('\n');
  }

  // ── 메인 함수: buildMoveJudgment ──────────────────────────────
  async function buildMoveJudgment(game) {
    try {
      if (!game || game.historyIndex < 0) return null;
      const h = game.history[game.historyIndex];
      if (!h) return null;

      const fenBefore = h.fenBefore;
      const fenAfter  = h.fenAfter || (
        typeof global.boardToFen === 'function'
          ? global.boardToFen(game.board, game.turn, game.castling, game.enPassant, game.halfMove, game.fullMove)
          : null
      );
      const playedSan = h.san;
      const mover     = h.turn || 'w';

      if (!fenBefore || !fenAfter || !playedSan) return null;

      // Step 1: 평가값 수집
      let cpBefore = getCpFromCache(fenBefore);
      if (cpBefore === null) cpBefore = await ensureCpForFen(fenBefore);

      let cpAfter = getCpFromCache(fenAfter);
      if (cpAfter === null) cpAfter = await ensureCpForFen(fenAfter);

      if (cpBefore === null || cpAfter === null) {
        console.warn('[MoveJudgment] 평가값 수집 실패:', { cpBefore, cpAfter });
        return null;
      }

      // Step 2: lichess 판정
      const judgment = global.lichessCpAdviceJudgment(cpBefore, cpAfter, mover);
      const wpBefore = global.lichessWinPercentForMover(cpBefore, mover);
      const wpAfter  = global.lichessWinPercentForMover(cpAfter,  mover);
      const accuracy = global.lichessMoveAccuracyPercent(wpBefore, wpAfter);
      const wpLoss   = parseFloat((wpBefore - wpAfter).toFixed(2));
      const cpLoss   = mover === 'w'
        ? parseFloat(((cpBefore - cpAfter) / 100).toFixed(2))
        : parseFloat(((cpAfter - cpBefore) / 100).toFixed(2));

      // Step 3: fenAfterBest 생성
      const bestUci      = getBestUciFromCache(fenBefore);
      const bestSan      = bestUci ? bestUciToSan(fenBefore, bestUci) : null;
      const fenAfterBest = bestUci ? buildFenAfterBest(fenBefore, bestUci) : null;
      const wasEngineMove = !!(bestSan && playedSan === bestSan);

      const stateBefore      = fenToState(fenBefore);
      const stateAfterPlayed = fenToState(fenAfter);
      const stateAfterBest   = fenAfterBest ? fenToState(fenAfterBest) : null;

      if (!stateBefore || !stateAfterPlayed) return null;

      // Step 4: reasons 계산
      const raw = {
        lostMaterial:       calcLostMaterial(stateBefore.board, stateAfterPlayed.board, mover),
        hangingAfterPlayed: calcHangingAfterPlayed(stateAfterPlayed.board, mover),
        hangingAfterBest:   calcHangingAfterBest(stateAfterBest ? stateAfterBest.board : null, mover),
        kingSafety:         calcKingSafetyChange(
                              stateAfterPlayed.board,
                              stateAfterBest ? stateAfterBest.board : null,
                              mover
                            ),
        mobility:           calcMobilityChange(stateAfterPlayed, stateAfterBest, mover),
        mateCreated:        calcMateCreated(stateAfterBest, bestSan, mover),
        mateMissed:         calcMateMissed(stateBefore, playedSan),
        materialGainBest:   calcMaterialGainBest(
                              stateBefore.board,
                              stateAfterBest ? stateAfterBest.board : null,
                              mover, bestSan
                            ),
        tacticsAfterBest:   calcTacticsAfterBest(fenAfterBest, bestSan),
        missedTactic:       null,
      };
      raw.missedTactic = calcMissedTactic(
        raw.mateCreated, raw.hangingAfterBest, raw.tacticsAfterBest, bestSan
      );

      // Step 4.5: 정합성 필터
      const filtered = filterReasons(judgment, wpLoss, raw);

      let quietLines = [];
      if (filtered.quietBlunder) {
        quietLines = buildQuietBlunderData(stateAfterPlayed, stateAfterBest, mover, cpLoss);
      }

      // Step 5: prompt 조립
      const promptBlock = buildPromptBlock({
        judgment, accuracy, wpLoss,
        mover, playedSan, bestSan,
        wasEngineMove, filtered, quietLines,
      });

      return { judgment, accuracy, wpLoss, cpLoss, mover, playedSan, bestSan, wasEngineMove, promptBlock, raw, filtered };

    } catch(e) {
      console.error('[MoveJudgment] buildMoveJudgment 오류:', e);
      return null;
    }
  }

  global.buildMoveJudgment = buildMoveJudgment;

})(typeof window !== 'undefined' ? window : globalThis);