# 배달의민족 웹폰트

우아한형제들이 배포한 배민 도현체와 배민 한나체 Air를 사용합니다.
공식 소개: https://www.woowahan.com/fonts

- `bm-dohyeon.woff2`: 제목, 메뉴, 주요 버튼. 원본 파일을 변경 없이 포함했습니다.
  출처: https://github.com/fonts-archive/BMDOHYEON/blob/8b57428601b302d49ed511f68587afbf7ef5f504/BMDOHYEON.woff2
  라이선스: `LICENSE-DOHYEON.txt` (https://github.com/woowabros/Dohyeon/blob/master/OFL.txt).
- `bm-hanna-air.woff2`: 풀이, 설명, 입력, 블로그 및 A4 본문. 원본 파일을 변경 없이 포함했습니다.
  출처: https://github.com/fonts-archive/BMHANNAAir/blob/e20aba74f42fcab03d7f743cb282a69dfe8f7077/BMHANNAAir.woff2
  라이선스: `LICENSE-HANNA-AIR.txt` (같은 버전의 BMHANNAAir.ttf name 테이블에 포함된 영문 고지).

두 서체는 각각 단일 굵기입니다. 도현체는 합성 볼드를 끄고 본문 강조는 기존 굵기를 유지합니다.
지원되지 않는 한자·기호는 시스템 글꼴로 표시합니다. Material Symbols 아이콘은 기존 전용 글꼴을 유지합니다.
`font-display: swap`으로 로딩 중에도 내용을 표시합니다. 앱에서는 두 파일을 미리 불러옵니다.
