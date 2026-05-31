// api/gemini.js
// Google Gemini API 프록시

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });

  try {
    const { model, messages, prompt, max_tokens, temperature } = req.body;
    
    // Gemini API v1 사용
    const geminiModel = model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1/models/${geminiModel}:generateContent?key=${apiKey}`;

    console.log('[API Proxy] Requesting URL:', url); // 디버깅용 로그

    // ... (이하 동일)
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[API Proxy] Error response:', data); // 디버깅용 로그
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API 오류' });
    }

    // OpenAI/Groq 호환 포맷으로 변환하여 반환
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({
      choices: [{ message: { content } }]
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
