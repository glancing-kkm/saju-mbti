# 전체 풀이 심화 개편 — Claude 전체 작업 이관

## 사용자 요청 / 완료까지 작업 소유권

2026-10-30 요청. 사용자는 사주·타로·점성술·자미두수를 포함한 모든 무료/유료 풀이와 기존 유료 PDF 상세풀이를 전면 개선하라고 명시했다. 구현할 시간이 많더라도 전체를 수정해야 한다. 한도 초과가 예상되면 Claude에게 넘겨 완전히 완료하라고 직접 승인했다. 이 문서는 계획 제안이 아니라 **전체 구현 및 최종 검증의 이관**이다. 원래 Codex는 이관 후 동시 편집하지 않는다. Claude는 작업을 실행하고 검사하며 완료까지 이어간다. 사용자에게 다시 작업 승인이나 같은 설명을 요청하지 않는다. 선택이 필요한 중대한 제품 변경 외에는 합리적으로 판단한다.

사용자 의도:
- 사람들이 운세를 보는 이유는 자기 삶을 이해하고 선택의 실마리를 얻기 위해서다.
- 독자가 ‘나를 구체적으로 알아보는가’, ‘내가 지금 겪는 문제가 왜 반복되는지 설명하는가’, ‘읽고 내가 무엇을 선택할 수 있는가’를 느껴야 한다.
- 지금은 실용적 행동 조언은 많지만 자기 이해·문제의 설명·강점이 부담이 되는 조건이 약하다.
- 웹 분량은 늘릴 필요가 없다. 원국/카드/차트 설명과 행동 지시를 반복해 길게 만드는 것을 피한다.
- PDF는 심화 설명의 주 무대다. **전체 60,000자 이내**, 상한을 채우는 장문/반복은 필요 없다. 상황별 차이·근거의 연결·선택지의 득실·시기에 따른 달라짐을 자세히 설명한다.
- AI 활용 비중은 필요하면 높인다. 숫자상 비율을 지어내지 말고 계산은 결정론적 엔진, 종합적 서술·질문에 대한 답은 AI가 담당하도록 실질적으로 변경한다.
- 예시 문장/일부 카테고리 시안만 만들고 완료라고 하지 않는다. 무료/미리보기/유료 전체/기존 PDF 전부 적용한다.

## 편집 원칙 — 시스템별 근거는 다르게, 독자 경험은 일관되게

공통 흐름: 알아볼 수 있는 생활 장면과 내적 갈등 → 강점이 부담으로 바뀌는 이유/조건 → 지금 변화하는 요소 → 선택지별 얻는 것과 잃는 것 → 본인이 판단할 기준/다시 점검할 신호.
이 다섯 가지를 꼭 5개 제목으로 노출하거나 같은 연결어로 반복할 필요는 없다. 웹은 3~4개 짧은 문단으로 통합할 수 있다. PDF에서 자세히 확장한다.

- 사주: 원국의 둘 이상 실제 구조와 월령·왕쇠·용신(현재 엔진이 계산한 범위)·대운/세운/월운을 연결. 글자 뜻 나열이나 오행 개수만으로 단정하지 않는다. 계산하지 않은 구조는 만든 것으로 취급하지 않는다.
- 타로: 질문 + 실제 카드 + 스프레드 자리 + 방향을 연결. 카드 사전 의미를 순서대로 복사하는 것으로 끝내지 않는다. 질문 재진술을 ‘새 통찰’로 착각하지 않는다. 상대의 속마음·실제 사건·정확한 날짜를 확인했다고 말하지 않는다.
- 점성술: 출생차트에서 서로 다른 요구(예: 태양/달/금성/화성), 실제 각도·하우스·트랜짓을 연결한다. 같은 원소라는 이유로 실제 애스펙트가 있는 것처럼 말하지 않는다. 시간 미상은 ASC/MC/하우스를 추정하지 않는다.
- 자미두수: 실제 명궁·신궁·해당 주제 궁·대궁/주성·사화·대한 등 실제로 계산한 배치끼리 연결한다. 사주 5축 일반 성격으로 대체하지 않는다. 미구현 유년·삼방사정 등을 계산된 사실처럼 설명하지 않는다.
- 무료 베딕/마하보테/일일운세/만세력/오늘 타로/오늘 점성술/무료 출생차트도 빠뜨리지 않는다. 사용 가능한 근거 범위 내에서 짧고 읽을 가치 있는 해석을 제공한다.
- 이름풀이/작명은 실제 글자·획수·소리·후보 차이에 기반한 선택 설명을 유지한다. 같은 사람 일반 사주 풀이로 갈아 끼우지 않는다.
- 생애주기와 관계 상태: 아이에게 직장·배우자·투자 조언 금지. 학생/구직/육아/은퇴 현재 활동 고려. 기혼 연애운은 새 연인이 아닌 배우자·관계/귀인 문맥 유지.
- 전문성을 보인다는 이유로 전문용어를 본문에 늘어놓지 않는다. 본문은 친근 존댓말, 캐릭터 말풍선만 도령 말투. AGENTS.md 준수, 단독명사 ‘결’ 금지, 고아글자 방지 유지.
- 강한 공감/흥미를 위해 확인되지 않은 사건을 꾸미지 않는다. 같은 명식 사람에게 특정 사용자의 과거 결혼/입사 등을 복사하면 안 된다. 사용자가 알려준 정보는 ‘말씀하신 직업/계획’처럼 진술 출처를 밝힌다. 가능성 예시는 실제 이력처럼 확정하지 않는다.

## 작업 공간과 보존 사항

CWD: /Users/kangmin/Desktop/웹사이트/MBTI
Orca worktree id: 98f996a3-a025-4890-9946-9b114521faa4::/Users/kangmin/Desktop/웹사이트/MBTI
Repo origin github.com/glancing-kkm/saju-mbti; branch main. Actual git HEAD on inspection: 22ed96d (입력 화면 중립 밝은 글씨). Do not rely on older history summaries saying ec54964. Recheck git status before edits; other agents/Claude/user have worked here.

Existing uncommitted edits MUST be preserved:
- index.html: 인생총운 성향/직업/재물 editorial pilot + AI deep integration + 직업 필수/선택 항목 순차 입력.
- assets/reading-flow.css: unrelated neutral text contrast fixes plus supplemental wizard styling.
- assets/report-pdf.js: editorial paragraph extraction/version improvements.
- worker/saju-chat-worker.js: editorial brief sanitization/prompt support.
- package.json and several regression tests updated.
- untracked editorial docs/tests/generator plus counsel-input-regression.js.
- .DS_Store and untracked 템플릿/ (14 user-provided premium PDF templates). Do not delete/reset/stage these incidentally. Do not overwrite previous source changes to simplify the diff.

No code was edited for this new deep-upgrade request before this handoff. Only read-only analysis and this document. Latest previous input change and editorial pilot remain local, not claimed deployed. New task does not explicitly ask push/deploy; complete and verify implementation, report deployment status truthfully. Do not silently publish a partial migration or change prices.

## Existing implementation map (verify current line numbers with rg)

### index.html
- `COUNSEL_FIELDS`, `counselFieldsFor`, `renderCounselFields`, `counselRead` around 4360: occupation mandatory for 17 supplemental flows incl qna; others optional Next/Skip fieldsets. Same birth owner occupation shared across categories, others category-specific. `analyze()` enforces required job and calls `refreshCounselOwner`. Preserve. Child activity allows 미취학/학생. Stored user statements source user-stated.
- `buildReadingEvidence`, `readingEvidencePayload`, `buildReadingNarrative` around 13k–13.6k: actual natal evidence nodes, axes, flows, life-stage. Existing four-paragraph conclusion/evidence/development/action often advice-heavy. Most domain fallback generation uses this.
- `LIFE_EDITORIAL_MOTIFS`, `lifeEditorialPlan/Context/HTML/AIQuality` around 14286: 10 two-axis combinations for only core/career/money. Adult >=20, two genuine supported axes; not fabricated contradictions. Four short paragraphs recognition/reversal/timing/choice, folded source references. Actual two-group references validated. Useful starting point, but **not** universal replacement for specific systems.
- `buildLifeReadingV4`, `buildTopicReadingV4`, `buildNewyearReadingV4`, `buildGunghapReadingV4`, `buildNameReadingV4`, `buildZiweiReadingV4`, `buildMonthlyReadingV4`, `buildDaypickReadingV4`: all live paid report builders. Legacy functions remain for regressions; do not spend work only on legacy code.
- wrapper `renderSajuPaid` → `renderSajuPaidV2`; `renderExtraPaid` → ziwei or topic. Newyear live wrapper at ~10224. gunghap/name live wrapper near bottom. Most live reports `.lv4-sec` with specific ids/headings.
- Free: `renderDailyFortune`, `renderManseryeok`/Expanded; `journeyOverviewHTML`, char/fingerprint/past hooks; `renderVedicFree`, `renderMahaboteFree`, `todayTarotResultHTML`.
- Tarot `generateTemplateReading` ~6287: 8 Markdown sections, lots of card base meanings and repeated advice. `finishTarotDraw` currently freezes first 2 computed sections even after payment via `mdMerge(keep, await generateAIReading(...skipSections))`. This blocks the strongest opening from being truly synthesized. Change paid synthesis to support coherent entire text while preserving factual cards/preview lock/payment access.
- `buildAIReadingInput` sends question/topic/spread/cards incl position/orientation, categoryMeaning, advice/warning.
- `deepCollect`, `deepApply`, `hydrateDeepReading` ~20197: selects `.lv4-sec` except parent sections containing pilot articles; pilot sends article separately. Validated AI synthesis replaces paragraphs, preserves tables/charts/details. Actual natal refs via `readingSynthesisQuality`. Avoid parent-child duplicate requests/replacements.
- `readingProvenanceQuality`, `readingDeepQuality`: prevent unsupported past events, ungrounded years, duplicate/generic text, wrong marital state. Extend responsibly for all domains. Validation != predictive accuracy.
- `hydrateDeepReading` currently sends ALL sections in one `/reading` request, may truncate with 14k max output tokens; use bounded groups if needed, retain valid results and avoid duplicate calls.
- Client AI cache prefix current `saju_ai_reading_v10-editorial:`. New version must invalidate obsolete wording WITHOUT clearing paid tokens/history entitlements.
- `mdSections`, `mdMerge`, `lv4FromMarkdown`, `previewLockHTML`, report wrappers/locks: keep blur/chapter/short computed preview layout; don't remove calculated explanations.

### assets/astrology.js
- Actual astronomy engine calculating planets/aspects/houses/transits. All 12 paid topics.
- `generateTemplateAstrologySummary` currently list sun/moon/venus signs.
- `astroPracticalReading` ~750: one selected planet per topic + common practical advice, weak multi-factor synthesis.
- `astroPreviewTemplate`: only first heading filled with summary/practical, remaining placeholders locked in preview.
- `generateTodayAstrology`: 4 long paras, real natal/transit aspects. Preserve actual calculation; concise integrated interpretation, no invented events.
- Paid AI generation path also retains first sections with mdMerge/skipSections. Review `generateAstrologyReading` and result flow near file end.
- Flow/history caches must not replay old generated text as new revision or charge/revoke existing paid access accidentally.

### worker/saju-chat-worker.js
- `/reading` handler: allowed category list incl life-core/newyear-core/topic-answer/reading-deep/report-tpl, paid auth, provider fallback.
- Current max output: report-tpl 16000 OpenAI/12000 Anthropic; deep 14000/9000. Do not blindly send 50 chapter rewrites at once.
- Tarot prompts `buildTarotReadingSystemPrompt/UserPrompt` ~733/764; asks 1200–4000 chars depending cards and 8 sections. Questions/cards already structured. Improve editorial policy and avoid questionnaire reflection filling output.
- Astrology prompts `buildAstrologyReadingSystemPrompt/UserPrompt` ~957/1114; actual charts only.
- `READING_PROVENANCE_RULES` ~1590, `buildReadingSystemPrompt`, `buildReadingUserPrompt`: shared guardrails, synthesis refs/editorial brief. `editorialBrief(raw)` sanitizer exists. Extend cross-system chapter briefs only as needed, whitelist and cap lengths, treat client narrative as untrusted draft. No arbitrary system override from user question.
- `/report-pdf` text PDF rendering via browser binding. Existing paid category auth and per-order limit PDF_ORDER_LIMIT=8. `/email-report` validates PDF product, existing sending and refund/block protections. Do not change access/charge/sending policy.
- AI no global request-specific mutable state/floating promises, no secrets in code. Cloudflare current best practices read by Codex: https://developers.cloudflare.com/workers/best-practices/workers-best-practices/ . Follow Cloudflare/worker skills if changing worker runtime.

### assets/report-pdf.js — existing 14 products
- `RP_MAX_CHARS=58000` leaves headroom under user 60k ceiling; enforce TOTAL final chars, not per-section limit. Current budget `Math.max(3000,MAX-main-600)` can exceed total when main is large: make robust.
- `RP_VERSION='v8-editorial'` must bump with semantic revisions.
- `SPECS`: 14 templates, defined headings and charts: life/newyear/gunghap/name/ziwei/9 topic categories. No current tarot/astrology PDF product; don't invent a new paid product/price without need. All existing PDFs must be revised. Make source system coverage explicit in report.
- `rpCollect` gets real category HTML plus saju/meta, topic model, daeun, newyear/pair/ziwei specialized data.
- `rpReadingSections`: DOM extraction incl editorial roles. Ignores charts/images, gathers `.lv4-sec` text. `rpSourceStory` fallback often reuses same four paragraphs or picks unrelated same-domain paragraphs. Needs genuinely chapter-specific integrated fallback, no unrelated pasting/repetition.
- `rpPlan`: groups <=5 headings and <=18 fields. Heads currently only id/chapter/title/hint. Add per-heading interpretive focus/actual relevant evidence as appropriate.
- `rpAI`: sends `report-tpl`, detailedReading truncated 17k, facts, sections/fields; retries2, all groups currently `Promise.all`. Recommend bounded concurrency, no refetch successful groups, verify per-order `requirePaid` report-tpl usage limits before increasing requests. Existing cache keyed category/scope/group/version/info + counsel fingerprint.
- `rpSectionQuality` only >=160 chars/2 paras, `rpEnough` presence check: deeper but bounded quality check; source refs/disallowed year/events/category mismatch should be checked before adoption.
- `rpFill` fills blank AI slots with web excerpts; deepen per chapter without padding same stocktext. PDF should be more detailed than web yet useful/conditional, with reasons/contradictions/alternatives/timing evidence/question-specific interpretation. No need 60k exactly.
- `buildTemplateReport({skipAI,dryRun})` returns host/pages/chars/ai/groups. Text PDF path first, canvas fallback. Use real pagination/browser print QA; not jsdom layout as proof.
- Keep original user input time + corrected time reference in web/PDF/email, typo/orphan rules, names not sent unnecessarily.
- PDF email extra info dialog is separate; preserve and merge structured user-stated counsel, don't ask same job twice or require irrelevant optional info.

## Suggested execution and acceptance

1. Inventory all exposed generators and outputs in a checked-in coverage doc. Snapshot current diffs to avoid accidental loss. No arbitrary broad text replace across dead/live functions.
2. Define shared quality contract/compact chapter briefs; use actual evidence + domain/age/marital/current stated context. Short web reports should lead with interpretation, not list theory or issue general to-do lists. Fold technical supporting evidence.
3. Implement coherent deterministic fallback per system for free/preview/AI unavailable. AI paid response should **replace** corresponding prose, not append a second long report. Strengthen all categories, not only three pilot articles.
4. Improve model prompts and request grouping/response validation; increase AI role through coherent synthesis, not merely extra length/tokens or changing model names. Keep billing/payment gates, rate/order limits and no paid AI generation in locked preview. Client brief/source referenced actual facts validated before displayed. No ratios/accuracy promises.
5. Deepen all 14 existing PDFs with distinct chapter interpretations and enforce entire report <60k. Facts/charts remain actual system specific. PDF source labels, chapter coverage and fallback quality are visible/reviewable.
6. Tests: every free and paid category, 12 tarot +12 astrology topics, ziwei placement combination, pair vs individual, names, child/student/working/retired, single/dating/married, unknown time, user statement owner separation; no invented year/event/card/planet/star. Compare generated web lengths before/after: substantive compact rewrite, not blanket appended blocks. All report chapter ids/fields covered; PDF chars <=60000, no repeated unrelated filler, long content pagination no clipping.
7. Run npm test (existing full suite passed right before this request; new job test included). Add meaningful cross-system depth tests incl actual structured AI prompt/response fixtures and failure branches. Update stale expected-copy assertions rather than weakening semantic/access checks.
8. `npm run audit:reading` available; tools/lib/reading-runtime.js uses jsdom + mocked fetch with fixed Date2026-10-28, helper run/set/fixture/text. Inline scripts executed, external astro explicitly loaded. New external assets need runtime helper/test loads, don't accidentally make tests evaluate old path.
9. Real visual QA local web + representative PDF render pages (cover/long body/table/lastpage), not paid live API/payment/email. No predictive accuracy claims or real AI outputs claimed based on mocked tests. If live configured model calls are needed, use a bounded explicit test within authorized service budget and disclose accurately; never print credentials.
10. Cache bust SHA refs in index for reading-flow.css/report-pdf.js/astrology.js as needed; don't globally wipe paid state. Final Korean report: what changed, exact coverage, AI role, tests, limitations/live model verification and push/deploy status. Keep work running until actual implementation completed; if blocked, say concrete blocker and preserve unfinished checklist. Do not mark done after handoff doc/prompts alone.

## Tools / skills

Read repo AGENTS.md. Cloudflare + worker-best-practices skill for worker edits. PDF skill for exported sample PDF render/QA; its artifact-start helper requirement is only for artifact authoring (find runtime helper rather than guess). Orca executable `/usr/local/bin/orca`; `orca skills get orca-cli --json` guide already available at `/tmp/saju-orca-guide.txt`. `claude` exists at `/Users/kangmin/.local/bin/claude`. No use of raw ad hoc subprocess for launching agent; Orca agent launch is established.

Previous local web server on 8775 may still serve repo, editorial review 8777. Confirm before using. CUA is allowed browser UI; no shell AppleScript. Use new ephemeral QA tab. If creating user-facing sample PDF follow PDF skill render+inspection; do not send email or execute payment in QA.
