// api/gemini.js
// Google Gemini API 프록시

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });

  try {
    const { model, messages, prompt, max_tokens, temperature } = req.body;
    
    // Gemini API v1 사용 (안정 버전)
    const geminiModel = model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1/models/${geminiModel}:generateContent?key=${apiKey}`;

    // System prompt 추출 및 User prompt 구성 (messages 배열이 있는 경우)
    let systemInstruction = '';
    let userMessage = '';

    if (Array.isArray(messages)) {
      systemInstruction = messages.find(m => m.role === 'system')?.content || '';
      userMessage = messages.find(m => m.role === 'user')?.content || '';
    } else if (prompt) {
      userMessage = prompt;
    }

    if (!userMessage) {
      return res.status(400).json({ error: '요청 본문에 messages 또는 prompt가 필요합니다.' });
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }]
        }
      ],
      system_instruction: systemInstruction ? {
        parts: [{ text: systemInstruction }]
      } : undefined,
      generationConfig: {
        maxOutputTokens: max_tokens || 1000,
        temperature: temperature || 0.3,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
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
