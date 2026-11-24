# FruitsNINE (web)

2011년 iOS 퍼즐 게임 [FruitsNINE](https://github.com/wall72/FruitsNINE)의 브라우저 버전입니다. 원작은 Yoshitaka Nagano 가 만든 Palm OS 게임 NiceNine 입니다.

## 게임 방법

- 보드는 9x9 이고, 시작할 때 안쪽 7x7 칸에 랜덤 과일이 채워져 있습니다.
- 4칸짜리 대기열의 첫 번째 과일을 빈 칸 아무 곳에나 놓습니다.
- 놓은 과일과 그 주변 칸이 모두 채워져 있고 과일이 전부 서로 다르면 모두 사라집니다.
- 최소한의 턴으로 보드를 비우세요. 보드가 가득 차면 패배합니다.
- 보통 모드는 과일 9종, 어려움 모드는 12종입니다. 최소 턴 기록은 모드별로 저장됩니다.

## 개발

```
python3 -m http.server 8000   # 실행
npm test                      # 단위 테스트
npm run test:e2e              # Playwright (먼저 npx playwright install chromium)
```

빌드 단계는 없습니다. 구조는 `CLAUDE.md`, 선택 사항인 온라인 리더보드는 `server/apps-script/README.md` 를 참고하세요.

과일 이미지는 원작 iOS 프로젝트에서 가져왔습니다. 코드는 MIT 라이선스입니다 (`LICENSE` 참고).
