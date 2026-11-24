# FruitsNINE

9x9 보드에 과일을 배치하고, 놓은 과일과 주변 칸의 과일이 모두 서로 다르면 한꺼번에 지우는 브라우저 퍼즐 게임입니다. 2011년 iOS 게임 [FruitsNINE](https://github.com/wall72/FruitsNINE)의 웹 버전이며, 원작은 Yoshitaka Nagano 가 만든 Palm OS 게임 NiceNine 입니다. 설치나 빌드 없이 정적 HTML/CSS/바닐라 JS로 동작합니다.

**플레이:** https://wall72.github.io/fruitsnine-web/

## 게임 방법

- 보드는 9x9이고, 시작할 때 가운데 7x7 영역에 과일이 무작위로 채워집니다. 바깥 테두리는 비어 있습니다.
- 화면 위쪽의 대기열(4개) 중 맨 앞 과일이 지금 놓을 과일입니다.
- 빈 칸을 눌러 과일을 놓으면 대기열이 한 칸 당겨지고 새 과일이 하나 추가됩니다.
- 놓은 칸과 그 주변 칸(안쪽은 8방향, 가장자리는 5칸, 모서리는 3칸)이 모두 채워져 있고 과일이 전부 서로 다르면, 놓은 과일과 주변 과일이 모두 사라집니다. 가장자리와 모서리는 주변 칸이 적어서 더 적은 종류만 있으면 매치됩니다.
- 점수는 **턴 수**이고 적을수록 좋습니다. 놓을 때마다 1턴이 올라갑니다.
- 보드를 전부 비우면 승리(`Cleared!`), 81칸이 모두 차면 패배(`Game Over`)입니다.
- 승리하면 결과 화면에서 이름을 입력해 기록을 저장합니다. "익명으로 저장"도 가능합니다. 패배한 게임은 기록하지 않습니다.
- **모드:** 보통은 과일 9종, 어려움은 12종입니다. 헤더의 모드 버튼으로 바꾸며, 기록과 최고 기록은 모드별로 따로 저장됩니다. 진행 중에 모드를 바꾸면 현재 게임이 사라집니다(확인 대화상자).

## 주요 기능

- 세로/가로 화면에 대응하는 반응형 레이아웃
- 과일 배치, 매치, 제거 애니메이션 (원작 iOS 앱의 과일 이미지 사용)
- `localStorage` 에 진행 중인 게임 자동 저장 및 복원 (새로고침해도 이어하기, 종료된 게임은 결과 화면 복원)
- 클리어 시 사용자명 입력 (최대 12자, 다음 게임에 기억)
- 모드별로 최대 20개까지 저장되는 리더보드: 기본은 기기별 로컬 저장, `config.js` 에 Google Apps Script URL 을 설정하면 서버(Google 스프레드시트) 공유 리더보드 (GitHub Pages/로컬/자체 서버 어디서나 동일, 서버 장애 시 로컬로 대체. 설정 방법: `server/apps-script/README.md`)
- 손상된 저장 데이터는 검증 후 폐기하고 새로 시작
- 키보드 조작과 스크린 리더 지원 (칸이 `button`, 칸별 `aria-label`, `aria-live` 상태 안내)
- 모드별 최고(최소 턴) 기록 표시, 게임 중 새 게임(확인 대화상자)과 기록 보기
- English/한국어 UI (기본 English, 헤더의 EN|KO 토글로 전환) 와 How to Play 팝업
- PWA: 홈 화면에 설치하고 오프라인에서도 실행
- 단위 테스트 + Playwright E2E 테스트, GitHub Pages 자동 배포

## 로컬 실행

`index.html` 을 브라우저에서 바로 열어도 되지만, 로컬 서버로 여는 것을 권장합니다.

```bash
python3 -m http.server 8000
# 또는
npx http-server -p 8000
```

브라우저에서 `http://localhost:8000` 을 엽니다.

## 테스트

```bash
npm test                 # 단위 테스트 (Node 내장 러너, Node 18 이상)
npm ci                   # E2E 준비: 의존성 설치
npx playwright install chromium
npm run test:e2e         # Playwright E2E (모바일/데스크톱)
```

- 단위 테스트(`tests/logic.test.js`): 보드/대기열 생성, 이웃 칸 수(안쪽/가장자리/모서리), 매치·비매치 판정, 종료 상태 판정, 저장 데이터 검증, 리더보드 정렬과 모드별 상위 20개 유지
- 단위 테스트(`tests/apps-script.test.js`): `Code.gs` 의 제출 검증과 모드별 정렬
- E2E 테스트(`e2e/game.spec.js`): 새 게임 시작, 배치와 새로고침 후 복원, 매치/비매치, 클리어 결과 화면과 모드별 기록, 게임 오버 비기록, 모드 전환, 손상된 저장 데이터 복구, 언어 전환, How to Play 팝업

## 배포

`main` 브랜치에 푸시하면 `.github/workflows/pages.yml` 이 단위·E2E 테스트를 실행하고, 모두 통과하면 GitHub Pages 에 배포합니다.
처음 한 번은 저장소 Settings → Pages → Source 를 **GitHub Actions** 로 설정해야 합니다.
서버 리더보드를 쓰려면 저장소 변수 `LEADERBOARD_API_URL` 에 Apps Script 웹 앱 URL 을 등록합니다 (`server/apps-script/README.md` 참고).

## 프로젝트 구조

```text
.
|-- index.html                    게임/결과 화면 마크업
|-- styles.css                    스타일, 반응형, 애니메이션
|-- sw.js, manifest.webmanifest, icon.svg   PWA
|-- assets/                       과일 이미지 (f00~f11.png, fb.png)
|-- config.js                     배포 설정 (서버 리더보드 URL)
|-- logic.js                      순수 게임 로직 (DOM 미사용)
|-- game.js                       렌더링, 입력, 애니메이션, 저장, 리더보드
|-- server/apps-script/           서버 리더보드 백엔드 (Google Apps Script)
|-- tests/                        node --test 용 단위 테스트
|-- e2e/, playwright.config.js    Playwright E2E 테스트
|-- .github/workflows/pages.yml   테스트 후 Pages 배포
|-- package.json
|-- LICENSE                       MIT 라이선스
|-- README.md
`-- CLAUDE.md                     Claude Code 작업 지침
```

## 제한 사항

- 되돌리기, 힌트, 효과음은 없습니다 (원작에도 없음). 광고와 iOS 설정 화면은 포팅하지 않았습니다.
- 서버 리더보드는 선택 사항이며 `config.js` 에 URL 을 설정해야 동작함. 기록은 서버에서 재현 검증하지 않음(모드와 턴 수 범위만 검사)

## 크레딧과 라이선스

- 원작: NiceNine (Palm OS, Yoshitaka Nagano) → FruitsNINE (iOS, wall72)
- 과일 이미지는 원작 iOS 프로젝트에서 가져왔습니다.
- 코드: [MIT License](LICENSE)
