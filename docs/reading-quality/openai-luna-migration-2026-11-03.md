# OpenAI GPT 경로 변경 — 2026-11-03

사용자 지정 대상은 `gpt-5.6-luna`다. 다른 모델로 대체하지 않았다.

## 변경 및 운영 반영

- Worker의 모든 GPT 텍스트 기본값을 OPENAI_DEFAULT_MODEL(`gpt-5.6-luna`) 하나로 모았다.
- 운영 `saju-chat`의 모델 설정 7개를 한 번의 secret bulk 갱신으로 변경했다: OPENAI_MODEL, OPENAI_READING_CORE_MODEL, OPENAI_TAROT_MODEL, OPENAI_ASTROLOGY_MODEL, OPENAI_TRANSLATE_MODEL, OPENAI_QNA_MODEL, OPENAI_QNA_PREMIUM_MODEL.
- 운영 설정 갱신은 현재 배포된 Worker 코드를 유지한다. 작업 폴더의 별도 본문/UI 변경을 이번 모델 변경에 섞어 배포하지 않았다.
- 모델 설정 적용 버전: `9014fe5c-dd5a-4f73-8c07-445288251990` (100%).
- Claude/Workers AI 대체 모델, 계산, 결제·가격, 무료 AI 금지, 캐시, 출력량과 질문별 reasoning/토큰 예산은 유지했다. 기본/심화 질문도 같은 GPT 모델을 쓰되 기존 답변 깊이 구분은 남는다.
- 저장된 결과의 캐시를 지우거나 강제 재집필하지 않는다. 신규 AI 생성부터 적용된다.

## 확인

공식 모델 문서: https://developers.openai.com/api/docs/models/gpt-5.6-luna

운영 API 키 바인딩을 사용하는 격리된 Cloudflare remote preview에서 확인했다. 키 값은 읽거나 출력하지 않았다. 테스트 코드에는 사용자 정보·결제 기록·원국을 전달하지 않았으며 운영 KV를 사용하지 않았다.

- `/v1/models/gpt-5.6-luna`: HTTP 200, 모델 ID 확인.
- Responses API: `reasoning.effort=low`, `text.verbosity=medium`, strict json_schema 출력 성공. 모델 `gpt-5.6-luna`, status completed.
- 합성 짧은 연결 테스트의 API 응답 시간 1,757ms, 입력 62/출력 19토큰. 장문 운세 생성 속도나 품질 수치로 사용하지 않는다.
- 설정 갱신 후 remote preview를 재시작해 위 7개 모델 바인딩의 실제 값이 모두 `gpt-5.6-luna`인지 확인했다.
- openai-luna-model-regression: GPT 기본값·경로별 override·기본/심화 질문의 기존 예산·Responses JSON 계약·Claude 모델 유지. 통과 (모의 네트워크).
- ai-full-report-regression: 유료/PDF 각 14종 집필 계약·근거·캐시·복구·전체 완료 후 노출. 통과 (모의 모델).

실제 장문 풀이 전 상품의 문학적 완성도·생성 시간·비용은 이번 짧은 연결 테스트로 보증하지 않는다.
