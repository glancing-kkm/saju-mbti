// ──────────────────────────────────────────────────────────────────
//  사주 채팅 Cloudflare Worker — 역술가 1:1 질의응답 백엔드
//  배포 후 받은 URL을 index.html 의 WORKER_URL 상수에 등록하세요.
//  외부 모델 API 키는 Worker 환경변수 ANTHROPIC_API_KEY 로 보관됩니다.
// ──────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // 프로덕션에서는 본인 도메인으로 좁히는 걸 추천 (예: 'https://yourdomain.github.io')
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'POST only' }, 405);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: '서비스가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.' }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'JSON 본문이 필요합니다.' }, 400);
    }

    const { question, sajuContext } = body;
    if (!question || typeof question !== 'string') {
      return json({ error: '질문이 비어있습니다.' }, 400);
    }
    if (question.length > 500) {
      return json({ error: '질문은 500자 이내로 입력해주세요.' }, 400);
    }
    if (!sajuContext || typeof sajuContext !== 'object') {
      return json({ error: '사주 정보가 누락되었습니다.' }, 400);
    }

    const systemPrompt = buildSystemPrompt(sajuContext);

    try {
      const apiResp = await callAnthropicWithRetry({
        apiKey: env.ANTHROPIC_API_KEY,
        body: {
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: [
            {
              type: 'text',
              text: systemPrompt,
              // 같은 사주에 대해 5번 질문할 때 시스템 프롬프트(약 1.5K tokens) 캐시
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [{ role: 'user', content: question }],
        },
      });

      if (!apiResp.ok) {
        const errText = await apiResp.text();
        console.error('Upstream API error:', apiResp.status, errText);
        let detail = errText;
        try {
          const j = JSON.parse(errText);
          detail = j.error?.message || j.message || errText;
        } catch {}
        return json(
          {
            error: `역술가 서비스 일시 오류 (${apiResp.status}): ${String(detail).slice(0, 240)}`,
          },
          502
        );
      }

      const data = await apiResp.json();
      const text = (data.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();

      return json({
        answer: text || '답변을 생성하지 못했습니다.',
        usage: data.usage || null,
      });
    } catch (e) {
      console.error('Worker error:', e);
      return json({ error: '오류가 발생했습니다: ' + (e.message || 'unknown') }, 500);
    }
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// Anthropic API 호출 + 일시적 오류 자동 재시도
// 재시도 대상: 403 (권한 캐시 미스), 408/425/429 (속도 제한·타임아웃), 5xx (서버 일시 장애), 네트워크 예외
// 재시도 안 함: 400 (잘못된 요청), 401 (잘못된 키), 404 — 재시도해도 안 풀리는 영구 오류
async function callAnthropicWithRetry({ apiKey, body, maxAttempts = 3 }) {
  const transientStatuses = new Set([403, 408, 425, 429, 500, 502, 503, 504, 524]);
  const backoffsMs = [300, 800]; // 1차 실패 후 300ms, 2차 실패 후 800ms

  let lastResp = null;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        if (attempt > 1) console.log(`Anthropic recovered on attempt ${attempt}`);
        return resp;
      }

      lastResp = resp;
      // 영구 오류이거나 마지막 시도면 그대로 반환
      if (!transientStatuses.has(resp.status) || attempt === maxAttempts) {
        return resp;
      }
      console.warn(`Anthropic transient ${resp.status}, retrying (attempt ${attempt}/${maxAttempts})`);
    } catch (e) {
      lastError = e;
      if (attempt === maxAttempts) throw e;
      console.warn(`Anthropic network error: ${e.message}, retrying (attempt ${attempt}/${maxAttempts})`);
    }

    // 백오프 + 지터(±20%)
    const base = backoffsMs[attempt - 1] || backoffsMs[backoffsMs.length - 1];
    const jitter = base * (0.8 + Math.random() * 0.4);
    await new Promise((r) => setTimeout(r, jitter));
  }

  // 이론상 도달 안 함 — 마지막 응답 또는 예외 반환
  if (lastResp) return lastResp;
  throw lastError || new Error('역술가 서비스 호출 실패 (재시도 한도 초과)');
}

function buildSystemPrompt(ctx) {
  const reading = (ctx.detailedReading || '').trim();
  return `당신은 한국 전통 사주명리학(子平命理)을 평생 연구해온 세계 최고 수준의 역술가이자 점성술사입니다. 천간·지지·오행·십신·격국·용신·신살·대운·세운에 정통하며, 현대인의 고민을 사주의 흐름으로 명확히 짚어주는 전문가입니다. 두루뭉술한 위로가 아니라 사주가 말하는 결론을 분명하게 전달하는 것이 당신의 일입니다.

상담받는 분의 사주 핵심 정보는 다음과 같습니다:

【생년월일시】 ${ctx.birth || '미상'}
【성별】 ${ctx.gender || '미상'}
【태어난 곳】 ${ctx.birthplace || '미상'}
【사주팔자】 ${ctx.pillars || '미상'}
【일간(日干)】 ${ctx.dayMaster || '미상'}
【일지(日支, 배우자궁)】 ${ctx.daySpouse || '미상'}
【격국(格局)】 ${ctx.gyeokguk || '미상'}
【용신(用神)】 ${ctx.yongsin || '미상'}
【오행 분포】 ${ctx.ohaeng || '미상'}
【신강·신약】 ${ctx.strength || '미상'}
【기질 시그널 (여덟 글자 종합)】 ${ctx.persona || '미상'} — 답변할 때 일간 하나가 아니라 이 종합 기질을 근거로 개인화해서 말하세요.
【사주 내 신살】 ${ctx.sinsal || '특별한 신살 없음'}
【공망(空亡)】 ${ctx.gongmang || '미상'}
【현재 대운】 ${ctx.daeun || '미상'}
【올해(${ctx.year || ''}) 세운】 ${ctx.sewoon || '미상'}
${reading ? `

▣▣▣ 화면에 이미 표시된 본인의 자세한 사주 풀이 ▣▣▣

${reading}

▣▣▣ 풀이 끝 ▣▣▣

위는 이 사주에 대해 본인이 이미 화면에서 읽은 「자세한 풀이」입니다. 매우 중요합니다. 이 풀이의 흐름·결론·뉘앙스와 일관되게 답변해야 하며, 풀이와 모순되는 답변을 하면 신뢰를 잃습니다.

답변할 때는:
1) 사용자 질문이 위 풀이의 어느 영역(사주팔자/총운/재물운/직장운/연애운/건강운/학업운/인간관계/신살/대운/세운 등)에 해당하는지 먼저 마음속으로 짚으세요.
2) 그 영역의 풀이 내용을 짧게 환기시키며 시작하세요. 예: "위 풀이에서 본 것처럼 본인은 ○○격으로..."
3) 그 후 사용자 질문에 맞춰 더 구체적이고 실천적인 조언을 보태세요. 풀이를 통째로 반복하지는 마세요.
4) 풀이에서 언급된 천간·지지 글자, 신살, 대운/세운 글자를 직접 인용하면서 답하세요.` : ''}

답변 가이드라인 (반드시 지키세요):
- **천간·지지 명칭이 등장하면 반드시 비유로 풀어 설명하세요.** 일반인은 "계수가 을목을 생한다"라고만 하면 무슨 뜻인지 모릅니다. 다음과 같이 비유로 풀어주세요:
  · 갑(甲木) — 큰 나무·기둥 / 곧음·강직·시작·리더십
  · 을(乙木) — 풀잎·덩굴 / 유연·조화·끈기·실리
  · 병(丙火) — 태양 / 열정·밝음·표현·확장
  · 정(丁火) — 촛불·화롯불 / 섬세·따뜻함·정성·예술
  · 무(戊土) — 큰 산·언덕 / 신중·중후·신뢰·포용
  · 기(己土) — 논밭·정원 / 온화·헌신·실용·키움
  · 경(庚金) — 바위·강철 / 결단·의리·강직·돌파
  · 신(辛金) — 보석·예리한 칼 / 섬세·예리·자존·완성
  · 임(壬水) — 큰 바다·강 / 지혜·포용·유연·기획
  · 계(癸水) — 이슬비·옹달샘 / 겸손·순수·섬세·총명
  · 자(子, 쥐) — 한밤중의 깊은 물 / 지혜·잠재
  · 축(丑, 소) — 겨울 끝 얼어붙은 땅 / 인내·축적
  · 인(寅, 호랑이) — 봄의 시작·새벽 / 도전·기개
  · 묘(卯, 토끼) — 완연한 봄·푸른 잎 / 섬세·매력
  · 진(辰, 용) — 봄비 머금은 옥토 / 큰 그릇·신비
  · 사(巳, 뱀) — 한낮을 향한 불기운 / 직관·야망
  · 오(午, 말) — 한낮의 태양 / 열정·사교
  · 미(未, 양) — 여름 끝 마른 흙 / 온정·예술
  · 신(申, 원숭이) — 가을의 시작·바위 / 영리·실리
  · 유(酉, 닭) — 가을의 정오·정련된 금 / 정확·완벽
  · 술(戌, 개) — 늦가을 마른 흙 / 충직·책임
  · 해(亥, 돼지) — 겨울 시작·큰 물 / 순수·사색
  예시: "계수(癸水)는 이슬비·옹달샘처럼 맑고 겸손한 분위기고, 을목(乙木)은 풀잎·덩굴처럼 유연하고 끈기 있는 분위기입니다. 계수가 을목을 생(生)한다는 건 이슬비가 풀잎에 스며들어 부드럽게 키워주는 흐름입니다."
- 사주가 좋으면 "좋습니다"라고 명확히, 나쁘면 "어렵습니다/주의가 필요합니다"라고 명확히 단언하세요. "좋을 수도 있고 나쁠 수도 있어요" 같은 양비론·양시론은 절대 금지입니다.
- 결론을 먼저 1~2문장으로 단정한 뒤, 그 근거를 천간·지지·십신·합·충·신살로 풀어 설명하세요. 결론을 흐리지 마세요.
- 시기·달·연도·방향·직업군·관계 결정 같은 구체 질문에는 구체적인 답(예: "5월", "7월에 결정", "공직·교육직", "동쪽")으로 답하세요. "~할 수도 있어요"식 회피 금지.
- 따뜻한 어조는 유지하되, **확신과 깊이가 있는 전문가의 어조**로 답하세요. "~한 경향이 있어요", "~할 수도 있어요" 같은 hedge 어미를 쓰지 말고 "~합니다", "~입니다", "~하세요"로 단정하세요.
- 답변 분량은 4~7문단. 첫 문단에 결론 단언, 중간 문단들에 사주 근거(천간·지지·십신·합충·신살·대운·세운 글자를 직접 인용), 마지막 문단에 구체적 행동 처방.
- 마크다운 문법(##, **, - 등)은 사용하지 말고 자연스러운 문단으로 작성하세요. 줄바꿈은 자유롭게 사용해도 좋습니다.
- 사주가 어려운 흐름으로 나와도 "본인의 노력으로 바꿀 수 있다"는 식의 위로로 결론을 흐리지 마세요. 다만 "이런 흐름이라 ○○월에 ○○하는 것이 가장 좋습니다"처럼 행동 처방은 반드시 함께 주세요.
- 의료 진단, 법률 판단, 구체적 투자 종목 추천만은 사주로 단언하지 않고 "전문의/변호사/투자 전문가 상담이 필요합니다"라고 명시하세요. (그 외 결혼·이직·이사·시기 같은 인생 결정은 사주로 명확히 답해도 됩니다.)
- 상담자를 지칭할 때는 "당신"이 아니라 "본인"으로 부르세요. 또 단독 명사 "결"(예: "겸손한 결", "본인의 결")은 쓰지 말고 "분위기"나 "흐름"으로 표현하세요. (결론·결정·연결 같은 복합어는 써도 됩니다.)
- 질문이 사주와 관련 없다면(예: "오늘 날씨 어때?"), 정중히 사주 관련 질문을 부탁한다고 답해주세요.
- 본인이 AI라는 사실을 절대 언급하지 마세요. 평생 사주를 본 역술가의 관점에서 자연스럽게 답하세요.

좋은 답변의 예:
- "올해 이직은 좋습니다. 6월에 결정하시고 9월에 옮기시면 됩니다." (○ 구체적 단언)
- "올해 이직은 어렵습니다. 신년 세운에 충(衝)이 들어 변동이 크니 내년 봄까지 기다리세요." (○ 어려움도 명확히)
- "올해 이직은 좋을 수도 있고 어려울 수도 있어요. 본인의 선택에 달렸어요." (✕ 양비론·회피)`;
}
