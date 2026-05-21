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

      const { evalRows, error } = await stockfishEvalStates(states, {
        depth: SF_DEPTH,
        movetime: typeof LICHESS_SF_MOVETIME !== 'undefined' ? LICHESS_SF_MOVETIME : 900,
        multipv: typeof LICHESS_SF_MULTIPV !== 'undefined' ? LICHESS_SF_MULTIPV : 1,
        onProgress: (cur, tot) => report(cur, tot),
      });
      if (error) {
        console.warn('[analyzeGame] Stockfish Worker 실패:', error);
        return result;
      }

      // ── 게임 정확도 계산 (조화평균)
      result.myAccuracy = gameAccuracyFromEvals(evalRows, myColor);

      const missedRef = { count: 0 };
      const CT = typeof ChessTactics !== 'undefined' ? ChessTactics : null;

      // ── [개선] FEN 기반 정밀 분석 (30 req/min 제한 준수 & 모든 실수 분석)
      // PGN 방식(일일 3회 제한) 대신 FEN 방식을 사용하여 무제한 분석 지원
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

        // 내가 둔 수가 나쁜 수(??, ?, ?!)이고, 엔진 추천수가 있을 때 분석 대상으로 등록
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

      // 큐에 담긴 지점들을 순차 분석 (ChessTactics 내부의 RequestQueue가 2초 간격 보장)
      for (const task of analyzeQueue) {
        try {
          const prevFen = CT.snapshotFromState(task.stBefore);
          const bestMv = uciToMoveFromState(task.bestUci, task.stBefore);
          if (!bestMv) continue;

          // 최선의 수를 두었을 때의 FEN 생성
          const bestAfterFen = CT.applyMoveSnapshot(prevFen, bestMv);
          // FEN 분석 API 호출 (내부적으로 Rate Limit 및 캐시 처리됨)
          const bestT = await CT.detectTactics(bestAfterFen, { depth: 'l2', withSequence: true });

          if (bestT) {
            // 현재 둔 수에서도 같은 전술이 가능했는지 확인 (놓친 것인지 판단)
            // 실제로는 playedUci 후의 FEN도 체크해야 완벽하지만, 속도를 위해 생략하거나
            // 간단히 "좋은 전술 기회를 놓침"으로 처리
            const miss = {
              fork: bestT.fork,
              absPin: bestT.absPin,
              relPin: bestT.relPin,
              trap: bestT.trap,
              decoy: bestT.decoy,
              skewer: bestT.skewer,
              discovered: bestT.discovered
            };

            const ptB = task.stBefore.board[bestMv.from[0]][bestMv.from[1]]?.[1] || task.pt;
            
            // 전술 이벤트 등록 (이 데이터가 puzzle 페이지에서 사용됨)
            if (miss.fork) applyMissedTactics(result, { fork: true }, ptB, task.moveNum, task.san, task.plyIdx, task.bestUci, missedRef);
            if (miss.absPin) applyMissedTactics(result, { absPin: true }, ptB, task.moveNum, task.san, task.plyIdx, task.bestUci, missedRef);
            if (miss.relPin) applyMissedTactics(result, { relPin: true }, ptB, task.moveNum, task.san, task.plyIdx, task.bestUci, missedRef);
            if (miss.trap) applyMissedTactics(result, { trap: true }, ptB, task.moveNum, task.san, task.plyIdx, task.bestUci, missedRef);
            if (miss.decoy) applyMissedTactics(result, { decoy: true }, ptB, task.moveNum, task.san, task.plyIdx, task.bestUci, missedRef);
            if (miss.skewer) applyMissedTactics(result, { skewer: true }, ptB, task.moveNum, task.san, task.plyIdx, task.bestUci, missedRef);
            if (miss.discovered) applyMissedTactics(result, { discovered: true }, ptB, task.moveNum, task.san, task.plyIdx, task.bestUci, missedRef);
          }
        } catch (e) {
          console.warn('[analyzeGame] FEN 분석 실패:', e.message);
        }
      }

      // 나머지 수들에 대한 기본 루프 (이미 위에서 나쁜 수는 처리했으므로 여기서는 통계 집계만)
      for (let i = 1; i < states.length; i++) {
        const mover = states[i - 1].turn;
        const san = states[i].san || '';
        const move = states[i].move;
        const isMe = (mover === myColor);
        const cpBefore = evalRows[i - 1].cpw;
        const cpAfter = evalRows[i].cpw;

        const bad = lichessCpAdviceJudgment(cpBefore, cpAfter, mover);
        const judgmentTag = bad
          ? ((isMe ? 'my' : 'opp') + bad.charAt(0).toUpperCase() + bad.slice(1))
          : null;
        
        // 중복 방지를 위해 이미 result.moveJudgments에 데이터가 없을 때만 push
        if (result.moveJudgments.length < i) {
          result.moveJudgments.push(judgmentTag);
        }

        if (isMe) {
          if (bad === 'inaccuracy') result.myInaccuracies++;
          else if (bad === 'mistake') result.myMistakes++;
          else if (bad === 'blunder') result.myBlunders++;
        } else {
          if (bad === 'inaccuracy') result.oppInaccuracies++;
          else if (bad === 'mistake') result.oppMistakes++;
          else if (bad === 'blunder') result.oppBlunders++;
        }

        if (isMe) {
          const cpMeBefore = myColor === 'w' ? cpBefore : -cpBefore;
          const cpMeAfter  = myColor === 'w' ? cpAfter  : -cpAfter;
          result.myCpSum += Math.max(0, cpMeBefore - cpMeAfter);
          result.myMoveCount++;
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
        // 1차 시도: orderBy 포함 (인덱스 있는 경우)
        try {
          snap = await withTimeout(
            _fbDb.collection('game_records').where('uid', '==', _user.uid).orderBy('playedAt', 'desc').limit(50).get()
          );
        } catch (e1) {
          // 인덱스 미생성 시 링크 안내
          if (e1.message && e1.message.includes('index')) {
            console.info('%c[Firebase] 복합 인덱스를 생성하면 정렬이 더 빨라집니다\n%c▶ https://console.firebase.google.com/v1/r/project/chess-education-464fc/firestore/indexes?create_composite=Clpwcm9qZWN0cy9jaGVzcy1lZHVjYXRpb24tNDY0ZmMvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2dhbWVfcmVjb3Jkcy9pbmRleGVzL18QARoHCgN1aWQQARoMCghwbGF5ZWRBdBACGgwKCF9fbmFtZV9fEAI',
              'color:#e0b040;font-weight:bold', 'color:#7fa650;text-decoration:underline');
          }
          // 2차 시도: orderBy 없이
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
        // orderBy 없이 가져온 경우 클라이언트 측 정렬
        docs.sort((a, b) => {
          const ta = a.playedAt ? a.playedAt.seconds : 0;
          const tb = b.playedAt ? b.playedAt.seconds : 0;
          return tb - ta;
        });
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
          item.innerHTML = `<div class="record-result-badge ${badgeClass}">${badge}</div><div class="record-info"><div class="record-players">${doc.whiteName || '백'} vs ${doc.blackName || '흑'}</div><div class="record-meta"><span>${label}</span><span>${doc.moveCount || 0}수</span><span>${dateStr}</span></div></div>`;
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
        let docs = [];
        try {
          let snap = null;
          try { snap = await _fbDb.collection('game_records').where('uid', '==', _user.uid).orderBy('playedAt', 'desc').limit(50).get(); }
          catch (e) { snap = await _fbDb.collection('game_records').where('uid', '==', _user.uid).limit(50).get(); }
          const seenIds = new Set();
          snap.forEach(d => { if (!seenIds.has(d.id)) { seenIds.add(d.id); docs.push({ id: d.id, ...d.data() }); } });
        } catch (e) {
          contentEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div>불러오기 실패: ${e.message}</div></div>`;
          return;
        }

        if (!docs.length) {
          contentEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><div>분석할 기록이 없습니다</div></div>`;
          return;
        }

        let wins = 0, losses = 0, draws = 0, winsW = 0, lossesW = 0, drawsW = 0, winsB = 0, lossesB = 0, drawsB = 0;
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

        for (let gi = 0; gi < docs.length; gi++) {
          const doc = docs[gi];
          const myColor = resolveMyColor(doc), result = doc.result || '*';
          myColor_counts[myColor]++;
          const myWin = (result === '1-0' && myColor === 'w') || (result === '0-1' && myColor === 'b');
          const myLose = (result === '0-1' && myColor === 'w') || (result === '1-0' && myColor === 'b');
          if (myWin) { wins++; if (myColor === 'w') winsW++; else winsB++; }
          else if (myLose) { losses++; if (myColor === 'w') lossesW++; else lossesB++; }
          else { draws++; if (myColor === 'w') drawsW++; else drawsB++; }
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
            continue;
          }

          const pct = Math.round(gi / total * 100);
          contentEl.innerHTML = `<div class="stats-loading"><div class="stats-spinner"></div><div class="stats-progress-wrap">
        <div style="font-size:13px;color:var(--text-secondary)">Stockfish 분석 중… (${gi + 1} / ${total})</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">깊이 ${__RC.SF_DEPTH} · 수 분류 = 리체스 Accuracy%식</div>
        <div class="stats-progress-bar-outer"><div class="stats-progress-bar-fill" style="width:${pct}%"></div></div>
        <div class="stats-progress-label">포지션 분석 중…</div>
      </div></div>`;

          try {
            const a = await window.analyzeGame(doc.pgn, myColor, (cur, tot) => {
              const ip = Math.round(cur / Math.max(tot, 1) * 100);
              const fill = contentEl.querySelector('.stats-progress-bar-fill');
              if (fill) fill.style.width = Math.round(gi / total * 100 + ip / total) + '%';
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
          total, wins, losses, draws, winsW, lossesW, drawsW, winsB, lossesB, drawsB, myColor_counts,
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
      if (!openingStats || !openingStats.length) {
        return `<div class="stats-section-title">📖 오프닝 통계</div>
      <div class="stats-note" style="padding:8px 0">오프닝 데이터가 없습니다 (기보 필요)</div>`;
      }

      // 백으로 플레이한 것들 (w.total > 0)
      const whiteOps = openingStats.filter(o => o.w.total > 0).sort((a, b) => b.w.total - a.w.total);
      // 흑으로 플레이한 것들 (b.total > 0)
      const blackOps = openingStats.filter(o => o.b.total > 0).sort((a, b) => b.b.total - a.b.total);

      function opRow(op, colorKey) {
        const cs = op[colorKey];
        const tot = cs.total;
        if (!tot) return '';
        const maxVal = tot;
        const wPct = Math.round(cs.wins / tot * 100);
        const dPct = Math.round(cs.draws / tot * 100);
        const lPct = 100 - wPct - dPct;
        const varText = op.variation ? `<div class="opening-stat-var">${op.variation}</div>` : '';
        return `<div class="opening-stat-row">
      <span class="opening-eco-badge">${op.eco}</span>
      <div class="opening-stat-info">
        <div class="opening-stat-name">${op.name}</div>
        ${varText}
        <div class="opening-wdl">
          <span class="owdl w">${cs.wins}승</span>
          <span class="owdl d">${cs.draws}무</span>
          <span class="owdl l">${cs.losses}패</span>
        </div>
      </div>
      <div class="opening-stat-bars">
        <div style="font-size:9px;color:var(--text-muted);text-align:right;margin-bottom:2px">${tot}게임 · 승률 ${wPct}%</div>
        <div style="height:8px;background:var(--bg-tertiary);border-radius:4px;overflow:hidden;display:flex;">
          <div style="height:100%;background:var(--accent-green-bright);width:${wPct}%;transition:width .5s"></div>
          <div style="height:100%;background:var(--text-muted);width:${dPct}%;transition:width .5s"></div>
          <div style="height:100%;background:#e07070;width:${lPct}%;transition:width .5s"></div>
        </div>
      </div>
    </div>`;
      }

      let html = `<div class="stats-section-title">📖 오프닝 통계</div>`;

      if (whiteOps.length) {
        html += `<div class="stats-section-title" style="margin-top:12px;color:var(--text-secondary)">⬜ 백으로 플레이한 오프닝</div>
      <div class="opening-stats-grid">${whiteOps.slice(0, 8).map(o => opRow(o, 'w')).join('')}</div>`;
      }
      if (blackOps.length) {
        html += `<div class="stats-section-title" style="margin-top:12px;color:var(--text-secondary)">⬛ 흑으로 플레이한 오프닝</div>
      <div class="opening-stats-grid">${blackOps.slice(0, 8).map(o => opRow(o, 'b')).join('')}</div>`;
      }
      html += `<div class="stats-note">※ 오프닝은 ECO 코드 기준으로 기보의 초반 수에서 자동 감지됩니다. 상위 8개 표시.</div>`;
      return html;
    }

    // ════════════════════════════════════════
    // 통계 HTML 렌더링
    // ════════════════════════════════════════
    function renderStatsHTML(s) {
      const contentEl = document.getElementById('stats-content');
      const endMax = Math.max(s.endCheckmate, s.endResign, s.endDraw, s.endTimeout, 1);
      const PIECES = [{ key: 'P', icon: '♙', name: '폰' }, { key: 'N', icon: '♞', name: '나이트' }, { key: 'B', icon: '♝', name: '비숍' }, { key: 'R', icon: '♜', name: '룩' }, { key: 'Q', icon: '♛', name: '퀸' }, { key: 'K', icon: '♚', name: '킹' }];

      function fvmRow(icon, name, total_label, found, missed, tacticType, tacticPiece) {
        const tot = found + missed; if (tot === 0) return '';
        const fp = Math.round(found / tot * 100), mp = 100 - fp;
        const clickAttr = tacticType ? `onclick="openTacticModal('${tacticType}','${tacticPiece || ''}','${icon}','${name}')" style="cursor:pointer"` : '';
        return `<div class="fvm-row${tacticType ? ' clickable' : ''}" ${clickAttr}>
      <div class="fvm-piece-col"><div class="fvm-piece-icon">${icon}</div><div class="fvm-piece-name">${name}</div><div class="fvm-piece-total">${tot}회</div></div>
      <div class="fvm-bars-col">
        <div class="fvm-bar-row"><span class="fvm-pct found">✔ ${fp}%</span><div class="fvm-track"><div class="fvm-fill found" style="width:${fp}%"></div></div><span class="fvm-count">${found}</span></div>
        <div class="fvm-bar-row"><span class="fvm-pct missed">✘ ${mp}%</span><div class="fvm-track"><div class="fvm-fill missed" style="width:${mp}%"></div></div><span class="fvm-count">${missed}</span></div>
      </div></div>`;
      }

      const forkHtml = PIECES.map(p => fvmRow(p.icon, p.name, '', s.forkFound[p.key] || 0, s.forkMissed[p.key] || 0, 'fork', p.key)).join('');
      const oppForkHtml = PIECES.map(p => {
        const cnt = s.oppForkCreated?.[p.key] || 0; if (!cnt) return '';
        return `<div class="fvm-row clickable" onclick="openTacticModal('oppFork','${p.key}','${p.icon}','${p.name}')">
      <div class="fvm-piece-col"><div class="fvm-piece-icon">${p.icon}</div><div class="fvm-piece-name">${p.name}</div><div class="fvm-piece-total">${cnt}회</div></div>
      <div class="fvm-bars-col"><div class="fvm-bar-row"><span class="fvm-pct missed">상대가 사용</span><div class="fvm-track"><div class="fvm-fill missed" style="width:100%"></div></div><span class="fvm-count">${cnt}</span></div></div>
    </div>`;
      }).join('');
      const pinHtml = (() => {
        const absFound = s.absPinFound || 0, absMissed = s.absPinMissed || 0;
        const relFound = s.relPinFound || 0, relMissed = s.relPinMissed || 0;
        const tot = (absFound + absMissed + relFound + relMissed);
        if (tot === 0) return '';
        const rows = [];
        // 절대 핀
        if (absFound > 0) rows.push(`<div class="fvm-row clickable" onclick="openTacticModal('absPin','','📌','찾은 절대 핀','found')">
        <div class="fvm-piece-col"><div class="fvm-piece-icon">📌</div><div class="fvm-piece-name">찾은 절대 핀</div><div class="fvm-piece-total">${absFound}회</div></div>
        <div class="fvm-bars-col"><div class="fvm-bar-row"><span class="fvm-pct found">✔ 찾음</span><div class="fvm-track"><div class="fvm-fill found" style="width:100%"></div></div><span class="fvm-count">${absFound}</span></div></div>
      </div>`);
        if (absMissed > 0) rows.push(`<div class="fvm-row clickable" onclick="openTacticModal('absPin','','📌','놓친 절대 핀','missed')">
        <div class="fvm-piece-col"><div class="fvm-piece-icon">📌</div><div class="fvm-piece-name">놓친 절대 핀</div><div class="fvm-piece-total">${absMissed}회</div></div>
        <div class="fvm-bars-col"><div class="fvm-bar-row"><span class="fvm-pct missed">✘ 놓침</span><div class="fvm-track"><div class="fvm-fill missed" style="width:100%"></div></div><span class="fvm-count">${absMissed}</span></div></div>
      </div>`);
        // 상대 핀
        if (relFound > 0) rows.push(`<div class="fvm-row clickable" onclick="openTacticModal('relPin','','🔗','찾은 상대 핀','found')">
        <div class="fvm-piece-col"><div class="fvm-piece-icon">🔗</div><div class="fvm-piece-name">찾은 상대 핀</div><div class="fvm-piece-total">${relFound}회</div></div>
        <div class="fvm-bars-col"><div class="fvm-bar-row"><span class="fvm-pct found">✔ 찾음</span><div class="fvm-track"><div class="fvm-fill found" style="width:100%"></div></div><span class="fvm-count">${relFound}</span></div></div>
      </div>`);
        if (relMissed > 0) rows.push(`<div class="fvm-row clickable" onclick="openTacticModal('relPin','','🔗','놓친 상대 핀','missed')">
        <div class="fvm-piece-col"><div class="fvm-piece-icon">🔗</div><div class="fvm-piece-name">놓친 상대 핀</div><div class="fvm-piece-total">${relMissed}회</div></div>
        <div class="fvm-bars-col"><div class="fvm-bar-row"><span class="fvm-pct missed">✘ 놓침</span><div class="fvm-track"><div class="fvm-fill missed" style="width:100%"></div></div><span class="fvm-count">${relMissed}</span></div></div>
      </div>`);
        return rows.join('');
      })();
      const skewDiscHtml = [
        fvmRow('↗', '스큐어 (직선)', '', s.skewerFound || 0, s.skewerMissed || 0, 'skewer', ''),
        fvmRow('◎', '디스커버 어택', '', s.discoveredFound || 0, s.discoveredMissed || 0, 'discovered', ''),
        fvmRow('🪤', '기물 트랩', '', s.trapFound || 0, s.trapMissed || 0, 'trap', ''),
        fvmRow('🧲', '유인', '', s.decoyFound || 0, s.decoyMissed || 0, 'decoy', ''),
      ].join('');
      const obHtml = fvmRow('🎯', '상대 실수', '', s.oppBlunderFound, s.oppBlunderMissed, 'oppBlunder', '');
      const cpColor = s.avgCpLoss < 30 ? 'var(--accent-green-bright)' : s.avgCpLoss < 75 ? '#e0b040' : '#e07070';

      contentEl.innerHTML = `
    <div class="wdl-row">
      <div class="wdl-card win"><div class="wdl-num">${s.wins}</div><div class="wdl-label">승리</div></div>
      <div class="wdl-card draw"><div class="wdl-num">${s.draws}</div><div class="wdl-label">무승부</div></div>
      <div class="wdl-card lose"><div class="wdl-num">${s.losses}</div><div class="wdl-label">패배</div></div>
    </div>
    <div class="winrate-bar-wrap">
      <div class="winrate-bar-label"><span class="winrate-bar-title">승률</span><span class="winrate-bar-pct">${s.winRate}%</span></div>
      <div class="winrate-bar"><div class="winrate-bar-fill" style="width:${s.winRate}%"></div></div>
    </div>

    <div class="stats-section-title">⬜⬛ 색상별 성적</div>
    <div class="color-grid">
      <div class="color-card"><div class="color-card-title">⬜ 백으로 플레이</div>
        <div class="color-stat-row"><span>승</span><span>${s.winsW}</span></div>
        <div class="color-stat-row"><span>무</span><span>${s.drawsW}</span></div>
        <div class="color-stat-row"><span>패</span><span>${s.lossesW}</span></div>
        <div class="color-stat-row"><span>게임 수</span><span>${s.myColor_counts.w}</span></div>
      </div>
      <div class="color-card"><div class="color-card-title">⬛ 흑으로 플레이</div>
        <div class="color-stat-row"><span>승</span><span>${s.winsB}</span></div>
        <div class="color-stat-row"><span>무</span><span>${s.drawsB}</span></div>
        <div class="color-stat-row"><span>패</span><span>${s.lossesB}</span></div>
        <div class="color-stat-row"><span>게임 수</span><span>${s.myColor_counts.b}</span></div>
      </div>
    </div>

    <div class="stats-section-title">🎯 수 정확도 (Stockfish 깊이 ${__RC.SF_DEPTH} · 리체스 Accuracy%식)</div>
    <div class="key-grid">
      <div class="key-card"><div class="key-card-icon">🎯</div><div class="key-card-body">
        <div class="key-card-name">게임 정확도</div>
        <div class="key-card-num" style="color:${s.myAccuracy >= 85 ? 'var(--accent-green-bright)' : s.myAccuracy >= 70 ? '#e0b040' : '#e07070'}">${s.myAccuracy}%</div>
        <div class="key-card-sub">조화평균 · 높을수록 정확</div>
      </div></div>
      <div class="key-card"><div class="key-card-icon">📉</div><div class="key-card-body">
        <div class="key-card-name">평균 센티폰 손실 (ACPL)</div>
        <div class="key-card-num" style="color:${cpColor}">${s.avgCpLoss}</div>
        <div class="key-card-sub">낮을수록 정확 (0 = 완벽)</div>
      </div></div>
      <div class="key-card good"><div class="key-card-icon">👑</div><div class="key-card-body">
        <div class="key-card-name">체크메이트</div>
        <div class="key-card-num">${s.checkmates}</div>
        <div class="key-card-sub">내가 걸은 체크메이트</div>
      </div></div>
    </div>

    <div class="stats-section-title">⚠️ 수 분류 결과 (Delta 기반)</div>
    <div class="key-grid">
    <!-- 내 분류 -->
      <div class="key-card danger" onclick="openJudgmentModal('myBlunder', '내 블런더', '??', '블런더')"><div class="key-card-body">
        <div class="key-card-name">내 블런더 ??</div><div class="key-card-num">${s.myBlunders}</div>
        <div class="key-card-sub">클릭 시 게임 상세</div>
      </div></div>
      <div class="key-card warn" onclick="openJudgmentModal('myMistake', '내 실수', '?', '실수')"><div class="key-card-body">
        <div class="key-card-name">내 실수 ?</div><div class="key-card-num">${s.myMistakes}</div>
        <div class="key-card-sub">클릭 시 게임 상세</div>
      </div></div>
      <div class="key-card" onclick="openJudgmentModal('myInaccuracy', '내 부정확', '?!', '부정확')"><div class="key-card-body">
        <div class="key-card-name">내 부정확 ?!</div><div class="key-card-num">${s.myInaccuracies}</div>
        <div class="key-card-sub">클릭 시 게임 상세</div>
      </div></div>
      <!-- 상대 분류 -->
      <div class="key-card danger" onclick="openJudgmentModal('oppBlunder', '상대 블런더', '??', '블런더')"><div class="key-card-body">
        <div class="key-card-name">상대 블런더 ??</div><div class="key-card-num">${s.oppBlunders}</div>
        <div class="key-card-sub">클릭 시 게임 상세</div>
      </div></div>
      <div class="key-card warn" onclick="openJudgmentModal('oppMistake', '상대 실수', '?', '실수')"><div class="key-card-body">
        <div class="key-card-name">상대 실수 ?</div><div class="key-card-num">${s.oppMistakes}</div>
        <div class="key-card-sub">클릭 시 게임 상세</div>
      </div></div>
      <div class="key-card" onclick="openJudgmentModal('oppInaccuracy', '상대 부정확', '?!', '부정확')"><div class="key-card-body">
        <div class="key-card-name">상대 부정확 ?!</div><div class="key-card-num">${s.oppInaccuracies}</div>
        <div class="key-card-sub">클릭 시 게임 상세</div>
      </div></div>
    </div>

    <div class="stats-section-title">🎯 상대 블런더 합계</div>
    <div class="key-grid">
      <div class="key-card"><div class="key-card-icon">🎯</div><div class="key-card-body">
        <div class="key-card-name">상대 블런더</div><div class="key-card-num">${s.oppBlunders}</div>
        <div class="key-card-sub">상대가 낸 블런더 합계</div>
      </div></div>
    </div>

    <div class="stats-section-title">🎯 상대 블런더 포착</div>
    <div class="fvm-section">${obHtml || '<div class="stats-note" style="padding:12px 0">상대 블런더 데이터 없음</div>'}</div>
    <div class="stats-note">※ 상대 블런더 직후 최선수로 응수 → 찾음. 놓치면 → 놓침. <span style="color:var(--accent-green-bright)">· 클릭하면 게임 목록을 확인할 수 있습니다</span></div>

    <div class="stats-section-title">♞ 내가 찾은 vs 놓친 포크</div>
    <div class="fvm-section">${forkHtml || '<div class="stats-note" style="padding:12px 0">포크 데이터 없음</div>'}</div>
    <div class="stats-note">※ Stockfish 베스트 무브가 포크였는데 다른 수를 두고 ≥${__RC.FORK_CP_GAIN}cp 손실이면 "놓친 포크". <span style="color:var(--accent-green-bright)">· 클릭하면 게임 목록을 확인할 수 있습니다</span></div>

    <div class="stats-section-title">⚔️ 상대가 사용한 포크</div>
    <div class="fvm-section">${oppForkHtml || '<div class="stats-note" style="padding:12px 0">상대 포크 데이터 없음</div>'}</div>
    <div class="stats-note">※ 상대가 나에게 포크를 걸었던 횟수입니다. 자주 당하는 기물 유형을 파악해보세요. <span style="color:var(--accent-green-bright)">· 클릭하면 게임 목록을 확인할 수 있습니다</span></div>

    <div class="stats-section-title">📌 찾은 vs 놓친 핀</div>
    <div class="fvm-section">${pinHtml || '<div class="stats-note" style="padding:12px 0">핀 데이터 없음</div>'}</div>
    <div class="stats-note">※ 상대 기물이 움직이면 상대 킹 노출되는 절대 핀. Stockfish 베스트가 핀이었는데 안 뒀으면 "놓침". <span style="color:var(--accent-green-bright)">· 클릭하면 게임 목록을 확인할 수 있습니다</span></div>

    <div class="stats-section-title">🔭 스큐어 · 디스커버 · 트랩 · 유인</div>
    <div class="fvm-section">${skewDiscHtml || '<div class="stats-note" style="padding:12px 0">전술 데이터 없음</div>'}</div>
    <div class="stats-note">※ 합법 수 기반 판별. 트랩: 공격받은 기물이 빠져도 계속 잡히는 상황. 유인: 방어 기물을 끌어내 다른 위협을 여는 수. 포크와 겹치면 포크만 집계합니다. <span style="color:var(--accent-green-bright)">· 클릭하면 게임 목록</span></div>

    ${renderOpeningStats(s.openingStats || [])}

    <div class="stats-section-title">📏 게임 길이</div>
    <div class="avg-moves-card">
      <div class="avg-moves-num">${s.avgMoves}</div>
      <div class="avg-moves-desc">평균 수<br><span style="color:var(--text-muted)">총 ${s.total}게임 기준</span></div>
    </div>

    <div class="stats-section-title">🏁 종료 방식 (추정)</div>
    <div class="end-list">
      <div class="end-item"><span class="end-label">체크메이트</span><div class="end-bar-wrap"><div class="end-bar-fill" style="width:${Math.round(s.endCheckmate / endMax * 100)}%"></div></div><span class="end-count">${s.endCheckmate}</span></div>
      <div class="end-item"><span class="end-label">기권/기타</span><div class="end-bar-wrap"><div class="end-bar-fill" style="width:${Math.round(s.endResign / endMax * 100)}%"></div></div><span class="end-count">${s.endResign}</span></div>
      <div class="end-item"><span class="end-label">시간 초과</span><div class="end-bar-wrap"><div class="end-bar-fill" style="width:${Math.round(s.endTimeout / endMax * 100)}%"></div></div><span class="end-count">${s.endTimeout}</span></div>
      <div class="end-item"><span class="end-label">무승부</span><div class="end-bar-wrap"><div class="end-bar-fill" style="width:${Math.round(s.endDraw / endMax * 100)}%"></div></div><span class="end-count">${s.endDraw}</span></div>
    </div>
    <div class="stats-note">※ 종료 방식은 Firebase termination 필드 기반 추정치입니다.</div>
    <div style="height:32px"></div>
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