/* ===================== DATA ===================== */

const THEMES = {
  mate: [
    { id:'mateIn1',   icon:'⚡', name:'1수 메이트',        desc:'단 한 수로 체크메이트! 가장 기초적이지만 빠른 판단력 훈련',        count:520, diff:'easy',   color:'#c04040' },
    { id:'mateIn2',   icon:'🎯', name:'2수 메이트',        desc:'2수 연속으로 체크메이트를 완성하는 패턴 훈련',                   count:430, diff:'medium', color:'#e08030' },
    { id:'mateIn3',   icon:'🧠', name:'3수 메이트',        desc:'3수 계산으로 완성하는 체크메이트. 수읽기 능력 핵심 훈련',        count:310, diff:'hard',   color:'#8855cc' },
    { id:'backRank',  icon:'🏚️', name:'백랭크 메이트',     desc:'1랭크(8랭크)의 약점을 이용한 클래식 메이트 패턴',              count:210, diff:'medium', color:'#c04040' },
    { id:'smothered', icon:'🕸️', name:'스모더드 메이트',   desc:'나이트가 킹을 자신의 기물들로 가둬 메이트하는 화려한 패턴',        count:98,  diff:'hard',   color:'#5090d0' },
    { id:'anastasia', icon:'🌊', name:'아나스타시아 메이트',desc:'룩과 나이트의 협력으로 킹을 가두는 아름다운 메이트',            count:72,  diff:'expert', color:'#2aada6' },
  ],
  tactics: [
    { id:'fork',        icon:'🍴', name:'포크 (Fork)',         desc:'하나의 기물로 두 개 이상의 적 기물을 동시에 공격하는 전술',           count:342, diff:'medium', color:'#e08030' },
    { id:'pin',         icon:'📌', name:'핀 (Pin)',            desc:'적 기물을 공격하여 뒤에 있는 더 가치 있는 기물을 보호',              count:289, diff:'medium', color:'#5090d0' },
    { id:'skewer',      icon:'🏹', name:'스큐어 (Skewer)',     desc:'가치 있는 기물을 강제로 이동시켜 뒤의 을 포획',                  count:198, diff:'hard',   color:'#c04040' },
    { id:'discovcheck', icon:'⚡', name:'디스커버 체크',            desc:'한 기물을 이동시켜 뒤의 기물이 체크를 가하는 강력한 전술',            count:156, diff:'hard',   color:'#cc3333' },
    { id:'sacrifice',   icon:'💥', name:'희생 (Sacrifice)',    desc:'장기적 이익을 위해 기물을 의도적으로 내어주는 기술',               count:231, diff:'hard',   color:'#8855cc' },
    { id:'xray',        icon:'🔬', name:'X레이 어택',           desc:'기물이 다른 기물을 통과해 공격하는 특수 전술',                       count:87,  diff:'expert', color:'#2aada6' },
    { id:'windmill',    icon:'🌪️', name:'윈드밀',              desc:'연속적인 체크로 상대 기물을 하나씩 포획하는 전술',                  count:64,  diff:'expert', color:'#8855cc' },
    { id:'deflection',  icon:'↗️', name:'편향 (Deflection)',   desc:'상대 기물의 방어 역할을 제거하여 전술적 기회 창출',                 count:178, diff:'hard',   color:'#c04040' },
  ],
  phases: [
    { id:'opening_trap', icon:'🪤', name:'오프닝 함정',        desc:'초반부에 상대방을 함정에 빠뜨리는 오프닝 전술',                  count:124, diff:'easy',   color:'#7fa650' },
    { id:'opening_dev',  icon:'🚀', name:'오프닝 개발',        desc:'효율적인 기물 전개와 센터 통제를 연습하는 퍼즐',                   count:98,  diff:'easy',   color:'#7fa650' },
    { id:'middlegame',   icon:'⚔️', name:'미들게임 전환',      desc:'오프닝에서 미들게임으로 넘어가는 핵심 포지션',                   count:203, diff:'medium', color:'#e08030' },
    { id:'endgame_basic',icon:'🏁', name:'기본 엔딩',          desc:'킹+폰 엔딩, 기본적인 체크메이트 패턴',                          count:167, diff:'easy',   color:'#7fa650' },
    { id:'endgame_rook', icon:'🏰', name:'룩 엔딩',            desc:'가장 흔한 엔딩 형태인 룩 엔딩 마스터하기',                       count:145, diff:'medium', color:'#e08030' },
    { id:'pawn_ending',  icon:'⬆️', name:'폰 엔딩',            desc:'폰 구조와 킹 포지셔닝이 핵심인 엔딩 퍼즐',                       count:189, diff:'medium', color:'#5090d0' },
  ],
  positional: [
    { id:'outpost',      icon:'🗺️', name:'아웃포스트',         desc:'상대방이 공격할 수 없는 강력한 칸에 기물 배치하기',                count:134, diff:'medium', color:'#5090d0' },
    { id:'pawn_structure',icon:'🧱',name:'폰 구조',            desc:'강한 폰 구조 형성과 약점 최소화 훈련',                           count:156, diff:'medium', color:'#e08030' },
    { id:'king_safety',  icon:'🛡️', name:'킹 안전',           desc:'자신의 킹을 보호하고 상대 킹의 약점을 찾는 훈련',               count:178, diff:'hard',   color:'#c04040' },
    { id:'bishop_pair',  icon:'⛪', name:'비숍 쌍',            desc:'두 비숍의 장기적 우위를 활용하는 포지셔널 이해',                 count:89,  diff:'hard',   color:'#8855cc' },
    { id:'rook_open',    icon:'🚪', name:'열린 파일',          desc:'열린 파일과 반열린 파일에서의 룩 활용법',                        count:112, diff:'medium', color:'#5090d0' },
  ],
  special: [
    { id:'stalemate',    icon:'🤝', name:'스테일메이트 트릭',  desc:'질 것 같은 상황에서 스테일메이트를 유도하는 방어 기술',           count:76,  diff:'hard',   color:'#c04040' },
    { id:'promotion',    icon:'👑', name:'폰 프로모션',        desc:'폰을 퀸으로 승격시키는 타이밍과 방법',                          count:143, diff:'medium', color:'#e08030' },
    { id:'zugzwang',     icon:'😰', name:'추크추방',           desc:'움직이면 불리해지는 상황을 만드는 고급 전략',                    count:58,  diff:'expert', color:'#2aada6' },
    { id:'interference', icon:'🚧', name:'간섭',       desc:'상대 기물의 연결을 끊어 방어를 무너뜨리는 전술',                   count:94,  diff:'expert', color:'#8855cc' },
  ]
};

const DAILY = {
  id: 'daily',
  icon: '📅',
  name: '오늘의 퍼즐',
  desc: '매일 새로운 퍼즐로 실력 점검',
  color: '#7fa650'
};

/* puzzle sets per theme */
function generateSets(themeId) {
  const sets = [];
  const names = [
    '기초 패턴', '응용 연습', '실전 포지션', '고급 패턴', '마스터 챌린지',
    '속도전', '복합 전술', '토너먼트 스타일', '그랜드마스터 컬렉션', '퍼즐 배틀'
  ];
  const statuses = ['new','new','progress','new','done','new','new','progress','done','new'];
  for (let i = 0; i < 8; i++) {
    sets.push({
      id: `${themeId}_set_${i+1}`,
      name: names[i] || `세트 ${i+1}`,
      count: Math.floor(Math.random() * 8 + 5),
      difficulty: ['800-1100','1100-1400','1400-1700','1700-2000'][Math.floor(i/2)] || '1400-1700',
      status: statuses[i] || 'new'
    });
  }
  return sets;
}

/* ============ LICHESS API ============ */

// Lichess theme ID → API theme name 매핑
const LICHESS_THEME_MAP = {
  // 전술
  fork:        'fork',
  pin:         'pin',
  skewer:      'skewer',
  discovcheck: 'discoveredAttack',
  sacrifice:   'sacrifice',
  xray:        'xRayAttack',
  windmill:    'trappedPiece',
  deflection:  'deflection',
  // 메이트
  mateIn1:     'mateIn1',
  mateIn2:     'mateIn2',
  mateIn3:     'mateIn3',
  backRank:    'backRankMate',
  smothered:   'smotheredMate',
  anastasia:   'anastasiaMate',
  // 오프닝 & 엔딩
  opening_trap:'opening',
  opening_dev: 'opening',
  endgame_basic:'endgame',
  endgame_rook:'rookEndgame',
  pawn_ending: 'pawnEndgame',
  // 포지셔널
  outpost:     'outpost',
  pawn_structure:'pawnStructure',
  king_safety: 'kingsideAttack',
  bishop_pair: 'bishopEndgame',
  rook_open:   'rookEndgame',
  // 특수
  stalemate:   'stalemate',
  promotion:   'promotion',
  zugzwang:    'zugzwang',
  interference:'interference',
  // 데일리
  daily:       null,
};

// 난이도 → Lichess difficulty 문자열
// GET /api/puzzle/batch/{angle}?nb=10&difficulty=normal
// angle = 테마명 (path param), difficulty = easiest|easier|normal|harder|hardest
const DIFF_MAP = {
  beginner:     'easiest',
  intermediate: 'normal',
  advanced:     'harder',
  expert:       'hardest',
};

let _lichessToken = null;

async function getLichessToken() {
  if (_lichessToken) return _lichessToken;
  try {
    const res = await fetch('/api/lichess-token');
    if (res.ok) {
      const data = await res.json();
      _lichessToken = data.token || null;
    }
  } catch(e) { _lichessToken = null; }
  return _lichessToken;
}

// Lichess에서 퍼즐 배치 가져오기
// 실제 엔드포인트: GET /api/puzzle/batch/{angle}?nb=10&difficulty=normal
// angle은 URL path에 들어감 (themes 쿼리 파라미터 아님!)
async function fetchLichessPuzzles(themeId, diff, count = 10) {
  const token = await getLichessToken();
  const lichessTheme = LICHESS_THEME_MAP[themeId] || 'mix';
  const difficulty   = DIFF_MAP[diff] || 'normal';

  const params = new URLSearchParams({ nb: count, difficulty });
  const headers = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // ✅ 올바른 엔드포인트: /api/puzzle/batch/{angle}
  const url = `https://lichess.org/api/puzzle/batch/${encodeURIComponent(lichessTheme)}?${params}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Lichess API ${res.status}: ${url}`);
  const json = await res.json();

  // 응답: { puzzles: [{ puzzle: { id, initialFen, solution, themes, rating }, game: {...} }] }
  return (json.puzzles || []).map(p => parseLichessPuzzle(p, themeId));
}

// 오늘의 퍼즐
async function fetchDailyPuzzle() {
  const token = await getLichessToken();
  const headers = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('https://lichess.org/api/puzzle/daily', { headers });
  if (!res.ok) throw new Error(`Lichess daily puzzle error: ${res.status}`);
  const json = await res.json();
  return parseLichessPuzzle(json, 'daily');
}

function parseLichessPuzzle(raw, themeId) {
  const puzzleData = raw.puzzle || raw;
  const gameData   = raw.game   || {};

  // Lichess batch API는 FEN을 직접 주지 않고 game.pgn + puzzle.initialPly를 줌
  // initialPly번째 수까지 적용한 포지션이 퍼즐 시작 FEN
  const pgn        = gameData.pgn || '';
  const initialPly = puzzleData.initialPly || 0;
  const solutionUCI = puzzleData.solution || [];

  // chess.js로 PGN → FEN 변환
  let fen = '';
  let opponentLastMove = null; // 상대방의 마지막 수 (유도 수)
  try {
    const chess = new Chess();
    // PGN의 수를 공백으로 분리 (기보 표기 제거: 1. 2. 등)
    const moves = pgn.trim().split(/\s+/).filter(t => !/^\d+\./.test(t) && t !== '');
    // initialPly번째 수까지 적용 (= 상대방의 유도 수 포함)
    // Lichess: initialPly는 1-based index, 해당 수를 두고 난 포지션이 퍼즐 시작
    // Lichess initialPly는 0-based 인덱스: moves[0..initialPly] 총 (initialPly+1)수 적용
    // moves[initialPly] = 상대방의 유도 수, 그 다음이 사용자 차례
    for (let i = 0; i <= initialPly && i < moves.length; i++) {
      const result = chess.move(moves[i], { sloppy: true });
      if (i === initialPly && result) {
        opponentLastMove = result.from + result.to + (result.promotion || '');
      }
    }
    fen = chess.fen();
  } catch(e) {
    console.error('[puzzle] PGN→FEN 실패:', e, pgn);
  }

  const fenParts   = fen.split(' ');
  const puzzleTurn = fenParts[1] === 'w' ? 'white' : 'black';

  const themes = puzzleData.themes || [];
  const themeLabel = THEME_LABEL_MAP[themeId] || themes[0] || themeId;

  // Lichess: initialPly까지 재생한 포지션 = 상대방이 마지막 수를 둔 직후
  // opponentLastMove를 로드 시 애니메이션으로 보여주고, 그 다음이 사용자 차례
  // solution 전체 = [사용자수, 엔진응수, 사용자수, ...] 사용자부터 시작
  console.log('[puzzle]', puzzleData.id, '| ply:', initialPly, '| fen:', fen.split(' ')[0], '| solution:', solutionUCI, '| userTurn:', puzzleTurn, '| opponentLastMove:', opponentLastMove);
  return {
    lichessId: puzzleData.id || '',
    title: `${themeLabel} #${puzzleData.id || '?'}`,
    rating: puzzleData.rating || 1200,
    fen,
    opponentMove: opponentLastMove,
    solution: solutionUCI,
    fullSolution: solutionUCI,
    hint: themes.length > 0 ? `전술 테마: ${themes.slice(0,3).join(', ')}` : '최선의 수를 찾으세요',
    moves: solutionUCI.length,
    themes,
    turn: puzzleTurn,
    gameUrl: gameData.id ? `https://lichess.org/${gameData.id}` : null,
  };
}

const THEME_LABEL_MAP = {
  fork:'포크', pin:'핀', skewer:'스큐어', discovcheck:'디스커버 어택',
  sacrifice:'희생', xray:'X레이', windmill:'윈드밀',
  deflection:'편향', mateIn1:'1수 메이트', mateIn2:'2수 메이트', mateIn3:'3수 메이트',
  backRank:'백랭크 메이트', smothered:'스모더드 메이트',
  anastasia:'아나스타시아 메이트', opening_trap:'오프닝 함정',
  opening_dev:'오프닝 개발', endgame_basic:'기본 엔딩',
  endgame_rook:'룩 엔딩', pawn_ending:'폰 엔딩', outpost:'전초기지',
  pawn_structure:'폰 구조', king_safety:'킹 안전', bishop_pair:'비숍 쌍',
  rook_open:'열린 파일', stalemate:'스테일메이트', promotion:'프로모션',
  zugzwang:'추크추방', interference:'간섭', daily:'오늘의 퍼즐',
};

// 캐시 (테마+난이도 → 퍼즐 배열)
const _puzzleCache = {};

async function getPuzzles(themeId, diff) {
  const key = `${themeId}__${diff}`;
  if (!_puzzleCache[key]) {
    if (themeId === 'daily') {
      _puzzleCache[key] = [await fetchDailyPuzzle()];
    } else {
      _puzzleCache[key] = await fetchLichessPuzzles(themeId, diff, 10);
    }
  }
  return _puzzleCache[key];
}

/* ============ STATE ============ */
const PUZZLE_STATS_STORAGE_KEY = 'chess_education_puzzle_stats_v1';

let state = {
  currentTheme: null,
  selectedDiff: 'beginner',
  selectedSet: null,
  currentPuzzleIdx: 0,
  totalPuzzles: 10,
  correctCount: 0,
  wrongAttempts: 0,
  streak: 0,
  bestStreak: 0,
  totalSolved: 0,
  todaySolved: 0,
  lastStatsDay: '',
  rating: 1200,
  board: null,
  selectedSq: null,
  hintShown: false,
  solutionShown: false,
  puzzleSolved: false,
  flipped: false,
  moveHistory: [],
  currentPuzzle: null,
  puzzles: [],
  solutionMoveIdx: 0,
  savedBoard: null,       // 틀렸을 때 되돌리기용 보드 스냅샷
  savedMoveHistory: [],
  lastMoveSq: null,       // 마지막 수 좌표 [fr,fc,tr,tc]
  wrongMove: false,       // 틀린 수 상태 (클릭 시 복원)
  waitingEngine: false,   // 엔진 응수 대기 중
  _legalChess: null,      // chess.js — 합법수·차례 (전체 FEN + solution 재생)
};

/* ============ RENDER THEME GRIDS ============ */
function renderThemeCard(theme) {
  const diffLabels = { easy:'입문', medium:'중급', hard:'고급', expert:'전문가' };
  return `
    <div class="theme-card" style="--card-accent:${theme.color}" onclick="openTheme('${theme.id}')">
      <div class="theme-card-icon">${theme.icon}</div>
      <div class="theme-card-name">${theme.name}</div>
      <div class="theme-card-desc">${theme.desc}</div>
      <div class="theme-card-meta">
        <span class="theme-card-count">${theme.count.toLocaleString()}개</span>
        <span class="theme-card-diff diff-${theme.diff}">${diffLabels[theme.diff]}</span>
      </div>
    </div>
  `;
}

function initThemeGrids() {
  document.getElementById('grid-mate').innerHTML       = THEMES.mate.map(renderThemeCard).join('');
  document.getElementById('grid-tactics').innerHTML    = THEMES.tactics.map(renderThemeCard).join('');
  document.getElementById('grid-phases').innerHTML     = THEMES.phases.map(renderThemeCard).join('');
  document.getElementById('grid-positional').innerHTML = THEMES.positional.map(renderThemeCard).join('');
  document.getElementById('grid-special').innerHTML    = THEMES.special.map(renderThemeCard).join('');
}

function normalizeDiffParam(v) {
  if (!v) return null;
  const map = { easy: 'beginner', 쉬움: 'beginner', medium: 'intermediate', 보통: 'intermediate', hard: 'advanced', 어려움: 'advanced' };
  if (map[v]) return map[v];
  if (['beginner', 'intermediate', 'advanced', 'expert'].includes(v)) return v;
  return null;
}

function setDifficultySelection(diff) {
  const allowed = ['beginner', 'intermediate', 'advanced', 'expert'];
  const d = allowed.includes(diff) ? diff : 'beginner';
  state.selectedDiff = d;
  document.querySelectorAll('#diff-row .diff-btn').forEach(function (b) {
    b.classList.toggle('selected', b.getAttribute('data-diff') === d);
  });
}

function applyQueryFromUrl() {
  var params = new URLSearchParams(window.location.search);
  var mode = params.get('mode');
  if (mode === 'custom') {
    const fen = params.get('fen');
    const solution = params.get('solution');
    const title = params.get('title') || '맞춤 전술 퍼즐';
    if (fen && solution) {
      startCustomPuzzle(fen, solution, title);
      return;
    }
  }
  var themeId = params.get('theme');
  if (!themeId || !findTheme(themeId)) return;
  var preset = normalizeDiffParam(params.get('diff')) || 'beginner';
  openTheme(themeId, preset);
}

async function startCustomPuzzle(fen, solutionStr, title) {
  document.getElementById('theme-list-view').style.display = 'none';
  document.getElementById('puzzle-board-view').classList.add('show');
  
  const solution = solutionStr.split(',');
  const fenParts = fen.split(' ');
  const turn = fenParts[1] === 'w' ? 'white' : 'black';
  
  const customPuzzle = {
    lichessId: 'custom',
    title: title,
    rating: 0,
    fen: fen,
    opponentMove: null,
    solution: solution,
    fullSolution: solution,
    hint: '최선의 전술을 찾아보세요',
    moves: Math.ceil(solution.length / 2),
    themes: ['custom'],
    turn: turn
  };
  
  state.puzzles = [customPuzzle];
  state.totalPuzzles = 1;
  state.currentTheme = { icon: '🧩', name: '맞춤 퍼즐', id: 'custom' };
  state.flipped = (turn === 'black');
  
  document.getElementById('psp-theme-tag').textContent = `🧩 맞춤 퍼즐`;
  loadPuzzle(0);
}

function findTheme(id) {
  if (id === 'daily') return DAILY;
  for (const group of Object.values(THEMES)) {
    const t = group.find(x => x.id === id);
    if (t) return t;
  }
  return null;
}

/* ============ MODAL ============ */
function openTheme(themeId, presetDiff) {
  const theme = findTheme(themeId);
  if (!theme) return;
  state.currentTheme = theme;

  document.getElementById('modal-theme-icon').textContent = theme.icon;
  document.getElementById('modal-theme-name').textContent = theme.name;
  document.getElementById('modal-theme-desc').textContent = theme.desc;

  var diff = presetDiff && ['beginner', 'intermediate', 'advanced', 'expert'].includes(presetDiff) ? presetDiff : 'beginner';
  setDifficultySelection(diff);

  renderPuzzleSets(themeId);

  document.getElementById('puzzle-modal-backdrop').classList.add('show');
}

function renderPuzzleSets(themeId) {
  const lichessTheme = LICHESS_THEME_MAP[themeId];
  document.getElementById('puzzle-set-list').innerHTML = `
    <div class="puzzle-set-item" style="cursor:default;border-color:var(--accent-green-dark);">
      <div class="puzzle-set-num" style="background:rgba(127,166,80,0.15);color:var(--accent-green-bright);">♟</div>
      <div class="puzzle-set-info">
        <div class="puzzle-set-name">Lichess 실시간 퍼즐</div>
        <div class="puzzle-set-meta">
          테마: <strong>${lichessTheme || '랜덤'}</strong> · 난이도에 맞는 퍼즐 10개를 실시간으로 불러옵니다
        </div>
      </div>
      <span class="puzzle-set-status status-new">실시간</span>
    </div>
    <div style="font-size:11px;color:var(--text-muted);padding:8px 4px;line-height:1.6;">
      🔑 Lichess API 토큰이 설정되어 있으면 개인화된 퍼즐을 받을 수 있습니다.<br>
      토큰 없이도 퍼즐을 불러올 수 있습니다.
    </div>
  `;
}

function selectSet(el, id) {
  document.querySelectorAll('.puzzle-set-item').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedSet = id;
}

function selectDiff(btn, diff) {
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.selectedDiff = diff;
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('puzzle-modal-backdrop')) {
    document.getElementById('puzzle-modal-backdrop').classList.remove('show');
  }
}

function startSelected() {
  closeModal();
  enterPuzzleView();
}

function startRandom() {
  closeModal();
  enterPuzzleView();
}

/* ============ PUZZLE VIEW ============ */
async function enterPuzzleView() {
  document.getElementById('theme-list-view').style.display = 'none';
  document.getElementById('puzzle-board-view').classList.add('show');

  const theme = state.currentTheme;
  document.getElementById('psp-theme-tag').textContent = `${theme.icon} ${theme.name}`;
  document.getElementById('psp-puzzle-title').textContent = '퍼즐 불러오는 중…';

  state.currentPuzzleIdx = 0;
  state.moveHistory = [];
  state.puzzles = [];

  // 로딩 표시
  showBoardLoading(true);

  try {
    const puzzles = await getPuzzles(theme.id, state.selectedDiff);
    state.puzzles = puzzles;
    state.totalPuzzles = puzzles.length;
    showBoardLoading(false);
    loadPuzzle(0);
  } catch(err) {
    showBoardLoading(false);
    document.getElementById('psp-puzzle-title').textContent = '불러오기 실패';
    document.getElementById('psp-instruction-text').textContent =
      `⚠️ Lichess API 오류: ${err.message}. 토큰을 확인하거나 잠시 후 다시 시도하세요.`;
    console.error('Lichess fetch error:', err);
  }
}

function showBoardLoading(on) {
  const board = document.getElementById('puzzle-chessboard');
  if (on) {
    board.innerHTML = `
      <div style="grid-column:1/-1;grid-row:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--text-muted);">
        <div class="lichess-spinner"></div>
        <div style="font-size:13px;">Lichess에서 퍼즐 불러오는 중…</div>
      </div>`;
  }
}

function exitPuzzleView() {
  document.getElementById('puzzle-board-view').classList.remove('show');
  document.getElementById('theme-list-view').style.display = 'flex';
}

function loadPuzzle(idx) {
  const puzzle = state.puzzles[idx];
  if (!puzzle) return;

  state.currentPuzzle = puzzle;
  state.selectedSq = null;
  state.hintShown = false;
  state.solutionShown = false;
  state.puzzleSolved = false;
  state.solutionMoveIdx = 0;
  state.moveHistory = [];
  state.savedBoard = null;
  state.savedMoveHistory = [];
  state.lastMoveSq = null;
  state.wrongMove = false;
  state.waitingEngine = false;

  // 보드 방향 설정 (흑 차례면 뒤집기)
  const wt = normalizePuzzleTurn(puzzle.turn);
  state.flipped = (wt === 'black');

  document.getElementById('puzzle-nav-info').textContent = `퍼즐 ${idx+1} / ${state.totalPuzzles}`;
  document.getElementById('psp-puzzle-title').textContent = puzzle.title;
  document.getElementById('psp-rating').textContent = `레이팅: ${puzzle.rating}`;
  document.getElementById('psp-moves').textContent = `${puzzle.moves}수`;
  document.getElementById('eval-chip').textContent = `레이팅: ${puzzle.rating}`;
  document.getElementById('psp-instruction-text').textContent = '최선의 수를 찾아보세요. 기물을 클릭한 후 이동할 칸을 클릭하세요.';

  const pct = (idx / state.totalPuzzles * 100).toFixed(0);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `${idx} / ${state.totalPuzzles}`;

  hideFeedback();
  updateMoveHistory();
  document.getElementById('retry-btn').style.display = 'none';

  // ── 퍼즐 FEN 합법성 검증 & 자동 교정 ─────────────────────────────
  // puzzle.fen 에서 solution[0]이 합법적 수인지 Chess.js 로 확인한다.
  // 합법적이지 않으면 FEN이 "수를 둔 이후"일 가능성이 높음 →
  // puzzle.fenBefore 또는 positions 배열에서 올바른 FEN을 찾아 교정한다.
  if (typeof Chess !== 'undefined' && puzzle.fen && puzzle.solution && puzzle.solution[0]) {
    const _solUci  = puzzle.solution[0];
    const _mvObj   = { from: _solUci.slice(0,2), to: _solUci.slice(2,4) };
    if (_solUci.length > 4) _mvObj.promotion = _solUci[4];
    let _fenOk = false;
    try { _fenOk = !!(new Chess(puzzle.fen).move(_mvObj)); } catch(e) {}

    if (!_fenOk) {
      console.warn('[loadPuzzle] solution이 비합법 → FEN 교정 시도:', _solUci, 'on', puzzle.fen);
      // 1순위: puzzle.fenBefore (chess-tactics.js 패치로 심은 값)
      if (puzzle.fenBefore) {
        try {
          if (new Chess(puzzle.fenBefore).move(_mvObj)) {
            puzzle.fen = puzzle.fenBefore;
            _fenOk = true;
            console.log('[loadPuzzle] fenBefore 로 교정 성공');
          }
        } catch(e) {}
      }
      // 2순위: PGN 재파싱으로 positions 배열 생성 후 탐색
      if (!_fenOk && puzzle._pgn) {
        try {
          const _pgnPositions = (function(pgn) {
            const chess = new Chess();
            const moves = pgn.replace(/\[[^\]]*\]/g,'').trim()
              .split(/\s+/).filter(t => !/^\d+\./.test(t) && t && !t.startsWith('{') && !['1-0','0-1','1/2-1/2','*'].includes(t));
            const arr = [{ fen: chess.fen() }];
            for (const san of moves) {
              const r = chess.move(san, { sloppy: true });
              if (!r) break;
              arr.push({ fen: chess.fen() });
            }
            return arr;
          })(puzzle._pgn);
          for (let _pi = 0; _pi < _pgnPositions.length; _pi++) {
            try {
              if (new Chess(_pgnPositions[_pi].fen).move(_mvObj)) {
                puzzle.fen = _pgnPositions[_pi].fen;
                _fenOk = true;
                console.log('[loadPuzzle] PGN positions[' + _pi + '] 로 교정 성공');
                break;
              }
            } catch(e2) {}
          }
        } catch(e) {}
      }
      if (!_fenOk) {
        console.error('[loadPuzzle] FEN 교정 실패 — 퍼즐 건너뜀:', puzzle.title);
        nextPuzzle();
        return;
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────

  // FEN 파싱 후 보드 저장 (초기 상태 보존)
  parseFenAndDraw(puzzle.fen);
  // 파싱 직후 저장
  state.savedBoard = state.board ? state.board.map(row => [...row]) : null;
  state.savedMoveHistory = [];
  if (puzzle.opponentMove) {
    const targetIdx = idx;
    const opMove = puzzle.opponentMove;
    setTimeout(() => {
      if (state.currentPuzzleIdx === targetIdx) {
        // FEN에 이미 상대방 수가 반영되어 있으므로 보드 재적용 없이 하이라이트만 표시
        console.log('[puzzle] highlighting opponent last move:', opMove);
        const coords = uciToCoords(opMove);
        clearHighlights();
        getSquareEl(coords.fr, coords.fc)?.classList.add('last-move');
        getSquareEl(coords.tr, coords.tc)?.classList.add('last-move');
        state.lastMoveSq = [coords.fr, coords.fc, coords.tr, coords.tc];
        state.savedBoard = state.board.map(row => [...row]);
        state.savedMoveHistory = [];
      }
    }, 400);
  }

  // Lichess 링크 표시
  const linkEl = document.getElementById('lichess-link');
  if (linkEl) {
    linkEl.href = puzzle.gameUrl || `https://lichess.org/training/${puzzle.lichessId}`;
    linkEl.style.display = puzzle.lichessId ? '' : 'none';
  }

  const srcEl = document.getElementById('psp-game-source');
  const srcText = document.getElementById('psp-game-source-text');
  if (puzzle.isGameBased && srcEl && srcText) {
    srcEl.style.display = 'flex';
    const resultLabel = puzzle.gameResult === '1-0'
      ? (puzzle.myColor === 'w' ? '승리' : '패배')
      : puzzle.gameResult === '0-1'
        ? (puzzle.myColor === 'b' ? '승리' : '패배') : '무승부';
    const tactName = (typeof TACTIC_META !== 'undefined' && TACTIC_META[puzzle.tacticType])
      ? TACTIC_META[puzzle.tacticType].name : '전술';
    srcText.innerHTML = '<b>내 대국 기반</b> — ' + puzzle.gameDateStr + ' ' + puzzle.gameVs + ' (' + resultLabel + ')<br>' + puzzle.moveNum + '수에서의 ' + tactName + ' 기회';
  } else if (srcEl) {
    srcEl.style.display = 'none';
  }

  updatePuzzleTurnUI();
}

/* ============ UCI MOVE APPLICATION ============ */
function uciToCoords(uci) {
  // e.g. "e2e4" → { fr:6, fc:4, tr:4, tc:4 }
  const fc = PUZZLE_FILES.indexOf(uci[0]);
  const fr = 8 - parseInt(uci[1]);
  const tc = PUZZLE_FILES.indexOf(uci[2]);
  const tr = 8 - parseInt(uci[3]);
  return { fr, fc, tr, tc };
}

function applyMoveToBoard(uci) {
  if (!uci || uci.length < 4) return null;
  const { fr, fc, tr, tc } = uciToCoords(uci);
  if (fr < 0 || fr > 7 || fc < 0 || fc > 7 || tr < 0 || tr > 7 || tc < 0 || tc > 7) return null;
  const piece = state.board[fr][fc];
  if (!piece) return { fr, fc, tr, tc };

  // 앙파상: 폰이 대각선으로 이동하는데 목적지가 비어있는 경우 (이동 전에 체크!)
  const isEnPassant = (piece === 'P' || piece === 'p') && fc !== tc && !state.board[tr][tc];

  state.board[tr][tc] = piece;
  state.board[fr][fc] = null;

  if (isEnPassant) {
    state.board[fr][tc] = null;
  }
  // 캐슬링
  if (piece === 'K' && Math.abs(fc - tc) === 2) {
    if (tc === 6) { state.board[fr][7] = null; state.board[fr][5] = 'R'; }
    else          { state.board[fr][0] = null; state.board[fr][3] = 'R'; }
  }
  if (piece === 'k' && Math.abs(fc - tc) === 2) {
    if (tc === 6) { state.board[fr][7] = null; state.board[fr][5] = 'r'; }
    else          { state.board[fr][0] = null; state.board[fr][3] = 'r'; }
  }
  // 프로모션 (uci 5번째 문자)
  if (uci.length === 5) {
    const promo = uci[4];
    state.board[tr][tc] = piece === piece.toUpperCase() ? promo.toUpperCase() : promo.toLowerCase();
  }
  return { fr, fc, tr, tc };
}

function applyOpponentMove(uci) {
  console.log('[puzzle] applyOpponentMove:', uci, '| board null?', !state.board);
  const coords = applyMoveToBoard(uci);
  // coords가 없어도 (기물이 없는 칸 등) 보드는 항상 그린다
  drawBoard();
  if (coords) {
    const { fr, fc, tr, tc } = coords;
    getSquareEl(fr, fc)?.classList.add('last-move');
    getSquareEl(tr, tc)?.classList.add('last-move');
    const fromAlg = PUZZLE_FILES[fc] + (8-fr);
    const toAlg   = PUZZLE_FILES[tc] + (8-tr);
    state.moveHistory.push({ alg: fromAlg+'-'+toAlg, type:'engine' });
    updateMoveHistory();
  }
}

/* ============ BOARD RENDERING ============ */
const PUZZLE_PIECES = {
  'K':'♔','Q':'♕','R':'♖','B':'♗','N':'♘','P':'♙',
  'k':'♚','q':'♛','r':'♜','b':'♝','n':'♞','p':'♟'
};
const PUZZLE_FILES = ['a','b','c','d','e','f','g','h'];

function parseFenAndDraw(fen) {
  if (!fen || typeof fen !== 'string') {
    console.error('[puzzle] parseFenAndDraw: invalid FEN', fen);
    return;
  }
  fen = fen.trim();
  const board = Array.from({length:8}, () => Array(8).fill(null));
  const parts = fen.split(' ');
  const rows = parts[0].split('/');

  rows.forEach((row, r) => {
    let c = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) { c += +ch; }
      else if ('KQRBNPkqrbnp'.includes(ch)) { board[r][c] = ch; c++; }
    }
  });

  state.board = board;
  const pieceCount = board.flat().filter(Boolean).length;
  console.log('[puzzle] FEN parsed:', parts[0], '| pieces:', pieceCount);
  if (pieceCount === 0) {
    console.error('[puzzle] WARNING: No pieces parsed from FEN! Raw FEN:', JSON.stringify(fen));
  }
  drawBoard();
}

function drawBoard() {
  const container = document.getElementById('puzzle-chessboard');
  container.innerHTML = '';
  const flipped = state.flipped;

  for (let ri = 0; ri < 8; ri++) {
    for (let ci = 0; ci < 8; ci++) {
      const r = flipped ? 7 - ri : ri;
      const c = flipped ? 7 - ci : ci;

      const sq = document.createElement('div');
      const isLight = (ri + ci) % 2 === 0;
      sq.className = 'chess-square ' + (isLight ? 'light' : 'dark');
      sq.dataset.r = r;
      sq.dataset.c = c;

      // piece - lichess SVG images
      const piece = state.board[r][c];
      if (piece) {
        const img = document.createElement('img');
        const color = piece === piece.toUpperCase() ? 'w' : 'b';
        const type = piece.toUpperCase();
        img.src = `https://lichess1.org/assets/piece/cburnett/${color}${type}.svg`;
        img.style.cssText = 'width:88%;height:88%;pointer-events:none;display:block;';
        img.draggable = false;
        sq.appendChild(img);
      }

      // labels
      if (ci === (flipped ? 0 : 7)) {
        const rl = document.createElement('span');
        rl.className = 'sq-label-rank';
        rl.textContent = 8 - r;
        sq.appendChild(rl);
      }
      if (ri === (flipped ? 0 : 7)) {
        const fl = document.createElement('span');
        fl.className = 'sq-label-file';
        fl.textContent = PUZZLE_FILES[c];
        sq.appendChild(fl);
      }

      sq.addEventListener('click', () => handleSquareClick(r, c));
      container.appendChild(sq);
    }
  }
}

function getSquareEl(r, c) {
  return document.querySelector(`.chess-square[data-r="${r}"][data-c="${c}"]`);
}

function clearHighlights() {
  document.querySelectorAll('.chess-square').forEach(sq => {
    sq.classList.remove('selected','highlight-move','hint','correct','wrong','last-move');
    sq.querySelectorAll('.move-dot').forEach(d => d.remove());
  });
}

// puzzle.turn: Lichess는 'white'/'black', 기보 생성은 chess.turn() → 'w'/'b'
function normalizePuzzleTurn(t) {
  if (t === 'w' || t === 'white') return 'white';
  if (t === 'b' || t === 'black') return 'black';
  return 'white';
}

/** 퍼즐 시작 FEN + 이미 둔 solution[0..idx-1] 재생 → 합법수·차례 일치 */
function syncLegalChessFromSolution() {
  const pz = state.currentPuzzle;
  if (!pz || !pz.fen) {
    state._legalChess = null;
    return;
  }
  try {
    const ch = new Chess(pz.fen);
    const max = Math.min(state.solutionMoveIdx, (pz.solution && pz.solution.length) ? pz.solution.length : 0);
    for (let i = 0; i < max; i++) {
      const u = (pz.solution[i] || '').toLowerCase();
      if (!u || u.length < 4) break;
      const mv = { from: u.slice(0, 2), to: u.slice(2, 4) };
      if (u.length >= 5) mv.promotion = u.slice(4, 5);
      if (!ch.move(mv)) {
        console.warn('[puzzle] solution 재생 실패', i, u);
        break;
      }
    }
    state._legalChess = ch;
  } catch (e) {
    console.warn('[puzzle] syncLegalChessFromSolution', e);
    state._legalChess = null;
  }
}

function updatePuzzleTurnUI() {
  const elT = document.getElementById('turn-text');
  const elD = document.getElementById('turn-dot');
  if (!elT || !elD) return;
  syncLegalChessFromSolution();
  const wt = state._legalChess
    ? (state._legalChess.turn() === 'w' ? 'white' : 'black')
    : normalizePuzzleTurn(state.currentPuzzle && state.currentPuzzle.turn);
  elT.textContent = wt === 'white' ? '백 차례' : '흑 차례';
  elD.style.background = wt === 'white' ? '#f0f0f0' : '#1a1a1a';
  elD.style.border = wt === 'white' ? '1px solid #bbb' : '2px solid #666';
}

function getCurrentTurn() {
  syncLegalChessFromSolution();
  if (state._legalChess) {
    return state._legalChess.turn() === 'w' ? 'white' : 'black';
  }
  return normalizePuzzleTurn(state.currentPuzzle && state.currentPuzzle.turn);
}

function getLegalMovesFrom(r, c) {
  try {
    syncLegalChessFromSolution();
    if (!state._legalChess) return [];
    const fromSq = PUZZLE_FILES[c] + (8 - r);
    const moves = state._legalChess.moves({ square: fromSq, verbose: true });
    return moves.map(m => ({
      tr: 8 - parseInt(m.to[1], 10),
      tc: PUZZLE_FILES.indexOf(m.to[0]),
      capture: !!m.captured
    }));
  } catch (e) { return []; }
}

// 특정 칸에서 이동 가능한 목적지를 UCI 문자열 Set으로 반환
function getLegalUciFrom(r, c) {
  try {
    syncLegalChessFromSolution();
    if (!state._legalChess) return new Set();
    const fromSq = PUZZLE_FILES[c] + (8 - r);
    const moves = state._legalChess.moves({ square: fromSq, verbose: true });
    const uciSet = new Set();
    moves.forEach(m => {
      const uci = m.from + m.to + (m.promotion || '');
      uciSet.add(uci);
      if (m.promotion && m.promotion !== 'q') {
        uciSet.add(m.from + m.to + 'q');
      }
    });
    return uciSet;
  } catch (e) { return new Set(); }
}

function showMoveDots(moves) {
  moves.forEach(({ tr, tc, capture }) => {
    const sq = getSquareEl(tr, tc);
    if (!sq) return;
    const dot = document.createElement('div');
    dot.className = capture ? 'move-dot capture-ring' : 'move-dot';
    sq.appendChild(dot);
  });
}

function handleSquareClick(r, c) {
  if (state.puzzleSolved || state.solutionShown) return;
  if (state.waitingEngine) return;

  const piece = state.board[r][c];
  const currentTurn = getCurrentTurn();

  if (state.wrongMove) {
    // 틀린 수 후 아무 칸 클릭 → 보드 되돌리기
    state.wrongMove = false;
    restoreBoard();
    hideFeedback();
    return;
  }

  if (state.selectedSq) {
    const [sr, sc] = state.selectedSq;

    if (sr === r && sc === c) {
      state.selectedSq = null;
      clearHighlights();
      return;
    }

    // 같은 색 기물을 다시 클릭하면 선택 변경
    const isOwnPiece = piece && (
      (currentTurn === 'white' && piece === piece.toUpperCase()) ||
      (currentTurn === 'black' && piece === piece.toLowerCase())
    );
    if (isOwnPiece) {
      state.selectedSq = [r, c];
      clearHighlights();
      getSquareEl(r, c)?.classList.add('selected');
      showMoveDots(getLegalMovesFrom(r, c));
      return;
    }

    const fromAlg = PUZZLE_FILES[sc] + (8 - sr);
    const toAlg   = PUZZLE_FILES[c]  + (8 - r);
    tryMove(sr, sc, r, c, fromAlg + toAlg);
  } else {
    // 내 기물 선택
    const isOwnPiece = piece && (
      (currentTurn === 'white' && piece === piece.toUpperCase()) ||
      (currentTurn === 'black' && piece === piece.toLowerCase())
    );
    if (isOwnPiece) {
      state.selectedSq = [r, c];
      clearHighlights();
      getSquareEl(r, c)?.classList.add('selected');
      showMoveDots(getLegalMovesFrom(r, c));
    }
  }
}

function saveBoard() {
  // 현재 보드 상태 스냅샷 저장
  state.savedBoard = state.board.map(row => [...row]);
  state.savedMoveHistory = [...state.moveHistory];
}

function restoreBoard() {
  // 저장된 보드로 복원
  if (state.savedBoard) {
    state.board = state.savedBoard.map(row => [...row]);
    state.moveHistory = [...state.savedMoveHistory];
    drawBoard();
    // 마지막 수 하이라이트 복원
    if (state.lastMoveSq) {
      const [fr, fc, tr, tc] = state.lastMoveSq;
      getSquareEl(fr, fc)?.classList.add('last-move');
      getSquareEl(tr, tc)?.classList.add('last-move');
    }
    updateMoveHistory();
    syncLegalChessFromSolution();
  }
}

function tryMove(fr, fc, tr, tc, moveStr) {
  const puzzle = state.currentPuzzle;
  const expectedMove = puzzle.solution[state.solutionMoveIdx];

  clearHighlights();
  state.selectedSq = null;

  // ── 합법 수 검증: 체스 룰상 불가능한 이동은 즉시 차단 ──────────────────
  const legalUcis = getLegalUciFrom(fr, fc);
  const baseMoveStr = moveStr.slice(0, 4); // 프로모션 제외 4자리
  const isLegal = legalUcis.has(moveStr) ||
                  legalUcis.has(baseMoveStr) ||
                  legalUcis.has(baseMoveStr + 'q'); // 퀸 프로모션 기본 허용
  if (!isLegal) {
    // 룰 위반 — 조용히 선택만 해제 (피드백 없이)
    return;
  }
  // ────────────────────────────────────────────────────────────────────────

  const fromSq = getSquareEl(fr, fc);
  const toSq   = getSquareEl(tr, tc);

  const isCorrect = expectedMove && (
    moveStr === expectedMove ||
    moveStr.slice(0,4) === expectedMove.slice(0,4)
  );

  if (isCorrect) {
    // 이동 전 보드 저장
    saveBoard();
    state.lastMoveSq = [fr, fc, tr, tc];

    applyMoveToBoard(expectedMove);

    // 정답 하이라이트
    drawBoard();
    getSquareEl(fr, fc)?.classList.add('last-move');
    getSquareEl(tr, tc)?.classList.add('correct');

    const fromAlg = PUZZLE_FILES[fc] + (8-fr);
    const toAlg   = PUZZLE_FILES[tc] + (8-tr);
    state.moveHistory.push({ alg: fromAlg+'-'+toAlg, type:'user' });
    state.solutionMoveIdx++;
    updateMoveHistory();

    if (state.solutionMoveIdx >= puzzle.solution.length) {
      // 퍼즐 완료!
      state.puzzleSolved = true;
      state.streak++;
      state.totalSolved++;
      state.correctCount++;
      const today = new Date().toISOString().slice(0, 10);
      if (state.lastStatsDay !== today) {
        state.todaySolved = 0;
        state.lastStatsDay = today;
      }
      state.todaySolved++;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
      updateStats();
      persistPuzzleStats();
      setTimeout(() => {
        showFeedback('correct', '✅ 정답입니다! 훌륭한 수입니다!');
        document.getElementById('retry-btn').style.display = '';
        const pct = ((state.currentPuzzleIdx+1) / state.totalPuzzles * 100).toFixed(0);
        document.getElementById('progress-fill').style.width = pct + '%';
        document.getElementById('progress-label').textContent = `${state.currentPuzzleIdx+1} / ${state.totalPuzzles}`;
      }, 300);
    } else {
      // 엔진 응수 자동 실행
      state.waitingEngine = true;
      const engineMove = puzzle.solution[state.solutionMoveIdx];
      state.solutionMoveIdx++;
      setTimeout(() => {
        applyOpponentMove(engineMove);
        // 엔진 수 후 보드 저장 (틀렸을 때 이 시점으로 복원)
        saveBoard();
        state.lastMoveSq = null;
        updateMoveHistory();
        document.getElementById('psp-instruction-text').textContent = '계속하세요! 다음 최선의 수를 찾아보세요.';
        state.waitingEngine = false;
        updatePuzzleTurnUI();
      }, 600);
    }
  } else {
    // 틀린 수: 기물을 실제로 이동 후 빨간 표시, 클릭 시 되돌리기
    applyMoveToBoard(moveStr);
    drawBoard();
    getSquareEl(fr, fc)?.classList.add('last-move');
    getSquareEl(tr, tc)?.classList.add('wrong');

    state.wrongMove = true;
    state.streak = 0;
    state.wrongAttempts++;
    updateStats();
    persistPuzzleStats();
    showFeedback('wrong', '❌ 틀렸습니다. 보드를 클릭하면 되돌아갑니다.');
  }
}

function showHint() {
  if (state.puzzleSolved || state.solutionShown) return;
  const puzzle = state.currentPuzzle;
  const move = puzzle.solution[state.solutionMoveIdx] || puzzle.solution[0];
  if (!move) return;
  const { fr, fc } = uciToCoords(move);
  clearHighlights();
  getSquareEl(fr, fc)?.classList.add('hint');
  state.hintShown = true;
}

function showSolution() {
  const puzzle = state.currentPuzzle;
  const move = puzzle.solution[state.solutionMoveIdx] || puzzle.solution[0];
  if (!move) return;
  const { fr, fc, tr, tc } = uciToCoords(move);
  clearHighlights();
  getSquareEl(fr, fc)?.classList.add('hint');
  getSquareEl(tr, tc)?.classList.add('hint');
  state.solutionShown = true;
}

function retryPuzzle() {
  state.solutionMoveIdx = 0;
  loadPuzzle(state.currentPuzzleIdx);
}

function nextPuzzle() {
  if (state.currentPuzzleIdx < state.totalPuzzles - 1) {
    state.currentPuzzleIdx++;
    loadPuzzle(state.currentPuzzleIdx);
  }
}

function prevPuzzle() {
  if (state.currentPuzzleIdx > 0) {
    state.currentPuzzleIdx--;
    loadPuzzle(state.currentPuzzleIdx);
  }
}

function showFeedback(type, msg) {
  const el = document.getElementById('puzzle-feedback');
  el.textContent = msg;
  el.className = 'puzzle-feedback ' + type;
  el.style.display = 'flex';
}

function hideFeedback() {
  const el = document.getElementById('puzzle-feedback');
  el.style.display = 'none';
  el.className = 'puzzle-feedback';
}

function updateMoveHistory() {
  const list = document.getElementById('move-history-list');
  if (state.moveHistory.length === 0) {
    list.innerHTML = '<span style="font-size:11px;color:var(--text-muted);">아직 수가 없습니다</span>';
    return;
  }
  list.innerHTML = state.moveHistory.map(m =>
    `<div class="move-chip ${m.type}-move">${m.alg}</div>`
  ).join('');
}

function updateStats() {
  document.getElementById('streak-count').textContent = state.streak;
  document.getElementById('my-rating').textContent = state.rating;
  document.getElementById('stat-total').textContent = state.totalSolved;
  document.getElementById('stat-streak').textContent = state.bestStreak;
  document.getElementById('stat-today').textContent = state.todaySolved;
  const denom = state.totalSolved + state.wrongAttempts;
  const acc = denom > 0 ? Math.round((state.totalSolved / denom) * 100) : null;
  document.getElementById('stat-acc').textContent = acc != null ? acc : '—';
}

function persistPuzzleStats() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(PUZZLE_STATS_STORAGE_KEY, JSON.stringify({
      totalSolved: state.totalSolved,
      correctCount: state.correctCount,
      wrongAttempts: state.wrongAttempts,
      bestStreak: state.bestStreak,
      streak: state.streak,
      todaySolved: state.todaySolved,
      lastStatsDay: state.lastStatsDay || today,
      rating: state.rating
    }));
  } catch (e) { /* ignore */ }
}

function hydratePuzzleStats() {
  try {
    const raw = localStorage.getItem(PUZZLE_STATS_STORAGE_KEY);
    if (!raw) {
      state.lastStatsDay = new Date().toISOString().slice(0, 10);
      return;
    }
    const s = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (typeof s.totalSolved === 'number') state.totalSolved = s.totalSolved;
    if (typeof s.bestStreak === 'number') state.bestStreak = s.bestStreak;
    if (typeof s.streak === 'number') state.streak = s.streak;
    if (typeof s.wrongAttempts === 'number') state.wrongAttempts = s.wrongAttempts;
    if (typeof s.correctCount === 'number') state.correctCount = s.correctCount;
    if (typeof s.rating === 'number') state.rating = s.rating;
    if (s.lastStatsDay === today && typeof s.todaySolved === 'number') {
      state.todaySolved = s.todaySolved;
    } else {
      state.todaySolved = 0;
    }
    state.lastStatsDay = today;
  } catch (e) {
    state.lastStatsDay = new Date().toISOString().slice(0, 10);
  }
}

/* ============ INIT ============ */
initThemeGrids();
hydratePuzzleStats();
updateStats();
applyQueryFromUrl();

let _fbUser = null;
let _gamePuzzles = [];
let _selectedGamePuzzleIdx = -1;
let _gamePuzzleLoaded = false;

const TACTIC_META = {
  fork:      { icon:'🍴', name:'포크',      tagCls:'fork',     desc:'두 개 이상의 적 기물을 동시에 위협' },
  oppFork:   { icon:'⚔️', name:'상대 포크', tagCls:'fork',     desc:'상대 포크 장면 (기보에서)' },
  pin:       { icon:'📌', name:'핀',        tagCls:'pin',      desc:'핀으로 더 가치 있는 기물 보호' },
  absPin:    { icon:'📌', name:'절대 핀',   tagCls:'pin',      desc:'킹을 보호하는 절대 핀' },
  relPin:    { icon:'🔗', name:'상대 핀',   tagCls:'pin',      desc:'높은 가치 기물을 보호하는 상대 핀' },
  trap:      { icon:'🪤', name:'기물 트랩',  tagCls:'fork',      desc:'공격받은 기물이 도망갈 곳이 없는 상황' },
  decoy:     { icon:'🧲', name:'유인',      tagCls:'skewer',    desc:'방어 기물을 나쁜 칸으로 끌어내는 전술' },
  skewer:    { icon:'🏹', name:'스큐어',    tagCls:'skewer',   desc:'가치 있는 기물을 이동시켜 뒤의 기물 포획' },
  oppBlunder:{ icon:'💥', name:'블런더 포착',tagCls:'blunder', desc:'상대방 실수를 이용한 기물 획득' },
  checkmate: { icon:'👑', name:'체크메이트', tagCls:'checkmate',desc:'킹을 잡는 결정적인 수' },
  discovered:{ icon:'⚡', name:'디스커버 어택', tagCls:'fork', desc:'기물 이동으로 뒤의 기물이 공격' },
  discoveredAttack:{ icon:'⚡', name:'디스커버 어택', tagCls:'fork', desc:'기물 이동으로 뒤의 기물이 공격' },
  deflection:{ icon:'🛡️', name:'편향',      tagCls:'skewer',    desc:'방어 기물을 수비 위치에서 이탈시키는 전술' },
  interference:{ icon:'🚧', name:'간섭',      tagCls:'pin',       desc:'기물 사이의 방어선을 차단하는 전술' },
};

_auth.onAuthStateChanged(function (u) {
  _fbUser = u;
  if (u) {
    loadGamePuzzleCount();
    if (!_gamePuzzleLoaded) initGamePuzzleGrid();
  }
});

function firebaseDbReady() {
  return typeof window._fbDb !== 'undefined' && window._fbDb;
}

function _puzzlePlayedAtMs(doc) {
  const paOrig = doc && doc.playedAt;
  if (!paOrig) return 0;
  if (typeof paOrig.seconds === 'number') return paOrig.seconds * 1000;
  if (typeof paOrig.toMillis === 'function') return paOrig.toMillis();
  return 0;
}

function _puzzleGameDateStr(doc) {
  const ms = _puzzlePlayedAtMs(doc);
  return ms ? new Date(ms).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '';
}

/** Firestore 기보 문서 배열 (orderBy 실패 시 폴백) */
async function fetchUserGameRecordDocs(limit) {
  if (!firebaseDbReady() || !_fbUser) return [];
  const uid = _fbUser.uid;
  let snap = null;
  try {
    snap = await _fbDb.collection('game_records').where('uid', '==', uid).orderBy('playedAt', 'desc').limit(limit).get();
  } catch (e) {
    console.warn('[gamePuzzle] orderBy(playedAt) 쿼리 실패, 폴백:', e.message);
    try {
      snap = await _fbDb.collection('game_records').where('uid', '==', uid).limit(Math.max(limit, 60)).get();
    } catch (e2) {
      console.warn('[gamePuzzle] Firestore 조회 실패:', e2.message);
      return [];
    }
  }
  const docs = [];
  snap.forEach(function (d) { docs.push({ id: d.id, ...d.data() }); });
  docs.sort(function (a, b) { return _puzzlePlayedAtMs(b) - _puzzlePlayedAtMs(a); });
  return docs.slice(0, limit);
}

/** Lichess 주석 분석 이벤트: { moveIdx, themes } → ply 인덱스 */
function inferTacticPlyIndex(ev) {
  if (ev.plyIdx !== undefined && ev.plyIdx !== null && !Number.isNaN(Number(ev.plyIdx))) {
    const n = Number(ev.plyIdx);
    if (n >= 0) return n;
  }
  if (ev.moveIdx != null && ev.moveIdx >= 1) return ev.moveIdx - 1;
  return null;
}

function lichessThemeToTacticType(themes) {
  if (!themes || !themes.length) return 'fork';
  const map = { 
    Fork: 'fork', AbsPin: 'absPin', RelPin: 'relPin', 
    Skewer: 'skewer', Discovery: 'discoveredAttack',
    Deflection: 'deflection', Interference: 'interference',
    TrappedPiece: 'trap'
  };
  for (let i = 0; i < themes.length; i++) {
    if (map[themes[i]]) return map[themes[i]];
  }
  // ChessGrammar 소문자 패턴 대응
  for (let i = 0; i < themes.length; i++) {
    const t = String(themes[i]).toLowerCase();
    if (t.includes('fork')) return 'fork';
    if (t.includes('pin')) return 'absPin';
    if (t.includes('trap')) return 'trap';
    if (t.includes('decoy') || t.includes('deflection')) return 'decoy';
    if (t.includes('skewer')) return 'skewer';
    if (t.includes('discovered')) return 'discoveredAttack';
  }
  return 'fork';
}

function pushPuzzleFromTacticEvent(puzzles, doc, ev, positions, myColor, whiteName, blackName, dateStr) {
  if (!positions || positions.length < 2) return;
  const lichessStyle = !!(ev.themes && Array.isArray(ev.themes) && ev.moveIdx != null && !ev.subtype);
  const missed = ev.subtype === 'missed';
  const found = ev.subtype === 'found';
  if (!missed && !found && !lichessStyle) return;

  let tacticBaseType = ev.type || null;
  if (lichessStyle) tacticBaseType = lichessThemeToTacticType(ev.themes);
  if (!tacticBaseType) return;

  const tacticType = ev.subtype ? `${tacticBaseType}_${ev.subtype}` : tacticBaseType;

  const plyIdx = inferTacticPlyIndex(ev);
  if (plyIdx == null || plyIdx < 0 || plyIdx >= positions.length) return;
  let pos = Object.assign({}, positions[plyIdx]);
  if (!pos || !pos.fen) return;

  const isDuplicate = puzzles.some(function(p) {
    return p.gameId === doc.id && p._plyIdx === plyIdx && p.tacticBaseType === tacticBaseType;
  });
  if (isDuplicate) return;

  let solutionUci = null;

  if (missed) {
    solutionUci = (ev.bestMove && String(ev.bestMove).length >= 4) ? String(ev.bestMove) : null;
    if (!solutionUci) {
      const solPos = positions[plyIdx + 1];
      if (solPos && solPos.lastMove && solPos.lastMove.length >= 4) {
        solutionUci = solPos.lastMove;
      }
    }
  } else {
    // found / lichessStyle:
    // plyIdx 는 전술 실행 직전 포지션의 인덱스여야 함
    // 정답 수는 그 다음 포지션(plyIdx + 1)에 기록된 lastMove 임
    if (positions[plyIdx + 1] && positions[plyIdx + 1].lastMove) {
      solutionUci = positions[plyIdx + 1].lastMove;
    } else {
      const solPos = positions[plyIdx];
      if (solPos && solPos.lastMove && solPos.lastMove.length >= 4) {
        solutionUci = solPos.lastMove;
      }
    }
  }

  if (!solutionUci || solutionUci.length < 4) return;

  // ── 합법성 검증 및 FEN 교정 로직 ───────────────────────────────────
  if (typeof Chess !== 'undefined' && solutionUci && pos.fen) {
    const uciFrom = solutionUci.slice(0, 2);
    const uciTo   = solutionUci.slice(2, 4);
    const uciProm = solutionUci.length > 4 ? solutionUci[4] : undefined;
    const mvObj   = { from: uciFrom, to: uciTo };
    if (uciProm) mvObj.promotion = uciProm;

    let verified = false;
    try { verified = !!(new Chess(pos.fen).move(mvObj)); } catch(e) {}

    if (!verified) {
      // 현재 plyIdx ±2 범위 탐색하여 합법적인 FEN 찾기
      for (let delta = -2; delta <= 2; delta++) {
        if (delta === 0) continue;
        const candidate = positions[plyIdx + delta];
        if (!candidate || !candidate.fen) continue;
        try {
          if (new Chess(candidate.fen).move(mvObj)) {
            Object.assign(pos, { fen: candidate.fen, lastMove: candidate.lastMove, turn: candidate.turn });
            console.log('[puzzleFix] FEN 교정 성공 delta=' + delta, solutionUci, candidate.fen);
            verified = true;
            break;
          }
        } catch(e2) {}
      }
      if (!verified) {
        console.warn('[puzzleFix] 합법 FEN 못 찾음, 퍼즐 스킵:', solutionUci);
        return;
      }
    }
  }
  if (!solutionUci || solutionUci.length < 4) return;

  const meta = TACTIC_META[tacticBaseType] || TACTIC_META.fork;
  const missedLabel = missed ? ' 놓침' : '';
  const titleBase = missed ? (meta.name + ' 놓침') : (meta.name + ' (기보)');

  puzzles.push({
    isGameBased: true,
    gameId: doc.id,
    _plyIdx: plyIdx,
    gameDateStr: dateStr,
    gameVs: myColor === 'w' ? ('vs ' + blackName) : ('vs ' + whiteName),
    gameResult: doc.result,
    myColor: myColor,
    tacticType: tacticType,
    tacticBaseType: tacticBaseType,
    tacticPiece: ev.piece || '',
    moveNum: ev.moveNum || Math.ceil((plyIdx + 1) / 2),
    title: titleBase + ' — ' + dateStr + ' ' + (myColor === 'w' ? ('vs ' + blackName) : ('vs ' + whiteName)),
    icon: meta.icon,
    desc: meta.desc,
    tagCls: meta.tagCls,
    rating: 1200 + Math.floor(Math.random() * 400),
    fen: pos.fen,
    opponentMove: pos.lastMove || null,
    solution: [solutionUci],
    fullSolution: [solutionUci],
    hint: meta.name + missedLabel + ': ' + meta.desc,
    moves: 1,
    themes: [tacticBaseType],
    turn: pos.turn,
    lichessId: null,
    gameUrl: null,
    fromCache: !!(doc.tacticAnalysis && !lichessStyle),
  });
}

function toggleMobilePanel(forceClose) {
  const panel     = document.getElementById('puzzle-side-panel');
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

// Firestore에서 기보 불러와 전술 포지션 추출
async function loadGamePuzzles() {
  if (!firebaseDbReady() || !_fbUser) {
    console.warn('[gamePuzzle] firebase not ready or no user');
    return [];
  }

  console.log('[gamePuzzle] loading puzzles for user:', _fbUser.uid);
  const docs = await fetchUserGameRecordDocs(60);
  console.log('[gamePuzzle] fetched docs count:', docs.length);
  if (!docs.length) return [];

  const puzzles = [];

  for (let di = 0; di < docs.length; di++) {
    const doc = docs[di];
    if (!doc.pgn || !doc.myColor) {
      console.log('[gamePuzzle] skipping doc (no pgn/color):', doc.id);
      continue;
    }

    const myColor = doc.myColor;
    const whiteName = doc.whiteName || '백';
    const blackName = doc.blackName || '흑';
    const dateStr = _puzzleGameDateStr(doc);

    if (doc.tacticAnalysis && doc.tacticAnalysis.tacticEvents && doc.tacticAnalysis.tacticEvents.length > 0) {
      let extractedFromCache = false;
      try {
        const pgnClean = (doc.pgn || '').replace(/\[[^\]]*\]/g, '').trim();
        const positions = parsePgnToPositions(pgnClean);
        console.log('[gamePuzzle] doc:', doc.id, '| positions parsed:', positions.length, '| tacticEvents:', doc.tacticAnalysis.tacticEvents.length);
        
        const beforeCount = puzzles.length;
        for (let ei = 0; ei < doc.tacticAnalysis.tacticEvents.length; ei++) {
          pushPuzzleFromTacticEvent(puzzles, doc, doc.tacticAnalysis.tacticEvents[ei], positions, myColor, whiteName, blackName, dateStr);
        }
        extractedFromCache = puzzles.length > beforeCount;
        if (extractedFromCache) {
          console.log('[gamePuzzle] extracted', (puzzles.length - beforeCount), 'puzzles from tacticAnalysis');
        }
      } catch (e) {
        console.warn('[gamePuzzle] 캐시 추출 실패:', e);
      }
      if (extractedFromCache) continue;
    }
  }

  for (let di = 0; di < docs.length; di++) {
    const doc = docs[di];
    if (!doc.pgn || !doc.myColor) continue;
    if (puzzles.some(function (p) { return p.gameId === doc.id; })) continue;

    const myColor = doc.myColor;
    const whiteName = doc.whiteName || '백';
    const blackName = doc.blackName || '흑';
    const dateStr = _puzzleGameDateStr(doc);

    try {
      const pgnClean = (doc.pgn || '').replace(/\[[^\]]*\]/g, '').trim();
      const positions = parsePgnToPositions(pgnClean);
      if (!positions || positions.length < 4) continue;

      if (doc.tacticEvents && doc.tacticEvents.length > 0) {
        for (let ei = 0; ei < doc.tacticEvents.length; ei++) {
          pushPuzzleFromTacticEvent(puzzles, doc, doc.tacticEvents[ei], positions, myColor, whiteName, blackName, dateStr);
        }
      }

      if (!puzzles.some(function (p) { return p.gameId === doc.id; })) {
        console.log('[gamePuzzle] auto-detecting tactics for doc:', doc.id);
        const detected = detectTacticsInPgn(positions, myColor, doc);
        for (let j = 0; j < detected.length; j++) {
          puzzles.push(Object.assign({}, detected[j], {
            gameDateStr: dateStr,
            gameVs: myColor === 'w' ? ('vs ' + blackName) : ('vs ' + whiteName),
            gameResult: doc.result,
          }));
        }
        if (detected.length > 0) {
          console.log('[gamePuzzle] detected', detected.length, 'puzzles via engine');
        }
      }
    } catch (e) {
      console.warn('[gamePuzzle] PGN 파싱 실패:', e);
    }
  }

  console.log('[gamePuzzle] total puzzles final count:', puzzles.length);
  return puzzles.slice(0, 40);
}

// 경량 전술 탐지: 포크/핀/매이트 기회를 수읽기로 탐지
function detectTacticsInPgn(positions, myColor, doc) {
  const result = [];
  const oppColor = myColor === 'w' ? 'b' : 'w';
  const whiteName = doc.whiteName || '백';
  const blackName = doc.blackName || '흑';

  // 분석 범위 확대: 8수 이후 ~ 기보 끝까지
  for (let i = 16; i < Math.min(positions.length - 1, 100); i += 2) {
    const pos = positions[i];
    if (!pos || !pos.fen || pos.turn !== myColor) continue;

    try {
      const chess = new Chess(pos.fen);
      const legalMoves = chess.moves({ verbose: true });

      // 1. 체크메이트 기회 탐지
      for (const mv of legalMoves) {
        const test = new Chess(pos.fen);
        test.move(mv);
        if (test.in_checkmate()) {
          result.push(buildGamePuzzle(doc, pos, mv.from + mv.to, 'checkmate', '', i, myColor));
          if (result.length >= 5) return result;
          break;
        }
      }

      // 2. 포크 탐지 (한 수로 두 개 이상의 고가치 기물 공격)
      for (const mv of legalMoves) {
        const test = new Chess(pos.fen);
        const result2 = test.move(mv);
        if (!result2) continue;
        const attackTargets = getAttackedHighValuePieces(test, mv.to, oppColor);
        if (attackTargets >= 2) {
          const piece = mv.piece.toUpperCase();
          result.push(buildGamePuzzle(doc, pos, mv.from + mv.to + (mv.promotion || ''), 'fork', piece, i, myColor));
          if (result.length >= 5) return result;
          break;
        }
      }

      // 3. 피닝 기회 탐지 (기물이 킹을 향해 직선상에 있는 경우)
      const pins = detectPinOpportunities(chess, myColor, oppColor);
      if (pins.length > 0) {
        const pv = pins[0];
        result.push(buildGamePuzzle(doc, pos, pv.uci, 'pin', pv.piece, i, myColor));
        if (result.length >= 5) return result;
      }

    } catch(e) { continue; }
  }
  return result;
}

function buildGamePuzzle(doc, pos, solutionUCI, tacticType, piece, plyIdx, myColor) {
  const meta = TACTIC_META[tacticType] || TACTIC_META['fork'];
  const whiteName = doc.whiteName || '백';
  const blackName = doc.blackName || '흑';
  const dateStr = doc.playedAt
    ? new Date(doc.playedAt.seconds * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    : '';
  return {
    isGameBased: true,
    gameId: doc.id,
    gameDateStr: dateStr,
    gameVs: myColor === 'w' ? `vs ${blackName}` : `vs ${whiteName}`,
    gameResult: doc.result,
    myColor,
    tacticType,
    tacticPiece: piece,
    moveNum: Math.ceil(plyIdx / 2),
    title: `${meta.name} — ${dateStr} ${myColor === 'w' ? `vs ${blackName}` : `vs ${whiteName}`}`,
    icon: meta.icon,
    desc: meta.desc,
    tagCls: meta.tagCls,
    rating: 1000 + Math.floor(Math.random() * 600),
    fen: pos.fen,
    opponentMove: pos.lastMove || null,
    solution: [solutionUCI],
    fullSolution: [solutionUCI],
    hint: `${meta.name}: ${meta.desc}`,
    moves: 1,
    themes: [tacticType],
    turn: pos.turn,
    lichessId: null,
    gameUrl: null,
  };
}

function getAttackedHighValuePieces(chess, fromSq, oppColor) {
  const highValue = oppColor === 'w' ? ['wQ','wR','wB','wN','wK'] : ['bQ','bR','bB','bN','bK'];
  const board = chess.board();
  const moves = chess.moves({ verbose: true });
  const attackedSqs = new Set(moves.filter(m => m.from === fromSq).map(m => m.to));
  let count = 0;
  board.forEach(row => row.forEach(sq => {
    if (!sq) return;
    const key = (sq.color) + (sq.type.toUpperCase());
    if (highValue.includes(key)) {
      const file = 'abcdefgh'[sq.square ? sq.square.charCodeAt(0) - 97 : 0];
      if (attackedSqs.has(sq.square)) count++;
    }
  }));
  return count;
}

function detectPinOpportunities(chess, myColor, oppColor) {
  // 간단한 핀 탐지: 비숍/룩/퀸 이동 후 상대 기물과 킹 사이 직선 점령
  const moves = chess.moves({ verbose: true });
  const result = [];
  for (const mv of moves) {
    if (!['b','r','q'].includes(mv.piece)) continue;
    const test = new Chess(chess.fen());
    test.move(mv);
    // 이동 후 해당 기물이 상대 킹 방향 직선상에 고가치 기물 핀 가능한지 체크
    const oppKingPos = findKing(test.board(), oppColor);
    if (!oppKingPos) continue;
    // 단순히 이동 후 체크 또는 공격이 발생하면 핀 후보로 처리
    if (test.in_check()) {
      result.push({ uci: mv.from + mv.to + (mv.promotion || ''), piece: mv.piece.toUpperCase() });
    }
  }
  return result;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const sq = board[r][c];
    if (sq && sq.color === color && sq.type === 'k') return { r, c };
  }
  return null;
}

// PGN → 포지션 배열 (FEN + lastMove + turn) — robust version
function parsePgnToPositions(pgn) {
  try {
    if (typeof parsePgnToStates === 'function') {
      const states = parsePgnToStates(pgn);
      if (!states || !Array.isArray(states)) {
        console.warn('[puzzle] parsePgnToStates returned invalid data:', states);
        return [];
      }
      return states.map((st, idx) => {
        let lastMove = null;
        if (st && st.move) {
          try {
            const files = 'abcdefgh';
            const from = st.move.fromAlg || (st.move.from ? (files[st.move.from[1]] + (8 - st.move.from[0])) : null);
            const to = st.move.toAlg || (st.move.to ? (files[st.move.to[1]] + (8 - st.move.to[0])) : null);
            const promo = (st.move.promoPiece || '').toLowerCase();
            if (from && to) lastMove = from + to + promo;
          } catch (e2) {
            console.warn('[puzzle] move coordinate conversion error at index', idx, e2);
          }
        }
        return {
          fen: (st && st.fen) ? st.fen : '',
          lastMove: lastMove,
          turn: (st && st.turn) ? st.turn : 'w'
        };
      });
    }
    // fallback
    if (typeof Chess === 'undefined') {
      console.error('[puzzle] Chess constructor is missing!');
      return [];
    }
    const chess = new Chess();
    const moves = pgn.trim().split(/\s+/).filter(t => !/^\d+\./.test(t) && t !== '' && !t.startsWith('{') && !['1-0','0-1','1/2-1/2','*'].includes(t));
    const positions = [{ fen: chess.fen(), lastMove: null, turn: 'w' }];
    for (const san of moves) {
      try {
        const r = chess.move(san, { sloppy: true });
        if (!r) break;
        positions.push({
          fen: chess.fen(),
          lastMove: r.from + r.to + (r.promotion || ''),
          turn: chess.turn(),
        });
      } catch (e3) {
        console.warn('[puzzle] fallback move error:', san, e3);
        break;
      }
    }
    return positions;
  } catch(e) { 
    console.error('[puzzle] parsePgnToPositions FATAL ERROR:', e);
    return []; 
  }
}

// ── 기보 기반 퍼즐 개수 뱃지 업데이트 ──────────────────────────
async function loadGamePuzzleCount() {
  try {
    if (!firebaseDbReady() || !_fbUser) return;
    const snap = await _fbDb.collection('game_records')
      .where('uid', '==', _fbUser.uid)
      .limit(30).get();
    let tacticCount = 0;
    snap.forEach(function (d) {
      const ta = d.data().tacticAnalysis;
      if (!ta || !Array.isArray(ta.tacticEvents)) return;
      ta.tacticEvents.forEach(function (e) {
        if (!e) return;
        if (e.subtype === 'missed' || e.subtype === 'found') tacticCount++;
        else if (e.themes && e.moveIdx != null) tacticCount++;
      });
    });
    const badge = document.getElementById('game-puzzle-count-badge');
    if (badge) {
      if (tacticCount > 0) badge.textContent = `전술 ${tacticCount}개`;
      else badge.textContent = snap.size > 0 ? '기보에서 생성' : '기보 분석';
    }
  } catch(e) {
    const badge = document.getElementById('game-puzzle-count-badge');
    if (badge) badge.textContent = '기보 분석';
  }
}

// ── 기보 기반 퍼즐 모달 열기/닫기 ──────────────────────────────
async function openGamePuzzleModal() {
  document.getElementById('game-puzzle-modal-backdrop').classList.add('show');
// Firebase initialized via auth-check.js

  if (!_gamePuzzleLoaded) {
    const body = document.getElementById('gpm-body');
    body.innerHTML = `<div class="gp-loading"><div class="lichess-spinner"></div><div>기보에서 퍼즐 추출 중… (기록 페이지 통계 분석 후 놓친 전술이 저장됩니다)</div></div>`;

    if (!firebaseDbReady() || !_fbUser) {
      // 로그인 안 된 경우: 빈 배열 + 로그인 유도 메시지
      _gamePuzzles = [];
    } else {
      _gamePuzzles = await loadGamePuzzles();
      if (_gamePuzzles.length === 0) _gamePuzzles = [];
    }
    _gamePuzzleLoaded = true;
    renderGamePuzzleList();
  }
}

function closeGamePuzzleModal(e) {
  if (!e || e.target === document.getElementById('game-puzzle-modal-backdrop')) {
    document.getElementById('game-puzzle-modal-backdrop').classList.remove('show');
  }
}

// buildDemoPuzzles — 데모 퍼즐 제거됨. 실제 기보 기반 퍼즐만 사용.
function buildDemoPuzzles() {
  return [];
}

function renderGamePuzzleList() {
  const body = document.getElementById('gpm-body');
  if (_gamePuzzles.length === 0) {
    if (!_fbUser) {
      body.innerHTML = `<div class="gp-empty">
        <div class="gp-empty-icon">🔒</div>
        <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">로그인이 필요합니다</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:16px;">
          실제 내 대국 기보에서 전술 포지션(포크, 핀, 스큐어 등)을<br>자동으로 추출하여 퍼즐로 만들어 드립니다.
        </div>
        <a href="/auth.html" style="display:inline-block;padding:10px 24px;background:var(--accent-green);border-radius:8px;color:#fff;font-size:13px;font-weight:700;text-decoration:none;transition:background 0.15s;"
          onmouseover="this.style.background='var(--accent-green-bright)'" onmouseout="this.style.background='var(--accent-green)'">
          로그인 / 회원가입
        </a>
      </div>`;
    } else {
      body.innerHTML = `<div class="gp-empty">
        <div class="gp-empty-icon">♟</div>
        <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">아직 기보 퍼즐이 없습니다</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6;">
          더 많은 대국을 플레이하거나,<br>분석 보드에서 Stockfish 분석을 먼저 실행해 보세요.<br>
          <span style="color:var(--accent-orange);">전술 이벤트(포크·핀·블런더)가 저장된 기보가 필요합니다.</span>
        </div>
      </div>`;
    }
    return;
  }

  let html = '';

  _gamePuzzles.forEach((p, i) => {
    const resultLabel = p.gameResult === '1-0' ? (p.myColor === 'w' ? '승리' : '패배')
                      : p.gameResult === '0-1' ? (p.myColor === 'b' ? '승리' : '패배') : '무승부';
    const resultCls = resultLabel === '승리' ? 'color:var(--accent-green-bright)' : resultLabel === '패배' ? 'color:#e07070' : 'color:var(--text-muted)';
    html += `<div class="gp-game-card" id="gpc-${i}" onclick="selectGamePuzzle(${i})">
      <div class="gp-card-icon">${p.icon}</div>
      <div class="gp-card-body">
        <div class="gp-card-title">${p.title}</div>
        <div class="gp-card-meta">
          <span>${p.gameDateStr}</span>
          <span>${p.gameVs}</span>
          <span style="${resultCls}">${resultLabel}</span>
          <span style="color:var(--text-muted)">${p.moveNum}수</span>
        </div>
        <div style="margin-top:5px;display:flex;gap:5px;flex-wrap:wrap;">
          <span class="gp-tag ${p.tagCls}">${p.icon} ${TACTIC_META[p.tacticType]?.name || p.tacticType}</span>
          <span class="gp-tag" style="background:rgba(80,80,80,0.15);color:var(--text-muted);">레이팅 ${p.rating}</span>
        </div>
      </div>
    </div>`;
  });
  body.innerHTML = html;
}

function selectGamePuzzle(idx) {
  _selectedGamePuzzleIdx = idx;
  document.querySelectorAll('.gp-game-card').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
  });
  document.getElementById('gpm-start-btn').disabled = false;
}

function startGamePuzzle() {
  if (_selectedGamePuzzleIdx < 0) return;
  closeGamePuzzleModal();

  // 기보 기반 퍼즐 모드로 세팅
  const selectedPuzzle = _gamePuzzles[_selectedGamePuzzleIdx];
  const allFromGame = _gamePuzzles.filter(p => p.gameId === selectedPuzzle.gameId);
  const startFrom = _gamePuzzles.indexOf(selectedPuzzle);
  const puzzleSet = _gamePuzzles.slice(startFrom);

  // 기보 기반 테마 객체
  const gamePseudoTheme = {
    id: 'game_based',
    icon: '🎮',
    name: '내 기보 퍼즐',
    desc: '실제 대국에서 생성된 퍼즐',
    color: '#e08030',
  };
  state.currentTheme = gamePseudoTheme;

  document.getElementById('theme-list-view').style.display = 'none';
  document.getElementById('puzzle-board-view').classList.add('show');
  document.getElementById('psp-theme-tag').textContent = '🎮 내 기보 퍼즐';

  state.puzzles = puzzleSet;
  state.totalPuzzles = puzzleSet.length;
  state.currentPuzzleIdx = 0;
  state.moveHistory = [];
  showBoardLoading(false);
  loadPuzzle(0);
}

// ── 기보 기반 퍼즐 그리드 렌더링 ─────────────────────────
const GAME_PUZZLE_THEME_DEFS = [
  // 1. 놓친 전술 (훈련용)
  { type: 'checkmate_missed', icon: '👑', name: '체크메이트 (놓침)', desc: '내가 놓쳤던 결정적인 체크메이트 기회를 다시 찾아보세요.', color: '#c04040' },
  { type: 'fork_missed',      icon: '🍴', name: '포크 (놓침)',      desc: '통계 분석에서 발견된, 내가 놓친 포크 기회를 훈련합니다.', color: '#e08030' },
  { type: 'absPin_missed',    icon: '📌', name: '절대 핀 (놓침)',   desc: '킹을 묶어둘 수 있었던 절대 핀 기회를 다시 연습하세요.', color: '#5090d0' },
  { type: 'relPin_missed',    icon: '🔗', name: '상대 핀 (놓침)',   desc: '상대 기물을 고정시킬 수 있었던 핀 기회를 다시 공략하세요.', color: '#4070b0' },
  { type: 'skewer_missed',    icon: '🏹', name: '스큐어 (놓침)',   desc: '강력한 직선 공격으로 기물을 획득할 수 있었던 기회입니다.', color: '#2aada6' },
  { type: 'discovered_missed', icon: '⚡', name: '디스커버 (놓침)',  desc: '숨겨진 길을 열어 공격할 수 있었던 디스커버 어택 기회입니다.', color: '#cc3333' },
  { type: 'trap_missed',      icon: '🪤', name: '기물 트랩 (놓침)', desc: '상대 기물을 가둘 수 있었던 결정적인 장면을 복습하세요.', color: '#7fa650' },
  { type: 'decoy_missed',     icon: '🧲', name: '유인 전술 (놓침)', desc: '상대 기물을 유인하여 이득을 볼 수 있었던 기회를 훈련하세요.', color: '#8855cc' },
  { type: 'oppBlunder_found', icon: '💥', name: '블런더 포착',     desc: '상대방의 실수를 놓치지 않고 응징했던 순간들을 다시 확인하세요.', color: '#8855cc' },

  // 2. 찾은 전술 (복습용)
  { type: 'fork_found',       icon: '🍴', name: '포크 (성공)',      desc: '실전에서 성공시켰던 포크 장면을 다시 감상하며 복습합니다.', color: '#e08030' },
  { type: 'absPin_found',     icon: '📌', name: '절대 핀 (성공)',   desc: '실전에서 정확하게 사용했던 절대 핀 성공 사례입니다.', color: '#5090d0' },
  { type: 'skewer_found',     icon: '🏹', name: '스큐어 (성공)',   desc: '상대방의 기물을 멋지게 꿰뚫었던 스큐어 성공 장면입니다.', color: '#2aada6' },
  
  // 3. 기타
  { type: 'oppFork',          icon: '⚔️', name: '상대 포크 복습',   desc: '상대가 나에게 건 포크 장면을 복기하며 방어력을 높이세요.', color: '#c06060' },
];

function renderGamePuzzleThemeGrid(puzzles) {
  const grid = document.getElementById('grid-game-puzzles');
  const badge = document.getElementById('game-puzzle-section-badge');
  if (!puzzles || puzzles.length === 0) {
    grid.innerHTML = `<div class="theme-card" style="--card-accent:#555; cursor:default; grid-column:1/-1;">
      <div class="theme-card-icon">♟</div>
      <div class="theme-card-name">기보 없음</div>
      <div class="theme-card-desc">더 많은 게임을 플레이하면 실제 기보 기반 퍼즐이 생성됩니다.</div>
    </div>`;
    badge.textContent = '0개';
    return;
  }

  // 타입별로 그룹화
  const byType = {};
  for (const p of puzzles) {
    const t = p.tacticType || 'fork';
    if (!byType[t]) byType[t] = [];
    byType[t].push(p);
  }

  badge.textContent = `${puzzles.length}개 발견`;

  let html = '';
  // 발견된 타입만 카드 생성
  for (const def of GAME_PUZZLE_THEME_DEFS) {
    const group = byType[def.type];
    if (!group || group.length === 0) continue;
    html += `<div class="theme-card" style="--card-accent:${def.color}" onclick="startGamePuzzleByType('${def.type}')">
      <div class="theme-card-icon">${def.icon}</div>
      <div class="theme-card-name">${def.name}</div>
      <div class="theme-card-desc">${def.desc}</div>
      <div class="theme-card-meta">
        <span class="theme-card-count">${group.length}개</span>
        <span class="theme-card-diff diff-medium" style="background:rgba(224,128,48,0.15);color:var(--accent-orange);">내 기보</span>
      </div>
    </div>`;
  }

  // 정의되지 않은 타입도 표시
  for (const [t, group] of Object.entries(byType)) {
    if (GAME_PUZZLE_THEME_DEFS.find(d => d.type === t)) continue;
    const meta = TACTIC_META[t] || { icon:'♟', name:t };
    html += `<div class="theme-card" style="--card-accent:#888" onclick="startGamePuzzleByType('${t}')">
      <div class="theme-card-icon">${meta.icon}</div>
      <div class="theme-card-name">${meta.name}</div>
      <div class="theme-card-desc">실제 대국에서 추출된 ${meta.name} 전술 포지션</div>
      <div class="theme-card-meta">
        <span class="theme-card-count">${group.length}개</span>
        <span class="theme-card-diff diff-medium" style="background:rgba(224,128,48,0.15);color:var(--accent-orange);">내 기보</span>
      </div>
    </div>`;
  }

  if (!html) {
    html = `<div class="theme-card" style="--card-accent:#555; cursor:default; grid-column:1/-1;">
      <div class="theme-card-icon">🔍</div>
      <div class="theme-card-name">전술 없음</div>
      <div class="theme-card-desc">기보 분석 결과 특별한 전술 기회가 발견되지 않았습니다.</div>
    </div>`;
  }
  grid.innerHTML = html;
}

// 타입별로 기보 퍼즐 시작
function startGamePuzzleByType(tacticType) {
  if (!_gamePuzzles || _gamePuzzles.length === 0) {
    openGamePuzzleModal();
    return;
  }
  const filtered = _gamePuzzles.filter(p => p.tacticType === tacticType);
  if (filtered.length === 0) return;

  const gamePseudoTheme = {
    id: 'game_based_' + tacticType,
    icon: TACTIC_META[tacticType]?.icon || '🎮',
    name: (TACTIC_META[tacticType]?.name || tacticType) + ' — 내 기보',
    desc: '실제 대국에서 생성된 ' + (TACTIC_META[tacticType]?.name || tacticType) + ' 퍼즐',
    color: '#e08030',
  };
  state.currentTheme = gamePseudoTheme;

  document.getElementById('theme-list-view').style.display = 'none';
  document.getElementById('puzzle-board-view').classList.add('show');
  document.getElementById('psp-theme-tag').textContent = `${gamePseudoTheme.icon} ${gamePseudoTheme.name}`;

  state.puzzles = filtered;
  state.totalPuzzles = filtered.length;
  state.currentPuzzleIdx = 0;
  state.moveHistory = [];
  showBoardLoading(false);
  loadPuzzle(0);
}

// 기보 퍼즐 로드 후 그리드 자동 업데이트 (Firebase 인증 후)
async function initGamePuzzleGrid() {
  console.log('[puzzle] initGamePuzzleGrid started, user:', _fbUser?.uid);
  try {
    if (!firebaseDbReady() || !_fbUser) {
      console.warn('[puzzle] firebase not ready or no user');
      _gamePuzzles = [];
    } else {
      _gamePuzzles = await loadGamePuzzles();
      console.log('[puzzle] loaded game puzzles count:', _gamePuzzles.length);
      if (_gamePuzzles.length === 0) _gamePuzzles = [];
    }
    _gamePuzzleLoaded = true;
    renderGamePuzzleThemeGrid(_gamePuzzles);
  } catch(e) {
    console.error('[puzzle] 기보 그리드 초기화 실패:', e);
    renderGamePuzzleThemeGrid([]);
  }
}

// ── 분석 탭으로 이동 (현재 퍼즐 보드 상태 전달)
function openInAnalysis() {
  try {
    var fen = null;

    // 1순위: 현재 진행 중인 보드 상태 (_legalChess 에 solution 수가 반영돼 있음)
    if (state && state._legalChess && typeof state._legalChess.fen === 'function') {
      fen = state._legalChess.fen();
    }

    // 2순위: state.currentPuzzle 초기 FEN (퍼즐 시작 전이거나 _legalChess 없을 때)
    if (!fen && state && state.currentPuzzle) {
      var p = state.currentPuzzle;
      fen = p.fen || p.startFen || p.initialFen || null;
    }

    // 3순위: puzzles 배열에서
    if (!fen && state && state.puzzles && typeof state.currentPuzzleIdx === 'number') {
      var pz = state.puzzles[state.currentPuzzleIdx];
      if (pz) fen = pz.fen || pz.startFen || null;
    }

    if (!fen) {
      alert('현재 포지션 FEN을 가져올 수 없습니다.');
      return;
    }

    // localStorage에 FEN 저장 후 새 탭 열기
    try { localStorage.setItem('chess_puzzle_analyze_fen', fen); } catch(e) {}

    // URL에도 fen 파라미터 포함 (이중 안전장치)
    var url = '/?fen=' + encodeURIComponent(fen);
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch(e) {
    console.error('[openInAnalysis] 오류:', e);
    alert('오류: ' + e.message);
  }
}

// ── Firebase 초기화 (DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
// Firebase initialized via auth-check.js
});

/* --- script block --- */

// ══════════════════════════════════════════════════════
//  우클릭 화살표 그리기
// ══════════════════════════════════════════════════════
(function() {
  const ARROW_COLOR = 'rgba(255, 165, 0, 0.88)';
  const ARROW_SW    = 14;
  const MARKER_ID   = 'user-arrow-svg-puzzle-head';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  let _arrowStart = null;
  let _userArrows = [];

  function ensureSvg() {
    // chess-wasm-fixed / study-opening 등 기존 SVG overlay 재사용
    const existingSvg = document.getElementById('board-svg-overlay');
    if (existingSvg && !document.getElementById('user-arrow-svg-puzzle-arrows')) {
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
      g2.id = 'user-arrow-svg-puzzle-arrows';
      existingSvg.appendChild(g2);
      return existingSvg;
    }
    if (existingSvg) return existingSvg;

    let svg = document.getElementById('user-arrow-svg-puzzle');
    if (svg) return svg;

    const board = document.getElementById('puzzle-chessboard');
    if (!board) return null;
    let wrap = board.parentElement;
    if (!wrap || getComputedStyle(wrap).position === 'static') wrap = board;

    svg = document.createElementNS(SVG_NS, 'svg');
    svg.id = 'user-arrow-svg-puzzle';
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
    g.id = 'user-arrow-svg-puzzle-arrows';
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
    const g = document.getElementById('user-arrow-svg-puzzle-arrows');
    if (!g) return;
    g.innerHTML = '';
    _userArrows.forEach(a => {
      const el = makeArrow(a.fromCol, a.fromRow, a.toCol, a.toRow);
      if (el) g.appendChild(el);
    });
  }

  function getBoardSquare(e) {
    const board = document.getElementById('puzzle-chessboard');
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
    const board = document.getElementById('puzzle-chessboard');
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