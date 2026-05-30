/**
 * 포지션 구조화 브리프 — AI 코치에 "검증된 사실"만 전달.
 * chess.js (parseFenBoard, getAllLegalMoves, applyMoveToBoard, moveToSAN, uciToMove) 필요.
 */
(function (global) {
  'use strict';

  const PIECE_KR = { P: '폰', N: '나이트', B: '비숍', R: '룩', Q: '퀸', K: '킹' };
  const PIECE_VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 99 };
  const COLOR_KR = { w: '백', b: '흑' };
  const INSIGHT_CATEGORY = {
    '집중 압박': 'threat', '이중 압박': 'threat', '수적 우세': 'threat',
    '킹 안전 위협': 'threat', '킹존 압박': 'threat', '포크': 'threat',
    '추크추방': 'threat', '디스커버드 어택': 'threat',
    '배터리': 'idea', '대각 배터리': 'idea', '열린 파일 독점': 'idea',
    '반열린 파일': 'idea', '아웃포스트': 'idea', '통과 폰': 'idea',
    '전장 판단': 'idea', '공격 방향': 'idea', '마이너리티 공격': 'idea',
    '예방 전진': 'idea', '주도권': 'idea',
    '고립 폰': 'weakness', '이중 폰': 'weakness', '뒤처진 폰': 'weakness',
    '기물 과부하': 'weakness', '기물 가치↓': 'weakness',
    '폰 사슬': 'strength', '폰 영역 우세': 'strength', '기물 가치↑': 'strength',
  };

  function parseFenState(fen) {
    const parts = (fen || '').trim().split(/\s+/);
    const board = global.parseFenBoard(parts[0]);
    if (!board) return null;
    return {
      board,
      turn: parts[1] || 'w',
      castling: global.parseFenCastling(parts[2] || '-'),
      enPassant: global.parseFenEP(parts[3] || '-'),
    };
  }

  function idxToSq(r, f) {
    return 'abcdefgh'[f] + (8 - r);
  }

  function isLightSquare(r, f) {
    return (r + f) % 2 === 0;
  }

  /** 칸을 공격하는 기물 (슬라이딩 경로 포함) */
  function getAttackersOnSquare(board, targetR, targetF) {
    const out = { w: [], b: [] };
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (!cell) continue;
        const color = cell[0];
        const piece = cell[1];
        const dr = targetR - r;
        const df = targetF - f;

        if (piece === 'P') {
          const dir = color === 'w' ? -1 : 1;
          if (dr === dir && Math.abs(df) === 1) out[color].push({ sq: idxToSq(r, f), piece });
          continue;
        }
        if (piece === 'N') {
          if ((Math.abs(dr) === 2 && Math.abs(df) === 1) || (Math.abs(dr) === 1 && Math.abs(df) === 2))
            out[color].push({ sq: idxToSq(r, f), piece });
          continue;
        }
        if (piece === 'K') {
          if (Math.abs(dr) <= 1 && Math.abs(df) <= 1 && (dr || df))
            out[color].push({ sq: idxToSq(r, f), piece });
          continue;
        }
        const straight = dr === 0 || df === 0;
        const diagonal = Math.abs(dr) === Math.abs(df);
        if ((piece === 'R' && !straight) || (piece === 'B' && !diagonal) || (piece === 'Q' && !straight && !diagonal)) continue;
        const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
        const stepF = df === 0 ? 0 : df / Math.abs(df);
        let blocked = false;
        let cr = r + stepR, cf = f + stepF;
        while (cr !== targetR || cf !== targetF) {
          if (board[cr][cf]) { blocked = true; break; }
          cr += stepR; cf += stepF;
        }
        if (!blocked) out[color].push({ sq: idxToSq(r, f), piece });
      }
    }
    return out;
  }

  function cloneState(state) {
    return {
      board: state.board.map(r => [...r]),
      turn: state.turn,
      castling: { ...state.castling },
      enPassant: state.enPassant ? [...state.enPassant] : null,
    };
  }

  function applyMoveToState(state, move) {
    const { board, turn, castling, enPassant } = state;
    const legal = global.getAllLegalMoves(board, turn, castling, enPassant);
    const san = global.moveToSAN(board, move, turn, legal);
    const nb = global.applyMoveToBoard(board.map(r => [...r]), move, turn);
    const newCast = { ...castling };
    if (nb[move.to[0]][move.to[1]] === turn + 'K') {
      if (turn === 'w') { newCast.wK = false; newCast.wQ = false; }
      else { newCast.bK = false; newCast.bQ = false; }
    }
    if (move.from[0] === 7 && move.from[1] === 7) newCast.wK = false;
    if (move.from[0] === 7 && move.from[1] === 0) newCast.wQ = false;
    if (move.from[0] === 0 && move.from[1] === 7) newCast.bK = false;
    if (move.from[0] === 0 && move.from[1] === 0) newCast.bQ = false;
    const newEp = move.doublePush ? [move.to[0] - (turn === 'w' ? -1 : 1), move.to[1]] : null;
    return {
      state: {
        board: nb,
        turn: turn === 'w' ? 'b' : 'w',
        castling: newCast,
        enPassant: newEp,
      },
      san,
    };
  }

  function hasMateInOne(state) {
    return detectMateInOne(state).length > 0;
  }

  function detectMateInOne(state) {
    if (typeof global.getAllLegalMoves !== 'function' || typeof global.moveToSAN !== 'function') return [];
    const { board, turn, castling, enPassant } = state;
    const legal = global.getAllLegalMoves(board, turn, castling, enPassant);
    const mates = [];
    for (const move of legal) {
      const san = global.moveToSAN(board, move, turn, legal);
      if (san.endsWith('#')) {
        mates.push({
          mover: COLOR_KR[turn],
          san,
          detail: `${COLOR_KR[turn]}이 ${san}로 즉시 체크메이트 가능`,
        });
      }
    }
    return mates;
  }

  /**
   * N수 메이트: 첫 수 m1 후 상대 모든 합법 응수에 대해 (depth-1)수 메이트가 존재.
   */
  function detectForcedMate(state, depth, limits) {
    if (depth < 1) return [];
    if (depth === 1) {
      return detectMateInOne(state).map(m => ({
        plies: 1,
        mover: m.mover,
        keyMove: m.san,
        line: m.san,
        detail: m.detail,
      }));
    }

    const maxPatterns = limits.maxPatterns || 4;
    const maxMoves = limits.maxMoves || 22;
    const maxReplies = limits.maxReplies || 18;
    const attacker = state.turn;
    const patterns = [];
    const legal = global.getAllLegalMoves(state.board, state.turn, state.castling, state.enPassant);

    for (let i = 0; i < Math.min(legal.length, maxMoves) && patterns.length < maxPatterns; i++) {
      const m1 = legal[i];
      const { state: s1, san: san1 } = applyMoveToState(cloneState(state), m1);
      const replies = global.getAllLegalMoves(s1.board, s1.turn, s1.castling, s1.enPassant);
      if (replies.length === 0 || replies.length > maxReplies) continue;

      let allLinesForceMate = true;
      let sampleReplySan = null;
      let sampleFinishSan = null;

      for (const r of replies) {
        const { state: s2, san: san2 } = applyMoveToState(cloneState(s1), r);
        const sub = detectForcedMate(s2, depth - 1, { maxPatterns: 1, maxMoves: limits.subMoves || 14, maxReplies: limits.subReplies || 14 });
        if (sub.length === 0) {
          allLinesForceMate = false;
          break;
        }
        if (!sampleReplySan) {
          sampleReplySan = san2;
          sampleFinishSan = sub[0].line;
        }
      }

      if (allLinesForceMate) {
        const line = sampleReplySan
          ? `${san1} … ${sampleReplySan} … ${sampleFinishSan}`
          : san1;
        patterns.push({
          plies: depth,
          mover: COLOR_KR[attacker],
          keyMove: san1,
          line,
          detail: `${COLOR_KR[attacker]} ${san1} 후 모든 응수에 ${depth}수 안에 메이트 (예: ${line})`,
        });
      }
    }
    return patterns;
  }

  function detectMateInTwo(state, limits) {
    return detectForcedMate(state, 2, limits || {});
  }

  function detectMateInThree(state, limits) {
    return detectForcedMate(state, 3, { maxMoves: 16, maxReplies: 12, subMoves: 10, subReplies: 10, maxPatterns: 3, ...(limits || {}) });
  }

  function detectHangingPieces(state) {
    const { board } = state;
    const hanging = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (!cell || cell[1] === 'K') continue;
        const color = cell[0];
        const opp = color === 'w' ? 'b' : 'w';
        const atks = getAttackersOnSquare(board, r, f);
        const oppAtks = atks[opp];
        const defAtks = atks[color].filter(a => a.sq !== idxToSq(r, f));
        if (oppAtks.length === 0) continue;
        const val = PIECE_VAL[cell[1]] || 0;
        if (val < 3) continue;
        if (defAtks.length === 0 || oppAtks.length > defAtks.length) {
          const atkDesc = oppAtks.map(a => `${PIECE_KR[a.piece]}(${a.sq})`).join('+');
          hanging.push({
            sq: idxToSq(r, f),
            piece: PIECE_KR[cell[1]],
            color: COLOR_KR[color],
            detail: defAtks.length === 0
              ? `${COLOR_KR[color]} ${PIECE_KR[cell[1]]}(${idxToSq(r, f)})가 수비 없이 ${atkDesc}에게 공격받음`
              : `${COLOR_KR[color]} ${PIECE_KR[cell[1]]}(${idxToSq(r, f)}) — 공격 ${oppAtks.length} vs 수비 ${defAtks.length} (${atkDesc})`,
          });
        }
      }
    }
    return hanging;
  }

  function detectSquareColorWeakness(state) {
    const { board } = state;
    const out = [];
    for (const color of ['w', 'b']) {
      const opp = color === 'w' ? 'b' : 'w';
      let lightBishop = false, darkBishop = false;
      let lightPawns = 0, darkPawns = 0;
      const kingZone = { light: 0, dark: 0 };

      let kingR = -1, kingF = -1;
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const c = board[r][f];
          if (!c || c[0] !== color) continue;
          const light = isLightSquare(r, f);
          if (c[1] === 'B') {
            if (light) lightBishop = true; else darkBishop = true;
          }
          if (c[1] === 'P') {
            if (light) lightPawns++; else darkPawns++;
          }
          if (c[1] === 'K') { kingR = r; kingF = f; }
        }
      }

      if (kingR >= 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let df = -1; df <= 1; df++) {
            const nr = kingR + dr, nf = kingF + df;
            if (nr < 0 || nr > 7 || nf < 0 || nf > 7) continue;
            const c = board[nr][nf];
            if (!c || c[1] !== 'P' || c[0] !== color) {
              if (isLightSquare(nr, nf)) kingZone.light++;
              else kingZone.dark++;
            }
          }
        }
      }

      if (lightBishop && lightPawns >= 4) {
        out.push({
          color: COLOR_KR[color],
          type: 'light_squares',
          detail: `${COLOR_KR[color]} 밝은 칸 비숍인데 아군 폰 ${lightPawns}개가 밝은 칸에 있음 — 배드 비숍·밝은 칸 약화 가능`,
        });
      }
      if (darkBishop && darkPawns >= 4) {
        out.push({
          color: COLOR_KR[color],
          type: 'dark_squares',
          detail: `${COLOR_KR[color]} 어두운 칸 비숍인데 아군 폰 ${darkPawns}개가 어두운 칸에 있음 — 배드 비숍·어두운 칸 약화 가능`,
        });
      }

      let oppLightB = false, oppDarkB = false;
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const c = board[r][f];
          if (c && c[0] === opp && c[1] === 'B') {
            if (isLightSquare(r, f)) oppLightB = true; else oppDarkB = true;
          }
        }
      }
      if (oppLightB && kingZone.light >= 2) {
        out.push({
          color: COLOR_KR[color],
          type: 'opponent_light_complex',
          detail: `${COLOR_KR[opp]} 밝은 칸 비숍이 있고 ${COLOR_KR[color]} 킹 주변 밝은 칸에 폰 방패 부족 — 장기적으로 밝은 칸 약점`,
        });
      }
      if (oppDarkB && kingZone.dark >= 2) {
        out.push({
          color: COLOR_KR[color],
          type: 'opponent_dark_complex',
          detail: `${COLOR_KR[opp]} 어두운 칸 비숍이 있고 ${COLOR_KR[color]} 킹 주변 어두운 칸에 폰 방패 부족 — 장기적으로 어두운 칸 약점`,
        });
      }
    }
    return out;
  }

  function forkAfterMove(boardAfter, move, moverColor) {
    const tr = move.to[0], tc = move.to[1];
    const piece = boardAfter[tr][tc];
    if (!piece) return null;
    const opp = moverColor === 'w' ? 'b' : 'w';
    const targets = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const t = boardAfter[r][f];
        if (!t || t[0] !== opp || t[1] === 'P' || t[1] === 'K') continue;
        const atks = getAttackersOnSquare(boardAfter, r, f);
        if (atks[moverColor].some(a => a.sq === idxToSq(tr, tc))) {
          targets.push({ sq: idxToSq(r, f), piece: PIECE_KR[t[1]] });
        }
      }
    }
    if (targets.length >= 2) {
      return `포크 — ${targets.map(t => `${t.piece}(${t.sq})`).join(', ')} 동시 공격`;
    }
    return null;
  }

  /** 엔진 PV를 따라가며 수마다 태그·설명 생성 */
  function annotateEngineLine(fen, uciMoves, maxPlies) {
    if (!uciMoves || !uciMoves.length || typeof global.uciToMove !== 'function') return [];
    const state = parseFenState(fen);
    if (!state) return [];

    let { board, turn, castling, enPassant } = state;
    const steps = [];
    const limit = Math.min(maxPlies || 8, uciMoves.length);

    for (let i = 0; i < limit; i++) {
      const uci = uciMoves[i];
      const legal = global.getAllLegalMoves(board, turn, castling, enPassant);
      const move = global.uciToMove(uci, board, turn, castling, enPassant);
      if (!move) break;

      const san = global.moveToSAN(board, move, turn, legal);
      const mover = COLOR_KR[turn];
      const tags = [];
      const captured = board[move.to[0]][move.to[1]];
      const epCap = move.enPassant ? (turn === 'w' ? 'bP' : 'wP') : null;

      if (captured || epCap) {
        const cap = captured || epCap;
        tags.push('capture');
      }
      if (san.includes('+')) tags.push('check');
      if (san.includes('#')) tags.push('mate');

      const boardAfter = global.applyMoveToBoard(board.map(r => [...r]), move, turn);
      const forkNote = forkAfterMove(boardAfter, move, turn);
      if (forkNote) tags.push('fork');
let note = `${mover} ${san}`;
if (tags.includes('mate')) {
  note += ' → 즉시 체크메이트';
} else if (tags.includes('check')) {
  note += ' → 체크, 상대는 킹을 안전한 칸으로 피해야 함';
} else if (tags.includes('capture')) {
  const cap = captured || epCap;
  const capName = PIECE_KR[cap[1]];
  const targetSq = idxToSq(move.to[0], move.to[1]);
  note += ` → ${targetSq}의 ${COLOR_KR[cap[0]]} ${capName} 포획`;
}
      if (forkNote) note += ` (${forkNote})`;

      steps.push({ ply: i + 1, san, mover, tags, note });

      if (boardAfter[move.to[0]][move.to[1]] === turn + 'K') {
        if (turn === 'w') { castling.wK = false; castling.wQ = false; }
        else { castling.bK = false; castling.bQ = false; }
      }
      if (move.from[0] === 7 && move.from[1] === 7) castling.wK = false;
      if (move.from[0] === 7 && move.from[1] === 0) castling.wQ = false;
      if (move.from[0] === 0 && move.from[1] === 7) castling.bK = false;
      if (move.from[0] === 0 && move.from[1] === 0) castling.bQ = false;
      enPassant = move.doublePush ? [move.to[0] - (turn === 'w' ? -1 : 1), move.to[1]] : null;
      turn = turn === 'w' ? 'b' : 'w';
      board = boardAfter;
    }
    return steps;
  }

  function classifyInsights(insights) {
    const buckets = { threats: [], ideas: [], weaknesses: [], strengths: [] };
    if (!insights || !insights.length) return buckets;

    for (const line of insights) {
      const m = line.match(/^\[([^\]]+)\]/);
      const tag = m ? m[1] : '';
      const cat = INSIGHT_CATEGORY[tag] || 'idea';
      const text = line.replace(/^\[[^\]]+\]\s*/, '').trim();
      const item = { tag, text, source: 'structure' };
      if (cat === 'threat') buckets.threats.push(item);
      else if (cat === 'weakness') buckets.weaknesses.push(item);
      else if (cat === 'strength') buckets.strengths.push(item);
      else buckets.ideas.push(item);
    }
    return buckets;
  }

  function pickTop(arr, n) {
    return arr.slice(0, n);
  }

  /** PGN 문자열 → SAN 배열 */
  function parseSanMoves(pgnMoves) {
    if (!pgnMoves) return [];
    return pgnMoves
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/\d+\.\s*/g, ' ')
      .split(/\s+/)
      .filter(m => m && !/^(1-0|0-1|1\/2|\*|\[)/.test(m));
  }

  const OPENING_PREFIXES = [
    { name: '루이 로페즈', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
    { name: '이탈리안 게임', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },
    { name: '스코치 게임', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'] },
    { name: '비엔나 게임', moves: ['e4', 'e5', 'Nc3'] },
    { name: '루이 폴센', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'] },
    { name: '투 나이트 디펜스', moves: ['e4', 'e5', 'Nf3', 'Nc6'] },
    { name: '스페인 4기사', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'] },
    { name: '퀸즈 갬빗', moves: ['d4', 'd5', 'c4'] },
    { name: '킹스 인디안', moves: ['d4', 'Nf6', 'c4', 'g6'] },
    { name: '님조-인디안', moves: ['d4', 'Nf6', 'c4', 'e6'] },
    { name: '카탈루냐', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3'] },
    { name: '런던 시스템', moves: ['d4', 'd5', 'Bf4'] },
    { name: '콜 시스템', moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'e3'] },
    { name: '카로-칸', moves: ['e4', 'c6'] },
    { name: '시실리안', moves: ['e4', 'c5'] },
    { name: '프렌치', moves: ['e4', 'e6'] },
    { name: '스칸디나비안', moves: ['e4', 'd5'] },
  ];

  function detectOpening(sanMoves) {
    if (!sanMoves.length) return null;
    let best = null;
    for (const o of OPENING_PREFIXES) {
      if (sanMoves.length < o.moves.length) continue;
      const ok = o.moves.every((m, i) => sanMoves[i] === m);
      if (ok && (!best || o.moves.length > best.moves.length)) best = o;
    }
    if (!best) return null;
    const played = sanMoves.slice(0, Math.min(sanMoves.length, 14)).join(' ');
    const variant = describeOpeningVariant(best.name, sanMoves);
    return {
      name: best.name,
      variant,
      moveCount: sanMoves.length,
      playedLine: played,
    };
  }

  function describeOpeningVariant(name, moves) {
    if (name !== '이탈리안 게임') return '';
    if (moves.includes('Bc5') && moves.includes('c3')) return '기우코 피아니시모(Giuoco Pianissimo) 계열';
    if (moves.includes('Bc5')) return '기우코 피아노(Giuoco Piano) 계열';
    if (moves.includes('Nf6')) return '투 나이트 변형 진입 가능';
    if (moves.includes('d3')) return 'd3(느린 전개) 변형';
    return '';
  }

  function findKing(board, color) {
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const c = board[r][f];
        if (c && c[0] === color && c[1] === 'K') return { r, f, sq: idxToSq(r, f) };
      }
    }
    return null;
  }

  function summarizeDevelopment(state) {
    const { board, castling } = state;
    const out = { w: [], b: [] };
    for (const color of ['w', 'b']) {
      const kr = color === 'w' ? 7 : 0;
      let minorsDeveloped = 0;
      let rooksConnected = false;
      const king = findKing(board, color);
      let castled = false;
      if (king) {
        castled = (color === 'w' && king.f >= 6 && king.r === 7) || (color === 'b' && king.f >= 6 && king.r === 0);
      }
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const c = board[r][f];
          if (!c || c[0] !== color) continue;
          if (c[1] === 'N' || c[1] === 'B') {
            if (!(color === 'w' && r === 7 && (f === 1 || f === 6 || f === 2 || f === 5)) &&
                !(color === 'b' && r === 0 && (f === 1 || f === 6 || f === 2 || f === 5))) {
              minorsDeveloped++;
            }
          }
        }
      }
      const notes = [];
      const ck = color === 'w' ? 'wK' : 'bK';
      const cq = color === 'w' ? 'wQ' : 'bQ';
      if (castled) notes.push('캐슬 완료');
      else if (castling[ck] || castling[cq]) notes.push('아직 캐슬 전');
      else notes.push('캐슬 권리 없음');
      notes.push(`마이너 기물 ${minorsDeveloped}개 전개`);
      out[color] = notes.join(', ');
    }
    return out;
  }

  function summarizeCenter(board) {
    const center = ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'];
    const occ = { w: [], b: [] };
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = idxToSq(r, f);
        if (!center.includes(sq)) continue;
        const c = board[r][f];
        if (!c) continue;
        const label = c[1] === 'P' ? `폰(${sq})` : `${PIECE_KR[c[1]]}(${sq})`;
        occ[c[0]].push(label);
      }
    }
    const lines = [];
    if (occ.w.length) lines.push(`백 중앙·근중앙: ${occ.w.join(', ')}`);
    if (occ.b.length) lines.push(`흑 중앙·근중앙: ${occ.b.join(', ')}`);
    return lines;
  }

  function inferStrategicThemes(state, sanMoves, opening) {
    const themes = [];
    const { board, turn } = state;
    const dev = summarizeDevelopment(state);

    if (opening && opening.name === '이탈리안 게임') {
      themes.push('이탈리안 전형: c3·d4로 중앙 확장, Bc4–Bc5 대각 압력, 킹사이드 캐슬 후 d4 돌파가 흔한 계획');
    }
    if (sanMoves.includes('d4') && sanMoves.includes('e4')) {
      themes.push('백이 e4-d4 폰 센터 — d5(또는 …exd4) 돌파·공간 우위 노림');
    }
    if (sanMoves.includes('d6') && sanMoves.includes('e5')) {
      themes.push('흑이 e5-d6 견고한 센터 — …d5 카운터 또는 킹사이드 전개 여지');
    }

    const whiteKing = findKing(board, 'w');
    const blackKing = findKing(board, 'b');
    if (whiteKing && whiteKing.f >= 6) themes.push('백 킹 킹사이드 안전(캐슬 완료 또는 준비됨)');
    if (blackKing && blackKing.f >= 6) themes.push('흑 킹 킹사이드 안전');

    if (dev.w.includes('전개') && dev.b.includes('전개')) {
      themes.push(`전개 비교 — 백: ${dev.w} / 흑: ${dev.b}`);
    }

    return pickTop(themes, 5);
  }

  function formatRecentMoves(recentMoves, lastMoveSan, lastMoveAnnotation) {
    const lines = [];
    if (recentMoves && recentMoves.length) {
      const parts = recentMoves.map(h => {
        const who = COLOR_KR[h.turn] || '';
        const ann = h.annotation ? ` [${h.annotation}]` : '';
        return `${who} ${h.san}${ann}`;
      });
      lines.push(`최근 ${parts.length}수: ${parts.join(' → ')}`);
    }
    if (lastMoveSan) {
      const ann = lastMoveAnnotation ? ` (${lastMoveAnnotation})` : '';
      lines.push(`직전 수: ${lastMoveSan}${ann}`);
    }
    return lines;
  }

  /**
   * 해설용 내러티브 컨텍스트 (오프닝·전개·전략 테마)
   */
  function listLegalMovesSan(state, max) {
    if (!state || typeof global.getAllLegalMoves !== 'function' || typeof global.moveToSAN !== 'function') {
      return [];
    }
    const legal = global.getAllLegalMoves(state.board, state.turn, state.castling, state.enPassant);
    const out = [];
    const seen = new Set();
    for (let i = 0; i < legal.length && out.length < (max || 16); i++) {
      const san = global.moveToSAN(state.board, legal[i], state.turn, legal);
      if (san && !seen.has(san)) {
        seen.add(san);
        out.push(san);
      }
    }
    return out;
  }

  function buildPositionAnchor(opts, state) {
    const turn = state ? state.turn : (opts.turn || 'w');
    const toMoveKr = COLOR_KR[turn] || turn;
    const lastMoverKr = turn === 'w' ? '흑' : '백';
    return {
      turn,
      toMoveKr,
      lastMoverKr,
      lastMoveSan: opts.lastMoveSan || null,
      lastMoveAnnotation: opts.lastMoveAnnotation || null,
      moveCount: opts.moveCount != null ? opts.moveCount : parseSanMoves(opts.pgnMoves || '').length,
    };
  }

  function buildGameNarrative(opts) {
    const sanMoves = parseSanMoves(opts.pgnMoves || '');
    const state = parseFenState(opts.fen);
    const opening = detectOpening(sanMoves);
    const narrative = {
      phase: opts.phase || '미들게임',
      moveCount: opts.moveCount != null ? opts.moveCount : sanMoves.length,
      opening,
      sanMoves,
      recentLines: formatRecentMoves(opts.recentMoves, opts.lastMoveSan, opts.lastMoveAnnotation),
      development: state ? summarizeDevelopment(state) : { w: '', b: '' },
      center: state ? summarizeCenter(state.board) : [],
      strategicThemes: state ? inferStrategicThemes(state, sanMoves, opening) : [],
      material: null,
    };

    if (state) {
      let wMat = 0, bMat = 0;
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const c = state.board[r][f];
          if (!c || c[1] === 'K') continue;
          const v = PIECE_VAL[c[1]] || 0;
          if (c[0] === 'w') wMat += v; else bMat += v;
        }
      }
      if (wMat !== bMat) {
        narrative.material = wMat > bMat
          ? `기물: 백이 ${wMat - bMat}점 앞섬(폰=1,나이트/비숍=3,룩=5,퀸=9)`
          : `기물: 흑이 ${bMat - wMat}점 앞섬`;
      } else {
        narrative.material = '기물: 동점';
      }
    }
    return narrative;
  }

  function formatGameNarrativeForPrompt(narrative, anchor) {
    if (!narrative) return '';
    const lines = [];
    lines.push('[국면 내러티브 — 오프닝·전개·계획의 뼈대. 아래 내용을 해설 도입·포지션 상황에 자연스럽게 녹일 것]');
    if (anchor) {
      lines.push(`■ 국면 앵커 (반드시 준수): 지금은 ${anchor.toMoveKr} 차례. 직전 수는 ${anchor.lastMoverKr}이 둔 ${anchor.lastMoveSan || '(없음)'}${anchor.lastMoveAnnotation ? ' [' + anchor.lastMoveAnnotation + ']' : ''}.`);
      lines.push(`  ※ 직전 수를 "지금 둘 수"처럼 서술하지 말 것. ${anchor.toMoveKr}만의 다음 수를 말할 때는 [엔진 1순위]·[합법 수]에 있는 SAN만 사용.`);
    }
    lines.push(`게임 단계: ${narrative.phase} (${narrative.moveCount}수 진행)`);

    if (narrative.opening) {
      let op = `오프닝: ${narrative.opening.name}`;
      if (narrative.opening.variant) op += ` — ${narrative.opening.variant}`;
      lines.push(op);
      lines.push(`시작 수순: ${narrative.opening.playedLine}`);
    } else if (narrative.sanMoves.length >= 4) {
      lines.push(`수순 앞부분: ${narrative.sanMoves.slice(0, 10).join(' ')}`);
    }

    narrative.recentLines.forEach(l => lines.push(l));

    if (narrative.development.w) lines.push(`백 전개: ${narrative.development.w}`);
    if (narrative.development.b) lines.push(`흑 전개: ${narrative.development.b}`);
    narrative.center.forEach(l => lines.push(l));
    if (narrative.material) lines.push(narrative.material);

    if (narrative.strategicThemes.length) {
      lines.push('전략 테마(코드 추정 — 브리프·엔진과 맞으면 해설에 반영):');
      narrative.strategicThemes.forEach(t => lines.push(`  • ${t}`));
    }

    lines.push('말투: "경기는 ~", "지금 ~", "~라고 볼 수 있겠어요", "~거든요" 등 흐름 있는 구어체 해설.');
    return lines.join('\n');
  }

  /**
   * 두 상태(이전, 이후)를 비교하여 수의 파급력을 분석합니다.
   * @param {object} stateBefore 이전 국면
   * @param {object} move 이동 객체
   * @param {object} stateAfter 이후 국면
   */
  function analyzeMoveImpact(stateBefore, move, stateAfter) {
    const mover = stateBefore.turn;
    const opp   = mover === 'w' ? 'b' : 'w';
    const impact = {
      tactics: [],      // 포크, 핀, 체크 등
      mobility: 0,      // 이동 가능 칸 변화
      prophylaxis: [],  // 상대 계획 차단 여부
      newAttackers: [], // 새롭게 공격받는 기물
      controlDelta: 0,  // 중앙 통제력 변화
    };

    try {
      // 1. 활동성(Mobility) 변화량 (아군 기물 전체)
      const movesBefore = global.getAllLegalMoves(stateBefore.board, mover, stateBefore.castling, stateBefore.enPassant).length;
      const movesAfter  = global.getAllLegalMoves(stateAfter.board, mover, stateAfter.castling, stateAfter.enPassant).length;
      impact.mobility = movesAfter - movesBefore;

      // 2. 신규 공격 위협 (이동한 기물 중심)
      const [tr, tc] = move.to;
      const piece = stateAfter.board[tr][tc];
      if (piece) {
        const pMoves = global.pseudoMoves(stateAfter.board, tr, tc, stateAfter.castling, stateAfter.enPassant);
        for (const pm of pMoves) {
          const [ar, ac] = pm.to;
          const target = stateAfter.board[ar][ac];
          if (target && target[0] === opp) {
            impact.newAttackers.push({
              sq: idxToSq(ar, ac),
              piece: PIECE_KR[target[1]],
              val: PIECE_VAL[target[1]]
            });
          }
        }
      }

      // 3. 포크 감지 (고가치 기물 2개 이상 공격)
      const highValAtks = impact.newAttackers.filter(a => a.val >= 3 || a.piece === '킹');
      if (highValAtks.length >= 2) impact.tactics.push('fork');

      // 4. 중앙 통제력 변화 (d4, d5, e4, e5)
      const center = [[3,3],[3,4],[4,3],[4,4]];
      let ctrlBefore = 0, ctrlAfter = 0;
      center.forEach(([r, f]) => {
        const atksB = getAttackersOnSquare(stateBefore.board, r, f);
        const atksA = getAttackersOnSquare(stateAfter.board, r, f);
        if (atksB[mover].length > 0) ctrlBefore++;
        if (atksA[mover].length > 0) ctrlAfter++;
      });
      impact.controlDelta = ctrlAfter - ctrlBefore;
    } catch(e) { console.warn('[PositionBrief] analyzeMoveImpact error:', e); }

    return impact;
  }

  /** "조용한 수"에 대한 전략적 가치 추출 */
  function detectQuietMoveImpact(impact) {
    const notes = [];
    if (impact.mobility > 5) notes.push(`기물 활동성 크게 강화 (이동 가능 칸 +${impact.mobility})`);
    else if (impact.mobility > 0) notes.push(`기물 기동성 개선`);

    if (impact.controlDelta > 0) notes.push(`중앙 영역 통제력 강화`);
    
    if (impact.newAttackers.length > 0) {
      const top = impact.newAttackers.sort((a,b)=>b.val - a.val)[0];
      notes.push(`${top.sq}의 ${top.piece}를 압박하여 상대의 응수를 강제함`);
    }
    return notes;
  }

  /**
   * @param {object} opts
   * @param {string} opts.fen
   * @param {string} opts.turn
   * @param {string[]} [opts.pv1Uci]
   * @param {string[]} [opts.pv2Uci]
   * @param {string[]} [opts.positionInsights]
   * @param {string} [opts.pgnMoves]
   * @param {object[]} [opts.recentMoves]
   * @param {string} [opts.lastMoveSan]
   * @param {string} [opts.lastMoveAnnotation]
   * @param {string} [opts.phase]
   * @param {number} [opts.moveCount]
   * @param {string} [opts.nullMoveThreatUci] // 추가: 방치 시 위협 수
   */
  function buildPositionBrief(opts) {
    const fen = opts.fen;
    const state = parseFenState(fen);
    const brief = {
      fen,
      turn: state ? state.turn : (fen.split(' ')[1] || 'w'),
      pieceMap: {}, 
      mateIn1: [],
      mateIn2: [],
      mateIn3: [],
      mateThreats: [],
      opponentMateIn2: [],
      opponentMateIn3: [],
      hanging: [],
      squareWeakness: [],
      engineLine: [],
      engineLine2: [],
      threats: [],
      ideas: [],
      weaknesses: [],
      strengths: [],
      verifiedFacts: [],
      narrative: null,
      anchor: null,
      legalMoves: [],
      nullMoveThreat: null, // 추가
    };

    if (state) {
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const c = state.board[r][f];
          if (c) {
            brief.pieceMap[idxToSq(r, f)] = {
              piece: PIECE_KR[c[1]],
              color: COLOR_KR[c[0]],
              raw: c
            };
          }
        }
      }
    }

    brief.narrative = buildGameNarrative(opts);
    brief.anchor = buildPositionAnchor(opts, state);

    if (!state) return brief;

    brief.legalMoves = listLegalMovesSan(state, 16);

    brief.mateIn1 = detectMateInOne(state);
    brief.mateThreats = brief.mateIn1;
    brief.mateIn2 = detectMateInTwo(state);
    brief.mateIn3 = detectMateInThree(state);

    const opp = state.turn === 'w' ? 'b' : 'w';
    const oppState = cloneState(state);
    oppState.turn = opp;
    brief.opponentMateIn2 = detectMateInTwo(oppState, { maxPatterns: 2, maxMoves: 18 });
    brief.opponentMateIn3 = detectMateInThree(oppState, { maxPatterns: 1 });

    brief.hanging = detectHangingPieces(state);
    brief.squareWeakness = detectSquareColorWeakness(state);

    if (opts.pv1Uci && opts.pv1Uci.length) {
      brief.engineLine = annotateEngineLine(fen, opts.pv1Uci, 8);
      
      // 최선수의 파급력 분석 (Brief 데이터 보강)
      try {
        const m1Uci = opts.pv1Uci[0];
        const m1 = global.uciToMove(m1Uci, state.board, state.turn, state.castling, state.enPassant);
        if (m1) {
          const { state: s1 } = applyMoveToState(cloneState(state), m1);
          const impact = analyzeMoveImpact(state, m1, s1);
          brief.m1Impact = impact;
        }
      } catch(e) {}
    }
    
    // 방치 시 위협 분석 (Null Move Threat)
    if (opts.nullMoveThreatUci && typeof global.uciToMove === 'function') {
      try {
        // M1을 둔 후의 상태
        const m1Uci = opts.pv1Uci[0];
        const m1 = global.uciToMove(m1Uci, state.board, state.turn, state.castling, state.enPassant);
        if (m1) {
          const { state: s1 } = applyMoveToState(cloneState(state), m1);
          // s1에서 차례를 다시 mover로 고정 (Null Move)
          const nullState = cloneState(s1);
          nullState.turn = state.turn; 
          
          const mtUci = opts.nullMoveThreatUci;
          const mt = global.uciToMove(mtUci, nullState.board, nullState.turn, nullState.castling, nullState.enPassant);
          if (mt) {
            const allLegal = global.getAllLegalMoves(nullState.board, nullState.turn, nullState.castling, nullState.enPassant);
            const san = global.moveToSAN(nullState.board, mt, nullState.turn, allLegal);
            const { state: s_after_threat } = applyMoveToState(nullState, mt);
            const mtImpact = analyzeMoveImpact(nullState, mt, s_after_threat);
            
            brief.nullMoveThreat = {
              uci: mtUci,
              san: san,
              impact: mtImpact,
              note: `${COLOR_KR[nullState.turn]}이 ${san}를 두어 ${mtImpact.tactics.join(', ')} 위협`
            };
          }
        }
      } catch(e) { console.warn('[PositionBrief] Null Move 분석 실패:', e); }
    }

    if (opts.pv2Uci && opts.pv2Uci.length) {
      brief.engineLine2 = annotateEngineLine(fen, opts.pv2Uci, 5);
    }

    const classified = classifyInsights(opts.positionInsights || []);

    brief.threats = [
      ...brief.mateIn1.map(m => ({ tag: 'mate_in_1', text: m.detail, source: 'verified' })),
      ...brief.mateIn2.map(m => ({ tag: 'mate_in_2', text: m.detail, source: 'verified' })),
      ...brief.mateIn3.map(m => ({ tag: 'mate_in_3', text: m.detail, source: 'verified' })),
      ...brief.opponentMateIn2.map(m => ({ tag: 'opp_mate_in_2', text: `상대(차례 가정) ${m.detail}`, source: 'verified' })),
      ...brief.hanging.map(h => ({ tag: 'hanging', text: h.detail, source: 'verified' })),
      ...classified.threats,
    ];
    brief.ideas = [...classified.ideas];
    brief.weaknesses = [
      ...brief.squareWeakness.map(s => ({ tag: s.type, text: s.detail, source: 'verified' })),
      ...classified.weaknesses,
    ];
    brief.strengths = classified.strengths;

    brief.threats = pickTop(brief.threats, 8);
    brief.ideas = pickTop(brief.ideas, 5);
    brief.weaknesses = pickTop(brief.weaknesses, 5);
    brief.strengths = pickTop(brief.strengths, 4);

    for (const step of brief.engineLine) {
      brief.verifiedFacts.push(step.note);
    }
    brief.mateIn1.forEach(m => brief.verifiedFacts.push(m.detail));
    brief.mateIn2.forEach(m => brief.verifiedFacts.push(m.detail));
    brief.mateIn3.forEach(m => brief.verifiedFacts.push(m.detail));
    brief.opponentMateIn2.forEach(m => brief.verifiedFacts.push(m.detail));
    brief.hanging.forEach(h => brief.verifiedFacts.push(h.detail));
    [...brief.threats, ...brief.weaknesses, ...brief.ideas].forEach(x => {
      if (x.text) brief.verifiedFacts.push(x.text);
    });
    if (brief.anchor && brief.anchor.lastMoveSan) {
      brief.verifiedFacts.push(`직전 수: ${brief.anchor.lastMoverKr} ${brief.anchor.lastMoveSan}`);
    }
    if (brief.anchor) {
      brief.verifiedFacts.push(`현재 차례: ${brief.anchor.toMoveKr}`);
    }
    if (brief.legalMoves.length) {
      brief.verifiedFacts.push(`합법 수 예시: ${brief.legalMoves.join(', ')}`);
    }
    if (brief.narrative) {
      if (brief.narrative.opening) {
        brief.verifiedFacts.push(`오프닝: ${brief.narrative.opening.name}`);
      }
      brief.narrative.recentLines.forEach(l => brief.verifiedFacts.push(l));
      brief.narrative.strategicThemes.forEach(t => brief.verifiedFacts.push(t));
    }
    brief.verifiedFacts = [...new Set(brief.verifiedFacts)].slice(0, 32);

    return brief;
  }

  function formatPositionBriefForPrompt(brief, ctx) {
    const lines = [];
    lines.push('[검증된 분석 브리프 — 아래 사실만 해설에 사용. 브리프에 없는 위협·기물·수를 만들어내지 말 것]');

    if (brief.pieceMap && Object.keys(brief.pieceMap).length) {
      lines.push('');
      lines.push('■ 보드 기물 배치 (절대적 물리 법칙: 이미 기물이 있는 칸으로는 아군 기물이 "이동"할 수 없으며, 상대 기물이 있는 칸으로만 "포획" 이동이 가능함)');
      const occupied = Object.entries(brief.pieceMap)
        .sort((a,b) => a[0].localeCompare(b[0]))
        .map(([sq, info]) => `${sq}: ${info.color} ${info.piece}`)
        .join(', ');
      lines.push(`  현재 기물이 있는 칸: ${occupied}`);
    }

    if (brief.narrative) {
      lines.push('');
      lines.push(formatGameNarrativeForPrompt(brief.narrative, brief.anchor));
    }

    if (brief.legalMoves && brief.legalMoves.length) {
      lines.push('');
      lines.push(`■ 현재 차례 합법 수 (이 목록·엔진 라인에 없는 수를 "최선수"로 지어내지 말 것): ${brief.legalMoves.join(', ')}`);
    }

    const hasEngine = brief.engineLine && brief.engineLine.length > 0;
    if (!hasEngine) {
      lines.push('');
      lines.push('■ [엔진 라인 없음] 최선수·이후 수순 섹션에서 구체적 SAN 수순 나열 금지. 구조·위협·직전 수 맥락만 설명.');
    }

    if (brief.mateIn1.length) {
      lines.push('');
      lines.push('■ 1수 메이트');
      brief.mateIn1.forEach(m => lines.push(`  • ${m.detail}`));
    }
    if (brief.mateIn2.length) {
      lines.push('');
      lines.push('■ 2수 메이트 패턴 (모든 방어에 메이트)');
      brief.mateIn2.forEach(m => lines.push(`  • ${m.detail}`));
    }
    if (brief.mateIn3.length) {
      lines.push('');
      lines.push('■ 3수 메이트 패턴');
      brief.mateIn3.forEach(m => lines.push(`  • ${m.detail}`));
    }
    if (brief.opponentMateIn2.length || brief.opponentMateIn3.length) {
      lines.push('');
      lines.push('■ 상대 메이트 위협 (상대 차례였다면)');
      brief.opponentMateIn2.forEach(m => lines.push(`  • ${m.detail}`));
      brief.opponentMateIn3.forEach(m => lines.push(`  • ${m.detail}`));
    }

    if (brief.threats.length) {
      lines.push('');
      lines.push('■ 전술적 위협 (코드 검증)');
      brief.threats.forEach(t => lines.push(`  • ${t.text}`));
    }

    if (brief.weaknesses.length) {
      lines.push('');
      lines.push('■ 구조적 약점 (폰·칸색·장기)');
      brief.weaknesses.forEach(w => lines.push(`  • ${w.text}`));
    }

    if (brief.strengths.length) {
      lines.push('');
      lines.push('■ 강점');
      brief.strengths.forEach(s => lines.push(`  • ${s.text}`));
    }

    if (brief.ideas.length) {
      lines.push('');
      lines.push('■ 전략 아이디어');
      brief.ideas.forEach(i => lines.push(`  • ${i.text}`));
    }

    if (brief.engineLine.length) {
      lines.push('');
      lines.push('■ 엔진 1순위 수순 — 수마다 인과 (이 순서·이유만 사용)');
      brief.engineLine.forEach(step => lines.push(`  ${step.ply}. ${step.note}`));
      if (ctx && ctx.turn) {
        const first = ctx.turn === 'w' ? '백' : '흑';
        const second = ctx.turn === 'w' ? '흑' : '백';
        lines.push(`  (해석: 홀수 번째 수=${first}, 짝수 번째 수=${second})`);
      }
    }

    if (brief.engineLine2.length) {
      lines.push('');
      lines.push('■ 엔진 2순위 (대안/방어 참고)');
      brief.engineLine2.forEach(step => lines.push(`  ${step.ply}. ${step.note}`));
    }

    return lines.join('\n');
  }

  /** FEN(또는 현재 국면) 브리프를 콘솔에 JSON으로 출력 */
  function debugPositionBriefToConsole(fenOptional) {
    let fen = (fenOptional || '').trim();
    if (!fen && typeof global.game !== 'undefined' && global.game && typeof global.boardToFen === 'function') {
      fen = global.boardToFen(
        global.game.board,
        global.game.turn,
        global.game.castling,
        global.game.enPassant,
        global.game.halfMove,
        global.game.fullMove
      );
    }
    if (!fen) {
      console.warn('[PositionBrief] FEN이 없습니다. 입력란에 FEN을 넣거나 보드에 국면을 두세요.');
      return null;
    }

    const turn = fen.split(' ')[1] || 'w';
    let positionInsights = [];
    if (typeof global.extractPositionInsights === 'function') {
      positionInsights = global.extractPositionInsights(fen);
    }

    const pv1 = global.pvData && global.pvData[1];
    const pv2 = global.pvData && global.pvData[2];
    const pv1Uci = pv1 && (pv1.moves || pv1.pv) ? (pv1.moves || pv1.pv) : [];
    const pv2Uci = pv2 && (pv2.moves || pv2.pv) ? (pv2.moves || pv2.pv) : [];

    let extra = {};
    if (typeof global.game !== 'undefined' && global.game && global.game.history && global.game.history.length) {
      let pgnMoves = '';
      global.game.history.forEach((s) => {
        if (s.turn === 'w') pgnMoves += `${s.fullMove}. `;
        pgnMoves += s.san + ' ';
      });
      const hi = global.game.historyIndex;
      const h = hi >= 0 ? global.game.history[hi] : null;
      extra = {
        pgnMoves: pgnMoves.trim(),
        recentMoves: global.game.history.slice(-8).map(x => ({
          san: x.san, turn: x.turn, annotation: x.annotation || null,
        })),
        lastMoveSan: h ? h.san : null,
        lastMoveAnnotation: h ? h.annotation : null,
        phase: global.game.history.length <= 10 ? '오프닝' : global.game.history.length <= 30 ? '미들게임' : '엔드게임',
        moveCount: global.game.history.length,
      };
    }

    const brief = buildPositionBrief({
      fen,
      turn,
      pv1Uci,
      pv2Uci,
      positionInsights,
      ...extra,
    });

    console.group('[Position Brief Debug]');
    console.log('FEN:', fen);
    console.log('Brief object:', brief);
    console.log('JSON:\n', JSON.stringify(brief, null, 2));
    if (typeof global.formatPositionBriefForPrompt === 'function') {
      console.log('Prompt block:\n', formatPositionBriefForPrompt(brief, { turn }));
    }
    console.groupEnd();
    return brief;
  }

  global.buildPositionBrief = buildPositionBrief;
  global.buildGameNarrative = buildGameNarrative;
  global.formatPositionBriefForPrompt = formatPositionBriefForPrompt;
  global.formatGameNarrativeForPrompt = formatGameNarrativeForPrompt;
  global.debugPositionBriefToConsole = debugPositionBriefToConsole;
})(typeof window !== 'undefined' ? window : globalThis);
