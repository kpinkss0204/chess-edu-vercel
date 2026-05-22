function loadPositionFromInput() {
  const input = document.getElementById('fen-input').value.trim();
  if (!input) return;
  // 간단하게 FEN 로드 시도
  if (typeof game !== 'undefined' && game && typeof game.loadFromFen === 'function') {
    const success = game.loadFromFen(input);
    if (!success) {
      alert('유효하지 않은 FEN입니다.');
    }
  }
}

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
    const board = document.getElementById('chessboard');
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    return {
      col: Math.max(0, Math.min(7, Math.floor(x / rect.width  * 8))),
      row: Math.max(0, Math.min(7, Math.floor(y / rect.height * 8)))
    };
  }

  function attachEvents() {
    const board = document.getElementById('chessboard');
    if (!board) { setTimeout(attachEvents, 300); return; }
    ensureSvg();

    board.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      const sq = getBoardSquare(e);
      if (sq) _arrowStart = sq;
    });

    board.addEventListener('mouseup', function(e) {
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

    board.addEventListener('mousedown', function(e) {
      if (e.button === 0) {
        _userArrows = [];
        redrawArrows();
        _arrowStart = null;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachEvents);
  } else {
    attachEvents();
  }
})();

// ══════════════════════════════════════════
// 전역 노출
// ══════════════════════════════════════════
window.palToggle = palToggle;
window.palBuild = palBuild;
window.palErase = palErase;
window.palTurn = palTurn;
window.palClear = palClear;
window.palReset = palReset;
window.toggleMobilePanel = toggleMobilePanel;
window.closeMobilePanel = closeMobilePanel;
window.switchTab = switchTab;
window.loadPositionFromInput = loadPositionFromInput;
window.saveCurrentGame = saveCurrentGame;
window.practiceNewGame = practiceNewGame;

/* --- script block --- */

// ══════════════════════════════════════════════════════
//  기물 팔레트 시스템 v2
// ══════════════════════════════════════════════════════
(function () {
  var IMG = 'https://lichess1.org/assets/piece/cburnett/';
  var TYPES = ['K','Q','R','B','N','P'];
  window._palOpen = false;
  var _sel = null;       // {color,type} | 'erase' | null
  var _dragSq = null;    // 보드 위 기물 드래그 출발칸
  var _ghost = null;

  /* ── 팔레트 버튼 빌드 ── */
  window.palBuild = function() {
    ['w','b'].forEach(function(c) {
      var box = document.getElementById('pal-' + c);
      if (!box) return;
      box.innerHTML = '';
      box.style.cssText = 'display:flex;flex-direction:column;gap:3px;align-items:center;';
      TYPES.forEach(function(t) {
        var el = document.createElement('div');
        el.className = 'pal-piece';
        el.dataset.c = c; el.dataset.t = t;
        el.draggable = true;
        el.innerHTML = '<img src="' + IMG + c + t + '.svg" draggable="false">';
        
        var selectThis = function() { sel(c, t); };
        el.addEventListener('click', selectThis);
        el.addEventListener('touchstart', function(e) {
          if (e.cancelable) e.preventDefault();
          selectThis();
        }, { passive: false });

        el.addEventListener('dragstart', function(e) {
          selectThis();
          e.dataTransfer.effectAllowed = 'copy';
          e.dataTransfer.setData('pal', JSON.stringify({color:c, type:t}));
        });
        box.appendChild(el);
      });
    });
    // 선택 상태 복원 (기본 퀸 선택)
    if (!_sel) sel('w', 'Q');
    else if (_sel !== 'erase') sel(_sel.color, _sel.type);
    else if (_sel === 'erase') window.palErase();
  };

  /* ── 선택 ── */
  function sel(c, t) {
    _sel = {color:c, type:t};
    var er = document.getElementById('pal-erase');
    if (er) er.classList.remove('pal-selected');
    document.querySelectorAll('.pal-piece').forEach(function(el) {
      el.classList.toggle('pal-selected', el.dataset.c === c && el.dataset.t === t);
    });
    if (window.__palDbg) window.__palDbg.log('기물 선택됨: ' + (c==='w'?'백':'흑') + ' ' + t);
  }

  window.palErase = function() {
    _sel = 'erase';
    var er = document.getElementById('pal-erase');
    if (er) er.classList.add('pal-selected');
    document.querySelectorAll('.pal-piece').forEach(function(el) { el.classList.remove('pal-selected'); });
    if (window.__palDbg) window.__palDbg.log('삭제 모드 활성화');
  };

  /* ── 팔레트 열기/닫기 ── */
  window.palToggle = function(force) {
    if (force !== undefined) window._palOpen = !force;
    else window._palOpen = !window._palOpen;

    var panelEl = document.getElementById('right-panel');
    var board = document.getElementById('chessboard');
    var btn   = document.getElementById('edit-mode-btn');
    var backdrop = document.getElementById('mobile-panel-backdrop');
    
    if (window._palOpen) {
      window.palBuild();
      switchTab('palette');
      
      if (window.innerWidth <= 768) {
        toggleMobilePanel(true);
      }

      if (board) board.classList.add('pal-edit');
      if (btn) { btn.style.background='rgba(80,144,208,0.25)'; btn.style.borderColor='#5090d0'; }
      
      var t = (typeof game !== 'undefined' && game) ? game.turn : 'w';
      palTurn(t || 'w');
      
      window._editorSavedPracticeMode = window._enginePracticeMode;
      window._enginePracticeMode = null;
    } else {
      if (board) board.classList.remove('pal-edit');
      if (btn) { btn.style.background=''; btn.style.borderColor='rgba(80,144,208,0.4)'; }
      _sel = null;
      window._enginePracticeMode = window._editorSavedPracticeMode || null;
      
      if (window.innerWidth <= 768) {
        toggleMobilePanel(false);
      }

      if (typeof analyzePosition === 'function') analyzePosition(true);
    }
  };

  /* 하위호환 */
  window.togglePieceEditor = window.palToggle;

  /* ── 차례 설정 ── */
  window.palTurn = function(turn) {
    if (typeof game !== 'undefined' && game) { 
      try { 
        game.turn = turn; 
        game.halfMove = 0; // 차례 변경 시에도 초기화 (0.0 고정 방지)
      } catch(e){} 
    }
    var tw = document.getElementById('pal-tw');
    var tb = document.getElementById('pal-tb');
    if (tw) { tw.classList.toggle('pal-active-w', turn==='w'); }
    if (tb) { tb.classList.toggle('pal-active-b', turn==='b'); }
    
    // 추가: 차례 변경 시 실시간 분석 요청
    if (typeof analyzePosition === 'function') {
      analyzePosition(true);
    }
  };
  window.setEditorTurn = window.palTurn;

  /* ── 전체삭제 / 초기배치 ── */
  window.palClear = function() {
    if (!confirm('보드의 모든 기물을 삭제할까요?')) return;
    if (typeof game === 'undefined' || !game || !game.board) return;
    for (var r=0;r<8;r++) for (var c=0;c<8;c++) game.board[r][c]=null;
    
    // 추가: 보드 전체 삭제 시 상태 초기화 (평가치 0.0 고정 방지)
    game.halfMove = 0;
    game.fullMove = 1;
    game.enPassant = null;
    game.castling = { wK:false, wQ:false, bK:false, bQ:false };
    
    refresh();
    if (typeof analyzePosition === 'function') analyzePosition(true);
  };
  window.palReset = function() {
    var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    if (typeof game !== 'undefined' && game && typeof game.loadFromFen==='function') {
      game.loadFromFen(START);
      refresh();
      if (typeof analyzePosition === 'function') analyzePosition(true);
      showToast('♟ 기본 포지션으로 재설정되었습니다');
    }
  };

  /* ── 보드 좌표 ── */
  function sqAt(e) {
    var board = document.getElementById('chessboard');
    if (!board) return null;
    var r = board.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    if (x<0||y<0||x>r.width||y>r.height) return null;
    
    var col = Math.max(0,Math.min(7,Math.floor(x/r.width*8)));
    var row = Math.max(0,Math.min(7,Math.floor(y/r.height*8)));
    
    // 추가: 보드가 뒤집힌 경우(flipped) 좌표 변환
    if (typeof game !== 'undefined' && game && game.flipped) {
      col = 7 - col;
      row = 7 - row;
    }
    
    return { col: col, row: row };
  }

  /* ── 보드 읽기/쓰기 ── */
  function get(col,row) {
    try {
      var raw = game.board[row][col];
      if (!raw) return null;
      // game.js 형식: "wK", "bQ" 같은 2글자 문자열 → 팔레트용 객체로 변환
      if (typeof raw === 'string') return { color: raw[0], type: raw[1] };
      return raw;
    } catch(e) { return null; }
  }

  // 추가: 캐슬링 권리 상태 유효성 검사 (기물 위치 기준)
  function validateCastling() {
    if (!game || !game.board) return;
    var b = game.board;
    // 백 킹/룩
    if (b[7][4]!=='wK') { game.castling.wK=false; game.castling.wQ=false; }
    else {
      if (b[7][7]!=='wR') game.castling.wK=false;
      if (b[7][0]!=='wR') game.castling.wQ=false;
    }
    // 흑 킹/룩
    if (b[0][4]!=='bK') { game.castling.bK=false; game.castling.bQ=false; }
    else {
      if (b[0][7]!=='bR') game.castling.bK=false;
      if (b[0][0]!=='bR') game.castling.bQ=false;
    }
  }

  function set(col,row,p) {
    if (typeof game==='undefined'||!game||!game.board) return;
    try {
      if (!p) {
        // null과 undefined 모두 처리 (버그 2 수정)
        game.board[row][col] = null;
      } else {
        // game.js가 기대하는 형식: "wK", "bQ" 등 (색깔 + 기물 대문자)
        game.board[row][col] = p.color + p.type.toUpperCase();
      }
      
      // 추가: 기물 수동 배치 시 50수 규칙용 클락 초기화 (평가치 0.0 고정 방지)
      game.halfMove = 0;
      game.enPassant = null;
      
      // 추가: 캐슬링 권리 자동 갱신 (불가능한 위치면 권리 박탈)
      validateCastling();
      
      // 추가: 포지션 유효성 검사 및 UI 경고 표시
      updatePositionWarning();
      
      refresh();
      // 추가: 기물 배치 시 실시간 분석 요청
      if (typeof analyzePosition === 'function') {
        analyzePosition(true); 
      }
    } catch(e) { console.warn('[pal]',e); }
  }

  function updatePositionWarning() {
    if (!game || !game.board) return;
    var wK=0, bK=0, w=0, b=0;
    for(var r=0;r<8;r++) for(var c=0;c<8;c++){
      var p = game.board[r][c];
      if(p){
        if(p[0]==='w') { w++; if(p[1]==='K') wK++; }
        else { b++; if(p[1]==='K') bK++; }
      }
    }
    var msg = '';
    if (wK !== 1 || bK !== 1) msg = '⚠️ 킹이 백/흑 각각 1개씩 있어야 합니다';
    else if (w > 16 || b > 16) {
      var color = w > 16 ? '백' : '흑';
      msg = `⚠️ ${color} 기물이 16개를 초과했습니다`;
    }
    else if (w + b > 32) msg = '⚠️ 전체 기물이 32개를 초과했습니다';

    var warnEl = document.getElementById('pos-warn-msg');
    if (warnEl) {
      warnEl.textContent = msg;
      warnEl.style.display = msg ? 'block' : 'none';
      if (msg) warnEl.title = '체스 엔진 최적화 문제로 백 또는 흑의 기물이 16개를 넘으면 평가 점수를 계산할 수 없습니다.';
    }
  }

  function refresh() {
    if (typeof renderBoard==='function') renderBoard();
    else if (typeof game!=='undefined'&&game&&typeof game.renderBoard==='function') game.renderBoard();
  }

  /* ── 이벤트 연결 ── */
  function attach() {
    var board = document.getElementById('chessboard');
    if (!board) { setTimeout(attach, 500); return; }

    /* dragover / drop (팔레트→보드) */
    board.addEventListener('dragover', function(e) {
      if (!window._palOpen && !_dragSq) return;
      e.preventDefault();
    });
    board.addEventListener('drop', function(e) {
      e.preventDefault();
      var sq = sqAt(e);
      if (!sq) return;
      if (_dragSq) {                          // 보드→보드 이동
        var from = _dragSq; _dragSq = null;
        if (from.col===sq.col && from.row===sq.row) { refresh(); return; }
        var p = get(from.col, from.row);
        set(from.col, from.row, null);
        if (p) set(sq.col, sq.row, p);
        return;
      }
      if (!window._palOpen) return;
      var raw = e.dataTransfer.getData('pal');
      if (raw) { try { set(sq.col,sq.row,JSON.parse(raw)); } catch(_){} }
      else if (_sel && _sel!=='erase') set(sq.col,sq.row,_sel);
    });

    /* 클릭: 팔레트 모드에서만 */
    board.addEventListener('click', function(e) {
      if (!window._palOpen) return;
      var sq = sqAt(e);
      if (!sq) return;
      e.stopImmediatePropagation();
      if (!_sel) return;
      if (_sel==='erase') set(sq.col,sq.row,null);
      else set(sq.col,sq.row,_sel);
    }, true);

    /* 우클릭: 삭제 */
    board.addEventListener('contextmenu', function(e) {
      if (!window._palOpen) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var sq = sqAt(e);
      if (sq) set(sq.col,sq.row,null);
    }, true);

    /* mousedown: 보드 위 기물 드래그 이동 */
    board.addEventListener('mousedown', function(e) {
      if (!window._palOpen || e.button!==0) return;
      var sq = sqAt(e);
      if (!sq) return;
      var p = get(sq.col, sq.row);
      if (!p) return;
      e.preventDefault(); e.stopImmediatePropagation();
      _dragSq = sq;
      // ghost
      var type = (p.type||'').toUpperCase();
      _ghost = document.createElement('img');
      _ghost.src = IMG + p.color + type + '.svg';
      _ghost.style.cssText = 'position:fixed;width:60px;height:60px;pointer-events:none;z-index:9999;opacity:0.85;transform:translate(-50%,-50%);';
      _ghost.style.left = e.clientX+'px';
      _ghost.style.top  = e.clientY+'px';
      document.body.appendChild(_ghost);
      // 원본 기물 흐리게
      var sqEls = board.querySelectorAll('.square');
      var img = sqEls[sq.row*8+sq.col] && sqEls[sq.row*8+sq.col].querySelector('.piece-img');
      if (img) img.classList.add('pal-dragging');
    }, true);

    /* ══════════════════════════════════════════════════════════
       터치 지원: 배치 / 이동 / 삭제  +  디버그 오버레이
       ══════════════════════════════════════════════════════════ */

    // ── 디버그 오버레이 (우상단 반투명 패널) ──────────────────
    var _dbg = (function() {
      var el = document.createElement('div');
      el.id = 'pal-debug-overlay';
      el.style.cssText = [
        'position:fixed',
        'top:8px',
        'right:8px',
        'min-width:200px',
        'max-width:280px',
        'background:rgba(0,0,0,0.82)',
        'color:#0f0',
        'font:11px/1.45 monospace',
        'padding:8px 10px',
        'border-radius:8px',
        'z-index:99999',
        'pointer-events:none',
        'white-space:pre-wrap',
        'border:1px solid #0f08',
        'display:none'
      ].join(';');
      document.body.appendChild(el);

      var _lines = [];
      var _timer = null;
      return {
        show: function() { el.style.display = 'block'; },
        hide: function() { el.style.display = 'none'; },
        log: function() {
          var msg = Array.prototype.slice.call(arguments).join(' ');
          var ts  = new Date().toISOString().slice(11, 23);
          _lines.push('[' + ts + '] ' + msg);
          if (_lines.length > 18) _lines.shift();
          el.textContent = _lines.join('\n');
          console.log('[PAL-DBG]', msg);
          // 5초 뒤 자동 숨김 타이머 리셋
          clearTimeout(_timer);
          _timer = setTimeout(function() { el.style.display = 'none'; _lines = []; }, 8000);
          el.style.display = 'block';
        }
      };
    })();
    // 전역 노출 (콘솔에서 window.__palDbg.show() 로 강제 표시 가능)
    window.__palDbg = _dbg;

    // ── 터치 상태 변수 ────────────────────────────────────────
    var _touchDragSq    = null;  // 드래그 출발 칸 {col,row}
    var _touchGhost     = null;  // 드래그 중 고스트 이미지 엘리먼트
    var _longPressTimer = null;  // 길게 누르기 타이머 ID
    var _touchStartPt   = null;  // 터치 시작 좌표 {x,y}
    var _touchActed     = false; // touchend에서 이미 처리됐는지 (중복 방지)
    var MOVE_THRESHOLD  = 10;    // px — 이 이상 이동해야 드래그로 판정

    // ── 헬퍼: touch → 보드 칸 좌표 ──────────────────────────
    function sqAtTouch(touch) {
      return sqAt({ clientX: touch.clientX, clientY: touch.clientY });
    }

    // ── 헬퍼: 고스트 이미지 생성/이동 ───────────────────────
    function spawnGhost(src, cx, cy) {
      if (_touchGhost) { _touchGhost.remove(); _touchGhost = null; }
      var g = document.createElement('img');
      g.src = src;
      g.style.cssText = 'position:fixed;width:72px;height:72px;pointer-events:none;z-index:9999;opacity:0.9;transform:translate(-50%,-75%);transition:none;';
      g.style.left = cx + 'px';
      g.style.top  = cy + 'px';
      document.body.appendChild(g);
      _touchGhost = g;
    }
    function moveGhost(cx, cy) {
      if (!_touchGhost) return;
      _touchGhost.style.left = cx + 'px';
      _touchGhost.style.top  = cy + 'px';
    }
    function removeGhost() {
      if (_touchGhost) { _touchGhost.remove(); _touchGhost = null; }
    }

    // ── 헬퍼: 목표 칸 하이라이트 ─────────────────────────────
    function setHoverSq(sq) {
      board.querySelectorAll('.pal-touch-target').forEach(function(el) {
        el.classList.remove('pal-touch-target');
      });
      if (!sq) return;
      var els = board.querySelectorAll('.square');
      var el  = els[sq.row * 8 + sq.col];
      if (el) el.classList.add('pal-touch-target');
    }

    // ── 헬퍼: 출발 칸 기물 이미지 투명도 ────────────────────
    function dimSq(sq, on) {
      var els  = board.querySelectorAll('.square');
      var pImg = els[sq.row * 8 + sq.col] && els[sq.row * 8 + sq.col].querySelector('.piece-img');
      if (pImg) { if (on) pImg.classList.add('pal-dragging'); else pImg.classList.remove('pal-dragging'); }
    }

    // ── 헬퍼: 터치 이동 거리 ─────────────────────────────────
    function touchDist(touch) {
      if (!_touchStartPt) return 0;
      var dx = touch.clientX - _touchStartPt.x;
      var dy = touch.clientY - _touchStartPt.y;
      return Math.sqrt(dx*dx + dy*dy);
    }

    // ── 정리: 드래그 상태 초기화 ─────────────────────────────
    function cancelTouchDrag() {
      if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; }
      removeGhost();
      setHoverSq(null);
      if (_touchDragSq) { dimSq(_touchDragSq, false); _touchDragSq = null; }
      _touchStartPt = null;
      _touchActed   = false;
    }

    // ════════════════════════════════════════════════════════
    board.addEventListener('touchstart', function(e) {
      // 편집 모드가 아니면 완전히 무시 (기본 동작 유지)
      if (!window._palOpen) return;
      if (e.touches.length !== 1) { cancelTouchDrag(); return; }

      // touchstart는 거의 항상 cancelable=true이지만 방어적으로 체크
      if (e.cancelable) { e.preventDefault(); e.stopPropagation(); }

      var touch = e.touches[0];
      var sq    = sqAtTouch(touch);

      _touchStartPt = { x: touch.clientX, y: touch.clientY };
      _touchActed   = false;

      _dbg.log('touchstart sq=' + (sq ? sq.col+','+sq.row : 'null') +
               ' sel=' + JSON.stringify(_sel));

      if (!sq) return;

      var p = get(sq.col, sq.row);

      // 길게 누르기 → 삭제 (400ms, 이동 없을 때만)
      _longPressTimer = setTimeout(function() {
        if (_touchDragSq) return; // 이미 드래그 중이면 무시
        _dbg.log('longpress → delete sq=' + sq.col + ',' + sq.row);
        set(sq.col, sq.row, null);
        if (navigator.vibrate) navigator.vibrate(40);
        cancelTouchDrag();
        _touchActed = true;
      }, 400);

      if (p) {
        // 기존 기물: 드래그 준비
        _touchDragSq = sq;
        dimSq(sq, true);
        var type = (p.type || '').toUpperCase();
        spawnGhost(IMG + p.color + type + '.svg', touch.clientX, touch.clientY);
        _dbg.log('drag-start piece=' + p.color + p.type + ' from=' + sq.col + ',' + sq.row);
      }
      // 빈 칸이면 touchend에서 배치 처리
    }, { passive: false });

    // ════════════════════════════════════════════════════════
    board.addEventListener('touchmove', function(e) {
      if (!window._palOpen) return;
      if (e.cancelable) { e.preventDefault(); e.stopPropagation(); }

      var touch = e.touches[0];
      var dist  = touchDist(touch);

      // MOVE_THRESHOLD 이상 움직이면 길게 누르기 취소
      if (dist > MOVE_THRESHOLD && _longPressTimer) {
        clearTimeout(_longPressTimer);
        _longPressTimer = null;
      }

      moveGhost(touch.clientX, touch.clientY);

      if (_touchDragSq && dist > MOVE_THRESHOLD) {
        var sq = sqAtTouch(touch);
        setHoverSq(sq && (sq.col !== _touchDragSq.col || sq.row !== _touchDragSq.row) ? sq : null);
        _dbg.log('touchmove drag dist=' + dist.toFixed(0) + ' over=' + (sq ? sq.col+','+sq.row : 'null'));
      }
    }, { passive: false });

    // ════════════════════════════════════════════════════════
    board.addEventListener('touchend', function(e) {
      if (!window._palOpen) return;
      // touchend는 스크롤 중이면 cancelable=false — 그 경우 preventDefault 건너뜀
      if (e.cancelable) { e.preventDefault(); e.stopPropagation(); }

      if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; }
      setHoverSq(null);

      if (_touchActed) { // 길게 누르기가 이미 처리함
        cancelTouchDrag();
        return;
      }

      var touch = e.changedTouches[0];
      var sq    = sqAtTouch(touch);
      var dist  = touchDist(touch);
      var isDrag = (dist > MOVE_THRESHOLD);

      _dbg.log('touchend cancelable=' + e.cancelable +
               ' sq=' + (sq ? sq.col+','+sq.row : 'null') +
               ' dist=' + dist.toFixed(0) +
               ' dragSq=' + (_touchDragSq ? _touchDragSq.col+','+_touchDragSq.row : 'null') +
               ' sel=' + JSON.stringify(_sel));

      removeGhost();

      if (_touchDragSq) {
        // ── 보드→보드 이동 ──────────────────────────────────
        var from = _touchDragSq;
        dimSq(from, false);
        _touchDragSq = null;

        if (sq && isDrag && (sq.col !== from.col || sq.row !== from.row)) {
          var p = get(from.col, from.row);
          _dbg.log('move ' + (p ? p.color+p.type : '?') +
                   ' from=' + from.col+','+from.row +
                   ' to=' + sq.col+','+sq.row);
          set(from.col, from.row, null);
          if (p) set(sq.col, sq.row, p);
        } else if (!isDrag && sq) {
          // 드래그 없이 손 뗀 경우: 같은 칸이면 아무것도 안 함
          // 다른 칸이면 팔레트 선택 기물로 덮어쓰기
          if (sq.col !== from.col || sq.row !== from.row) {
            if (_sel && _sel !== 'erase') {
              _dbg.log('tap-on-piece: place sel=' + JSON.stringify(_sel) + ' at=' + sq.col+','+sq.row);
              set(sq.col, sq.row, _sel);
            }
          } else {
            // 같은 칸 탭 → 그냥 리프레시 (기물 유지)
            refresh();
          }
        } else {
          refresh();
        }
        _touchStartPt = null;
        return;
      }

      // ── 팔레트 기물 탭으로 배치 / 지우개 ──────────────────
      if (!sq) {
        _dbg.log('touchend: no square hit');
        _touchStartPt = null;
        return;
      }

      if (_sel === 'erase') {
        _dbg.log('erase at=' + sq.col + ',' + sq.row);
        set(sq.col, sq.row, null);
      } else if (_sel) {
        _dbg.log('place ' + JSON.stringify(_sel) + ' at=' + sq.col + ',' + sq.row);
        set(sq.col, sq.row, _sel);
      } else {
        _dbg.log('touchend: _sel is null, nothing to place');
      }

      _touchStartPt = null;
    }, { passive: false });

    // ════════════════════════════════════════════════════════
    board.addEventListener('touchcancel', function() {
      _dbg.log('touchcancel — reset');
      cancelTouchDrag();
    });
  }

  /* mousemove / mouseup 전역 */
  window.addEventListener('mousemove', function(e) {
    if (_ghost) { _ghost.style.left=e.clientX+'px'; _ghost.style.top=e.clientY+'px'; }
  });
  window.addEventListener('mouseup', function(e) {
    if (!_dragSq) return;
    if (_ghost) { _ghost.remove(); _ghost=null; }
    var board = document.getElementById('chessboard');
    if (board) {
      var sqEls = board.querySelectorAll('.square');
      var img = sqEls[_dragSq.row*8+_dragSq.col] && sqEls[_dragSq.row*8+_dragSq.col].querySelector('.piece-img');
      if (img) img.classList.remove('pal-dragging');
    }
    var sq = sqAt(e);
    var from = _dragSq; _dragSq = null;
    if (!sq || (from.col===sq.col && from.row===sq.row)) return;
    var p = get(from.col, from.row);
    set(from.col, from.row, null);
    if (p) set(sq.col, sq.row, p);
  });

  /* ── 하위호환 ── */
  window.selectEraseMode = window.palErase;

  /* ── 데이터 관리 (FEN/PGN/저장) ── */
  window.copyCurrentFen = function() {
    if (typeof game === 'undefined' || !game) return;
    var fen = boardToFen(game.board, game.turn, game.castling, game.enPassant, game.halfMove, game.fullMove);
    navigator.clipboard.writeText(fen).then(function() {
      showToast('📋 FEN이 클립보드에 복사되었습니다');
    });
  };

  window.copyCurrentPgn = function() {
    if (typeof game === 'undefined' || !game) return;
    var pgn = (typeof game.generatePgn === 'function') ? game.generatePgn() : '';
    if (!pgn) {
       // generatePgn이 없거나 비어있으면 FEN이라도 복사
       var fen = boardToFen(game.board, game.turn, game.castling, game.enPassant, game.halfMove, game.fullMove);
       pgn = '[FEN "' + fen + '"] *';
    }
    navigator.clipboard.writeText(pgn).then(function() {
      showToast('📋 PGN 기보가 클립보드에 복사되었습니다');
    });
  };

  window.saveCurrentGame = async function() {
    if (typeof game === 'undefined' || !game) return;
    var fen = boardToFen(game.board, game.turn, game.castling, game.enPassant, game.halfMove, game.fullMove);
    var pgn = (typeof game.generatePgn === 'function') ? game.generatePgn() : '';
    
    var title = prompt('기보의 제목을 입력해주세요:', '연습 대국 - ' + new Date().toLocaleDateString());
    if (title === null) return; // 취소

    showToast('💾 기보를 저장하는 중...');
    
    try {
      // Firebase 연동 확인 (window._auth 또는 firebase.auth() 사용)
      var currentAuth = window._auth || (typeof firebase !== 'undefined' ? firebase.auth() : null);
      if (currentAuth && currentAuth.currentUser) {
        const db = firebase.firestore();
        // ★ 중요: 'games' 컬렉션이 아닌 기존에 존재하는 'saved_pgns' 컬렉션 사용
        await db.collection('saved_pgns').add({
          uid: currentAuth.currentUser.uid,
          title: title,
          fen: fen,
          pgn: pgn,
          white: '백',
          black: '흑',
          date: new Date().toLocaleDateString(),
          result: '*',
          opening: '-',
          moveCount: (game.history ? game.history.length : 0),
          savedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('✅ 클라우드에 성공적으로 저장되었습니다!');
      } else {
        // 로컬 저장 폴백
        var saved = JSON.parse(localStorage.getItem('chess_saved_games') || '[]');
        saved.unshift({ title: title, fen: fen, pgn: pgn, date: new Date().toISOString() });
        localStorage.setItem('chess_saved_games', JSON.stringify(saved.slice(0, 50))); // 최대 50개
        showToast('✅ 로그인이 되어있지 않아 브라우저(로컬)에 저장되었습니다.');
      }
    } catch(e) {
      console.error(e);
      showToast('❌ 저장 실패: ' + e.message);
    }
  };

  document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.palBuild === 'function') window.palBuild();
    attach();
  });
})();

/* --- UI Utilities --- */

function switchTab(tab) {
  // 버튼 활성화
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const onclick = btn.getAttribute('onclick');
    if (onclick && onclick.includes(`'${tab}'`)) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  // 패널 활성화
  document.querySelectorAll('.tab-panel').forEach(panel => {
    if (panel.id === 'tab-' + tab) panel.classList.add('active');
    else panel.classList.remove('active');
  });

  // 편집 모드 상태 동기화
  var isPalette = (tab === 'palette');
  var board = document.getElementById('chessboard');
  var btn = document.getElementById('edit-mode-btn');
  var backdrop = document.getElementById('mobile-panel-backdrop');

  if (isPalette) {
    if (!window._palOpen) {
       window._palOpen = true;
       if (typeof window.palBuild === 'function') window.palBuild();
       if (board) board.classList.add('pal-edit');
       if (btn) { btn.style.background='rgba(80,144,208,0.25)'; btn.style.borderColor='#5090d0'; }
       window._editorSavedPracticeMode = window._enginePracticeMode;
       window._enginePracticeMode = null;
    } else {
       // 이미 열려있더라도 빌드 호출 (기물 목록 확인용)
       if (typeof window.palBuild === 'function') window.palBuild();
    }
    if (backdrop) backdrop.classList.add('no-backdrop');
  } else {
    // 다른 탭으로 이동 시 편집 모드 유지 여부는 사용자 선택이지만, 
    // 모바일 배경막은 다시 불투명하게 (조작 방지)
    if (backdrop) backdrop.classList.remove('no-backdrop');
  }

  // 모바일 전용: 편집 탭에서만 '보드 보기' 버튼 표시
  var minBtn = document.getElementById('btn-minimize-pal');
  if (minBtn) {
    minBtn.style.display = (isPalette && window.innerWidth <= 768) ? 'flex' : 'none';
  }
}

function toggleMobilePanel(forceOpen) {
  const panel = document.getElementById('right-panel');
  const backdrop = document.getElementById('mobile-panel-backdrop');
  const isOpening = forceOpen !== undefined ? forceOpen : !panel.classList.contains('mobile-open');
  
  if (isOpening) {
    panel.classList.add('mobile-open');
    if (backdrop) {
      backdrop.classList.add('show');
      // 현재 탭이 편집이면 배경막 무력화
      const activeTab = document.querySelector('.tab-btn.active');
      if (activeTab && activeTab.getAttribute('onclick').includes('palette')) {
        backdrop.classList.add('no-backdrop');
      } else {
        backdrop.classList.remove('no-backdrop');
      }
    }
  } else {
    panel.classList.remove('mobile-open');
    if (backdrop) {
      backdrop.classList.remove('show');
      backdrop.classList.remove('no-backdrop');
    }
  }
}

function closeMobilePanel() {
  toggleMobilePanel(false);
}

function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// 모바일: 리사이즈 시 패널 상태 정리
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    const panel = document.getElementById('right-panel');
    const backdrop = document.getElementById('mobile-panel-backdrop');
    if (panel) panel.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('show');
  }
});