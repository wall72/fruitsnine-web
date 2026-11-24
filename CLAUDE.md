# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

FruitsNINE web: 2011년 iOS 게임 FruitsNINE(github.com/wall72/FruitsNINE, 원작은 Palm OS "NiceNine")의 브라우저 포팅. github.com/wall72/summing-web 과 같은 인프라 위에 만들었다: 빌드 단계 없는 정적 HTML/CSS/바닐라 JS, `localStorage` 저장, 선택적 Google Apps Script(Sheets) 리더보드, 자체 백엔드 없음.

## 언어 지침

- 세션 응답은 모두 한글로 한다.
- 문서(README, CLAUDE.md 등)와 commit 메시지도 모두 한글로 작성한다. (UI 문구의 영어/한국어 이중 언어 정책은 별개로 유지)
- 코드 주석은 영어로 유지한다.

## 명령어

- 실행: `python3 -m http.server 8000` 후 `http://localhost:8000` 접속
- 단위 테스트: `npm test` (Node 내장 러너. `tests/logic.test.js` 는 `logic.js` 를, `tests/apps-script.test.js` 는 `server/apps-script/Code.gs` 의 순수 함수를 검증). 파일 하나만: `node --test tests/logic.test.js`
- E2E: `npm run test:e2e` (Playwright, 모바일 + 데스크톱 프로젝트, 포트 4173 정적 서버 자동 실행). 브라우저 설치는 `npx playwright install chromium`, 이미 설치된 것은 `PW_CHROMIUM_PATH=/경로/chromium` 으로 사용. 테스트 하나만: `npx playwright test -g "<제목>"`
- 배포: `main` 푸시 시 `.github/workflows/pages.yml` 이 단위·E2E 테스트 후 GitHub Pages 에 배포 (Pages 소스는 "GitHub Actions"). 저장소 변수 `LEADERBOARD_API_URL` 이 있으면 배포 시 `config.js` 에 주입
- 번들러 없음, 런타임 의존성 없음 (devDependency 는 `@playwright/test` 뿐). 의존성 추가 전에 사용자에게 확인

## 구조

- `logic.js` - 순수 게임 규칙 (보드/대기열 생성, 매치, 상태 판정, 저장 데이터 검증, 리더보드 정렬, 이름 정제). DOM/localStorage 사용 금지. 브라우저에서는 전역 `FruitsLogic`, Node 에서는 `module.exports`
- `game.js` - `RemoteLeaderboard`(Apps Script fetch), `LeaderboardManager`(로컬 + 서버 기록), `FruitsGame`(DOM 렌더링, 입력, 애니메이션, 저장, `I18N` 기반 다국어). 규칙은 `logic.js` 에 둘 것
- `config.js` - `window.FRUITS_CONFIG.leaderboardApiUrl`. 저장소에는 비워 둘 것 (포크가 우리 시트에 쓰지 못하게). `logic.js` 보다 먼저 로드. 테스트는 이 파일을 빈 URL 로 라우트
- `assets/f00..f11.png`, `assets/fb.png` - 과일 타일과 빈 타일. 레거시 iOS 프로젝트에서 복사 (33x33 px). `fb.png` 는 현재 UI 에서 쓰지 않음
- `server/apps-script/` - 리더보드 백엔드 (`Code.gs`, 배포 방법은 해당 README). 정적 사이트에는 배포하지 않음. API 를 바꾸면 `game.js` 의 `RemoteLeaderboard` 와 테스트도 함께 수정
- `sw.js`, `manifest.webmanifest`, `icon.svg` - PWA. 버전 단위 캐시 우선이므로 캐시 대상 파일을 바꾸면 `sw.js` 의 `CACHE` 를 올리고 `SHELL` 과 `pages.yml` 의 복사 목록도 함께 수정 (새 에셋은 양쪽 모두)
- `styles.css` - 반응형 스타일, 타일 애니메이션. `game.js` 의 `PLACE/MATCH/REMOVE_DELAY_MS` 는 CSS 의 duration 과 맞출 것

## 게임 규칙 (레거시 `GameController.m` 기준. 변경 시 `logic.js` 와 `tests/` 도 함께 수정)

- 9x9 보드. 시작 시 안쪽 7x7 에 랜덤 과일, 바깥 테두리는 비어 있음 (레거시 README 기준. 레거시 코드는 빈 칸을 바둑판 패턴으로 배치했음)
- 모드: 보통 = 과일 9종, 어려움 = 12종 (`logic.js` 의 `MODES`, 이미지 `assets/fNN.png`)
- 대기열 4개. 첫 과일을 빈 칸 아무 곳에나 놓고, 대기열이 당겨지며 랜덤 과일 1개가 추가됨
- 매치: 놓은 칸과 보드 안의 이웃 칸(안쪽 8, 가장자리 5, 모서리 3). 전부 채워져 있고 과일이 겹치지 않으면 전부 제거. 가장자리/모서리는 더 적은 종류로 매치되며 이는 레거시 동작이라 의도된 것
- 점수 = 턴 수, 적을수록 좋음. 보드가 비면 승리, 81칸이 가득 차면 패배. 클리어한 게임만 기록하고 게임 오버는 기록하지 않음
- 되돌리기, 힌트, 오디오 없음 (레거시에 없음). 광고와 iOS 설정 번들은 포팅하지 않음

## 저장 데이터 (`localStorage`)

- `currentGame`: `mode, board, stream, moves, gameStatus, submitted, savedAt`. 유효하지 않으면 폐기하고 새 게임 시작. `submitted === false` 는 이름 입력을 기다리는 클리어 게임
- `leaderboard`: `{name, mode, moves, remaining, status, date, timestamp}`, 모드별 상위 20개, 턴 적은 순 -> 최신 순. 서버 사용 여부와 관계없이 항상 기록 (오프라인 폴백)
- `language` (`'en'`|`'ko'`, 기본 `'en'`), `playerName` (마지막에 쓴 이름)
- `config.js` 에 URL 이 있으면 서버 기록을 로컬 대신 표시 (10초 타임아웃 후 로컬 기록과 안내 문구). POST 는 CORS preflight 를 피하려고 `text/plain` 사용

## 코딩 컨벤션

- 4칸 들여쓰기, 작은따옴표, 세미콜론. 프레임워크 없이 바닐라 JS 만 사용
- UI 문구는 영어/한국어 이중 언어: `game.js` 의 `I18N` 에서 `en`, `ko` 양쪽에 키를 함께 추가. 정적 HTML 은 `data-i18n`, `data-i18n-placeholder`, `data-i18n-aria` 사용, 동적 문구는 `t(key, ...args)` 사용. 파일은 UTF-8 (BOM 없음)
