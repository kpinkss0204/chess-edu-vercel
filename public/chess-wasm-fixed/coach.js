let coachApiKey = '';
let coachOpen = false;
let coachLoading = false;

// API 키 저장/불러오기
function saveApiKey() {
  const input = document.getElementById('coach-api-input');
  const key = input.value.trim();
  if (!key) { showToast('API 키를 입력하세요'); return; }
  coachApiKey = key;
  try { sessionStorage.setItem('chess_groq_key', key); } catch(e) {}
  document.getElementById('coach-key-status').textContent = '✓ 저장됨';
  document.getElementById('coach-key-status').style.color = '#7fa650';
  showToast('API 키 저장 완료');
}

function loadApiKey() {
  // 서버 프록시 방식: 키는 Vercel 환경변수에 저장됨 (클라이언트에 노출 없음)
  coachApiKey = 'proxy'; // 프록시 사용 중임을 표시하는 플래그
  const inp = document.getElementById('coach-api-input');
  if (inp) { inp.value = '(서버에 안전하게 저장됨)'; inp.disabled = true; inp.style.opacity='0.5'; }
  const st = document.getElementById('coach-key-status');
  if (st) { st.textContent = '✓ 서버 연결'; st.style.color = '#7fa650'; }
  const btn = document.getElementById('coach-save-key-btn');
  if (btn) btn.style.display = 'none';
}

// 패널 열기/닫기
function openCoach() {
  coachOpen = true;
  const panel = document.getElementById('coach-panel');
  if (panel) panel.classList.add('visible');
  const btn = document.getElementById('coach-open-btn');
  if (btn) btn.classList.add('active');
  // 보드 왼쪽 정렬로 전환
  const boardArea = document.getElementById('board-area');
  if (boardArea) boardArea.classList.add('coach-open');
  // 패널을 열자마자 자동으로 포지션 해설 실행
  runPositionCommentary();
}

function closeCoach() {
  coachOpen = false;
  const panel = document.getElementById('coach-panel');
  if (panel) panel.classList.remove('visible');
  const btn = document.getElementById('coach-open-btn');
  if (btn) btn.classList.remove('active');
  // 보드 중앙 정렬 복원
  const boardArea = document.getElementById('board-area');
  if (boardArea) boardArea.classList.remove('coach-open');
}

function closeCoachInline() {
  closeCoach();
}

function toggleCoachPanel() {
  if (coachOpen) {
    closeCoach();
  } else {
    openCoach();
  }
}

// updateCoachContext: 상단 태그 표시는 제거 (빈 함수로 유지 — 다른 곳에서 호출될 수 있음)
function updateCoachContext() {
  const ctx = document.getElementById('coach-context-display');
  if (ctx) ctx.style.display = 'none';
}

// 체스 컨텍스트 데이터 빌드 (position-brief.js + Stockfish만 사용)
function buildChessContext() {
  if (!game) return null;

  const turn = game.turn;
  const fen = boardToFen(game.board, game.turn, game.castling, game.enPassant, game.halfMove, game.fullMove);

  // 엔진 데이터 유효성 확인: 현재 FEN과 일치하는지 체크
  const currentNormFen = (typeof normFen === 'function') ? normFen(fen) : fen;
  const engineNormFen  = (window.pvDataFen && typeof normFen === 'function') ? normFen(window.pvDataFen) : '';
  
  const pvDataValid = window.pvData && (engineNormFen === currentNormFen);

  // 엔진 라인 3개 (window.pvData에서)
  const pv1 = pvDataValid ? (window.pvData && window.pvData[1]) : null;
  const pv2 = pvDataValid ? (window.pvData && window.pvData[2]) : null;
  const pv3 = pvDataValid ? (window.pvData && window.pvData[3]) : null;

  const bestMove  = pv1 && pv1.moves && pv1.moves[0] ? pv1.moves[0] : null;
  const bestLine  = pv1 && pv1.moves ? pv1.moves.slice(0, 8).join(' ') : null;
  const line2     = pv2 && pv2.moves ? pv2.moves.slice(0, 6).join(' ') : null;
  const line3     = pv3 && pv3.moves ? pv3.moves.slice(0, 6).join(' ') : null;

  const evaluation   = pv1 ? pv1.eval : null;
  const depth        = pv1 ? pv1.depth : null;
  const cpFromWhite  = pv1 ? pv1.cpFromWhite : null;

  // 마지막으로 둔 수
  let lastMove = null;
  let lastMoveSan = null;
  let lastMoveAnnotation = null;
  if (game.historyIndex >= 0 && game.history[game.historyIndex]) {
    const h = game.history[game.historyIndex];
    lastMoveSan = h.san;
    lastMoveAnnotation = h.annotation;
    lastMove = h.san;
  }

  // 이전 포지션의 엔진 최선수
  let engineBestForPrevPos = null;
  let engineLineForPrevPos = null;
  if (game.historyIndex >= 0 && game.history[game.historyIndex]) {
    const h = game.history[game.historyIndex];
    const prevFen = h.fenBefore;
    if (prevFen) {
      const cached = evalCache[normFen(prevFen)];
      if (cached && cached.pvs) {
        const prevPv1 = cached.pvs[1];
        if (prevPv1) {
          const prevBoard = parseFenBoard(prevFen.split(' ')[0]);
          const prevTurn  = prevFen.split(' ')[1] || 'w';
          const prevCast  = parseFenCastling(prevFen.split(' ')[2] || '-');
          const prevEP    = parseFenEP(prevFen.split(' ')[3] || '-');
          if (prevBoard) {
            const sanList = uciMovesToSan(prevPv1.pv || [], prevBoard, prevTurn, prevCast, prevEP);
            engineBestForPrevPos = sanList[0] || null;
            engineLineForPrevPos = sanList.slice(0, 6).join(' ') || null;
          }
        }
      }
    }
  }

  // 현재 시점까지의 기보 (전체 history가 아닌 현재 인덱스까지만)
  let pgnMoves = '';
  for (let i = 0; i <= game.historyIndex; i++) {
    const s = game.history[i];
    if (s.turn === 'w') pgnMoves += `${s.fullMove}. `;
    pgnMoves += s.san + ' ';
  }

  // 게임 단계 판단 (현재 보고 있는 수 기준)
  const moveCount = game.historyIndex + 1;
  const phase = moveCount <= 10 ? '오프닝' : moveCount <= 30 ? '미들게임' : '엔드게임';

  // 평가 방향
  let advantageDesc = '균형';
  if (cpFromWhite !== null) {
    const v = cpFromWhite / 100;
    if (v > 3) advantageDesc = '백이 크게 우세';
    else if (v > 1) advantageDesc = '백이 약간 우세';
    else if (v < -3) advantageDesc = '흑이 크게 우세';
    else if (v < -1) advantageDesc = '흑이 약간 우세';
  }

  // 최선수 설명 패널 데이터 수집 (이미 분석된 경우)
  let bestExplainData = null;
  try {
    const beEl = document.getElementById('best-explain-content');
    if (beEl && lastBestExplainFen) {
      const reasonItems = beEl.querySelectorAll('.best-reason-item span');
      const reasons = Array.from(reasonItems).map(el => el.innerText.trim()).filter(Boolean);
      const titleEl = beEl.querySelector('.best-explain-title');
      const title   = titleEl ? titleEl.innerText.trim() : null;
      if (reasons.length > 0) {
        bestExplainData = { move: bestExplainMoves[0] || null, title, reasons };
      }
    }
  } catch(e) { /* 무시 */ }

  // 위협 패널에서 마지막으로 분석된 위협 데이터 포함
  let threatData = null;
  try {
    const tEl = document.getElementById('threat-content');
    if (tEl) {
      const ideaEl = tEl.querySelector('.threat-label-idea');
      const probEl = tEl.querySelector('.threat-label-prob');
      const solEl  = tEl.querySelector('.threat-label-sol');
      const getBody = (labelEl) => {
        if (!labelEl) return null;
        const section = labelEl.closest('.threat-section');
        const body = section && section.querySelector('.threat-section-body');
        return body ? body.innerText.trim() : null;
      };
      const idea = getBody(ideaEl);
      const prob = getBody(probEl);
      const sol  = getBody(solEl);
      if (idea || prob || sol) {
        threatData = { idea, prob, sol };
      }
    }
  } catch(e) { /* 무시 */ }

  // 사용자가 그린 화살표 (후보수 / 수순 구분)
  let candidateMoves = [];
  let sequenceMoves = [];
  try {
    // chess-wasm-fixed.html의 _userArrows 배열 읽기
    if (typeof window._userArrows !== 'undefined' && window._userArrows.length > 0) {
      const FILES = 'abcdefgh';
      window._userArrows.forEach(a => {
        const fromSq = FILES[a.fc] + (8 - a.fr);
        const toSq   = FILES[a.tc] + (8 - a.tr);
        if (a.seq) sequenceMoves.push(fromSq + '-' + toSq);
        else       candidateMoves.push(fromSq + '-' + toSq);
      });
    }
  } catch(e) { /* 무시 */ }

  // 포지션 구조 인사이트 추출 (FEN 기반 정제 분석)
  const positionInsights = extractPositionInsights(fen);

  const recentMoves = game.history.slice(Math.max(0, game.historyIndex - 7), game.historyIndex + 1).map(h => ({
    san: h.san,
    turn: h.turn,
    annotation: h.annotation || null,
  }));

  // 구조화 브리프: 위협/아이디어/엔진 수순 인과 + 오프닝·전개 내러티브
  let positionBrief = null;
  if (typeof buildPositionBrief === 'function') {
    const pv1Uci = pv1 && pv1.moves ? pv1.moves : (pv1 && pv1.pv ? pv1.pv : []);
    const pv2Uci = pv2 && pv2.moves ? pv2.moves : (pv2 && pv2.pv ? pv2.pv : []);
    positionBrief = buildPositionBrief({
      fen,
      turn,
      pv1Uci: Array.isArray(pv1Uci) ? pv1Uci : [],
      pv2Uci: Array.isArray(pv2Uci) ? pv2Uci : [],
      positionInsights,
      pgnMoves: pgnMoves.trim(),
      recentMoves,
      lastMoveSan,
      lastMoveAnnotation,
      phase,
      moveCount,
    });
  }

  return {
    turn, fen, bestMove, bestLine, line2, line3, evaluation, depth, cpFromWhite,
    lastMove, lastMoveSan, lastMoveAnnotation,
    engineBestForPrevPos, engineLineForPrevPos,
    pgnMoves: pgnMoves.trim(),
    phase, moveCount, advantageDesc,
    fullMove: game.fullMove,
    threatData,
    bestExplainData,
    candidateMoves,
    sequenceMoves,
    positionInsights,
    positionBrief,
    pvData: window.pvData,
  };
}

/** 브리프 JSON을 콘솔에 출력 (FEN 입력란 비우면 현재 국면) */
function debugCoachBrief() {
  const inputEl = document.getElementById('coach-debug-fen');
  let fen = (inputEl && inputEl.value.trim()) || '';
  if (!fen && game) {
    fen = boardToFen(game.board, game.turn, game.castling, game.enPassant, game.halfMove, game.fullMove);
  }
  if (!fen) {
    if (typeof showToast === 'function') showToast('FEN을 입력하거나 보드에 국면을 두세요');
    return null;
  }
  if (typeof buildPositionBrief !== 'function') {
    console.error('[Coach] position-brief.js가 로드되지 않았습니다.');
    return null;
  }

  const turn = fen.split(' ')[1] || 'w';
  const positionInsights = typeof extractPositionInsights === 'function'
    ? extractPositionInsights(fen)
    : [];
  const pv1 = window.pvData && window.pvData[1];
  const pv2 = window.pvData && window.pvData[2];
  const pv1Uci = pv1 && (pv1.moves || pv1.pv) ? (pv1.moves || pv1.pv) : [];
  const pv2Uci = pv2 && (pv2.moves || pv2.pv) ? (pv2.moves || pv2.pv) : [];

  let extra = {};
  if (game && game.history && game.history.length) {
    let pgnMoves = '';
    for (let i = 0; i <= game.historyIndex; i++) {
      const s = game.history[i];
      if (s.turn === 'w') pgnMoves += `${s.fullMove}. `;
      pgnMoves += s.san + ' ';
    }
    const h = game.historyIndex >= 0 ? game.history[game.historyIndex] : null;
    extra = {
      pgnMoves: pgnMoves.trim(),
      recentMoves: game.history.slice(Math.max(0, game.historyIndex - 7), game.historyIndex + 1).map(x => ({
        san: x.san, turn: x.turn, annotation: x.annotation || null,
      })),
      lastMoveSan: h ? h.san : null,
      lastMoveAnnotation: h ? h.annotation : null,
      phase: (game.historyIndex + 1) <= 10 ? '오프닝' : (game.historyIndex + 1) <= 30 ? '미들게임' : '엔드게임',
      moveCount: game.historyIndex + 1,
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

  console.group('[Coach Brief Debug]');
  console.log('FEN:', fen);
  console.log('brief:', brief);
  console.log('JSON:\n', JSON.stringify(brief, null, 2));
  if (typeof formatPositionBriefForPrompt === 'function') {
    console.log('프롬프트 블록:\n', formatPositionBriefForPrompt(brief, { turn }));
  }
  console.groupEnd();

  if (typeof showToast === 'function') showToast('브리프를 콘솔에 출력했습니다 (F12)');
  return brief;
}

// ══════════════════════════════════════════════════════
// 포지션 정제 분석 레이어 — AI에게 넘길 구조적 특징 추출
// ══════════════════════════════════════════════════════

/**
 * FEN 문자열로부터 8x8 보드 배열을 만든다.
 * board[rank][file] = { piece: 'P'|'p'|..., color: 'w'|'b' } | null
 * rank 0 = 8랭크(흑 홈), rank 7 = 1랭크(백 홈)
 */
function fenToMatrix(fen) {
  const ranks = fen.split(' ')[0].split('/');
  const board = [];
  for (const rank of ranks) {
    const row = [];
    for (const ch of rank) {
      if ('12345678'.includes(ch)) {
        for (let i = 0; i < parseInt(ch); i++) row.push(null);
      } else {
        row.push({ piece: ch.toUpperCase(), color: ch === ch.toUpperCase() ? 'w' : 'b', raw: ch });
      }
    }
    board.push(row);
  }
  return board; // board[0..7][0..7], board[0] = rank8
}

// 랭크/파일 인덱스 → 체스 칸 이름 (예: [0,0] → 'a8')
function idxToSq(r, f) {
  return 'abcdefgh'[f] + (8 - r);
}

// 체스 칸 이름 → [rank, file] (예: 'e4' → [4, 4])
function sqToIdx(sq) {
  return [8 - parseInt(sq[1]), 'abcdefgh'.indexOf(sq[0])];
}

/**
 * 특정 칸을 공격하는 기물 목록을 반환.
 * 슬라이딩 기물(R,B,Q)은 경로 차단 여부도 확인.
 * returns: [{ sq: 'e4', piece: 'R', color: 'w' }, ...]
 */
function getAttackers(board, targetR, targetF) {
  const attackers = [];

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f];
      if (!cell) continue;
      const { piece, color } = cell;
      const dr = targetR - r;
      const df = targetF - f;

      // 폰 공격
      if (piece === 'P') {
        const dir = color === 'w' ? -1 : 1; // 백폰은 위로(rank 감소), 흑폰은 아래로
        if (dr === dir && Math.abs(df) === 1) attackers.push({ sq: idxToSq(r, f), piece, color });
        continue;
      }
      // 나이트
      if (piece === 'N') {
        if ((Math.abs(dr) === 2 && Math.abs(df) === 1) || (Math.abs(dr) === 1 && Math.abs(df) === 2))
          attackers.push({ sq: idxToSq(r, f), piece, color });
        continue;
      }
      // 킹
      if (piece === 'K') {
        if (Math.abs(dr) <= 1 && Math.abs(df) <= 1 && (dr !== 0 || df !== 0))
          attackers.push({ sq: idxToSq(r, f), piece, color });
        continue;
      }
      // 슬라이딩 기물 — 방향 및 경로 확인
      const isRook   = piece === 'R';
      const isBishop = piece === 'B';
      const isQueen  = piece === 'Q';
      const straight = dr === 0 || df === 0;
      const diagonal = Math.abs(dr) === Math.abs(df);

      if ((isRook && !straight) || (isBishop && !diagonal) || (isQueen && !straight && !diagonal)) continue;

      const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
      const stepF = df === 0 ? 0 : df / Math.abs(df);
      let blocked = false;
      let cr = r + stepR, cf = f + stepF;
      while (cr !== targetR || cf !== targetF) {
        if (board[cr][cf]) { blocked = true; break; }
        cr += stepR; cf += stepF;
      }
      if (!blocked) attackers.push({ sq: idxToSq(r, f), piece, color });
    }
  }
  return attackers;
}

/**
 * 포지션 구조 인사이트를 추출해 문자열 배열로 반환.
 * AI 프롬프트에 직접 삽입할 수 있는 한국어 문장들.
 */
function extractPositionInsights(fen) {
  const insights = [];
  try {
    const board = fenToMatrix(fen);
    const turn  = fen.split(' ')[1] || 'w';

    const PIECE_KR = { P: '폰', N: '나이트', B: '비숍', R: '룩', Q: '퀸', K: '킹' };
    const COLOR_KR = { w: '백', b: '흑' };
    const OPP = { w: 'b', b: 'w' };

    // ─── 1. 칸별 압박 집계 ──────────────────────────────
    // squareControl[r][f] = { w: attackers[], b: attackers[] }
    const squareControl = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => ({ w: [], b: [] }))
    );
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const atks = getAttackers(board, r, f);
        for (const a of atks) squareControl[r][f][a.color].push(a);
      }
    }

    // ─── 2. 집중 압박 칸 감지 (3+ 기물이 한 칸 공격) ──
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const ctrl = squareControl[r][f];
        const sq   = idxToSq(r, f);
        const cell = board[r][f];

        for (const color of ['w', 'b']) {
          const atks = ctrl[color];
          if (atks.length >= 3) {
            const pieces = atks.map(a => PIECE_KR[a.piece]).join(', ');
            insights.push(`[집중 압박] ${COLOR_KR[color]}이 ${sq} 칸을 ${atks.length}개 기물(${pieces})로 집중 공격 중`);
          } else if (atks.length === 2) {
            // 고가치 기물(Q,R)이 포함된 2중 압박은 언급
            const hasHeavy = atks.some(a => a.piece === 'Q' || a.piece === 'R');
            if (hasHeavy && cell && cell.color !== color) {
              const pieces = atks.map(a => PIECE_KR[a.piece]).join('+');
              const target = PIECE_KR[cell.piece];
              insights.push(`[이중 압박] ${COLOR_KR[color]} ${pieces}가 ${sq}의 ${COLOR_KR[cell.color]} ${target}을 동시에 위협`);
            }
          }
        }

        // 수비 과부하: 한 기물이 두 칸을 동시에 지키는지는 아래 오버로딩에서 처리
        // 공격 측 수 > 수비 측 수이며 상대 기물이 있는 칸
        if (cell) {
          const atkW = ctrl['w'].length, atkB = ctrl['b'].length;
          const [attColor, defColor] = cell.color === 'w' ? ['b', 'w'] : ['w', 'b'];
          const attackCount = cell.color === 'w' ? atkB : atkW;
          const defendCount = cell.color === 'w' ? atkW : atkB;
          if (attackCount > defendCount && attackCount >= 2) {
            const atkPieces = ctrl[attColor].map(a => PIECE_KR[a.piece]).join('+');
            insights.push(`[수적 우세] ${COLOR_KR[attColor]} ${atkPieces}가 ${sq}의 ${COLOR_KR[cell.color]} ${PIECE_KR[cell.piece]}를 공격, 수비 기물(${defendCount}개) 부족`);
          }
        }
      }
    }

    // ─── 3. 배터리 감지 (같은 열/대각선에 R+R, Q+R, Q+B) ──
    // 열(파일) 배터리: R+R 또는 Q+R
    for (let f = 0; f < 8; f++) {
      const heavies = { w: [], b: [] };
      for (let r = 0; r < 8; r++) {
        const cell = board[r][f];
        if (cell && (cell.piece === 'R' || cell.piece === 'Q')) {
          heavies[cell.color].push({ piece: cell.piece, sq: idxToSq(r, f) });
        }
      }
      for (const color of ['w', 'b']) {
        const h = heavies[color];
        if (h.length >= 2) {
          const types = h.map(x => PIECE_KR[x.piece]).join('+');
          const sqs   = h.map(x => x.sq).join(', ');
          insights.push(`[배터리] ${COLOR_KR[color]} ${types}가 ${f + 1}번 파일(${sqs})에 배터리 형성`);
        }
      }
    }

    // 랭크 배터리
    for (let r = 0; r < 8; r++) {
      const heavies = { w: [], b: [] };
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (cell && (cell.piece === 'R' || cell.piece === 'Q')) {
          heavies[cell.color].push({ piece: cell.piece, sq: idxToSq(r, f) });
        }
      }
      for (const color of ['w', 'b']) {
        const h = heavies[color];
        if (h.length >= 2) {
          const types = h.map(x => PIECE_KR[x.piece]).join('+');
          const sqs   = h.map(x => x.sq).join(', ');
          insights.push(`[배터리] ${COLOR_KR[color]} ${types}가 ${8 - r}랭크(${sqs})에 배터리 형성`);
        }
      }
    }

    // 대각선 배터리: Q+B
    const diagChecked = new Set();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (!cell || (cell.piece !== 'Q' && cell.piece !== 'B')) continue;
        for (const [dr, df] of [[1,1],[1,-1]]) {
          const diagKey = `${r - dr * Math.min(r, f)}_${f - df * Math.min(r, f)}_${dr}_${df}`;
          if (diagChecked.has(diagKey)) continue;
          diagChecked.add(diagKey);
          // 대각선 전체 수집
          const diag = { w: [], b: [] };
          let cr = r, cf = f;
          while (cr >= 0 && cr < 8 && cf >= 0 && cf < 8) {
            const c = board[cr][cf];
            if (c && (c.piece === 'Q' || c.piece === 'B')) diag[c.color].push({ piece: c.piece, sq: idxToSq(cr, cf) });
            cr += dr; cf += df;
          }
          // 시작점도 포함되니 역방향도
          cr = r - dr; cf = f - df;
          while (cr >= 0 && cr < 8 && cf >= 0 && cf < 8) {
            const c = board[cr][cf];
            if (c && (c.piece === 'Q' || c.piece === 'B')) diag[c.color].push({ piece: c.piece, sq: idxToSq(cr, cf) });
            cr -= dr; cf -= df;
          }
          for (const color of ['w', 'b']) {
            const d = diag[color];
            if (d.length >= 2) {
              const types = d.map(x => PIECE_KR[x.piece]).join('+');
              const sqs   = d.map(x => x.sq).join(', ');
              insights.push(`[대각 배터리] ${COLOR_KR[color]} ${types}(${sqs})가 같은 대각선에 배치`);
            }
          }
        }
      }
    }

    // ─── 4. 열린 파일 독점 ──────────────────────────────
    for (let f = 0; f < 8; f++) {
      let hasWpawn = false, hasBpawn = false;
      const rooks = { w: [], b: [] };
      for (let r = 0; r < 8; r++) {
        const cell = board[r][f];
        if (!cell) continue;
        if (cell.piece === 'P') {
          if (cell.color === 'w') hasWpawn = true; else hasBpawn = true;
        }
        if (cell.piece === 'R' || cell.piece === 'Q') rooks[cell.color].push(PIECE_KR[cell.piece]);
      }
      const fileLetter = 'abcdefgh'[f];
      if (!hasWpawn && !hasBpawn) {
        // 완전 열린 파일
        if (rooks.w.length > 0 && rooks.b.length === 0)
          insights.push(`[열린 파일 독점] 백 ${rooks.w.join('+')}가 ${fileLetter}파일을 단독 지배 (상대 중기물 없음)`);
        else if (rooks.b.length > 0 && rooks.w.length === 0)
          insights.push(`[열린 파일 독점] 흑 ${rooks.b.join('+')}가 ${fileLetter}파일을 단독 지배 (상대 중기물 없음)`);
      } else if (!hasWpawn && rooks.b.length > 0) {
        // 반열린 파일 (백 폰 없음, 흑 룩 있음)
        insights.push(`[반열린 파일] 흑 ${rooks.b.join('+')}가 ${fileLetter}파일 반열린 파일 장악 (백 폰 부재)`);
      } else if (!hasBpawn && rooks.w.length > 0) {
        insights.push(`[반열린 파일] 백 ${rooks.w.join('+')}가 ${fileLetter}파일 반열린 파일 장악 (흑 폰 부재)`);
      }
    }

    // ─── 5. 아웃포스트 (상대 폰이 공격 못하는 중앙 나이트/비숍) ──
    const CENTER = [[2,2],[2,3],[2,4],[2,5],[3,2],[3,3],[3,4],[3,5],[4,2],[4,3],[4,4],[4,5],[5,2],[5,3],[5,4],[5,5]];
    for (const [r, f] of CENTER) {
      const cell = board[r][f];
      if (!cell || (cell.piece !== 'N' && cell.piece !== 'B')) continue;
      const { color } = cell;
      const opp = OPP[color];
      // 상대 폰이 이 칸을 공격할 수 있는지
      const oppPawnDir = opp === 'w' ? -1 : 1;
      const pawnAtk1 = board[r + oppPawnDir]?.[f - 1];
      const pawnAtk2 = board[r + oppPawnDir]?.[f + 1];
      const underPawnAttack =
        (pawnAtk1 && pawnAtk1.piece === 'P' && pawnAtk1.color === opp) ||
        (pawnAtk2 && pawnAtk2.piece === 'P' && pawnAtk2.color === opp);
      if (!underPawnAttack) {
        insights.push(`[아웃포스트] ${COLOR_KR[color]} ${PIECE_KR[cell.piece]}(${idxToSq(r, f)})가 상대 폰의 공격을 받지 않는 중앙 아웃포스트 장악`);
      }
    }

    // ─── 6. 킹 안전 ─────────────────────────────────────
    for (const color of ['w', 'b']) {
      let kingR = -1, kingF = -1;
      outer: for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const c = board[r][f];
          if (c && c.piece === 'K' && c.color === color) { kingR = r; kingF = f; break outer; }
        }
      }
      if (kingR < 0) continue;
      const opp = OPP[color];

      // 킹 주변 2×3 구역(킹사이드/퀸사이드 기준) 폰 방패 확인
      const shieldR = color === 'w' ? kingR - 1 : kingR + 1; // 폰이 있어야 할 랭크
      if (shieldR >= 0 && shieldR < 8) {
        let missingShields = 0;
        for (let sf = Math.max(0, kingF - 1); sf <= Math.min(7, kingF + 1); sf++) {
          const shield = board[shieldR][sf];
          if (!shield || shield.piece !== 'P' || shield.color !== color) missingShields++;
        }
        if (missingShields >= 2) {
          insights.push(`[킹 안전 위협] ${COLOR_KR[color]} 킹(${idxToSq(kingR, kingF)}) 앞 폰 방패 ${missingShields}개 부재 — 킹이 노출됨`);
        }
      }

      // 킹이 있는 파일 또는 인접 파일이 열려있고 상대 중기물이 있는지
      for (let df = -1; df <= 1; df++) {
        const cf = kingF + df;
        if (cf < 0 || cf > 7) continue;
        let friendlyPawn = false, enemyHeavy = false;
        for (let r = 0; r < 8; r++) {
          const c = board[r][cf];
          if (!c) continue;
          if (c.piece === 'P' && c.color === color) friendlyPawn = true;
          if ((c.piece === 'R' || c.piece === 'Q') && c.color === opp) enemyHeavy = true;
        }
        if (!friendlyPawn && enemyHeavy) {
          const fileLetter = 'abcdefgh'[cf];
          insights.push(`[킹 안전 위협] ${COLOR_KR[color]} 킹 인접 ${fileLetter}파일 열려있고 ${COLOR_KR[opp]} 중기물 존재 — 직접 공격 가능`);
        }
      }

      // 상대방 기물이 킹 주변 칸을 공격하는 수 집계
      let kingZoneAttacks = 0;
      for (let dr = -2; dr <= 2; dr++) {
        for (let df = -2; df <= 2; df++) {
          const nr = kingR + dr, nf = kingF + df;
          if (nr < 0 || nr > 7 || nf < 0 || nf > 7) continue;
          const atks = squareControl[nr][nf][opp];
          if (atks.some(a => a.piece !== 'P')) kingZoneAttacks++;
        }
      }
      if (kingZoneAttacks >= 4) {
        insights.push(`[킹존 압박] ${COLOR_KR[opp]}이 ${COLOR_KR[color]} 킹 주변 ${kingZoneAttacks}개 칸을 공격 — 킹사이드 공격 위험`);
      }
    }

    // ─── 7. 폰 구조 ─────────────────────────────────────
    const pawns = { w: [], b: [] };
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const c = board[r][f];
        if (c && c.piece === 'P') pawns[c.color].push({ r, f, sq: idxToSq(r, f) });
      }
    }

    for (const color of ['w', 'b']) {
      const opp = OPP[color];
      const myPawns   = pawns[color];
      const oppPawns  = pawns[opp];

      // 고립 폰
      for (const p of myPawns) {
        const hasNeighbor = myPawns.some(q => q.f === p.f - 1 || q.f === p.f + 1);
        if (!hasNeighbor) {
          insights.push(`[고립 폰] ${COLOR_KR[color]} ${p.sq} 폰 고립 (인접 파일 아군 폰 없음) — 장기적 약점`);
        }
      }

      // 이중 폰
      const fileCount = {};
      for (const p of myPawns) fileCount[p.f] = (fileCount[p.f] || 0) + 1;
      for (const [f, cnt] of Object.entries(fileCount)) {
        if (cnt >= 2) {
          insights.push(`[이중 폰] ${COLOR_KR[color]} ${'abcdefgh'[f]}파일에 폰 ${cnt}개 중첩 — 구조적 약점`);
        }
      }

      // 통과 폰 (passed pawn)
      for (const p of myPawns) {
        const advDir = color === 'w' ? -1 : 1;
        const isBlocked = oppPawns.some(q =>
          (q.f === p.f || q.f === p.f - 1 || q.f === p.f + 1) &&
          (color === 'w' ? q.r < p.r : q.r > p.r)
        );
        if (!isBlocked) {
          const rankLabel = 8 - p.r;
          insights.push(`[통과 폰] ${COLOR_KR[color]} ${p.sq} 통과 폰 — 상대 폰이 막지 못함, 승진 가능성`);
        }
      }
    }

    // ─── 8. 기물 과부하 (한 기물이 2개 칸 동시 수비) ──
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const defender = board[r][f];
        if (!defender || defender.piece === 'K' || defender.piece === 'P') continue;
        const { color } = defender;
        const defSq = idxToSq(r, f);

        // 이 기물이 방어하는 아군 기물 칸 목록
        const guarding = [];
        for (let tr = 0; tr < 8; tr++) {
          for (let tf = 0; tf < 8; tf++) {
            if (tr === r && tf === f) continue;
            const target = board[tr][tf];
            if (!target || target.color !== color || target.piece === 'P') continue;
            // defender가 target 칸을 공격(=방어)하는지
            const atks = squareControl[tr][tf][color];
            if (atks.some(a => a.sq === defSq)) {
              // target이 상대에게 공격받고 있는지
              const underAttack = squareControl[tr][tf][OPP[color]].length > 0;
              if (underAttack) guarding.push({ sq: idxToSq(tr, tf), piece: target.piece });
            }
          }
        }
        if (guarding.length >= 2) {
          const guardList = guarding.map(g => `${PIECE_KR[g.piece]}(${g.sq})`).join(', ');
          insights.push(`[기물 과부하] ${COLOR_KR[color]} ${PIECE_KR[defender.piece]}(${defSq})가 ${guardList}를 동시에 수비 중 — 과부하 상태`);
        }
      }
    }

    // ─── 9. 주도권 (템포) — 공격 위협이 더 많은 쪽 ──
    let wThreats = 0, bThreats = 0;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (!cell) continue;
        if (cell.color === 'b') wThreats += squareControl[r][f]['w'].length;
        if (cell.color === 'w') bThreats += squareControl[r][f]['b'].length;
      }
    }
    if (wThreats > bThreats + 3)
      insights.push(`[주도권] 백이 흑 기물에 대해 공격 우세 (공격 ${wThreats} vs ${bThreats}) — 이니셔티브 보유`);
    else if (bThreats > wThreats + 3)
      insights.push(`[주도권] 흑이 백 기물에 대해 공격 우세 (공격 ${bThreats} vs ${wThreats}) — 이니셔티브 보유`);

    // ─── 10. 킹사이드/퀸사이드 전장 판단 ──────────────
    // 각 색의 기물(폰 제외)이 킹사이드(e~h파일)와 퀸사이드(a~d파일)에 몇 개 있는지 집계
    for (const color of ['w', 'b']) {
      let kingSidePieces = 0, queenSidePieces = 0;
      let kingSidePawns = 0, queenSidePawns = 0;
      let kingFile = -1;
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const c = board[r][f];
          if (!c || c.color !== color) continue;
          if (c.piece === 'K') { kingFile = f; continue; }
          if (c.piece === 'P') {
            if (f >= 4) kingSidePawns++; else queenSidePawns++;
            continue;
          }
          if (f >= 4) kingSidePieces++; else queenSidePieces++;
        }
      }
      const opp = OPP[color];
      // 상대 킹 위치 파악
      let oppKingFile = -1;
      outer2: for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const c = board[r][f];
          if (c && c.piece === 'K' && c.color === opp) { oppKingFile = f; break outer2; }
        }
      }

      const ksDiff = kingSidePieces - queenSidePieces;
      const pawnDiff = kingSidePawns - queenSidePawns;

      if (ksDiff >= 2 || (ksDiff >= 1 && pawnDiff >= 2)) {
        insights.push(`[전장 판단] ${COLOR_KR[color]} 기물이 킹사이드(e~h파일)에 집중 — 킹사이드 공격 전개 중`);
      } else if (ksDiff <= -2 || (ksDiff <= -1 && pawnDiff <= -2)) {
        insights.push(`[전장 판단] ${COLOR_KR[color]} 기물이 퀸사이드(a~d파일)에 집중 — 퀸사이드 공격 전개 중`);
      }

      // 상대 킹이 한쪽에 있고 아군 기물이 그쪽에 집중돼 있으면 직접 언급
      if (oppKingFile >= 0) {
        const oppKingSide = oppKingFile >= 4 ? 'king' : 'queen';
        if (oppKingSide === 'king' && kingSidePieces >= 3) {
          insights.push(`[공격 방향] ${COLOR_KR[opp]} 킹이 킹사이드에 위치, ${COLOR_KR[color]} 기물 3개 이상이 킹사이드 집중 — 킹사이드 직접 공격 가능`);
        } else if (oppKingSide === 'queen' && queenSidePieces >= 3) {
          insights.push(`[공격 방향] ${COLOR_KR[opp]} 킹이 퀸사이드에 위치, ${COLOR_KR[color]} 기물 3개 이상이 퀸사이드 집중 — 퀸사이드 직접 공격 가능`);
        }
      }
    }

    // ─── 11. 전술 패턴 감지 ───────────────────────────

    // 포크 감지: 한 기물이 상대 기물 2개 이상을 동시에 공격
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const attacker = board[r][f];
        if (!attacker || attacker.piece === 'K') continue;
        const { color } = attacker;
        const opp = OPP[color];
        const attackerSq = idxToSq(r, f);
        // 이 기물이 공격하는 상대 기물 목록
        const forkedTargets = [];
        for (let tr = 0; tr < 8; tr++) {
          for (let tf = 0; tf < 8; tf++) {
            const target = board[tr][tf];
            if (!target || target.color !== opp) continue;
            if (target.piece === 'P') continue; // 폰은 포크 대상에서 제외(가치 낮음)
            const atks = squareControl[tr][tf][color];
            if (atks.some(a => a.sq === attackerSq)) {
              forkedTargets.push({ sq: idxToSq(tr, tf), piece: target.piece });
            }
          }
        }
        if (forkedTargets.length >= 2) {
          const targets = forkedTargets.map(t => `${PIECE_KR[t.piece]}(${t.sq})`).join(', ');
          insights.push(`[포크] ${COLOR_KR[color]} ${PIECE_KR[attacker.piece]}(${attackerSq})가 ${targets}를 동시에 공격 — 포크 상황`);
        }
      }
    }

    // 추크추방(Zwischenzug) 가능성: 상대가 반드시 응수해야 할 중간 위협이 있는지
    // 간이 감지: 상대 킹이 체크 위협을 받고 있으면서 동시에 다른 고가치 기물도 공격받는 경우
    for (const color of ['w', 'b']) {
      const opp = OPP[color];
      let oppKingR = -1, oppKingF = -1;
      outer3: for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const c = board[r][f];
          if (c && c.piece === 'K' && c.color === opp) { oppKingR = r; oppKingF = f; break outer3; }
        }
      }
      if (oppKingR < 0) continue;
      const kingAtks = squareControl[oppKingR][oppKingF][color];
      if (kingAtks.length > 0) {
        // 킹 위협 동시에 다른 고가치 기물도 공격받고 있으면 추크추방 환경
        for (let r = 0; r < 8; r++) {
          for (let f = 0; f < 8; f++) {
            const target = board[r][f];
            if (!target || target.color !== opp || (target.piece !== 'Q' && target.piece !== 'R')) continue;
            const targetAtks = squareControl[r][f][color];
            if (targetAtks.length > 0) {
              insights.push(`[추크추방] ${COLOR_KR[color]}이 ${COLOR_KR[opp]} 킹 체크 위협과 ${PIECE_KR[target.piece]}(${idxToSq(r,f)}) 공격을 동시에 보유 — 중간 수(추크추방) 가능성`);
            }
          }
        }
      }
    }

    // 디스커버드 어택(발견 공격) 감지: 슬라이딩 기물 앞에 아군 기물이 있고, 그 아군이 움직이면 뒤 슬라이더가 고가치 기물을 직격
    for (const color of ['w', 'b']) {
      const opp = OPP[color];
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const slider = board[r][f];
          if (!slider || slider.color !== color) continue;
          if (slider.piece !== 'R' && slider.piece !== 'B' && slider.piece !== 'Q') continue;

          const dirs = slider.piece === 'R' ? [[0,1],[0,-1],[1,0],[-1,0]]
                     : slider.piece === 'B' ? [[1,1],[1,-1],[-1,1],[-1,-1]]
                     : [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];

          for (const [dr, df] of dirs) {
            let cr = r + dr, cf = f + df;
            let blocker = null;
            while (cr >= 0 && cr < 8 && cf >= 0 && cf < 8) {
              const c = board[cr][cf];
              if (c) {
                if (!blocker && c.color === color && c.piece !== 'K') {
                  blocker = { r: cr, f: cf, piece: c.piece, sq: idxToSq(cr, cf) };
                } else if (blocker && c.color === opp && (c.piece === 'Q' || c.piece === 'R' || c.piece === 'K')) {
                  insights.push(`[디스커버드 어택] ${COLOR_KR[color]} ${PIECE_KR[blocker.piece]}(${blocker.sq})가 움직이면 뒤 ${PIECE_KR[slider.piece]}(${idxToSq(r,f)})가 ${COLOR_KR[opp]} ${PIECE_KR[c.piece]}(${idxToSq(cr,cf)})를 발견 공격`);
                  break;
                } else {
                  break;
                }
              }
              cr += dr; cf += df;
            }
          }
        }
      }
    }

    // ─── 12. 폰 구조 상세 분석 ───────────────────────────
    // 뒤처진 폰(Backward Pawn)
    for (const color of ['w', 'b']) {
      const opp = OPP[color];
      const myPawns = pawns[color];
      const advDir = color === 'w' ? -1 : 1; // rank 감소 = 전진(백), rank 증가 = 전진(흑)

      for (const p of myPawns) {
        // 인접 파일에 아군 폰이 있는지
        const hasSideNeighbor = myPawns.some(q => (q.f === p.f - 1 || q.f === p.f + 1));
        if (!hasSideNeighbor) continue; // 고립 폰은 별도 처리

        // 뒤처진 폰: 인접 폰보다 뒤에 있고, 전진하면 상대 폰 공격을 받음
        const aheadR = p.r + advDir;
        if (aheadR < 0 || aheadR > 7) continue;
        const oppPawnLeft  = board[aheadR]?.[p.f - 1];
        const oppPawnRight = board[aheadR]?.[p.f + 1];
        const attackedIfAdvance =
          (oppPawnLeft  && oppPawnLeft.piece  === 'P' && oppPawnLeft.color  === opp) ||
          (oppPawnRight && oppPawnRight.piece === 'P' && oppPawnRight.color === opp);

        // 인접 아군 폰이 이미 더 앞에 있는지
        const neighborAhead = myPawns.some(q =>
          (q.f === p.f - 1 || q.f === p.f + 1) &&
          (color === 'w' ? q.r < p.r : q.r > p.r)
        );

        if (attackedIfAdvance && neighborAhead) {
          insights.push(`[뒤처진 폰] ${COLOR_KR[color]} ${p.sq} 폰은 전진하면 상대 폰 공격을 받고 인접 아군 폰 지원이 없음 — 장기적 약점`);
        }
      }

      // 폰 사슬(Pawn Chain) — 대각선으로 연결된 폰 3개 이상
      const sortedPawns = [...myPawns].sort((a, b) => color === 'w' ? b.r - a.r : a.r - b.r);
      let chainLen = 1;
      for (let i = 1; i < sortedPawns.length; i++) {
        const prev = sortedPawns[i - 1];
        const curr = sortedPawns[i];
        if (Math.abs(curr.f - prev.f) === 1 && Math.abs(curr.r - prev.r) === 1) {
          chainLen++;
        } else {
          if (chainLen >= 3) {
            insights.push(`[폰 사슬] ${COLOR_KR[color]} 폰이 대각선 사슬 ${chainLen}개 형성 — 공간 통제력 높음, 기물 교환 자제 권장`);
          }
          chainLen = 1;
        }
      }
      if (chainLen >= 3) {
        insights.push(`[폰 사슬] ${COLOR_KR[color]} 폰이 대각선 사슬 ${chainLen}개 형성 — 공간 통제력 높음, 기물 교환 자제 권장`);
      }

      // 폰 구조 기반 영역 우세 (킹사이드/퀸사이드 폰 수 우세)
      const myKS = myPawns.filter(p => p.f >= 4).length;
      const myQS = myPawns.filter(p => p.f < 4).length;
      const oppKS = pawns[opp].filter(p => p.f >= 4).length;
      const oppQS = pawns[opp].filter(p => p.f < 4).length;
      if (myKS > oppKS + 1) {
        insights.push(`[폰 영역 우세] ${COLOR_KR[color]}이 킹사이드 폰 수적 우세(${myKS} vs ${oppKS}) — 마이너리티 공격 또는 킹사이드 공세 가능`);
      }
      if (myQS > oppQS + 1) {
        insights.push(`[폰 영역 우세] ${COLOR_KR[color]}이 퀸사이드 폰 수적 우세(${myQS} vs ${oppQS}) — 마이너리티 공격 또는 퀸사이드 공세 가능`);
      }

      // 마이너리티 공격: 상대가 폰 수 우세인 쪽에 아군 폰이 더 적어 폰 교환으로 약점 생성 가능
      if (myKS < oppKS && myKS >= 1 && oppKS >= 2) {
        insights.push(`[마이너리티 공격] ${COLOR_KR[color]}이 킹사이드에 폰 소수(${myKS})로 ${COLOR_KR[opp]} 폰 다수(${oppKS}) 공격 — 마이너리티 공격으로 약점 생성 가능`);
      }
      if (myQS < oppQS && myQS >= 1 && oppQS >= 2) {
        insights.push(`[마이너리티 공격] ${COLOR_KR[color]}이 퀸사이드에 폰 소수(${myQS})로 ${COLOR_KR[opp]} 폰 다수(${oppKS}) 공격 — 마이너리티 공격으로 약점 생성 가능`);
      }

      // a3/a4, h3/h6 예방적 폰 전진 감지 (비숍 핀 예방 + 공간 확장)
      for (const p of myPawns) {
        const fileLetter = 'abcdefgh'[p.f];
        const rankNum = 8 - p.r;
        // 백: a3, a4, h3 / 흑: a6, a5, h6
        const isPreventivePush =
          (color === 'w' && ((p.f === 0 && (rankNum === 3 || rankNum === 4)) || (p.f === 7 && rankNum === 3))) ||
          (color === 'b' && ((p.f === 0 && (rankNum === 6 || rankNum === 5)) || (p.f === 7 && rankNum === 6)));
        if (isPreventivePush) {
          insights.push(`[예방 전진] ${COLOR_KR[color]} ${p.sq} 폰 — 오프닝 비숍 핀 예방 + 미들/엔드게임 측면 공간 확장(${p.f === 0 ? '퀸사이드' : '킹사이드'} 공격 발판) 가능`);
        }
      }
    }

    // ─── 13. 기물 동적 가치 평가 (위치 기반) ────────────
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (!cell) continue;
        const { piece, color } = cell;
        const sq = idxToSq(r, f);
        const rankNum = 8 - r; // 백 기준 랭크 번호 (1=백홈, 8=흑홈)
        const opp = OPP[color];

        // 폰 7랭크 도달 — 승진 직전, 가치 최고조
        if (piece === 'P') {
          const promotionRank = color === 'w' ? 2 : 7; // rank index: 백7랭크=r1, 흑7랭크=r6
          const actualRank = color === 'w' ? rankNum : 9 - rankNum;
          if (actualRank === 7) {
            insights.push(`[기물 가치↑] ${COLOR_KR[color]} 폰(${sq})이 7랭크 도달 — 승진 위협으로 기물 가치 최고조, 상대는 즉각 저지 필요`);
          }
        }

        // 나이트: 7랭크 또는 중앙 아웃포스트
        if (piece === 'N') {
          const actualRank = color === 'w' ? rankNum : 9 - rankNum;
          if (actualRank >= 5) {
            const oppPawnDir = opp === 'w' ? -1 : 1;
            const pawnThreat1 = board[r + oppPawnDir]?.[f - 1];
            const pawnThreat2 = board[r + oppPawnDir]?.[f + 1];
            const safe = !(
              (pawnThreat1 && pawnThreat1.piece === 'P' && pawnThreat1.color === opp) ||
              (pawnThreat2 && pawnThreat2.piece === 'P' && pawnThreat2.color === opp)
            );
            if (safe) {
              insights.push(`[기물 가치↑] ${COLOR_KR[color]} 나이트(${sq})가 ${actualRank}랭크 안전 전진 — 상대 진영 깊숙이 침투, 공격 기여도 높음`);
            }
          }
          // 나이트 중앙 근접도
          const centerDist = Math.max(Math.abs(f - 3.5), Math.abs(r - 3.5));
          if (centerDist < 1.5) {
            insights.push(`[기물 가치↑] ${COLOR_KR[color]} 나이트(${sq})가 중앙 근접 — 영향력 최대, 8개 이동 가능`);
          }
        }

        // 비숍: 오픈 대각선 또는 자기 폰과 다른 색 칸
        if (piece === 'B') {
          const bishopColorLight = (r + f) % 2 === 0; // 비숍이 밝은 칸에 있는지
          // 같은 색 폰이 비숍 길을 막고 있는지 계산
          let blockedCount = 0, openCount = 0;
          let myPawnCount = 0;
          const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
          for (const [dr, df] of dirs) {
            let cr = r + dr, cf = f + df;
            while (cr >= 0 && cr < 8 && cf >= 0 && cf < 8) {
              const c = board[cr][cf];
              if (c) {
                if (c.piece === 'P' && c.color === color) blockedCount++;
                else openCount++;
                break;
              }
              openCount++;
              cr += dr; cf += df;
            }
          }
          // 아군 폰이 비숍과 같은 색 칸에 있으면 bad bishop
          let samColorPawns = 0;
          for (const p of pawns[color]) {
            if ((p.r + p.f) % 2 === bishopColorLight % 2) samColorPawns++;
          }
          if (blockedCount === 0 && openCount >= 4) {
            insights.push(`[기물 가치↑] ${COLOR_KR[color]} 비숍(${sq})의 대각선이 완전히 열려있음 — 장거리 공격력 극대화`);
          } else if (samColorPawns >= 3) {
            insights.push(`[기물 가치↓] ${COLOR_KR[color]} 비숍(${sq})과 같은 색 칸에 아군 폰 ${samColorPawns}개 — 배드 비숍, 영향력 제한`);
          }
        }

        // 룩: 열린 파일 또는 7랭크
        if (piece === 'R') {
          const actualRank = color === 'w' ? rankNum : 9 - rankNum;
          // 7랭크 룩
          if (actualRank === 7) {
            insights.push(`[기물 가치↑] ${COLOR_KR[color]} 룩(${sq})이 7랭크 침투 — 상대 폰 위협 및 킹 압박, 강력한 위치`);
          }
          // 열린 파일 여부는 섹션 4에서 이미 처리, 여기서는 반열린 파일 가치만 추가
          let hasFriendlyPawn = false;
          for (let tr = 0; tr < 8; tr++) {
            const c = board[tr][f];
            if (c && c.piece === 'P' && c.color === color) { hasFriendlyPawn = true; break; }
          }
          if (!hasFriendlyPawn) {
            const fileLetter = 'abcdefgh'[f];
            insights.push(`[기물 가치↑] ${COLOR_KR[color]} 룩(${sq})이 반열린 ${fileLetter}파일 장악 — 상대 폰 직접 압박 가능`);
          }
        }
      }
    }

  } catch(e) {
    console.warn('[PositionInsights] 분석 오류:', e);
  }

  return insights;
}

// ══════════════════════════════════════════════════════
// 핵심: 포지션 해설 자동 실행
// ══════════════════════════════════════════════════════

/** 방치 시 위협(Null Move Threat) 계산 */
async function getNullMoveThreat(fen, moveUci) {
  if (!moveUci || typeof window.uciToMove !== 'function' || typeof window.applyMoveToBoard !== 'function') return null;
  try {
    const parts = fen.split(' ');
    const board = window.parseFenBoard(parts[0]);
    const turn  = parts[1];
    const cast  = window.parseFenCastling(parts[2]);
    const ep    = window.parseFenEP(parts[3]);
    
    const move = window.uciToMove(moveUci, board, turn, cast, ep);
    if (!move) return null;
    
    const boardAfter = window.applyMoveToBoard(board.map(r=>[...r]), move, turn);
    // 차례를 다시 mover로 고정 (Null Move)
    const nullFen = window.boardToFen(boardAfter, turn, cast, null, 0, 1);
    
    return new Promise(resolve => {
      // engine.js의 기능을 빌려 짧게 분석
      if (typeof window.executeEnginePlayMove !== 'function') return resolve(null);
      window.executeEnginePlayMove(nullFen, (bestUci) => {
        resolve(bestUci);
      }, 800); // 0.8초 분석
    });
  } catch(e) {
    console.warn('[Coach] Null Move Threat 계산 실패:', e);
    return null;
  }
}

// 스톡피시 라인이 충분한지 검사 (최소 1수 이상 있으면 시작)
function hasEnoughLines(ctx) {
  // FEN 동기화 확인: 엔진 결과(pvDataFen)가 현재 포지션(ctx.fen)과 일치해야 함
  if (typeof normFen !== 'function') return false;
  const currentFen = normFen(ctx.fen);
  const engineFen  = window.pvDataFen ? normFen(window.pvDataFen) : '';
  
  if (engineFen !== currentFen) return false;

  const pv1 = window.pvData && window.pvData[1];
  const len1 = pv1 && pv1.moves ? pv1.moves.length : 0;
  return len1 >= 1;
}

// 스톡피시에 더 깊은 분석 요청 (엔진이 이미 실행 중이라고 가정)
// pvData가 업데이트될 때까지 최대 5초 대기
async function waitForDeepLines(ctx, maxWaitMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (hasEnoughLines(ctx)) return true;
    await new Promise(r => setTimeout(r, 300));
    // 컨텍스트 재빌드해서 최신 pvData 반영
    const newCtx = buildChessContext();
    if (newCtx) {
      ctx.bestLine = newCtx.bestLine;
      ctx.line2    = newCtx.line2;
      ctx.line3    = newCtx.line3;
      ctx.positionBrief = newCtx.positionBrief;
    }
  }
  return false;
}

// 메인 해설 실행 함수 (패널을 열거나 수를 둘 때 호출)
async function runPositionCommentary() {
  if (coachLoading) return;
  if (!coachApiKey) return;

  // 인라인 패널 열기
  const inlinePanel = document.getElementById('coach-inline');
  if (inlinePanel) inlinePanel.classList.add('visible');
  const coachBtn = document.getElementById('coach-open-btn');
  if (coachBtn) coachBtn.classList.add('active');
  const boardAreaRpc = document.getElementById('board-area');
  if (boardAreaRpc) boardAreaRpc.classList.add('coach-open');
  coachOpen = true;

  const ctx = buildChessContext();
  if (!ctx) return;

  coachLoading = true;
  updateCoachUI({
    html: `<div class="coach-dots"><span></span><span></span><span></span></div> 스톡피시 라인 수집 중...`,
    className: 'loading',
    show: true
  });

  try {
    // 스톡피시 라인이 부족하면 대기
    if (!hasEnoughLines(ctx)) {
      updateCoachUI({ html: `<div class="coach-dots"><span></span><span></span><span></span></div> 스톡피시 깊은 분석 대기 중...` });
      await waitForDeepLines(ctx, 8000);
    }

    // 최신 컨텍스트 다시 빌드 (라인이 갱신됐을 수 있음)
    let freshCtx = buildChessContext();

    // ── 신규: 방치 시 위협 분석 (Null Move Threat) ──
    const pv1 = (freshCtx.pvData && freshCtx.pvData[1]) || (window.pvData && window.pvData[1]);
    const m1Uci = pv1 && pv1.pv ? pv1.pv[0] : (pv1 && pv1.moves ? pv1.moves[0] : null);
    
    if (m1Uci) {
      updateCoachUI({ html: `<div class="coach-dots"><span></span><span></span><span></span></div> 최선수 위협 분석 중...` });
      const threatUci = await getNullMoveThreat(freshCtx.fen, m1Uci);
      if (threatUci) {
        // 브리프 재빌드 시 위협 데이터 포함
        freshCtx.nullMoveThreatUci = threatUci;
        if (typeof buildPositionBrief === 'function') {
           const pv1Uci = pv1 && (pv1.pv || pv1.moves) ? (pv1.pv || pv1.moves) : [];
           const pv2 = (freshCtx.pvData && freshCtx.pvData[2]) || (window.pvData && window.pvData[2]);
           const pv2Uci = pv2 && (pv2.pv || pv2.moves) ? (pv2.pv || pv2.moves) : [];
           
           freshCtx.positionBrief = buildPositionBrief({
             ...freshCtx,
             pv1Uci,
             pv2Uci,
             nullMoveThreatUci: threatUci
           });
        }
      }
    }

    // 위협 패널이 아직 로딩 중이면 완료까지 대기 (최대 4초)
    if (threatLoading) {
      updateCoachUI({ html: `<div class="coach-dots"><span></span><span></span><span></span></div> 위협 분석 완료 대기 중...` });
      const tStart = Date.now();
      while (threatLoading && Date.now() - tStart < 4000) {
        await new Promise(r => setTimeout(r, 300));
      }
      // 위협 데이터가 반영된 최신 컨텍스트로 재빌드
      freshCtx = buildChessContext();
    }

    updateCoachUI({ html: `<div class="coach-dots"><span></span><span></span><span></span></div> AI 해설 생성 중...` });

    const answer = await callCommentaryAPI(freshCtx);
    const cleaned = sanitizeAnswer(answer, freshCtx);

    updateCoachUI({
      html: formatCommentary(cleaned),
      className: '',
      show: true
    });

    renderCoachSidebar(cleaned);
  } catch (err) {
    updateCoachUI({
      html: `<span style="color:var(--accent-red)">⚠️ 오류: ${err.message}</span>`,
      className: '',
      show: true
    });
    console.error('[Coach] 해설 오류:', err);
  } finally {
    coachLoading = false;
  }
}

// 수동 질문 (사용자가 직접 입력한 질문)
async function askCoach(source) {
  if (coachLoading) return;
  if (!coachApiKey) {
    showToast('⚠️ API 키를 먼저 입력하고 저장하세요');
    const keyInput = document.getElementById('coach-api-input');
    if (keyInput) keyInput.focus();
    return;
  }

  const inputId = (source === 'tab') ? 'coach-input-tab' : 'coach-input';
  const inputEl = document.getElementById(inputId);
  const userQuestion = inputEl ? inputEl.value.trim() : '';
  
  if (!userQuestion) {
    showToast('질문을 입력하세요');
    return;
  }

  const context = buildChessContext();
  if (!context) {
    showToast('게임 데이터를 불러올 수 없습니다');
    return;
  }

  coachLoading = true;
  const btnId = (source === 'tab') ? 'coach-ask-btn-tab' : 'coach-ask-btn';
  const btnEl = document.getElementById(btnId);
  if (btnEl) btnEl.disabled = true;

  // 인라인 패널 열기 (데스크탑 용)
  if (source !== 'tab') {
    const inlinePanel = document.getElementById('coach-inline');
    if (inlinePanel) inlinePanel.classList.add('visible');
    const coachBtn2 = document.getElementById('coach-open-btn');
    if (coachBtn2) coachBtn2.classList.add('active');
    const boardAreaAsk = document.getElementById('board-area');
    if (boardAreaAsk) boardAreaAsk.classList.add('coach-open');
    coachOpen = true;
  }

  updateCoachUI({
    html: `<div class="coach-dots"><span></span><span></span><span></span></div> AI 코치가 분석 중입니다...`,
    className: 'loading',
    show: true
  });

  try {
    // 라인이 부족하면 대기
    if (!hasEnoughLines(context)) {
      await waitForDeepLines(context, 5000);
    }
    const freshCtx = buildChessContext();
    const prompt = buildCoachPrompt(freshCtx, userQuestion);
    const answer = await callGroqAPI(prompt);
    const cleaned = sanitizeAnswer(answer, freshCtx);
    
    updateCoachUI({
      html: formatCommentary(cleaned),
      className: '',
      show: true
    });
    
    renderCoachSidebar(cleaned);
  } catch (err) {
    updateCoachUI({
      html: `<span style="color:var(--accent-red)">⚠️ 오류: ${err.message}</span>`,
      className: '',
      show: true
    });
    console.error('[Coach] API 오류:', err);
  } finally {
    coachLoading = false;
    if (btnEl) btnEl.disabled = false;
  }
}

// ══════════════════════════════════════════════════════
// 프롬프트 빌더 — 체스인사이드 스타일 해설 요청
// ══════════════════════════════════════════════════════

/** UCI 엔진 라인 → SAN (프롬프트용)
 * 수순에 누구 차례인지 (백)/(흑) 라벨을 붙여 AI가 헷갈리지 않게 함.
 */
function engineLineSanWithLabels(ctx, pv, maxLen) {
  if (!pv || typeof uciMovesToSan !== 'function') return null;
  
  let uciList = pv.pv || pv.moves || [];
  if (!uciList || !uciList.length) return null;

  const parts = ctx.fen.trim().split(/\s+/);
  const board = parseFenBoard(parts[0]);
  if (!board) return null;
  
  const sanList = uciMovesToSan(
    uciList.slice(0, maxLen || 8),
    board,
    parts[1] || 'w',
    parseFenCastling(parts[2] || '-'),
    parseFenEP(parts[3] || '-')
  );

  if (!sanList.length) return null;

  let currentTurn = parts[1] || 'w';
  return sanList.map((san, i) => {
    const label = currentTurn === 'w' ? '(백)' : '(흑)';
    const res = `${i + 1}. ${san} ${label}`;
    currentTurn = currentTurn === 'w' ? 'b' : 'w';
    return res;
  }).join(' ');
}

function buildCommentaryPrompt(ctx) {
  const lines = [];

  // pvData에서 직접 최신 라인 읽기 (ctx.pvData 우선, 없으면 window.pvData)
  const pvDataToUse = ctx.pvData || window.pvData;
  
  const livePv1 = pvDataToUse && pvDataToUse[1];
  const livePv2 = pvDataToUse && pvDataToUse[2];
  const livePv3 = pvDataToUse && pvDataToUse[3];

  const liveBestLine = engineLineSanWithLabels(ctx, livePv1, 8) || ctx.bestLine;
  const liveLine2    = engineLineSanWithLabels(ctx, livePv2, 6) || ctx.line2;
  const liveLine3    = engineLineSanWithLabels(ctx, livePv3, 6) || ctx.line3;

  const hasEngineLine = !!(liveBestLine && liveBestLine.trim());
  const firstTurnLabel  = ctx.turn === 'w' ? '백' : '흑';
  const lastMoverLabel  = ctx.turn === 'w' ? '흑' : '백';

  lines.push(`[현재 국면 정보]`);
  lines.push(`지금 차례: ${firstTurnLabel} (AI는 ${firstTurnLabel}의 입장에서 해설해야 함)`);
  lines.push(`게임 단계: ${ctx.phase} | 진행 수: ${ctx.moveCount}수`);
  lines.push(`현재 형세: ${ctx.advantageDesc}`);

  if (ctx.lastMoveSan) {
    const ann = ctx.lastMoveAnnotation ? ` (${ctx.lastMoveAnnotation})` : '';
    lines.push(`직전 수: ${ctx.lastMoveSan}${ann} (상대방인 ${lastMoverLabel}이 둠)`);
  }

  lines.push(``);
  lines.push(`[엔진 추천 수순 — 절대 주의]`);
  lines.push(`각 수 옆에 (백), (흑) 표시를 확인하고 주어를 정확히 써주세요.`);
  if (hasEngineLine) {
    lines.push(`최선 수순: ${liveBestLine}`);
    if (liveLine2) lines.push(`차선 수순: ${liveLine2}`);
    if (liveLine3) lines.push(`3순위 수순: ${liveLine3}`);
  } else {
    lines.push(`[엔진 라인 미준비] 구조·브리프·직전 수 맥락만 설명.`);
  }

  // 사용자 화살표 (후보수 / 수순) 정제
  const refineArrow = (arrow) => {
    if (!arrow || !arrow.includes('-')) return arrow;
    const [from, to] = arrow.split('-');
    const idx = sqToIdx(from);
    const cell = game.board[idx[0]]?.[idx[1]];
    if (!cell) return arrow;
    const mover = cell.color === 'w' ? '백' : '흑';
    const pName = PIECE_KR[cell.piece.toUpperCase()] || cell.piece;
    return `${mover}의 ${pName}가 ${to}로 이동하는 수`;
  };

  if (ctx.candidateMoves && ctx.candidateMoves.length > 0) {
    const refined = ctx.candidateMoves.map(refineArrow).join(', ');
    lines.push(`사용자 후보수 (화살표): ${refined} — 엔진 추천과 비교해서 언급해주세요.`);
  }
  if (ctx.sequenceMoves && ctx.sequenceMoves.length > 0) {
    const refined = ctx.sequenceMoves.map(refineArrow).join(' → ');
    lines.push(`사용자 수순 (Alt+화살표): ${refined} — 장단점 간략히 언급해주세요.`);
  }

  // 구조화 브리프 (위협/약점/엔진 인과 — 검증된 사실만)
  if (ctx.positionBrief && typeof formatPositionBriefForPrompt === 'function') {
    lines.push(``);
    lines.push(formatPositionBriefForPrompt(ctx.positionBrief, ctx));
    
    // 로직 계산 사실 추가 (hanging, mateIn1 등 직접 노출하여 AI에게 강조)
    if (ctx.positionBrief.hanging && ctx.positionBrief.hanging.length > 0) {
      lines.push(`■ 로직 계산 위협 (반드시 언급): ${ctx.positionBrief.hanging.join(', ')} 기물이 방어 없이 공격받고 있음.`);
    }
    if (ctx.positionBrief.mateIn1 && ctx.positionBrief.mateIn1.length > 0) {
      lines.push(`■ 로직 계산 메이트 (최우선): ${ctx.positionBrief.mateIn1.join(', ')} 수로 1수만에 체크메이트 가능.`);
    }
    
    // 추가: 방치 시 위협 (Null Move Threat) 상세
    if (ctx.positionBrief.nullMoveThreat) {
      const nt = ctx.positionBrief.nullMoveThreat;
      lines.push(``);
      lines.push(`[방치 시 위협 분석 (Null Move Threat)]`);
      lines.push(`만약 ${firstTurnLabel}이 최선수(${ctx.positionBrief.engineLine[0]?.san})를 두었는데 상대방(${lastMoverLabel})이 응수하지 않고 차례를 넘긴다면(Null Move):`);
      lines.push(`  • ${firstTurnLabel}의 추가 위협 수: ${nt.san}`);
      lines.push(`  • 전술적 효과: ${nt.impact.tactics.join(', ') || '공세 강화'}`);
      if (nt.impact.isCapture) lines.push(`  • 포획 대상: ${nt.impact.capturedPiece}(${nt.san.slice(-2)})`);
      if (nt.impact.isCheck) lines.push(`  • 위협: 상대 킹에 대한 직접적인 체크`);
      lines.push(`  • 공격 대상: ${nt.impact.newAttackers.map(a => `${a.piece}(${a.sq})`).join(', ') || '없음'}`);
      lines.push(`  • 전략적 의미: 이 수순이 ${firstTurnLabel}의 실질적인 공격 의도입니다. 상대는 이를 막기 위해 반드시 대응해야 합니다.`);
    }
    
    // 추가: 최선수의 파급력 (활동성 등)
    if (ctx.positionBrief.m1Impact) {
      const imp = ctx.positionBrief.m1Impact;
      lines.push(``);
      lines.push(`[최선수의 즉각적 파급력]`);
      lines.push(`  • 기물 활동성 변화: 이동 가능 칸 ${imp.mobility > 0 ? '+' : ''}${imp.mobility}`);
      if (imp.isCapture) lines.push(`  • 즉각적 이득: ${imp.capturedPiece} 포획`);
      if (imp.isCheck) lines.push(`  • 상태: 상대 킹 체크`);
      lines.push(`  • 중앙 통제력 변화: ${imp.controlDelta > 0 ? '+' : ''}${imp.controlDelta}`);
      if (typeof detectQuietMoveImpact === 'function') {
        detectQuietMoveImpact(imp).forEach(note => lines.push(`  • ${note}`));
      }
    }
  } else if (ctx.positionInsights && ctx.positionInsights.length > 0) {
    lines.push(``);
    lines.push(`[포지션 구조 분석 — 코드 계산 사실]`);
    ctx.positionInsights.slice(0, 12).forEach(ins => lines.push(`  • ${ins}`));
  }

  if (ctx.threatData) {
    lines.push(``);
    lines.push(`[참고용 이전 AI 분석 — 엔진·브리프와 충돌하면 무시할 것]`);
    if (ctx.threatData.idea) lines.push(`이전 분석 아이디어: ${ctx.threatData.idea}`);
    if (ctx.threatData.prob) lines.push(`이전 분석 문제점: ${ctx.threatData.prob}`);
    if (ctx.threatData.sol)  lines.push(`이전 분석 해결책: ${ctx.threatData.sol}`);
  }

  if (ctx.pgnMoves) lines.push(`전체 기보: ${ctx.pgnMoves}`);
  lines.push(`FEN: ${ctx.fen}`);

  lines.push(``);
  lines.push(`[작성 지침]`);
  lines.push(`- **포지션 상황** 으로 시작. ${hasEngineLine ? '**최선수 분석** 포함.' : '엔진 라인 없음 → **최선수 분석**은 "엔진 수순 준비 중" 한 문장만. **이후 수순** 섹션 생략.'}`);
  lines.push(`- 나머지 섹션(**약점 분석**, **강점 분석**, **위협 & 아이디어**, **이후 수순**)은 포지션에 실제로 해당하는 것만 선택.`);
  if (hasEngineLine) {
    lines.push(`- **최선수 분석**: [엔진 추천 수순]의 "최선 수순" SAN만 사용. 브리프·합법 수 목록에 없는 수 추가 금지.`);
    lines.push(`- **이후 수순**: [방치 시 위협 분석]을 근거로 최선수의 진짜 목적을 설명하세요. 단순히 수순 나열이 아니라 "만약 상대가 방치하면 ~와 같은 위협이 있기 때문에 ~로 응수해야 한다"는 논리적 흐름(Threat-based)을 따르세요.`);
  }
  lines.push(`- **위협 & 아이디어**: 브리프의 "1~3수 메이트"·"전술적 위협"만 사용. 메이트는 브리프에 적힌 수순·패턴만 인용.`);
  lines.push(`- **약점 분석**: 브리프의 "구조적 약점"(밝은/어두운 칸, 폰 구조)을 장기적 이유와 함께 설명.`);
  lines.push(`- **포지션 상황**: 현재 차례·직전 수를 먼저 맞게 서술. 최근 수순은 브리프에 있는 것만. 직전 수를 "지금 둘 수"처럼 쓰지 말 것.`);
  lines.push(`- 섹션 헤더는 **헤더명** 형태로 단독 줄에 쓸 것.`);
  lines.push(`- 위 system prompt의 말투 예시를 그대로 따를 것. 전체 900~1300자, 문단마다 2~5문장.`);

  return lines.join('\n');
}

// 수동 질문용 프롬프트 빌더
function buildCoachPrompt(ctx, question) {
  const lines = [];

  lines.push(`아래 체스 포지션 데이터를 바탕으로 질문에 한국어로 답변해 주세요.`);
  lines.push(``);
  lines.push(`[포지션 데이터]`);
  lines.push(`게임 단계: ${ctx.phase} | 진행 수: ${ctx.moveCount}수 | 차례: ${ctx.turn === 'w' ? '백(White)' : '흑(Black)'}`);
  lines.push(`현재 형세: ${ctx.advantageDesc}`);

  if (ctx.lastMoveSan) {
    const ann = ctx.lastMoveAnnotation ? ` (${ctx.lastMoveAnnotation})` : '';
    lines.push(`방금 둔 수: ${ctx.lastMoveSan}${ann}`);
  }

  const pv1 = ctx.pvData && ctx.pvData[1];
  const bestSan = engineLineSanWithLabels(ctx, pv1, 8) || ctx.bestLine;
  const line2San = engineLineSanWithLabels(ctx, ctx.pvData && ctx.pvData[2], 6) || ctx.line2;
  const line3San = engineLineSanWithLabels(ctx, ctx.pvData && ctx.pvData[3], 6) || ctx.line3;
  if (bestSan) lines.push(`[엔진 1순위 라인 SAN] ${bestSan}`);
  if (line2San) lines.push(`[엔진 2순위 라인 SAN] ${line2San}`);
  if (line3San) lines.push(`[엔진 3순위 라인 SAN] ${line3San}`);

  // 사용자 화살표 (후보수 / 수순) 포함
  if (ctx.candidateMoves && ctx.candidateMoves.length > 0) {
    lines.push(``);
    lines.push(`[사용자가 고려한 후보수 (화살표로 표시한 수): ${ctx.candidateMoves.join(', ')}]`);
    lines.push(`※ 이 후보수들이 왜 좋거나 나쁜지 질문에 연관시켜 설명해 주세요.`);
  }
  if (ctx.sequenceMoves && ctx.sequenceMoves.length > 0) {
    lines.push(`[사용자가 생각한 수순 (Alt+화살표): ${ctx.sequenceMoves.join(' → ')}]`);
    lines.push(`※ 이 수순이 올바른지 평가해 주세요.`);
  }

  if (ctx.positionBrief && typeof formatPositionBriefForPrompt === 'function') {
    lines.push(``);
    lines.push(formatPositionBriefForPrompt(ctx.positionBrief, ctx));
  } else if (ctx.positionInsights && ctx.positionInsights.length > 0) {
    lines.push(``);
    lines.push(`[포지션 구조 분석]`);
    ctx.positionInsights.slice(0, 10).forEach(ins => lines.push(`  • ${ins}`));
  }

  if (ctx.threatData) {
    lines.push(``);
    lines.push(`[위협 분석 데이터]`);
    if (ctx.threatData.idea) lines.push(`핵심 계획(Idea): ${ctx.threatData.idea}`);
    if (ctx.threatData.prob) lines.push(`문제점(Problem): ${ctx.threatData.prob}`);
    if (ctx.threatData.sol)  lines.push(`최선책(Solution): ${ctx.threatData.sol}`);
  }

  if (ctx.pgnMoves) lines.push(`전체 기보: ${ctx.pgnMoves}`);
  lines.push(`FEN: ${ctx.fen}`);
  lines.push(``);
  lines.push(`[사용자 질문]`);
  lines.push(question);
  lines.push(``);
  lines.push(`체스인사이드 해설 스타일(관찰→이유→결과)로, 한국어로만 답변해주세요.`);
  lines.push(`수치(cp, 점수, 승률)는 쓰지 말고, 수 표기(e4, Nf3 등)는 영문 그대로 쓰세요.`);
  lines.push(`오프닝·전개 맥락이 [국면 내러티브]에 있으면 질문 답변에도 반드시 반영할 것.`);

  return lines.join('\n');
}

// ══════════════════════════════════════════════════════
// Groq API 호출
// ══════════════════════════════════════════════════════

// 포지션 해설 전용 API 호출
async function callCommentaryAPI(ctx) {
  const SYSTEM = `당신은 유튜브 채널 "체스인사이드"의 해설자이자 마스터 체스 코치입니다. 당신의 목표는 현재 포지션을 종합적으로 분석하여 학습자에게 전략적 방향과 구체적인 전술을 모두 제공하는 것입니다.

아래 예시들이 당신이 지켜야 할 정확한 말투와 구조입니다. 특히 **이후 수순** 섹션의 논리적 흐름을 주목하세요.

───────────────────────────────────────
【예시 A — 위협 기반의 이후 수순 설명】
**포지션 상황**
지금 백이 d4를 두면서 중앙 싸움을 걸어왔고요. 흑은 Nf6로 대응하며 기물 전개를 이어가고 있습니다.

**이후 수순**
백이 여기서 **Nb5**로 나이트를 전진시키는 것이 매우 날카로운데요. 만약 흑이 이를 방치한다면, 백은 다음 수에 **Nxc7+**를 두어 킹을 체크함과 동시에 룩을 잡아내는 **치명적인 포크**를 성공시킬 위협을 가지고 있습니다. 따라서 흑은 **Na6**나 **d6**와 같은 수로 c7 지점을 반드시 수비해야 하고, 이 과정에서 백은 주도권을 잡고 경기를 풀어나갈 수 있게 됩니다.

【예시 B — 조용한 수(예방)의 설명】
**이후 수순**
백이 둔 **a3**는 언뜻 보기엔 평범한 수처럼 보이지만, 사실 흑의 **Nb4** 침투를 미리 차단하는 아주 중요한 **예방적 수**입니다. 만약 백이 이 수를 두지 않았다면 흑의 나이트가 중앙으로 뛰어들며 백의 퀸과 비숍을 괴롭혔을 텐데, **a3**를 통해 그 가능성을 원천 봉쇄하고 룩의 활동성까지 확보하는 일석이조의 효과를 노리고 있습니다.
───────────────────────────────────────

【작성 세부 지침 — 공수 교대 절대 주의】
1. **위협 중심 해설**: **이후 수순** 섹션은 단순히 수순을 나열하지 마세요. "만약 상대가 방치한다면 벌어질 위협(Null-move Threat)"을 먼저 언급하고, 이를 막기 위한 "상대의 응수"를 설명하는 논리적 구조를 따르세요.
2. **역할 고정**: 당신은 지금 차례인 플레이어(Mover)의 관점에서 분석해야 합니다.
3. **주어 명시**: 모든 수순 해설에서 "백이 ~하면, 흑이 ~하고"와 같이 주어를 매번 명시하세요.
4. **말투**: 체스인사이드 유튜브 스타일 (~고요, ~거든요, ~겠습니다, ~는 거죠).
5. **금기 사항**: cp/점수 수치 사용 금지, 할루시네이션(불가능한 수) 주의, 모호한 단어("반격", "카운터") 남발 금지.`;

  const prompt = buildCommentaryPrompt(ctx);

  // 디버깅 로그 추가
  console.group('%c[AI Coach] Commentary API Request', 'color: #4CAF50; font-weight: bold;');
  console.log('System Prompt:', SYSTEM);
  console.log('User Prompt:', prompt);
  console.log('Refined Context:', ctx);
  console.groupEnd();

  return callGroqAPIWithSystemTemp(SYSTEM, prompt, 2000, 0.28);
}

// 공통 Groq 호출 (system 없이 — 수동 질문용)
async function callGroqAPI(userContent) {
  const SYSTEM = `You are a Korean-language chess coach in the style of "ChessInside" YouTube channel.
Always respond ONLY in Korean (한국어). Chess move notation (e4, Nf3, O-O) stays in English/algebraic form.
Never output Japanese, Chinese, Arabic, or any non-Korean script.
Never output numerical evaluation scores. Never output placeholders like <<_0>>.`;

  return callGroqAPIWithSystem(SYSTEM, userContent, 1200);
}

async function callGroqAPIWithSystem(systemPrompt, userContent, maxTokens = 800) {
  return callGroqAPIWithSystemTemp(systemPrompt, userContent, maxTokens, 0.3);
}

async function callGroqAPIWithSystemTemp(systemPrompt, userContent, maxTokens = 800, temperature = 0.3) {
  try {
    const response = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent  },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const raw  = data.choices?.[0]?.message?.content || '응답을 받지 못했습니다.';
      return cleanKorean(raw);
    }
    
    // Groq 실패 시 Gemini로 폴백
    console.warn(`[Coach] Groq API 실패 (HTTP ${response.status}), Gemini 폴백 시도...`);
  } catch (e) {
    console.warn(`[Coach] Groq 호출 오류, Gemini 폴백 시도:`, e);
  }

  // ── Gemini 폴백 호출 ──
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-1.5-flash-latest',
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent  },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Gemini API 오류: HTTP ${response.status}`);
    }

    const data = await response.json();
    const raw  = data.choices?.[0]?.message?.content || '응답을 받지 못했습니다.';
    return cleanKorean(raw);
  } catch (err) {
    console.error(`[Coach] 모든 API 호출 실패:`, err);
    throw err;
  }
}

// ══════════════════════════════════════════════════════
// 응답 포맷팅: 4섹션 카드 렌더링
// ══════════════════════════════════════════════════════

/** 모든 코치 응답 컨테이너를 한꺼번에 업데이트 */
function updateCoachUI(options) {
  const { html, className, show } = options;
  
  // ID 기반 컨테이너들
  const containerIds = ['coach-response', 'coach-response-main', 'coach-response-tab'];
  containerIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (show !== undefined) el.style.display = show ? (id.includes('tab') ? 'block' : 'flex') : 'none';
    if (className !== undefined) el.className = className;
    if (html !== undefined) el.innerHTML = html;
  });

  // 클래스 기반 컨테이너들
  const containers = document.querySelectorAll('.coach-response-area');
  containers.forEach(el => {
    if (show !== undefined) el.style.display = show ? 'block' : 'none';
    if (className !== undefined) el.className = className;
    if (html !== undefined) el.innerHTML = html;
  });

  // 사이드바 바디도 업데이트 (결과물인 경우에만)
  if (html && !className && className !== 'loading') {
    const sidebarBody = document.getElementById('coach-sidebar-body');
    if (sidebarBody) sidebarBody.innerHTML = html;
  }
}

function sanitizeAnswer(text, ctx) {
  if (!text) return text;
  let out = String(text);
  out = out.replace(/<<\s*_?\d+\s*>>/g, '');
  out = out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  if (out.length < 20) {
    out = `**포지션 상황:** 현재 포지션을 분석 중입니다.\n**약점 분석:** 스톡피시 라인을 바탕으로 분석이 필요합니다.\n**최선수 분석:** 엔진 추천수를 확인해주세요.\n**이후 수순:** 다음 수순을 살펴보세요.`;
  }

  // 엔진 수순이 정말로 없는지 확인 (이미 텍스트에 포함되어 있다면 강제 대체 자제)
  const pv1 = (ctx && ctx.pvData && ctx.pvData[1]) || (window.pvData && window.pvData[1]);
  const engineSan = ctx ? (engineLineSanWithLabels(ctx, pv1, 8) || '') : '';
  
  // 만약 AI가 이미 본문에 SAN 수순(Nf3, e4 등)을 어느 정도 언급했다면, 
  // 엔진 데이터가 순간적으로 없더라도 강제 폴백 문구 삽입을 지양함.
  const hasChessMovesInText = (out.match(/\b([NBRQK][a-h]?[1-8]?x?[a-h][1-8][+#=]?|[a-h]x?[a-h][1-8][+#=]?)\b/g) || []).length > 2;

  if (!engineSan.trim() && !hasChessMovesInText) {
    out = out.replace(/\*\*이후 수순\*\*[\s\S]*?(?=\*\*|$)/gi, '');
    out = out.replace(/\*\*최선수 분석\*\*[\s\S]*?(?=\*\*|$)/gi, '**최선수 분석**\n엔진 수순이 아직 준비되지 않아, 구체적인 수순은 생략합니다. 구조·위협·직전 수 맥락을 참고해 주세요.\n\n');
  }

  return cleanKorean(out);
}

function formatCommentary(text) {
  const escaped = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const SECTION_DEFS = [
    { key: '포지션 상황',    icon: '🔍', cls: 'section-pos'    },
    { key: '약점 분석',      icon: '⚠️', cls: 'section-weak'   },
    { key: '강점 분석',      icon: '💪', cls: 'section-strong' },
    { key: '위협 & 아이디어', icon: '⚡', cls: 'section-threat' },
    { key: '최선수 분석',    icon: '♟️', cls: 'section-best'   },
    { key: '이후 수순',      icon: '🔮', cls: 'section-plan'   },
  ];

  const SECTION_KEYS = SECTION_DEFS.map(s => s.key);

  // ── 개선된 섹션 파싱 ──────────────────────────────────────────────────────
  // 전략: 모든 **헤더** 위치를 먼저 찾아 정렬한 뒤, 각 헤더 사이 본문만 추출.
  // LLM이 본문 안에 "비공식 헤더(** 없이 평문)"를 쓸 경우 다음 ** 헤더 위치로
  // 잘라내기 때문에 중복이 발생하지 않음.

  // 1) 모든 알려진 헤더 위치 탐색
  const allHeaderPat = new RegExp(
    '\\*\\*(' + SECTION_KEYS.map(k => k.replace(/&/g,'&amp;').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') + ')[:\\s：]*\\*\\*',
    'g'
  );

  const found = []; // { key, start, bodyStart }
  let m;
  while ((m = allHeaderPat.exec(escaped)) !== null) {
    found.push({ key: m[1], start: m.index, bodyStart: m.index + m[0].length });
  }

  const parsed = {};
  for (let fi = 0; fi < found.length; fi++) {
    const { key, bodyStart } = found[fi];
    const bodyEnd = fi + 1 < found.length ? found[fi + 1].start : escaped.length;
    let body = escaped.slice(bodyStart, bodyEnd).trim().replace(/^[:：\s]+/, '').trim();

    // 본문 안에 평문으로 다른 섹션 이름이 붙어있으면 그 앞까지만 사용
    // (예: "...공격을 준비합니다. 최선수 분석 백의 최선수는...")
    const inlineHeaderPat = new RegExp(
      '(?:^|\n)(' + SECTION_KEYS.map(k => k.replace(/&/g,'&amp;').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') + ')(?:\s|$)',
      'i'
    );
    const inlineMatch = body.match(inlineHeaderPat);
    if (inlineMatch && inlineMatch.index > 0) {
      body = body.slice(0, inlineMatch.index).trim();
    }

    if (body) parsed[key] = body;
  }

  if (Object.keys(parsed).length === 0) {
    // 섹션 감지 실패 — 일반 텍스트로 표시
    return formatPlain(escaped);
  }

  let html = '<div class="coach-response-area">';
  for (const def of SECTION_DEFS) {
    const body = parsed[def.key];
    if (!body) continue;
    const formatted = body
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 체스 수 표기 강조
      .replace(/\b(O-O-O|O-O|[NBRQK][a-h]?[1-8]?x?[a-h][1-8][+#=]?|[a-h]x?[a-h][1-8][+#=]?|[a-h][1-8])\b/g,
               m => m.length >= 2 ? `<span class="chess-move">${m}</span>` : m)
      .replace(/\n/g, '<br>');
    html += `
      <div class="coach-section ${def.cls}">
        <div class="section-header"><span class="section-icon">${def.icon}</span> ${def.key}</div>
        <div class="section-body">${formatted}</div>
      </div>`;
  }
  html += '</div>';
  return html;
}

function formatPlain(escaped) {
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p style="margin-top:8px">')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>').replace(/$/, '</p>');
}

// ══════════════════════════════════════════════════════
// 인라인 패널에 해설 렌더링
// ══════════════════════════════════════════════════════
function renderCoachSidebar(answerText) {
  updateCoachUI({
    html: formatCommentary(answerText),
    className: '',
    show: true
  });
}

// ══════════════════════════════════════════════════════
// 한국어 후처리
// ══════════════════════════════════════════════════════
function cleanKorean(text) {
  if (!text) return text;
  let out = text
    // 일본어 히라가나/가타카나 제거
    .replace(/[\u3040-\u309F\u30A0-\u30FF]+/g, '')
    // 일본어/중국어 한자 제거
    .replace(/[\u4E00-\u9FFF\u3400-\u4DBF]+/g, '')
    // 아랍어, 태국어 등 제거
    .replace(/[\u0600-\u06FF\u0E00-\u0E7F\u0900-\u097F]+/g, '')
    // 공백/줄바꿈 정리
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // ★ 라틴 문자(영문) 제거는 하지 않음
  // 체스 수 표기(e4, Nf3, O-O 등)가 라틴 문자이므로 제거하면 수가 사라짐
  // 대신 LLM 프롬프트에서 한국어 외 출력을 금지하여 불필요한 영문 혼입을 방지

  return out;
}


// ══════════════════════════════════════════════════════
// 위협 분석 패널 (기존 유지)
// ══════════════════════════════════════════════════════
let threatLoading = false;
let lastThreatFen = '';

function toggleThreatPanel() {
  const panel = document.getElementById('threat-panel');
  const btn   = document.getElementById('threat-toggle');
  if (panel.style.display === 'none' || !panel.style.display) {
    panel.style.display = 'block';
    btn.style.color = 'var(--accent-blue)';
    btn.style.borderColor = 'var(--accent-blue)';
    if (!lastThreatFen || lastThreatFen !== (buildChessContext()?.fen || '')) {
      runThreatAnalysis();
    }
  } else {
    panel.style.display = 'none';
    btn.style.color = 'var(--text-muted)';
    btn.style.borderColor = 'var(--border-color)';
  }
}

async function runThreatAnalysis() {
  if (!coachApiKey || threatLoading) return;
  
  // API 호출 직전 최신 컨텍스트 빌드
  let ctx = buildChessContext();
  if (!ctx) return;

  const fenKey = ctx.fen;
  if (fenKey === lastThreatFen) return;

  const panel     = document.getElementById('threat-panel');
  const contentEl = document.getElementById('threat-content');
  if (panel) panel.style.display = 'block';
  if (contentEl) contentEl.innerHTML = '<div class="threat-loading">⚡ 위협 분석 중...</div>';
  threatLoading   = true;
  lastThreatFen   = fenKey;

  try {
    // 엔진 데이터가 현재 FEN과 동기화될 때까지 대기 (최대 5초)
    if (!hasEnoughLines(ctx)) {
      await waitForDeepLines(ctx, 5000);
      ctx = buildChessContext(); // 대기 후 컨텍스트 갱신
    }

    // 최신 컨텍스트 주입 (window.pvData 업데이트 반영)
    ctx.pvData = window.pvData;

    // 체크메이트 즉시 감지
    const mover    = ctx.turn === 'w' ? '백' : '흑';
    const isMate   = ctx.bestMove && ctx.bestMove.includes('#');

    if (isMate) {
      const mateText = [
        `**핵심 계획:** ${mover}은 ${ctx.bestMove}로 즉각 체크메이트를 만들 수 있습니다.`,
        `**문제점:** 즉각적인 체크메이트가 있어 문제점 없음.`,
        `**최선책:** ${ctx.bestMove}를 바로 두어 게임을 끝내세요.`,
      ].join('\n');
      renderThreatPanel(mateText);
      return;
    }

    const answer  = await callThreatAPI(ctx);
    const cleaned = cleanKorean(answer);
    renderThreatPanel(cleaned);
  } catch(e) {
    document.getElementById('threat-content').innerHTML =
      `<div class="threat-loading" style="color:var(--accent-red)">분석 실패: ${e.message}</div>`;
    lastThreatFen = '';
  } finally {
    threatLoading = false;
  }
}

async function callThreatAPI(ctx) {
  const mover     = ctx.turn === 'w' ? '백(White)' : '흑(Black)';
  const opponent  = ctx.turn === 'w' ? '흑(Black)' : '백(White)';

  const THREAT_SYSTEM = `You are a Korean chess analyst. Output ONLY in Korean (한국어).
Chess move notation stays in algebraic form (Nf3, e4, dxc4, O-O).

【COLOR CONSISTENCY RULE — CRITICAL】
- The "차례 (Mover)" provided is the side whose turn it is.
- The 1st move in the engine line is ALWAYS played by the current mover.
- The 2nd move is played by the opponent.
- NEVER mix up who is playing which move.

Analyze the position using the provided data and write three sections:
**핵심 계획:** — What does the current mover (\${mover}) want to do? State the concrete threat using the ACTUAL 1st move from the engine line.
**문제점:** — What can the opponent (\${opponent}) do to counter? Use the 2nd move from the engine line as the main problem for the mover.
**최선책:** — What is the current mover's (\${mover}) best response or final goal in this line?

Rules:
- Keep each section 1~2 sentences. Total under 400 characters.
- Use only provided SAN moves with labels.`;

  const pv1 = ctx.pvData && ctx.pvData[1];
  const labeledLine = engineLineSanWithLabels(ctx, pv1, 6);

  const userMsg = [
    `[현재 포지션 데이터]`,
    `차례: ${mover}`,
    `엔진 추천 수순 (주어 확인): ${labeledLine}`,
    ctx.lastMoveSan ? `방금 둔 수: ${ctx.lastMoveSan}` : '',
    `FEN: ${ctx.fen}`,
    ``,
    `위 엔진 라벨을 절대적으로 신뢰하여 핵심 계획/문제점/최선책을 분석하세요.`,
  ].filter(Boolean).join('\n');

  // 디버깅 로그 추가
  console.group('%c[AI Coach] Threat API Request', 'color: #2196F3; font-weight: bold;');
  console.log('System Prompt:', THREAT_SYSTEM);
  console.log('User Prompt:', userMsg);
  console.groupEnd();

  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      temperature: 0.25,
      messages: [
        { role: 'system', content: THREAT_SYSTEM },
        { role: 'user',   content: userMsg },
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function renderThreatPanel(text) {
  const el = document.getElementById('threat-content');
  if (!text) { el.innerHTML = '<div class="threat-loading">분석 결과 없음</div>'; return; }

  const SECTIONS = [
    { key: '핵심 계획', cls: 'idea', icon: '💡', labelCls: 'threat-label-idea' },
    { key: '문제점',    cls: 'prob', icon: '⚠️', labelCls: 'threat-label-prob' },
    { key: '최선책',    cls: 'sol',  icon: '✅', labelCls: 'threat-label-sol'  },
  ];

  const parsed  = {};
  const allKeys = ['핵심 계획', '문제점', '최선책'];
  let remaining = text;

  for (let ki = 0; ki < allKeys.length; ki++) {
    const key     = allKeys[ki];
    const nextKey = allKeys[ki + 1];
    const keyPat  = new RegExp('\\*\\*' + key + '[:\\s：]*\\*\\*|\\*\\*' + key + '\\*\\*');
    const startIdx = remaining.search(keyPat);
    if (startIdx < 0) continue;

    const headerMatch = remaining.slice(startIdx).match(keyPat);
    const bodyFrom    = startIdx + headerMatch[0].length;

    let bodyEnd = remaining.length;
    if (nextKey) {
      const nextPat = new RegExp('\\*\\*' + nextKey);
      const nextIdx = remaining.slice(bodyFrom).search(nextPat);
      if (nextIdx >= 0) bodyEnd = bodyFrom + nextIdx;
    }
    parsed[key] = remaining.slice(bodyFrom, bodyEnd).trim().replace(/^[:：\s]+/, '').trim();
  }

  if (Object.keys(parsed).length === 0) {
    el.innerHTML = `<div class="threat-section"><div class="threat-section-body">${
      text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
    }</div></div>`;
    return;
  }

  let html = '';
  for (const s of SECTIONS) {
    if (!parsed[s.key]) continue;
    const body = parsed[s.key]
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\b(O-O-O|O-O|[NBRQK][a-h]?[1-8]?x?[a-h][1-8][+#=]?|[a-h]x?[a-h][1-8][+#=]?|[a-h][1-8][+#]?)\b/g,
               (m) => m.length >= 2 ? '<span class="t-move">' + m + '</span>' : m)
      .replace(/\n/g,'<br>');
    html += `
      <div class="threat-section">
        <div class="threat-section-label ${s.labelCls}">${s.icon} ${s.key}</div>
        <div class="threat-section-body">${body}</div>
      </div>`;
  }
  el.innerHTML = html;
}

// ══════════════════════════════════════════════════════
// 최선수 설명 패널 (기존 유지)
// ══════════════════════════════════════════════════════
let bestExplainLoading   = false;
let lastBestExplainFen   = '';
let bestExplainMoves     = [];
let bestExplainFocusIdx  = 0;

function toggleBestExplainPanel() {
  const panel = document.getElementById('best-explain-panel');
  const btn   = document.getElementById('best-explain-toggle');
  const isOpen = panel.style.display !== 'none' && panel.style.display !== '';
  if (!isOpen) {
    panel.style.display = 'block';
    btn.style.color = 'var(--accent-blue)';
    btn.style.borderColor = 'var(--accent-blue)';
    if (!lastBestExplainFen || lastBestExplainFen !== (buildChessContext()?.fen || '')) {
      runBestMoveExplain();
    }
  } else {
    panel.style.display = 'none';
    btn.style.color = 'var(--text-muted)';
    btn.style.borderColor = 'var(--border-color)';
  }
}

async function runBestMoveExplain(focusIdx) {
  if (!coachApiKey || bestExplainLoading) return;
  const ctx = buildChessContext();
  if (!ctx) return;
  const pv = window.pvData[1];
  if (!pv || !pv.moves || pv.moves.length === 0) return;

  const fenKey = ctx.fen;
  if (fenKey === lastBestExplainFen && focusIdx === undefined) return;

  bestExplainLoading  = true;
  lastBestExplainFen  = fenKey;
  bestExplainFocusIdx = focusIdx ?? 0;
  
  // 라벨링된 수순에서 SAN만 추출
  const labeledLine = engineLineSanWithLabels(ctx, pv, 6);
  bestExplainMoves = labeledLine ? labeledLine.split(/\s+/).filter(s => !s.includes('.') && !s.includes('(')) : pv.moves.slice(0, 6);

  const panel = document.getElementById('best-explain-panel');
  panel.style.display = 'block';

  renderBestSeqBar(bestExplainMoves, bestExplainFocusIdx, ctx);

  document.getElementById('best-explain-content').innerHTML =
    '<div class="threat-loading">📖 최선수 분석 중...</div>';

  try {
    const focusMove = bestExplainMoves[bestExplainFocusIdx] || bestExplainMoves[0];
    const answer    = await callBestExplainAPI(ctx, bestExplainMoves, bestExplainFocusIdx);
    const cleaned   = cleanKorean(answer);
    renderBestExplain(cleaned, focusMove, bestExplainMoves, bestExplainFocusIdx, ctx);
  } catch(e) {
    document.getElementById('best-explain-content').innerHTML =
      `<div class="threat-loading" style="color:var(--accent-red)">분석 실패: ${e.message}</div>`;
    lastBestExplainFen = '';
  } finally {
    bestExplainLoading = false;
  }
}

function renderBestSeqBar(moves, activeIdx, ctx) {
  const bar = document.getElementById('best-explain-seq');
  if (!bar || !moves.length) return;

  let html    = '';
  let moveNum = ctx.fullMove || 1;
  let turn    = ctx.turn;

  moves.forEach((san, i) => {
    // 수 번호: 백 차례마다, 또는 첫 수가 흑일 때
    if (turn === 'w') {
      html += `<span class="best-seq-num">${moveNum}.</span>`;
    } else if (i === 0) {
      html += `<span class="best-seq-num">${moveNum}...</span>`;
    }

    const color = turn;
    let pieceCode;
    if (san === 'O-O' || san === 'O-O-O') pieceCode = color + 'K';
    else if (san && 'NBRQK'.includes(san[0])) pieceCode = color + san[0];
    else pieceCode = color + 'P';
    const imgTag = `<img src="${pieceImg(pieceCode)}" alt="">`;

    html += `<span class="best-seq-move${i === activeIdx ? ' active' : ''}"
      onclick="runBestMoveExplain(${i})" title="${san}">${imgTag}${san}</span>`;

    if (turn === 'b') moveNum++;
    turn = turn === 'w' ? 'b' : 'w';
  });
  bar.innerHTML = html;
}

async function callBestExplainAPI(ctx, moves, focusIdx) {
  const EXPLAIN_SYSTEM = `당신은 "체스인사이드" 스타일 한국어 체스 해설자입니다.

【목표】엔진 최선수 한 수가 **왜** 좋은지, 포지션 맥락과 연결해 구체적으로 설명합니다.

【절대 규칙 — 공수 교대 주의】
- 당신이 받은 엔진 수순에는 (백), (흑) 라벨이 붙어 있습니다. 이를 절대적으로 신뢰하세요.
- 해설 시 반드시 "백이 ~하면", "흑이 ~해서"와 같이 주어를 명시하세요.
- 절대로 백의 수를 흑의 계획으로, 혹은 그 반대로 설명하지 마세요.
- 말투: "~고요", "~거든요", "~라고 볼 수 있겠어요"
- cp/승률 수치 금지`;

  const pv1 = ctx.pvData && ctx.pvData[1];
  const labeledLine = engineLineSanWithLabels(ctx, pv1, 6);
  const focusMove = moves[focusIdx] || moves[0];

  const firstTurnKr  = ctx.turn === 'w' ? '백' : '흑';
  const userMsg = [
    `지금 차례: ${firstTurnKr}`,
    `라벨링된 엔진 수순: ${labeledLine}`,
    `설명 대상: ${focusIdx + 1}번째 수 "${focusMove}"`,
    ctx.lastMoveSan ? `직전 수: ${ctx.lastMoveSan}` : '',
    `FEN: ${ctx.fen}`,
    ``,
    `위 라벨을 참고하여 "${focusMove}"가 좋은 이유를 해설하세요. 주어를 반드시 포함하세요.`,
  ].join('\n');

  // 디버깅 로그 추가
  console.group('%c[AI Coach] Best Explain API Request', 'color: #FF9800; font-weight: bold;');
  console.log('System Prompt:', EXPLAIN_SYSTEM);
  console.log('User Prompt:', userMsg);
  console.groupEnd();

  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 900,
      temperature: 0.28,
      messages: [
        { role: 'system', content: EXPLAIN_SYSTEM },
        { role: 'user',   content: userMsg },
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function renderBestExplain(text, focusMove, moves, activeIdx, ctx) {
  const contentEl = document.getElementById('best-explain-content');
  if (!text) { contentEl.innerHTML = '<div class="threat-loading">결과 없음</div>'; return; }

  const escaped = text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const lines = escaped.split('\n').map(l => l.trim()).filter(Boolean);
  const reasonLines = [];
  for (const line of lines) {
    if (/^\*\*/.test(line)) continue;
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('·') || line.match(/^\d+\./)) {
      const txt = line.replace(/^[•\-·]\s*/, '').replace(/^\d+\.\s*/, '');
      if (txt) reasonLines.push(txt);
    } else if (line.length > 12) {
      reasonLines.push(line);
    }
  }
  if (reasonLines.length === 0) {
    lines.forEach(l => { if (l && !/^\*\*/.test(l)) reasonLines.push(l); });
  }

  // 기물 아이콘 결정 (focusIdx 기준 차례 계산)
  let turnForFocus = ctx.turn;
  for (let k = 0; k < activeIdx; k++) turnForFocus = turnForFocus === 'w' ? 'b' : 'w';
  const color = turnForFocus;
  let pieceCode;
  if (focusMove === 'O-O' || focusMove === 'O-O-O') pieceCode = color + 'K';
  else if (focusMove && 'NBRQK'.includes(focusMove[0])) pieceCode = color + focusMove[0];
  else pieceCode = color + 'P';
  const pieceImg_ = `<img src="${pieceImg(pieceCode)}" alt="${focusMove}">`;

  // 아이콘 색상 순서: 파랑 → 반투명파랑 → 초록 → 노랑
  const iconCls = ['reason-positive','reason-neutral','reason-good','reason-warning'];

  // 타이틀: "[기물아이콘 Qa1]이/가 좋은 이유:"
  let html = `
    <div class="best-explain-title">
      <span class="be-move-chip">${pieceImg_}${focusMove}</span>이/가 좋은 이유:
    </div>
    <div class="best-reason-list">`;

  const highlight = s => s.replace(
    /(O-O-O|O-O|[NBRQK][a-h]?[1-8]?x?[a-h][1-8][+#=]?|[a-h]x?[a-h][1-8][+#=]?|[a-h][1-8][+#]?)/g,
    m => m.length >= 2 ? `<strong>${m}</strong>` : m
  );

  reasonLines.slice(0, 4).forEach((reason, i) => {
    const cls = iconCls[i % iconCls.length];
    html += `
      <div class="best-reason-item">
        <div class="best-reason-icon ${cls}"></div>
        <span>${highlight(reason)}<span class="best-reason-plus">+</span></span>
      </div>`;
  });

  html += `</div>`;
  contentEl.innerHTML = html;
}

// ══════════════════════════════════════════════════════
// 초기화 및 모바일 패널
// ══════════════════════════════════════════════════════

// 엔터 키로 질문 제출
function setupCoachKeyboard() {
  const input = document.getElementById('coach-input');
  if (!input) return;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askCoach();
    }
  });
}

// 페이지 부트는 ui.js 의 bootstrapUi() 가 담당 (중복 init 호출 방지)

function toggleMobilePanel(forceClose) {
  const panel     = document.getElementById('right-panel');
  const backdrop  = document.getElementById('mobile-panel-backdrop');
  const iconOpen  = document.getElementById('mpanel-icon-open');
  const iconClose = document.getElementById('mpanel-icon-close');
  const isOpen    = panel.classList.contains('mobile-open');
  const shouldOpen = forceClose === false ? false : !isOpen;
  panel.classList.toggle('mobile-open', shouldOpen);
  backdrop.classList.toggle('show', shouldOpen);
  iconOpen.style.display  = shouldOpen ? 'none' : '';
  iconClose.style.display = shouldOpen ? ''      : 'none';
}
