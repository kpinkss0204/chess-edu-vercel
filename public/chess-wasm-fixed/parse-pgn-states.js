/**
 * PGN → 포지션 스냅샷 (records.html parsePgnToStates 와 동일).
 * chess.js (getAllLegalMoves, sanToMove, applyMoveToBoard, boardToFen) 필요.
 */
(function (global) {
  'use strict';

  function parseFen(fen) {
    const parts = fen.split(' '), rows = parts[0].split('/'), board = [];
    const pm = { 'P': 'wP', 'N': 'wN', 'B': 'wB', 'R': 'wR', 'Q': 'wQ', 'K': 'wK', 'p': 'bP', 'n': 'bN', 'b': 'bB', 'r': 'bR', 'q': 'bQ', 'k': 'bK' };
    for (const row of rows) {
      const r = [];
      for (const ch of row) {
        if ('12345678'.includes(ch)) for (let i = 0; i < +ch; i++) r.push(null);
        else r.push(pm[ch] || null);
      }
      board.push(r);
    }
    const turn = parts[1] || 'w', cast = parts[2] || '-';
    const castling = { wK: cast.includes('K'), wQ: cast.includes('Q'), bK: cast.includes('k'), bQ: cast.includes('q') };
    let ep = null;
    if (parts[3] && parts[3] !== '-') {
      const col = 'abcdefgh'.indexOf(parts[3][0]);
      const row = 8 - parseInt(parts[3][1]);
      if (col >= 0) ep = [row, col];
    }
    return { board, turn, castling, enPassant: ep };
  }

  function parsePgnToStates(pgn) {
    // 1. 헤더 및 주석 제거
    const body = (pgn || '')
      .replace(/\[[^\]]*\]/g, '')             // [Header "Value"] 제거
      .replace(/\{[^\}]*\}/g, '')             // { Comment } 제거
      .replace(/\([^\)]*\)/g, '')             // ( Variation ) 제거
      .trim();

    // 2. 수 번호 및 불필요한 기호 제거
    const cleaned = body
      .replace(/\d+\s*\.{1,3}/g, ' ')         // "1.", "1. ", "1...", "1 ..." 제거
      .replace(/\d+\//g, '')                  
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')   
      .trim();

    const tokens = cleaned.split(/\s+/).filter(Boolean);
    
    const INIT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    let rawPos = parseFen(INIT_FEN);
    let board = rawPos.board, turn = rawPos.turn, castling = rawPos.castling, enPassant = rawPos.enPassant;
    let hm = 0, fm = 1;
    
    // board 배열의 8x8 구조 강제 보장
    const ensure8x8 = (b) => {
      const nb = [];
      for(let r=0; r<8; r++) nb.push(b[r] ? [...b[r]] : Array(8).fill(null));
      return nb;
    };
    board = ensure8x8(board);

    const states = [{ board: board.map(r => [...r]), turn, castling: { ...castling }, enPassant, move: null, san: null, fen: INIT_FEN }];

    if (!tokens || tokens.length === 0) return states;

    for (const san of tokens) {
      const allLegal = global.getAllLegalMoves(board, turn, castling, enPassant);
      const move = global.sanToMove(san, board, turn, allLegal);
      if (!move) {
        console.warn('[parsePgnToStates] 수 파싱 실패 (중단):', san);
        break;
      }

      // algebraic 좌표 추가 (호환성 보장)
      const files = 'abcdefgh';
      move.fromAlg = files[move.from[1]] + (8 - move.from[0]);
      move.toAlg = files[move.to[1]] + (8 - move.to[0]);

      const isCapture = !!(board[move.to[0]][move.to[1]] || move.enPassant);
      const fromPiece = board[move.from[0]][move.from[1]];
      const isPawn = fromPiece && fromPiece[1] === 'P';
      const captured = board[move.to[0]][move.to[1]]
        ? board[move.to[0]][move.to[1]]
        : (move.enPassant ? (turn === 'w' ? 'bP' : 'wP') : null);

      // 보드 업데이트 및 8x8 구조 유지 확인
      let nextBoard = global.applyMoveToBoard(board.map(r => [...r]), move, turn);
      board = ensure8x8(nextBoard);

      if (board[move.to[0]][move.to[1]] === turn + 'K') {
        if (turn === 'w') { castling.wK = false; castling.wQ = false; }
        else { castling.bK = false; castling.bQ = false; }
      }
      if (move.from[0] === 7 && move.from[1] === 7) castling.wK = false;
      if (move.from[0] === 7 && move.from[1] === 0) castling.wQ = false;
      if (move.from[0] === 0 && move.from[1] === 7) castling.bK = false;
      if (move.from[0] === 0 && move.from[1] === 0) castling.bQ = false;

      enPassant = move.doublePush ? [move.to[0] - (turn === 'w' ? -1 : 1), move.to[1]] : null;
      hm = (isCapture || isPawn) ? 0 : hm + 1;
      if (turn === 'b') fm++;
      const nextTurn = turn === 'w' ? 'b' : 'w';
      const fen = global.boardToFen(board, nextTurn, castling, enPassant, hm, fm);
      states.push({ board: board.map(r => [...r]), turn: nextTurn, castling: { ...castling }, enPassant, move, san, fen, captured });
      turn = nextTurn;
    }
    return states;
  }

  global.parseFen = parseFen;
  global.parsePgnToStates = parsePgnToStates;
})(typeof window !== 'undefined' ? window : globalThis);
