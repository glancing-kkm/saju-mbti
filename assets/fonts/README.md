# 배달의민족 웹폰트

사이트의 제목·메뉴·버튼·본문·입력란·블로그·약관·A4 요약본은 배민 한나체 Pro를 사용합니다.
공식 소개: https://www.woowahan.com/fonts
공식 라이선스 안내: https://www.woowahan.com/fonts/license

- `bm-hanna-pro.woff2`: 한나체 Pro 웹폰트. 원본 파일을 변경 없이 포함했습니다.
  출처: https://github.com/fonts-archive/BMHANNAPro/blob/dbf1d575674d3ffdf015199adabce2c9f0c42f8a/BMHANNAPro.woff2
  라이선스: `LICENSE-HANNA-PRO.txt` (같은 버전의 BMHANNAPro.ttf name 테이블에 포함된 영문 고지).
  CSS 이름은 `BM HANNA Pro`이며 단일 굵기입니다.

`font-display: swap`으로 로딩 중에도 내용을 표시하고, 앱에서는 한나체 Pro 파일 하나만 미리 불러옵니다.
`tools/font-ranges.py`가 실제 글리프 범위와 세로 정렬 값을 생성합니다.
지원되지 않는 한자·기호는 시스템 글꼴로 표시합니다. Material Symbols 아이콘은 기존 전용 글꼴을 유지합니다.

이전 버전의 폰트 파일과 라이선스도 보관합니다. 현재 화면에서는 사용하지 않습니다.

- `bm-dohyeon.woff2`: https://github.com/fonts-archive/BMDOHYEON/blob/8b57428601b302d49ed511f68587afbf7ef5f504/BMDOHYEON.woff2
  라이선스: `LICENSE-DOHYEON.txt`.
- `bm-hanna-air.woff2`: https://github.com/fonts-archive/BMHANNAAir/blob/e20aba74f42fcab03d7f743cb282a69dfe8f7077/BMHANNAAir.woff2
  라이선스: `LICENSE-HANNA-AIR.txt`.
