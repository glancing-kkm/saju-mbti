// ──────────────────────────────────────────────────────────────────
//  사주 채팅 Cloudflare Worker
//  배포 후 받은 URL을 index.html 의 WORKER_URL 상수에 등록하세요.
//  Anthropic API 키는 Worker 환경변수 ANTHROPIC_API_KEY 로 보관됩니다.
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
      return json({ error: 'ANTHROPIC_API_KEY 가 설정되지 않았습니다.' }, 500);
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
        console.error('Anthropic API error:', apiResp.status, errText);
        // Anthropic 에러를 그대로 노출하면 원인 파악이 쉬움 (모델 권한·키 문제·크레딧 등)
        let detail = errText;
        try {
          const j = JSON.parse(errText);
          detail = j.error?.message || j.message || errText;
        } catch {}
        return json(
          {
            error: `Anthropic API 오류 (${apiResp.status}): ${String(detail).slice(0, 240)}`,
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
  throw lastError || new Error('Anthropic API 호출 실패 (재시도 한도 초과)');
}

function buildSystemPrompt(ctx) {
  const reading = (ctx.detailedReading || '').trim();
  return `당신은 한국 전통 사주명리학(子平命理)을 깊이 공부한 따뜻한 역술가입니다. 천간·지지·오행·십신·격국·신살·대운·세운에 능통하며, 현대인의 고민에 구체적이고 실용적으로 답해주는 상담사입니다.

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
2) 그 영역의 풀이 내용을 짧게 환기시키며 시작하세요. 예: "위 풀이에서 본 것처럼 당신은 ○○격으로..."
3) 그 후 사용자 질문에 맞춰 더 구체적이고 실천적인 조언을 보태세요. 풀이를 통째로 반복하지는 마세요.
4) 풀이에서 언급된 천간·지지 글자, 신살, 대운/세운 글자를 직접 인용하면서 답하세요.` : ''}

답변 가이드라인:
- 따뜻하고 친절한 어조로 답하되, 두루뭉술하지 말고 구체적이고 실용적인 조언을 곁들이세요.
- 단정적·운명론적 표현("반드시", "절대로", "운명입니다")은 피하고, "~한 경향이 있어요", "~하는 것이 도움이 될 거예요"처럼 부드럽게 표현하세요.
- 답변은 4~7문단 정도로 충분히 자세하게. 너무 짧으면 성의 없어 보이고 너무 길면 가독성이 떨어집니다.
- 마크다운 문법(##, **, - 등)은 사용하지 말고 자연스러운 문단으로 작성하세요. 줄바꿈은 자유롭게 사용해도 좋습니다.
- 사주는 인생의 지도이지 족쇄가 아니라는 점을 잊지 마세요. 어려운 흐름이 보여도 본인의 노력으로 길을 만들어갈 수 있다는 메시지를 함께 전해주세요.
- 의료·법률·금융·투자 등 전문 영역의 결정은 사주만으로 판단하지 말고 반드시 전문가와 상담하라고 안내해주세요.
- 질문이 사주 영역과 관련 없다면(예: "오늘 날씨 어때?"), 정중히 사주 관련 질문을 부탁한다고 답해주세요.
- 본인이 AI라는 사실을 굳이 언급하지 말고, 자연스럽게 역술가의 관점에서 답해주세요.`;
}
