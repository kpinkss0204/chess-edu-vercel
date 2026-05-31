(function (global) {
  'use strict';

  // ── abortController 폴백 (WASM에서는 사용 안 함) ─────────────
  let abortController = null;

  // ===== LICHESS PIECE IMAGE URLS =====
  const PIECE_STYLE_BASE = 'https://lichess1.org/assets/piece/';
  let currentPieceStyle = 'cburnett';

  function pieceImg(piece) {
    // piece = 'wK', 'bP', etc.
    return `${PIECE_STYLE_BASE}${currentPieceStyle}/${piece}.svg`;
  }

  const PIECE_NAMES = {
    wK:'wK', wQ:'wQ', wR:'wR', wB:'wB', wN:'wN', wP:'wP',
    bK:'bK', bQ:'bQ', bR:'bR', bB:'bB', bN:'bN', bP:'bP'
  };

  const PIECE_VALUES = { P:1, N:3, B:3, R:5, Q:9, K:0 };

  const INIT_BOARD = [
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    ['wR','wN','wB','wQ','wK','wB','wN','wR'],
  ];

  const FILES = ['a','b','c','d','e','f','g','h'];

  // ===== CHESS LOGIC (standalone functions for UCI conversion) =====
  function isInBounds(r,c) { return r>=0&&r<8&&c>=0&&c<8; }
  function enemyColor(color) { return color==='w'?'b':'w'; }

  function pseudoMoves(board, r, c, castling, enPassant) {
    const p=board[r][c]; if(!p) return [];
    const color=p[0], type=p[1], moves=[], enemy=enemyColor(color), dir=color==='w'?-1:1;

    const addMove=(tr,tc,extra={})=>{
      if(isInBounds(tr,tc)){const t=board[tr][tc];if(!t||t[0]===enemy)moves.push({from:[r,c],to:[tr,tc],...extra});}
    };
    const addSlide=(drs,dcs)=>{
      for(let i=0;i<drs.length;i++){
        let nr=r+drs[i],nc=c+dcs[i];
        while(isInBounds(nr,nc)){const t=board[nr][nc];if(t){if(t[0]===enemy)moves.push({from:[r,c],to:[nr,nc]});break;}moves.push({from:[r,c],to:[nr,nc]});nr+=drs[i];nc+=dcs[i];}
      }
    };

    if(type==='P'){
      const nr=r+dir;
      if(isInBounds(nr,c)&&!board[nr][c]){
        moves.push({from:[r,c],to:[nr,c],promo:(nr===0||nr===7)});
        const startRow=color==='w'?6:1, nr2=r+2*dir;
        if(r===startRow&&!board[nr2][c])moves.push({from:[r,c],to:[nr2,c],doublePush:true});
      }
      for(const dc of[-1,1]){
        const tc=c+dc;
        if(isInBounds(nr,tc)){
          if(board[nr][tc]&&board[nr][tc][0]===enemy)moves.push({from:[r,c],to:[nr,tc],promo:(nr===0||nr===7)});
          if(enPassant&&enPassant[0]===nr&&enPassant[1]===tc)moves.push({from:[r,c],to:[nr,tc],enPassant:true});
        }
      }
    } else if(type==='N'){
      for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])addMove(r+dr,c+dc);
    } else if(type==='B'){
      addSlide([-1,-1,1,1],[-1,1,-1,1]);
    } else if(type==='R'){
      addSlide([-1,1,0,0],[0,0,-1,1]);
    } else if(type==='Q'){
      addSlide([-1,1,0,0,-1,-1,1,1],[0,0,-1,1,-1,1,-1,1]);
    } else if(type==='K'){
      for(const[dr,dc]of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])addMove(r+dr,c+dc);
      if(color==='w'&&r===7&&c===4){
        if(castling.wK&&!board[7][5]&&!board[7][6]&&board[7][7]==='wR')moves.push({from:[7,4],to:[7,6],castle:'K'});
        if(castling.wQ&&!board[7][3]&&!board[7][2]&&!board[7][1]&&board[7][0]==='wR')moves.push({from:[7,4],to:[7,2],castle:'Q'});
      }
      if(color==='b'&&r===0&&c===4){
        if(castling.bK&&!board[0][5]&&!board[0][6]&&board[0][7]==='bR')moves.push({from:[0,4],to:[0,6],castle:'K'});
        if(castling.bQ&&!board[0][3]&&!board[0][2]&&!board[0][1]&&board[0][0]==='bR')moves.push({from:[0,4],to:[0,2],castle:'Q'});
      }
    }
    return moves;
  }

  function isAttacked(board, r, c, byColor) {
    if (!board || !board[r]) return false;
    const enemy=byColor, pDir=enemy==='w'?1:-1;
    for(const dc of[-1,1]){const pr=r+pDir,pc=c+dc;if(isInBounds(pr,pc)&&board[pr]&&board[pr][pc]===`${enemy}P`)return true;}
    for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const nr=r+dr,nc=c+dc;if(isInBounds(nr,nc)&&board[nr]&&board[nr][nc]===`${enemy}N`)return true;}
    for(const[dr,dc]of[[-1,-1],[-1,1],[1,-1],[1,1]]){let nr=r+dr,nc=c+dc;while(isInBounds(nr,nc)){if(!board[nr])break;const t=board[nr][nc];if(t){if(t===`${enemy}B`||t===`${enemy}Q`)return true;break;}nr+=dr;nc+=dc;}}
    for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){let nr=r+dr,nc=c+dc;while(isInBounds(nr,nc)){if(!board[nr])break;const t=board[nr][nc];if(t){if(t===`${enemy}R`||t===`${enemy}Q`)return true;break;}nr+=dr;nc+=dc;}}
    for(const[dr,dc]of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){const nr=r+dr,nc=c+dc;if(isInBounds(nr,nc)&&board[nr]&&board[nr][nc]===`${enemy}K`)return true;}
    return false;
  }

  function findKing(board,color){
    if(!board)return null;
    for(let r=0;r<8;r++){
      if(!board[r])continue;
      for(let c=0;c<8;c++)if(board[r][c]===`${color}K`)return[r,c];
    }
    return null;
  }
  function isInCheck(board,color){const k=findKing(board,color);if(!k)return false;return isAttacked(board,k[0],k[1],enemyColor(color));}

  function applyMoveToBoard(board, move, color) {
    const[fr,fc]=move.from,[tr,tc]=move.to,p=board[fr][fc];
    board[tr][tc]=p;board[fr][fc]=null;
    if(move.enPassant){const captureRow=color==='w'?tr+1:tr-1;board[captureRow][tc]=null;}
    if(move.castle==='K'){board[fr][7]=null;board[fr][5]=`${color}R`;}
    else if(move.castle==='Q'){board[fr][0]=null;board[fr][3]=`${color}R`;}
    if(move.promoPiece){board[tr][tc]=`${color}${move.promoPiece}`;}
    return board;
  }

  function legalMoves(board, r, c, castling, enPassant) {
    const p=board[r][c];if(!p)return[];
    const color=p[0],pseudo=pseudoMoves(board,r,c,castling,enPassant),legal=[];
    for(const move of pseudo){
      const nb=applyMoveToBoard(board.map(r=>[...r]),move,color);
      if(!isInCheck(nb,color)){
        if(move.castle){
          const midC=move.castle==='K'?5:3;
          const midBoard=board.map(r=>[...r]);
          midBoard[move.from[0]][midC]=`${color}K`;midBoard[move.from[0]][midC]=`${color}K`;midBoard[move.from[0]][move.from[1]]=null;
          if(isInCheck(board,color))continue;
          if(isAttacked(midBoard,move.from[0],midC,enemyColor(color)))continue;
        }
        legal.push(move);
      }
    }
    return legal;
  }

  function getAllLegalMoves(board, color, castling, enPassant) {
    const moves=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]&&board[r][c][0]===color)moves.push(...legalMoves(board,r,c,castling,enPassant));
    return moves;
  }

  // SAN 문자열을 move 객체로 변환하는 헬퍼
  function sanToMove(san, board, turn, allMoves) {
    const s = san.replace(/[+#!?]/g, '');
    if (s === 'O-O' || s === '0-0') return allMoves.find(m => m.castle === 'K') || null;
    if (s === 'O-O-O' || s === '0-0-0') return allMoves.find(m => m.castle === 'Q') || null;

    let type = 'P', file = null, rank = null, promo = null;
    let raw = s;
    const promoMatch = raw.match(/=([QRBN])$/);
    if (promoMatch) { promo = promoMatch[1]; raw = raw.replace(/=[QRBN]$/, ''); }
    if ('KQRBN'.includes(raw[0])) { type = raw[0]; raw = raw.slice(1); }
    raw = raw.replace('x', '');

    if (raw.length >= 2) {
      const toFile = raw[raw.length - 2], toRank = raw[raw.length - 1];
      const disambig = raw.slice(0, raw.length - 2);
      if (disambig) {
        if ('abcdefgh'.includes(disambig)) file = disambig;
        else if ('12345678'.includes(disambig)) rank = disambig;
        else if (disambig.length === 2) { file = disambig[0]; rank = disambig[1]; }
      }
      const toC = FILES.indexOf(toFile), toR = 8 - parseInt(toRank);
      const matched = allMoves.find(m => {
        const p = board[m.from[0]][m.from[1]];
        if (!p || p[1] !== type) return false;
        if (m.to[0] !== toR || m.to[1] !== toC) return false;
        if (file && FILES[m.from[1]] !== file) return false;
        if (rank && (8 - m.from[0]).toString() !== rank) return false;
        return true;
      });
      if (matched && promo) { matched.promoPiece = promo; }
      return matched || null;
    }
    return null;
  }

  function moveToSAN(board, move, color, allMoves) {
    const[fr,fc]=move.from,[tr,tc]=move.to,p=board[fr][fc],type=p[1];
    const captured=board[tr][tc]||(move.enPassant?'ep':null);
    let san='';
    if(move.castle==='K')return'O-O';
    if(move.castle==='Q')return'O-O-O';
    if(type!=='P'){
      san+=type;
      const ambig=allMoves.filter(m=>m!==move&&board[m.from[0]][m.from[1]]===p&&m.to[0]===tr&&m.to[1]===tc);
      if(ambig.length){
        const sameFile=ambig.some(m=>m.from[1]===fc),sameRank=ambig.some(m=>m.from[0]===fr);
        if(!sameFile)san+=FILES[fc];else if(!sameRank)san+=(8-fr);else san+=FILES[fc]+(8-fr);
      }
    } else if(captured){san+=FILES[fc];}
    if(captured)san+='x';
    san+=FILES[tc]+(8-tr);
    if(move.promo&&move.promoPiece)san+='='+move.promoPiece;
    const nb=applyMoveToBoard(board.map(r=>[...r]),move,color);
    const enemy=enemyColor(color);
    if(isInCheck(nb,enemy)){
      const enemyMoves=getAllLegalMoves(nb,enemy,{wK:false,wQ:false,bK:false,bQ:false},null);
      san+=enemyMoves.length===0?'#':'+';
    }
    return san;
  }

  // ── FEN 파싱 헬퍼 (engine.js에서 legalMoveCount 계산용) ─────
  function parseFenBoard(fenBoard) {
    const board = Array.from({length:8}, ()=>Array(8).fill(null));
    const rows  = fenBoard.split('/');
    if (rows.length !== 8) return null;
    const pieceMap = {
      'P':'wP','N':'wN','B':'wB','R':'wR','Q':'wQ','K':'wK',
      'p':'bP','n':'bN','b':'bB','r':'bR','q':'bQ','k':'bK',
    };
    for (let r = 0; r < 8; r++) {
      let c = 0;
      for (const ch of rows[r]) {
        if (ch >= '1' && ch <= '8') { c += parseInt(ch); }
        else { board[r][c] = pieceMap[ch] || null; c++; }
      }
    }
    return board;
  }

  function parseFenCastling(cas) {
    return { wK: cas.includes('K'), wQ: cas.includes('Q'),
             bK: cas.includes('k'), bQ: cas.includes('q') };
  }

  function parseFenEP(ep) {
    if (ep === '-') return null;
    const col = FILES.indexOf(ep[0]);
    const row = 8 - parseInt(ep[1]);
    return col >= 0 ? [row, col] : null;
  }

  function normFen(fen) {
    return fen.split(' ').slice(0, 4).join(' ');
  }

  function winProb(cpMe) {
    return 1 / (1 + Math.pow(10, -cpMe / 400));
  }

  function getWinProb(cpFromWhite, turn) {
    const cpMe = turn === 'w' ? cpFromWhite : -cpFromWhite;
    return winProb(cpMe);
  }

  function lichessWinningChances(cpRaw) {
    return winProb(cpRaw) * 2 - 1;
  }

  /** UCI(e2e4) -> move object */
  function uciToMove(uci, board, turn, castling, enPassant) {
    if (!uci || uci.length < 4) return null;
    const fr = 8 - parseInt(uci[1]), fc = FILES.indexOf(uci[0]);
    const tr = 8 - parseInt(uci[3]), tc = FILES.indexOf(uci[2]);
    if (fr < 0 || fr > 7 || fc < 0 || fc > 7 || tr < 0 || tr > 7 || tc < 0 || tc > 7) return null;
    const promo = uci.length === 5 ? uci[4].toUpperCase() : null;
    const all = legalMoves(board, fr, fc, castling, enPassant);
    return all.find(m => 
      m.to[0] === tr && m.to[1] === tc && 
      (!promo || m.promoPiece === promo)
    ) || null;
  }

  const PIECE_VALUE = { P:100, N:320, B:330, R:500, Q:900, K:0 };

  function isSacrifice(h) {
    if (!h || !h.move || !h.captured) return false;
    const board = h.board || (h.fenBefore ? parseFenBoard(h.fenBefore.split(' ')[0]) : null);
    if (!board) return false;
    const movingPiece = board[h.move.from[0]][h.move.from[1]];
    if (!movingPiece) return false;
    const myVal       = PIECE_VALUE[movingPiece[1]] || 0;
    const capturedVal = PIECE_VALUE[h.captured[1]]  || 0;
    if (myVal < 450) return false;
    if (myVal <= capturedVal + 150) return false;
    try {
      const boardAfter = applyMoveToBoard(board.map(r=>[...r]), h.move, h.turn);
      const enemy = h.turn === 'w' ? 'b' : 'w';
      const toR = h.move.to[0];
      const toC = h.move.to[1];
      const castAfter = {...(h.castling || {wK:true,wQ:true,bK:true,bQ:true})};
      if (movingPiece === h.turn + 'K') {
        if (h.turn==='w') { castAfter.wK=false; castAfter.wQ=false; }
        else               { castAfter.bK=false; castAfter.bQ=false; }
      }
      if (h.move.from[0]===7&&h.move.from[1]===7) castAfter.wK=false;
      if (h.move.from[0]===7&&h.move.from[1]===0) castAfter.wQ=false;
      if (h.move.from[0]===0&&h.move.from[1]===7) castAfter.bK=false;
      if (h.move.from[0]===0&&h.move.from[1]===0) castAfter.bQ=false;
      const epAfter = h.move.doublePush
        ? [h.move.to[0] - (h.turn==='w' ? -1 : 1), h.move.to[1]] : null;
      const enemyMoves = getAllLegalMoves(boardAfter, enemy, castAfter, epAfter);
      const canRecapture = enemyMoves.some(m => m.to[0] === toR && m.to[1] === toC);
      if (!canRecapture) return false;
    } catch(e) {
      return myVal > capturedVal + 300;
    }
    return true;
  }

  function classifyMove(cpBefore, cpAfter, turn, topAlts) {
    const cpMe      = turn === 'w' ? cpBefore : -cpBefore;
    const cpMeAfter = turn === 'w' ? cpAfter  : -cpAfter;
    const wBefore = winProb(cpMe);
    const wAfter  = winProb(cpMeAfter);
    const best1cp = topAlts?.best1cp ?? null;
    const best2cp = topAlts?.best2cp ?? null;
    const wBest1  = best1cp != null ? winProb(turn === 'w' ? best1cp : -best1cp) : wBefore;
    const wBest2  = best2cp != null ? winProb(turn === 'w' ? best2cp : -best2cp) : null;
    const deltaW = wBest1 - wAfter;
    if (topAlts?.legalMoveCount === 1) return 'forced';
    if (topAlts?.isEngineBest) return 'best';
    const hadMateWin = topAlts?.mateInBefore != null && topAlts.mateInBefore > 0;
    const gaveMate   = topAlts?.mateInAfter  != null && topAlts.mateInAfter  > 0;
    const iMateWin   = cpMe      >=  9000;
    const iMateLose  = cpMe      <= -9000;
    const afterMateMe= cpMeAfter <= -9000;
    if (gaveMate) return 'blunder';
    if ((hadMateWin || iMateWin) && !gaveMate) {
      if (afterMateMe)       return 'blunder';
      if (cpMeAfter >= 200)  return 'best';
      if (cpMeAfter >= -50)  return 'excellent';
      if (cpMeAfter >= -300) return 'mistake';
      return 'blunder';
    }
    if (iMateLose) {
      if (afterMateMe) {
        if (deltaW <= 0)    return 'best';
        if (deltaW <= 0.02) return 'excellent';
        if (deltaW <= 0.05) return 'good';
        return 'inaccuracy';
      }
      if (cpMeAfter > -200) return (topAlts?.hasSacrifice ?? false) ? 'brilliant' : 'best';
      return 'inaccuracy';
    }
    if ((topAlts?.hasSacrifice ?? false) && deltaW <= 0.02 && wAfter > 0.5) return 'brilliant';
    const actualGain = wAfter - wBefore;
    if (wBest1 != null && wBest2 != null && (wBest1 - wBest2) >= 0.15 && deltaW <= 0.02 && actualGain >= 0.05) return 'great';
    if (wBefore < 0.45 && wAfter > 0.60 && deltaW <= 0.02) return 'great';
    if (deltaW <= 0.005) return 'best';
    const balanced = wBefore >= 0.35 && wBefore <= 0.65;
    const winning  = wBefore > 0.65 && wBefore <= 0.85;
    if (balanced) {
      if (deltaW <= 0.04) return 'excellent';
      if (deltaW <= 0.08) return 'good';
      if (deltaW <= 0.14) return 'inaccuracy';
      if (deltaW <= 0.24) return 'mistake';
      return 'blunder';
    }
    if (winning) {
      if (deltaW <= 0.03) return 'excellent';
      if (deltaW <= 0.06) return 'good';
      if (deltaW <= 0.12) return 'inaccuracy';
      if (deltaW <= 0.22) return 'mistake';
      return 'blunder';
    }
    if (deltaW <= 0.02) return 'excellent';
    if (deltaW <= 0.05) return 'good';
    if (deltaW <= 0.10) return 'inaccuracy';
    if (deltaW <= 0.20) return 'mistake';
    return 'blunder';
  }

  function boardToFen(board, turn, castling, enPassant, halfMove, fullMove) {
    let fen = '';
    for (let r=0; r<8; r++) {
      let empty = 0;
      for (let c=0; c<8; c++) {
        const p = board[r][c];
        if (!p) { empty++; continue; }
        if (empty) { fen += empty; empty = 0; }
        const color = p[0], type = p[1];
        fen += color==='w' ? type : type.toLowerCase();
      }
      if (empty) fen += empty;
      if (r<7) fen += '/';
    }
    fen += ' ' + turn;
    let cas = '';
    if (castling.wK) cas += 'K';
    if (castling.wQ) cas += 'Q';
    if (castling.bK) cas += 'k';
    if (castling.bQ) cas += 'q';
    fen += ' ' + (cas || '-');
    if (enPassant) fen += ' ' + FILES[enPassant[1]] + (8-enPassant[0]);
    else fen += ' -';
    fen += ' ' + (halfMove||0) + ' ' + (fullMove||1);
    return fen;
  }

  function uciMovesToSan(uciList, board, turn, castling, enPassant) {
    const sanList = [];
    let b = board.map(r => [...r]);
    let t = turn;
    let c = { ...castling };
    let ep = enPassant;

    for (const uci of uciList) {
      const move = uciToMove(uci, b, t, c, ep);
      if (!move) break;
      const allMoves = getAllLegalMoves(b, t, c, ep);
      const san = moveToSAN(b, move, t, allMoves);
      sanList.push(san);
      b = applyMoveToBoard(b.map(r => [...r]), move, t);
      t = enemyColor(t);
      // 단순화를 위해 castling/ep 업데이트는 생략하거나 여기서 구현 필요
      // 하지만 UCI move 객체에 castling/ep 정보가 있으면 여기서 업데이트 해야 함.
    }
    return sanList;
  }

  // API Export
  global.WasmChess = {
    isInBounds,
    enemyColor,
    pseudoMoves,
    isAttacked,
    findKing,
    isInCheck,
    applyMoveToBoard,
    legalMoves,
    getAllLegalMoves,
    sanToMove,
    moveToSAN,
    uciMovesToSan,
    parseFenBoard,
    parseFenCastling,
    parseFenEP,
    normFen,
    winProb,
    getWinProb,
    lichessWinningChances,
    isSacrifice,
    classifyMove,
    boardToFen,
    pieceImg,
    uciToMove,
    PIECE_NAMES,
    PIECE_VALUES,
    INIT_BOARD,
    FILES
  };

  // Backwards compatibility for global functions used in other WASM scripts
  Object.keys(global.WasmChess).forEach(key => {
    if (typeof global.WasmChess[key] === 'function') {
      global[key] = global.WasmChess[key];
    }
  });

  // Backwards compatibility for constants
  global.FILES = global.WasmChess.FILES;
  global.INIT_BOARD = global.WasmChess.INIT_BOARD;
  global.PIECE_NAMES = global.WasmChess.PIECE_NAMES;
  global.PIECE_VALUES = global.WasmChess.PIECE_VALUES;

})(typeof window !== 'undefined' ? window : globalThis);
