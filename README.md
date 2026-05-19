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

## JavaScript 파일 역할 및 데이터 흐름

이 프로젝트의 핵심 로직은 React 외부의 정적 JS 파일들에서 수행됩니다.

### 1. Engine & Logic (`public/chess-wasm-fixed/`)

| 파일 | 역할 | 주요 정보 전달 대상 |
|------|------|------|
| `engine.js` | Stockfish 엔진 인스턴스 관리, UCI 통신 | `ui.js` (분석 결과 전달), `stockfish-shared-worker.js` (엔진 명령 전달) |
| `ui.js` | 체스 보드 UI 렌더링, 사용자 입력 처리 | `engine.js` (분석 요청), `game.js` (보드 상태 전달) |
| `game.js` | 게임 상태 관리, 보드 기물 배치, 이동 검증 | `engine.js`, `ui.js` (보드 상태 공유) |
| `chess-tactics.js` | 전술 기하학 분석 (포크, 핀 등 탐지) | `ui.js`, `coach.js` (전술 정보 알림) |
| `lichess-judgment.js` | 엔진 평가치 기반 수 등급 분류 (블런더 등) | `ui.js` (분석 결과 표기) |
| `coach.js` | 전술 분석 및 힌트 제공 | `ui.js` (힌트 렌더링) |
| `parse-pgn-states.js` | PGN 데이터 파싱 및 포지션 스냅샷 생성 | `game.js`, `inline.js` (기보 파싱 결과 전달) |

### 2. UI & Interaction (`src/legacy/pages/`)

| 파일 | 역할 | 주요 정보 전달 대상 |
|------|------|------|
| `inline.js` | 페이지별 인라인 UI 로직 (기보 분석, 퍼즐 로직 등) | `engine.js`, `Firebase DB` (분석 결과 저장) |
| `module.js` | 페이지별 인증/모듈 초기화 | `auth-check.js`, `Firebase Auth` |

### 3. Shared & Libs (`public/`, `src/lib/`)

| 파일 | 역할 | 주요 정보 전달 대상 |
|------|------|------|
| `auth-check.js` | 전역 Firebase 인증 상태 관리, 페이지 보호 | 모든 페이지 (`window` 객체 통해 사용자 정보 공유) |
| `theme-global.js` | 전역 테마 설정 및 적용 | 모든 페이지 (테마 정보 공유) |
| `loadScript.js` | 레거시 페이지에 필요한 JS 동적 로드 | `src/components/LegacyPage.jsx` |
| `rewriteLegacyHtml.js` | 레거시 HTML 내 경로 수정 | `src/components/LegacyPage.jsx` |

### 4. Backend & API (`api/`)

| 파일 | 역할 | 주요 정보 전달 대상 |
|------|------|------|
| `analyze-pgn.js` | PGN 분석 요청 | `gemini.js` / `groq.js` |
| `lichess-proxy.js` | Lichess API 데이터를 안전하게 프록싱 | `inline.js` (전술/퍼즐 데이터) |
| `gemini.js` / `groq.js` | AI 기반 분석 수행 | `analyze-pgn.js` |


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
