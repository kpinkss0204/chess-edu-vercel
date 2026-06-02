(function(){
  // ══════════════════════════════════════════
  // 체스 엔진 (chess.js 통합형)
  // ══════════════════════════════════════════
  const PIECE_IMG_BASE = 'https://lichess1.org/assets/piece/cburnett/';
  function pieceImg(p) { 
    if (!p) return '';
    const color = p[0]; 
    const type = p[1].toUpperCase();
    return PIECE_IMG_BASE + color + type + '.svg'; 
  }

  let _game = new Chess();
  let _myColor = 'w';
  let _gameId = null;
  let _gameRef = null;
  let _wTime = 600;
  let _bTime = 600;
  let _timerInt = null;
  let _gameActive = false;
  let _firstMoveDone = false;
  let _firstMoveTimer = null;
  let _disconnectRef = null;
  let _heartbeatInt = null;
  let _oppHeartbeatInt = null;
  let _oppLastSeen = null;
  let _selected = null;
  let _pendingPromo = null;
  let _oppUid = null;

  function enemyColor(c) { return c === 'w' ? 'b' : 'w'; }
  function rcToAlgebraic(r, c) { return 'abcdefgh'[c] + (8 - r); }
  function algebraicToRC(alg) {
    const c = alg.charCodeAt(0) - 97;
    const r = 8 - parseInt(alg[1]);
    return [r, c];
  }

  // ══════════════════════════════════════════
  // 보드 렌더링
  // ══════════════════════════════════════════
  function renderBoard() {
    const el = document.getElementById('play-board');
    if (!el) return;
    
    const board = _game.board();
    const turn = _game.turn();
    const history = _game.history({ verbose: true });
    const lastMove = history.length > 0 ? history[history.length - 1] : null;
    const selectedSquare = _selected ? rcToAlgebraic(_selected[0], _selected[1]) : null;
    const legalMoves = _selected ? _game.moves({ square: selectedSquare, verbose: true }) : [];

    if (el.children.length !== 64) {
      el.innerHTML = '';
      const flipped = _myColor === 'b';
      for (let ri = 0; ri < 8; ri++) {
        for (let ci = 0; ci < 8; ci++) {
          const r = flipped ? 7 - ri : ri;
          const c = flipped ? 7 - ci : ci;
          const isLight = (r + c) % 2 === 0;
          const sq = document.createElement('div');
          sq.dataset.r = r; sq.dataset.c = c;
          sq.className = 'sq ' + (isLight ? 'light' : 'dark');
          
          if (ci === 0) { const lbl = document.createElement('span'); lbl.className='rank-label'; lbl.textContent=8-r; sq.appendChild(lbl); }
          if (ri === 7) { const lbl = document.createElement('span'); lbl.className='file-label'; lbl.textContent='abcdefgh'[c]; sq.appendChild(lbl); }
          
          const img = document.createElement('img');
          img.className = 'piece-img';
          img.draggable = false;
          img.style.display = 'none';
          sq.appendChild(img);
          
          sq.onclick = () => onSquareClick(Number(sq.dataset.r), Number(sq.dataset.c));
          el.appendChild(sq);
        }
      }
    }

    const flipped = _myColor === 'b';
    for (let ri = 0; ri < 8; ri++) {
      for (let ci = 0; ci < 8; ci++) {
        const r = flipped ? 7 - ri : ri;
        const c = flipped ? 7 - ci : ci;
        const idx = ri * 8 + ci;
        const pieceObj = board[r][c];
        const sq = el.children[idx];
        const alg = rcToAlgebraic(r, c);

        const classes = ['sq', (r+c)%2===0 ? 'light' : 'dark'];
        if (lastMove) {
          if (lastMove.from === alg) classes.push('last-from');
          if (lastMove.to === alg)   classes.push('last-to');
        }
        if (selectedSquare === alg) classes.push('selected');
        if (legalMoves.some(m => m.to === alg)) {
          classes.push('possible');
          if (pieceObj) classes.push('has-piece');
        }
        if (pieceObj && pieceObj.type === 'k' && pieceObj.color === turn && _game.in_check()) {
          classes.push('in-check');
        }
        sq.className = classes.join(' ');

        const img = sq.querySelector('.piece-img');
        if (img) {
          if (pieceObj) {
            const src = pieceImg(pieceObj.color + pieceObj.type);
            if (img.getAttribute('src') !== src) img.src = src;
            img.style.display = 'block';
          } else {
            img.style.display = 'none';
            img.removeAttribute('src');
          }
        }
      }
    }
  }

  // ══════════════════════════════════════════
  // 클릭 처리
  // ══════════════════════════════════════════
  function onSquareClick(r, c) {
    if (!_gameActive || _game.turn() !== _myColor) return;

    const alg = rcToAlgebraic(r, c);
    const piece = _game.get(alg);

    if (_selected) {
      const fromAlg = rcToAlgebraic(_selected[0], _selected[1]);
      const moves = _game.moves({ square: fromAlg, verbose: true });
      const move = moves.find(m => m.to === alg);

      if (move) {
        if (move.flags.includes('p')) {
          _pendingPromo = move;
          showPromoModal(r, c);
          return;
        }
        doMove({ from: fromAlg, to: alg });
        return;
      }

      if (piece && piece.color === _myColor) {
        _selected = [r, c];
      } else {
        _selected = null;
      }
    } else {
      if (piece && piece.color === _myColor) {
        _selected = [r, c];
      }
    }
    renderBoard();
  }

  function showPromoModal(r, c) {
    const modal = document.getElementById('promo-modal');
    if (!modal) return;
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
        if (_pendingPromo) {
          doMove({ from: _pendingPromo.from, to: _pendingPromo.to, promotion: p[1].toLowerCase() });
          _pendingPromo = null;
        }
      };
      modal.appendChild(div);
    });

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
  function doMove(moveObj, isRemote) {
    const resultMove = _game.move(moveObj);
    if (!resultMove) return;

    if (!_firstMoveDone) {
      _firstMoveDone = true;
      if (_firstMoveTimer) clearTimeout(_firstMoveTimer);
      setupDisconnectLoss();
    }

    _selected = null;
    const isCapture = resultMove.flags.includes('c') || resultMove.flags.includes('e');
    const isCastle = resultMove.flags.includes('k') || resultMove.flags.includes('q');
    playMoveSoundEffect(isCapture, isCastle);

    if (!isRemote) sendMove(resultMove);
    updateTimerOnMove();

    renderBoard();
    checkGameEnd();
  }

  function playMoveSoundEffect(isCapture, isCastle) {
    if (_game.in_checkmate()) playSound('checkmate');
    else if (_game.in_draw()) playSound('stalemate');
    else if (_game.in_check()) playSound('check');
    else if (isCastle) playSound('castle');
    else if (isCapture) playSound('capture');
    else playSound('move');
  }

  function checkGameEnd() {
    if (_game.game_over()) {
      let status = 'draw';
      if (_game.in_checkmate()) status = 'checkmate';
      else if (_game.in_stalemate()) status = 'stalemate';
      else if (_game.in_draw()) status = 'draw';
      if (_gameRef) _gameRef.update({ status });
    }
  }

  // ══════════════════════════════════════════
  // 사운드 및 타이머
  // ══════════════════════════════════════════
  const _sounds = {};
  const _soundFiles = {
    move:'sound/chess_move.mp3', capture:'sound/chess_capture.mp3',
    castle:'sound/chess_castle.mp3', check:'sound/chess_check.mp3',
    checkmate:'sound/chess_checkmate.mp3', stalemate:'sound/chess_stalemate.mp3',
    start:'sound/chess_start.mp3', over:'sound/chess_over.mp3',
  };
  for (const [k,v] of Object.entries(_soundFiles)) {
    const a = new Audio(v); a.preload='auto'; _sounds[k]=a;
  }
  function playSound(type) {
    const a = _sounds[type]; if (!a) return;
    a.cloneNode().play().catch(()=>{});
  }

  function fmtTime(s) {
    s = Math.max(0, s);
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  }
  let _lastTickTime = null;

  function startTimer() {
    if (_timerInt) clearInterval(_timerInt);
    _lastTickTime = Date.now();
    _timerInt = setInterval(() => {
      if (!_gameActive) return;
      const now = Date.now();
      const delta = (now - _lastTickTime) / 1000;
      _lastTickTime = now;
      if (_game.turn() === 'w') _wTime = Math.max(0, _wTime - delta);
      else                      _bTime = Math.max(0, _bTime - delta);
      updateTimerDisplay();
      if (_wTime <= 0 || _bTime <= 0) {
        const status = _wTime <= 0 ? 'timeout_w' : 'timeout_b';
        if (_gameRef) _gameRef.update({ status });
      }
    }, 100);
  }

  function updateTimerDisplay() {
    const myTime  = _myColor === 'w' ? _wTime : _bTime;
    const oppTime = _myColor === 'w' ? _bTime : _wTime;
    const myEl  = document.getElementById('my-timer');
    const oppEl = document.getElementById('opp-timer');
    const turn = _game.turn();
    if (myEl) {
      myEl.textContent = fmtTime(myTime);
      myEl.className = 'p-timer' + (turn===_myColor?' active':'') + (myTime<30?' low':'');
    }
    if (oppEl) {
      oppEl.textContent = fmtTime(oppTime);
      oppEl.className = 'p-timer' + (turn!==_myColor?' active':'') + (oppTime<30?' low':'');
    }
  }

  function updateTimerOnMove() {
    if (_gameRef) _gameRef.update({ whiteTime: _wTime, blackTime: _bTime, lastMoveAt: Date.now() });
  }

  // ══════════════════════════════════════════
  // Firebase 매칭
  // ══════════════════════════════════════════
  const GAME_TIME = 600;
  let _queueRef = null, _searchInt = null, _matchmakingInProgress = false, _queueListener = null;

  async function startMatchmaking() {
    if (_matchmakingInProgress || !window._user || _gameActive) return;
    _matchmakingInProgress = true;
    try {
      showScreen('searching');
      let elapsed = 0; if (_searchInt) clearInterval(_searchInt);
      _searchInt = setInterval(() => { elapsed++; const el = document.getElementById('search-elapsed'); if (el) el.textContent = elapsed + '초 경과'; }, 1000);
      const myName = window._user.displayName || window._user.email.split('@')[0];
      const queue = window._rtDb.ref('matchmaking_queue');
      const oldSnap = await queue.once('value');
      const cleanupUpdates = {};
      oldSnap.forEach(child => { if (child.val().uid === window._user.uid) cleanupUpdates[child.key] = null; });
      await queue.update(cleanupUpdates);
      const myRef = queue.push(); _queueRef = myRef;
      await myRef.set({ uid: window._user.uid, displayName: myName, joinedAt: Date.now() });
      myRef.onDisconnect().remove(); 
      _queueListener = queue.on('child_added', async (snap) => {
        const entryKey = snap.key; const d = snap.val();
        if (!d || entryKey === myRef.key || d.uid === window._user.uid || d.gameId) return;
        if (window._user.uid < d.uid) {
          const result = await window._rtDb.ref(`matchmaking_queue/${entryKey}`).transaction((curr) => {
            if (curr && !curr.gameId) return { ...curr, gameId: 'PENDING', matchedWith: window._user.uid };
            return; 
          });
          if (result.committed) {
            const gameId = queue.push().key;
            const myColor = Math.random() < 0.5 ? 'w' : 'b';
            const gameData = {
              white: myColor==='w'?window._user.uid:d.uid, black: myColor==='b'?window._user.uid:d.uid,
              whiteName: myColor==='w'?myName:d.displayName, blackName: myColor==='b'?myName:d.displayName,
              whiteUid: myColor==='w'?window._user.uid:d.uid, blackUid: myColor==='b'?window._user.uid:d.uid,
              status: 'playing', whiteTime: GAME_TIME, blackTime: GAME_TIME,
              lastMoveAt: Date.now(), createdAt: Date.now(),
            };
            await window._rtDb.ref('games/' + gameId).set(gameData);
            await window._rtDb.ref(`matchmaking_queue/${entryKey}`).update({ gameId: gameId, color: myColor==='w'?'b':'w' });
            stopMatchmakingListeners(); myRef.remove(); _queueRef = null;
            joinGame(gameId, myColor, gameData);
          }
        }
      });
      myRef.on('value', async snap => {
        const d = snap.val(); if (!d || !d.gameId || d.gameId === 'PENDING') return;
        stopMatchmakingListeners(); const waitRef = _queueRef; _queueRef = null;
        const gs = await window._rtDb.ref('games/' + d.gameId).once('value');
        if (gs.val()) { waitRef.remove(); joinGame(d.gameId, d.color, gs.val()); }
      });
    } catch (e) { console.error(e); showScreen('lobby'); } finally { _matchmakingInProgress = false; }
  }

  function stopMatchmakingListeners() {
    if (_queueListener) { window._rtDb.ref('matchmaking_queue').off('child_added', _queueListener); _queueListener = null; }
    if (_queueRef) { _queueRef.off(); _queueRef.onDisconnect().cancel(); }
  }

  function cancelMatchmaking() {
    if (_searchInt) clearInterval(_searchInt); stopMatchmakingListeners();
    if (_queueRef) { _queueRef.remove(); _queueRef = null; }
    showScreen('lobby'); _matchmakingInProgress = false;
  }

  function joinGame(gameId, myColor, gameData) {
    _myColor = myColor; _gameId = gameId; _game = new Chess();
    _wTime = GAME_TIME; _bTime = GAME_TIME; _gameActive = true;
    _lastTickTime = Date.now();
    _oppUid = myColor === 'w' ? (gameData.blackUid || null) : (gameData.whiteUid || null);
    const myName  = myColor==='w' ? gameData.whiteName : gameData.blackName;
    const oppName = myColor==='w' ? gameData.blackName  : gameData.whiteName;
    const myNameEl = document.getElementById('my-name-el');
    const oppNameEl = document.getElementById('opp-name-el');
    if (myNameEl) myNameEl.textContent = myName;
    if (oppNameEl) oppNameEl.textContent = oppName;
    const myColorEl = document.getElementById('my-color-el');
    const oppColorEl = document.getElementById('opp-color-el');
    if (myColorEl) myColorEl.textContent = myColor==='w' ? '⬜ 백' : '⬛ 흑';
    if (oppColorEl) oppColorEl.textContent = myColor==='w' ? '⬛ 흑' : '⬜ 백';
    const myAvatarEl = document.getElementById('my-avatar-el');
    const oppAvatarEl = document.getElementById('opp-avatar-el');
    if (myAvatarEl) myAvatarEl.textContent = myName[0].toUpperCase();
    if (oppAvatarEl) oppAvatarEl.textContent = oppName[0].toUpperCase();
    showScreen('playing'); renderBoard(); startTimer(); playSound('start');
    _firstMoveDone = false;
    if (_firstMoveTimer) clearTimeout(_firstMoveTimer);
    _firstMoveTimer = setTimeout(() => { if (_gameActive && !_firstMoveDone) _gameRef.update({ status: 'draw_no_move' }); }, 10000);
    _gameRef = window._rtDb.ref('games/'+gameId);
    startHeartbeat(gameId, myColor);
    _gameRef.child('moves').on('child_added', snap => {
      const d = snap.val(); if (!d || d.uid === window._user.uid) return;
      doMove({ from: d.from, to: d.to, promotion: d.promo }, true);
    });
    _gameRef.child('status').on('value', snap => {
      const s = snap.val(); if (s && s !== 'playing') endGame(s);
    });
    _gameRef.child('drawOffer').on('value', snap => {
      const offer = snap.val();
      const bar = document.getElementById('draw-offer-bar');
      if (bar) {
        if (offer && offer !== _myColor) bar.classList.add('show');
        else bar.classList.remove('show');
      }
    });
    _gameRef.child('whiteTime').on('value', snap => { if (snap.val() !== null && _game.turn() !== 'w') _wTime = snap.val(); });
    _gameRef.child('blackTime').on('value', snap => { if (snap.val() !== null && _game.turn() !== 'b') _bTime = snap.val(); });
  }

  function sendMove(move) {
    if (!_gameRef || !window._user) return;
    _gameRef.child('moves').push({ uid: window._user.uid, from: move.from, to: move.to, promo: move.promotion || null, at: Date.now() });
  }

  function offerDraw() { if (!_gameRef || !_gameActive) return; _gameRef.update({ drawOffer: _myColor, drawOfferAt: Date.now() }); }
  function acceptDraw() { if (_gameRef) _gameRef.update({ status: 'draw', drawOffer: null }); }
  function declineDraw() { if (_gameRef) _gameRef.update({ drawOffer: null }); }
  function resignGame() { if (!_gameRef || !_gameActive) return; const status = _myColor === 'w' ? 'resign_w' : 'resign_b'; _gameRef.update({ status }); }

  function setupDisconnectLoss() { if (_gameRef) _gameRef.onDisconnect().update({ status: _myColor === 'w' ? 'resign_w' : 'resign_b' }); }
  function cancelDisconnectLoss() { if (_gameRef) _gameRef.onDisconnect().cancel(); }

  function startHeartbeat(gameId, myColor) {
    const oppColor = enemyColor(myColor);
    const myHbRef = window._rtDb.ref(`games/${gameId}/heartbeat/${myColor}`);
    const oppHbRef = window._rtDb.ref(`games/${gameId}/heartbeat/${oppColor}`);
    if (_heartbeatInt) clearInterval(_heartbeatInt); 
    _heartbeatInt = setInterval(() => { if (_gameActive) myHbRef.set(Date.now()); }, 3000);
    _oppLastSeen = Date.now(); oppHbRef.on('value', snap => { if (snap.val()) _oppLastSeen = snap.val(); });
    if (_oppHeartbeatInt) clearInterval(_oppHeartbeatInt);
    _oppHeartbeatInt = setInterval(() => {
      if (!_gameActive || !_firstMoveDone) return;
      if (Date.now() - _oppLastSeen > 10000) _gameRef.update({ status: oppColor === 'w' ? 'resign_w' : 'resign_b' });
    }, 3000);
  }

  function stopHeartbeat(gameId, myColor) { if (_heartbeatInt) clearInterval(_heartbeatInt); if (_oppHeartbeatInt) clearInterval(_oppHeartbeatInt); if (gameId && myColor) window._rtDb.ref(`games/${gameId}/heartbeat/${myColor}`).remove(); }

  function endGame(status) {
    if (!_gameActive) return; _gameActive = false;
    if (_timerInt) clearInterval(_timerInt); if (_firstMoveTimer) clearTimeout(_firstMoveTimer);
    cancelDisconnectLoss(); stopHeartbeat(_gameId, _myColor);
    if (_gameRef) _gameRef.off();
    playSound('over'); saveRecord(status);
    let emoji='🏁', title='대국 종료', reason='';
    if (status==='checkmate') {
      const winner = enemyColor(_game.turn());
      if (winner===_myColor) { emoji='🏆'; title='승리!'; reason='체크메이트'; }
      else { emoji='😔'; title='패배'; reason='체크메이트'; }
    } else if (status.startsWith('resign')) {
      const loser = status.split('_')[1];
      if (loser !== _myColor) { emoji='🏆'; title='승리!'; reason='상대방 기권'; }
      else { emoji='😔'; title='패배'; reason='기권'; }
    } else if (status.startsWith('timeout')) {
      const loser = status.split('_')[1];
      if (loser !== _myColor) { emoji='🏆'; title='승리!'; reason='상대방 시간 초과'; }
      else { emoji='😔'; title='패배'; reason='시간 초과'; }
    } else { emoji='🤝'; title='무승부'; reason='게임 종료'; }
    const emojiEl = document.getElementById('result-emoji');
    const titleEl = document.getElementById('result-title');
    const reasonEl = document.getElementById('result-reason');
    if (emojiEl) emojiEl.textContent = emoji;
    if (titleEl) titleEl.textContent = title;
    if (reasonEl) reasonEl.textContent = reason;
    showScreen('result');
  }

  async function saveRecord(result) {
    if (_gameId) { try { await window._rtDb.ref('games/' + _gameId).remove(); } catch(e){} }
    try {
      const qSnap = await window._rtDb.ref('matchmaking_queue').orderByChild('uid').equalTo(window._user.uid).once('value');
      qSnap.forEach(child => { child.ref.remove(); });
    } catch(e){}
    if (!window._fbDb || !window._user) return;
    try {
      const pgn = _game.pgn();
      
      // 결과 판정 로직 개선 (기권, 시간초과 대응)
      let resultStr = '*';
      if (result === 'checkmate') {
        resultStr = enemyColor(_game.turn()) === 'w' ? '1-0' : '0-1';
      } else if (result === 'resign_w' || result === 'timeout_w') {
        resultStr = '0-1';
      } else if (result === 'resign_b' || result === 'timeout_b') {
        resultStr = '1-0';
      } else if (_game.game_over()) {
        if (_game.in_checkmate()) {
          resultStr = enemyColor(_game.turn()) === 'w' ? '1-0' : '0-1';
        } else {
          resultStr = '1/2-1/2';
        }
      } else if (result === 'draw') {
        resultStr = '1/2-1/2';
      }

      const myName = window._user.displayName || window._user.email.split('@')[0];
      const oppName = document.getElementById('opp-name-el')?.textContent || '상대방';
      const whiteName = _myColor === 'w' ? myName : oppName;
      const blackName = _myColor === 'b' ? myName : oppName;
      const today = new Date().toISOString().slice(0,10).replace(/-/g, '.');
      const timestamp = window.firebase.firestore.FieldValue.serverTimestamp();
      const commonData = { gameId: _gameId || '', title: `${whiteName} vs ${blackName}`, white: whiteName, black: blackName, whiteName, blackName, date: today, result: resultStr, opening: '-', whiteRating: null, blackRating: null, timeControl: null, moveCount: _game.history().length, pgn, savedAt: timestamp };
      async function saveForUser(uid, color, pName) {
        if (!uid) return;
        const pgnSnap = await window._fbDb.collection('saved_pgns').where('gameId','==',_gameId).where('uid','==',uid).limit(1).get();
        if (pgnSnap.empty) await window._fbDb.collection('saved_pgns').add({ ...commonData, uid });
        const recSnap = await window._fbDb.collection('game_records').where('gameId','==',_gameId).where('uid','==',uid).limit(1).get();
        if (recSnap.empty) await window._fbDb.collection('game_records').add({ ...commonData, uid, playerName: pName, myColor: color, playedAt: timestamp, source: 'play', resultRaw: result });
      }
      await saveForUser(window._user.uid, _myColor, myName);
      if (_oppUid) await saveForUser(_oppUid, enemyColor(_myColor), oppName);
    } catch(e) { console.warn('기보 저장 실패', e); }
  }

  function showScreen(name) {
    ['lobby','searching','playing','result'].forEach(s => {
      const el = document.getElementById('screen-'+s);
      if (el) el.style.display = s===name ? 'flex' : 'none';
    });
    if (name === 'playing') document.body.classList.add('playing');
    else document.body.classList.remove('playing');
  }

  // ══════════════════════════════════════════
  // 전역 노출 및 초기화
  // ══════════════════════════════════════════
  window.startMatchmaking = startMatchmaking;
  window.cancelMatchmaking = cancelMatchmaking;
  window.offerDraw = offerDraw;
  window.acceptDraw = acceptDraw;
  window.declineDraw = declineDraw;
  window.resignGame = resignGame;
  window.showScreen = showScreen;
  window.onSquareClick = onSquareClick;

  // 화살표 로직 (IIFE)
  (function(){
    const ARROW_COLOR='rgba(255,165,0,0.92)';
    const ARROW_SW=14;
    const SVG_NS='http://www.w3.org/2000/svg';
    let _arrowStart=null, _userArrows=[], _rightDragging=false;
    function sqCenter(col,row){ const flipped=_myColor==='b'; const dc=flipped?7-col:col,dr=flipped?7-row:row; return{px:dc*100+50,py:dr*100+50}; }
    function getBoardSq(e){
      const board=document.getElementById('play-board'); if(!board)return null;
      const rect=board.getBoundingClientRect();
      const x=Math.max(0,Math.min(rect.width-1,e.clientX-rect.left));
      const y=Math.max(0,Math.min(rect.height-1,e.clientY-rect.top));
      const dc=Math.floor(x/rect.width*8),dr=Math.floor(y/rect.height*8);
      const flipped=_myColor==='b';
      return{col:flipped?7-dc:dc,row:flipped?7-dr:dr};
    }
    function makeArrow(fc,fr,tc,tr){
      const from=sqCenter(fc,fr),to=sqCenter(tc,tr);
      const dx=to.px-from.px,dy=to.py-from.py,len=Math.sqrt(dx*dx+dy*dy); if(len<1)return null;
      const ux=dx/len,uy=dy/len,sw=ARROW_SW,sx=from.px+ux*sw*1.1,sy=from.py+uy*sw*1.1,ex=to.px-ux*sw*2.4,ey=to.py-uy*sw*2.4;
      const line=document.createElementNS(SVG_NS,'line');
      line.setAttribute('x1',sx);line.setAttribute('y1',sy);line.setAttribute('x2',ex);line.setAttribute('y2',ey);
      line.setAttribute('stroke',ARROW_COLOR);line.setAttribute('stroke-width',sw);line.setAttribute('stroke-linecap','round');line.setAttribute('marker-end','url(#play-arrow-head)');
      return line;
    }
    function redraw(){ const g=document.getElementById('play-arrow-layer'); if(!g)return; g.innerHTML=''; _userArrows.forEach(a=>{const el=makeArrow(a.fc,a.fr,a.tc,a.tr);if(el)g.appendChild(el);}); }
    function attach(){
      const board=document.getElementById('play-board'); if(!board){setTimeout(attach,300);return;}
      board.addEventListener('contextmenu',e=>e.preventDefault());
      board.addEventListener('mousedown',e=>{ if(e.button===2){_rightDragging=true;_arrowStart=getBoardSq(e);} else if(e.button===0){_userArrows=[];redraw();_arrowStart=null;_rightDragging=false;} });
      document.addEventListener('mouseup',e=>{
        if(e.button!==2||!_rightDragging||!_arrowStart)return; _rightDragging=false;
        const sq=getBoardSq(e); if(sq.col===_arrowStart.col&&sq.row===_arrowStart.row){_userArrows=[];}else{
          const idx=_userArrows.findIndex(a=>a.fc===_arrowStart.col&&a.fr===_arrowStart.row&&a.tc===sq.col&&a.tr===sq.row);
          if(idx>=0)_userArrows.splice(idx,1); else _userArrows.push({fc:_arrowStart.col,fr:_arrowStart.row,tc:sq.col,tr:sq.row});
        }
        redraw();_arrowStart=null;
      });
    }
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',attach);}else{attach();}
  })();

})();
