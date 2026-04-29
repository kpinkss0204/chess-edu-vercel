// api/explorer.js
// Vercel 프록시: 브라우저 대신 서버에서 Lichess API 호출
// 토큰이 클라이언트에 노출되지 않음

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.LICHESS_TOKEN || '';
  const { db, ...rest } = req.query;

  if (!db || (db !== 'masters' && db !== 'lichess')) {
    return res.status(400).json({ error: 'db parameter must be masters or lichess' });
  }

  // 쿼리 파라미터 그대로 전달
  const params = new URLSearchParams(rest).toString();
  const lichessUrl = `https://explorer.lichess.ovh/${db}?${params}`;

  try {
    const headers = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const lichessRes = await fetch(lichessUrl, { headers });

    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.setHeader('Content-Type', 'application/json');
    res.status(lichessRes.status);

    const data = await lichessRes.text();
    res.send(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
