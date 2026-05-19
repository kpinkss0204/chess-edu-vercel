# Chess Edu - 통합 체스 교육 및 대국 플랫폼

**Chess Edu**는 체스 입문자부터 숙련자까지 모두를 위한 웹 기반 통합 교육 플랫폼입니다.

## 기술 스택

- **Frontend**: React 19, React Router 7, Vite 6
- **체스 엔진/로직**: `public/chess-wasm-fixed/`
- **Backend**: Firebase (인증·DB), Vercel Serverless API (`api/`)
- **Engine**: Stockfish 18 (WASM, `public/stockfish/`)
- **배포**: Vercel (GitHub push 시 자동 배포)

## 프로젝트 구조

```
chess_education/
├── index.html              # Vite 진입점
├── package.json
├── vite.config.js
├── vercel.json
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/LegacyPage.jsx
│   ├── legacy/pages/       # 페이지별 UI·스크립트
│   └── lib/
├── public/                 # 정적 에셋 (Vite → dist 복사)
│   ├── chess-wasm-fixed/
│   ├── stockfish/
│   ├── auth-check.js
│   └── theme-ui.css
└── api/                    # Vercel 서버리스 API
```

## 라우트

| 경로 | 설명 |
|------|------|
| `/` | 분석 보드 |
| `/play` | 온라인 대국 |
| `/puzzle` | 퍼즐 |
| `/records` | 기록·통계 |
| `/opening-explorer` | 오프닝 탐색기 |
| `/study` | 학습 허브 |
| `/study-opening` | 오프닝 학습 |
| `/study-endgame` | 엔드게임 학습 |
| `/practice` | 엔진 연습 |
| `/auth` | 로그인 |

## 시작하기

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 생성
npm run preview
```

## 배포 (Vercel)

GitHub에 push하면 Vercel이 `npm run build` 후 `dist/`를 배포합니다.  
환경 변수(`GEMINI_API_KEY`, `GROQ_API_KEY` 등)는 Vercel 대시보드에서 설정하세요.

## 페이지 수정

UI·텍스트·인라인 로직은 `src/legacy/pages/<페이지>/` 아래 파일을 직접 수정합니다.

- `body.html` — 마크업
- `styles.css` — 페이지 스타일
- `inline.js` — 인라인 스크립트
- `meta.json` — 외부 스크립트·CSS 목록
