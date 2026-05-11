// api/lichess-proxy.js
// Vercel Serverless Function — Lichess API CORS 프록시
// 클라이언트 → /api/lichess-proxy?path=... → lichess.org API → 클라이언트
//
// 지원 엔드포인트:
//   POST /api/lichess-proxy?path=import          → lichess.org/api/import
//   POST /api/lichess-proxy?path=request-analysis → lichess.org/api/analysis/{gameId}
//   GET  /api/lichess-proxy?path=export&id={id}  → lichess.org/game/export/{id}?evals=true&accuracy=true

export default async function handler(req, res) {
  // CORS 헤더 — chess-education.vercel.app 및 localhost 허용
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://chess-education.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
  ];
  if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://chess-education.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const token = process.env.LICHESS_TOKEN || '';
  if (!token) {
    return res.status(500).json({ error: 'LICHESS_TOKEN 환경변수가 설정되지 않았습니다.' });
  }

  const { path, id } = req.query;

  try {
    // ── 1) PGN import → 게임 ID 반환 ──────────────────────────
    if (path === 'import' && req.method === 'POST') {
      const body = req.body; // Vercel이 자동으로 파싱
      const pgn = typeof body === 'object' ? body.pgn : body;

      const form = new URLSearchParams();
      form.append('pgn', pgn);

      const lichessRes = await fetch('https://lichess.org/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`,
        },
        body: form.toString(),
      });

      const data = await lichessRes.json();
      res.setHeader('Cache-Control', 'no-store');
      return res.status(lichessRes.status).json(data);
    }

    // ── 2) 분석 요청 → Lichess 서버 분석 시작 ─────────────────
    if (path === 'request-analysis' && req.method === 'POST') {
      if (!id) return res.status(400).json({ error: 'id 파라미터 필요' });

      const lichessRes = await fetch(`https://lichess.org/api/analysis/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      res.setHeader('Cache-Control', 'no-store');
      // 200 or 304 등 — body가 없을 수 있음
      if (lichessRes.status === 200) {
        try {
          const data = await lichessRes.json();
          return res.status(200).json(data);
        } catch {
          return res.status(200).json({ ok: true });
        }
      }
      return res.status(lichessRes.status).json({ ok: false, status: lichessRes.status });
    }

    // ── 3) 분석 결과 export (PGN with evals) ──────────────────
    if (path === 'export' && req.method === 'GET') {
      if (!id) return res.status(400).json({ error: 'id 파라미터 필요' });

      const exportUrl = `https://lichess.org/game/export/${id}?evals=true&accuracy=true&clocks=false&opening=false&literate=false`;
      const lichessRes = await fetch(exportUrl, {
        headers: {
          'Accept': 'application/x-chess-pgn',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!lichessRes.ok) {
        return res.status(lichessRes.status).json({ error: `export 실패: ${lichessRes.status}` });
      }

      const pgnText = await lichessRes.text();
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/x-chess-pgn');
      return res.status(200).send(pgnText);
    }

    return res.status(400).json({ error: `알 수 없는 path: ${path}` });

  } catch (err) {
    console.error('[lichess-proxy]', err);
    return res.status(500).json({ error: err.message });
  }
}
