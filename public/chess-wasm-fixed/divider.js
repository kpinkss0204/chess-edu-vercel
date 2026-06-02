/**
 * Lichess Divider.scala logic ported to JavaScript.
 * Determines Opening, Middlegame, and Endgame phases.
 */
(function (global) {
  'use strict';

  const ChessDivider = {
    /**
     * @param {Array} states - Array of game states from parsePgnToStates
     * @returns {Object} { middle: plyIndex|null, end: plyIndex|null }
     */
    divide: function (states) {
      if (!states || states.length < 2) return { middle: null, end: null };

      let middle = null;
      let end = null;

      for (let i = 0; i < states.length; i++) {
        const board = states[i].board;
        const ply = i; // 0-based ply

        if (middle === null) {
          if (this.isMiddleGame(board)) {
            middle = ply;
          }
        } else if (end === null) {
          if (this.isEndGame(board)) {
            end = ply;
          }
        }
      }

      return { middle, end };
    },

    isMiddleGame: function (board) {
      return (
        this.majorsAndMinors(board) <= 10 ||
        this.backrankSparse(board) ||
        this.mixedness(board) > 150
      );
    },

    isEndGame: function (board) {
      return this.majorsAndMinors(board) <= 6;
    },

    majorsAndMinors: function (board) {
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
      let whiteBackrank = 0;
      let blackBackrank = 0;

      // Rank 1 is board[7]
      for (let c = 0; c < 8; c++) {
        const p = board[7][c];
        if (p && p[0] === 'w') whiteBackrank++;
      }

      // Rank 8 is board[0]
      for (let c = 0; c < 8; c++) {
        const p = board[0][c];
        if (p && p[0] === 'b') blackBackrank++;
      }

      return whiteBackrank < 4 || blackBackrank < 4;
    },

    mixedness: function (board) {
      let totalScore = 0;
      // Scan 7x7 positions for 2x2 areas
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          let white = 0;
          let black = 0;
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const p = board[y + dy][x + dx];
              if (p) {
                if (p[0] === 'w') white++;
                else black++;
              }
            }
          }
          totalScore += this.score(white, black, y);
        }
      }
      return totalScore;
    },

    score: function (white, black, y) {
      if (white === 0 || black === 0) return 0;
      if (white === 1 && black === 1) {
        // y is 0-6. Scala y < 2 || y > 5 corresponds to Rank 8,7 or 2,1.
        // In our board[r][c], r=0,1 are Rank 8,7. r=6,7 are Rank 2,1.
        // So y < 2 (r=0,1,2) or y > 4 (r=5,6,7)
        if (y < 2 || y > 4) return 75;
        return 150;
      }
      return 250;
    }
  };

  global.ChessDivider = ChessDivider;
})(typeof window !== 'undefined' ? window : globalThis);
