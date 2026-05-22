function loadPositionFromInput() {
  const input = document.getElementById('fen-input').value.trim();
  if (!input) return;
  if (typeof game !== 'undefined' && game && typeof game.loadFromFen === 'function') {
    const success = game.loadFromFen(input);
    if (!success) {
      alert('유효하지 않은 FEN입니다.');
    }
  }
}
window.loadPositionFromInput = loadPositionFromInput;

// ══════════════════════════════════════════════════════
//  우클릭 화살표 그리기
// ══════════════════════════════════════════════════════
const ARROW_COLOR = 'rgba(255, 165, 0, 0.88)';
const ARROW_SW    = 14;
const MARKER_ID   = 'user-arrow-svg-head';
const SVG_NS = 'http://www.w3.org/2000/svg';

let _arrowStart = null;
let _userArrows = [];

function ensureSvg() {
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

// ══════════════════════════════════════════════════════
//  기물 팔레트 시스템 v2
// ══════════════════════════════════════════════════════
const IMG = 'https://lichess1.org/assets/piece/cburnett/';
const TYPES = ['K','Q','R','B','N','P'];
window._palOpen = false;
let _sel = null;       // {color,type} | 'erase' | null
let _dragSq = null;    // 보드 위 기물 드래그 출발칸
let _ghost = null;

function palBuild() {
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
  if (!_sel) sel('w', 'Q');
  else if (_sel !== 'erase') sel(_sel.color, _sel.type);
  else if (_sel === 'erase') palErase();
}

function sel(c, t) {
  _sel = {color:c, type:t};
  var er = document.getElementById('pal-erase');
  if (er) er.classList.remove('pal-selected');
  document.querySelectorAll('.pal-piece').forEach(function(el) {
    el.classList.toggle('pal-selected', el.dataset.c === c && el.dataset.t === t);
  });
}

function palErase() {
  _sel = 'erase';
  var er = document.getElementById('pal-erase');
  if (er) er.classList.add('pal-selected');
  document.querySelectorAll('.pal-piece').forEach(function(el) { el.classList.remove('pal-selected'); });
}

function palToggle(force) {
  if (force !== undefined) window._palOpen = !force;
  else window._palOpen = !window._palOpen;

  var panelEl = document.getElementById('right-panel');
  var board = document.getElementById('chessboard');
  var btn   = document.getElementById('edit-mode-btn');
  var backdrop = document.getElementById('mobile-panel-backdrop');
  
  if (window._palOpen) {
    palBuild();
    switchTab('palette');
    if (window.innerWidth <= 768) toggleMobilePanel(true);
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
    if (window.innerWidth <= 768) toggleMobilePanel(false);
    if (typeof analyzePosition === 'function') analyzePosition(true);
  }
}

function palTurn(turn) {
  if (typeof game !== 'undefined' && game) { 
    try { game.turn = turn; game.halfMove = 0; } catch(e){} 
  }
  var tw = document.getElementById('pal-tw');
  var tb = document.getElementById('pal-tb');
  if (tw) tw.classList.toggle('pal-active-w', turn==='w');
  if (tb) tb.classList.toggle('pal-active-b', turn==='b');
  if (typeof analyzePosition === 'function') analyzePosition(true);
}

function palClear() {
  if (!confirm('보드의 모든 기물을 삭제할까요?')) return;
  if (typeof game === 'undefined' || !game || !game.board) return;
  for (var r=0;r<8;r++) for (var c=0;c<8;c++) game.board[r][c]=null;
  game.halfMove = 0;
  game.fullMove = 1;
  game.enPassant = null;
  game.castling = { wK:false, wQ:false, bK:false, bQ:false };
  refresh();
  if (typeof analyzePosition === 'function') analyzePosition(true);
}

function palReset() {
  var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  if (typeof game !== 'undefined' && game && typeof game.loadFromFen==='function') {
    game.loadFromFen(START);
    refresh();
    if (typeof analyzePosition === 'function') analyzePosition(true);
    showToast('♟ 기본 포지션으로 재설정되었습니다');
  }
}

function sqAt(e) {
  var board = document.getElementById('chessboard');
  if (!board) return null;
  var r = board.getBoundingClientRect();
  var x = e.clientX - r.left, y = e.clientY - r.top;
  if (x<0||y<0||x>r.width||y>r.height) return null;
  var col = Math.max(0,Math.min(7,Math.floor(x/r.width*8)));
  var row = Math.max(0,Math.min(7,Math.floor(y/r.height*8)));
  if (typeof game !== 'undefined' && game && game.flipped) { col = 7 - col; row = 7 - row; }
  return { col: col, row: row };
}

function get(col,row) {
  try {
    var raw = game.board[row][col];
    if (!raw) return null;
    if (typeof raw === 'string') return { color: raw[0], type: raw[1] };
    return raw;
  } catch(e) { return null; }
}

function set(col,row,p) {
  if (typeof game==='undefined'||!game||!game.board) return;
  try {
    if (!p) game.board[row][col] = null;
    else game.board[row][col] = p.color + p.type.toUpperCase();
    game.halfMove = 0;
    game.enPassant = null;
    refresh();
    if (typeof analyzePosition === 'function') analyzePosition(true);
  } catch(e) { console.warn('[pal]',e); }
}

function refresh() {
  if (typeof renderBoard==='function') renderBoard();
  else if (typeof game!=='undefined'&&game&&typeof game.renderBoard==='function') game.renderBoard();
}

function attachBoardEvents() {
  var board = document.getElementById('chessboard');
  if (!board) { setTimeout(attachBoardEvents, 500); return; }

  board.addEventListener('drop', function(e) {
    console.log('[PAL] Drop event fired');
    e.preventDefault();
    var sq = sqAt(e);
    if (!sq) { console.log('[PAL] Drop: No square found'); return; }
    if (_dragSq) {
      console.log('[PAL] Drag-and-drop piece movement');
      var from = _dragSq; _dragSq = null;
      var p = get(from.col, from.row);
      set(from.col, from.row, null);
      if (p) set(sq.col, sq.row, p);
      return;
    }
    if (!window._palOpen) { console.log('[PAL] Drop: Pal not open'); return; }
    var raw = e.dataTransfer.getData('pal');
    console.log('[PAL] Drop: Raw data =', raw);
    if (raw) { try { set(sq.col,sq.row,JSON.parse(raw)); } catch(_){} }
    else if (_sel && _sel!=='erase') set(sq.col,sq.row,_sel);
  });

  board.addEventListener('click', function(e) {
    console.log('[PAL] Click event fired. PalOpen:', window._palOpen, 'Sel:', _sel);
    if (!window._palOpen) return;
    var sq = sqAt(e);
    if (!sq) return;
    e.stopImmediatePropagation();
    if (!_sel) return;
    if (_sel==='erase') set(sq.col,sq.row,null);
    else set(sq.col,sq.row,_sel);
  }, true);

  board.addEventListener('mousedown', function(e) {
    console.log('[PAL] Mousedown. PalOpen:', window._palOpen);
    if (!window._palOpen || e.button!==0) return;
    var sq = sqAt(e);
    if (!sq) return;
    var p = get(sq.col, sq.row);
    if (!p) return;
    e.preventDefault();
    _dragSq = sq;
    var sqEls = board.querySelectorAll('.square');
    var img = sqEls[sq.row*8+sq.col] && sqEls[sq.row*8+sq.col].querySelector('.piece-img');
    if (img) img.classList.add('pal-dragging');
  }, true);
}

function attachUIEvents() {
  const btn = document.getElementById('edit-mode-btn');
  if (btn) {
    btn.onclick = (e) => {
      e.preventDefault();
      window.palToggle();
    };
  }
}

// 초기화
window.addEventListener('DOMContentLoaded', () => {
  palBuild();
  attachEvents();
  attachBoardEvents();
  attachUIEvents();
});

// 전역 노출
window.palToggle = palToggle;
window.palBuild = palBuild;
window.palErase = palErase;
window.palTurn = palTurn;
window.palClear = palClear;
window.palReset = palReset;
window.practiceNewGame = practiceNewGame;
window.saveCurrentGame = saveCurrentGame;
window.loadPositionFromInput = loadPositionFromInput;
