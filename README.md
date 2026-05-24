# Chess Education Project

이 프로젝트는 기존의 HTML/JS 기반 체스 교육 플랫폼을 현대적인 React 환경으로 통합하고, 다양한 AI 분석 및 외부 API 연동 기능을 제공하는 웹 애플리케이션입니다.

## 🏗 프로젝트 아키텍처

본 프로젝트는 **React Wrapper**와 **Legacy HTML/JS**가 결합된 구조를 가지고 있습니다.

1.  **React Layer (SPA)**: `react-router-dom`을 사용하여 전체적인 라우팅과 페이지 전환을 관리합니다.
2.  **Legacy Bridge**: `LegacyPage.jsx` 컴포넌트가 각 페이지별 HTML, CSS, 스크립트를 동적으로 주입하여 기존 코드를 실행합니다.
3.  **Core Chess Engine**: `public/chess-wasm-fixed/` 디렉토리에 위치한 순수 자바스크립트 및 WebAssembly(Stockfish) 코드가 실제 체스 로직과 분석을 담당합니다.
4.  **Backend (Serverless)**: `api/` 디렉토리의 서버리스 함수들이 AI 분석(Gemini, Groq) 및 Lichess API와의 통신을 처리합니다.

---

## 📂 주요 디렉토리 및 파일 역할

### 1. `src/` (React 및 통합 로직)
-   **`App.jsx`**: 라우팅 정의. 각 경로는 `LegacyPage` 컴포넌트에 `pageId`를 전달하여 해당 페이지를 로드합니다.
-   **`components/LegacyPage.jsx`**: 핵심 컴포넌트. `src/legacy/pages/`에서 자산을 읽어와 DOM에 주입하고, 전역 스크립트를 로드하며, 페이지 생명주기를 관리합니다.
-   **`lib/`**:
    -   `loadScript.js`: 스크립트를 순차적으로 로드하고, 중복 로드를 방지하며, 페이지 전환 시 이전 스크립트를 정리합니다.
    -   `rewriteLegacyHtml.js`: 기존 HTML 내의 `.html` 링크를 React 라우트 경로로 변환하여 SPA 환경에서도 부드러운 이동이 가능하게 합니다.

### 2. `src/legacy/pages/` (기존 페이지 자산)
-   각 서브디렉토리(analysis, play, puzzle 등)는 특정 기능을 담당하며 다음 파일들을 포함합니다:
    -   `body.html`: 페이지의 구조.
    -   `styles.css`: 페이지 전용 스타일.
    -   `meta.json`: 페이지 제목, 외부 스크립트 의존성, CSS 링크 정보 정의.
    -   `inline.js` / `module.js`: 페이지 초기화 및 실행 로직.

### 3. `public/chess-wasm-fixed/` (핵심 체스 로직)
-   **`chess.js`**: 보드 상태 관리, 행마 유효성 검사 등 핵심 체스 규칙 구현.
-   **`game.js`**: `ChessGame` 클래스. 기보(History), 변화수(Variations), 보드 테마, 기물 드래그 앤 드롭, 엔진 분석 시각화 등을 총괄합니다.
-   **`engine.js`**: Stockfish 엔진과의 인터페이스. 웹 워커를 통해 분석 결과를 수신합니다.
-   **`ui.js`**: 보드 렌더링, 좌표 표시, 하이라이트 등 시각적 요소 관리.
-   **`coach.js` / `hints.js` / `chess-tactics.js`**: 사용자에게 수 제안, 전술 탐지, 학습 가이드를 제공하는 로직.

### 4. `api/` (서버리스 함수 및 프록시)
-   **AI 프록시**: `gemini.js`, `groq.js`는 클라이언트의 요청을 받아 각각 Google Gemini와 Groq API로 전달합니다. API 키 노출을 방지하고 요청/응답 형식을 프로젝트에 맞게 변환합니다.
-   **분석 프록시 (`analyze.js`)**: 별도의 외부 백엔드 서버(Render)로 분석 요청을 전달하는 프록시 역할을 합니다.
-   **Lichess 연동**: `explorer.js`, `lichess-proxy.js` 등은 Lichess 데이터베이스에서 오프닝 통계나 마스터들의 게임 데이터를 가져오며, CORS 문제를 해결하기 위해 프록시를 사용합니다.
-   **PGN 처리**: `analyze-pgn.js`는 PGN 형식의 기보 전체를 분석합니다.

---

## 🧠 주요 알고리즘 및 기술 로직

### 1. 수 판정 및 정확도 계산 (`chess.js`, `lichess-judgment.js`)
*   **승률 변환 ($W$)**: Centipawn 점수를 시그모이드 함수($W = 1 / (1 + 10^{-cp/400})$)를 통해 0~1 사이의 승률로 변환합니다.
*   **수 분류**: 최선수와 실제 둔 수의 승률 차이($\Delta W$)를 기준으로 판정합니다.
    *   **Brilliant (!!)**: 기물 희생이 포함되면서도 승률 손실이 거의 없는 수.
    *   **Blunder (??)**: 승률 손실이 20% 이상인 치명적인 실수.
    *   **Mistake (?)**: 승률 손실이 10~20% 사이인 실수.
*   **조화 평균(Harmonic Mean) 정확도**: 전체 게임 정확도 계산 시 산술 평균 대신 조화 평균을 사용합니다. 이는 단 한 번의 치명적인 블런더가 전체 정확도 점수에 큰 영향을 미치게 하여, 플레이어의 일관성을 엄격하게 평가하기 위함입니다.

### 2. AI 코치 포지션 브리핑 (`position-brief.js`)
*   AI(LLM)에게 단순한 기보 데이터가 아닌, **검증된 체스 지식**을 구조화하여 전달합니다.
*   **Insight 추출**: '고립된 폰', '아웃포스트', '열린 파일 독점', '디스커버드 어택 위협' 등 전술/전략적 요소를 엔진 데이터와 결합하여 요약합니다.
*   이 브리핑 데이터는 LLM이 할루시네이션(환각) 없이 정확한 체스 해설을 제공할 수 있는 기반이 됩니다.

### 3. 엔드게임 연습 및 규칙 엔진 (`endgame-practice.js`, `hints.js`)
*   **규칙 기반 가이드**: '사각형 규칙(Square Rule)', '필리도어 포지션(Philidor)', '루세나 포지션(Lucena)' 등 특정 엔드게임 상황에 대한 이론적 승리/무승부 알고리즘을 구현하고 힌트를 제공합니다.
*   사용자의 움직임이 이론적 최선수에서 벗어날 경우 실시간으로 경고하거나 올바른 방향을 제시합니다.

---

## 🔄 데이터 흐름 및 정보 전달

### 1. 페이지 로드 흐름
1. 사용자가 특정 경로(예: `/play`)로 접속.
2. React Router가 `LegacyPage(pageId='play')` 렌더링.
3. `LegacyPage`가 `src/legacy/pages/play/meta.json`을 읽어 필요한 외부 스크립트와 스타일을 확인.
4. `body.html`을 읽어와 React 컨테이너에 삽입.
5. 필요한 스크립트들을 순차적으로 로드 후 `inline.js` 실행.

### 2. 체스 분석 흐름
1. 사용자가 보드에서 수를 둡니다 (`game.js`의 `makeMove`).
2. `engine.js`가 현재 FEN(보드 상태 문자열)을 Stockfish 엔진(WASM)에 전달.
3. 엔진이 최선의 수와 점수(CP)를 계산하여 결과를 반환.
4. `game.js`는 이 정보를 받아 UI에 평가바(Eval Bar)와 추천 수 화살표를 그립니다.
5. (필요 시) `api/analyze.js`를 호출하여 AI에게 해당 국면에 대한 상세 설명을 요청.

### 3. AI 해설 연동
1. 프론트엔드에서 현재 보드 상황과 엔진 분석 데이터를 `api/gemini` 또는 `api/groq`로 전송.
2. 서버리스 함수는 API Key를 사용하여 LLM에 질의.
3. 생성된 자연어 해설을 다시 프론트엔드로 전달.
4. `coach.js` 등이 이 해설을 화면에 표시하고, 해설 내의 좌표를 클릭하면 보드에 강조 표시를 합니다.

---

## 🛠 주요 로직 특징
-   **Variation Tree**: 메인라인 기보 외에도 중간에 다른 수를 두었을 때 분기되는 '변화수'를 트리 구조로 관리합니다.
-   **Engine Previews**: 엔진이 제안하는 여러 라인을 실제 기보에 반영하기 전에 미리 보고 탐색할 수 있는 기능을 제공합니다.
-   **Responsive UI**: 모바일 환경에서는 기보 리스트가 가로형으로 변하며, 터치 드래그를 지원합니다.
