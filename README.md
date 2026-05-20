# ♟️ 지능형 체스 분석 플랫폼 (Intelligent Chess Platform)

이 프로젝트는 최신 AI 기술(Gemini, Groq)과 체스 엔진(Stockfish 18 WASM)을 결합한 하이브리드 체스 교육 및 분석 플랫폼입니다. React 프레임워크를 기반으로 하되, 기존의 레거시(Vanilla JS/HTML) 교육 모듈을 완벽하게 통합하는 고도의 소프트웨어 아키텍처를 채택하고 있습니다.

---

## 🏗 프로젝트 아키텍처 및 설계 철학

### 1. Bridge Pattern (React ↔ Legacy)
현대적인 웹 개발 환경과 기존 교육 자산의 유지보수성을 동시에 확보하기 위해 **Bridge Pattern**을 사용합니다.
- **React App Shell**: 네비게이션, 상태 관리(테마, 인증), 라우팅 등 전체적인 애플리케이션 프레임워크를 담당합니다.
- **Legacy Engine**: `src/legacy` 폴더의 HTML/JS를 동적으로 주입하여 실행하며, `public/chess-wasm-fixed`의 핵심 로직을 공유합니다.
- **Interface**: `LegacyPage.jsx`가 브릿지 역할을 수행하며, `loadScript.js`를 통해 전역 오염 없이 필요한 스크립트를 로드합니다.

### 2. 워커 기반 병렬 처리 (Worker-Driven Offloading)
체스 엔진(Stockfish)의 막대한 CPU 소모로 인한 메인 스레드 병목 현상을 방지하기 위해 **Shared Worker** 아키텍처를 적용했습니다.
- **성능 최적화**: 엔진 계산을 백그라운드 워커로 분리하여 UI 렌더링 성능을 보장합니다.
- **자원 효율성**: `stockfish-shared-worker.js`를 통해 사용자가 여러 브라우저 탭을 열어도 단 하나의 엔진 인스턴스만을 공유함으로써 시스템 메모리 낭비를 극대화하여 방지합니다.

### 3. 마이크로 프론트엔드 지향 (Lite Micro-Frontends)
각 교육 페이지를 독립적인 모듈로 구성하여 확장성과 유지보수성을 높였습니다.
- **독립적 구조**: 각 페이지는 `body.html`, `inline.js`, `styles.css`로 이루어진 격리된 구조를 가집니다.
- **장점**: 특정 모듈(예: 퍼즐)의 코드 변경이나 오류가 다른 모듈(예: 오프닝 학습)에 영향을 주지 않는 안전한 개발 환경을 제공합니다.

### 4. AI-Driven Analysis (Augmentation)
엔진의 수치적 데이터(Centipawns)를 AI(Gemini/Groq)가 해석하여 "왜 이 수가 실수인가?"를 인간의 언어로 코칭해주는 시스템을 구축하였습니다.

  4. 기술 요약 (Tech Stack)
   * Language: JavaScript (ES Modules)
   * Frontend: React, React Router, Vite, Vanilla CSS
   * Backend: Node.js (Serverless)
   * AI/ML: Google Gemini API, Groq Cloud API
   * Chess Engine: Stockfish (WASM)
   * External Integration: Lichess API
---

## 📂 상세 폴더 구조 (Directory Tree)

```text
root/
├── api/                        # Vercel Serverless Functions (Node.js)
│   ├── analyze-pgn.js          # PGN 기보 분석 및 AI 코칭 엔드포인트
│   ├── explorer.js             # Lichess 오프닝 DB 연동
│   ├── gemini.js / groq.js     # LLM(AI) API 인터페이스
│   └── lichess-proxy.js        # OAuth 및 CORS 우회 프록시
├── public/                     # 정적 자원 및 전역 유틸리티
│   ├── auth-check.js           # 세션 및 인증 상태 확인 (전역)
│   ├── sidebar-component.js    # 페이지 공통 사이드바 (Web Component)
│   ├── stockfish-shared-worker.js # 멀티탭 엔진 공유를 위한 워커
│   ├── theme-global.js         # 라이트/다크 테마 스위처
│   ├── chess-wasm-fixed/       # 체스 엔진 및 게임 로직 (Core)
│   │   ├── engine.js           # Stockfish 제어 클래스
│   │   ├── analysis-cache.js   # IndexedDB 기반 분석 결과 캐싱
│   │   └── coach.js            # AI 프롬프트 생성 및 코칭 로직
│   └── stockfish/              # Stockfish 18 WASM 바이너리
├── src/                        # React 애플리케이션
│   ├── components/
│   │   └── LegacyPage.jsx      # 레거시 HTML 주입 핵심 컴포넌트
│   ├── legacy/                 # 교육 모듈 (HTML/JS/CSS)
│   │   ├── manifest.json       # 교육 페이지 메타데이터 및 경로 정의
│   │   └── pages/              # 분석, 오프닝, 퍼즐 등 개별 모듈
│   ├── lib/
│   │   ├── rewriteLegacyHtml.js # HTML 경로 Vite 최적화 변환기
│   │   └── loadScript.js       # 동적 스크립트 로더 및 정리(Cleanup)
│   └── App.jsx                 # 메인 라우터 및 전역 레이아웃
├── vercel.json                 # 배포 설정 및 API 라우팅 정의
└── vite.config.js              # 번들링 및 개발 서버 설정
```

---

## 🔄 데이터 흐름 및 기술 상세 (Deep Dive)

### 🔑 전역 유틸리티 및 인증 (`/public`)
- **`auth-check.js`**: 페이지 로드 초기 단계에서 실행되어, 사용자의 로그인 상태를 확인하고 권한이 없는 페이지 접근을 차단합니다.
- **`sidebar-component.js`**: React 영역 밖의 레거시 페이지에서도 동일한 네비게이션 경험을 제공하기 위해 Web Component 기술로 작성되었습니다.

### ⚙️ 체스 엔진 통신 레이어
1. **User Action**: 사용자가 체스판에서 말을 움직입니다.
2. **`game.js`**: 이동의 유효성을 검증하고 FEN을 생성합니다.
3. **`engine.js`**: 생성된 FEN을 Shared Worker에게 `UCI` 형식으로 전달합니다.
4. **`analysis-cache.js`**: 만약 이전에 계산된 적이 있는 포지션이라면 DB에서 즉시 결과를 가져옵니다.

### 🤖 AI 코칭 흐름
1. **Trigger**: 대국 종료 또는 분석 버튼 클릭.
2. **API Call**: `api/analyze-pgn.js`로 전체 기보(PGN) 전달.
3. **AI Logic**: Gemini/Groq API가 엔진 점수의 급격한 변화(Blunder)를 감지하고, 전략적 이유를 설명하는 텍스트를 생성하여 반환합니다.

---

## 🔑 환경 변수 가이드

프로젝트 실행을 위해 루트에 `.env` 파일이 반드시 필요합니다.

```env
# AI 서비스 설정 (Vercel 환경 변수와 동일하게 설정)
VITE_GEMINI_API_KEY="AIzaSy..."  # Google AI Studio 발급
VITE_GROQ_API_KEY="gsk_..."      # Groq Cloud 발급

# Lichess 연동
LICHESS_TOKEN="lip_..."          # 개발자 토큰 (Private API 접근용)

# 시스템 설정
VITE_APP_ENV="development"
```

---

## 🛠 유지보수 가이드 (Developer Notes)

- **새 페이지 추가 시**: `src/legacy/pages/`에 모듈을 만들고, 반드시 `src/legacy/manifest.json`에 등록해야 React 라우터가 이를 인식합니다.
- **스타일 충돌 방지**: 레거시 페이지의 CSS는 `LegacyPage.jsx`에 의해 Scoped 방식으로 로드되지만, 전역 변수(`:root`) 사용 시 `theme-ui.css`와의 일관성을 유지해야 합니다.
- **엔진 업데이트**: `public/stockfish/` 내의 WASM 파일 교체 시, `engine.js`의 `locateFile` 경로를 반드시 확인하세요.

---
*Last Updated: 2026-05-20*
*Author: Gemini CLI (Lead Architect)*
