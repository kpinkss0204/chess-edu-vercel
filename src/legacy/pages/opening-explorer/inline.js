// ===== PIECE IMAGES (Lichess CBurnett) =====
const PIECE_STYLE_BASE = 'https://lichess1.org/assets/piece/cburnett/';
function pieceImg(p) { return `${PIECE_STYLE_BASE}${p}.svg`; }

// ===== CHESS BOARD LOGIC =====
const FILES = ['a','b','c','d','e','f','g','h'];

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

function deepCopyBoard(b) { return b.map(r=>[...r]); }

function isInBounds(r,c){ return r>=0&&r<8&&c>=0&&c<8; }
function enemyColor(color){ return color==='w'?'b':'w'; }

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
    if(isInBounds(r+dir,c)&&!board[r+dir][c]){
      if(r+dir===0||r+dir===7){['Q','R','B','N'].forEach(pr=>moves.push({from:[r,c],to:[r+dir,c],promotion:pr}));}
      else{moves.push({from:[r,c],to:[r+dir,c]});}
      if((color==='w'&&r===6)||(color==='b'&&r===1)){if(isInBounds(r+2*dir,c)&&!board[r+2*dir][c])moves.push({from:[r,c],to:[r+2*dir,c],doublePush:true});}
    }
    [-1,1].forEach(dc=>{
      const tr=r+dir,tc=c+dc;
      if(!isInBounds(tr,tc))return;
      if(board[tr][tc]&&board[tr][tc][0]===enemy){
        if(tr===0||tr===7){['Q','R','B','N'].forEach(pr=>moves.push({from:[r,c],to:[tr,tc],promotion:pr}));}
        else moves.push({from:[r,c],to:[tr,tc]});
      }
      if(enPassant&&enPassant[0]===tr&&enPassant[1]===tc)moves.push({from:[r,c],to:[tr,tc],enPassant:true});
    });
  } else if(type==='N'){
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>addMove(r+dr,c+dc));
  } else if(type==='B'){ addSlide([-1,-1,-1,1,1,1],[-1,1,1,-1,-1,1]); addSlide([-1,1],[1,-1]); addSlide([-1,1],[1,1]);
    // simpler:
  } else if(type==='R'){ addSlide([-1,0,1,0],[0,-1,0,1]);
  } else if(type==='Q'){ addSlide([-1,-1,-1,0,-1,1,0,-1,0,1,1,-1,1,0,1,1],[-1,1,0,-1,1,-1,-1,0,1,0,-1,1,0,1,1,-1]); // won't work
  } else if(type==='K'){
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>addMove(r+dr,c+dc));
    // Castling
    if(color==='w'&&r===7&&c===4){
      if(castling.wK&&!board[7][5]&&!board[7][6])moves.push({from:[r,c],to:[7,6],castle:'K'});
      if(castling.wQ&&!board[7][3]&&!board[7][2]&&!board[7][1])moves.push({from:[r,c],to:[7,2],castle:'Q'});
    }
    if(color==='b'&&r===0&&c===4){
      if(castling.bK&&!board[0][5]&&!board[0][6])moves.push({from:[r,c],to:[0,6],castle:'K'});
      if(castling.bQ&&!board[0][3]&&!board[0][2]&&!board[0][1])moves.push({from:[r,c],to:[0,2],castle:'Q'});
    }
  }
  return moves;
}

// Fix slide for B, R, Q
function getPseudoMoves(board, r, c, castling, enPassant) {
  const p = board[r][c]; if (!p) return [];
  const color = p[0], type = p[1], moves = [], enemy = enemyColor(color), dir = color==='w'?-1:1;
  const slide = (drs) => {
    drs.forEach(([dr,dc]) => {
      let nr=r+dr,nc=c+dc;
      while(isInBounds(nr,nc)){
        const t=board[nr][nc];
        if(t){if(t[0]===enemy)moves.push({from:[r,c],to:[nr,nc]});break;}
        moves.push({from:[r,c],to:[nr,nc]});
        nr+=dr;nc+=dc;
      }
    });
  };
  if(type==='P'){
    if(isInBounds(r+dir,c)&&!board[r+dir][c]){
      if(r+dir===0||r+dir===7){['Q','R','B','N'].forEach(pr=>moves.push({from:[r,c],to:[r+dir,c],promotion:pr}));}
      else moves.push({from:[r,c],to:[r+dir,c]});
      if((color==='w'&&r===6)||(color==='b'&&r===1)){if(isInBounds(r+2*dir,c)&&!board[r+2*dir][c])moves.push({from:[r,c],to:[r+2*dir,c],doublePush:true});}
    }
    [-1,1].forEach(dc=>{
      const tr=r+dir,tc=c+dc;
      if(!isInBounds(tr,tc))return;
      if(board[tr][tc]&&board[tr][tc][0]===enemy){
        if(tr===0||tr===7){['Q','R','B','N'].forEach(pr=>moves.push({from:[r,c],to:[tr,tc],promotion:pr}));}
        else moves.push({from:[r,c],to:[tr,tc]});
      }
      if(enPassant&&enPassant[0]===tr&&enPassant[1]===tc)moves.push({from:[r,c],to:[tr,tc],enPassant:true});
    });
  } else if(type==='N'){
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>{
      const tr=r+dr,tc=c+dc;
      if(isInBounds(tr,tc)){const t=board[tr][tc];if(!t||t[0]===enemy)moves.push({from:[r,c],to:[tr,tc]});}
    });
  } else if(type==='B'){ slide([[-1,-1],[-1,1],[1,-1],[1,1]]); }
    else if(type==='R'){ slide([[-1,0],[1,0],[0,-1],[0,1]]); }
    else if(type==='Q'){ slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); }
    else if(type==='K'){
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>{
      const tr=r+dr,tc=c+dc;
      if(isInBounds(tr,tc)){const t=board[tr][tc];if(!t||t[0]===enemy)moves.push({from:[r,c],to:[tr,tc]});}
    });
    if(color==='w'&&r===7&&c===4){
      if(castling&&castling.wK&&!board[7][5]&&!board[7][6])moves.push({from:[r,c],to:[7,6],castle:'K'});
      if(castling&&castling.wQ&&!board[7][3]&&!board[7][2]&&!board[7][1])moves.push({from:[r,c],to:[7,2],castle:'Q'});
    }
    if(color==='b'&&r===0&&c===4){
      if(castling&&castling.bK&&!board[0][5]&&!board[0][6])moves.push({from:[r,c],to:[0,6],castle:'K'});
      if(castling&&castling.bQ&&!board[0][3]&&!board[0][2]&&!board[0][1])moves.push({from:[r,c],to:[0,2],castle:'Q'});
    }
  }
  return moves;
}

function isSquareAttacked(board, r, c, byColor) {
  for(let row=0;row<8;row++) for(let col=0;col<8;col++) {
    const p=board[row][col];
    if(!p||p[0]!==byColor)continue;
    const ms=getPseudoMoves(board,row,col,{wK:false,wQ:false,bK:false,bQ:false},null);
    if(ms.some(m=>m.to[0]===r&&m.to[1]===c))return true;
  }
  return false;
}

function applyMoveToBoard(board,move,color) {
  const nb=deepCopyBoard(board);
  const[fr,fc]=move.from,[tr,tc]=move.to;
  const p=nb[fr][fc]; nb[fr][fc]=null;
  if(move.castle==='K'){nb[tr][tc]=p;const rookC=color==='w'?7:7;nb[fr][5]=nb[fr][rookC];nb[fr][rookC]=null;}
  else if(move.castle==='Q'){nb[tr][tc]=p;const rookC=color==='w'?0:0;nb[fr][3]=nb[fr][rookC];nb[fr][rookC]=null;}
  else if(move.enPassant){nb[tr][tc]=p;nb[fr][tc]=null;}
  else if(move.promotion){nb[tr][tc]=color+move.promotion;}
  else {nb[tr][tc]=p;}
  return nb;
}

function findKing(board,color){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]===color+'K')return[r,c];
  return null;
}

function getLegalMoves(board,color,castling,enPassant){
  const moves=[];
  const enemy=enemyColor(color);
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    const p=board[r][c];
    if(!p||p[0]!==color)continue;
    const ms=getPseudoMoves(board,r,c,castling,enPassant);
    for(const m of ms){
      if(m.castle){
        // check squares
        const passC=m.castle==='K'?[5,6]:[3,2];
        let ok=true;
        for(const pc of passC){
          const nb=applyMoveToBoard(board,{from:[r,c],to:[r,pc]},color);
          const kp=findKing(nb,color)||[r,pc];
          if(isSquareAttacked(nb,kp[0],kp[1],enemy)){ok=false;break;}
        }
        if(!ok)continue;
        const king=findKing(board,color);
        if(king&&isSquareAttacked(board,king[0],king[1],enemy))continue;
      }
      const nb=applyMoveToBoard(board,m,color);
      const kp=findKing(nb,color);
      if(kp&&!isSquareAttacked(nb,kp[0],kp[1],enemy))moves.push(m);
    }
  }
  return moves;
}

function moveToSAN(board,move,color,castling,enPassant,allLegal){
  const p=board[move.from[0]][move.from[1]];
  if(!p)return'?';
  const type=p[1];
  if(move.castle==='K')return'O-O';
  if(move.castle==='Q')return'O-O-O';
  const toSq=FILES[move.to[1]]+(8-move.to[0]);
  const isCapture=!!board[move.to[0]][move.to[1]]||move.enPassant;
  let san='';
  if(type==='P'){
    if(isCapture)san+=FILES[move.from[1]]+'x';
    san+=toSq;
    if(move.promotion)san+='='+move.promotion;
  } else {
    san+=type;
    // disambiguation
    const amb=allLegal.filter(m=>{
      const pp=board[m.from[0]][m.from[1]];
      return pp&&pp[1]===type&&pp[0]===color&&(m.from[0]!==move.from[0]||m.from[1]!==move.from[1])&&m.to[0]===move.to[0]&&m.to[1]===move.to[1];
    });
    if(amb.length>0){
      const sameFile=amb.some(m=>m.from[1]===move.from[1]);
      const sameRank=amb.some(m=>m.from[0]===move.from[0]);
      if(!sameFile)san+=FILES[move.from[1]];
      else if(!sameRank)san+=(8-move.from[0]);
      else san+=FILES[move.from[1]]+(8-move.from[0]);
    }
    if(isCapture)san+='x';
    san+=toSq;
  }
  // check / checkmate
  const nb=applyMoveToBoard(board,move,color);
  const enemyC=enemyColor(color);
  const newCast={...castling};
  if(type==='K'){if(color==='w'){newCast.wK=false;newCast.wQ=false;}else{newCast.bK=false;newCast.bQ=false;}}
  const newEP=move.doublePush?[move.to[0]-(color==='w'?-1:1),move.to[1]]:null;
  const enemyLegal=getLegalMoves(nb,enemyC,newCast,newEP);
  const kp=findKing(nb,enemyC);
  if(kp&&isSquareAttacked(nb,kp[0],kp[1],color)){
    san+=enemyLegal.length===0?'#':'+';
  }
  return san;
}

// FEN generation
function boardToFEN(board,turn,castling,enPassant,halfMove,fullMove){
  const pMap={wK:'K',wQ:'Q',wR:'R',wB:'B',wN:'N',wP:'P',bK:'k',bQ:'q',bR:'r',bB:'b',bN:'n',bP:'p'};
  let rows=[];
  for(let r=0;r<8;r++){let row='',empty=0;for(let c=0;c<8;c++){const p=board[r][c];if(!p){empty++;}else{if(empty>0){row+=empty;empty=0;}row+=pMap[p]||'?';}}if(empty>0)row+=empty;rows.push(row);}
  let cas='';
  if(castling.wK)cas+='K';if(castling.wQ)cas+='Q';if(castling.bK)cas+='k';if(castling.bQ)cas+='q';
  if(!cas)cas='-';
  let ep='-';
  if(enPassant)ep=FILES[enPassant[1]]+(8-enPassant[0]);
  return `${rows.join('/')} ${turn} ${cas} ${ep} ${halfMove} ${fullMove}`;
}

// ===== GAME STATE =====
let board = deepCopyBoard(INIT_BOARD);
let turn = 'w';
let castling = { wK:true, wQ:true, bK:true, bQ:true };
let enPassant = null;
let halfMove = 0, fullMove = 1;
let flipped = false;
let moveHistory = []; // [{san, uci, board, turn, castling, enPassant, fen}]
let currentHistIdx = -1; // -1 = start

// ===== EXPLORER STATE =====
let currentDb = 'masters';
let explorerData = null;
let highlightedMoves = new Set();

// ===== FEN =====
function getCurrentFEN() {
  const b = currentHistIdx >= 0 ? moveHistory[currentHistIdx].board : board;
  const t = currentHistIdx >= 0 ? moveHistory[currentHistIdx].turn : turn;
  const ca = currentHistIdx >= 0 ? moveHistory[currentHistIdx].castling : castling;
  const ep = currentHistIdx >= 0 ? moveHistory[currentHistIdx].enPassant : enPassant;
  const hm = currentHistIdx >= 0 ? moveHistory[currentHistIdx].halfMove : halfMove;
  const fm = currentHistIdx >= 0 ? moveHistory[currentHistIdx].fullMove : fullMove;
  return boardToFEN(b, t, ca, ep, hm, fm);
}

function getCurrentBoard() {
  return currentHistIdx >= 0 ? moveHistory[currentHistIdx].board : INIT_BOARD;
}
function getCurrentTurn() {
  return currentHistIdx >= 0 ? moveHistory[currentHistIdx].turn : 'w';
}
function getCurrentCastling() {
  return currentHistIdx >= 0 ? moveHistory[currentHistIdx].castling : {wK:true,wQ:true,bK:true,bQ:true};
}
function getCurrentEnPassant() {
  return currentHistIdx >= 0 ? moveHistory[currentHistIdx].enPassant : null;
}

// ===== RENDER BOARD =====
function getActiveBoard() {
  const cbm = document.getElementById('chessboard-mobile');
  // cbm이 존재하고 화면에 보일 때만 모바일 보드로 간주
  if (cbm && (cbm.offsetWidth > 0 || cbm.offsetHeight > 0)) {
    return cbm;
  }
  return document.getElementById('chessboard');
}

function renderBoard() {
  const cb = getActiveBoard();
  if (!cb) {
    // 초기 로딩 시 요소를 못 찾을 수 있으므로 재시도
    if (!window._retryCount) window._retryCount = 0;
    if (window._retryCount < 5) {
      window._retryCount++;
      setTimeout(renderBoard, 200);
    }
    return;
  }
  cb.innerHTML = '';
  const b = getCurrentBoard();
  const lastFrom = currentHistIdx >= 0 ? moveHistory[currentHistIdx].from : null;
  const lastTo   = currentHistIdx >= 0 ? moveHistory[currentHistIdx].to   : null;

  for (let vi = 0; vi < 8; vi++) {
    for (let vj = 0; vj < 8; vj++) {
      const r = flipped ? 7-vi : vi;
      const c = flipped ? 7-vj : vj;
      const isLight = (r+c)%2===0;
      const sq = document.createElement('div');
      sq.className = 'square ' + (isLight?'light':'dark');
      sq.dataset.r = r; sq.dataset.c = c;

      if(lastFrom&&lastFrom[0]===r&&lastFrom[1]===c) sq.classList.add('last-from');
      if(lastTo  &&lastTo[0]  ===r&&lastTo[1]  ===c) sq.classList.add('last-to');

      // explorer hints
      if(highlightedMoves.has(FILES[c]+(8-r))) sq.classList.add('explorer-hint');

      // coords
      if(vj===0){const s=document.createElement('span');s.className='coord-rank';s.textContent=8-r;sq.appendChild(s);}
      if(vi===7){const s=document.createElement('span');s.className='coord-file';s.textContent=FILES[c];sq.appendChild(s);}

      const piece = b[r][c];
      if(piece){
        const img=document.createElement('img');
        img.src=pieceImg(piece);
        img.className='piece-img'+(piece[0]==='b'?' black-piece':'');
        sq.appendChild(img);
      }
      sq.addEventListener('click', () => onSquareClick(r, c));
      cb.appendChild(sq);
    }
  }
}

// ===== SQUARE CLICK → play move =====
let selectedSquare = null;
let legalMovesCache = [];

function onSquareClick(r, c) {
  const curBoard = getCurrentBoard();
  const curTurn = getCurrentTurn();
  const curCast = getCurrentCastling();
  const curEP = getCurrentEnPassant();

  if (selectedSquare) {
    const [sr, sc] = selectedSquare;
    const legal = getLegalMoves(curBoard, curTurn, curCast, curEP);
    const move = legal.find(m => m.from[0]===sr && m.from[1]===sc && m.to[0]===r && m.to[1]===c && !m.promotion);
    const promoMoves = legal.filter(m => m.from[0]===sr&&m.from[1]===sc&&m.to[0]===r&&m.to[1]===c&&m.promotion);

    if (move) {
      applyExplorerMove(move);
      selectedSquare = null;
      clearHighlights();
      return;
    }
    if (promoMoves.length > 0) {
      applyExplorerMove(promoMoves[0]); // auto-queen
      selectedSquare = null;
      clearHighlights();
      return;
    }
    selectedSquare = null;
    clearHighlights();
  }

  const p = curBoard[r][c];
  if (p && p[0] === curTurn) {
    selectedSquare = [r, c];
    const legal = getLegalMoves(curBoard, curTurn, curCast, curEP);
    const dests = legal.filter(m=>m.from[0]===r&&m.from[1]===c);
    // highlight
    highlightedMoves = new Set(dests.map(m => FILES[m.to[1]]+(8-m.to[0])));
    renderBoard();
    // mark selected
    const sqEl = document.querySelector(`.square[data-r="${r}"][data-c="${c}"]`);
    if(sqEl) sqEl.style.background = 'rgba(255,220,80,0.7)';
  }
}

function clearHighlights() {
  highlightedMoves = new Set();
  renderBoard();
}

function applyExplorerMove(move) {
  const b = deepCopyBoard(getCurrentBoard());
  const t = getCurrentTurn();
  const ca = {...getCurrentCastling()};
  const ep = getCurrentEnPassant();
  const hm = currentHistIdx >= 0 ? moveHistory[currentHistIdx].halfMove : halfMove;
  const fm = currentHistIdx >= 0 ? moveHistory[currentHistIdx].fullMove : fullMove;

  const legal = getLegalMoves(b, t, ca, ep);
  const san = moveToSAN(b, move, t, ca, ep, legal);
  const uci = FILES[move.from[1]]+(8-move.from[0])+FILES[move.to[1]]+(8-move.to[0])+(move.promotion?move.promotion.toLowerCase():'');

  const nb = applyMoveToBoard(b, move, t);
  const newCa = {...ca};
  const p = b[move.from[0]][move.from[1]];
  if(p==='wK'){newCa.wK=false;newCa.wQ=false;}
  if(p==='bK'){newCa.bK=false;newCa.bQ=false;}
  if(move.from[0]===7&&move.from[1]===7)newCa.wK=false;
  if(move.from[0]===7&&move.from[1]===0)newCa.wQ=false;
  if(move.from[0]===0&&move.from[1]===7)newCa.bK=false;
  if(move.from[0]===0&&move.from[1]===0)newCa.bQ=false;
  const newEP = move.doublePush?[move.to[0]-(t==='w'?-1:1),move.to[1]]:null;
  const newHm = (p&&p[1]==='P')||move.capture ? 0 : hm+1;
  const newFm = t==='b' ? fm+1 : fm;

  // truncate future if branching
  moveHistory = moveHistory.slice(0, currentHistIdx+1);
  currentHistIdx++;
  moveHistory.push({
    san, uci, board: nb, turn: enemyColor(t),
    castling: newCa, enPassant: newEP,
    halfMove: newHm, fullMove: newFm,
    from: move.from, to: move.to
  });

  renderBoard();
  renderMoveHistory();
  fetchExplorerData();
}

// ===== MOVE HISTORY DISPLAY =====
function renderMoveHistory() {
  const bar = document.getElementById('move-history-bar');
  bar.innerHTML = '<span style="font-size:10px;color:var(--text-muted);margin-right:4px;">♟</span>';
  let moveNum = 1;
  for (let i = 0; i < moveHistory.length; i++) {
    const h = moveHistory[i];
    const isWhiteMove = (i % 2 === 0); // first move is always white
    if (isWhiteMove) {
      const num = document.createElement('span');
      num.className = 'hist-num';
      num.textContent = moveNum++ + '.';
      bar.appendChild(num);
    }
    const btn = document.createElement('span');
    btn.className = 'hist-move' + (i === currentHistIdx ? ' active' : '');
    btn.textContent = h.san;
    btn.onclick = () => { currentHistIdx = i; clearHighlights(); fetchExplorerData(); renderMoveHistory(); };
    bar.appendChild(btn);
    if (!isWhiteMove) {
      const sep = document.createElement('span');
      sep.className = 'hist-sep';
      sep.textContent = ' ';
      bar.appendChild(sep);
    }
  }
}

// ===== NAVIGATION =====
function goToStart() { currentHistIdx = -1; clearHighlights(); fetchExplorerData(); renderMoveHistory(); }
function goBack()    { if(currentHistIdx>-1){currentHistIdx--;clearHighlights();fetchExplorerData();renderMoveHistory();} }
function goForward() { if(currentHistIdx<moveHistory.length-1){currentHistIdx++;clearHighlights();fetchExplorerData();renderMoveHistory();} }
function goToEnd()   { currentHistIdx=moveHistory.length-1;clearHighlights();fetchExplorerData();renderMoveHistory(); }
function flipBoard() { flipped=!flipped; renderBoard(); }
function resetBoard(){ moveHistory=[];currentHistIdx=-1;selectedSquare=null;highlightedMoves=new Set();renderBoard();renderMoveHistory();fetchExplorerData(); }

// keyboard nav
document.addEventListener('keydown', e => {
  if(e.key==='ArrowLeft')  goBack();
  if(e.key==='ArrowRight') goForward();
  if(e.key==='Home')       goToStart();
  if(e.key==='End')        goToEnd();
});

// ===== PGN LOADER =====
function loadPGN() {
  const pgn = document.getElementById('pgn-input').value.trim();
  if(!pgn) return;
  const moves = parsePGNMoves(pgn);
  moveHistory = []; currentHistIdx = -1;
  let b = deepCopyBoard(INIT_BOARD), t='w', ca={wK:true,wQ:true,bK:true,bQ:true}, ep=null, hm=0, fm=1;
  for(const sanStr of moves) {
    const legal = getLegalMoves(b, t, ca, ep);
    const move = findMoveFromSAN(b, t, ca, ep, legal, sanStr);
    if(!move) break;
    const nb = applyMoveToBoard(b, move, t);
    const newCa={...ca};
    const p=b[move.from[0]][move.from[1]];
    if(p==='wK'){newCa.wK=false;newCa.wQ=false;}if(p==='bK'){newCa.bK=false;newCa.bQ=false;}
    if(move.from[0]===7&&move.from[1]===7)newCa.wK=false;if(move.from[0]===7&&move.from[1]===0)newCa.wQ=false;
    if(move.from[0]===0&&move.from[1]===7)newCa.bK=false;if(move.from[0]===0&&move.from[1]===0)newCa.bQ=false;
    const newEP=move.doublePush?[move.to[0]-(t==='w'?-1:1),move.to[1]]:null;
    const san=moveToSAN(b,move,t,ca,ep,legal);
    const uci=FILES[move.from[1]]+(8-move.from[0])+FILES[move.to[1]]+(8-move.to[0])+(move.promotion?move.promotion.toLowerCase():'');
    moveHistory.push({san,uci,board:nb,turn:enemyColor(t),castling:newCa,enPassant:newEP,halfMove:0,fullMove:t==='b'?fm+1:fm,from:move.from,to:move.to});
    b=nb;ca=newCa;ep=newEP;t=enemyColor(t);if(t==='w')fm++;
    currentHistIdx++;
  }
  renderBoard(); renderMoveHistory(); fetchExplorerData();
}

function parsePGNMoves(pgn) {
  // strip headers and result
  let text = pgn.replace(/\[.*?\]/g,'').replace(/\d+\.\.\./g,'').replace(/\d+\./g,' ').replace(/\s+/g,' ').trim();
  text = text.replace(/1-0|0-1|1\/2-1\/2|\*/g,'');
  return text.trim().split(/\s+/).filter(s=>s&&!/^\d+$/.test(s));
}

function findMoveFromSAN(board, color, castling, enPassant, legal, san) {
  san = san.replace(/[+#!?]/g,'');
  if(san==='O-O'||san==='0-0')return legal.find(m=>m.castle==='K');
  if(san==='O-O-O'||san==='0-0-0')return legal.find(m=>m.castle==='Q');
  const promo = san.match(/=([QRBN])/);
  const promoType = promo?promo[1]:null;
  san=san.replace(/=[QRBN]/,'');
  const isCapture=san.includes('x'); san=san.replace('x','');
  let toFile,toRank,pieceType='P',fromFile=null,fromRank=null;
  if('RNBQK'.includes(san[0])){pieceType=san[0];san=san.slice(1);}
  toFile=san[san.length-2]; toRank=parseInt(san[san.length-1]);
  const disamStr=san.slice(0,san.length-2);
  for(const c of disamStr){if('abcdefgh'.includes(c))fromFile=c;else if('12345678'.includes(c))fromRank=parseInt(c);}
  const tc=FILES.indexOf(toFile), tr=8-toRank;
  return legal.find(m=>{
    const p=board[m.from[0]][m.from[1]];
    if(!p||p[0]!==color||p[1]!==pieceType)return false;
    if(m.to[0]!==tr||m.to[1]!==tc)return false;
    if(fromFile&&FILES[m.from[1]]!==fromFile)return false;
    if(fromRank&&8-m.from[0]!==fromRank)return false;
    if(promoType&&m.promotion!==promoType)return false;
    return true;
  });
}

// ===== TOKEN =====
// /api/lichess-token (Vercel Serverless Function) 에서 토큰을 가져옴
// 토큰은 Vercel 환경변수 LICHESS_TOKEN 에 저장되어 있음
let lichessToken = '';
let tokenReady = false; // 토큰 로드 완료 여부

// 토큰을 가져오는 함수 (중복 호출 방지)
let tokenPromise = null;
async function ensureToken() {
  if (tokenReady) return lichessToken;
  if (!tokenPromise) {
    tokenPromise = fetch('/api/lichess-token')
      .then(res => res.ok ? res.json() : {})
      .then(data => {
        if (data.token) lichessToken = data.token;
        tokenReady = true;
      })
      .catch(e => {
        console.warn('[Token] /api/lichess-token 요청 실패:', e);
        tokenReady = true;
      });
  }
  await tokenPromise;
  return lichessToken;
}

// 초기 로드 시 토큰 미리 fetch
ensureToken().then(() => fetchExplorerData());

// ===== LICHESS EXPLORER API =====
let fetchController = null;
let fetchTimeout = null;

// 레이팅 구간 → Lichess API ratings 파라미터 매핑
// Lichess가 허용하는 값: 400, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500
const RATING_BUCKETS = {
  'all':  ['400','1000','1200','1400','1600','1800','2000','2200','2500'],
  '1200': ['400','1000','1200'],
  '1400': ['1000','1200','1400'],
  '1600': ['1400','1600'],
  '1800': ['1600','1800'],
  '2000': ['1800','2000'],
  '2200': ['2000','2200'],
  '2500': ['2200','2500'],
  '2500+':['2500'],
};

function setDb(db, btn) {
  currentDb = db;
  document.querySelectorAll('.tab-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const ratingFilter = document.getElementById('rating-filter');
  const speedFilter  = document.getElementById('speed-filter');
  if (db === 'lichess') {
    ratingFilter.style.display = 'flex';
    speedFilter.style.display  = 'flex';
  } else {
    ratingFilter.style.display = 'none';
    speedFilter.style.display  = 'none';
  }
  fetchExplorerData();
}

function onFilterChange() { fetchExplorerData(); }

async function fetchExplorerData() {
  if (fetchController) fetchController.abort();
  if (fetchTimeout)    clearTimeout(fetchTimeout);
  fetchController = new AbortController();

  const fen = getCurrentFEN();
  document.getElementById('fen-display').textContent = fen;

  fetchTimeout = setTimeout(async () => {
    showLoading(true);
    document.getElementById('no-data-msg').style.display = 'none';
    document.getElementById('moves-list').innerHTML = '';

    try {
      // play= : 루트부터 현재까지 UCI 수열 (없으면 파라미터 자체를 생략)
      const uciList = moveHistory.slice(0, currentHistIdx + 1).map(h => h.uci);
      const playParam = uciList.length > 0 ? `&play=${uciList.join(',')}` : '';

      let url;
      if (currentDb === 'masters') {
        url = `/api/explorer?db=masters&topGames=5${playParam}`;
      } else {
        // 레이팅 버킷
        const ratingKey = document.getElementById('rating-select').value;
        const buckets   = RATING_BUCKETS[ratingKey] || RATING_BUCKETS['all'];
        const ratingParams = `ratings=${buckets.join(',')}`;

        // 시간제
        const speed = document.getElementById('speed-select').value;
        const speedParam = speed ? `&speeds=${speed}` : '&speeds=ultraBullet,bullet,blitz,rapid,classical,correspondence';

        url = `/api/explorer?db=lichess&${ratingParams}${speedParam}&topGames=5${playParam}`;
      }

      console.log('[Explorer] fetching:', url);

      // 토큰이 아직 로드 안 됐으면 기다림
      const headers = { 'Accept': 'application/json' };

      const resp = await fetch(url, { signal: fetchController.signal, headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      console.log('[Explorer] data:', data);

      explorerData = data;
      renderExplorerData(data);
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('[Explorer] error:', e);
        const noData = document.getElementById('no-data-msg');
        if (e.message.includes('401')) {
          noData.innerHTML = '🔑 토큰이 없거나 올바르지 않습니다.<br><span style="font-size:11px">위의 Lichess API 토큰을 입력하고 저장 버튼을 누르세요.</span>';
        } else {
          noData.innerHTML = '이 포지션에 대한 데이터가 없습니다.';
        }
        noData.style.display = 'block';
        document.getElementById('moves-list').innerHTML = '';
      }
    }
    showLoading(false);
  }, 200);
}

function showLoading(v) {
  document.getElementById('explorer-loading').classList.toggle('show', v);
  document.getElementById('moves-table-header').style.display = v ? 'none' : '';
}

function renderExplorerData(data) {
  // Opening name
  if(data.opening) {
    document.getElementById('opening-name').textContent = data.opening.name || '알 수 없는 오프닝';
    const ecoEl = document.getElementById('opening-eco');
    if(data.opening.eco){ ecoEl.textContent = data.opening.eco; ecoEl.style.display='inline-block'; }
    else ecoEl.style.display='none';
  } else {
    if(currentHistIdx === -1) document.getElementById('opening-name').textContent = '시작 포지션';
    else document.getElementById('opening-name').textContent = '알 수 없는 오프닝';
    document.getElementById('opening-eco').style.display='none';
  }

  // Moves display
  const movesStr = moveHistory.slice(0, currentHistIdx+1).map((h,i)=>{
    const isW = i%2===0;
    return (isW?Math.floor(i/2+1)+'.':'')+h.san;
  }).join(' ');
  document.getElementById('opening-moves-display').textContent = movesStr || '시작 포지션';

  // Stats
  const w = data.white||0, d = data.draws||0, bl = data.black||0;
  const total = w+d+bl;
  if(total===0){
    document.getElementById('stat-white-pct').textContent='—';
    document.getElementById('stat-draw-pct').textContent='—';
    document.getElementById('stat-black-pct').textContent='—';
    document.getElementById('stat-total').textContent='— 게임';
    document.getElementById('stat-white-bar').style.width='33%';
    document.getElementById('stat-draw-bar').style.width='34%';
    document.getElementById('stat-black-bar').style.width='33%';
    document.getElementById('moves-list').innerHTML='';
    document.getElementById('no-data-msg').style.display='block';
    document.getElementById('top-games-list').innerHTML='';
    return;
  }
  document.getElementById('no-data-msg').style.display='none';
  const wp=Math.round(w/total*100), dp=Math.round(d/total*100), bp=100-wp-dp;
  document.getElementById('stat-white-pct').textContent=wp+'%';
  document.getElementById('stat-draw-pct').textContent=dp+'%';
  document.getElementById('stat-black-pct').textContent=bp+'%';
  document.getElementById('stat-white-bar').style.width=wp+'%';
  document.getElementById('stat-draw-bar').style.width=dp+'%';
  document.getElementById('stat-black-bar').style.width=bp+'%';
  document.getElementById('stat-total').textContent=formatNum(total)+' 게임';

  // Moves list
  const movesList = document.getElementById('moves-list');
  movesList.innerHTML = '';
  if(!data.moves || data.moves.length===0){
    document.getElementById('no-data-msg').style.display='block';
  } else {
    data.moves.forEach(m => {
      const row = buildMoveRow(m);
      movesList.appendChild(row);
    });
  }

  // Top games
  renderTopGames(data.topGames || data.recentGames || []);
}

function buildMoveRow(m) {
  const w=m.white||0,d=m.draws||0,bl=m.black||0;
  const total=w+d+bl;
  const wp=total?Math.round(w/total*100):0;
  const dp=total?Math.round(d/total*100):0;
  const bp=100-wp-dp;
  const avgElo=m.averageRating||m.averageOpponentRating||null;

  const row = document.createElement('div');
  row.className='move-row';
  row.addEventListener('click', ()=>playExplorerMoveSAN(m.san));
  row.addEventListener('mouseenter', ()=>highlightMoveSAN(m.san));
  row.addEventListener('mouseleave', ()=>{highlightedMoves=new Set();renderBoard();});

  // Move SAN
  const sanCell = document.createElement('div');
  sanCell.className='move-san';
  sanCell.innerHTML = `<span class="move-san-text">${m.san}</span>`;
  row.appendChild(sanCell);

  // Mini bar
  const barCell = document.createElement('div');
  barCell.className='move-bar-cell';
  barCell.innerHTML=`<div class="move-mini-bar">
    <div class="move-mini-white" style="width:${wp}%"></div>
    <div class="move-mini-draw"  style="width:${dp}%"></div>
    <div class="move-mini-black" style="width:${bp}%"></div>
  </div>`;
  row.appendChild(barCell);

  // Game count
  const gamesCell = document.createElement('div');
  gamesCell.className='move-games';
  gamesCell.textContent = formatNum(total);
  row.appendChild(gamesCell);

  // White win%
  const pctCell = document.createElement('div');
  pctCell.className='move-pct '+(wp>=55?'good':wp<=40?'bad':'ok');
  pctCell.textContent = wp+'%';
  row.appendChild(pctCell);

  // Avg elo
  const eloCell = document.createElement('div');
  eloCell.className='move-avg-elo';
  eloCell.textContent = avgElo ? avgElo : '—';
  row.appendChild(eloCell);

  return row;
}

function highlightMoveSAN(san) {
  const b = getCurrentBoard();
  const t = getCurrentTurn();
  const ca = getCurrentCastling();
  const ep = getCurrentEnPassant();
  const legal = getLegalMoves(b, t, ca, ep);
  const move = findMoveFromSAN(b, t, ca, ep, legal, san);
  if(move) {
    highlightedMoves = new Set([FILES[move.to[1]]+(8-move.to[0])]);
    renderBoard();
    // highlight dest stronger
    const sqEl = document.querySelector(`.square[data-r="${move.to[0]}"][data-c="${move.to[1]}"]`);
    if(sqEl) sqEl.style.outline = '3px solid rgba(80,144,208,0.8)';
  }
}

function playExplorerMoveSAN(san) {
  const b = getCurrentBoard();
  const t = getCurrentTurn();
  const ca = getCurrentCastling();
  const ep = getCurrentEnPassant();
  const legal = getLegalMoves(b, t, ca, ep);
  const move = findMoveFromSAN(b, t, ca, ep, legal, san);
  if(move) { applyExplorerMove(move); selectedSquare=null; }
}

function renderTopGames(games) {
  const list = document.getElementById('top-games-list');
  list.innerHTML='';
  if(!games||games.length===0){list.innerHTML='<div class="no-data-msg" style="padding:10px 16px;font-size:11px;">대표 게임 없음</div>';return;}
  games.forEach(g=>{
    const row=document.createElement('div');
    row.className='top-game-row';
    const res=g.winner==='white'?'1-0':g.winner==='black'?'0-1':'½-½';
    const resCls=g.winner==='white'?'white':g.winner==='black'?'black':'draw';
    const wElo=g.white&&g.white.rating?` (${g.white.rating})`:'';
    const bElo=g.black&&g.black.rating?` (${g.black.rating})`:'';
    const wName=g.white&&g.white.name?g.white.name:'?';
    const bName=g.black&&g.black.name?g.black.name:'?';
    const year=g.year||(g.month?g.month.slice(0,4):'');
    row.innerHTML=`
      <div class="tg-players">${wName}${wElo} vs ${bName}${bElo}</div>
      <div class="tg-result ${resCls}">${res}</div>
      <div class="tg-year">${year}</div>
    `;
    if(g.id){row.title='Lichess에서 보기';row.style.cursor='pointer';row.onclick=()=>window.open(`https://lichess.org/${g.id}`,'_blank');}
    list.appendChild(row);
  });
}

function formatNum(n){
  if(n>=1000000)return(n/1000000).toFixed(1)+'M';
  if(n>=1000)return(n/1000).toFixed(1)+'K';
  return n.toString();
}

// ===== INIT =====
renderBoard();
setTimeout(renderBoard, 100); // 초기 레이아웃 이슈 방지 (처음에 작게 나오는 문제 해결)
// fetchExplorerData()는 initToken() 완료 후 자동 호출됨

/* --- script block --- */

// ══════════════════════════════════════════════════════
//  우클릭 화살표 그리기
// ══════════════════════════════════════════════════════
(function() {
  const ARROW_COLOR = 'rgba(255, 165, 0, 0.88)';
  const ARROW_SW    = 14;
  const MARKER_ID   = 'user-arrow-svg-head';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  let _arrowStart = null;
  let _userArrows = [];

  function ensureSvg() {
    // chess-wasm-fixed / study-opening 등 기존 SVG overlay 재사용
    const existingSvg = document.getElementById('board-svg-overlay');
    if (existingSvg && !document.getElementById('user-arrow-svg-arrows')) {
      let defs = existingSvg.querySelector('defs');
      if (!defs) { defs = document.createElementNS(SVG_NS,'defs'); existingSvg.prepend(defs); }
      if (!document.getElementById(MARKER_ID)) {
        const mk = document.createElementNS(SVG_NS, 'marker');
        mk.setAttribute('id', MARKER_ID); mk.setAttribute('markerUnits', 'strokeWidth');
        mk.setAttribute('markerWidth', '4'); mk.setAttribute('markerHeight', '4');
        mk.setAttribute('refX', '2.5'); mk.setAttribute('refY', '2');
        mk.setAttribute('orient', 'auto');
        const mp = document.createElementNS(SVG_NS, 'path');
        mp.setAttribute('d', 'M0,0 L4,2 L0,4 L1,2 Z');
        mp.setAttribute('fill', ARROW_COLOR); mp.setAttribute('stroke', 'none');
        mk.appendChild(mp); defs.appendChild(mk);
      }
      const g2 = document.createElementNS(SVG_NS, 'g');
      g2.id = 'user-arrow-svg-arrows';
      existingSvg.appendChild(g2);
      return existingSvg;
    }
    if (existingSvg) return existingSvg;

    let svg = document.getElementById('user-arrow-svg');
    if (svg) return svg;

    const board = document.getElementById('chessboard');
    if (!board) return null;
    let wrap = board.parentElement;
    if (!wrap || getComputedStyle(wrap).position === 'static') wrap = board;

    svg = document.createElementNS(SVG_NS, 'svg');
    svg.id = 'user-arrow-svg';
    svg.setAttribute('viewBox', '0 0 800 800');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('board-arrow-overlay');

    const defs = document.createElementNS(SVG_NS, 'defs');
    const mk = document.createElementNS(SVG_NS, 'marker');
    mk.setAttribute('id', MARKER_ID); mk.setAttribute('markerUnits', 'strokeWidth');
    mk.setAttribute('markerWidth', '4'); mk.setAttribute('markerHeight', '4');
    mk.setAttribute('refX', '2.5'); mk.setAttribute('refY', '2');
    mk.setAttribute('orient', 'auto');
    const mp = document.createElementNS(SVG_NS, 'path');
    mp.setAttribute('d', 'M0,0 L4,2 L0,4 L1,2 Z');
    mp.setAttribute('fill', ARROW_COLOR); mp.setAttribute('stroke', 'none');
    mk.appendChild(mp); defs.appendChild(mk); svg.appendChild(defs);

    const g = document.createElementNS(SVG_NS, 'g');
    g.id = 'user-arrow-svg-arrows';
    svg.appendChild(g);
    wrap.appendChild(svg);
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    return svg;
  }

  function sqCenter(col, row) { return { px: col * 100 + 50, py: row * 100 + 50 }; }

  function makeArrow(fromCol, fromRow, toCol, toRow) {
    const from = sqCenter(fromCol, fromRow);
    const to   = sqCenter(toCol, toRow);
    const dx = to.px - from.px, dy = to.py - from.py;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len < 1) return null;
    const ux = dx/len, uy = dy/len;
    const sw = ARROW_SW;
    const sx = from.px + ux*sw*1.2, sy = from.py + uy*sw*1.2;
    const ex = to.px   - ux*sw*2.5, ey = to.py   - uy*sw*2.5;
    if (Math.sqrt((ex-sx)**2+(ey-sy)**2) < 5) return null;
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', sx.toFixed(2)); line.setAttribute('y1', sy.toFixed(2));
    line.setAttribute('x2', ex.toFixed(2)); line.setAttribute('y2', ey.toFixed(2));
    line.setAttribute('stroke', ARROW_COLOR);
    line.setAttribute('stroke-width', sw);
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('marker-end', 'url(#' + MARKER_ID + ')');
    return line;
  }

  function redrawArrows() {
    const g = document.getElementById('user-arrow-svg-arrows');
    if (!g) return;
    g.innerHTML = '';
    _userArrows.forEach(a => {
      const el = makeArrow(a.fromCol, a.fromRow, a.toCol, a.toRow);
      if (el) g.appendChild(el);
    });
  }

  function getBoardSquare(e) {
    const board = getActiveBoard();
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    return {
      col: Math.max(0, Math.min(7, Math.floor(x / rect.width  * 8))),
      row: Math.max(0, Math.min(7, Math.floor(y / rect.height * 8)))
    };
  }

  function toggleMobilePanel(forceClose) {
    const panel     = document.getElementById('right-panel');
    const backdrop  = document.getElementById('mobile-panel-backdrop');
    const iconOpen  = document.getElementById('mpanel-icon-open');
    const iconClose = document.getElementById('mpanel-icon-close');
    if (!panel || !backdrop) return;
    const isOpen    = panel.classList.contains('mobile-open');
    const shouldOpen = forceClose === false ? false : !isOpen;
    panel.classList.toggle('mobile-open', shouldOpen);
    backdrop.classList.toggle('show', shouldOpen);
    if (iconOpen) iconOpen.style.display  = shouldOpen ? 'none' : '';
    if (iconClose) iconClose.style.display = shouldOpen ? ''      : 'none';
  }
  window.toggleMobilePanel = toggleMobilePanel;

  function attachEvents() {
    const board = document.getElementById('chessboard');
    const boardMobile = document.getElementById('chessboard-mobile');
    if (!board && !boardMobile) { setTimeout(attachEvents, 300); return; }
    ensureSvg();

    const boards = [board, boardMobile].filter(b => b !== null);
    boards.forEach(b => {
      b.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const sq = getBoardSquare(e);
        if (sq) _arrowStart = sq;
      });

      b.addEventListener('mouseup', function(e) {
        if (e.button !== 2) return;
        if (!_arrowStart) return;
        const sq = getBoardSquare(e);
        ensureSvg();
        if (sq) {
          if (sq.col === _arrowStart.col && sq.row === _arrowStart.row) {
            _userArrows = [];
          } else {
            const idx = _userArrows.findIndex(a =>
              a.fromCol===_arrowStart.col && a.fromRow===_arrowStart.row &&
              a.toCol===sq.col && a.toRow===sq.row
            );
            if (idx >= 0) _userArrows.splice(idx, 1);
            else _userArrows.push({ fromCol:_arrowStart.col, fromRow:_arrowStart.row, toCol:sq.col, toRow:sq.row });
          }
          redrawArrows();
        }
        _arrowStart = null;
      });

      b.addEventListener('mousedown', function(e) {
        if (e.button === 0) {
          _userArrows = [];
          redrawArrows();
          _arrowStart = null;
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachEvents);
  } else {
    attachEvents();
  }
})();