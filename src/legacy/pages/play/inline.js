// ══════════════════════════════════════════
// 체스 엔진 (독립형)
// ══════════════════════════════════════════
const PIECE_IMG_BASE = 'https://lichess1.org/assets/piece/cburnett/';
function pieceImg(p) { return PIECE_IMG_BASE + p + '.svg'; }
// 기물 이미지 미리 로드 — 첫 수 깜빡임 방지
(function preloadPieces() {
  ['wP','wN','wB','wR','wQ','wK','bP','bN','bB','bR','bQ','bK'].forEach(p => {
    const img = new Image(); img.src = pieceImg(p);
  });
})();

const FILES = ['a','b','c','d','e','f','g','h'];

function moveToSAN(board, move, color, allMoves) {
  const [fr,fc]=move.from,[tr,tc]=move.to,p=board[fr][fc],type=p[1];
  const captured=board[tr][tc]||(move.enPassant?'ep':null);
  let san='';
  if(move.castle==='K')return'O-O';
  if(move.castle==='Q')return'O-O-O';
  if(type!=='P'){
    san+=type;
    const ambig=allMoves.filter(m=>m!==move&&board[m.from[0]][m.from[1]]===p&&m.to[0]===tr&&m.to[1]===tc);
    if(ambig.length){const sf=ambig.some(m=>m.from[1]===fc),sr=ambig.some(m=>m.from[0]===fr);if(!sf)san+=FILES[fc];else if(!sr)san+=(8-fr);else san+=FILES[fc]+(8-fr);}
  } else if(captured){san+=FILES[fc];}
  if(captured)san+='x';
  san+=FILES[tc]+(8-tr);
  if(move.promo&&move.promoPiece)san+='='+move.promoPiece;
  const nb=applyMoveToBoard(board.map(r=>[...r]),move,color);
  const enemy=enemyColor(color);
  const enemyLegal=getAllLegal(nb,enemy,{wK:false,wQ:false,bK:false,bQ:false},null);
  if(isInCheck(nb,enemy))san+=enemyLegal.length===0?'#':'+';
  return san;
}

const INIT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

let _board = [], _turn = 'w', _castling = {wK:true,wQ:true,bK:true,bQ:true};
let _enPassant = null, _selected = null, _legalMoves = [], _lastMove = null;
let _myColor = 'w', _gameId = null, _gameRef = null;
let _sanMoves = [];
let _wTime = 600, _bTime = 600, _timerInt = null;
let _gameActive = false;
let _firstMoveDone = false;          // 첫 수 여부 추적
let _firstMoveTimer = null;          // 첫 수 10초 타이머
let _disconnectRef = null;           // onDisconnect 참조
let _heartbeatInt = null;            // 내 heartbeat 전송 인터벌
let _oppHeartbeatInt = null;         // 상대 heartbeat 감시 인터벌
let _oppLastSeen = null;             // 상대 마지막 heartbeat 시각

function parseFen(fen) {
  const parts = fen.split(' ');
  const rows = parts[0].split('/');
  const board = [];
  for (const row of rows) {
    const r = [];
    for (const ch of row) {
      if ('12345678'.includes(ch)) for (let i=0;i<+ch;i++) r.push(null);
      else {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        const type  = ch.toUpperCase();
        r.push(color + type);
      }
    }
    board.push(r);
  }
  _turn = parts[1] || 'w';
  const cast = parts[2] || '-';
  _castling = { wK: cast.includes('K'), wQ: cast.includes('Q'), bK: cast.includes('k'), bQ: cast.includes('q') };
  _enPassant = parts[3] !== '-' ? algebraicToRC(parts[3]) : null;
  return board;
}

function algebraicToRC(alg) {
  if (!alg || alg === '-') return null;
  const c = alg.charCodeAt(0) - 97;
  const r = 8 - parseInt(alg[1]);
  return [r, c];
}

function enemyColor(c) { return c === 'w' ? 'b' : 'w'; }
function isInBounds(r,c) { return r>=0&&r<8&&c>=0&&c<8; }

function pseudoMoves(board, r, c, castling, enPassant) {
  const p = board[r][c]; if (!p) return [];
  const color=p[0], type=p[1], moves=[], enemy=enemyColor(color), dir=color==='w'?-1:1;
  const push=(tr,tc,extra={})=>{ if(isInBounds(tr,tc)){const t=board[tr][tc];if(!t||t[0]===enemy)moves.push({from:[r,c],to:[tr,tc],...extra});} };
  const slide=(drs,dcs)=>{ for(let i=0;i<drs.length;i++){let nr=r+drs[i],nc=c+dcs[i];while(isInBounds(nr,nc)){const t=board[nr][nc];if(t){if(t[0]===enemy)moves.push({from:[r,c],to:[nr,nc]});break;}moves.push({from:[r,c],to:[nr,nc]});nr+=drs[i];nc+=dcs[i];}} };
  if(type==='P'){
    if(!board[r+dir]?.[c])moves.push({from:[r,c],to:[r+dir,c],...((r+dir===0||r+dir===7)?{promo:true}:{})});
    if((color==='w'&&r===6||color==='b'&&r===1)&&!board[r+dir][c]&&!board[r+2*dir][c])moves.push({from:[r,c],to:[r+2*dir,c],doublePush:true});
    [-1,1].forEach(dc=>{
      if(isInBounds(r+dir,c+dc)){
        if(board[r+dir][c+dc]&&board[r+dir][c+dc][0]===enemy)moves.push({from:[r,c],to:[r+dir,c+dc],...((r+dir===0||r+dir===7)?{promo:true}:{})});
        if(enPassant&&enPassant[0]===r+dir&&enPassant[1]===c+dc)moves.push({from:[r,c],to:[r+dir,c+dc],enPassant:true});
      }
    });
  } else if(type==='N'){[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>push(r+dr,c+dc));}
  else if(type==='B'){slide([-1,-1,1,1],[-1,1,-1,1]);}
  else if(type==='R'){slide([-1,0,1,0],[0,-1,0,1]);}
  else if(type==='Q'){slide([-1,-1,-1,0,0,1,1,1],[-1,0,1,-1,1,-1,0,1]);}
  else if(type==='K'){[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>push(r+dr,c+dc));
    if(color==='w'){if(castling.wK&&!board[7][5]&&!board[7][6]&&board[7][7]==='wR')moves.push({from:[7,4],to:[7,6],castle:'K'});if(castling.wQ&&!board[7][3]&&!board[7][2]&&!board[7][1]&&board[7][0]==='wR')moves.push({from:[7,4],to:[7,2],castle:'Q'});}
    if(color==='b'){if(castling.bK&&!board[0][5]&&!board[0][6]&&board[0][7]==='bR')moves.push({from:[0,4],to:[0,6],castle:'K'});if(castling.bQ&&!board[0][3]&&!board[0][2]&&!board[0][1]&&board[0][0]==='bR')moves.push({from:[0,4],to:[0,2],castle:'Q'});}
  }
  return moves;
}

function applyMoveToBoard(board, move, color) {
  const b = board.map(r=>[...r]);
  const[fr,fc]=move.from,[tr,tc]=move.to,p=b[fr][fc];
  b[tr][tc]=move.promoPiece?color+move.promoPiece:p; b[fr][fc]=null;
  if(move.enPassant){const cr=color==='w'?tr+1:tr-1;b[cr][tc]=null;}
  if(move.castle==='K'){b[fr][7]=null;b[fr][5]=`${color}R`;}
  else if(move.castle==='Q'){b[fr][0]=null;b[fr][3]=`${color}R`;}
  return b;
}

function isInCheck(board, color) {
  let kr=-1,kc=-1;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]===color+'K'){kr=r;kc=c;}
  if(kr<0)return false;
  const enemy=enemyColor(color);
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    if(board[r][c]&&board[r][c][0]===enemy){
      const ms=pseudoMoves(board,r,c,{wK:false,wQ:false,bK:false,bQ:false},null);
      if(ms.some(m=>m.to[0]===kr&&m.to[1]===kc))return true;
    }
  }
  return false;
}

function getLegalMoves(board, r, c, castling, enPassant) {
  const p=board[r][c]; if(!p)return[];
  const color=p[0], pseudo=pseudoMoves(board,r,c,castling,enPassant), legal=[];
  for(const move of pseudo){
    const nb=applyMoveToBoard(board,move,color);
    if(!isInCheck(nb,color)){
      if(move.castle){
        const midC=move.castle==='K'?5:3;
        const nb2=applyMoveToBoard(board,{from:move.from,to:[move.from[0],midC]},color);
        if(isInCheck(board,color)||isInCheck(nb2,color))continue;
      }
      legal.push(move);
    }
  }
  return legal;
}

function getAllLegal(board, color, castling, enPassant) {
  const moves=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]&&board[r][c][0]===color)moves.push(...getLegalMoves(board,r,c,castling,enPassant));
  return moves;
}

// ══════════════════════════════════════════
// 보드 렌더링
// ══════════════════════════════════════════
function renderBoard() {
  const el = document.getElementById('play-board');
  if (!el) return;
  const flipped = _myColor === 'b';
  const isFirstRender = el.children.length === 0;

  for (let ri = 0; ri < 8; ri++) {
    for (let ci = 0; ci < 8; ci++) {
      const r = flipped ? 7 - ri : ri;
      const c = flipped ? 7 - ci : ci;
      const isLight = (r + c) % 2 === 0;
      const idx = ri * 8 + ci;
      const piece = _board[r][c];

      let sq;
      if (isFirstRender) {
        sq = document.createElement('div');
        sq.dataset.r = r; sq.dataset.c = c;
        
        // 좌표 레이블 (절대 위치 스타일 적용됨)
        if (ci === 0) { const lbl = document.createElement('span'); lbl.className='rank-label'; lbl.textContent=8-r; sq.appendChild(lbl); }
        if (ri === 7) { const lbl = document.createElement('span'); lbl.className='file-label'; lbl.textContent='abcdefgh'[c]; sq.appendChild(lbl); }
        
        // 기물 이미지 (절대 위치가 아닌 flex-center로 배치됨)
        const img = document.createElement('img');
        img.className = 'piece-img';
        img.draggable = false;
        img.style.display = 'none';
        sq.appendChild(img);
        
        sq.addEventListener('click', () => onSquareClick(Number(sq.dataset.r), Number(sq.dataset.c)));
        el.appendChild(sq);
      } else {
        sq = el.children[idx];
      }

      // 클래스 재설정
      const classes = ['sq', isLight ? 'light' : 'dark'];
      if (_lastMove) {
        if (_lastMove.from[0]===r && _lastMove.from[1]===c) classes.push('last-from');
        if (_lastMove.to[0]===r   && _lastMove.to[1]===c)   classes.push('last-to');
      }
      if (_selected && _selected[0]===r && _selected[1]===c) classes.push('selected');
      const isPossible = _legalMoves.some(m => m.to[0]===r && m.to[1]===c);
      if (isPossible) {
        classes.push('possible');
        if (piece) classes.push('has-piece');
      }
      const king = _turn + 'K';
      if (piece === king && isInCheck(_board, _turn)) classes.push('in-check');
      sq.className = classes.join(' ');

      // 기물 이미지 업데이트
      const img = sq.querySelector('.piece-img');
      if (img) {
        if (piece) {
          const newSrc = pieceImg(piece);
          if (img.src !== newSrc) img.src = newSrc;
          const newCls = 'piece-img' + (piece.startsWith('b') ? ' black-piece' : '');
          if (img.className !== newCls) img.className = newCls;
          img.alt = piece;
          img.style.display = 'block'; // none 대신 block으로 확실히 표시
        } else {
          img.style.display = 'none';
          img.src = '';
        }
      }
    }
  }
}

// ══════════════════════════════════════════
// 클릭 처리
// ══════════════════════════════════════════
let _pendingPromo = null;

function onSquareClick(r, c) {
  if (!_gameActive) return;
  if (_turn !== _myColor) return; // 내 차례 아님

  const piece = _board[r][c];

  if (_selected) {
    const move = _legalMoves.find(m => m.to[0]===r && m.to[1]===c);
    if (move) {
      if (move.promo) {
        _pendingPromo = move;
        showPromoModal(r, c);
        return;
      }
      doMove(move, null);
      return;
    }
  }

  // 내 기물 선택
  if (piece && piece[0] === _myColor) {
    _selected = [r, c];
    _legalMoves = getLegalMoves(_board, r, c, _castling, _enPassant);
  } else {
    _selected = null; _legalMoves = [];
  }
  renderBoard();
}

function showPromoModal(r, c) {
  const modal = document.getElementById('promo-modal');
  const pieces = _myColor === 'w' ? ['wQ','wR','wB','wN'] : ['bQ','bR','bB','bN'];
  modal.innerHTML = '';
  pieces.forEach((p) => {
    const div = document.createElement('div');
    div.className = 'promo-piece';
    const img = document.createElement('img');
    img.src = pieceImg(p);
    img.style.cssText = 'width:44px;height:44px;object-fit:contain;pointer-events:none;';
    if (p.startsWith('b')) img.style.filter = 'drop-shadow(0 0 1px rgba(180,180,180,0.9))';
    div.appendChild(img);
    div.onclick = () => {
      modal.style.display = 'none';
      if (_pendingPromo) { _pendingPromo.promoPiece = p[1]; doMove(_pendingPromo, p[1]); _pendingPromo = null; }
    };
    modal.appendChild(div);
  });

  // 위치 계산
  const boardEl = document.getElementById('play-board-wrap');
  const rect = boardEl.getBoundingClientRect();
  const sqSize = rect.width / 8;
  const flipped = _myColor === 'b';
  const ci = flipped ? 7 - c : c;
  const ri = flipped ? 7 - r : r;
  modal.style.display = 'flex';
  modal.style.left = Math.min(ci * sqSize, rect.width - 224) + 'px';
  modal.style.top  = (ri <= 3 ? (ri+1)*sqSize : ri*sqSize - 60) + 'px';
}

// ══════════════════════════════════════════
// 수 실행
// ══════════════════════════════════════════
function doMove(move, promoPiece) {
  const boardBefore = _board.map(r=>[...r]);
  _board = applyMoveToBoard(_board, move, _turn);
  if (promoPiece) move.promoPiece = promoPiece;

  // ── 첫 수 처리 ──
  if (!_firstMoveDone) {
    _firstMoveDone = true;
    clearTimeout(_firstMoveTimer); // 10초 무승부 타이머 취소
    // 이제부터 나가면 패배로 등록
    setupDisconnectLoss();
  }

  // 캐슬링 업데이트
  if (_board[move.to[0]][move.to[1]] === _turn+'K') {
    if (_turn==='w'){_castling.wK=false;_castling.wQ=false;}
    else{_castling.bK=false;_castling.bQ=false;}
  }
  if(move.from[0]===7&&move.from[1]===7)_castling.wK=false;
  if(move.from[0]===7&&move.from[1]===0)_castling.wQ=false;
  if(move.from[0]===0&&move.from[1]===7)_castling.bK=false;
  if(move.from[0]===0&&move.from[1]===0)_castling.bQ=false;

  _enPassant = move.doublePush ? [move.to[0]-(_turn==='w'?-1:1), move.to[1]] : null;
  _lastMove = move;
  _selected = null; _legalMoves = [];

  const prevTurn = _turn;
  _turn = enemyColor(_turn);

  // 수를 두면 화살표 초기화 (새 수 인덱스 기준으로 리셋)
  _userArrows = [];

  // 사운드
  playMoveSound(move, boardBefore, prevTurn);

  // SAN 기록
  const _allM=getAllLegal(boardBefore,prevTurn,_castling,_enPassant);
  _sanMoves.push(moveToSAN(boardBefore,move,prevTurn,_allM));

  // Firebase에 수 전송
  sendMove(move);
  updateTimerOnMove();

  renderBoard();
  checkGameEnd();
}

function checkGameEnd() {
  const allMoves = getAllLegal(_board, _turn, _castling, _enPassant);
  const inCheck  = isInCheck(_board, _turn);

  if (allMoves.length === 0) {
    const status = inCheck ? 'checkmate' : 'stalemate';
    if (_gameRef) _gameRef.update({ status });
  }
}

// ══════════════════════════════════════════
// 사운드
// ══════════════════════════════════════════
const _sounds = {};
const _soundFiles2 = {
  move:'sound/chess_move.mp3', capture:'sound/chess_capture.mp3',
  castle:'sound/chess_castle.mp3', check:'sound/chess_check.mp3',
  checkmate:'sound/chess_checkmate.mp3', stalemate:'sound/chess_stalemate.mp3',
  start:'sound/chess_start.mp3', over:'sound/chess_over.mp3',
};
for (const [k,v] of Object.entries(_soundFiles2)) {
  const a = new Audio(v); a.preload='auto'; _sounds[k]=a;
}
function playSound(type) {
  const a = _sounds[type]; if (!a) return;
  a.cloneNode().play().catch(()=>{});
}
function playMoveSound(move, boardBefore, turn) {
  const boardAfter = applyMoveToBoard(boardBefore.map(r=>[...r]), move, turn);
  const enemy = enemyColor(turn);
  const inCheck = isInCheck(boardAfter, enemy);
  const noMoves = getAllLegal(boardAfter, enemy, _castling, _enPassant).length === 0;
  if      (inCheck && noMoves) playSound('checkmate');
  else if (!inCheck && noMoves) playSound('stalemate');
  else if (inCheck)             playSound('check');
  else if (move.castle)         playSound('castle');
  else if (boardBefore[move.to[0]][move.to[1]] || move.enPassant) playSound('capture');
  else                          playSound('move');
}

// ══════════════════════════════════════════
// 타이머
// ══════════════════════════════════════════
function fmtTime(s) {
  s = Math.max(0, s);
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
}
let _lastTickTime = null;

function startTimer() {
  clearInterval(_timerInt);
  _lastTickTime = Date.now();
  _timerInt = setInterval(() => {
    if (!_gameActive) return;
    const now = Date.now();
    const delta = (now - _lastTickTime) / 1000;
    _lastTickTime = now;

    if (_turn === 'w') _wTime = Math.max(0, _wTime - delta);
    else               _bTime = Math.max(0, _bTime - delta);

    updateTimerDisplay();

    if (_wTime <= 0 || _bTime <= 0) {
      const loserColor = _wTime <= 0 ? 'w' : 'b';
      // timeout_w / timeout_b 로 저장 → 양쪽 클라이언트가 올바르게 판정 가능
      const status = loserColor === 'w' ? 'timeout_w' : 'timeout_b';
      if (_gameRef) _gameRef.update({ status });
    }
  }, 100);
}

function updateTimerDisplay() {
  const myTime  = _myColor === 'w' ? _wTime : _bTime;
  const oppTime = _myColor === 'w' ? _bTime : _wTime;
  const myEl  = document.getElementById('my-timer');
  const oppEl = document.getElementById('opp-timer');
  if (myEl) {
    myEl.textContent = fmtTime(myTime);
    myEl.className = 'p-timer' + (_turn===_myColor?' active':'') + (myTime<30?' low':'');
  }
  if (oppEl) {
    oppEl.textContent = fmtTime(oppTime);
    oppEl.className = 'p-timer' + (_turn!==_myColor?' active':'') + (oppTime<30?' low':'');
  }
}

function updateTimerOnMove() {
  if (_gameRef) _gameRef.update({ whiteTime: _wTime, blackTime: _bTime, lastMoveAt: Date.now() });
}

// ══════════════════════════════════════════
// Firebase 매칭 & 대국
// ══════════════════════════════════════════
const GAME_TIME = 600;
let _queueRef = null, _searchInt = null;

async function startMatchmaking() {
  if (!_user || _gameActive) return;
  showScreen('searching');
  let elapsed = 0;
  _searchInt = setInterval(() => {
    elapsed++;
    const el = document.getElementById('search-elapsed');
    if (el) el.textContent = elapsed + '초 경과';
  }, 1000);

  const myName = _user.displayName || _user.email.split('@')[0];
  const queue = _rtDb.ref('matchmaking_queue');
  const myRef = queue.push();
  _queueRef = myRef;
  const myJoinedAt = Date.now();
  await myRef.set({ uid: _user.uid, displayName: myName, joinedAt: myJoinedAt });

  // 자신보다 먼저 들어온 사람 중에서 매칭 대상을 찾음 (Race Condition 방지)
  const snap = await queue.orderByChild('joinedAt').endAt(myJoinedAt - 1).limitToLast(10).once('value');
  let matched = false;

  const entries = [];
  snap.forEach(child => { entries.push({ key: child.key, data: child.val() }); });
  // 가장 최근에 들어온 사람부터 확인
  entries.reverse();

  for (const entry of entries) {
    if (matched) break;
    const { key, data } = entry;
    if (!data || data.uid === _user.uid || data.gameId) continue;

    // 트랜잭션을 사용하여 상대를 '선점'함
    const result = await _rtDb.ref(`matchmaking_queue/${key}`).transaction((currentData) => {
      if (currentData && !currentData.gameId) {
        // 아직 매칭되지 않은 경우에만 내 정보를 기입하여 선점
        return { ...currentData, gameId: 'PENDING', matchedWith: _user.uid };
      }
      return; // 중단
    });

    if (result.committed) {
      matched = true;
      const gameId = queue.push().key;
      const myColor = Math.random() < 0.5 ? 'w' : 'b';
      const oppColor = myColor === 'w' ? 'b' : 'w';

      const gameData = {
        white: myColor === 'w' ? _user.uid : data.uid,
        black: myColor === 'b' ? _user.uid : data.uid,
        whiteName: myColor === 'w' ? myName : data.displayName,
        blackName: myColor === 'b' ? myName : data.displayName,
        status: 'playing',
        whiteTime: GAME_TIME,
        blackTime: GAME_TIME,
        lastMoveAt: Date.now(),
        createdAt: Date.now(),
      };

      await _rtDb.ref('games/' + gameId).set(gameData);
      // 상대방 노드 업데이트 (진짜 gameId로 교체)
      await _rtDb.ref(`matchmaking_queue/${key}`).update({ gameId: gameId, color: oppColor });
      
      myRef.remove();
      _queueRef = null;
      joinGame(gameId, myColor, gameData);
      break;
    }
  }

  if (!matched) {
    _queueRef.on('value', snap2 => {
      const d = snap2.val();
      if (!d || !d.gameId || d.gameId === 'PENDING') return;
      _queueRef.off();
      const waitRef = _queueRef;
      _queueRef = null;
      _rtDb.ref('games/' + d.gameId).once('value').then(gs => {
        if (gs.val()) {
          waitRef.remove();
          joinGame(d.gameId, d.color, gs.val());
        }
      });
    });
  }
}

function cancelMatchmaking() {
  clearInterval(_searchInt);
  clearTimeout(_firstMoveTimer);
  cancelDisconnectLoss();
  stopHeartbeat(_gameId, _myColor);
  if (_queueRef) { _queueRef.remove(); _queueRef = null; }
  showScreen('lobby');
}

function joinGame(gameId, myColor, gameData) {
  clearInterval(_searchInt);
  _myColor = myColor; _gameId = gameId;
  _board = parseFen(INIT_FEN);
  _turn = 'w'; _castling = {wK:true,wQ:true,bK:true,bQ:true};
  _enPassant = null; _selected = null; _legalMoves = [];
  _lastMove = null; _wTime = GAME_TIME; _bTime = GAME_TIME;
  _gameActive = true;
  _lastTickTime = Date.now();
  _sanMoves = [];
  _gameArrows = {};

  const myName  = myColor==='w' ? gameData.whiteName : gameData.blackName;
  const oppName = myColor==='w' ? gameData.blackName  : gameData.whiteName;

  document.getElementById('my-name-el').textContent    = myName  || '나';
  document.getElementById('opp-name-el').textContent   = oppName || '상대방';
  document.getElementById('my-color-el').textContent   = myColor==='w' ? '⬜ 백' : '⬛ 흑';
  document.getElementById('opp-color-el').textContent  = myColor==='w' ? '⬛ 흑' : '⬜ 백';
  document.getElementById('my-avatar-el').textContent  = (myName  ||'나')[0].toUpperCase();
  document.getElementById('opp-avatar-el').textContent = (oppName||'?')[0].toUpperCase();

  showScreen('playing');
  renderBoard();
  startTimer();
  playSound('start');

  // ── 첫 수 10초 타임아웃 (양측 모두) ──
  _firstMoveDone = false;
  _firstMoveTimer = setTimeout(() => {
    if (_gameActive && !_firstMoveDone) {
      // 10초 내 아무도 두지 않으면 무승부
      if (_gameRef) _gameRef.update({ status: 'draw_no_move' });
    }
  }, 10000);

  // 수 수신
  _gameRef = _rtDb.ref('games/'+gameId);

  // ── Heartbeat 시작 ──
  startHeartbeat(gameId, myColor);

  // ── 접속 끊김 감지: 첫 수 후 나가면 패배 ──
  // 첫 수 전에는 무승부(위 타이머), 첫 수 후에는 패배
  _disconnectRef = null; // 첫 수 후 setupDisconnectLoss()에서 설정
  _gameRef.child('moves').on('child_added', snap => {
    const d = snap.val();
    if (!d || d.uid === _user.uid) return;
    applyRemoteMove(d);
  });
  _gameRef.child('status').on('value', snap => {
    const s = snap.val();
    if (s && s !== 'playing') endGame(s);
  });
  // 무승부 제안 감지
  _gameRef.child('drawOffer').on('value', snap => {
    const offer = snap.val();
    const bar   = document.getElementById('draw-offer-bar');
    const btn   = document.getElementById('btn-draw');
    if (offer && offer !== _myColor) {
      // 상대가 무승부 제안
      if (bar) bar.classList.add('show');
    } else {
      if (bar) bar.classList.remove('show');
      // 내 제안이 취소/수락됨 → 버튼 복원
      if (!offer && btn) { btn.disabled = false; btn.textContent = '½ 무승부 제안'; }
    }
  });
  _gameRef.child('whiteTime').on('value', snap => { if (snap.val() !== null && _turn !== 'w') _wTime = snap.val(); });
  _gameRef.child('blackTime').on('value', snap => { if (snap.val() !== null && _turn !== 'b') _bTime = snap.val(); });
}

function applyRemoteMove(d) {
  const allMoves = getAllLegal(_board, _turn, _castling, _enPassant);
  const move = allMoves.find(m =>
    m.from[0]===d.from[0] && m.from[1]===d.from[1] &&
    m.to[0]===d.to[0]     && m.to[1]===d.to[1]
  );
  if (!move) return;
  if (d.promo) move.promoPiece = d.promo;
  doMove(move, d.promo || null);
}

function sendMove(move) {
  if (!_gameRef || !_user) return;
  _gameRef.child('moves').push({
    uid: _user.uid, from: move.from, to: move.to,
    promo: move.promoPiece || null, at: Date.now(),
  });
}

let _drawOfferTimeout = null;

function offerDraw() {
  if (!_gameRef || !_gameActive) return;
  const btn = document.getElementById('btn-draw');
  if (btn) { btn.disabled = true; btn.textContent = '½ 제안 중...'; }
  _gameRef.update({ drawOffer: _myColor, drawOfferAt: Date.now() });
  // 30초 후 자동 만료
  _drawOfferTimeout = setTimeout(() => {
    if (_gameRef) _gameRef.update({ drawOffer: null });
    if (btn) { btn.disabled = false; btn.textContent = '½ 무승부 제안'; }
  }, 30000);
}

function acceptDraw() {
  hidDrawOfferBar();
  if (_gameRef) _gameRef.update({ status: 'draw', drawOffer: null });
}

function declineDraw() {
  hidDrawOfferBar();
  if (_gameRef) _gameRef.update({ drawOffer: null });
}

function hidDrawOfferBar() {
  const bar = document.getElementById('draw-offer-bar');
  if (bar) bar.classList.remove('show');
}

function resignGame() {
  if (!_gameRef || !_gameActive) return;
  cancelDisconnectLoss(); // 정상 기권이므로 disconnect 취소
  const status = _myColor === 'w' ? 'resign_w' : 'resign_b';
  _gameRef.update({ status });
}

// ── disconnect 패배 등록/해제 ──
function setupDisconnectLoss() {
  if (!_gameRef || !_user) return;
  const status = _myColor === 'w' ? 'resign_w' : 'resign_b';
  _disconnectRef = _gameRef;
  _disconnectRef.onDisconnect().update({ status });
}
function cancelDisconnectLoss() {
  if (_disconnectRef) {
    _disconnectRef.onDisconnect().cancel();
    _disconnectRef = null;
  }
}

// ══════════════════════════════════════════
// Heartbeat (상대 접속 감시)
// ══════════════════════════════════════════
function startHeartbeat(gameId, myColor) {
  const oppColor = myColor === 'w' ? 'b' : 'w';
  const myHbRef  = _rtDb.ref(`games/${gameId}/heartbeat/${myColor}`);
  const oppHbRef = _rtDb.ref(`games/${gameId}/heartbeat/${oppColor}`);

  // 내 heartbeat: 3초마다 현재 시각 기록
  clearInterval(_heartbeatInt);
  _heartbeatInt = setInterval(() => {
    if (!_gameActive) return;
    myHbRef.set(Date.now());
  }, 3000);
  myHbRef.set(Date.now()); // 즉시 1회

  // 상대 heartbeat 감시: 상대 값이 바뀔 때마다 갱신
  _oppLastSeen = Date.now();
  oppHbRef.on('value', snap => {
    if (snap.val()) _oppLastSeen = snap.val();
  });

  // 10초마다 상대가 살아있는지 체크
  clearInterval(_oppHeartbeatInt);
  _oppHeartbeatInt = setInterval(() => {
    if (!_gameActive || !_firstMoveDone) return; // 첫 수 전엔 체크 안 함
    const elapsed = Date.now() - _oppLastSeen;
    if (elapsed > 10000) {
      // 상대가 10초 이상 응답 없음 → 상대 패배(내 승리)
      const status = oppColor === 'w' ? 'resign_w' : 'resign_b';
      if (_gameRef) _gameRef.update({ status });
    }
  }, 3000);
}

function stopHeartbeat(gameId, myColor) {
  clearInterval(_heartbeatInt);
  clearInterval(_oppHeartbeatInt);
  _heartbeatInt = null;
  _oppHeartbeatInt = null;
  if (gameId && myColor) {
    _rtDb.ref(`games/${gameId}/heartbeat/${myColor}`).remove();
  }
}

function endGame(status) {
  if (!_gameActive) return;
  _gameActive = false;
  clearInterval(_timerInt);
  clearTimeout(_firstMoveTimer);
  cancelDisconnectLoss();
  stopHeartbeat(_gameId, _myColor); // heartbeat 정리
  if (_gameRef) _gameRef.off();
  playSound('over');

  // Firestore 기보 저장
  saveRecord(status);

  // 결과 판정
  let emoji='🏁', title='대국 종료', reason='';
  if (status==='checkmate') {
    const winner = enemyColor(_turn);
    if (winner===_myColor) { emoji='🏆'; title='승리!'; reason='체크메이트'; }
    else { emoji='😔'; title='패배'; reason='체크메이트'; }
  } else if (status==='resign_w') {
    if (_myColor==='b') { emoji='🏆'; title='승리!'; reason='상대방 기권'; }
    else { emoji='😔'; title='패배'; reason='기권'; }
  } else if (status==='resign_b') {
    if (_myColor==='w') { emoji='🏆'; title='승리!'; reason='상대방 기권'; }
    else { emoji='😔'; title='패배'; reason='기권'; }
  } else if (status==='timeout_w') {
    // 백이 시간 초과
    if (_myColor==='b') { emoji='🏆'; title='승리!'; reason='상대방 시간 초과'; }
    else { emoji='😔'; title='패배'; reason='시간 초과'; }
  } else if (status==='timeout_b') {
    // 흑이 시간 초과
    if (_myColor==='w') { emoji='🏆'; title='승리!'; reason='상대방 시간 초과'; }
    else { emoji='😔'; title='패배'; reason='시간 초과'; }
  } else if (status==='win_time') {
    // 구버전 호환
    emoji='🏆'; title='승리!'; reason='상대방 시간 초과';
  } else if (status==='lose_time') {
    // 구버전 호환
    emoji='😔'; title='패배'; reason='시간 초과';
  } else if (status==='stalemate') {
    emoji='🤝'; title='무승부'; reason='스테일메이트';
  } else if (status==='draw' || status==='draw_no_move') {
    emoji='🤝'; title='무승부'; reason= status==='draw_no_move' ? '첫 수 미입력' : '합의 무승부';
  }

  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-reason').textContent = reason;

  showScreen('result');
}

async function saveRecord(result) {
  if (_gameId) { try { await _rtDb.ref('games/' + _gameId).remove(); } catch(e){} }
  try {
    const qSnap = await _rtDb.ref('matchmaking_queue').orderByChild('uid').equalTo(_user.uid).once('value');
    qSnap.forEach(child => { child.ref.remove(); });
  } catch(e){}
  if (!_fbDb || !_user) return;
  try {
    let pgn = '';
    _sanMoves.forEach((san, i) => {
      if (i % 2 === 0) pgn += (Math.floor(i/2)+1) + '. ';
      pgn += san + ' ';
    });
    pgn = pgn.trim();

    // ── resultStr: 항상 백/흑 관점으로 올바르게 계산 ──
    let resultStr = '*';
    if (result === 'checkmate') {
      // _turn은 체크메이트 당한 쪽(진 쪽)의 색
      resultStr = _turn === 'w' ? '0-1' : '1-0';
    } else if (result === 'resign_w') {
      // 백이 기권 → 흑 승
      resultStr = '0-1';
    } else if (result === 'resign_b') {
      // 흑이 기권 → 백 승
      resultStr = '1-0';
    } else if (result === 'timeout_w') {
      // 백이 시간 초과 → 흑 승
      resultStr = '0-1';
    } else if (result === 'timeout_b') {
      // 흑이 시간 초과 → 백 승
      resultStr = '1-0';
    } else if (result === 'win_time') {
      // 구버전 호환: 내가 시간승
      resultStr = _myColor === 'w' ? '1-0' : '0-1';
    } else if (result === 'lose_time') {
      // 구버전 호환: 내가 시간패
      resultStr = _myColor === 'w' ? '0-1' : '1-0';
    } else if (result === 'stalemate' || result === 'draw' || result === 'draw_no_move') {
      resultStr = '1/2-1/2';
    }

    const myName   = _user.displayName || _user.email.split('@')[0];
    const oppName  = document.getElementById('opp-name-el')?.textContent || '상대방';
    const whiteName = _myColor === 'w' ? myName : oppName;
    const blackName = _myColor === 'b' ? myName : oppName;
    const today = new Date().toISOString().slice(0,10);
    const fullPgn = `[White "${whiteName}"]\n[Black "${blackName}"]\n[Result "${resultStr}"]\n[Date "${today}"]\n\n${pgn} ${resultStr}`;

    // ── 중복 저장 방지: gameId + uid 조합으로 이미 저장된 기록 확인 ──
    if (_gameId) {
      try {
        const existing = await _fbDb.collection('game_records')
          .where('gameId', '==', _gameId)
          .where('uid', '==', _user.uid)
          .limit(1).get();
        if (!existing.empty) {
          console.log('[saveRecord] 이미 저장된 기록, 중복 저장 방지');
          return;
        }
      } catch(e) { /* 인덱스 없을 경우 무시하고 저장 진행 */ }
    }

    await _fbDb.collection('game_records').add({
      uid: _user.uid, playerName: myName, gameId: _gameId || '',
      myColor: _myColor, whiteName, blackName,
      result: resultStr, resultRaw: result,
      moveCount: _sanMoves.length, pgn: fullPgn,
      arrows: _gameArrows,
      playedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    console.log('[saveRecord] 기보 저장 완료:', _myColor, resultStr);
  } catch(e) { console.warn('기보 저장 실패', e); }
}

// ══════════════════════════════════════════
// 화면 전환
// ══════════════════════════════════════════
function showScreen(name) {
  ['lobby','searching','playing','result'].forEach(s => {
    const el = document.getElementById('screen-'+s);
    if (el) el.style.display = s===name ? 'flex' : 'none';
  });
  // 모바일: 대국 중일 때 사이드바 숨김
  if (name === 'playing') {
    document.body.classList.add('playing');
  } else {
    document.body.classList.remove('playing');
  }
}

// ── 토스트 ──
function showToast(msg, duration=2500) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ══════════════════════════════════════════
// 우클릭 화살표 그리기
// ══════════════════════════════════════════
// 게임 중 후보수 화살표: 수 인덱스 → 화살표 배열
// { fc, fr, tc, tr }
let _gameArrows = {}; // moveIndex → [{fc,fr,tc,tr}, ...]

(function(){
  const ARROW_COLOR='rgba(255,165,0,0.92)';
  const ARROW_SW=14;
  const SVG_NS='http://www.w3.org/2000/svg';
  let _arrowStart=null,_userArrows=[],_rightDragging=false;

  function sqCenter(col,row){
    const flipped=_myColor==='b';
    const dc=flipped?7-col:col,dr=flipped?7-row:row;
    return{px:dc*100+50,py:dr*100+50};
  }

  function getBoardSq(e){
    const board=document.getElementById('play-board');if(!board)return null;
    const rect=board.getBoundingClientRect();
    const x=Math.max(0,Math.min(rect.width-1,e.clientX-rect.left));
    const y=Math.max(0,Math.min(rect.height-1,e.clientY-rect.top));
    const dc=Math.floor(x/rect.width*8),dr=Math.floor(y/rect.height*8);
    const flipped=_myColor==='b';
    return{col:flipped?7-dc:dc,row:flipped?7-dr:dr};
  }

  function makeArrow(fc,fr,tc,tr){
    const from=sqCenter(fc,fr),to=sqCenter(tc,tr);
    const dx=to.px-from.px,dy=to.py-from.py;
    const len=Math.sqrt(dx*dx+dy*dy);if(len<1)return null;
    const ux=dx/len,uy=dy/len,sw=ARROW_SW;
    const sx=from.px+ux*sw*1.1,sy=from.py+uy*sw*1.1;
    const ex=to.px-ux*sw*2.4,ey=to.py-uy*sw*2.4;
    if(Math.sqrt((ex-sx)**2+(ey-sy)**2)<5)return null;
    const line=document.createElementNS(SVG_NS,'line');
    line.setAttribute('x1',sx.toFixed(2));line.setAttribute('y1',sy.toFixed(2));
    line.setAttribute('x2',ex.toFixed(2));line.setAttribute('y2',ey.toFixed(2));
    line.setAttribute('stroke',ARROW_COLOR);line.setAttribute('stroke-width',sw);
    line.setAttribute('stroke-linecap','round');
    line.setAttribute('marker-end','url(#play-arrow-head)');
    return line;
  }

  function redraw(){
    const g=document.getElementById('play-arrow-layer');if(!g)return;
    g.innerHTML='';
    _userArrows.forEach(a=>{const el=makeArrow(a.fc,a.fr,a.tc,a.tr);if(el)g.appendChild(el);});
  }

  function attach(){
    const board=document.getElementById('play-board');
    if(!board){setTimeout(attach,300);return;}
    board.addEventListener('contextmenu',e=>e.preventDefault());
    board.addEventListener('mousedown',e=>{
      if(e.button===2){_rightDragging=true;_arrowStart=getBoardSq(e);}
      else if(e.button===0){
        // 좌클릭: 현재 수의 화살표 초기화
        const curIdx=_sanMoves.length;
        _userArrows=[];_gameArrows[curIdx]=[];
        redraw();_arrowStart=null;_rightDragging=false;
      }
    });
    document.addEventListener('mouseup',e=>{
      if(e.button!==2)return;
      if(!_rightDragging||!_arrowStart){_rightDragging=false;_arrowStart=null;return;}
      _rightDragging=false;
      const sq=getBoardSq(e);
      const curIdx=_sanMoves.length;
      if(!_gameArrows[curIdx])_gameArrows[curIdx]=[];
      _userArrows=_gameArrows[curIdx];
      if(sq.col===_arrowStart.col&&sq.row===_arrowStart.row){
        _userArrows=[];_gameArrows[curIdx]=[];
      }else{
        const idx=_userArrows.findIndex(a=>a.fc===_arrowStart.col&&a.fr===_arrowStart.row&&a.tc===sq.col&&a.tr===sq.row);
        if(idx>=0)_userArrows.splice(idx,1);
        else _userArrows.push({fc:_arrowStart.col,fr:_arrowStart.row,tc:sq.col,tr:sq.row});
        _gameArrows[curIdx]=_userArrows.slice();
      }
      redraw();_arrowStart=null;
    });
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',attach);}else{attach();}
})();