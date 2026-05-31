/**
 * practice.html — 오프닝·미들·엔드게임 대전 연습 (상대: Stockfish 최선수)
 *
 * 학습 엔드게임 카드: practice.html?mode=endgame&topic=square_rule 등
 * (endgame-practice.js POSITIONS 와 동일 데이터)
 */
(function () {
  'use strict';

  const PHASE = {
    opening: {
      title: '오프닝',
      useReset: true,
    },
    middlegame: {
      title: '미들게임',
      fen: 'r2q1rk1/ppp2ppp/2npbn2/2B1p3/3PP3/2N2N2/PPP2PPP/R1BQ1RK1 w - - 0 11',
    },
    endgame: {
      title: '엔드게임',
      fen: '6k1/8/8/8/8/8/6K1/3Q4 w - - 0 1',
    },
  };

  /** 학습 페이지 카드와 동일 엔드게임 포지션 */
  const ENDGAME_TOPICS = {
    square_rule: {
      fen: '8/8/7k/8/2P3p1/8/5K2/8 w - - 0 1',
      myColor: 'w',
      title: '사각형 규칙',
    },
    king_pawn_vs_king: {
      fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
      myColor: 'w',
      title: '킹+폰 vs 킹',
    },
    connected_passed: {
      fen: '8/8/8/K4k2/8/6P1/5P2/8 w - - 0 1',
      myColor: 'w',
      title: '연결된 통과폰',
    },
    breakthrough: {
      fen: '8/ppp5/8/PPP5/8/7k/8/7K w - - 0 1',
      myColor: 'w',
      title: '돌파',
    },
    bar_rule: {
      fen: '8/8/p3k3/P7/4KP2/8/8/8 w - - 0 1',
      myColor: 'w',
      title: '바의 규칙',
    },
    philidor: {
      fen: '8/8/8/8/3pk3/R7/7r/3K4 w - - 0 1',
      myColor: 'w',
      title: '필리도어',
    },
    lucena: {
      fen: '4r3/R7/8/8/8/5K2/3p4/3k4 w - - 0 1',
      myColor: 'b',
      title: '루세나',
    },
    short_side_defense: {
      fen: '1r6/8/8/8/7R/K7/2p5/2k5 w - - 0 1',
      myColor: 'w',
      title: '숏 사이드 디펜스',
    },
    mate_king_queen_vs_king: {
      fen: '8/8/8/3k4/8/8/8/4KQ2 w - - 0 1',
      myColor: 'w',
      title: '킹·퀸 vs 킹',
    },
    mate_king_rook_vs_king: {
      fen: '8/8/8/3k4/8/8/8/4KR2 w - - 0 1',
      myColor: 'w',
      title: '킹·룩 vs 킹',
    },
    rook_vs_queen: {
      fen: '8/2QK4/8/8/8/8/3rk3/8 w - - 0 1',
      myColor: 'w',
      title: '룩 vs 퀸',
    },
    queen_vs_pawn: {
      fen: '8/2QK4/8/8/8/8/3pk3/8 w - - 0 1',
      myColor: 'w',
      title: '퀸 vs 폰',
    },
  };

  function readTopicFromUrl() {
    try {
      const t = new URLSearchParams(location.search).get('topic');
      return t && ENDGAME_TOPICS[t] ? t : null;
    } catch (e) { /* ignore */ }
    return null;
  }

  function replacePracticeUrl(mode, topicKey) {
    try {
      let qs = 'mode=' + encodeURIComponent(mode);
      if (topicKey) qs += '&topic=' + encodeURIComponent(topicKey);
      history.replaceState(null, '', 'practice.html?' + qs);
    } catch (e) { /* ignore */ }
  }

  function readPhaseFromUrl() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.get('topic') && ENDGAME_TOPICS[q.get('topic')]) return 'endgame';
      const mode = q.get('mode');
      if (mode && PHASE[mode]) return mode;
    } catch (e) { /* ignore */ }
    return 'opening';
  }

  function readStoredColor() {
    try {
      const s = localStorage.getItem('chess_practice_human_color');
      if (s === 'b' || s === 'w') return s;
    } catch (e) { /* ignore */ }
    return 'w';
  }

  function scheduleEngineTurn() {
    if (!window._enginePracticeMode || typeof game === 'undefined' || !game) return;
    if (game.turn === window._enginePracticeMode.myColor) return;

    // 엔진 차례임을 UI에 표시
    window._enginePracticeThinking = true;
    setPlayerLabels(window._enginePracticeMode.myColor);

    var fen = boardToFen(game.board, game.turn, game.castling, game.enPassant, game.halfMove, game.fullMove);
    
    // 엔진이 1.5초(1500ms) 동안 충분히 분석하도록 요청
    // 이 시간 동안 engine.js의 analyzePosition은 잠기지만, 엔진의 실시간 info 메시지는 UI에 반영됨
    executeEnginePlayMove(fen, function (uci) {
      window._enginePracticeThinking = false;

      if (!uci || !window._enginePracticeMode) {
        if (typeof analyzePosition === 'function') analyzePosition(true);
        return;
      }

      var mv = uciToMove(uci, game.board, game.turn, game.castling, game.enPassant);
      if (!mv) {
        if (typeof showToast === 'function') showToast('엔진 수 적용 실패');
        if (typeof analyzePosition === 'function') analyzePosition(true);
        return;
      }

      // 분석이 끝난 즉시 착수
      game.makeMove(mv, mv.promoPiece || null);
      if (typeof analyzePosition === 'function') analyzePosition(true);
    }, 1500);
  }

  window._enginePracticeAfterHumanMove = function () {
    // 사용자가 첫 수를 두었을 때 자동으로 연습 모드 색상 설정
    if (!window._enginePracticeMode && typeof game !== 'undefined' && game) {
      // game.turn은 이미 상대방 차례로 넘어갔으므로, 반대 색상이 사용자의 색상
      window._enginePracticeMode = {
        myColor: game.turn === 'w' ? 'b' : 'w'
      };
      setPlayerLabels(window._enginePracticeMode.myColor);
      showToast('🤖 스톡피쉬 대전이 시작되었습니다');
    }
    scheduleEngineTurn();
  };

  function applyHumanFlip(humanColor) {
    var wantFlip = humanColor === 'b';
    if (wantFlip && !game.flipped) game.flipBoard();
    else if (!wantFlip && game.flipped) game.flipBoard();
  }

  function setPlayerLabels(humanColor) {
    var nw = document.getElementById('name-white');
    var nb = document.getElementById('name-black');
    var rw = document.getElementById('rating-white');
    var rb = document.getElementById('rating-black');
    if (nw) nw.textContent = humanColor === 'w' ? '나 (백)' : 'Stockfish';
    if (nb) nb.textContent = humanColor === 'b' ? '나 (흑)' : 'Stockfish';
    if (rw) rw.textContent = humanColor === 'w' ? '연습' : 'SF18';
    if (rb) rb.textContent = humanColor === 'b' ? '연습' : 'SF18';
  }

  window.tryInitPracticePage = function () {
    if (!document.body || !document.body.classList.contains('practice-page')) return;
    
    // URL에서 토픽 확인
    var topicKey = readTopicFromUrl();
    if (topicKey && ENDGAME_TOPICS[topicKey]) {
      var cfg = ENDGAME_TOPICS[topicKey];
      window._enginePracticeMode = { 
        myColor: cfg.myColor, 
        topicKey: topicKey, 
        title: cfg.title 
      };
      window._enginePracticeThinking = false;
      if (typeof game !== 'undefined' && game) {
        game.loadFromFen(cfg.fen);
        applyHumanFlip(cfg.myColor);
        setPlayerLabels(cfg.myColor);
        if (typeof analyzePosition === 'function') analyzePosition(true);
      }
      showToast('🎯 엔드게임 연습: ' + cfg.title);
      scheduleEngineTurn();
    } else {
      // 일반 연습 모드 초기화
      window._enginePracticeMode = null;
      window._enginePracticeThinking = false;
      
      if (typeof game !== 'undefined' && game) {
          game.reset();
          if (typeof analyzePosition === 'function') analyzePosition(true);
      }
      // UI 라벨 초기화
      setPlayerLabels('w');
    }
  };

  window.practiceNewGame = function () {
    window.tryInitPracticePage();
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.body.classList.contains('practice-page')) return;

    var newGame = document.getElementById('practice-new-game');
    if (newGame) newGame.addEventListener('click', function () { window.practiceNewGame(); });
  });

  /** ── 힌트 패널 토글 ── */
  window.toggleHintPanel = function () {
    var panel = document.getElementById('hint-panel');
    var btn = document.getElementById('hint-toggle-btn');
    if (!panel || !btn) return;

    var isVisible = panel.style.display !== 'none';
    if (isVisible) {
      panel.style.display = 'none';
      btn.classList.remove('active');
      btn.title = '힌트 보기';
      return;
    }

    // 패널 열기 + 힌트 로드
    panel.style.display = 'block';
    btn.classList.add('active');
    btn.title = '힌트 숨기기';

    // 힌트가 위치한 설정 탭으로 자동 이동
    if (typeof window.switchTab === 'function') {
      window.switchTab('config');
    }
    // 모바일인 경우 우측 패널 열기
    if (window.innerWidth <= 768 && typeof window.toggleMobilePanel === 'function') {
      window.toggleMobilePanel(true);
    }

    var hintContent = document.getElementById('hint-content');
    if (!hintContent) return;

    // 현재 연습 중인 topic 또는 phase 키 결정
    var key = null;
    if (window._enginePracticeMode) {
      key = window._enginePracticeMode.topicKey || window._enginePracticeMode.phase || null;
    }
    if (!key) key = readTopicFromUrl() || readPhaseFromUrl();

    // hints.js 에 정의된 HINT_TEXT 에서 내용 조회
    var hints = (typeof window.HINT_TEXT !== 'undefined') ? window.HINT_TEXT : {};
    var hint = key ? hints[key] : null;

    if (hint) {
      hintContent.innerHTML =
        '<div style="font-size:13px;font-weight:700;color:var(--accent-green-bright);margin-bottom:6px">💡 ' +
        (hint.title || '힌트') + '</div>' +
        '<div style="font-size:12px;color:var(--text-secondary);line-height:1.6">' +
        hint.body.replace(/\n/g, '<br>') + '</div>';
    } else {
      hintContent.innerHTML =
        '<span style="color:var(--text-muted);font-size:12px">이 포지션에 등록된 힌트가 없습니다.</span>';
    }
  };

})();