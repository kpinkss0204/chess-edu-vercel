// api/gemini.js
// Google Gemini API 프록시

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });

  try {
    const { model, messages, prompt, max_tokens, temperature } = req.body;
    
    // Gemini API v1beta 사용 (gemini-1.5-flash 이상 모델은 v1beta에서 지원)
    const geminiModel = model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

    console.log('[API Proxy] Requesting URL:', url); // 디버깅용 로그

    // System prompt 추출 및 User prompt 구성 (최대 호환성을 위해 하나로 합침)
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

    // 시스템 지침을 유저 메시지 앞에 추가하여 모든 API 버전에서 호환되도록 구성
    const combinedPrompt = systemInstruction 
      ? `System Instructions:
${systemInstruction}

User Message:
${userMessage}`
      : userMessage;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: combinedPrompt }]
        }
      ],
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