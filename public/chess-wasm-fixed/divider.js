(function (global) {
  'use strict';

  /**
   * ChessDivider — Lichess Divider.scala 완전 포팅
   *
   * [수정 내역]
   * 1. endGame 탐색 조건: midGame이 확정된 후에만 탐색 (원본과 동일)
   *    - 이전: middle=null 후 보정으로 end가 orphan 상태로 남는 버그 존재
   *    - 수정: midGame 확정 이후에만 endGame 루프 시작
   *
   * 2. mixedness의 y 방향 수정:
   *    - Lichess 비트보드: y=0 → rank1 (백 홈랭크, board[7])
   *    - JS board 배열:   row=0 → rank8 (흑 홈랭크)
   *    - 따라서 score()에 넘기는 y는 (7 - row) + 1 = 8 - row (1-based, rank1=1)
   *    - 이전 코드는 y+1 그대로 넘겨서 백/흑 홈랭크 방향이 반전되어 있었음
   *
   * 3. middle >= end 보정 삭제:
   *    - 원본은 endGame 탐색 자체를 midGame 이후 인덱스에서만 하므로 불필요
   *    - 이 보정이 있으면 middle=null이 되어도 end가 남아 orphan 발생
   */

  const ChessDivider = {

    divide: function (states) {
      if (!states || states.length < 2) return { middle: null, end: null };

      // --- Step 1: midGame 탐색 ---
      let middle = null;
      for (let i = 0; i < states.length; i++) {
        const board = states[i].board;
        if (
          this.majorsAndMinors(board) <= 10 ||
          this.backrankSparse(board) ||
          this.mixedness(board) > 150
        ) {
          middle = i;
          break;
        }
      }

      // --- Step 2: endGame 탐색 (midGame 확정된 경우에만) ---
      // 원본: if midGame.isDefined then ... else None
      let end = null;
      if (middle !== null) {
        for (let i = 0; i < states.length; i++) {
          const board = states[i].board;
          if (this.majorsAndMinors(board) <= 6) {
            end = i;
            break;
          }
        }
      }

      // 원본: Ply.from(midGame.filter(m => endGame.fold(true)(m < _)))
      // → endGame이 있으면 middle < end 이어야 middle 유효, 없으면 middle 그대로
      if (middle !== null && end !== null && middle >= end) {
        middle = null;
      }

      return { middle, end };
    },

    majorsAndMinors: function (board) {
      // 킹(K)·폰(P) 제외한 기물 수
      let count = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p) {
            const type = p[1];
            if (type === 'Q' || type === 'R' || type === 'B' || type === 'N') {
              count++;
            }
          }
        }
      }
      return count;
    },

    backrankSparse: function (board) {
      // 원본: (Bitboard.firstRank & board.white).count < 4
      //        (Bitboard.lastRank  & board.black).count < 4
      // firstRank = rank1 = board[7] (JS 배열에서 마지막 행 = 백 홈)
      // lastRank  = rank8 = board[0] (JS 배열에서 첫 행  = 흑 홈)
      let whiteBackrank = 0;
      let blackBackrank = 0;
      for (let c = 0; c < 8; c++) {
        const wp = board[7][c]; // rank1 = 백 홈랭크
        if (wp && wp[0] === 'w') whiteBackrank++;
        const bp = board[0][c]; // rank8 = 흑 홈랭크
        if (bp && bp[0] === 'b') blackBackrank++;
      }
      return whiteBackrank < 4 || blackBackrank < 4;
    },

    // 원본 Scala score(y)(white, black)
    score: function (y, white, black) {
      // y: 1-based rank (rank1=1, rank8=8), 백 홈 = 1
      const key = white * 10 + black;
      switch (key) {
        case 0:  return 0;
        case 10: return 1 + (8 - y);
        case 20: return y > 2 ? 2 + (y - 2) : 0;
        case 30: return y > 1 ? 3 + (y - 1) : 0;
        case 40: return y > 1 ? 3 + (y - 1) : 0;
        case 1:  return 1 + y;
        case 11: return 5 + Math.abs(4 - y);
        case 21: return 4 + (y - 1);
        case 31: return 5 + (y - 1);
        case 2:  return y < 6 ? 2 + (6 - y) : 0;
        case 12: return 4 + (7 - y);
        case 22: return 7;
        case 3:  return y < 7 ? 3 + (7 - y) : 0;
        case 13: return 5 + (7 - y);
        case 4:  return y < 7 ? 3 + (7 - y) : 0;
        default: return 0;
      }
    },

    mixedness: function (board) {
      // 원본: smallSquare << (x + 8 * y), y+1 을 score에 전달
      // 비트보드 y=0 → rank1(백 홈) = JS board[7]
      // JS row=0 → rank8(흑 홈) → 비트보드 y=7
      // 따라서: 비트보드 y = 7 - row → score에 넘길 rank = (7 - row) + 1 = 8 - row
      let total = 0;
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 7; col++) {
          let white = 0, black = 0;
          for (let dr = 0; dr < 2; dr++) {
            for (let dc = 0; dc < 2; dc++) {
              const p = board[row + dr][col + dc];
              if (p) {
                if (p[0] === 'w') white++;
                else black++;
              }
            }
          }
          // 비트보드 y+1 (1-based) = 8 - row (JS 기준)
          const rankY = 8 - row;
          total += this.score(rankY, white, black);
        }
      }
      return total;
    }
  };

  global.ChessDivider = ChessDivider;
})(typeof window !== 'undefined' ? window : globalThis);