// ECO 오프닝 데이터베이스 (주요 오프닝 ~200개)
    // 형식: { moves: "UCI moves string", eco: "코드", name: "이름", variation: "변형" }
    const OPENING_DB = (function () {
      const raw = [
        // ── A: 비정규 오프닝 / 플랭크 오프닝 ──
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
        ["A12", "English Opening", "Caro-Kann Defensive System", "c2c4 c7c6 g1f3 d7d5"],
        ["A13", "English Opening", "", "c2c4 e7e6"],
        ["A15", "English Opening", "King's Indian", "c2c4 g8f6"],
        ["A16", "English Opening", "", "c2c4 g8f6 b1c3"],
        ["A17", "English Opening", "Hedgehog", "c2c4 g8f6 b1c3 e7e6"],
        ["A20", "English Opening", "Reversed Sicilian", "c2c4 e7e5"],
        ["A21", "English Opening", "Reversed Sicilian", "c2c4 e7e5 b1c3"],
        ["A22", "English Opening", "Bremen System", "c2c4 e7e5 g1f3"],
        ["A25", "English Opening", "Closed", "c2c4 e7e5 b1c3 b8c6"],
        ["A30", "English Opening", "Symmetrical", "c2c4 c7c5"],
        ["A31", "English Opening", "Symmetrical", "c2c4 c7c5 g1f3 g8f6"],
        ["A40", "Queen's Pawn", "", "d2d4"],
        ["A41", "Queen's Pawn", "", "d2d4 d7d6"],
        ["A43", "Queen's Pawn", "Benoni Defence", "d2d4 c7c5"],
        ["A45", "Queen's Pawn Game", "Trompowsky Attack", "d2d4 g8f6"],
        ["A46", "Queen's Pawn Game", "", "d2d4 g8f6 g1f3"],
        ["A48", "King's Indian", "", "d2d4 g8f6 g1f3 g7g6"],
        ["A50", "Queen's Pawn Game", "", "d2d4 g8f6 c2c4"],
        ["A51", "Budapest Gambit", "", "d2d4 g8f6 c2c4 e7e5"],
        ["A52", "Budapest Gambit", "Rubinstein Variation", "d2d4 g8f6 c2c4 e7e5 d4e5"],
        ["A57", "Benko Gambit", "", "d2d4 g8f6 c2c4 c7c5 d4d5 b7b5"],
        ["A60", "Modern Benoni", "", "d2d4 g8f6 c2c4 c7c5 d4d5 e7e6"],
        ["A80", "Dutch Defence", "", "d2d4 f7f5"],
        ["A81", "Dutch Defence", "", "d2d4 f7f5 g1f3"],
        ["A84", "Dutch Defence", "", "d2d4 f7f5 c2c4"],
        ["A85", "Dutch Defence", "", "d2d4 f7f5 c2c4 g8f6"],
        // ── B: 반개방 게임 ──
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
        ["B14", "Caro-Kann Defence", "Panov-Botvinnik Attack", "e2e4 c7c6 d2d4 d7d5 e4d5 c6d5 c2c4"],
        ["B15", "Caro-Kann Defence", "", "e2e4 c7c6 d2d4 d7d5 b1c3"],
        ["B17", "Caro-Kann Defence", "Steinitz Variation", "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 b8d7"],
        ["B18", "Caro-Kann Defence", "Classical Variation", "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5"],
        ["B20", "Sicilian Defence", "", "e2e4 c7c5"],
        ["B21", "Sicilian Defence", "Grand Prix Attack", "e2e4 c7c5 f2f4"],
        ["B22", "Sicilian Defence", "Alapin Variation", "e2e4 c7c5 c2c3"],
        ["B23", "Sicilian Defence", "Closed", "e2e4 c7c5 b1c3"],
        ["B27", "Sicilian Defence", "", "e2e4 c7c5 g1f3"],
        ["B30", "Sicilian Defence", "", "e2e4 c7c5 g1f3 b8c6"],
        ["B32", "Sicilian Defence", "", "e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 e7e5"],
        ["B40", "Sicilian Defence", "", "e2e4 c7c5 g1f3 e7e6"],
        ["B41", "Sicilian Defence", "Kan Variation", "e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 a7a6"],
        ["B42", "Sicilian Defence", "Kan Variation", "e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 a7a6 f1d3"],
        ["B43", "Sicilian Defence", "Kan Variation", "e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 a7a6 b1c3"],
        ["B44", "Sicilian Defence", "", "e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 b8c6"],
        ["B45", "Sicilian Defence", "Taimanov Variation", "e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 b8c6 b1c3"],
        ["B46", "Sicilian Defence", "Taimanov Variation", "e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 b8c6 b1c3 a7a6"],
        ["B48", "Sicilian Defence", "Taimanov-Paulsen", "e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 b8c6 b1c3 d8c7"],
        ["B50", "Sicilian Defence", "", "e2e4 c7c5 g1f3 d7d6"],
        ["B51", "Sicilian Defence", "Moscow Variation", "e2e4 c7c5 g1f3 d7d6 f1b5"],
        ["B52", "Sicilian Defence", "Moscow Variation", "e2e4 c7c5 g1f3 d7d6 f1b5 c8d7"],
        ["B54", "Sicilian Defence", "", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4"],
        ["B56", "Sicilian Defence", "", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3"],
        ["B57", "Sicilian Defence", "", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 b8c6"],
        ["B60", "Sicilian Defence", "Richter-Rauzer Attack", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 b8c6 c1g5"],
        ["B70", "Sicilian Defence", "Dragon Variation", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6"],
        ["B72", "Sicilian Defence", "Dragon Variation", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6 c1e3"],
        ["B76", "Sicilian Defence", "Dragon, Yugoslav Attack", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6 f2f3"],
        ["B78", "Sicilian Defence", "Dragon, Yugoslav Attack", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6 f2f3 c8g4"],
        ["B80", "Sicilian Defence", "Scheveningen Variation", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e6"],
        ["B81", "Sicilian Defence", "Scheveningen, Keres Attack", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e6 g2g4"],
        ["B85", "Sicilian Defence", "Scheveningen", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e6 f1e2 f8e7"],
        ["B86", "Sicilian Defence", "Sozin Attack", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e6 f1c4"],
        ["B90", "Sicilian Defence", "Najdorf Variation", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6"],
        ["B91", "Sicilian Defence", "Najdorf, Opovcensky Variation", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 g2g3"],
        ["B92", "Sicilian Defence", "Najdorf, Opovcensky Variation", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 f1e2"],
        ["B93", "Sicilian Defence", "Najdorf, 6.f4", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 f2f4"],
        ["B94", "Sicilian Defence", "Najdorf, 6.Bg5", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1g5"],
        ["B96", "Sicilian Defence", "Najdorf, Polugaevsky Variation", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1g5 e7e6"],
        ["B97", "Sicilian Defence", "Najdorf, Poisoned Pawn", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1g5 e7e6 f2f4 d8b6"],
        ["B99", "Sicilian Defence", "Najdorf, 7...Be7 Main Line", "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1g5 e7e6 f2f4 f8e7"],
        // ── C: 개방 게임 ──
        ["C00", "French Defence", "", "e2e4 e7e6"],
        ["C01", "French Defence", "Exchange Variation", "e2e4 e7e6 d2d4 d7d5 e4d5 e6d5"],
        ["C02", "French Defence", "Advance Variation", "e2e4 e7e6 d2d4 d7d5 e4e5"],
        ["C03", "French Defence", "Tarrasch Variation", "e2e4 e7e6 d2d4 d7d5 b1d2"],
        ["C05", "French Defence", "Tarrasch Variation", "e2e4 e7e6 d2d4 d7d5 b1d2 g8f6"],
        ["C06", "French Defence", "Tarrasch Variation", "e2e4 e7e6 d2d4 d7d5 b1d2 g8f6 e4e5"],
        ["C10", "French Defence", "", "e2e4 e7e6 d2d4 d7d5 b1c3"],
        ["C11", "French Defence", "Classical Variation", "e2e4 e7e6 d2d4 d7d5 b1c3 g8f6"],
        ["C14", "French Defence", "Classical Variation", "e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7"],
        ["C15", "French Defence", "Winawer Variation", "e2e4 e7e6 d2d4 d7d5 b1c3 f8b4"],
        ["C16", "French Defence", "Winawer Variation", "e2e4 e7e6 d2d4 d7d5 b1c3 f8b4 e4e5"],
        ["C20", "King's Pawn Game", "", "e2e4 e7e5"],
        ["C21", "Center Game", "", "e2e4 e7e5 d2d4 e5d4"],
        ["C22", "Center Game", "", "e2e4 e7e5 d2d4 e5d4 d1d4 b8c6"],
        ["C23", "Bishop's Opening", "", "e2e4 e7e5 f1c4"],
        ["C24", "Bishop's Opening", "Berlin Defence", "e2e4 e7e5 f1c4 g8f6"],
        ["C25", "Vienna Game", "", "e2e4 e7e5 b1c3"],
        ["C26", "Vienna Game", "", "e2e4 e7e5 b1c3 g8f6"],
        ["C27", "Vienna Game", "Frankenstein-Dracula Variation", "e2e4 e7e5 b1c3 g8f6 f1c4 f6e4"],
        ["C28", "Vienna Game", "", "e2e4 e7e5 b1c3 b8c6 f1c4"],
        ["C29", "Vienna Game", "Würzburger Trap", "e2e4 e7e5 b1c3 b8c6 f2f4"],
        ["C30", "King's Gambit", "", "e2e4 e7e5 f2f4"],
        ["C31", "King's Gambit Declined", "Falkbeer Counter Gambit", "e2e4 e7e5 f2f4 d7d5"],
        ["C33", "King's Gambit Accepted", "", "e2e4 e7e5 f2f4 e5f4"],
        ["C34", "King's Gambit Accepted", "Fischer Defence", "e2e4 e7e5 f2f4 e5f4 g1f3"],
        ["C36", "King's Gambit Accepted", "Modern Defence", "e2e4 e7e5 f2f4 e5f4 g1f3 d7d5"],
        ["C37", "King's Gambit Accepted", "Muzio Gambit", "e2e4 e7e5 f2f4 e5f4 g1f3 g7g5 f1c4"],
        ["C40", "King's Pawn Game", "Gunderam Defence", "e2e4 e7e5 g1f3 d8f6"],
        ["C41", "Philidor Defence", "", "e2e4 e7e5 g1f3 d7d6"],
        ["C42", "Petrov's Defence", "", "e2e4 e7e5 g1f3 g8f6"],
        ["C43", "Petrov's Defence", "Modern Attack", "e2e4 e7e5 g1f3 g8f6 d2d4"],
        ["C44", "King's Pawn Game", "", "e2e4 e7e5 g1f3 b8c6"],
        ["C45", "Scotch Game", "", "e2e4 e7e5 g1f3 b8c6 d2d4"],
        ["C46", "Three Knights Game", "", "e2e4 e7e5 g1f3 b8c6 b1c3"],
        ["C47", "Four Knights Game", "", "e2e4 e7e5 g1f3 b8c6 b1c3 g8f6"],
        ["C48", "Four Knights Game", "", "e2e4 e7e5 g1f3 b8c6 b1c3 g8f6 f1b5"],
        ["C50", "Italian Game", "", "e2e4 e7e5 g1f3 b8c6 f1c4"],
        ["C51", "Evans Gambit", "", "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 b2b4"],
        ["C52", "Evans Gambit", "", "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 b2b4 c5b4"],
        ["C53", "Italian Game", "Classical Variation", "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3"],
        ["C54", "Italian Game", "", "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6"],
        ["C55", "Two Knights Defence", "", "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6"],
        ["C56", "Two Knights Defence", "", "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d4"],
        ["C57", "Two Knights Defence", "Fried Liver Attack", "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5"],
        ["C58", "Two Knights Defence", "", "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5"],
        ["C60", "Ruy Lopez (Spanish Game)", "", "e2e4 e7e5 g1f3 b8c6 f1b5"],
        ["C61", "Ruy Lopez", "Bird's Defence", "e2e4 e7e5 g1f3 b8c6 f1b5 b8d4"],
        ["C62", "Ruy Lopez", "Old Steinitz Defence", "e2e4 e7e5 g1f3 b8c6 f1b5 d7d6"],
        ["C63", "Ruy Lopez", "Schliemann Defence", "e2e4 e7e5 g1f3 b8c6 f1b5 f7f5"],
        ["C64", "Ruy Lopez", "Classical Defence", "e2e4 e7e5 g1f3 b8c6 f1b5 f8c5"],
        ["C65", "Ruy Lopez", "Berlin Defence", "e2e4 e7e5 g1f3 b8c6 f1b5 g8f6"],
        ["C66", "Ruy Lopez", "Berlin Defence", "e2e4 e7e5 g1f3 b8c6 f1b5 g8f6 d2d3"],
        ["C67", "Ruy Lopez", "Berlin Defence, Rio Gambit Accepted", "e2e4 e7e5 g1f3 b8c6 f1b5 g8f6 e1g1 f6e4"],
        ["C68", "Ruy Lopez", "Exchange Variation", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5c6"],
        ["C70", "Ruy Lopez", "", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6"],
        ["C71", "Ruy Lopez", "Modern Steinitz Defence", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 d7d6"],
        ["C72", "Ruy Lopez", "Modern Steinitz Defence", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 d7d6 e1g1"],
        ["C78", "Ruy Lopez", "", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 g8f6 e1g1"],
        ["C80", "Ruy Lopez", "Open Variation", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 g8f6 e1g1 f6e4"],
        ["C84", "Ruy Lopez", "Closed", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 g8f6 e1g1 f8e7"],
        ["C87", "Ruy Lopez", "Closed", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 g8f6 e1g1 f8e7 d2d3"],
        ["C88", "Ruy Lopez", "Closed", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 g8f6 e1g1 f8e7 h1e1 b7b5"],
        ["C89", "Ruy Lopez", "Marshall Attack", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 g8f6 e1g1 f8e7 h1e1 b7b5 a4b3 e8g8 c2c3 d7d5"],
        ["C90", "Ruy Lopez", "Closed", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 g8f6 e1g1 f8e7 h1e1 b7b5 a4b3 d7d6"],
        ["C91", "Ruy Lopez", "Closed", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 g8f6 e1g1 f8e7 h1e1 b7b5 a4b3 d7d6 c2c3"],
        ["C95", "Ruy Lopez", "Closed, Breyer Defence", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 g8f6 e1g1 f8e7 h1e1 b7b5 a4b3 d7d6 c2c3 e8g8 h2h3 b8d7"],
        ["C96", "Ruy Lopez", "Closed", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 f1a4 g8f6 e1g1 f8e7 h1e1 b7b5 a4b3 d7d6 c2c3 e8g8 h2h3"],
        // ── D: 퀸즈 갬빗 ──
        ["D00", "Queen's Pawn Game", "", "d2d4 d7d5"],
        ["D01", "Richter-Veresov Attack", "", "d2d4 d7d5 b1c3 g8f6 c1g5"],
        ["D02", "Queen's Pawn Game", "", "d2d4 d7d5 g1f3"],
        ["D04", "Queen's Pawn Game", "", "d2d4 d7d5 g1f3 g8f6"],
        ["D05", "Queen's Pawn Game", "Stonewall Variation", "d2d4 d7d5 g1f3 g8f6 e2e3"],
        ["D06", "Queen's Gambit", "", "d2d4 d7d5 c2c4"],
        ["D07", "Queen's Gambit Declined", "Chigorin Defence", "d2d4 d7d5 c2c4 b8c6"],
        ["D08", "Queen's Gambit Declined", "Albin Counter-Gambit", "d2d4 d7d5 c2c4 e7e5"],
        ["D10", "Queen's Gambit Declined", "Slav Defence", "d2d4 d7d5 c2c4 c7c6"],
        ["D11", "Queen's Gambit Declined", "Slav Defence", "d2d4 d7d5 c2c4 c7c6 g1f3"],
        ["D12", "Slav Defence", "", "d2d4 d7d5 c2c4 c7c6 g1f3 g8f6 e2e3 c8f5"],
        ["D14", "Slav Defence", "Exchange Variation", "d2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4 a2a4 c8f5 e2e3 e7e6 f1c4 c8b4 e1g1"],
        ["D15", "Slav Defence", "", "d2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3"],
        ["D17", "Slav Defence", "Czech Variation", "d2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4 a2a4 c8f5 g1h4"],
        ["D20", "Queen's Gambit Accepted", "", "d2d4 d7d5 c2c4 d5c4"],
        ["D21", "Queen's Gambit Accepted", "", "d2d4 d7d5 c2c4 d5c4 g1f3"],
        ["D27", "Queen's Gambit Accepted", "Classical Variation", "d2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3 e7e6 f1c4 c7c5"],
        ["D30", "Queen's Gambit Declined", "", "d2d4 d7d5 c2c4 e7e6"],
        ["D31", "Queen's Gambit Declined", "", "d2d4 d7d5 c2c4 e7e6 b1c3"],
        ["D32", "Queen's Gambit Declined", "Tarrasch Defence", "d2d4 d7d5 c2c4 e7e6 b1c3 c7c5"],
        ["D34", "Queen's Gambit Declined", "Tarrasch Defence", "d2d4 d7d5 c2c4 e7e6 b1c3 c7c5 c4d5 e6d5 g1f3 b8c6 g2g3"],
        ["D35", "Queen's Gambit Declined", "", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6"],
        ["D37", "Queen's Gambit Declined", "", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3"],
        ["D38", "Queen's Gambit Declined", "Ragozin Variation", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3 f8b4"],
        ["D40", "Queen's Gambit Declined", "Semi-Tarrasch", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3 c7c5"],
        ["D41", "Queen's Gambit Declined", "Semi-Tarrasch", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3 c7c5 c4d5"],
        ["D43", "Semi-Slav Defence", "", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3 c7c6"],
        ["D44", "Semi-Slav Defence", "", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3 c7c6 c1g5"],
        ["D45", "Semi-Slav Defence", "", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3 c7c6 e2e3"],
        ["D46", "Semi-Slav Defence", "", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3 c7c6 e2e3 b8d7"],
        ["D50", "Queen's Gambit Declined", "", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5"],
        ["D51", "Queen's Gambit Declined", "", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 b8d7"],
        ["D52", "Queen's Gambit Declined", "", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 b8d7 e2e3 c7c6"],
        ["D53", "Queen's Gambit Declined", "", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7"],
        ["D56", "Queen's Gambit Declined", "", "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8 g1f3 h7h6"],
        ["D70", "Grünfeld Defence", "", "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5"],
        ["D71", "Grünfeld Defence", "", "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5"],
        ["D72", "Grünfeld Defence", "Neo-Grünfeld", "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 g2g3"],
        ["D80", "Grünfeld Defence", "", "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c1g5"],
        ["D85", "Grünfeld Defence", "Exchange Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5 e2e4 d5c3 b2c3 f8g7"],
        ["D86", "Grünfeld Defence", "Exchange Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5 e2e4 d5c3 b2c3 f8g7 f1c4"],
        ["D87", "Grünfeld Defence", "Exchange Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5 e2e4 d5c3 b2c3 f8g7 f1c4 c7c5 g1e2"],
        ["D90", "Grünfeld Defence", "", "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 g1f3"],
        // ── E: 인도 방어 ──
        ["E00", "Queen's Pawn Game", "Catalan Opening", "d2d4 g8f6 c2c4 e7e6"],
        ["E01", "Catalan Opening", "", "d2d4 g8f6 c2c4 e7e6 g2g3"],
        ["E02", "Catalan Opening", "Open Defence", "d2d4 g8f6 c2c4 e7e6 g2g3 d7d5 f1g2 d5c4"],
        ["E06", "Catalan Opening", "Closed", "d2d4 g8f6 c2c4 e7e6 g2g3 d7d5 f1g2 f8e7 g1f3"],
        ["E10", "Queen's Indian", "", "d2d4 g8f6 c2c4 e7e6 g1f3 c7c5"],
        ["E11", "Bogo-Indian Defence", "", "d2d4 g8f6 c2c4 e7e6 g1f3 f8b4"],
        ["E12", "Queen's Indian Defence", "", "d2d4 g8f6 c2c4 e7e6 g1f3 b7b6"],
        ["E14", "Queen's Indian Defence", "", "d2d4 g8f6 c2c4 e7e6 g1f3 b7b6 e2e3"],
        ["E15", "Queen's Indian Defence", "", "d2d4 g8f6 c2c4 e7e6 g1f3 b7b6 g2g3"],
        ["E20", "Nimzo-Indian Defence", "", "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4"],
        ["E21", "Nimzo-Indian Defence", "", "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 g1f3"],
        ["E23", "Nimzo-Indian Defence", "Spielmann Variation", "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 d1b3"],
        ["E24", "Nimzo-Indian Defence", "Sämisch Variation", "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 a2a3"],
        ["E32", "Nimzo-Indian Defence", "Classical Variation", "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 d1c2"],
        ["E40", "Nimzo-Indian Defence", "", "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3"],
        ["E41", "Nimzo-Indian Defence", "", "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 c7c5"],
        ["E43", "Nimzo-Indian Defence", "Fischer Variation", "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 b7b6"],
        ["E46", "Nimzo-Indian Defence", "", "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 e8g8"],
        ["E60", "King's Indian Defence", "", "d2d4 g8f6 c2c4 g7g6"],
        ["E61", "King's Indian Defence", "", "d2d4 g8f6 c2c4 g7g6 b1c3"],
        ["E62", "King's Indian Defence", "Fianchetto Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 g1f3 e8g8 g2g3"],
        ["E70", "King's Indian Defence", "", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4"],
        ["E72", "King's Indian Defence", "", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g2g3"],
        ["E73", "King's Indian Defence", "", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 f1e2"],
        ["E76", "King's Indian Defence", "Four Pawns Attack", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 f2f4"],
        ["E80", "King's Indian Defence", "Sämisch Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 f2f3"],
        ["E84", "King's Indian Defence", "Sämisch Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 f2f3 b8c6 c1e3 e8g8 d1d2"],
        ["E86", "King's Indian Defence", "Sämisch Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 f2f3 e8g8 c1e3 c7c6"],
        ["E90", "King's Indian Defence", "", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3"],
        ["E91", "King's Indian Defence", "Classical Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8 f1e2"],
        ["E92", "King's Indian Defence", "Classical Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8 f1e2 e7e5"],
        ["E97", "King's Indian Defence", "Mar del Plata Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8 f1e2 e7e5 e1g1 b8c6 d4d5 c6e7 g1h1 f6e8 f2f3"],
        ["E99", "King's Indian Defence", "Orthodox Variation", "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8 f1e2 e7e5 e1g1 b8c6 d4d5 c6e7 g1h1 f6e8 f2f3 f7f5"],
      ];

      // 트라이 구조로 변환: moveString -> {eco, name, variation}
      // 수가 많은 것 우선(더 구체적인 오프닝)
      const sorted = raw.slice().sort((a, b) => {
        const la = a[3].split(' ').length, lb = b[3].split(' ').length;
        return lb - la;
      });
      const map = new Map();
      for (const [eco, name, variation, moves] of sorted) {
        const key = moves.trim();
        if (!map.has(key)) map.set(key, { eco, name, variation });
      }
      return map;
    })();

    // 현재 게임의 UCI 수 배열을 받아 오프닝을 감지
    function detectOpening(uciMoves) {
      // 길이가 긴 것부터 매칭 시도
      for (let len = uciMoves.length; len >= 1; len--) {
        const key = uciMoves.slice(0, len).join(' ');
        if (OPENING_DB.has(key)) return OPENING_DB.get(key);
      }
      return null;
    }

    // 오프닝 배지 업데이트 (game.js에서 매 수 후 호출됨)
    function updateOpeningBadge(uciMoves) {
      const badge = document.getElementById('opening-badge');
      const ecoEl = document.getElementById('opening-eco');
      const nameEl = document.getElementById('opening-name');
      const varEl = document.getElementById('opening-variation');
      if (!badge) return;

      // 오프닝 감지는 처음 ~20수까지만 의미 있음
      const movesToCheck = uciMoves ? uciMoves.slice(0, 20) : [];
      const op = movesToCheck.length > 0 ? detectOpening(movesToCheck) : null;

      if (op) {
        badge.classList.remove('hidden');
        ecoEl.textContent = op.eco;
        nameEl.textContent = op.name;
        if (op.variation) {
          varEl.textContent = op.variation;
          badge.classList.add('has-variation');
        } else {
          varEl.textContent = '';
          badge.classList.remove('has-variation');
        }
        // PGN 탭 오프닝 필드도 동기화
        const infoOpening = document.getElementById('info-opening');
        if (infoOpening) infoOpening.textContent = op.eco + ' ' + op.name + (op.variation ? ', ' + op.variation : '');
      } else {
        badge.classList.add('hidden');
        const infoOpening = document.getElementById('info-opening');
        if (infoOpening && movesToCheck.length === 0) infoOpening.textContent = '-';
      }
    }

    // game.js 로드 완료 후 ChessGame.prototype.renderMoveList를 패치해
    // 매번 기보가 갱신될 때 오프닝 배지를 업데이트한다.
    // game.history[i].move = { from:[r,c], to:[r,c], promoPiece? }
    // game.historyIndex = 현재 보고 있는 수 인덱스 (-1 = 시작)
    (function patchGameWhenReady() {
      const FILES = 'abcdefgh';

      function getOpeningFromGame(g) {
        if (!g || !g.history) return null;
        const endIdx = g.historyIndex >= 0 ? g.historyIndex : g.history.length - 1;
        // 최대 20수까지만 체크
        const limit = Math.min(endIdx + 1, 20);
        const uciArr = [];
        for (let i = 0; i < limit; i++) {
          const s = g.history[i];
          if (!s || !s.move) break;
          const m = s.move;
          const from = FILES[m.from[1]] + (8 - m.from[0]);
          const to = FILES[m.to[1]] + (8 - m.to[0]);
          uciArr.push(from + to + (m.promoPiece ? m.promoPiece.toLowerCase() : ''));
        }
        return detectOpening(uciArr);
      }

      function tryPatch() {
        // ChessGame 클래스가 정의되고 game 인스턴스가 생성됐을 때 패치
        if (typeof ChessGame === 'undefined') { setTimeout(tryPatch, 200); return; }

        const origRender = ChessGame.prototype.renderMoveList;
        if (!origRender || origRender._openingPatched) return;

        ChessGame.prototype.renderMoveList = function () {
          origRender.apply(this, arguments);
          try {
            const op = getOpeningFromGame(this);
            const badge = document.getElementById('opening-badge');
            const ecoEl = document.getElementById('opening-eco');
            const nameEl = document.getElementById('opening-name');
            const varEl = document.getElementById('opening-variation');
            if (!badge) return;

            if (op) {
              badge.classList.remove('hidden');
              ecoEl.textContent = op.eco;
              nameEl.textContent = op.name;
              if (op.variation) {
                varEl.textContent = op.variation;
                badge.classList.add('has-variation');
              } else {
                varEl.textContent = '';
                badge.classList.remove('has-variation');
              }
              // PGN 탭 오프닝 필드 동기화
              const infoOpening = document.getElementById('info-opening');
              if (infoOpening) {
                infoOpening.textContent = op.eco + ' ' + op.name + (op.variation ? ', ' + op.variation : '');
              }
            } else {
              badge.classList.add('hidden');
            }
          } catch (e) { }
        };
        ChessGame.prototype.renderMoveList._openingPatched = true;
      }

      // 스크립트가 game.js보다 먼저 로드될 수 있으므로 DOMContentLoaded 이후 시도
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryPatch);
      } else {
        tryPatch();
      }
    })();

/* --- script block --- */

// ── 오버레이 모드: 'threat' | 'best' | 'off' ──────────────────
    let _overlayMode = 'off';   // 기본: off (버튼 클릭 시 활성화)

    // ── 위협 분석 상태 ────────────────────────────────────────────
    let _threatWorker = null;    // 위협 전용 별도 Worker
    let _threatWorkerReady = false;
    let _threatWorkerBooting = false; // readyok 전 중복 new Worker 방지
    let _threatAnalysisId = 0;
    let _currentThreatUci = null; // 가장 최근 위협 수 (UCI)
    let _lastThreatFen = '';   // 마지막 위협 분석한 FEN
    let _threatPending = null; // Worker 미준비 시 다음 분석 대기 FEN
    // Stockfish WASM: 이전 go가 끝나기 전 연속 UCI는 null function 크래시 유발 → 메인 엔진과 같이 직렬화
    let _threatSearching = false;
    let _threatPendingNextFen = null; // 검색 중 새 요청이 오면 bestmove 후 이 FEN으로 go
    let _threatIgnoreInfo = false;   // stop 직후 옛 info 라인 무시

    // ── FEN Null-Move 변환 ────────────────────────────────────────
    // "현재 플레이어 턴을 건너뛰고 상대방에게 2연타 기회를 준다"
    // 체크 상태면 null을 반환 (위협 분석 불가)
    function buildNullMoveFen(fen) {
      const parts = fen.trim().split(' ');
      if (parts.length < 4) return null;

      const board = parts[0];
      const turn = parts[1];
      const castling = parts[2];
      // en-passant는 null-move 후 무효화
      const halfMove = parseInt(parts[4] || '0') + 1;
      const fullMove = turn === 'b' ? parseInt(parts[5] || '1') + 1 : parseInt(parts[5] || '1');

      // 체크 상태 확인: parseFenBoard + isInCheck 사용 (chess.js)
      try {
        const b = parseFenBoard(board);
        if (b && isInCheck(b, turn)) return null; // 체크 중이면 위협 분석 불가
      } catch (e) { }

      const newTurn = turn === 'w' ? 'b' : 'w';
      return `${board} ${newTurn} ${castling} - ${halfMove} ${fullMove}`;
    }

    // ── 위협 전용 Worker 초기화 ───────────────────────────────────
    async function initThreatWorker() {
      if (_threatWorker || _threatWorkerBooting) return;
      _threatWorkerBooting = true;
      try {
        const url = await getStockfishBlobUrl();
        const w = new Worker(url);
        let ready = false;
        w.onmessage = (e) => {
          const line = typeof e.data === 'string' ? e.data.trim() : '';
          if (!line) return;
          if (!ready) {
            if (line.includes('uciok')) {
              w.postMessage('setoption name Threads value 1');
              w.postMessage('setoption name Hash value 16');
              w.postMessage('setoption name UCI_AnalyseMode value true');
              w.postMessage('isready');
            } else if (line.includes('readyok')) {
              ready = true;
              _threatWorkerReady = true;
              _threatWorker = w;
              _threatWorkerBooting = false;
              console.log('[ThreatWorker] 준비 완료');
              // 대기 중인 분석 즉시 실행
              if (_threatPending) {
                const f = _threatPending; _threatPending = null;
                _runThreatAnalysis(f);
              }
            }
          } else {
            _handleThreatWorkerMsg(line);
          }
        };
        w.onerror = (e) => {
          _threatWorkerBooting = false;
          console.warn('[ThreatWorker] 오류:', e.message);
        };
        setTimeout(() => w.postMessage('uci'), 200);
      } catch (e) {
        _threatWorkerBooting = false;
        console.warn('[ThreatWorker] 초기화 실패:', e.message);
      }
    }

    // ── 위협 Worker 메시지 처리 ───────────────────────────────────
    let _threatBestMove = null;
    let _threatMyId = 0;

    function _handleThreatWorkerMsg(line) {
      // stop 직후 도착하는 이전 검색의 info는 무시 (잘못된 화살표 + WASM 부하 방지)
      if (_threatIgnoreInfo && line.startsWith('info')) return;

      // info 라인에서 중간 bestmove 추출 (더 빠른 표시)
      if (line.startsWith('info') && line.includes(' pv ')) {
        const pvMatch = line.match(/ pv (\S+)/);
        if (pvMatch && _threatMyId === _threatAnalysisId) {
          const uci = pvMatch[1];
          if (uci && uci !== '(none)' && uci.length >= 4) {
            _currentThreatUci = uci;
            _drawOverlay();
          }
        }
      }
      if (line.startsWith('bestmove')) {
        _threatIgnoreInfo = false;
        const m = line.match(/^bestmove (\S+)/);
        const uci = (m && m[1] !== '(none)') ? m[1] : null;
        const chainFen = _threatPendingNextFen;
        if (chainFen) _threatPendingNextFen = null;

        // 중단된 검색의 bestmove는 UI에 반영하지 않음
        if (!chainFen && _threatMyId === _threatAnalysisId) {
          _currentThreatUci = uci;
          _drawOverlay();
        }

        if (chainFen) {
          _threatFlushThreatGo(chainFen);
        } else {
          _threatSearching = false;
        }
      }
    }

    function _threatFlushThreatGo(nullFen) {
      if (!_threatWorker) return;
      _threatSearching = true;
      _threatIgnoreInfo = false;
      _threatWorker.postMessage('setoption name MultiPV value 1');
      _threatWorker.postMessage(`position fen ${nullFen}`);
      _threatWorker.postMessage('go depth 12 movetime 500');
    }

    // ── 위협 분석 실행 ────────────────────────────────────────────
    function _runThreatAnalysis(nullFen) {
      if (!_threatWorkerReady || !_threatWorker) {
        _threatPending = nullFen;
        return;
      }
      _threatAnalysisId++;
      _threatMyId = _threatAnalysisId;
      _currentThreatUci = null;

      if (_threatSearching) {
        _threatPendingNextFen = nullFen;
        _threatIgnoreInfo = true;
        _threatWorker.postMessage('stop');
        return;
      }
      _threatPendingNextFen = null;
      _threatFlushThreatGo(nullFen);
    }

    // ── FEN 변경 감지 → 위협 분석 트리거 ─────────────────────────
    function triggerThreatIfNeeded(fen) {
      if (!fen || fen === _lastThreatFen) return;
      _lastThreatFen = fen;
      _currentThreatUci = null;

      if (_overlayMode !== 'threat') return;

      const nullFen = buildNullMoveFen(fen);
      if (!nullFen) {
        // 체크 중 → 위협 표시 불가, 오버레이 클리어
        clearBoardOverlay();
        return;
      }
      _runThreatAnalysis(nullFen);
    }

    // ═══════════════════════════════════════════════════════════════
    // SVG 오버레이 그리기
    // ═══════════════════════════════════════════════════════════════
    function _isFlipped() {
      return (typeof game !== 'undefined' && game.flipped) ? true : false;
    }

    // ── 좌표 계산 (viewBox 800×800, 칸 하나 = 100×100) ──────────
    // UCI file(0~7=a~h), rank(1~8) → SVG 중심 픽셀 좌표
    function _uciSqToSVG(file, rank1to8) {
      const flipped = _isFlipped();
      // 정규 방향: file=0(a) → SVG col=0, rank=8 → SVG row=0
      const col = flipped ? (7 - file) : file;
      const row = flipped ? (rank1to8 - 1) : (8 - rank1to8);
      // 칸 중앙 (각 칸 100×100)
      return { px: col * 100 + 50, py: row * 100 + 50, col, row };
    }

    function _parseUci(uci) {
      if (!uci || uci.length < 4) return null;
      const FILES = 'abcdefgh';
      const ff = FILES.indexOf(uci[0]), fr = parseInt(uci[1]);
      const tf = FILES.indexOf(uci[2]), tr = parseInt(uci[3]);
      if (ff < 0 || tf < 0 || isNaN(fr) || isNaN(tr)) return null;
      return { ff, fr, tf, tr };
    }

    // ── SVG 화살표 생성 ──────────────────────────────────────────
    // from/to: { px, py }  sw: stroke-width(px)
    function _makeSVGArrow(from, to, color, markerId, sw) {
      const dx = to.px - from.px, dy = to.py - from.py;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return null;

      const ux = dx / len, uy = dy / len;

      // 출발: 기물 중심에서 조금 떨어져서 시작
      const startOffset = 22;
      // 도착: strokeWidth 기반 마커(refX=2.5 * sw)만큼 뒤로 당김
      const arrowHeadLen = (sw || 14) * 2.5;
      const endOffset = arrowHeadLen;

      const sx = from.px + ux * startOffset;
      const sy = from.py + uy * startOffset;
      const ex = to.px - ux * endOffset;
      const ey = to.py - uy * endOffset;

      // 선이 너무 짧으면 스킵
      const segLen = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
      if (segLen < 5) return null;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', sx.toFixed(2)); line.setAttribute('y1', sy.toFixed(2));
      line.setAttribute('x2', ex.toFixed(2)); line.setAttribute('y2', ey.toFixed(2));
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', sw || 14);
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('marker-end', `url(#${markerId})`);
      return line;
    }

    // ── 칸 하이라이트 생성 ────────────────────────────────────────
    function _makeSVGHighlight(col, row, fill, opacity) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', col * 100);
      rect.setAttribute('y', row * 100);
      rect.setAttribute('width', 100);
      rect.setAttribute('height', 100);
      rect.setAttribute('fill', fill);
      rect.setAttribute('fill-opacity', opacity);
      return rect;
    }

    function clearBoardOverlay() {
      const hl = document.getElementById('svg-highlights');
      const ar = document.getElementById('svg-arrows');
      if (hl) hl.innerHTML = '';
      if (ar) ar.innerHTML = '';
    }

    function _drawOverlay() {
      const hlEl = document.getElementById('svg-highlights');
      const arEl = document.getElementById('svg-arrows');
      if (!hlEl || !arEl) return;
      hlEl.innerHTML = ''; arEl.innerHTML = '';

      if (_overlayMode === 'off') return;

      if (_overlayMode === 'threat') {
        _drawThreatArrow(hlEl, arEl);
      } else if (_overlayMode === 'best') {
        _drawBestArrows(hlEl, arEl);
      }
    }

    // ── 위협 화살표 (빨간) ────────────────────────────────────────
    function _drawThreatArrow(hlEl, arEl) {
      if (!_currentThreatUci) return;
      const c = _parseUci(_currentThreatUci);
      if (!c) return;

      const from = _uciSqToSVG(c.ff, c.fr);
      const to = _uciSqToSVG(c.tf, c.tr);

      // 하이라이트 (출발·도착 칸)
      const fhl = _makeSVGHighlight(from.col, from.row, 'rgba(220,55,55,0.45)', 0.45);
      const thl = _makeSVGHighlight(to.col, to.row, 'rgba(220,55,55,0.28)', 0.28);
      if (fhl) hlEl.appendChild(fhl);
      if (thl) hlEl.appendChild(thl);

      // 화살표 (sw=14px, 칸 100px 기준)
      const arrow = _makeSVGArrow(from, to, 'rgba(220,55,55,0.95)', 'arr-threat', 14);
      if (arrow) arEl.appendChild(arrow);
    }

    // ── 최선수 화살표 (파랑 + 보조 초록) ─────────────────────────
    function _drawBestArrows(hlEl, arEl) {
      if (typeof pvData === 'undefined') return;

      [
        [1, 'rgba(70,130,200,0.95)', 'arr-best', 14, 'rgba(70,130,200,0.45)', 0.45],
        [2, 'rgba(100,160,60,0.85)', 'arr-alt', 11, 'rgba(100,160,60,0.28)', 0.28],
        [3, 'rgba(140,150,50,0.6)', 'arr-alt', 8, null, 0],
      ].forEach(([pvIdx, color, markerId, sw, hlColor, hlOp]) => {
        const pv = pvData[pvIdx];
        if (!pv || !pv.pv || !pv.pv[0]) return;
        const c = _parseUci(pv.pv[0]);
        if (!c) return;
        const from = _uciSqToSVG(c.ff, c.fr);
        const to = _uciSqToSVG(c.tf, c.tr);
        if (hlColor) {
          const fhl = _makeSVGHighlight(from.col, from.row, hlColor, hlOp);
          const thl = _makeSVGHighlight(to.col, to.row, hlColor, hlOp * 0.6);
          if (fhl) hlEl.appendChild(fhl);
          if (thl) hlEl.appendChild(thl);
        }
        const arrow = _makeSVGArrow(from, to, color, markerId, sw);
        if (arrow) arEl.appendChild(arrow);
      });
    }

    // ── 오버레이 모드 전환 ────────────────────────────────────────
    function setOverlayMode(mode) {
      // 같은 버튼 재클릭 → off 토글
      if (_overlayMode === mode) {
        _overlayMode = 'off';
      } else {
        _overlayMode = mode;
      }

      // 버튼 스타일 동기화
      const tBtn = document.getElementById('threat-overlay-btn');
      const bBtn = document.getElementById('best-overlay-btn');
      if (tBtn) { tBtn.classList.toggle('active-threat', _overlayMode === 'threat'); }
      if (bBtn) { bBtn.classList.toggle('active-best', _overlayMode === 'best'); }

      if (_overlayMode === 'off') {
        clearBoardOverlay();
        return;
      }

      if (_overlayMode === 'threat') {
        // 위협 Worker 초기화 (아직 안 됐으면)
        if (!_threatWorker && !_threatWorkerReady) {
          initThreatWorker();
        }
        // 현재 FEN으로 즉시 위협 분석
        const fen = _getCurrentFen();
        if (fen) { _lastThreatFen = ''; triggerThreatIfNeeded(fen); }
      } else if (_overlayMode === 'best') {
        _drawOverlay();
      }
    }

    function _getCurrentFen() {
      try {
        if (typeof game !== 'undefined' && game.board) {
          return boardToFen(game.board, game.turn, game.castling, game.enPassant,
            game.halfMove || 0, game.fullMove || 1);
        }
      } catch (e) { }
      return null;
    }

    // ── renderTopMoves 패치: 최선수 오버레이 갱신 + 위협 트리거 ──
    (function patchRenderTopMoves() {
      function tryPatch() {
        if (typeof renderTopMoves === 'undefined') { setTimeout(tryPatch, 300); return; }
        if (renderTopMoves._overlayPatched) return;
        const _orig = renderTopMoves;
        window.renderTopMoves = function () {
          _orig.apply(this, arguments);
          try {
            if (_overlayMode === 'best') _drawOverlay();
            else if (_overlayMode === 'threat') {
              // FEN 변경 감지
              const fen = _getCurrentFen();
              if (fen) triggerThreatIfNeeded(fen);
            }
          } catch (e) { }
        };
        window.renderTopMoves._overlayPatched = true;
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryPatch);
      else tryPatch();
    })();

    // ── ChessGame.renderBoard 패치: 보드 갱신(뒤집기 포함) 시 재렌더 ──
    (function patchRenderBoard() {
      function tryPatch() {
        if (typeof ChessGame === 'undefined') { setTimeout(tryPatch, 300); return; }
        const _orig = ChessGame.prototype.renderBoard;
        if (!_orig || _orig._overlayPatched) return;
        ChessGame.prototype.renderBoard = function () {
          _orig.apply(this, arguments);
          try {
            if (_overlayMode === 'threat') {
              const fen = _getCurrentFen();
              if (fen) { _lastThreatFen = ''; triggerThreatIfNeeded(fen); }
            } else {
              _drawOverlay();
            }
          } catch (e) { }
        };
        ChessGame.prototype.renderBoard._overlayPatched = true;
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryPatch);
      else tryPatch();
    })();

    // ── 초기 위협 Worker 로드 (엔진 초기화 후) ───────────────────
    // engine.js 로드 완료 후 실행되도록 window.onload 사용
    window.addEventListener('load', () => {
      // 위협 버튼 초기 상태: active-threat 클래스 제거 (off 상태와 동기화)
      const tBtn = document.getElementById('threat-overlay-btn');
      if (tBtn) tBtn.classList.remove('active-threat');

      // 엔진 초기화 대기 후 위협 모드 자동 활성화
      function tryActivateThreat(attempts) {
        if (typeof getStockfishBlobUrl === 'function') {
          // 위협 모드 자동 ON
          _overlayMode = 'threat';
          if (tBtn) tBtn.classList.add('active-threat');
          initThreatWorker();
          // 현재 FEN으로 즉시 분석 요청
          setTimeout(() => {
            const fen = _getCurrentFen();
            if (fen) { _lastThreatFen = ''; triggerThreatIfNeeded(fen); }
          }, 500);
        } else if (attempts > 0) {
          setTimeout(() => tryActivateThreat(attempts - 1), 500);
        }
      }
      setTimeout(() => tryActivateThreat(20), 1000);
    });

/* --- script block --- */

// ── coach.js의 openCoach / closeCoach를 패치해 #main.coach-open도 같이 토글 ──
    (function patchCoach() {
      function tryPatch() {
        if (typeof openCoach !== 'function' || typeof closeCoach !== 'function') {
          setTimeout(tryPatch, 100);
          return;
        }
        const _origOpen = openCoach;
        const _origClose = closeCoach;

        window.openCoach = function () {
          if (window.innerWidth <= 768) {
            // 모바일: 드로우를 열고 'coach' 탭으로 전환
            if (typeof toggleMobilePanel === 'function') toggleMobilePanel(true);
            if (typeof switchTab === 'function') switchTab('coach');
            _origOpen.apply(this, arguments);
            return;
          }
          _origOpen.apply(this, arguments);
          const mainEl = document.getElementById('main');
          const boardEl = document.getElementById('board-area');
          if (mainEl) mainEl.classList.add('coach-open');
          if (boardEl) boardEl.classList.add('coach-open');
          // #coach-panel 열기
          const panel = document.getElementById('coach-panel');
          if (panel) panel.classList.add('open');
          // 버튼 active
          const btn = document.getElementById('coach-open-btn');
          if (btn) btn.classList.add('active');
        };

        window.closeCoach = function () {
          if (window.innerWidth <= 768) {
            if (typeof toggleMobilePanel === 'function') toggleMobilePanel(false);
            _origClose.apply(this, arguments);
            return;
          }
          _origClose.apply(this, arguments);
          const mainEl = document.getElementById('main');
          const boardEl = document.getElementById('board-area');
          if (mainEl) mainEl.classList.remove('coach-open');
          if (boardEl) boardEl.classList.remove('coach-open');
          // #coach-panel 닫기
          const panel = document.getElementById('coach-panel');
          if (panel) panel.classList.remove('open');
          // 버튼 비활성
          const btn = document.getElementById('coach-open-btn');
          if (btn) btn.classList.remove('active');
        };

        // toggleCoachPanel도 새 함수에 연결
        window.toggleCoachPanel = function () {
          if (window.innerWidth <= 768) {
            const rp = document.getElementById('right-panel');
            if (rp && rp.classList.contains('mobile-open')) {
              if (typeof toggleMobilePanel === 'function') toggleMobilePanel(false);
            } else {
              window.openCoach();
            }
            return;
          }
          const panel = document.getElementById('coach-panel');
          if (panel && panel.classList.contains('open')) {
            window.closeCoach();
          } else {
            window.openCoach();
          }
        };
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryPatch);
      } else {
        tryPatch();
      }
    })();

    // ── API 키 동기화 및 관리 ──
    window.syncApiKey = function(val) {
      const mainInput = document.getElementById('coach-api-input');
      const tabInput = document.getElementById('coach-api-input-tab');
      if (mainInput) mainInput.value = val;
      if (tabInput) tabInput.value = val;
    };

    (function initApiKeySync() {
      function apply() {
        const savedKey = localStorage.getItem('groq_api_key');
        if (savedKey) {
          window.syncApiKey(savedKey);
        }
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
      else apply();
    })();

    // ── 모바일에서 AI코치 탭 버튼 표시 ──
    (function showMobileCoachTab() {
      function apply() {
        const btn = document.getElementById('tab-btn-coach-mobile');
        if (!btn) return;
        if (window.innerWidth <= 768) {
          btn.style.display = '';
        } else {
          btn.style.display = 'none';
        }
        // 저장된 API 키 로드
        const savedKey = localStorage.getItem('groq_api_key');
        if (savedKey) {
          const mobileInput = document.getElementById('coach-api-input-mobile');
          if (mobileInput) mobileInput.value = savedKey;
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
      } else {
        apply();
      }
      window.addEventListener('resize', apply);
    })();

    // ── 모바일 코치 API 저장 ──
    function saveMobileApiKey() {
      const input = document.getElementById('coach-api-input-mobile');
      const status = document.getElementById('coach-key-status-mobile');
      if (!input) return;
      const key = input.value.trim();
      if (!key) { if (status) status.textContent = '키를 입력해주세요.'; return; }
      localStorage.setItem('groq_api_key', key);
      // 데스크탑 coach-api-input도 동기화
      const desktopInput = document.getElementById('coach-api-input');
      if (desktopInput) desktopInput.value = key;
      if (status) { status.textContent = '✓ 저장됨'; status.style.color = 'var(--accent-green-bright)'; }
      // coach.js의 saveApiKey도 호출 시도
      if (typeof saveApiKey === 'function') saveApiKey();
    }

    // ── 미리 정의 질문 버튼 핸들러 ──
    function setCoachQuestion(text) {
      const input = document.getElementById('coach-input');
      if (input) {
        input.value = text;
        input.focus();
        // 코치 패널이 닫혀있으면 열기
        if (typeof openCoach === 'function' && !coachOpen) openCoach();
      }
    }

    function setCoachQuestionMobile(text) {
      const input = document.getElementById('coach-input-mobile');
      if (input) {
        input.value = text;
        input.focus();
      }
    }

    // ── 모바일 코치 질문 ──
    async function askCoachMobile() {
      const inputEl = document.getElementById('coach-input-mobile');
      const responseEl = document.getElementById('coach-response-mobile');
      const btnEl = document.getElementById('coach-ask-btn-mobile');
      if (!inputEl || !responseEl) return;

      const question = inputEl.value.trim();
      if (!question) return;

      // API 키 동기화
      const apiKeyInput = document.getElementById('coach-api-input-mobile');
      if (apiKeyInput && apiKeyInput.value.trim()) {
        localStorage.setItem('groq_api_key', apiKeyInput.value.trim());
        const desktopInput = document.getElementById('coach-api-input');
        if (desktopInput) desktopInput.value = apiKeyInput.value.trim();
      }

      // 데스크탑 coach textarea에 내용 복사해서 askCoach() 위임
      const desktopInput2 = document.getElementById('coach-input');
      const desktopResponse = document.getElementById('coach-response');
      if (desktopInput2 && typeof askCoach === 'function') {
        desktopInput2.value = question;
        responseEl.style.display = 'block';
        responseEl.innerHTML = '<span style="color:var(--text-muted);font-style:italic;">🧠 분석 중...</span>';
        if (btnEl) { btnEl.disabled = true; }

        // desktopResponse를 모바일로 미러링하는 MutationObserver
        let observer = null;
        if (desktopResponse) {
          observer = new MutationObserver(() => {
            responseEl.innerHTML = desktopResponse.innerHTML;
            responseEl.style.display = 'block';
          });
          observer.observe(desktopResponse, { childList: true, subtree: true, characterData: true, attributes: true });
        }

        askCoach();

        // 3초 후 observer 정리 + 버튼 재활성
        setTimeout(() => {
          if (observer) observer.disconnect();
          if (btnEl) { btnEl.disabled = false; }
          if (desktopResponse) responseEl.innerHTML = desktopResponse.innerHTML;
          inputEl.value = '';
        }, 15000);
      } else {
        responseEl.style.display = 'block';
        responseEl.textContent = 'coach.js가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.';
      }
    }

/* --- script block --- */

// ══════════════════════════════════════════════════════
    //  우클릭 화살표 그리기
    // ══════════════════════════════════════════════════════
    (function () {
      const ARROW_COLOR = 'rgba(255, 165, 0, 0.92)';
      const ARROW_SW = 14;
      const MARKER_ID = 'user-arrow-svg-head';
      const SVG_NS = 'http://www.w3.org/2000/svg';

      let _arrowStart = null;   // 우클릭 시작 칸 { col, row }
      let _userArrows = [];     // 그려진 화살표 목록
      let _rightDragging = false; // 우클릭 드래그 중 여부

      // ── SVG 오버레이 확보 ──────────────────────────────
      function ensureSvg() {
        // 기존 board-svg-overlay 재사용 (chess-wasm-fixed 전용)
        const existingSvg = document.getElementById('board-svg-overlay');
        if (existingSvg) {
          if (!document.getElementById('user-arrow-svg-arrows')) {
            let defs = existingSvg.querySelector('defs');
            if (!defs) { defs = document.createElementNS(SVG_NS, 'defs'); existingSvg.prepend(defs); }
            if (!document.getElementById(MARKER_ID)) {
              const mk = document.createElementNS(SVG_NS, 'marker');
              mk.setAttribute('id', MARKER_ID);
              mk.setAttribute('markerUnits', 'strokeWidth');
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
          }
          // SVG가 클릭 이벤트를 막으면 안 됨
          existingSvg.style.pointerEvents = 'none';
          return existingSvg;
        }

        // fallback: 직접 SVG 생성
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
        svg.style.pointerEvents = 'none';

        const defs = document.createElementNS(SVG_NS, 'defs');
        const mk = document.createElementNS(SVG_NS, 'marker');
        mk.setAttribute('id', MARKER_ID);
        mk.setAttribute('markerUnits', 'strokeWidth');
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

      // ── 좌표 계산 ──────────────────────────────────────
      function sqCenter(col, row) {
        return { px: col * 100 + 50, py: row * 100 + 50 };
      }

      // 마우스 위치 → 보드 칸 (보드 밖이면 경계 칸으로 클램프)
      function getBoardSquare(e) {
        const board = document.getElementById('chessboard');
        if (!board) return null;
        const rect = board.getBoundingClientRect();
        // 보드 바깥이면 null 대신 경계 칸으로 클램프 (드래그 중 보드 밖으로 빠져도 OK)
        const x = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height - 1, e.clientY - rect.top));
        return {
          col: Math.floor(x / rect.width * 8),
          row: Math.floor(y / rect.height * 8)
        };
      }

      // 마우스가 실제로 보드 위에 있는지
      function isOverBoard(e) {
        const board = document.getElementById('chessboard');
        if (!board) return false;
        const rect = board.getBoundingClientRect();
        return e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom;
      }

      // ── 화살표 그리기 ──────────────────────────────────
      function makeArrow(fromCol, fromRow, toCol, toRow) {
        const from = sqCenter(fromCol, fromRow);
        const to = sqCenter(toCol, toRow);
        const dx = to.px - from.px, dy = to.py - from.py;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return null;
        const ux = dx / len, uy = dy / len;
        const sw = ARROW_SW;
        const sx = from.px + ux * sw * 1.1;
        const sy = from.py + uy * sw * 1.1;
        const ex = to.px - ux * sw * 2.4;
        const ey = to.py - uy * sw * 2.4;
        if (Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2) < 5) return null;
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

      // ── 이벤트 연결 ────────────────────────────────────
      function attachEvents() {
        const board = document.getElementById('chessboard');
        if (!board) { setTimeout(attachEvents, 300); return; }
        ensureSvg();

        // 우클릭 시작: 시작 칸 기억
        board.addEventListener('contextmenu', function (e) {
          e.preventDefault();
        });

        board.addEventListener('mousedown', function (e) {
          if (e.button === 2) {
            // 우클릭 드래그 시작
            _rightDragging = true;
            _arrowStart = getBoardSquare(e);
          } else if (e.button === 0) {
            // 좌클릭: 화살표 초기화
            _userArrows = [];
            redrawArrows();
            _arrowStart = null;
            _rightDragging = false;
          }
        });

        // mouseup은 document에 등록 → 보드 밖에서 떼도 잡힘
        document.addEventListener('mouseup', function (e) {
          if (e.button !== 2) return;
          if (!_rightDragging || !_arrowStart) {
            _rightDragging = false;
            _arrowStart = null;
            return;
          }
          _rightDragging = false;

          const sq = getBoardSquare(e);

          // 시작 칸 == 끝 칸: 화살표 전체 초기화
          if (sq.col === _arrowStart.col && sq.row === _arrowStart.row) {
            _userArrows = [];
          } else {
            // 같은 화살표 재클릭 → 토글 제거, 아니면 추가
            const idx = _userArrows.findIndex(a =>
              a.fromCol === _arrowStart.col && a.fromRow === _arrowStart.row &&
              a.toCol === sq.col && a.toRow === sq.row
            );
            if (idx >= 0) _userArrows.splice(idx, 1);
            else _userArrows.push({
              fromCol: _arrowStart.col, fromRow: _arrowStart.row,
              toCol: sq.col, toRow: sq.row
            });
          }

          ensureSvg();
          redrawArrows();
          _arrowStart = null;
        });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachEvents);
      } else {
        attachEvents();
      }

      // coach.js가 후보수 화살표에 접근할 수 있도록 window에 노출
      Object.defineProperty(window, '_userArrows', {
        get: function () { return _userArrows; },
        configurable: true,
      });
    })();

/* --- script block --- */

const SF_ANA_DEPTH = typeof LICHESS_SF_DEPTH !== 'undefined' ? LICHESS_SF_DEPTH : 18;

    let _sfAnalysisBusy = false;
    let _autoGameAnalysisTimer = null;
    let _lastAutoAnalyzedPgnKey = '';

    function resetAutoGameAnalysisCache() {
      _lastAutoAnalyzedPgnKey = '';
    }
    window.resetAutoGameAnalysisCache = resetAutoGameAnalysisCache;

    function scheduleAutoGameAnalysis() {
      // [수동 분석으로 전환: 자동 분석 예약 비활성화]
      return;
      // if (_autoGameAnalysisTimer) clearTimeout(_autoGameAnalysisTimer);
      // _autoGameAnalysisTimer = setTimeout(function () { runAutoGameAnalysisIfNeeded(); }, 1200);
    }
    window.scheduleAutoGameAnalysis = scheduleAutoGameAnalysis;

    async function runAutoGameAnalysisIfNeeded() {
      if (!game || !game.history || game.history.length < 2) return;
      if (typeof AnalysisCache !== 'undefined' && AnalysisCache.isGamePreAnalyzed(game)) return;
      const pgn = typeof game.generatePgn === 'function' ? game.generatePgn() : '';
      const key = pgn + '|' + (document.getElementById('sf-color-select')?.value || 'w');
      if (key === _lastAutoAnalyzedPgnKey || _sfAnalysisBusy) return;
      await analyzeCurrentGameWithSF({ silent: true });
    }

    function markAutoGameAnalysisDone(pgn, myColor) {
      _lastAutoAnalyzedPgnKey = (pgn || '') + '|' + (myColor || 'w');
    }
    window.markAutoGameAnalysisDone = markAutoGameAnalysisDone;

    async function analyzeCurrentGameWithSF(opts) {
      opts = opts || {};
      if (_sfAnalysisBusy) return;
      if (typeof AnalysisCache !== 'undefined' && AnalysisCache.isGamePreAnalyzed(game)) return;
      if (!game || !game.history || game.history.length < 2) {
        if (!opts.silent && typeof showToast === 'function') showToast('수가 너무 짧습니다 (최소 2수 이상).');
        return;
      }
      if (typeof stockfishEvalStates !== 'function' || typeof parsePgnToStates !== 'function') {
        if (!opts.silent && typeof showToast === 'function') showToast('분석 모듈을 불러올 수 없습니다.');
        return;
      }

      const myColor = document.getElementById('sf-color-select')?.value || 'w';
      const statusEl = document.getElementById('sf-analysis-status');
      const resultEl = document.getElementById('sf-analysis-result');
      const depthBadge = document.getElementById('sf-analysis-depth-badge');
      const CT = typeof ChessTactics !== 'undefined' ? ChessTactics : null;

      function setStatus(html) {
        if (!statusEl) return;
        statusEl.style.display = 'block';
        statusEl.innerHTML = html;
      }

      _sfAnalysisBusy = true;
      if (resultEl) resultEl.style.display = 'none';
      if (depthBadge) depthBadge.textContent = '';

      const pgn = typeof game.generatePgn === 'function' ? game.generatePgn() : '';
      const states = parsePgnToStates(pgn);
      if (states.length < 2) {
        setStatus('<span style="color:#e07070">❌ 기보를 해석할 수 없습니다.</span>');
        _sfAnalysisBusy = false;
        return;
      }
      const total = states.length;

      setStatus(`<span style="color:var(--text-secondary)">⏳ [1단계] Stockfish 수 평가… (0 / ${total})</span>`);

      const { evalRows, error } = await stockfishEvalStates(states, {
        depth: SF_ANA_DEPTH,
        onProgress: (cur, tot) => {
          setStatus(
            `<span style="color:var(--text-secondary)">⏳ 분석 중… (${cur} / ${tot})</span>` +
            `<div style="margin-top:6px;height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden;">` +
            `<div style="height:100%;width:${Math.round((cur - 1) / tot * 100)}%;background:var(--accent-green-bright);border-radius:2px;transition:width .3s;"></div></div>`
          );
        },
      });

      if (error) {
        setStatus(`<span style="color:#e07070">❌ Stockfish Worker 초기화 실패: ${error.message}</span>`);
        _sfAnalysisBusy = false;
        return;
      }

      const myAccuracy = gameAccuracyFromEvals(evalRows, myColor);
      const j = summarizeMoveJudgments(evalRows, states, myColor);
      const myBlunders = j.myBlunders, myMistakes = j.myMistakes, myInaccuracies = j.myInaccuracies;
      const oppBlunders = j.oppBlunders, oppMistakes = j.oppMistakes, oppInaccuracies = j.oppInaccuracies;

      let grammarCalls = 0;
      for (const row of j.byPly) {
        if (game.history[row.plyIndex]) {
          game.history[row.plyIndex].annotation = row.cls || null;
          game.history[row.plyIndex].tactics = null;
        }
      }

      if (CT && typeof CT.detectTacticsGame === 'function') {
        setStatus('<span style="color:var(--text-secondary)">⏳ [2단계] 전술 분석 (ChessGrammar)…</span>');
        try {
          // 게임 전체 전술 분석을 한 번에 가져옴 (모든 수 분석 지원)
          const gameTacticsMap = await CT.detectTacticsGame(pgn, { mode: 'available', depth: 'l2' });
          if (gameTacticsMap) {
            for (let i = 1; i < states.length; i++) {
              const move = states[i].move;
              if (!move) continue;
              const uci = (moveToUci(move) || '').toLowerCase();
              
              // ply i-1에서 uci를 두어 발생하는 전술 확인
              const availableTactics = gameTacticsMap[i - 1];
              const playedTList = (availableTactics && availableTactics.raw) ? 
                                  availableTactics.raw.filter(t => t.trigger_move === uci) : [];
              
              if (playedTList.length > 0) {
                const tactics = CT.parseTacticList(playedTList);
                if (game.history[i - 1]) game.history[i - 1].tactics = tactics;
                grammarCalls++;
              }
            }
          }
        } catch (e) {
          console.warn('[analyze] Game Grammar Error:', e.message);
          // 폴백: 개별 분석 (단, 모든 수 분석 시 속도 및 요율 제한 주의)
          // 여기서는 게임 분석 시 실패하면 통과하도록 함
        }
      } else if (CT && typeof CT.analyzeMoveWorkflow === 'function') {
        setStatus('<span style="color:var(--text-secondary)">⏳ [2단계] 전술 분석 (ChessGrammar)…</span>');
        for (let i = 1; i < states.length; i++) {
          const afterFen = CT.snapshotFromState(states[i]);
          if (!afterFen) continue;
          try {
            const wf = await CT.analyzeMoveWorkflow(evalRows[i - 1].cpw, evalRows[i].cpw, states[i - 1].turn, afterFen);
            if (wf && wf.grammarCalled) grammarCalls++;
            if (game.history[i - 1]) game.history[i - 1].tactics = wf ? wf.tactics : null;
          } catch (e) { console.warn('[analyze] Grammar', i, e.message); }
        }
      }

      if (typeof game.renderMoveList === 'function') game.renderMoveList();

      _lastAutoAnalyzedPgnKey = pgn + '|' + myColor;

      setStatus(
        `<span style="color:var(--accent-green-bright)">✅ 자동 분석 완료 — 깊이 ${SF_ANA_DEPTH}` +
        (grammarCalls ? ` · Grammar ${grammarCalls}수` : '') + `</span>`
      );
      if (depthBadge) depthBadge.textContent = `깊이 ${SF_ANA_DEPTH}`;

      const STAT_COLOR = { blunder: '#cc3333', mistake: '#e08c3a', inaccuracy: '#f6c94a' };

      let statsHtml = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px;">`;
      const myStats = [['블런더 ??', myBlunders, 'blunder'], ['실수 ?', myMistakes, 'mistake'], ['부정확 ?!', myInaccuracies, 'inaccuracy']];
      for (const [label, count, key] of myStats) {
        statsHtml += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:5px 4px;text-align:center;">
          <div style="font-size:9px;font-weight:800;color:${STAT_COLOR[key]};">나 · ${label}</div>
          <div style="font-size:13px;font-weight:700;color:var(--text-primary);">${count}</div>
        </div>`;
      }
      statsHtml += `</div>`;

      let oppHtml = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px;">`;
      const oppStats = [['블런더', oppBlunders, 'blunder'], ['실수', oppMistakes, 'mistake'], ['부정확', oppInaccuracies, 'inaccuracy']];
      for (const [label, count, key] of oppStats) {
        oppHtml += `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:5px 4px;text-align:center;">
          <div style="font-size:9px;font-weight:800;color:${STAT_COLOR[key]};opacity:.7;">상대 · ${label}</div>
          <div style="font-size:13px;font-weight:700;color:var(--text-primary);">${count}</div>
        </div>`;
      }
      oppHtml += `</div>`;

      const accColor = myAccuracy >= 85 ? 'var(--accent-green-bright)' : myAccuracy >= 70 ? '#e0b040' : '#e07070';
      const accHtml = myAccuracy > 0
        ? `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:8px 12px;display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:11px;color:var(--text-muted);">내 정확도</span>
            <span style="font-size:16px;font-weight:900;color:${accColor};">${myAccuracy}%</span>
          </div>` : '';

      if (resultEl) {
        resultEl.style.display = 'block';
        resultEl.innerHTML = accHtml + statsHtml + oppHtml;
      }

      _sfAnalysisBusy = false;
    }

    window.analyzeCurrentGameWithSF = analyzeCurrentGameWithSF;
    window.runSfAnalysis = analyzeCurrentGameWithSF; // Alias for body.html button compatibility

    document.addEventListener('DOMContentLoaded', function () {
      const colorSel = document.getElementById('sf-color-select');
      if (colorSel) {
        colorSel.addEventListener('change', function () {
          _lastAutoAnalyzedPgnKey = '';
          scheduleAutoGameAnalysis();
        });
      }
    });

/* --- script block --- */

// ── 퍼즐 "분석으로 보기": ?fen= 파라미터 로드는 game.js 끝의 자동 실행 블록이 담당.
// tryInitEndgamePractice 래퍼는 엔드게임 연습 전용으로만 유지.
(function () {
  var _origTryInitEndgame = window.tryInitEndgamePractice;
  window.tryInitEndgamePractice = function () {
    if (typeof _origTryInitEndgame === 'function') _origTryInitEndgame();
  };
})();