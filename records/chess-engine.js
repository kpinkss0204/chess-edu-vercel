/**
 * chess-engine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 체스 엔진 핵심 모듈
 *
 * 담당 역할:
 *   - FEN 파싱 / FEN 생성
 *   - 기물별 의사수(pseudo-move) 생성
 *   - 합법수(legal move) 필터링 (체크 검증 포함)
 *   - 킹사이드/퀸사이드 캐슬링 검증
 *   - 앙파상 처리
 *   - PGN → 국면(states) 배열 변환
 *   - UCI ↔ 이동 객체 변환
 *   - 체크 / 체크메이트 / 스테일메이트 판정
 *
 * 의존성: 없음 (순수 JS, DOM 불필요)
 *
 * 외부에 노출하는 주요 함수:
 *   parseFen(fen)                           → {board, turn, castling, enPassant}
 *   boardToFen(board, turn, ...)            → FEN 문자열
 *   getAllLegal(board, color, ...)           → Move[]
 *   applyMoveToBoard(board, move, color)    → 새 board
 *   isInCheck(board, color)                 → boolean
 *   parsePgnToStates(pgn)                   → State[]
 *   moveToUci(move)                         → 'e2e4' 형식 문자열
 *   uciToMoveObj(uci, board, turn, ...)     → Move | null
 *
 * State 객체 형태:
 *   { board, turn, castling, enPassant, move, san, fen }
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const FILES = ['a','b','c','d','e','f','g','h'];
const INIT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// ── FEN 파싱 ────────────────────────────────────────────────────────────────
function parseFen(fen) {
  const parts = fen.split(' '), rows = parts[0].split('/'), board = [];
  const pm = {
    'P':'wP','N':'wN','B':'wB','R':'wR','Q':'wQ','K':'wK',
    'p':'bP','n':'bN','b':'bB','r':'bR','q':'bQ','k':'bK'
  };
  for (const row of rows) {
    const r = [];
    for (const ch of row) {
      if ('12345678'.includes(ch)) for (let i = 0; i < +ch; i++) r.push(null);
      else r.push(pm[ch] || null);
    }
    board.push(r);
  }
  const turn = parts[1] || 'w', cast = parts[2] || '-';
  const castling = {
    wK: cast.includes('K'), wQ: cast.includes('Q'),
    bK: cast.includes('k'), bQ: cast.includes('q')
  };
  const ep = parts[3] !== '-' ? algebraicToRC(parts[3]) : null;
  return { board, turn, castling, enPassant: ep };
}

function algebraicToRC(alg) {
  if (!alg || alg === '-') return null;
  return [8 - parseInt(alg[1]), alg.charCodeAt(0) - 97];
}

function boardToFen(board, turn, castling, enPassant, hm = 0, fm = 1) {
  const pf = {
    wP:'P',wN:'N',wB:'B',wR:'R',wQ:'Q',wK:'K',
    bP:'p',bN:'n',bB:'b',bR:'r',bQ:'q',bK:'k'
  };
  let rows = [];
  for (let r = 0; r < 8; r++) {
    let row = '', e = 0;
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) { if (e) { row += e; e = 0; } row += pf[p]; } else e++;
    }
    if (e) row += e;
    rows.push(row);
  }
  const cs = (castling.wK?'K':'')+(castling.wQ?'Q':'')+(castling.bK?'k':'')+(castling.bQ?'q':'')||'-';
  const eps = enPassant ? FILES[enPassant[1]] + (8 - enPassant[0]) : '-';
  return rows.join('/') + ' ' + turn + ' ' + cs + ' ' + eps + ' ' + hm + ' ' + fm;
}

// ── 유틸 ────────────────────────────────────────────────────────────────────
function enemyColor(c) { return c === 'w' ? 'b' : 'w'; }
function isInBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

// ── 의사수 생성 ─────────────────────────────────────────────────────────────
function pseudoMoves(board, r, c, castling, enPassant) {
  const p = board[r][c]; if (!p) return [];
  const color = p[0], type = p[1], moves = [], enemy = enemyColor(color), dir = color === 'w' ? -1 : 1;

  const push = (tr, tc, extra = {}) => {
    if (isInBounds(tr, tc)) {
      const t = board[tr][tc];
      if (!t || t[0] === enemy) moves.push({ from:[r,c], to:[tr,tc], ...extra });
    }
  };
  const slide = (drs, dcs) => {
    for (let i = 0; i < drs.length; i++) {
      let nr = r + drs[i], nc = c + dcs[i];
      while (isInBounds(nr, nc)) {
        const t = board[nr][nc];
        if (t) { if (t[0] === enemy) moves.push({ from:[r,c], to:[nr,nc] }); break; }
        moves.push({ from:[r,c], to:[nr,nc] });
        nr += drs[i]; nc += dcs[i];
      }
    }
  };

  if (type === 'P') {
    if (!board[r+dir]?.[c])
      moves.push({ from:[r,c], to:[r+dir,c], ...((r+dir===0||r+dir===7)?{promo:true}:{}) });
    if ((color==='w'&&r===6||color==='b'&&r===1) && !board[r+dir][c] && !board[r+2*dir]?.[c])
      moves.push({ from:[r,c], to:[r+2*dir,c], doublePush:true });
    [-1,1].forEach(dc => {
      if (!isInBounds(r+dir, c+dc)) return;
      if (board[r+dir][c+dc] && board[r+dir][c+dc][0] === enemy)
        moves.push({ from:[r,c], to:[r+dir,c+dc], ...((r+dir===0||r+dir===7)?{promo:true}:{}) });
      if (enPassant && enPassant[0]===r+dir && enPassant[1]===c+dc)
        moves.push({ from:[r,c], to:[r+dir,c+dc], enPassant:true });
    });
  } else if (type === 'N') {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
      .forEach(([dr,dc]) => push(r+dr, c+dc));
  } else if (type === 'B') {
    slide([-1,1,-1,1], [-1,-1,1,1]);
  } else if (type === 'R') {
    slide([-1,0,1,0], [0,-1,0,1]);
  } else if (type === 'Q') {
    slide([-1,-1,-1,0,0,1,1,1], [-1,0,1,-1,1,-1,0,1]);
  } else if (type === 'K') {
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
      .forEach(([dr,dc]) => push(r+dr, c+dc));
    if (color==='w') {
      if (castling.wK && !board[7][5] && !board[7][6] && board[7][7]==='wR')
        moves.push({ from:[7,4], to:[7,6], castle:'K' });
      if (castling.wQ && !board[7][3] && !board[7][2] && !board[7][1] && board[7][0]==='wR')
        moves.push({ from:[7,4], to:[7,2], castle:'Q' });
    }
    if (color==='b') {
      if (castling.bK && !board[0][5] && !board[0][6] && board[0][7]==='bR')
        moves.push({ from:[0,4], to:[0,6], castle:'K' });
      if (castling.bQ && !board[0][3] && !board[0][2] && !board[0][1] && board[0][0]==='bR')
        moves.push({ from:[0,4], to:[0,2], castle:'Q' });
    }
  }
  return moves;
}

// ── 이동 적용 ────────────────────────────────────────────────────────────────
function applyMoveToBoard(board, move, color) {
  const b = board.map(r => [...r]);
  const [fr,fc] = move.from, [tr,tc] = move.to, p = b[fr][fc];
  b[tr][tc] = move.promoPiece ? color + move.promoPiece : p;
  b[fr][fc] = null;
  if (move.enPassant) { const cr = color==='w' ? tr+1 : tr-1; b[cr][tc] = null; }
  if (move.castle === 'K') { b[fr][7] = null; b[fr][5] = `${color}R`; }
  else if (move.castle === 'Q') { b[fr][0] = null; b[fr][3] = `${color}R`; }
  return b;
}

// ── 체크 판정 ────────────────────────────────────────────────────────────────
function isInCheck(board, color) {
  let kr = -1, kc = -1;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (board[r][c] === color + 'K') { kr = r; kc = c; }
  if (kr < 0) return false;
  const enemy = enemyColor(color);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c] && board[r][c][0] === enemy) {
      const ms = pseudoMoves(board, r, c, {wK:false,wQ:false,bK:false,bQ:false}, null);
      if (ms.some(m => m.to[0]===kr && m.to[1]===kc)) return true;
    }
  }
  return false;
}

// ── 합법수 생성 ──────────────────────────────────────────────────────────────
function getLegalMoves(board, r, c, castling, enPassant) {
  const p = board[r][c]; if (!p) return [];
  const color = p[0], pseudo = pseudoMoves(board, r, c, castling, enPassant), legal = [];
  for (const move of pseudo) {
    const nb = applyMoveToBoard(board, move, color);
    if (!isInCheck(nb, color)) {
      if (move.castle) {
        const midC = move.castle === 'K' ? 5 : 3;
        const nb2 = applyMoveToBoard(board, { from:move.from, to:[move.from[0],midC] }, color);
        if (isInCheck(board, color) || isInCheck(nb2, color)) continue;
      }
      legal.push(move);
    }
  }
  return legal;
}

function getAllLegal(board, color, castling, enPassant) {
  const moves = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (board[r][c] && board[r][c][0] === color)
      moves.push(...getLegalMoves(board, r, c, castling, enPassant));
  return moves;
}

// ── SAN → Move ───────────────────────────────────────────────────────────────
function sanToMove(san, board, turn, castling, enPassant) {
  const allMoves = getAllLegal(board, turn, castling, enPassant);
  const s = san.replace(/[+#!?]/g, '');
  if (s==='O-O'||s==='0-0') return allMoves.find(m=>m.castle==='K')||null;
  if (s==='O-O-O'||s==='0-0-0') return allMoves.find(m=>m.castle==='Q')||null;
  let type='P', fromFile=null, fromRank=null, toFile=null, toRank=null;
  let raw = s;
  const promoM = raw.match(/=([QRBN])$/); let promo = null;
  if (promoM) { promo = promoM[1]; raw = raw.replace(/=[QRBN]$/, ''); }
  const dest = raw.match(/([a-h])([1-8])$/); if (!dest) return null;
  toFile = dest[1].charCodeAt(0) - 97; toRank = 8 - parseInt(dest[2]);
  raw = raw.slice(0, -2);
  if (raw.endsWith('x')) raw = raw.slice(0, -1);
  if (raw && 'NBRQK'.includes(raw[0])) { type = raw[0]; raw = raw.slice(1); }
  if (raw.length===2) { fromFile=raw.charCodeAt(0)-97; fromRank=8-parseInt(raw[1]); }
  else if (raw.length===1) {
    if ('abcdefgh'.includes(raw)) fromFile = raw.charCodeAt(0) - 97;
    else fromRank = 8 - parseInt(raw);
  }
  return allMoves.find(m => {
    const p = board[m.from[0]][m.from[1]];
    if (!p || p[1] !== type) return false;
    if (m.to[0]!==toRank || m.to[1]!==toFile) return false;
    if (fromFile!==null && m.from[1]!==fromFile) return false;
    if (fromRank!==null && m.from[0]!==fromRank) return false;
    if (promo && m.promo) m.promoPiece = promo;
    return true;
  }) || null;
}

// ── PGN → 국면 배열 ──────────────────────────────────────────────────────────
function parsePgnToStates(pgn) {
  const body = pgn.replace(/\[[^\]]*\]/g, '').trim();
  const tokens = body.replace(/\d+\./g,'').replace(/1-0|0-1|1\/2-1\/2|\*/g,'').trim().split(/\s+/).filter(Boolean);
  let { board, turn, castling, enPassant } = parseFen(INIT_FEN);
  let hm = 0, fm = 1;
  const states = [{ board:board.map(r=>[...r]), turn, castling:{...castling}, enPassant, move:null, san:null, fen:INIT_FEN }];
  for (const san of tokens) {
    const move = sanToMove(san, board, turn, castling, enPassant);
    if (!move) { console.warn('수 파싱 실패:', san); break; }
    if (move.promo && !move.promoPiece) {
      const pm = san.match(/=([QRBN])/); if (pm) move.promoPiece = pm[1];
    }
    const isCapture = !!(board[move.to[0]][move.to[1]] || move.enPassant);
    const isPawn = board[move.from[0]][move.from[1]]?.[1] === 'P';
    board = applyMoveToBoard(board, move, turn);
    if (board[move.to[0]][move.to[1]] === turn+'K') {
      if (turn==='w') { castling.wK=false; castling.wQ=false; }
      else { castling.bK=false; castling.bQ=false; }
    }
    if (move.from[0]===7&&move.from[1]===7) castling.wK=false;
    if (move.from[0]===7&&move.from[1]===0) castling.wQ=false;
    if (move.from[0]===0&&move.from[1]===7) castling.bK=false;
    if (move.from[0]===0&&move.from[1]===0) castling.bQ=false;
    enPassant = move.doublePush ? [move.to[0]-(turn==='w'?-1:1), move.to[1]] : null;
    hm = (isCapture||isPawn) ? 0 : hm+1;
    if (turn==='b') fm++;
    const nextTurn = enemyColor(turn);
    const fen = boardToFen(board, nextTurn, castling, enPassant, hm, fm);
    states.push({ board:board.map(r=>[...r]), turn:nextTurn, castling:{...castling}, enPassant, move, san, fen });
    turn = nextTurn;
  }
  return states;
}

// ── UCI 변환 ─────────────────────────────────────────────────────────────────
function moveToUci(move) {
  const f = FILES[move.from[1]] + (8-move.from[0]);
  const t = FILES[move.to[1]] + (8-move.to[0]);
  return f + t + (move.promoPiece ? move.promoPiece.toLowerCase() : '');
}

function uciToMoveObj(uci, board, turn, castling, enPassant) {
  if (!uci || uci === '(none)') return null;
  const fc=uci.charCodeAt(0)-97, fr=8-parseInt(uci[1]);
  const tc=uci.charCodeAt(2)-97, tr=8-parseInt(uci[3]);
  const promo = uci[4] ? uci[4].toUpperCase() : null;
  const all = getAllLegal(board, turn, castling, enPassant);
  return all.find(m =>
    m.from[0]===fr && m.from[1]===fc &&
    m.to[0]===tr && m.to[1]===tc &&
    (!promo || m.promo)
  ) || null;
}
