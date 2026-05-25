// ════════════════════════════════════════
    // 핵심 설정 및 상수 (chess-analyzer.js 로직 이식)
    // ════════════════════════════════════════
    const SF_DEPTH = typeof LICHESS_SF_DEPTH !== 'undefined' ? LICHESS_SF_DEPTH : 18;
    const SF_MULTIPV = 3;

    const FORK_CP_GAIN = 80;
    const FORK_FOUND_MAX_CP_LOSS = 60;
    const PIN_FOUND_MAX_CP_LOSS = 60;
    const PIN_PV_DIFF_THRESHOLD = 80;

    const PIECE_VALUE_ANALYSER = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
    const PIECE_VALUE_TACTICS = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
    const PIN_MIN_PINNED_VALUE = 320;
    const RELATIVE_PIN_SHIELD_MIN = 330;

    // 수 판정·정확도: chess-wasm-fixed/lichess-judgment.js (lichessCpAdviceJudgment 등)

    /**
     * 내 색 (w|b). Firestore myColor 우선, 없으면 PGN [White]/[Black]과 playerName·로그인 표시명 매칭.
     * 잘못되면 내 수 집계·정확도·ACPL이 전부 어긋납니다.
     */
    function resolveMyColor(doc) {
      const c = doc && doc.myColor;
      if (c === 'w' || c === 'b') return c;
      const pgn = (doc && doc.pgn) || '';
      const wm = pgn.match(/\[White\s+"([^"]*)"\]/i);
      const bm = pgn.match(/\[Black\s+"([^"]*)"\]/i);
      const pn = ((doc && doc.playerName) || '').trim();
      if (wm && bm && pn) {
        const wn = wm[1].trim();
        const bn = bm[1].trim();
        if (pn === wn) return 'w';
        if (pn === bn) return 'b';
      }
      if (typeof _user !== 'undefined' && _user) {
        const dn = (_user.displayName || (_user.email && _user.email.split('@')[0]) || '').trim();
        if (wm && bm && dn) {
          if (dn === wm[1].trim()) return 'w';
          if (dn === bm[1].trim()) return 'b';
        }
      }
      console.warn('[records] myColor 없음 — PGN 헤더와도 불일치, 백(w)으로 가정:', doc && doc.id);
      return 'w';
    }

    // 전술 감지: chess-wasm-fixed/chess-tactics.js (합법 수 기반)

    function recordTacticEvent(result, ev, missedPushCountRef) {
      if (missedPushCountRef.count >= 16) return;
      result.tacticEvents.push(ev);
      missedPushCountRef.count++;
    }

    function applyFoundTactics(result, t, isMe, piece, moveNum, san, plyIdx) {
      const push = (type) => result.tacticEvents.push({
        type, subtype: 'found', piece, moveNum, san, plyIdx: plyIdx, bestMove: null,
      });
      if (t.fork) {
        if (isMe) { result.forkFound[piece] = (result.forkFound[piece] || 0) + 1; push('fork'); }
        else { result.oppForkCreated[piece] = (result.oppForkCreated[piece] || 0) + 1; push('oppFork'); }
      }
      if (isMe) {
        if (t.absPin) { result.absPinFound++; push('absPin'); }
        if (t.relPin) { result.relPinFound++; push('relPin'); }
        if (t.trap) { result.trapFound++; push('trap'); }
        if (t.decoy) { result.decoyFound++; push('decoy'); }
        if (!t.fork && t.skewer) { result.skewerFound++; push('skewer'); }
        if (!t.fork && !t.skewer && t.discovered) { result.discoveredFound++; push('discovered'); }
      }
    }

    function applyMissedTactics(result, t, piece, moveNum, san, plyIdx, bestUci, missedRef) {
      if (t.fork) {
        result.forkMissed[piece]++;
        recordTacticEvent(result, { type: 'fork', subtype: 'missed', piece, moveNum, san, plyIdx, bestMove: bestUci }, missedRef);
      }
      if (t.absPin) {
        result.absPinMissed++;
        recordTacticEvent(result, { type: 'absPin', subtype: 'missed', piece, moveNum, san, plyIdx, bestMove: bestUci }, missedRef);
      }
      if (t.relPin) {
        result.relPinMissed++;
        recordTacticEvent(result, { type: 'relPin', subtype: 'missed', piece, moveNum, san, plyIdx, bestMove: bestUci }, missedRef);
      }
      if (t.trap) {
        result.trapMissed++;
        recordTacticEvent(result, { type: 'trap', subtype: 'missed', piece, moveNum, san, plyIdx, bestMove: bestUci }, missedRef);
      }
      if (t.decoy) {
        result.decoyMissed++;
        recordTacticEvent(result, { type: 'decoy', subtype: 'missed', piece, moveNum, san, plyIdx, bestMove: bestUci }, missedRef);
      }
      if (t.skewer) {
        result.skewerMissed++;
        recordTacticEvent(result, { type: 'skewer', subtype: 'missed', piece, moveNum, san, plyIdx, bestMove: bestUci }, missedRef);
      }
      if (t.discovered && !t.fork && !t.skewer) {
        result.discoveredMissed++;
        recordTacticEvent(result, { type: 'discovered', subtype: 'missed', piece, moveNum, san, plyIdx, bestMove: bestUci }, missedRef);
      }
    }

    // 수 판정·정확도: chess-wasm-fixed/lichess-judgment.js

        // ── 보드 및 PGN 유틸리티 (chess-engine.js 기능 이식 및 현대화) ──────────────

    // parseFen, parsePgnToStates → chess-wasm-fixed/parse-pgn-states.js

    function moveToUci(move) {
      if (!move) return null;
      const FILES = 'abcdefgh';
      const f = FILES[move.from[1]] + (8 - move.from[0]);
      const t = FILES[move.to[1]] + (8 - move.to[0]);
      return f + t + (move.promoPiece ? move.promoPiece.toLowerCase() : '');
    }

    function uciSquareToRc(sq) {
      const FILES = 'abcdefgh';
      if (!sq || sq.length < 2) return null;
      const c = FILES.indexOf(sq[0]);
      const r = 8 - parseInt(sq[1], 10);
      if (c < 0 || c > 7 || r < 0 || r > 7) return null;
      return [r, c];
    }

    /** UCI(소문자) → parsePgnToStates 한 수 직전 스냅샷 st 에서의 legal move 객체 */
    function uciToMoveFromState(uciLower, st) {
      if (!uciLower || uciLower.length < 4 || !st || !st.board) return null;
      const u = uciLower.toLowerCase();
      const from = uciSquareToRc(u.slice(0, 2));
      const to = uciSquareToRc(u.slice(2, 4));
      if (!from || !to) return null;
      const allLegal = getAllLegalMoves(st.board, st.turn, st.castling, st.enPassant);
      const wantPromo = u.length >= 5 ? u.slice(4, 5).toUpperCase() : null;
      return allLegal.find(m =>
        m.from[0] === from[0] && m.from[1] === from[1] &&
        m.to[0] === to[0] && m.to[1] === to[1] &&
        (!wantPromo || (m.promoPiece && m.promoPiece === wantPromo))
      ) || allLegal.find(m =>
        m.from[0] === from[0] && m.from[1] === from[1] &&
        m.to[0] === to[0] && m.to[1] === to[1]
      ) || null;
    }

    // ════════════════════════════════════════
    // 오프닝 데이터베이스 & 감지
    // ════════════════════════════════════════
    const OPENING_DB = (function () {
      const raw = [
        ["A00", "Van't Kruijs Opening", "", "e2e3"],
        ["A00", "Grob's Attack", "", "g2g4"],
        ["A00", "Nimzowitsch-Larsen Attack", "", "b2b3"],
        ["A00", "Polish Opening", "", "b2b4"],
        ["A00", "Hungarian Opening", "", "g2g3"],
        ["A01", "Nimzowitsch-Larsen Attack", "Main Line", "b2b3 e7e5"],
        ["A02", "Bird's Opening", "", "f2f4"],
        ["A04", "Réti Opening", "", "g1f3"],
        ["A05", "Réti Opening", "King's Indian Attack", "g1f3 g8f6"],
        ["A06", "Réti Opening", "", "g1f3 d7d5"],
        ["A10", "English Opening", "", "c2c4"],
        ["A11", "English Opening", "Caro-Kann Defensive System", "c2c4 c7c6"],
        ["A13", "English Opening", "", "c2c4 e7e6"],
        ["A15", "English Opening", "King's Indian", "c2c4 g8f6"],
        ["A16", "English Opening", "", "c2c4 g8f6 b1c3"],
        ["A20", "English Opening", "Reversed Sicilian", "c2c4 e7e5"],
        ["A21", "English Opening", "Reversed Sicilian", "c2c4 e7e5 b1c3"],
        ["A25", "English Opening", "Closed", "c2c4 e7e5 b1c3 b8c6"],
        ["A30", "English Opening", "Symmetrical", "c2c4 c7c5"],
        ["A40", "Queen's Pawn", "", "d2d4"],
        ["A45", "Queen's Pawn Game", "Trompowsky Attack", "d2d4 g8f6"],
        ["A51", "Budapest Gambit", "", "d2d4 g8f6 c2c4 e7e5"],
        ["A57", "Benko Gambit", "", "d2d4 g8f6 c2c4 c7c5 d4d5 b7b5"],
        ["A60", "Modern Benoni", "", "d2d4 g8f6 c2c4 c7c5 d4d5 e7e6"],
        ["A80", "Dutch Defence", "", "d2d4 f7f5"],
        ["A84", "Dutch Defence", "", "d2d4 f7f5 c2c4"],
        ["B00", "King's Pawn Game", "", "e2e4"],
        ["B00", "Nimzowitsch Defence", "", "e2e4 b8c6"],
        ["B01", "Scandinavian Defence", "", "e2e4 d7d5"],
        ["B01", "Scandinavian Defence", "Mieses-Kotroc Variation", "e2e4 d7d5 e4d5 d8d5"],
        ["B02", "Alekhine's Defence", "", "e2e4 g8f6"],
        ["B06", "Modern Defence", "", "e2e4 g7g6"],
        ["B07", "Pirc Defence", "", "e2e4 d7d6 d2d4 g8f6"],
        ["B08", "Pirc Defence", "Classical System", "e2e4 d7d6 d2d4 g8f6 b1c3 g7g6"],
        ["B10", "Caro-Kann Defence", "", "e2e4 c7c6"],
        ["B12", "Caro-Kann Defence", "Advance Variation", "e2e4 c7c6 d2d4 d7d5 e4e5"],
        ["B13", "Caro-Kann Defence", "Exchange Variation", "e2e4 c7c6 d2d4 d7d5 e4d5"],
        ["B15", "Caro-Kann Defence", "", "e2e4 c7c6 d2d4 d7d5 b1c3"],
        ["B18", "Caro-Kann Defence", "Classical Variation", "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5"],
        ["B20", "Sicilian Defence", "", "e2e4 c7c5"],
        ["B21", "Sicilian Defence", "Grand Prix Attack", "e2e4 c7c5 f2f4"],
        ["B22", "Sicilian Defence", "Alapin Variation", "e2e4 c7c5 c2c3"],
        ["B23", "Sicilian Defence", "Closed", "e2e4 c7c5 b1c3"],
        ["B27", "Sicilian Defence", "", "e2e4 c7c5 g1f3"],
        ["B30", "Sicilian Defence", "", "e2e4 c7c5 g1f3 b8c6"],
        ["B40", "Sicilian Defence", "", "e2e4 c7c5 g1f3 e7e6"],
        ["B41", "Sicilian Defence", "Kan Variation", "e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 a7a6"],
        ["B44", "Sicilian Defence", "", "e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 b8c6"],
        ["B50", "Sicilian Defence", "", "e2e4 c7c5 g1f3 d7d6"],
        ["B51", "Sicilian Defence", "Moscow Variation", "e2e4 c7c5 g1f3 d7d6 f1b5"],
        ["B60", "Sicilian Defence", "Richter-Rauzer Attack", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 b8c6 c1g5"],
        ["B70", "Sicilian Defence", "Dragon Variation", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6"],
        ["B80", "Sicilian Defence", "Scheveningen Variation", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e6"],
        ["B90", "Sicilian Defence", "Najdorf Variation", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6"],
        ["B94", "Sicilian Defence", "Najdorf, 6.Bg5", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1g5"],
        ["B96", "Sicilian Defence", "Najdorf, Polugaevsky", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1g5 e7e6"],
        ["C00", "French Defence", "", "e2e4 e7e6"],
        ["C02", "French Defence", "Advance Variation", "e2e4 e7e6 d2d4 d7d5 e4e5"],
        ["C03", "French Defence", "Tarrasch Variation", "e2e4 e7e6 d2d4 d7d5 b1d2"],
        ["C10", "French Defence", "", "e2e4 e7e6 d2d4 d7d5 b1c3"],
        ["C11", "French Defence", "Classical Variation", "e2e4 e7e6 d2d4 d7d5 b1c3 g8f6"],
        ["C15", "French Defence", "Winawer Variation", "e2e4 e7e6 d2d4 d7d5 b1c3 f8b4"],
        ["C20", "King's Pawn Game", "", "e2e4 e7e5"],
        ["C23", "Bishop's Opening", "", "e2e4 e7e5 f1c4"],
        ["C25", "Vienna Game", "", "e2e4 e7e5 b1c3"],
        ["C30", "King's Gambit", "", "e2e4 e7e5 f2f4"],
        ["C33", "King's Gambit Accepted", "", "e2e4 e7e5 f2f4 e5f4"],
        ["C41", "Philidor Defence", "", "e2e4 e7e5 g1f3 d7d6"],
        ["C42", "Petrov's Defence", "", "e2e4 e7e5 g1f3 g8f6"],
        ["C44", "King's Pawn Game", "", "e2e4 e7e5 g1f3 b8c6"],
        ["C45", "Scotch Game", "", "e2e4 e7e5 g1f3 b8c6 d2d4"],
        ["C46", "Three Knights Game", "", "e2e4 e7e5 g1f3 b8c6 b1c3"],
        ["C47", "Four Knights Game", "", "e2e4 e7e5 g1f3 b8c6 b1c3 g8f6"],
        ["C50", "Italian Game", "", "e2e4 e7e5 g1f3 b8c6 f1c4"],
        ["C51", "Evans Gambit", "", "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 b2b4"],
        ["C53", "Italian Game", "Classical Variation", "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3"],
        ["C55", "Two Knights Defence", "", "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6"],
        ["C57", "Two Knights Defence", "Fried Liver Attack", "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5"],
        ["C60", "Ruy Lopez (Spanish Game)", "", "e2e4 e7e5 g1f3 b8c6 f1b5"],
        ["C65", "Ruy Lopez", "Berlin Defence", "e2e4 e7e5 g1f3 b8c6 f1b5 g8f6"],
        ["C68", "Ruy Lopez", "Exchange Variation", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5c6"],
        ["C70", "Ruy Lopez", "", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6"],
        ["C78", "Ruy Lopez", "", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 g8f6 e1g1"],
        ["C80", "Ruy Lopez", "Open Variation", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 g8f6 e1g1 f6e4"],
        ["C84", "Ruy Lopez", "Closed", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 g8f6 e1g1 f8e7"],
        ["C89", "Ruy Lopez", "Marshall Attack", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 g8f6 e1g1 f8e7 h1e1 b7b5 a4b3 e8g8 c2c3 d7d5"],
        ["D00", "Queen's Pawn Game", "", "d2d4 d7d5"],
        ["D06", "Queen's Gambit", "", "d2d4 d7d5 c2c4"],
        ["D07", "Queen's Gambit Declined", "Chigorin Defence", "d2d4 d7d5 c2c4 b8c6"],
        ["D08", "Queen's Gambit Declined", "Albin Counter-Gambit", "d2d4 d7d5 c2c4 e7e5"],
        ["D10", "Queen's Gambit Declined", "Slav Defence", "d2d4 d7d5 c2c4 c7c6"],
        ["D11", "Slav Defence", "", "d2d4 d7d5 c2c4 c7c6 g1f3"],
        ["D20", "Queen's Gambit Accepted", "", "d2d4 d7d5 c2c4 d5c4"],
        ["D30", "Queen's Gambit Declined", "", "d2d4 d7d5 c2c4 e7e6"],
        ["D32", "Queen's Gambit Declined", "Tarrasch Defence", "d2d4 d7d5 c2c4 e7e6 b1c3 c7c5"],
        ["D35", "Queen's Gambit Declined", "", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6"],
        ["D40", "Queen's Gambit Declined", "Semi-Tarrasch", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3 c7c5"],
        ["D43", "Semi-Slav Defence", "", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3 c7c6"],
        ["D50", "Queen's Gambit Declined", "", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5"],
        ["D70", "Grünfeld Defence", "", "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5"],
        ["D85", "Grünfeld Defence", "Exchange Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5 e2e4 d5c3 b2c3 f8g7"],
        ["E00", "Catalan Opening", "", "d2d4 g8f6 c2c4 e7e6"],
        ["E01", "Catalan Opening", "", "d2d4 g8f6 c2c4 e7e6 g2g3"],
        ["E11", "Bogo-Indian Defence", "", "d2d4 g8f6 c2c4 e7e6 g1f3 f8b4"],
        ["E12", "Queen's Indian Defence", "", "d2d4 g8f6 c2c4 e7e6 g1f3 b7b6"],
        ["E20", "Nimzo-Indian Defence", "", "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4"],
        ["E24", "Nimzo-Indian Defence", "Sämisch Variation", "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 a2a3"],
        ["E32", "Nimzo-Indian Defence", "Classical Variation", "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 d1c2"],
        ["E40", "Nimzo-Indian Defence", "", "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3"],
        ["E60", "King's Indian Defence", "", "d2d4 g8f6 c2c4 g7g6"],
        ["E61", "King's Indian Defence", "", "d2d4 g8f6 c2c4 g7g6 b1c3"],
        ["E62", "King's Indian Defence", "Fianchetto Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 g1f3 e8g8 g2g3"],
        ["E70", "King's Indian Defence", "", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4"],
        ["E80", "King's Indian Defence", "Sämisch Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 f2f3"],
        ["E90", "King's Indian Defence", "", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3"],
        ["E91", "King's Indian Defence", "Classical Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8 f1e2"],
        ["E92", "King's Indian Defence", "Classical Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8 f1e2 e7e5"],
      ];
      const sorted = raw.slice().sort((a, b) => b[3].split(' ').length - a[3].split(' ').length);
      const map = new Map();
      for (const [eco, name, variation, moves] of sorted) {
        const key = moves.trim();
        if (!map.has(key)) map.set(key, { eco, name, variation });
      }
      return map;
    })();

    // PGN에서 UCI 수 배열 추출 (간단한 버전)
    function pgnToUciMoves(pgn) {
      try {
        // parsePgnToStates가 이미 있으므로 그 결과 활용
        const states = parsePgnToStates(pgn);
        const uciArr = [];
        for (let i = 1; i < Math.min(states.length, 21); i++) {
          const m = states[i].move;
          if (!m) continue;
          const FILES = 'abcdefgh';
          const from = FILES[m.from[1]] + (8 - m.from[0]);
          const to = FILES[m.to[1]] + (8 - m.to[0]);
          uciArr.push(from + to + (m.promotion || ''));
        }
        return uciArr;
      } catch (e) { return []; }
    }

    function detectOpening(uciMoves) {
      for (let len = uciMoves.length; len >= 1; len--) {
        const key = uciMoves.slice(0, len).join(' ');
        if (OPENING_DB.has(key)) return OPENING_DB.get(key);
      }
      return null;
    }

    // 오프닝 키 (eco+name 조합)
    function openingKey(op) { return op.eco + '|' + op.name + (op.variation ? '|' + op.variation : ''); }

    // 두 번째 스크립트 블록에서도 동일 값 사용 (전역 const 가시성 이슈 방지)
    window.__RECORDS_CONSTS__ = { SF_DEPTH, SF_MULTIPV, FORK_CP_GAIN };

function toggleMobilePanel(forceClose) {
  const panel     = document.getElementById('viewer-panel');
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

    /**
     * 순수 PGN을 Stockfish로 포지션별 분석.
     * 수 분류: 리체스 lila.tree.CpAdvice와 동일 (winningChances Δ, 임계 0.1/0.2/0.3).
     * 게임 정확도: 리체스 AccuracyPercent 수식 기반 조화평균(내 수만).
     */
    async function analyzeGame(pgn, myColor, onProgress) {
      const report = typeof onProgress === 'function' ? onProgress : () => {};
      const states = parsePgnToStates(pgn);
      const emptyFork = () => ({ P: 0, N: 0, B: 0, R: 0, Q: 0, K: 0 });
      const result = {
        myBest: 0, myExcellent: 0, myGood: 0,
        myBlunders: 0, myMistakes: 0, myInaccuracies: 0,
        oppBlunders: 0, oppMistakes: 0, oppInaccuracies: 0,
        oppBlunderFound: 0, oppBlunderMissed: 0,
        checkmates: 0, myCpSum: 0, myMoveCount: 0,
        myAccuracy: 0,
        totalMoves: Math.max(0, states.length - 1),
        forkFound: emptyFork(), forkMissed: emptyFork(), oppForkCreated: emptyFork(),
        absPinFound: 0, absPinMissed: 0, relPinFound: 0, relPinMissed: 0,
        skewerFound: 0, skewerMissed: 0, discoveredFound: 0, discoveredMissed: 0,
        trapFound: 0, trapMissed: 0, decoyFound: 0, decoyMissed: 0,
        tacticEvents: [], moveJudgments: []
      };

      if (typeof stockfishEvalStates !== 'function') {
        console.warn('[analyzeGame] lichess-judgment.js API 없음');
        return result;
      }
      if (states.length < 2) return result;

      report(0, states.length, 'Stockfish 평가 중...');
      const { evalRows, error } = await stockfishEvalStates(states, {
        depth: SF_DEPTH,
        movetime: typeof LICHESS_SF_MOVETIME !== 'undefined' ? LICHESS_SF_MOVETIME : 900,
        multipv: typeof LICHESS_SF_MULTIPV !== 'undefined' ? LICHESS_SF_MULTIPV : 1,
        onProgress: (cur, tot) => report(cur, tot, 'Stockfish 평가 중...'),
      });
      if (error) {
        console.warn('[analyzeGame] Stockfish Worker 실패:', error);
        return result;
      }

      // ── 게임 정확도 계산 (조화평균)
      result.myAccuracy = gameAccuracyFromEvals(evalRows, myColor);

      const missedRef = { count: 0 };
      const CT = typeof ChessTactics !== 'undefined' ? ChessTactics : null;

      // ── [개선] FEN 기반 정밀 분석
      const analyzeQueue = [];
      for (let i = 1; i < states.length; i++) {
        const mover = states[i - 1].turn;
        const cpBefore = evalRows[i - 1].cpw;
        const cpAfter = evalRows[i].cpw;
        const bad = lichessCpAdviceJudgment(cpBefore, cpAfter, mover);
        const isMe = (mover === myColor);
        const bestUci = evalRows[i - 1].bestUci;
        const move = states[i].move;
        const playedUci = move ? (moveToUci(move) || '').toLowerCase() : '';

        if (CT && isMe && bad && bestUci && playedUci && bestUci !== playedUci) {
          analyzeQueue.push({
            plyIdx: i - 1,
            moveNum: Math.ceil(i / 2),
            san: states[i].san || '',
            bestUci: bestUci,
            playedUci: playedUci,
            stBefore: states[i - 1],
            mover: mover,
            pt: states[i - 1].board[move.from[0]][move.from[1]]?.[1] || 'P'
          });
        }
      }

      // 큐에 담긴 지점들을 순차 분석
      for (let qi = 0; qi < analyzeQueue.length; qi++) {
        const task = analyzeQueue[qi];
        report(states.length, states.length, `전술 분석 중... (${qi + 1} / ${analyzeQueue.length})`);
        try {
          const prevFen = CT.snapshotFromState(task.stBefore);
          
          // 1. 내가 둔 수 분석 (찾은 전술 확인)
          const playedMv = uciToMoveFromState(task.playedUci, task.stBefore);
          if (playedMv) {
            const playedAfterFen = CT.applyMoveSnapshot(prevFen, playedMv);
            const playedT = await CT.detectTactics(playedAfterFen, { depth: 'l2', withSequence: true });
            if (playedT) {
              const found = {
                fork: playedT.fork, absPin: playedT.absPin, relPin: playedT.relPin,
                trap: playedT.trap, decoy: playedT.decoy, skewer: playedT.skewer, discovered: playedT.discovered
              };
              const pt = task.stBefore.board[playedMv.from[0]][playedMv.from[1]]?.[1] || task.pt;
              // 찾은 전술 기록 (result.tacticEvents에 push)
              ['fork','absPin','relPin','trap','decoy','skewer','discovered'].forEach(t => {
                if (found[t]) {
                  // 중복 방지 로직은 간단히 생략하거나 타입별로 체크 가능
                  result.tacticEvents.push({
                    type: t, subtype: 'found', piece: pt, moveNum: task.moveNum, san: task.san, plyIdx: task.plyIdx
                  });
                  // 통계 반영 (forkFound 등)
                  if (t === 'fork') { if(!result.forkFound[pt]) result.forkFound[pt]=0; result.forkFound[pt]++; }
                  else { if(result[t+'Found'] !== undefined) result[t+'Found']++; }
                }
              });
            }
          }

          // 2. 엔진 추천수 분석 (놓친 전술 확인)
          const bestMv = uciToMoveFromState(task.bestUci, task.stBefore);
          if (!bestMv) continue;

          const bestAfterFen = CT.applyMoveSnapshot(prevFen, bestMv);
          const bestT = await CT.detectTactics(bestAfterFen, { depth: 'l2', withSequence: true });

          if (bestT) {
            const miss = {
              fork: bestT.fork, absPin: bestT.absPin, relPin: bestT.relPin,
              trap: bestT.trap, decoy: bestT.decoy, skewer: bestT.skewer, discovered: bestT.discovered
            };
            const ptB = task.stBefore.board[bestMv.from[0]][bestMv.from[1]]?.[1] || task.pt;
            
            // 각 전술 타입별로 놓침 기록
            ['fork','absPin','relPin','trap','decoy','skewer','discovered'].forEach(t => {
              if (miss[t]) {
                // 이미 해당 지점에서 이 전술을 "찾았다면" 놓친 것으로 보지 않음
                const alreadyFound = result.tacticEvents.some(e => e.plyIdx === task.plyIdx && e.type === t && e.subtype === 'found');
                if (!alreadyFound) {
                  result.tacticEvents.push({
                    type: t, subtype: 'missed', piece: ptB, moveNum: task.moveNum, san: task.san, plyIdx: task.plyIdx, bestMove: task.bestUci
                  });
                  if (t === 'fork') { if(!result.forkMissed[ptB]) result.forkMissed[ptB]=0; result.forkMissed[ptB]++; }
                  else { if(result[t+'Missed'] !== undefined) result[t+'Missed']++; }
                }
              }
            });
          }
        } catch (e) {
          console.warn('[analyzeGame] FEN 분석 실패:', e.message);
        }
      }

      for (let i = 1; i < states.length; i++) {
        const mover = states[i - 1].turn;
        const san = states[i].san || '';
        const isMe = (mover === myColor);
        const cpBefore = evalRows[i - 1].cpw;
        const cpAfter = evalRows[i].cpw;
        const bad = lichessCpAdviceJudgment(cpBefore, cpAfter, mover);
        const judgmentTag = bad ? ((isMe ? 'my' : 'opp') + bad.charAt(0).toUpperCase() + bad.slice(1)) : null;
        if (result.moveJudgments.length < i) result.moveJudgments.push(judgmentTag);
        if (isMe) {
          if (bad === 'inaccuracy') result.myInaccuracies++;
          else if (bad === 'mistake') result.myMistakes++;
          else if (bad === 'blunder') result.myBlunders++;
          const cpMeBefore = myColor === 'w' ? cpBefore : -cpBefore;
          const cpMeAfter  = myColor === 'w' ? cpAfter  : -cpAfter;
          result.myCpSum += Math.max(0, cpMeBefore - cpMeAfter);
          result.myMoveCount++;
        } else {
          if (bad === 'inaccuracy') result.oppInaccuracies++;
          else if (bad === 'mistake') result.oppMistakes++;
          else if (bad === 'blunder') result.oppBlunders++;
        }
        if (san.includes('#') && isMe) result.checkmates++;
      }
      return result;
    }
    window.analyzeGame = analyzeGame;

/* --- script block --- */

const __RC = window.__RECORDS_CONSTS__ || { SF_DEPTH: 18, SF_MULTIPV: 3, FORK_CP_GAIN: 80 };
    // ════════════════════════════════════════
    // Firebase 연동 후 페이지 초기화
    // ════════════════════════════════════════
    let _authInitialized = false;
    _auth.onAuthStateChanged(u => {
      if (!u) return;
      if (_authInitialized) return; // 중복 발화 방지
      _authInitialized = true;
      const params = new URLSearchParams(window.location.search);
      const initialTab = params.get('tab');
      if (initialTab === 'stats') { switchTab('stats'); }
      else { loadRecords(); }
    });

    // ════════════════════════════════════════
    // 뷰어 상태
    // ════════════════════════════════════════
    let _states = [], _viewIdx = 0, _viewMyColor = 'w', _currentRecord = null;
    let _loadedDocs = []; // 캐시를 위한 문서 보관

    // ════════════════════════════════════════
    // 기록 목록
    // ════════════════════════════════════════
    // Firestore 쿼리에 타임아웃 래퍼
    function withTimeout(promise, ms = 10000) {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('요청 시간 초과 (' + ms / 1000 + '초)')), ms))
      ]);
    }

  let _loadingRecords = false;
    async function loadRecords() {
      if (_loadingRecords) return; // 중복 실행 방지
      _loadingRecords = true;
      const listEl = document.getElementById('records-list'), subEl = document.getElementById('list-sub');
      listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><div>불러오는 중...</div></div>';
      try {
        let snap = null;
        try {
          snap = await withTimeout(
            _fbDb.collection('game_records').where('uid', '==', _user.uid).orderBy('playedAt', 'desc').limit(50).get()
          );
        } catch (e1) {
          try {
            snap = await withTimeout(
              _fbDb.collection('game_records').where('uid', '==', _user.uid).limit(50).get()
            );
          } catch (e2) {
            throw new Error('데이터 로드 실패: ' + e2.message);
          }
        }
        if (!snap) { throw new Error('응답 없음'); }
        const docs = []; snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
        docs.sort((a, b) => {
          const ta = a.playedAt ? a.playedAt.seconds : 0;
          const tb = b.playedAt ? b.playedAt.seconds : 0;
          return tb - ta;
        });
        _loadedDocs = docs; // 전역 보관
        subEl.textContent = `총 ${docs.length}게임`;
        if (!docs.length) { listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">♟</div><div>아직 기록이 없습니다<br>온라인 대국을 플레이해보세요!</div></div>'; return; }
        listEl.innerHTML = '';
        docs.forEach(doc => {
          const item = document.createElement('div'); item.className = 'record-item'; item.dataset.id = doc.id;
          const myColor = resolveMyColor(doc), result = doc.result || '*';
          let badge = '🤝', badgeClass = 'draw', label = '무승부';
          if (result === '1-0') { badge = myColor === 'w' ? 'W' : 'L'; badgeClass = myColor === 'w' ? 'win' : 'lose'; label = myColor === 'w' ? '승리' : '패배'; }
          if (result === '0-1') { badge = myColor === 'b' ? 'W' : 'L'; badgeClass = myColor === 'b' ? 'win' : 'lose'; label = myColor === 'b' ? '승리' : '패배'; }
          const dateStr = doc.playedAt ? new Date(doc.playedAt.seconds * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '—';
          const whiteRating = doc.whiteRating ? ` (${doc.whiteRating})` : '';
          const blackRating = doc.blackRating ? ` (${doc.blackRating})` : '';
          item.innerHTML = `<div class="record-result-badge ${badgeClass}">${badge}</div><div class="record-info"><div class="record-players">${doc.whiteName || '백'}${whiteRating} vs ${doc.blackName || '흑'}${blackRating}</div><div class="record-meta"><span>${label}</span><span>${doc.moveCount || 0}수</span><span>${dateStr}</span></div></div>`;
          item.addEventListener('click', () => openRecord(doc, item));
          listEl.appendChild(item);
        });
      } catch (e) {
        console.error('[loadRecords] 최종 실패:', e);
        listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div>불러오기 실패<br><small style="font-size:10px;color:var(--text-muted)">${e.message}</small><br><button onclick="retryLoadRecords()" style="margin-top:12px;padding:7px 16px;border-radius:8px;border:1px solid var(--border-light);background:var(--bg-tertiary);color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-main)">🔄 다시 시도</button></div></div>`;
      } finally {
        _loadingRecords = false;
      }
    }

    function retryLoadRecords() {
      loadRecords();
    }

    // ════════════════════════════════════════
    // 기보 열기
    // ════════════════════════════════════════
    function openRecord(doc, itemEl) {
      document.querySelectorAll('.record-item').forEach(i => i.classList.remove('active'));
      itemEl.classList.add('active');
      _currentRecord = doc; _viewMyColor = resolveMyColor(doc);
      if (!doc.pgn) { showToast('기보 데이터가 없습니다'); return; }
      _states = parsePgnToStates(doc.pgn);
      if (!_states.length) { showToast('기보 파싱 실패'); return; }

      // [추가] 캐시된 전술 분석 결과가 있으면 적용
      if (doc.tacticAnalysis) {
        const ta = doc.tacticAnalysis;
        if (ta.moveJudgments) {
          for (let i = 1; i < _states.length; i++) {
            if (ta.moveJudgments[i - 1]) _states[i].judgment = ta.moveJudgments[i - 1];
          }
        }
        if (ta.tacticEvents) {
          ta.tacticEvents.forEach(evt => {
            if (_states[evt.moveIdx]) {
              _states[evt.moveIdx].tacticThemes = evt.themes;
            }
          });
        }
      }

      loadArrowsFromRecord(doc);
      renderMoveTokens();
      highlightMoveToken(-1);
      renderViewerBoard();

      if (typeof resetLichessPanel === 'function') resetLichessPanel();
      if (doc.tacticAnalysis && doc.tacticAnalysis.moveJudgments && typeof showLichessStatsUI === 'function') {
        showLichessStatsUI(doc.tacticAnalysis);
      }
      const myName = _viewMyColor === 'w' ? (doc.whiteName || '나') : (doc.blackName || '나');
      const oppName = _viewMyColor === 'w' ? (doc.blackName || '상대') : (doc.whiteName || '상대');
      document.getElementById('vp-my-name').textContent = myName;
      document.getElementById('vp-opp-name').textContent = oppName;
      document.getElementById('vp-my-color').textContent = _viewMyColor === 'w' ? '⬜ 백' : '⬛ 흑';
      document.getElementById('vp-opp-color').textContent = _viewMyColor === 'w' ? '⬛ 흑' : '⬜ 백';
      document.getElementById('vp-my-avatar').textContent = myName[0].toUpperCase();
      document.getElementById('vp-opp-avatar').textContent = oppName[0].toUpperCase();
      const res = doc.result || '*';
      const myWin = (res === '1-0' && _viewMyColor === 'w') || (res === '0-1' && _viewMyColor === 'b');
      const myLose = (res === '0-1' && _viewMyColor === 'w') || (res === '1-0' && _viewMyColor === 'b');
      document.getElementById('vp-my-result').textContent = myWin ? '승리' : myLose ? '패배' : '무승부';
      document.getElementById('vp-my-result').className = 'vp-result-label ' + (myWin ? 'win' : myLose ? 'lose' : 'draw');
      document.getElementById('vp-opp-result').textContent = myWin ? '패배' : myLose ? '승리' : '무승부';
      document.getElementById('vp-opp-result').className = 'vp-result-label ' + (myWin ? 'lose' : myLose ? 'win' : 'draw');
      renderMoveTokens();
      document.getElementById('viewer-empty').style.display = 'none';
      document.getElementById('viewer-container').style.display = 'flex';
      goToMove(_states.length - 1);
    }

    // ════════════════════════════════════════
    // 뷰어 사운드 & 이동
    // ════════════════════════════════════════
    const _SOUND_BASE = 'sound/'; const _viewSounds = {};
    ['move', 'capture', 'castle', 'check', 'checkmate', 'stalemate'].forEach(k => { const a = new Audio(_SOUND_BASE + 'chess_' + k + '.mp3'); a.preload = 'auto'; _viewSounds[k] = a; });
    function playViewSound(type) { const a = _viewSounds[type]; if (!a) return; try { const c = a.cloneNode(); c.volume = 0.7; c.play().catch(() => { }); } catch (e) { } }
    function getViewSoundType(state) {
      if (!state || !state.move) return null;
      const move = state.move, prevBoard = _states[_viewIdx - 1]?.board;
      const isCapture = prevBoard && prevBoard[move.to[0]] && prevBoard[move.to[0]][move.to[1]];
      const nb = state.board, nextTurn = state.turn;
      if (isInCheck(nb, nextTurn)) { 
        const leg = getAllLegalMoves(nb, nextTurn, state.castling, state.enPassant); 
        return leg.length === 0 ? 'checkmate' : 'check'; 
      }
      const leg2 = getAllLegalMoves(nb, nextTurn, state.castling, state.enPassant);
      if (!isInCheck(nb, nextTurn) && leg2.length === 0) return 'stalemate';
      if (move.castle) return 'castle';
      if (isCapture || move.enPassant) return 'capture';
      return 'move';
    }
    function goToMove(idx) {
      const prevIdx = _viewIdx;
      idx = Math.max(0, Math.min(_states.length - 1, idx)); _viewIdx = idx;
      renderViewerBoard(); updateControls(); highlightMoveToken(idx);
      redrawViewerArrows(); // ← 화살표 다시 그리기
      if (idx > prevIdx && idx > 0) { const st = getViewSoundType(_states[idx]); if (st) playViewSound(st); }
      const at = document.querySelector('.move-san.active'); if (at) at.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    function renderMoveTokens() {
      const container = document.getElementById('move-tokens'); container.innerHTML = '';
      let currentRow = null, currentMoveNum = 0;
      for (let i = 1; i < _states.length; i++) {
        const san = _states[i].san, turn = _states[i - 1].turn;
        if (turn === 'w') {
          currentMoveNum = Math.ceil(i / 2);
          currentRow = document.createElement('div');
          currentRow.className = 'move-row';
          const num = document.createElement('span');
          num.className = 'move-num';
          num.textContent = currentMoveNum + '.';
          currentRow.appendChild(num);
          container.appendChild(currentRow);
        }
        const ss = document.createElement('span'); ss.className = 'move-san'; ss.textContent = san; ss.dataset.idx = i;
        ss.addEventListener('click', () => goToMove(i));

        // ── 승률 기반 수 분류 표시 (Blunder, Mistake, Inaccuracy) ──
        if (_states[i].judgment) {
          const j = _states[i].judgment;
          // 접두사(my/opp)를 떼고 baseJudgment 추출 (예: myBlunder -> blunder)
          const baseJudgment = j.replace(/^(my|opp)/, '').toLowerCase();
          const J_LABEL = { blunder: '??', mistake: '?', inaccuracy: '?!' };
          const J_COLOR = { blunder: '#cc3333', mistake: '#e08c3a', inaccuracy: '#f6c94a' };
          const J_TITLE = { blunder: '블런더', mistake: '실수', inaccuracy: '부정확' };
          
          if (J_LABEL[baseJudgment]) {
            const jBadge = document.createElement('span');
            jBadge.className = 'move-judgment-badge';
            jBadge.style.background = J_COLOR[baseJudgment];
            jBadge.style.color = '#fff';
            jBadge.style.padding = '1px 4px';
            jBadge.style.borderRadius = '4px';
            jBadge.style.fontSize = '10px';
            jBadge.title = J_TITLE[baseJudgment];
            jBadge.textContent = J_LABEL[baseJudgment];
            ss.appendChild(jBadge);
          }
        }

        if (!currentRow) {
          currentRow = document.createElement('div');
          currentRow.className = 'move-row';
          container.appendChild(currentRow);
        }
        currentRow.appendChild(ss);
      }
    }
    function highlightMoveToken(idx) {
      document.querySelectorAll('.move-san').forEach(el => el.classList.remove('active'));
      if (idx > 0) { const el = document.querySelector(`.move-san[data-idx="${idx}"]`); if (el) el.classList.add('active'); }
    }
    function updateControls() {
      const total = _states.length - 1;
      document.getElementById('btn-first').disabled = _viewIdx <= 0;
      document.getElementById('btn-prev').disabled = _viewIdx <= 0;
      document.getElementById('btn-next').disabled = _viewIdx >= total;
      document.getElementById('btn-last').disabled = _viewIdx >= total;
      const ne = document.getElementById('ctrl-move-num'), se = document.getElementById('ctrl-move-san');
      if (_viewIdx === 0) { ne.textContent = '시작'; se.textContent = ''; }
      else { ne.textContent = `${Math.ceil(_viewIdx / 2)}수 ${_states[_viewIdx - 1].turn === 'w' ? '백' : '흑'}`; se.textContent = _states[_viewIdx].san || ''; }
    }
    // ════════════════════════════════════════
    // 기물 이미지 — chess-wasm-fixed/chess.js의 currentPieceStyle 재사용
    // ════════════════════════════════════════
    // currentPieceStyle은 chess.js에서 이미 선언됨 (중복 선언 제거)
    function pieceImg(piece) {
      return `https://lichess1.org/assets/piece/${currentPieceStyle}/${piece[0]}${piece[1].toUpperCase()}.svg`;
    }

    function renderViewerBoard() {
      const el = document.getElementById('viewer-board'); 
      if (!el) return; 
      el.innerHTML = '';
      
      const state = _states[_viewIdx];
      if (!state) return; // 데이터가 아직 없는 경우 방어
      
      const board = state.board, flipped = _viewMyColor === 'b', lastMove = state.move, turn = state.turn;
      const FILES_ARR = ['a','b','c','d','e','f','g','h'];
      
      // 1. Squares Layer
      const squaresLayer = document.createElement('div');
      squaresLayer.className = 'board-squares-layer';
      el.appendChild(squaresLayer);

      for (let ri = 0; ri < 8; ri++) {
        for (let ci = 0; ci < 8; ci++) {
          const r = flipped ? 7 - ri : ri, c = flipped ? 7 - ci : ci;
          const sq = document.createElement('div'); 
          sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
          
          if (ci === (flipped ? 7 : 0)) { 
            const lbl = document.createElement('span'); 
            lbl.className = 'coord-rank'; 
            lbl.textContent = 8 - r; 
            sq.appendChild(lbl); 
          }
          if (ri === (flipped ? 0 : 7)) { 
            const lbl = document.createElement('span'); 
            lbl.className = 'coord-file'; 
            lbl.textContent = FILES_ARR[c]; 
            sq.appendChild(lbl); 
          }
          
          if (lastMove) { 
            if (lastMove.from[0] === r && lastMove.from[1] === c) sq.style.background = '#cdd46e'; 
            if (lastMove.to[0] === r && lastMove.to[1] === c) sq.style.background = '#aaa23a'; 
          }
          if (board[r][c] === turn + 'K' && isInCheck(board, turn)) sq.style.background = 'rgba(220, 50, 50, 0.55)';
          
          squaresLayer.appendChild(sq);
        }
      }

      // 2. Pieces Layer
      const piecesLayer = document.createElement('div');
      piecesLayer.className = 'board-pieces-layer';
      el.appendChild(piecesLayer);

      const getPieceImg = (p) => {
        const style = (typeof currentPieceStyle !== 'undefined') ? currentPieceStyle : 'cburnett';
        return `https://lichess1.org/assets/piece/${style}/${p[0]}${p[1].toUpperCase()}.svg`;
      };

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece) {
            const img = document.createElement('img');
            img.className = 'piece-img' + (piece[0] === 'b' ? ' black-piece' : '');
            img.src = getPieceImg(piece); 
            img.alt = piece; 
            img.draggable = false;
            
            const dispR = flipped ? 7 - r : r;
            const dispC = flipped ? 7 - c : c;
            img.style.top = (dispR * 12.5) + '%';
            img.style.left = (dispC * 12.5) + '%';
            
            piecesLayer.appendChild(img);
          }
        }
      }
    }
    document.addEventListener('keydown', e => {
      if (!_states.length) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToMove(_viewIdx - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goToMove(_viewIdx + 1); }
      if (e.key === 'Home') { e.preventDefault(); goToMove(0); }
      if (e.key === 'End') { e.preventDefault(); goToMove(_states.length - 1); }
    });
    function showToast(msg, duration = 2500) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), duration); }

    // ════════════════════════════════════════
    // 탭 전환
    // ════════════════════════════════════════
    function switchTab(tab) {
      const lp = document.getElementById('list-panel'), vp = document.getElementById('viewer-panel'), sp = document.getElementById('stats-panel');
      const rb = document.getElementById('tab-records-btn'), sb = document.getElementById('tab-stats-btn');
      if (tab === 'records') {
        if (rb) rb.classList.add('active');
        if (sb) sb.classList.remove('active');
        if (lp) lp.style.display = '';
        if (vp) vp.style.display = '';
        if (sp) sp.style.display = 'none';
      } else {
        if (sb) sb.classList.add('active');
        if (rb) rb.classList.remove('active');
        if (lp) lp.style.display = 'none';
        if (vp) vp.style.display = 'none';
        // 통계 탭 전환 시 캐시가 있으면 그대로 사용 (무분별한 재분석 방지)
        if (sp) { sp.style.display = 'block'; renderStats(); }
      }
    }

    // ════════════════════════════════════════
    // 통계 분석
    // ════════════════════════════════════════
    let _statsCache = null;
    let _statsBusy = false;
    let _statsGameDetails = [];  // 게임별 전술 상세 [{doc, tacticEvents}]

    async function renderStats() {
      const contentEl = document.getElementById('stats-content'), subEl = document.getElementById('stats-sub');
      if (_statsCache) { renderStatsHTML(_statsCache); return; }
      if (_statsBusy) return;

      _statsBusy = true;
      try {
        let docs = _loadedDocs;
        if (!docs || !docs.length) {
          try {
            let snap = null;
            try { snap = await _fbDb.collection('game_records').where('uid', '==', _user.uid).orderBy('playedAt', 'desc').limit(50).get(); }
            catch (e) { snap = await _fbDb.collection('game_records').where('uid', '==', _user.uid).limit(50).get(); }
            docs = []; snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
            docs.sort((a, b) => (b.playedAt?.seconds || 0) - (a.playedAt?.seconds || 0));
            _loadedDocs = docs;
          } catch (e) {
            contentEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div>불러오기 실패: ${e.message}</div></div>`;
            return;
          }
        }

        if (!docs.length) {
          contentEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><div>분석할 기록이 없습니다</div></div>`;
          return;
        }

        let wins = 0, losses = 0, draws = 0, winsW = 0, lossesW = 0, drawsW = 0, winsB = 0, lossesB = 0, drawsB = 0;
        let winsHigher = 0, lossesHigher = 0, drawsHigher = 0;
        let winsLower = 0, lossesLower = 0, drawsLower = 0;
        let endCheckmate = 0, endResign = 0, endDraw = 0, endTimeout = 0;
        const myColor_counts = { w: 0, b: 0 }; let totalMovesSum = 0;
        let sumMyBlunders = 0, sumMyMistakes = 0, sumMyInaccuracies = 0;
        let sumOppBlunders = 0, sumOppMistakes = 0, sumOppInaccuracies = 0, sumOppBF = 0, sumOppBM = 0;
        let sumCheckmates = 0, sumAbsPinFound = 0, sumAbsPinMissed = 0, sumRelPinFound = 0, sumRelPinMissed = 0;
        let sumSkewerFound = 0, sumSkewerMissed = 0, sumDiscoveredFound = 0, sumDiscoveredMissed = 0;
        let sumTrapFound = 0, sumTrapMissed = 0, sumDecoyFound = 0, sumDecoyMissed = 0;
        let sumForkFound = { P: 0, N: 0, B: 0, R: 0, Q: 0, K: 0 }, sumForkMissed = { P: 0, N: 0, B: 0, R: 0, Q: 0, K: 0 }, sumOppForkCreated = { P: 0, N: 0, B: 0, R: 0, Q: 0, K: 0 };
        let sumCp = 0, sumMoves = 0;
        const total = docs.length;
        _statsGameDetails = [];
        const openingStatsMap = new Map();

        let newlyAnalyzedCount = 0;
        let cachedAnalysisCount = 0;
        let sumMyAccuracy = 0, accuracyCount = 0;

        function accumulateFromAnalysis(doc, a) {
          sumMyBlunders += a.myBlunders || 0;
          sumMyMistakes += a.myMistakes || 0;
          sumMyInaccuracies += a.myInaccuracies || 0;
          sumOppBlunders += a.oppBlunders || 0;
          sumOppMistakes += a.oppMistakes || 0;
          sumOppInaccuracies += a.oppInaccuracies || 0;
          sumOppBF += a.oppBlunderFound || 0;
          sumOppBM += a.oppBlunderMissed || 0;
          sumCheckmates += a.checkmates || 0;
          sumAbsPinFound += a.absPinFound || 0;
          sumAbsPinMissed += a.absPinMissed || 0;
          sumRelPinFound += a.relPinFound || 0;
          sumRelPinMissed += a.relPinMissed || 0;
          sumSkewerFound += a.skewerFound || 0;
          sumSkewerMissed += a.skewerMissed || 0;
          sumDiscoveredFound += a.discoveredFound || 0;
          sumDiscoveredMissed += a.discoveredMissed || 0;
          sumTrapFound += a.trapFound || 0;
          sumTrapMissed += a.trapMissed || 0;
          sumDecoyFound += a.decoyFound || 0;
          sumDecoyMissed += a.decoyMissed || 0;
          sumCp += a.myCpSum || 0;
          sumMoves += a.myMoveCount || 0;
          totalMovesSum += a.totalMoves || 0;
          for (const k of ['P', 'N', 'B', 'R', 'Q', 'K']) {
            sumForkFound[k] += (a.forkFound && a.forkFound[k]) || 0;
            sumForkMissed[k] += (a.forkMissed && a.forkMissed[k]) || 0;
            sumOppForkCreated[k] += (a.oppForkCreated && a.oppForkCreated[k]) || 0;
          }
          if ((a.tacticEvents && a.tacticEvents.length) || (a.moveJudgments && a.moveJudgments.length)) {
            _statsGameDetails.push({ doc, tacticEvents: a.tacticEvents, moveJudgments: a.moveJudgments });
          }
          if (a.myAccuracy > 0) { sumMyAccuracy += a.myAccuracy; accuracyCount++; }
        }

        const updateLoadingUI = (idx, label = '포지션 분석 중…', extra = '') => {
          const pct = Math.round(idx / total * 100);
          contentEl.innerHTML = `<div class="stats-loading"><div class="stats-spinner"></div><div class="stats-progress-wrap">
            <div style="font-size:13px;color:var(--text-secondary)">Stockfish 분석 중… (${idx + 1} / ${total})</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">깊이 ${__RC.SF_DEPTH} · 수 분류 = 리체스 Accuracy%식</div>
            <div class="stats-progress-bar-outer"><div class="stats-progress-bar-fill" style="width:${pct}%"></div></div>
            <div class="stats-progress-label">${label}${extra ? ' (' + extra + ')' : ''}</div>
          </div></div>`;
        };

        for (let gi = 0; gi < docs.length; gi++) {
          const doc = docs[gi];
          const myColor = resolveMyColor(doc), result = doc.result || '*';
          myColor_counts[myColor]++;
          const myWin = (result === '1-0' && myColor === 'w') || (result === '0-1' && myColor === 'b');
          const myLose = (result === '0-1' && myColor === 'w') || (result === '1-0' && myColor === 'b');
          if (myWin) { wins++; if (myColor === 'w') winsW++; else winsB++; }
          else if (myLose) { losses++; if (myColor === 'w') lossesW++; else lossesB++; }
          else { draws++; if (myColor === 'w') drawsW++; else drawsB++; }

          // [추가] 레이팅별 승률 분석
          const myRating = parseInt(myColor === 'w' ? doc.whiteRating : doc.blackRating);
          const oppRating = parseInt(myColor === 'w' ? doc.blackRating : doc.whiteRating);
          if (!isNaN(myRating) && !isNaN(oppRating)) {
            if (oppRating > myRating) {
              if (myWin) winsHigher++; else if (myLose) lossesHigher++; else drawsHigher++;
            } else if (oppRating < myRating) {
              if (myWin) winsLower++; else if (myLose) lossesLower++; else drawsLower++;
            }
          }

          const term = (doc.termination || '').toLowerCase();
          if (term.includes('checkmate') || term.includes('체크메이트')) endCheckmate++;
          else if (term.includes('resign') || term.includes('기권')) endResign++;
          else if (term.includes('time') || term.includes('시간')) endTimeout++;
          else endDraw++;

          if (doc.pgn) {
            try {
              const uciArr = pgnToUciMoves(doc.pgn);
              const op = detectOpening(uciArr);
              if (op) {
                const k = openingKey(op);
                if (!openingStatsMap.has(k)) openingStatsMap.set(k, { eco: op.eco, name: op.name, variation: op.variation, w: { wins: 0, draws: 0, losses: 0, total: 0 }, b: { wins: 0, draws: 0, losses: 0, total: 0 } });
                const entry = openingStatsMap.get(k);
                const colorStats = entry[myColor];
                colorStats.total++;
                if (myWin) colorStats.wins++;
                else if (myLose) colorStats.losses++;
                else colorStats.draws++;
              }
            } catch (e) { }
          }

          if (!doc.pgn) { if (doc.moveCount) totalMovesSum += doc.moveCount; continue; }

          let expectedMoves = 0;
          try { expectedMoves = Math.max(0, parsePgnToStates(doc.pgn).length - 1); } catch (e) { }
          const ta = doc.tacticAnalysis;
          const AC = typeof AnalysisCache !== 'undefined' ? AnalysisCache : null;
          if (AC && AC.isTacticAnalysisComplete(ta, expectedMoves)) {
            accumulateFromAnalysis(doc, ta);
            cachedAnalysisCount++;
            updateLoadingUI(gi, '캐시 데이터 로드 중…');
            continue;
          }

          updateLoadingUI(gi);

          try {
            const a = await window.analyzeGame(doc.pgn, myColor, (cur, tot, label) => {
              const gameProgress = Math.round(cur / Math.max(tot, 1) * 100);
              const totalProgress = Math.round(gi / total * 100 + gameProgress / total);
              const fill = contentEl.querySelector('.stats-progress-bar-fill');
              if (fill) fill.style.width = totalProgress + '%';
              const labelEl = contentEl.querySelector('.stats-progress-label');
              if (labelEl) labelEl.textContent = label || '분석 중…';
            });

            accumulateFromAnalysis(doc, a);
            newlyAnalyzedCount++;

            try {
              const savePayload = {
                myBest: a.myBest || 0, myGood: a.myGood || 0,
                myBlunders: a.myBlunders, myMistakes: a.myMistakes, myInaccuracies: a.myInaccuracies,
                oppBlunders: a.oppBlunders, oppMistakes: a.oppMistakes, oppInaccuracies: a.oppInaccuracies,
                oppBlunderFound: a.oppBlunderFound, oppBlunderMissed: a.oppBlunderMissed,
                checkmates: a.checkmates,
                absPinFound: a.absPinFound || 0, absPinMissed: a.absPinMissed || 0,
                relPinFound: a.relPinFound || 0, relPinMissed: a.relPinMissed || 0,
                skewerFound: a.skewerFound || 0, skewerMissed: a.skewerMissed || 0,
                discoveredFound: a.discoveredFound || 0, discoveredMissed: a.discoveredMissed || 0,
                trapFound: a.trapFound || 0, trapMissed: a.trapMissed || 0,
                decoyFound: a.decoyFound || 0, decoyMissed: a.decoyMissed || 0,
                myCpSum: a.myCpSum, myMoveCount: a.myMoveCount, totalMoves: a.totalMoves,
                myAccuracy: a.myAccuracy || 0,
                forkFound: a.forkFound, forkMissed: a.forkMissed, oppForkCreated: a.oppForkCreated || {},
                tacticEvents: (a.tacticEvents || []).map(ev => ({
                  type: ev.type, subtype: ev.subtype, piece: ev.piece || '',
                  moveNum: ev.moveNum || 0, san: ev.san || '',
                  plyIdx: ev.plyIdx || 0, bestMove: ev.bestMove || null
                })),
                moveJudgments: a.moveJudgments || [],
                analyzedAt: firebase.firestore.FieldValue.serverTimestamp(),
                sfDepth: __RC.SF_DEPTH,
                analysisVersion: 5
              };
              await _fbDb.collection('game_records').doc(doc.id).update({ tacticAnalysis: savePayload });
            } catch (saveErr) { console.warn('[stats] 저장 실패:', saveErr); }
          } catch (e) {
            console.warn('게임 분석 실패:', e);
            if (doc.moveCount) totalMovesSum += doc.moveCount;
          }
        }

        const avgMyAccuracy = accuracyCount > 0 ? Math.round(sumMyAccuracy / accuracyCount) : 0;

        _statsCache = {
          total, wins, losses, draws, winsW, lossesW, drawsW, winsB, lossesB, drawsB,
          winsHigher, lossesHigher, drawsHigher, winsLower, lossesLower, drawsLower,
          myColor_counts,
          avgMoves: total > 0 ? Math.round(totalMovesSum / total) : 0,
          winRate: total > 0 ? Math.round(wins / total * 100) : 0,
          endCheckmate, endResign, endDraw, endTimeout,
          myBlunders: sumMyBlunders, myMistakes: sumMyMistakes, myInaccuracies: sumMyInaccuracies,
          oppBlunders: sumOppBlunders, oppMistakes: sumOppMistakes, oppInaccuracies: sumOppInaccuracies,
          oppBlunderFound: sumOppBF, oppBlunderMissed: sumOppBM,
          checkmates: sumCheckmates,
          forkFound: sumForkFound, forkMissed: sumForkMissed, oppForkCreated: sumOppForkCreated,
          absPinFound: sumAbsPinFound, absPinMissed: sumAbsPinMissed,
          relPinFound: sumRelPinFound, relPinMissed: sumRelPinMissed,
          skewerFound: sumSkewerFound, skewerMissed: sumSkewerMissed,
          discoveredFound: sumDiscoveredFound, discoveredMissed: sumDiscoveredMissed,
          trapFound: sumTrapFound, trapMissed: sumTrapMissed,
          decoyFound: sumDecoyFound, decoyMissed: sumDecoyMissed,
          pinFound: sumAbsPinFound + sumRelPinFound,
          pinMissed: sumAbsPinMissed + sumRelPinMissed,
          avgCpLoss: sumMoves > 0 ? Math.round(sumCp / sumMoves) : 0,
          myAccuracy: avgMyAccuracy,
          openingStats: Array.from(openingStatsMap.values())
            .sort((a, b) => (b.w.total + b.b.total) - (a.w.total + a.b.total))
        };
        subEl.textContent = `총 ${total}게임 · Stockfish + 리체스 Accuracy% (${newlyAnalyzedCount}게임 신규 분석)`;
        renderStatsHTML(_statsCache);
      } catch (err) {
        console.error('[stats] Critical Stats Error:', err);
        contentEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div>통계 분석 중 오류 발생: ${err.message}</div></div>`;
      } finally {
        _statsBusy = false;
      }
    }

    // ════════════════════════════════════════
    // 전술 상세 모달
    // ════════════════════════════════════════
    function openTacticModal(tacticType, tacticPiece, icon, name, subtypeFilter) {
      const modal = document.getElementById('tactic-modal');
      const titleEl = document.getElementById('tmodal-title');
      const bodyEl = document.getElementById('tmodal-body');

      const typeLabel = { fork: '포크', oppFork: '상대 포크', absPin: '절대 핀', relPin: '상대 핀', pin: '핀', oppBlunder: '상대 블런더 포착', skewer: '스큐어', discovered: '디스커버 어택', trap: '기물 트랩', decoy: '유인' }[tacticType] || tacticType;
      const subtypeLabel = subtypeFilter === 'found' ? '찾음' : subtypeFilter === 'missed' ? '놓침' : '';
      titleEl.innerHTML = `<span>${icon}</span> ${name} — ${typeLabel}${subtypeLabel ? ' (' + subtypeLabel + ')' : ''} 게임 목록`;

      // 해당 전술이 있는 게임만 필터
      const PIECE_ICONS = { P: '♙', N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' };
      const matchingGames = _statsGameDetails.filter(gd =>
        gd.tacticEvents.some(ev =>
          ev.type === tacticType &&
          (tacticPiece === '' || ev.piece === tacticPiece) &&
          (!subtypeFilter || ev.subtype === subtypeFilter)
        )
      );

      if (!matchingGames.length) {
        bodyEl.innerHTML = `<div class="tmodal-empty">해당 전술 기록이 없습니다</div>`;
        modal.classList.add('show'); return;
      }

      let html = '';
      for (const gd of matchingGames) {
        const doc = gd.doc;
        const myColor = resolveMyColor(doc), result = doc.result || '*';
        const myWin = (result === '1-0' && myColor === 'w') || (result === '0-1' && myColor === 'b');
        const myLose = (result === '0-1' && myColor === 'w') || (result === '1-0' && myColor === 'b');
        const resLabel = myWin ? '승리' : myLose ? '패배' : '무승부';
        const resCls = myWin ? 'win' : myLose ? 'lose' : 'draw';
        const dateStr = doc.playedAt ? new Date(doc.playedAt.seconds * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '—';
        const whiteName = doc.whiteName || '백', blackName = doc.blackName || '흑';

        // 해당 게임에서 이 전술의 이벤트들
        const evs = gd.tacticEvents.filter(ev => ev.type === tacticType && (tacticPiece === '' || ev.piece === tacticPiece) && (!subtypeFilter || ev.subtype === subtypeFilter));
        const foundEvs = evs.filter(ev => ev.subtype === 'found');
        const missedEvs = evs.filter(ev => ev.subtype === 'missed');

        let tagHtml = '';
        if (foundEvs.length) tagHtml += foundEvs.map(ev => `<span class="tg-tag found">${tacticType === 'oppFork' ? '⚔' : '✔'} ${ev.moveNum}수${ev.piece && ev.piece !== '' ? ' ' + PIECE_ICONS[ev.piece] : ''} (${ev.san || '?'})</span>`).join('');
        if (missedEvs.length) tagHtml += missedEvs.map(ev => `<span class="tg-tag">✘ ${ev.moveNum}수${ev.piece && ev.piece !== '' ? ' ' + PIECE_ICONS[ev.piece] : ''} (${ev.san || '?'})</span>`).join('');

        html += `<div class="tmodal-game-item" onclick="closeTacticModalAndOpen(${JSON.stringify(doc).replace(/"/g, '&quot;')})">
      <div class="tg-header">
        <div class="tg-players">⬜ ${whiteName} vs ⬛ ${blackName}</div>
        <div class="tg-result-badge ${resCls}">${resLabel}</div>
      </div>
      <div class="tg-meta"><span>${doc.moveCount || 0}수</span><span>${dateStr}</span></div>
      <div class="tg-tactic-tags">${tagHtml}</div>
    </div>`;
      }
      bodyEl.innerHTML = html;
      modal.classList.add('show');
    }

    function openJudgmentModal(judgment, title, icon, label) {
      const modal = document.getElementById('tactic-modal');
      const titleEl = document.getElementById('tmodal-title');
      const bodyEl = document.getElementById('tmodal-body');
      titleEl.innerHTML = `<span>${icon}</span> ${title} 포함 게임 목록`;

      console.log('Judgment Target:', judgment);
      console.log('Total Game Details Available:', _statsGameDetails.length);
      if (_statsGameDetails.length > 0) {
        console.log('Sample Data Structure:', _statsGameDetails[0]);
      }

      const matchingGames = _statsGameDetails.filter(gd => {
         // tacticAnalysis 내부 확인
         const ja = gd.doc.tacticAnalysis;
         const hasInTactic = ja && ja.moveJudgments && ja.moveJudgments.includes(judgment);
         
         // 혹은 객체 자체에 직접 있을 경우 확인
         const hasInGd = gd.moveJudgments && gd.moveJudgments.includes(judgment);
         
         if (hasInTactic) return true;
         if (hasInGd) return true;
         return false;
      });

      console.log('Matching Games Count:', matchingGames.length);

      if (!matchingGames.length) {
        bodyEl.innerHTML = `<div class="tmodal-empty">해당 분류의 기록이 없습니다</div>`;
        modal.classList.add('show'); return;
      }
      
      // ... (기존 HTML 생성 로직 유지)
      let html = '';
      for (const gd of matchingGames) {
        const doc = gd.doc;
        const myColor = resolveMyColor(doc), result = doc.result || '*';
        const myWin = (result === '1-0' && myColor === 'w') || (result === '0-1' && myColor === 'b');
        const myLose = (result === '0-1' && myColor === 'w') || (result === '1-0' && myColor === 'b');
        const resLabel = myWin ? '승리' : myLose ? '패배' : '무승부';
        const resCls = myWin ? 'win' : myLose ? 'lose' : 'draw';
        const dateStr = doc.playedAt ? new Date(doc.playedAt.seconds * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '—';
        
        // 데이터 위치 결정: gd 객체 내부 혹은 tacticAnalysis 안
        const moves = gd.moveJudgments || (doc.tacticAnalysis && doc.tacticAnalysis.moveJudgments) || [];
        
        let moveHtml = '';
        if (Array.isArray(moves)) {
            const states = parsePgnToStates(doc.pgn);
            const J_LABEL = { blunder: '??', mistake: '?', inaccuracy: '?!' };
            const J_COLOR = { blunder: '#cc3333', mistake: '#e08c3a', inaccuracy: '#f6c94a' };

            // judgment에서 my/opp 접두사 제거 (예: myBlunder -> blunder)
            const baseJudgment = judgment.replace(/^(my|opp)/, '').toLowerCase();

            moves.forEach((m, idx) => {
                if(m === judgment) {
                    const san = states[idx + 1] ? states[idx + 1].san : '?';
                    const moveNum = Math.ceil((idx + 1) / 2);
                    moveHtml += `<span class="tg-tag" style="background:${J_COLOR[baseJudgment]}33; color:${J_COLOR[baseJudgment]}">
                                    ${moveNum}수 ${san} ${J_LABEL[baseJudgment] || ''}
                                 </span> `;
                }
            });
        } else {
            console.warn('moves가 배열이 아닙니다:', moves);
        }

        html += `<div class="tmodal-game-item" onclick="closeTacticModalAndOpen(${JSON.stringify(doc).replace(/"/g, '&quot;')})">
          <div class="tg-header">
            <div class="tg-players">⬜ ${doc.whiteName || '백'} vs ⬛ ${doc.blackName || '흑'}</div>
            <div class="tg-result-badge ${resCls}">${resLabel}</div>
          </div>
          <div class="tg-meta"><span>${dateStr}</span></div>
          <div class="tg-tactic-tags">${moveHtml}</div>
        </div>`;
      }
      bodyEl.innerHTML = html;
      modal.classList.add('show');
    }

    function closeTacticModal() {
      document.getElementById('tactic-modal').classList.remove('show');
    }

    function closeTacticModalAndOpen(doc) {
      closeTacticModal();
      // 기보 탭으로 전환 후 해당 기보 열기
      switchTab('records');
      // 리스트에서 해당 게임 찾아 클릭
      setTimeout(() => {
        const item = document.querySelector(`.record-item[data-id="${doc.id}"]`);
        if (item) { item.click(); item.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        else showToast('기보 목록에서 해당 게임을 선택해주세요');
      }, 120);
    }

    // ════════════════════════════════════════
    // 오프닝 통계 렌더링
    // ════════════════════════════════════════
    function renderOpeningStats(openingStats) {
      const container = document.getElementById('opening-stats-container');
      if (!container) return;

      if (!openingStats || !openingStats.length) {
        container.innerHTML = `<div class="empty-state">오프닝 데이터가 없습니다 (기보 필요)</div>`;
        return;
      }

      const whiteOps = openingStats.filter(o => o.w.total > 0).sort((a, b) => b.w.total - a.w.total);
      const blackOps = openingStats.filter(o => o.b.total > 0).sort((a, b) => b.b.total - a.b.total);

      function opRow(op, colorKey) {
        const cs = op[colorKey];
        const tot = cs.total;
        if (!tot) return '';
        const wPct = Math.round(cs.wins / tot * 100);
        const dPct = Math.round(cs.draws / tot * 100);
        const lPct = 100 - wPct - dPct;
        const varText = op.variation ? `<div class="opening-stat-var">${op.variation}</div>` : '';
        
        return `<div class="opening-stat-row">
          <span class="opening-eco-badge">${op.eco}</span>
          <div class="opening-stat-info">
            <div class="opening-stat-name">${op.name}</div>
            ${varText}
          </div>
          <div class="opening-stat-bars">
            <div class="opening-bar-row">
              <span class="opening-bar-label">승률</span>
              <div class="opening-bar-track"><div class="opening-bar-fill white" style="width:${wPct}%"></div></div>
              <span class="opening-bar-count">${wPct}%</span>
            </div>
            <div style="font-size:9px; color:var(--text-muted); text-align:right; margin-top:2px;">
              ${tot}게임 (${cs.wins}승 ${cs.draws}무 ${cs.losses}패)
            </div>
          </div>
        </div>`;
      }

      let html = '';
      if (whiteOps.length) {
        html += `<div class="stats-section-title" style="margin-top:0">⬜ 백으로 즐겨 쓰는 오프닝</div>
          <div class="opening-stats-grid">${whiteOps.slice(0, 5).map(o => opRow(o, 'w')).join('')}</div>`;
      }
      if (blackOps.length) {
        html += `<div class="stats-section-title" style="margin-top:20px">⬛ 흑으로 즐겨 쓰는 오프닝</div>
          <div class="opening-stats-grid">${blackOps.slice(0, 5).map(o => opRow(o, 'b')).join('')}</div>`;
      }
      
      html += `<div style="margin-top:16px; font-size:11px; color:var(--text-muted); text-align:center;">
        ※ ECO 코드 기반 자동 감지 (최근 50게임 중 상위 5개)
      </div>`;
      
      container.innerHTML = html;
    }

    // ════════════════════════════════════════
    // 통계 HTML 렌더링
    // ════════════════════════════════════════
    function renderStatsHTML(s) {
      const contentEl = document.getElementById('stats-content');
      if (!contentEl) return;

      const total = s.total || 0;
      const avgAcc = s.myAccuracy || 0;
      const winPct = s.winRate || 0;

      const wPct = Math.round((s.wins / total) * 100) || 0;
      const dPct = Math.round((s.draws / total) * 100) || 0;
      const lPct = 100 - wPct - dPct;

      contentEl.innerHTML = `
        <div class="stats-hero">
          <div class="stats-hero-card">
            <div class="stats-hero-label">총 분석 대국</div>
            <div class="stats-hero-value">${total}<span class="stats-hero-unit">회</span></div>
          </div>
          <div class="stats-hero-card">
            <div class="stats-hero-label">평균 종합 정확도</div>
            <div class="stats-hero-value" style="color:var(--accent-green-bright)">${avgAcc}<span class="stats-hero-unit">%</span></div>
          </div>
          <div class="stats-hero-card">
            <div class="stats-hero-label">승률</div>
            <div class="stats-hero-value" style="color:var(--accent-orange)">${winPct}<span class="stats-hero-unit">%</span></div>
          </div>
        </div>

        <div class="stats-card-group">
          <div class="stats-group-title">📊 대국 성과 요약</div>
          <div class="wdl-container">
            <div class="wdl-bar-wrap">
              <div class="wdl-bar-segment win" style="width:${wPct}%">${wPct >= 10 ? wPct + '%' : ''}</div>
              <div class="wdl-bar-segment draw" style="width:${dPct}%">${dPct >= 10 ? dPct + '%' : ''}</div>
              <div class="wdl-bar-segment lose" style="width:${lPct}%">${lPct >= 10 ? lPct + '%' : ''}</div>
            </div>
            <div class="wdl-legend">
              <div class="wdl-legend-item"><div class="wdl-dot win"></div> 승리 ${s.wins}</div>
              <div class="wdl-legend-item"><div class="wdl-dot draw"></div> 무승부 ${s.draws}</div>
              <div class="wdl-legend-item"><div class="wdl-dot lose"></div> 패배 ${s.losses}</div>
            </div>
          </div>

          <div class="comparison-grid">
            <div class="comp-box">
              <div class="comp-title">⬜ 백으로 플레이</div>
              <div class="wdl-legend" style="gap:12px; justify-content:space-between; font-size:12px;">
                <span>승 <b>${s.winsW}</b></span> <span>무 <b>${s.drawsW}</b></span> <span>패 <b>${s.lossesW}</b></span> <span>(총 ${s.myColor_counts.w}회)</span>
              </div>
            </div>
            <div class="comp-box">
              <div class="comp-title">⬛ 흑으로 플레이</div>
              <div class="wdl-legend" style="gap:12px; justify-content:space-between; font-size:12px;">
                <span>승 <b>${s.winsB}</b></span> <span>무 <b>${s.drawsB}</b></span> <span>패 <b>${s.lossesB}</b></span> <span>(총 ${s.myColor_counts.b}회)</span>
              </div>
            </div>
          </div>
        </div>

        <div class="stats-card-group">
          <div class="stats-group-title">⚠️ 주요 분석 포인트 (수 분류)</div>
          <div class="comparison-grid">
            <div class="comp-box">
              <div class="comp-title">나의 수 분석</div>
              <div class="key-grid" style="grid-template-columns: 1fr; gap: 8px;">
                <div class="key-card danger" onclick="openJudgmentModal('myBlunder', '치명적 실수', '??', '블런더')">
                  <div class="key-card-icon">😱</div>
                  <div class="key-card-body">
                    <div class="key-card-name">놓친 결정적 기회 (블런더)</div>
                    <div class="key-card-num">${s.myBlunders}</div>
                  </div>
                </div>
                <div class="key-card warn" onclick="openJudgmentModal('myMistake', '아쉬운 실수', '?', '실수')">
                  <div class="key-card-icon">😟</div>
                  <div class="key-card-body">
                    <div class="key-card-name">아쉬운 실수 (미스테이크)</div>
                    <div class="key-card-num">${s.myMistakes}</div>
                  </div>
                </div>
                <div class="key-card" style="border-color:rgba(255,255,255,0.05)" onclick="openJudgmentModal('myInaccuracy', '부정확한 수', '?!', '부정확')">
                  <div class="key-card-icon">🤨</div>
                  <div class="key-card-body">
                    <div class="key-card-name">정교하지 못한 수 (부정확)</div>
                    <div class="key-card-num">${s.myInaccuracies}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="comp-box">
              <div class="comp-title">상대의 수 분석</div>
              <div class="key-grid" style="grid-template-columns: 1fr; gap: 8px;">
                <div class="key-card good" onclick="openTacticModal('oppBlunder', '', '🎯', '상대 블런더 포착', 'found')">
                  <div class="key-card-icon">⚡</div>
                  <div class="key-card-body">
                    <div class="key-card-name">포착한 상대의 블런더</div>
                    <div class="key-card-num">${s.oppBlunderFound} <span style="font-size:12px; font-weight:normal; color:var(--text-muted)">/ ${s.oppBlunders}</span></div>
                  </div>
                </div>
                <div class="key-card" style="border-color:rgba(255,255,255,0.05)" onclick="openJudgmentModal('oppMistake', '상대 실수', '?', '상대 실수')">
                  <div class="key-card-icon">📉</div>
                  <div class="key-card-body">
                    <div class="key-card-name">상대가 저지른 실수</div>
                    <div class="key-card-num">${s.oppMistakes}</div>
                  </div>
                </div>
                <div class="key-card" style="border-color:rgba(255,255,255,0.05)" onclick="openJudgmentModal('oppInaccuracy', '상대 부정확', '?!', '상대 부정확')">
                  <div class="key-card-icon">🧐</div>
                  <div class="key-card-body">
                    <div class="key-card-name">상대의 부정확한 수</div>
                    <div class="key-card-num">${s.oppInaccuracies}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style="margin-top:16px; font-size:11px; color:var(--text-muted); text-align:center;">
             💡 각 항목을 클릭하면 해당 장면이 포함된 대국 목록을 볼 수 있습니다.
          </div>
        </div>

        <div class="stats-card-group">
          <div class="stats-group-title">♟ 전술 테마별 성과 (내가 찾은 vs 놓친 전술)</div>
          <div class="tactics-grid">
            ${renderTacticModernCard('🍴', '포크 (Fork)', 'fork', s.forkFound, s.forkMissed)}
            ${renderTacticModernCard('📌', '핀 (Pin)', 'pin', s.pinFound, s.pinMissed)}
            ${renderTacticModernCard('🏹', '스큐어 (Skewer)', 'skewer', s.skewerFound, s.skewerMissed)}
            ${renderTacticModernCard('⚡', '디스커버 (Discovery)', 'discovered', s.discoveredFound, s.discoveredMissed)}
            ${renderTacticModernCard('🪤', '기물 트랩 (Trap)', 'trap', s.trapFound, s.trapMissed)}
            ${renderTacticModernCard('🧲', '유인 (Decoy)', 'decoy', s.decoyFound, s.decoyMissed)}
          </div>
          <div style="margin-top:20px; font-size:11px; color:var(--text-muted); line-height:1.6;">
            ※ <b>전술 기회</b>: 엔진(Stockfish) 분석 기준, 최선수가 전술적 이득을 가져오는 포지션입니다.<br>
            ※ 놓친 전술들은 <b>퍼즐 페이지</b>에서 '내 기보 퍼즐'로 다시 풀어볼 수 있습니다.
          </div>
        </div>

        <div class="stats-card-group">
          <div class="stats-group-title">📖 오프닝 리포트</div>
          <div id="opening-stats-container">
             <div class="empty-state">오프닝 데이터를 로드 중입니다...</div>
          </div>
        </div>

        <div class="stats-card-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <div class="stats-group-title">📏 대국 길이</div>
            <div class="avg-moves-card">
              <div class="avg-moves-num">${s.avgMoves}</div>
              <div class="avg-moves-desc">평균 대국 수<br><span style="font-size:11px">대국당 평균 ${s.avgMoves}수 진행</span></div>
            </div>
          </div>
          <div>
            <div class="stats-group-title">🏁 종료 방식 요약</div>
            <div class="end-list">
              ${renderEndItem('체크메이트', s.endCheckmate, total)}
              ${renderEndItem('기권/기타', s.endResign, total)}
              ${renderEndItem('시간 초과', s.endTimeout, total)}
              ${renderEndItem('무승부', s.endDraw, total)}
            </div>
          </div>
        </div>
        <div style="height:32px"></div>
      `;

      renderOpeningStats(s.openingStats);
    }

    function renderTacticModernCard(icon, name, type, found, missed) {
      const fCount = typeof found === 'object' ? Object.values(found).reduce((a,b)=>a+b, 0) : (found || 0);
      const mCount = typeof missed === 'object' ? Object.values(missed).reduce((a,b)=>a+b, 0) : (missed || 0);
      const total = fCount + mCount;
      const pct = total > 0 ? Math.round((fCount / total) * 100) : 0;
      
      if (total === 0) {
        return `
          <div class="tactic-modern-card" style="opacity:0.5; cursor:default;">
            <div class="tm-header">
              <div class="tm-name">${name}</div>
              <div class="tm-icon-box">${icon}</div>
            </div>
            <div class="tm-meta">분석된 기회가 없습니다</div>
          </div>
        `;
      }

      return `
        <div class="tactic-modern-card" onclick="openTacticModal('${type}', '', '${icon}', '${name}')">
          <div class="tm-header">
            <div class="tm-name">${name}</div>
            <div class="tm-icon-box">${icon}</div>
          </div>
          <div class="tm-stats-row">
            <div class="tm-main-pct">${pct}%</div>
            <div class="tm-sub-count">성공률 (${fCount}/${total})</div>
          </div>
          <div class="tm-progress-bar">
            <div class="tm-progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="tm-meta">
            ${fCount}번의 기회를 잡았고, ${mCount}번의 기회를 놓쳤습니다.
          </div>
        </div>
      `;
    }

    function renderEndItem(label, count, total) {
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return `
        <div class="end-item">
          <div class="end-label">${label}</div>
          <div class="end-bar-wrap"><div class="end-bar-fill" style="width:${pct}%"></div></div>
          <div class="end-count">${count}</div>
        </div>
      `;
    }

    // ════════════════════════════════════════
    // Lichess 기보 분석 (현재 열려 있는 기보)
    // ════════════════════════════════════════



        // ════════════════════════════════════════
    // 화살표 시스템 (게임 중 저장된 화살표 표시 — 읽기 전용)
    // ════════════════════════════════════════
    const FILES_ARR = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    // 수 인덱스 → 화살표 배열 { fromCol,fromRow,toCol,toRow }
    let _moveArrows = {};

    // ── game_records의 arrows 필드에서 불러오기 ──
    function loadArrowsFromRecord(doc) {
      _moveArrows = {};
      if (!doc.arrows) return;
      // play.html 저장 형식: { "moveIndex": [{fc,fr,tc,tr,seq?},...] }
      // records.html 표시 형식: { moveIndex: [{fromCol,fromRow,toCol,toRow,seq?},...] }
      Object.entries(doc.arrows).forEach(([k, arr]) => {
        if (!arr || !arr.length) return;
        _moveArrows[parseInt(k)] = arr.map(a => ({
          fromCol: a.fc, fromRow: a.fr, toCol: a.tc, toRow: a.tr,
          seq: a.seq ? true : undefined
        }));
      });
    }

    // 칸 이름 (col=0→a, row=0→rank8)
    function sqName(col, row) { return FILES_ARR[col] + (8 - row); }

    // 800×800 viewBox 기준 칸 중앙 좌표 (뒤집기 고려)
    function viewerSqCenter(col, row) {
      const flipped = _viewMyColor === 'b';
      const dispCol = flipped ? 7 - col : col;
      const dispRow = flipped ? 7 - row : row;
      return { px: dispCol * 100 + 50, py: dispRow * 100 + 50 };
    }

    // SVG line 화살표 요소 생성
    function makeViewerArrowEl(fromCol, fromRow, toCol, toRow, isSeq) {
      const ARROW_COLOR_CAND = 'rgba(255,165,0,0.92)';
      const ARROW_COLOR_SEQ = 'rgba(80,160,255,0.88)';
      const ARROW_COLOR = isSeq ? ARROW_COLOR_SEQ : ARROW_COLOR_CAND;
      const markerId = isSeq ? 'viewer-arrow-head-seq' : 'viewer-arrow-head';
      const ARROW_SW = 14;
      const SVG_NS = 'http://www.w3.org/2000/svg';
      const from = viewerSqCenter(fromCol, fromRow);
      const to = viewerSqCenter(toCol, toRow);
      const dx = to.px - from.px, dy = to.py - from.py;
      const len = Math.sqrt(dx * dx + dy * dy); if (len < 1) return null;
      const ux = dx / len, uy = dy / len;
      const sx = from.px + ux * ARROW_SW * 1.1, sy = from.py + uy * ARROW_SW * 1.1;
      const ex = to.px - ux * ARROW_SW * 2.4, ey = to.py - uy * ARROW_SW * 2.4;
      if (Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2) < 5) return null;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', sx.toFixed(2)); line.setAttribute('y1', sy.toFixed(2));
      line.setAttribute('x2', ex.toFixed(2)); line.setAttribute('y2', ey.toFixed(2));
      line.setAttribute('stroke', ARROW_COLOR);
      line.setAttribute('stroke-width', ARROW_SW);
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('marker-end', `url(#${markerId})`);
      return line;
    }

    // 현재 수(_viewIdx)의 화살표를 SVG에 다시 그리기
    function redrawViewerArrows() {
      const g = document.getElementById('viewer-arrow-layer');
      if (!g) return;
      g.innerHTML = '';
      const arrows = _moveArrows[_viewIdx] || [];
      arrows.forEach(a => {
        const el = makeViewerArrowEl(a.fromCol, a.fromRow, a.toCol, a.toRow, !!a.seq);
        if (el) g.appendChild(el);
      });
    }

    // 전역 함수 노출 (onclick 핸들러 대응)
    window.switchTab = switchTab;
    window.goToMove = goToMove;
    window.goToPrevMove = () => goToMove(_viewIdx - 1);
    window.goToNextMove = () => goToMove(_viewIdx + 1);
    window.goToLastMove = () => goToMove(_states.length - 1);
    window.closeTacticModal = closeTacticModal;
    window.retryLoadRecords = retryLoadRecords;
    window.openTacticModal = openTacticModal;
    window.openJudgmentModal = openJudgmentModal;
    window.closeTacticModalAndOpen = closeTacticModalAndOpen;

    // AI 통계 피드백
    async function requestAIFeedback() {
      if (!_statsCache) { alert('먼저 통계 데이터 분석이 완료되어야 합니다.'); return; }
      const btn = document.getElementById('btn-ai-stats');
      const container = document.getElementById('ai-feedback-container');
      const body = document.getElementById('ai-feedback-body');

      if (btn.disabled) return;
      btn.disabled = true;
      btn.innerHTML = '<span class="ai-icon spinner">⏳</span> AI 분석 중...';
      container.style.display = 'block';
      body.innerHTML = '<div class="ai-loading">사용자의 최근 대국 성과를 심층 분석하고 있습니다...</div>';

      try {
        const s = _statsCache;
        const prompt = `
당신은 세계적인 체스 코치입니다. 사용자의 최근 ${s.total}개 게임 통계 데이터를 바탕으로 실력 향상을 위한 개인화된 피드백을 제공해주세요.

[통계 요약]
- 승률: ${s.winRate}% (승: ${s.wins}, 무: ${s.draws}, 패: ${s.losses})
- 진영별 성과:
  * 백(White): ${s.winsW}승 ${s.drawsW}무 ${s.lossesW}패 (총 ${s.myColor_counts.w}회)
  * 흑(Black): ${s.winsB}승 ${s.drawsB}무 ${s.lossesB}패 (총 ${s.myColor_counts.b}회)
- 상대 레이팅별 성과:
  * 나보다 높은 레이팅 상대: ${s.winsHigher}승 ${s.drawsHigher}무 ${s.lossesHigher}패 (승률: ${Math.round(s.winsHigher/Math.max(1, s.winsHigher+s.drawsHigher+s.lossesHigher)*100)}%)
  * 나보다 낮은 레이팅 상대: ${s.winsLower}승 ${s.drawsLower}무 ${s.lossesLower}패 (승률: ${Math.round(s.winsLower/Math.max(1, s.winsLower+s.drawsLower+s.lossesLower)*100)}%)
- 평균 정확도 (Lichess Accuracy%): ${s.myAccuracy}%
- 평균 Centipawn Loss: ${s.avgCpLoss}
- 주요 전술 성과:
  * 핀(Pin): ${s.pinFound}회 성공 / ${s.pinMissed}회 놓침
  * 포크(Fork): ${Object.values(s.forkFound).reduce((a,b)=>a+b,0)}회 성공 / ${Object.values(s.forkMissed).reduce((a,b)=>a+b,0)}회 놓침
  * 상대 실수 포착: ${s.oppBlunderFound}회 성공 / ${s.oppBlunderMissed}회 놓침

[자주 사용하는 오프닝 (상위 5개)]
${s.openingStats.slice(0, 5).map(o => `- ${o.name} (백 승률: ${Math.round(o.w.wins/Math.max(1,o.w.total)*100)}%, 흑 승률: ${Math.round(o.b.wins/Math.max(1,o.b.total)*100)}%)`).join('\n')}

[요청 사항]
1. 진영별(백/흑) 승률 차이에 대한 원인 분석 및 개선 방향.
2. 상대 레이팅(높음/낮음)에 따른 본인의 플레이 성향 분석 (예: 강자에게 강한지, 약자에게 방심하는지).
3. 현재 오프닝 선택이 효율적인지, 특정 오프닝에서 더 연마해야 할 점은 무엇인지.
4. 전술적 측면에서 어떤 유형(핀, 포크 등)에 취약하며 어떤 훈련이 필요한지.
5. 전반적인 총평과 다음 단계를 위한 조언.

[중요 지시 사항]
- 반드시 **한국어**로만 답변하세요.
- 베트남어(chơi 등)나 다른 외국어 단어를 절대 섞지 마세요.
- 체스 전문 용어는 한국어 또는 표준 영어 용어를 사용하세요.
- 친절하고 격려하는 어조를 유지하며, 마크다운 형식을 사용하여 가독성 있게 작성하세요.
`;

        const response = await fetch('/api/groq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: '당신은 세계적인 체스 코치입니다. 모든 답변은 반드시 한국어로만 작성해야 하며, 다른 언어(베트남어 등)를 절대 혼용하지 마십시오.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3
          })
        });

        if (!response.ok) throw new Error('AI 응답을 가져오지 못했습니다.');
        const data = await response.json();
        
        // OpenAI 호환 포맷 (data.choices[0].message.content) 또는 직렬화된 포맷 대응
        const text = data.choices?.[0]?.message?.content || data.answer || data.text || '분석 결과를 생성할 수 없습니다.';
        
        // 간단한 마크다운 처리
        body.innerHTML = text
          .replace(/### (.*)/g, '<h3>$1</h3>')
          .replace(/## (.*)/g, '<h2>$1</h2>')
          .replace(/# (.*)/g, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/- (.*)/g, '<li>$1</li>')
          .replace(/\n/g, '<br>');
          
      } catch (err) {
        body.innerHTML = `<div class="ai-error">오류 발생: ${err.message}</div>`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="ai-icon">✨</span> AI 통계 분석 받기';
      }
    }

    function closeAIFeedback() {
      document.getElementById('ai-feedback-container').style.display = 'none';
    }

    window.requestAIFeedback = requestAIFeedback;
    window.closeAIFeedback = closeAIFeedback;