var _toastTimer=null;
function showToast(msg){
  var el=document.getElementById('toast');if(!el)return;
  el.textContent=msg;el.style.opacity='1';
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(function(){el.style.opacity='0';},2800);
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