# 전체 AI 집필 지연·반복 재시도 수정

사용자 운영 화면에서 인생총운이 반복 실패했다. 기존 개별 요청은 약 34~69초인 기록이 있었고, 별도 진단 요청도 120초 이상 응답을 기다렸다. 기존 기록에는 상세 실패 사유가 남지 않아 과거 세 번의 정확한 탈락 조건은 아직 확인할 수 없다.

확인한 코드 문제:

- 전체 계획 → 본문 3묶음(동시 2개) → 모든 장 완료까지 전체 화면 숨김.
- 내부 analysis 설명과 본문이 글자 단위로 같아야 한다는 검사. 자연스러운 짧은 마무리 문단도 탈락.
- 클라이언트 HTTP 2회 × 집필 2회 × 공급자 재시도가 중첩될 수 있음. 요청 시간 제한 없음.
- 한 장만 실패해도 다른 완성된 장까지 가리고 '다시 풀이하기'를 노출.
- 같은 보고서를 서로 다른 DOM에서 동시에 열 때 요청 공유 없음.

수정:

- 계획이 검증되면 AI 요약과 목차를 표시하고, 도착한 장을 검증 후 순서대로 공개. 기존 계산형 초안은 공개하지 않는다.
- 먼저 도착한 본문 DOM은 다른 장이 도착해도 교체하지 않아 읽던 위치를 보존한다.
- 웹 본문 묶음 동시 3개, PDF는 2개 유지. 설계 단계만 짧은 설명과 낮은 추론 설정으로 생성한다. 본문 모델/깊이는 유지.
- OpenAI 응답을 JSON 스키마로 제한. 실제 존재하는 근거 ID와 요청한 장 ID, 필수 필드와 개수를 제한한다. 기존 탭 응답 계약은 별도로 유지.
- 내부 분석 문장 중복 생성 제거(새 프로토콜). 본문의 근거, 인과 설명, 충분한 분량, 잘못된 원국/연도/과거 단정/중복 차단은 유지.
- 의미 없는 형식 차이는 로컬에서 보정. 실제로 공유하는 근거와 AI가 작성한 연결 설명만 장 간 메타데이터 복원에 사용.
- HTTP 중첩 재시도 제거. 영구 결제 오류는 반복 요청하지 않음. 실패한 큰 묶음은 작은 묶음으로 재요청.
- 브라우저 요청 100초(웹)/150초(PDF), 공급자 90초/140초 제한. 성공한 장은 캐시하고 남은 장만 재요청.
- 동일 보고서 동시 집필 공유, 완성된 보고서 중복 hydration 생략.
- 기존 전체 화면의 일반적인 '풀이를 완성하지 못했어요 / 다시 풀이하기' 오류 제거. 실제 장애나 근거 불일치가 끝내 해결되지 않으면 승인된 본문은 남기고 원인별 안내를 표시한다. 장애를 숨겨서 성공한 것처럼 표시하지 않는다.
- 개인정보 없이 단계·응답 시간·상태/오류 코드·탈락 항목만 브라우저 진단 저장 및 서버 로그에 남긴다.

검증:

- `tools/ai-report-recovery-regression.js`: 자연스러운 짧은 문단/내부 분석 표현 차이 허용, 없는 근거 차단, 형식 메타데이터 복구, 3묶음 병렬 시작, 먼저 완료된 4장 공개, 읽던 DOM 보존, 동시 중복 요청 차단, 결제 오류 1회 요청, 시간 제한, 구/신 프로토콜 스키마 확인.
- 기존 유료 14종 + PDF 14종 집필 통합 검사 통과.
- 무료/미리보기 23경로 AI 호출 0건 검사 통과.
- 전체 기존 회귀 테스트 통과.
- Chrome 모의 모델 검사: 모바일/데스크톱 28화면, PDF 14종 282쪽, 가로/본문 넘침 및 실행 오류 0건.

모의 응답 검사는 실행·오류 처리 검증이며 실제 모델 지연이나 해석 정확도를 보증하지 않는다. 운영 화면 실응답 검증 결과는 별도로 기록한다.

## 운영 화면에서 추가 확인한 정확한 탈락 원인

열려 있던 인생총운 화면의 실제 인증 상태에서 설계 응답 1건을 진단했다. 140,844ms 후 정상 JSON이 도착했고, 프로필과 12개 장 결론의 실제 근거/연도 검사는 모두 통과했다. 그러나 키워드는 5개(기존 검사 정확히 3개 요구), 장 연결 6개 중 3개는 양쪽 장에 함께 배정되지 않은 근거 ID를 가지고 있어 전체 계획이 탈락했다. 본문 생성 전에 계획 단계가 반복되는 원인을 확인했다.

동일 실응답에 새 보정을 적용한 결과: 기존 `planQuality=false` → 새 `planQuality=true`, 실제 공유 근거가 확인된 연결 3개 유지. 근거가 없는 연결만 제외했으며 프로필·결론 산문은 바꾸지 않았다. 개인의 실제 사주/상담 문장은 로그나 이 문서에 기록하지 않는다. 이 조건을 회귀 테스트에 추가했다.

## Live production recovery verification

- Worker version: `3c068744-cb13-4a79-a5f0-bdaebce44078`, code `3b77ebc`.
- Pages deployment: `4a7b960f-a143-4fde-99c7-85f6a833a24d`. Production HTML/JS/CSS hashes match the release files.
- Reused the actual AI plan after metadata normalization. All 12 actual AI chapters were generated, validated and displayed in 13,721 ms. Three parallel responses took 12,099 / 13,275 / 13,685 ms, with no rejected chapters or additional retries.
- Confirmed the existing user's page now displays 12 chapters and the chat allowance, without the previous retry button or error notice.
- Separately tested a fresh plan: 12,111 ms and validation passed, compared with the 140,844 ms legacy diagnostic request.
- These are component measurements for one real production input, not an end-to-end latency guarantee across products or a claim of divination accuracy. No calculated prose replaced AI authorship.
