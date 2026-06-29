// ──────────────────────────────────────────────────────────────────
//  사주 채팅 Cloudflare Worker — 역술가 1:1 질의응답 백엔드
//  배포 후 받은 URL을 index.html 의 WORKER_URL 상수에 등록하세요.
//  외부 모델 API 키는 Worker 환경변수 OPENAI_API_KEY / ANTHROPIC_API_KEY / HERMES_API_KEY 로 보관됩니다.
// ──────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // 프로덕션에서는 본인 도메인으로 좁히는 걸 추천 (예: 'https://yourdomain.github.io')
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const QNA_QUESTION_MAX_CHARS = 300;
const LANGUAGE_META = {
  ko: {
    code: 'ko',
    label: 'Korean',
    instruction: 'Write the final answer in Korean only. Use warm, friendly Korean honorific style.',
  },
  en: {
    code: 'en',
    label: 'English',
    instruction: 'Write the final answer in natural English only. Keep Korean saju terms only when they are part of the birth chart labels, and explain them plainly.',
  },
  zh: {
    code: 'zh',
    label: 'Chinese',
    instruction: 'Write the final answer in natural Simplified Chinese only. Keep Korean saju terms only when they are part of the birth chart labels, and explain them plainly.',
  },
  ja: {
    code: 'ja',
    label: 'Japanese',
    instruction: 'Write the final answer in natural Japanese only. Keep Korean saju terms only when they are part of the birth chart labels, and explain them plainly.',
  },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'POST only' }, 405);
    }
    if (url.pathname === '/reading') {
      return handleReading(request, env);
    }
    if (url.pathname === '/translate') {
      return handleTranslate(request, env);
    }
    const hermesEnabled = env.HERMES_API_URL && (env.AI_PROVIDER || '').toLowerCase() === 'hermes';
    if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !hermesEnabled && !env.AI) {
      return json({ error: '서비스가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.' }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'JSON 본문이 필요합니다.' }, 400);
    }

    const { question, sajuContext, category, clientId, deviceFingerprint, sajuId, freeQuestion, language } = body;
    if (!question || typeof question !== 'string') {
      return json({ error: '질문이 비어있습니다.' }, 400);
    }
    if (question.length > QNA_QUESTION_MAX_CHARS) {
      return json({ error: `질문은 ${QNA_QUESTION_MAX_CHARS}자 이내로 입력해주세요.` }, 400);
    }
    if (!sajuContext || typeof sajuContext !== 'object') {
      return json({ error: '사주 정보가 누락되었습니다.' }, 400);
    }

    const chatCategory = typeof category === 'string' ? category : 'life';
    const lang = normalizeLanguage(language);
    const freeGuardKeys = chatCategory === 'qna' && freeQuestion
      ? await qnaFreeGuardKeys({ request, sajuContext, clientId, deviceFingerprint, sajuId })
      : [];
    if (freeGuardKeys.length && await qnaFreeGuardUsed(env, freeGuardKeys)) {
      return json({ error: '무료 질문은 이미 사용했어요. 계속 질문하려면 질문권을 충전해 주세요.', code: 'QNA_FREE_USED' }, 402);
    }
    const cacheKey = await qnaCacheKey({ question, sajuContext, category: chatCategory, language: lang.code });
    const cached = await qnaCacheGet(env, cacheKey);
    if (cached) {
      if (freeGuardKeys.length) await qnaFreeGuardMark(env, freeGuardKeys);
      return json({ answer: cached.answer, provider: cached.provider || 'cache', cached: true });
    }

    const route = chooseQnaModel(question, sajuContext, env);
    const systemPrompt = buildSystemPrompt(sajuContext, chatCategory, lang);
    const userPrompt = buildQnaUserPrompt(question, sajuContext, chatCategory, route, lang);

    try {
      if (hermesEnabled) {
        try {
          const result = await callHermesAgent({
            baseUrl: env.HERMES_API_URL,
            apiKey: env.HERMES_API_KEY || '',
            systemPrompt,
            userPrompt,
          });
          await qnaCacheSet(env, cacheKey, { answer: result.text, provider: 'hermes' });
          if (freeGuardKeys.length) await qnaFreeGuardMark(env, freeGuardKeys);
          return json({ answer: result.text || '답변을 생성하지 못했습니다.', provider: 'hermes', usage: result.usage || null });
        } catch (e) {
          console.warn('Hermes QNA failed, trying other providers:', e && e.message);
        }
      }

      if (env.OPENAI_API_KEY) {
        try {
          const result = await callOpenAIResponses({
            apiKey: env.OPENAI_API_KEY,
            model: route.model,
            systemPrompt,
            userPrompt,
            maxOutputTokens: route.maxOutputTokens,
            reasoningEffort: route.reasoningEffort,
            verbosity: route.verbosity,
          });
          await qnaCacheSet(env, cacheKey, { answer: result.text, provider: 'openai', model: route.model });
          if (freeGuardKeys.length) await qnaFreeGuardMark(env, freeGuardKeys);
          return json({
            answer: result.text || '답변을 생성하지 못했습니다.',
            provider: 'openai',
            model: route.model,
            route: route.name,
            usage: result.usage || null,
          });
        } catch (e) {
          console.warn('OpenAI QNA failed, falling back to Anthropic if available:', e && e.message);
          if (!env.ANTHROPIC_API_KEY) throw e;
        }
      }

      if (env.ANTHROPIC_API_KEY) {
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
            messages: [{ role: 'user', content: userPrompt }],
          },
        });

        if (!apiResp.ok) {
          const errText = await apiResp.text();
          console.warn('Anthropic QNA failed, falling back to Workers AI if available:', apiResp.status, errText.slice(0, 240));
        } else {
          const data = await apiResp.json();
          const text = (data.content || [])
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('\n')
            .trim();

          const answer = text || '답변을 생성하지 못했습니다.';
          await qnaCacheSet(env, cacheKey, { answer, provider: 'anthropic' });
          if (freeGuardKeys.length) await qnaFreeGuardMark(env, freeGuardKeys);
          return json({
            answer,
            provider: 'anthropic',
            usage: data.usage || null,
          });
        }
      }

      if (env.AI) {
        const result = await callWorkersAIChat({
          ai: env.AI,
          model: env.WORKERS_AI_QNA_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8',
          systemPrompt,
          userPrompt,
          maxTokens: route.maxOutputTokens || 1400,
        });
        if (result.text) {
          await qnaCacheSet(env, cacheKey, { answer: result.text, provider: 'workers-ai', model: result.model });
          if (freeGuardKeys.length) await qnaFreeGuardMark(env, freeGuardKeys);
          return json({ answer: result.text, provider: 'workers-ai', model: result.model, usage: result.usage || null });
        }
      }

      return json({ error: '답변을 잠시 생성하지 못했습니다.', code: 'AI_TEMPORARY_UNAVAILABLE' }, 503);
    } catch (e) {
      console.error('Worker error:', e);
      return json({ error: '답변을 잠시 생성하지 못했습니다.', code: 'AI_TEMPORARY_UNAVAILABLE' }, 503);
    }
  },
};

async function handleReading(request, env) {
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !env.AI) {
    return json({ error: '개인화 리딩 서비스가 아직 준비되지 않았습니다.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON 본문이 필요합니다.' }, 400);
  }

  const { category, sajuContext, meta, language } = body || {};
  const allowed = new Set(['life', 'life-core', 'newyear', 'newyear-core', 'gunghap', 'life-gunghap']);
  if (!allowed.has(category)) {
    return json({ error: '지원하지 않는 리딩 카테고리입니다.' }, 400);
  }
  if (!sajuContext || typeof sajuContext !== 'object') {
    return json({ error: '사주 정보가 누락되었습니다.' }, 400);
  }

  const lang = normalizeLanguage((meta && meta.language) || language);
  const promptMeta = { ...(meta || {}), language: lang };
  const systemPrompt = buildReadingSystemPrompt(category, promptMeta);
  const userPrompt = buildReadingUserPrompt(category, sajuContext, promptMeta);
  const coreReading = isCoreReadingCategory(category);

  try {
    if (env.OPENAI_API_KEY) {
      try {
        const result = await callOpenAIResponses({
          apiKey: env.OPENAI_API_KEY,
          model: coreReading ? (env.OPENAI_READING_CORE_MODEL || env.OPENAI_MODEL || 'gpt-5.4-mini') : (env.OPENAI_MODEL || 'gpt-5.4-mini'),
          systemPrompt,
          userPrompt,
          maxOutputTokens: coreReading ? 3800 : 1800,
          reasoningEffort: coreReading ? 'medium' : 'low',
          verbosity: 'medium',
        });
        return json({ ok: true, provider: 'openai', text: result.text, usage: result.usage || null });
      } catch (e) {
        console.warn('OpenAI reading failed, falling back to Anthropic if available:', e && e.message);
        if (!env.ANTHROPIC_API_KEY) throw e;
      }
    }

    if (env.ANTHROPIC_API_KEY) {
      const apiResp = await callAnthropicWithRetry({
        apiKey: env.ANTHROPIC_API_KEY,
        body: {
          model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
          max_tokens: coreReading ? 3800 : 1800,
          system: [{ type: 'text', text: systemPrompt }],
          messages: [{ role: 'user', content: userPrompt }],
        },
      });
      if (apiResp.ok) {
        const data = await apiResp.json();
        const text = (data.content || [])
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim();
        return json({ ok: true, provider: 'anthropic', text: text || '', usage: data.usage || null });
      }
      const errText = await apiResp.text();
      console.warn('Reading Anthropic failed, falling back to Workers AI if available:', apiResp.status, errText.slice(0, 240));
    }
    if (env.AI) {
      const result = await callWorkersAIChat({
        ai: env.AI,
        model: env.WORKERS_AI_READING_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8',
        systemPrompt,
        userPrompt,
        maxTokens: coreReading ? 3800 : 1800,
      });
      if (result.text) return json({ ok: true, provider: 'workers-ai', model: result.model, text: result.text, usage: result.usage || null });
    }
    return json({ error: '개인화 리딩을 잠시 생성하지 못했습니다.', code: 'AI_READING_TEMPORARY_UNAVAILABLE' }, 503);
  } catch (e) {
    console.error('Reading worker error:', e);
    return json({ error: '개인화 리딩을 잠시 생성하지 못했습니다.', code: 'AI_READING_TEMPORARY_UNAVAILABLE' }, 503);
  }
}

async function handleTranslate(request, env) {
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !env.AI) {
    return json({ error: '번역 서비스가 아직 준비되지 않았습니다.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON 본문이 필요합니다.' }, 400);
  }

  const lang = normalizeLanguage(body && (body.targetLanguage || body.language));
  if (lang.code === 'ko') return json({ ok: true, texts: Array.isArray(body.texts) ? body.texts : [] });

  const texts = (Array.isArray(body.texts) ? body.texts : [])
    .slice(0, 220)
    .map((t) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, 900));
  if (!texts.length) return json({ ok: true, texts: [] });

  const systemPrompt = `You are a translation engine for a saju fortune web app.
Translate Korean UI and reading text into ${lang.label}.
Rules:
- Return strict JSON only: an array of strings with the same length and order as the input.
- Preserve numbers, dates, prices, emojis, HTML entity-like text, and standalone birth-chart labels.
- Do not add explanations, markdown, bullets, or extra keys.
- Keep the tone warm and advisory.`;
  const userPrompt = JSON.stringify({ targetLanguage: lang.label, texts });

  try {
    let raw = '';
    if (env.OPENAI_API_KEY) {
      try {
        const result = await callOpenAIResponses({
          apiKey: env.OPENAI_API_KEY,
          model: env.OPENAI_TRANSLATE_MODEL || env.OPENAI_MODEL || 'gpt-5.4-mini',
          systemPrompt,
          userPrompt,
          maxOutputTokens: 7000,
          reasoningEffort: 'low',
          verbosity: 'low',
        });
        raw = result.text || '';
      } catch (e) {
        console.warn('OpenAI translate failed, falling back to Anthropic if available:', e && e.message);
        if (!env.ANTHROPIC_API_KEY) throw e;
      }
    }
    if (!raw && env.ANTHROPIC_API_KEY) {
      const apiResp = await callAnthropicWithRetry({
        apiKey: env.ANTHROPIC_API_KEY,
        body: {
          model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
          max_tokens: 7000,
          system: [{ type: 'text', text: systemPrompt }],
          messages: [{ role: 'user', content: userPrompt }],
        },
      });
      if (apiResp.ok) {
        const data = await apiResp.json();
        raw = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      } else {
        const errText = await apiResp.text();
        console.warn('Anthropic translate failed, falling back to Workers AI if available:', apiResp.status, errText.slice(0, 240));
      }
    }
    if (!raw && env.AI) {
      const result = await env.AI.run(env.WORKERS_AI_TRANSLATE_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 5000,
      });
      raw = extractWorkersAIText(result);
    }
    if (!raw) return json({ error: '번역 서비스 일시 오류' }, 502);
    const translated = parseJsonArrayText(raw);
    if (!Array.isArray(translated)) throw new Error('translation parse failed');
    return json({ ok: true, texts: texts.map((t, i) => String(translated[i] || t)) });
  } catch (e) {
    console.error('Translate worker error:', e);
    return json({ error: '번역 생성 중 오류가 발생했습니다.' }, 500);
  }
}

function isCoreReadingCategory(category) {
  return category === 'life-core' || category === 'newyear-core';
}

function normalizeLanguage(input) {
  const raw = typeof input === 'string' ? input : input && (input.code || input.worker || input.lang);
  const code = String(raw || 'ko').toLowerCase().replace(/^cn$/, 'zh').replace(/^jp$/, 'ja');
  return LANGUAGE_META[code] || LANGUAGE_META.ko;
}

function languageInstruction(input) {
  return normalizeLanguage(input).instruction;
}

function parseJsonArrayText(raw) {
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.texts)) return parsed.texts;
  } catch {}
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }
  return null;
}

function extractWorkersAIText(result) {
  if (!result) return '';
  if (typeof result === 'string') return result.trim();
  if (typeof result.response === 'string') return result.response.trim();
  if (typeof result.result === 'string') return result.result.trim();
  if (typeof result.text === 'string') return result.text.trim();
  if (Array.isArray(result.choices)) {
    return result.choices
      .map((c) => (c && c.message && c.message.content) || c.text || '')
      .join('\n')
      .trim();
  }
  if (Array.isArray(result.output)) {
    return result.output
      .flatMap((item) => item.content || [])
      .map((part) => part.text || '')
      .join('\n')
      .trim();
  }
  return '';
}

async function callWorkersAIChat({ ai, model, systemPrompt, userPrompt, maxTokens = 1400 }) {
  if (!ai) return { text: '', model };
  try {
    const result = await ai.run(model, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
    });
    return { text: extractWorkersAIText(result), model, usage: result && result.usage ? result.usage : null };
  } catch (e) {
    console.warn('Workers AI QNA failed:', e && e.message);
    return { text: '', model };
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function callOpenAIResponses({ apiKey, model, systemPrompt, userPrompt, maxOutputTokens = 1800, reasoningEffort = 'low', verbosity = 'medium' }) {
  const body = {
    model,
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_output_tokens: maxOutputTokens,
  };
  if (/^gpt-5/i.test(model)) {
    body.reasoning = { effort: reasoningEffort };
    body.text = { verbosity };
  }
  const resp = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('OpenAI API error:', resp.status, errText);
    throw new Error(`OpenAI API error ${resp.status}`);
  }

  const data = await resp.json();
  const text =
    data.output_text ||
    (data.output || [])
      .flatMap((item) => item.content || [])
      .map((part) => part.text || '')
      .join('\n')
      .trim();
  return { text, usage: data.usage || null };
}

function chooseQnaModel(question, ctx, env = {}) {
  const q = String(question || '');
  const premiumPattern = /(결혼|이혼|재혼|배우자|궁합|이직|퇴사|창업|사업|승진|계약|소송|재판|부동산|투자|대출|건강|수술|임신|출산|자녀|진로|직업|돈|재물|올해|내년|시기|언제)/;
  const longOrContextHeavy = q.length >= 120 || String(ctx && ctx.detailedReading || '').length > 9000;
  const premium = premiumPattern.test(q) || longOrContextHeavy;
  return premium
    ? {
        name: 'premium',
        model: env.OPENAI_QNA_PREMIUM_MODEL || 'gpt-5.5',
        reasoningEffort: 'medium',
        verbosity: 'medium',
        maxOutputTokens: 1600,
        answerLength: '1,000~1,300자',
      }
    : {
        name: 'standard',
        model: env.OPENAI_QNA_MODEL || 'gpt-5.4-mini',
        reasoningEffort: 'low',
        verbosity: 'medium',
        maxOutputTokens: 1200,
        answerLength: '800~1,000자',
      };
}

function buildQnaUserPrompt(question, ctx, category, route = {}, language = 'ko') {
  return `카테고리: ${category || 'life'}
출력 언어: ${languageInstruction(language)}

사용자 질문:
${question}

위 질문에 답하세요. 답변은 본인의 사주 원국, 현재 10년 흐름, 올해 흐름, 화면 풀이 요약과 모순되지 않아야 합니다.
답변 길이는 공백 포함 ${route.answerLength || '800~1,000자'}를 목표로 하세요. 꼭 필요한 경우에만 10% 안에서 넘길 수 있고, 불필요한 반복 설명은 줄이세요.`;
}

async function callHermesAgent({ baseUrl, apiKey, systemPrompt, userPrompt }) {
  const url = String(baseUrl || '').replace(/\/$/, '');
  const resp = await fetch(url + '/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_output_tokens: 1600,
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    console.error('Hermes API error:', resp.status, errText);
    throw new Error(`Hermes API error ${resp.status}`);
  }
  const data = await resp.json();
  const text =
    data.output_text ||
    data.answer ||
    data.text ||
    (data.output || [])
      .flatMap((item) => item.content || [])
      .map((part) => part.text || '')
      .join('\n')
      .trim();
  return { text, usage: data.usage || null };
}

async function qnaCacheKey({ question, sajuContext, category, language }) {
  const src = JSON.stringify({
    v: 3,
    language: normalizeLanguage(language).code,
    category,
    question: String(question || '').trim().replace(/\s+/g, ' '),
    birth: sajuContext && sajuContext.birth,
    pillars: sajuContext && sajuContext.pillars,
    daeun: sajuContext && sajuContext.daeun,
    sewoon: sajuContext && sajuContext.sewoon,
    qaExtra: sajuContext && sajuContext.qaExtra,
  });
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(src));
  return 'qna:' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function qnaCacheGet(env, key) {
  if (!env.SAJU_QNA_CACHE || !key) return null;
  try {
    const raw = await env.SAJU_QNA_CACHE.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('QNA cache get failed:', e && e.message);
    return null;
  }
}

async function qnaCacheSet(env, key, value) {
  if (!env.SAJU_QNA_CACHE || !key || !value || !value.answer) return;
  try {
    await env.SAJU_QNA_CACHE.put(key, JSON.stringify({ ...value, cachedAt: Date.now() }), { expirationTtl: 24 * 60 * 60 });
  } catch (e) {
    console.warn('QNA cache put failed:', e && e.message);
  }
}

async function qnaFreeGuardKeys({ request, sajuContext, clientId, deviceFingerprint, sajuId }) {
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    request.headers.get('X-Real-IP') ||
    '';
  const ua = request.headers.get('User-Agent') || '';
  const lang = request.headers.get('Accept-Language') || '';
  const device = String(deviceFingerprint || '').slice(0, 900);
  const legacySajuBase = {
    v: 3,
    sajuId: String(sajuId || ''),
    birth: sajuContext && sajuContext.birth,
    pillars: sajuContext && sajuContext.pillars,
  };
  const candidates = [];
  if (clientId) candidates.push(['client-global-v1', { clientId: String(clientId) }]);
  if (ip) candidates.push(['ip-global-v1', { ip }]);
  if (device || ua || lang) candidates.push(['device-global-v1', { device, ua, lang }]);
  if (clientId || ip || device) candidates.push(['person-global-v1', { clientId: String(clientId || ''), ip, device, ua, lang }]);

  // 기존 배포에서 이미 기록된 "사주별 무료 사용" 키도 함께 확인해 현재 사주 재무료를 막는다.
  if (clientId) candidates.push(['client', { ...legacySajuBase, clientId: String(clientId) }]);
  if (ip) candidates.push(['ip', { ...legacySajuBase, ip }]);
  candidates.push(['saju-client-ip', { ...legacySajuBase, clientId: String(clientId || ''), ip }]);
  const keys = [];
  for (const [kind, value] of candidates) {
    const src = JSON.stringify({ kind, value });
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(src));
    keys.push('qna-free:' + kind + ':' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join(''));
  }
  return keys;
}

async function qnaFreeGuardUsed(env, keys) {
  if (!env.SAJU_QNA_CACHE || !Array.isArray(keys) || !keys.length) return false;
  try {
    for (const key of keys) {
      if (await env.SAJU_QNA_CACHE.get(key)) return true;
    }
    return false;
  } catch (e) {
    console.warn('QNA free guard get failed:', e && e.message);
    return false;
  }
}

async function qnaFreeGuardMark(env, keys) {
  if (!env.SAJU_QNA_CACHE || !Array.isArray(keys) || !keys.length) return;
  try {
    const value = JSON.stringify({ usedAt: Date.now() });
    await Promise.all(keys.map((key) => env.SAJU_QNA_CACHE.put(key, value, { expirationTtl: 24 * 60 * 60 })));
  } catch (e) {
    console.warn('QNA free guard put failed:', e && e.message);
  }
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

function buildReadingSystemPrompt(category, meta) {
  const lang = normalizeLanguage(meta && meta.language);
  const toneRule = lang.code === 'ko'
    ? `- 한국어 친근 존댓말로만 씁니다. "~예요 / ~이에요 / ~돼요 / ~해요 / ~세요"를 자연스럽게 쓰세요.
- 상담자를 "본인"이라고 부르세요. "당신"은 쓰지 마세요.`
    : `- ${languageInstruction(lang)}
- Use a warm, friendly advisory tone that feels like a skilled fortune reader speaking naturally.
- Do not call the user "당신". Use a natural second-person expression in the target language.`;
  const categoryGuide = {
    life: '인생총운 첫머리에 들어갈 개인화 리딩입니다. 본인의 성향, 돈과 일의 선택 기준, 관계에서 반복되는 패턴, 현재 흐름을 먼저 짚으세요.',
    'life-core': '인생총운의 주요 해석 문단 대부분을 AI로 다시 고도화하는 리딩입니다. 기존 계산형 풀이를 단순 요약하지 말고, 핵심 바탕·성향·재물·직업·연애·건강·인간관계·직업 적성·현재 10년 흐름·올해 흐름·평생 타임라인 요약·개운법을 본인 맞춤으로 재작성하세요. 사주판, 표, 점수, 차트는 화면에 따로 남으므로 문장 해석에 집중하세요.',
    newyear: `${meta.targetYear || '올해'} 신년운세 첫머리에 들어갈 개인화 리딩입니다. 한 해의 변화, 관계·일·돈에서 특히 눈여겨볼 흐름, 조심할 선택 습관을 짚으세요.`,
    'newyear-core': `${meta.targetYear || '올해'} 신년운세의 주요 해석 문단 대부분을 AI로 다시 고도화하는 리딩입니다. 기존 계산형 풀이를 바탕으로 올해 총론·재물·직업·연애·인간관계·건강·12개월 흐름·기회 시기·주의 시기·올해 행동 가이드를 본인 맞춤으로 재작성하세요. 점수 링, 월별 점수표, 차트는 화면에 따로 남으므로 문장 해석에 집중하세요.`,
    gunghap: '별도 궁합 카테고리 첫머리에 들어갈 개인화 리딩입니다. 두 사람의 끌림, 피로가 쌓이는 지점, 결혼·장기 관계 가능성, 바로 실천할 대화 방식을 짚으세요.',
    'life-gunghap': '인생총운 내부 궁합 결과 첫머리에 들어갈 개인화 리딩입니다. 본인 인생 흐름 안에서 이 관계가 어떤 의미인지, 가까워지는 방식과 조심할 반복 패턴을 짚으세요.',
  };
  const coreSections = category === 'life-core'
    ? (lang.code === 'ko'
      ? '[핵심 바탕], [성향·그릇], [재물], [직업·사업], [연애·결혼], [건강], [인간관계], [직업 적성], [현재 10년 흐름], [올해 흐름], [평생 타임라인 요약], [개운법]'
      : 'Use natural translated equivalents of: Core foundation, Character and capacity, Wealth, Career and business, Love and marriage, Health, Relationships, Career aptitude, Current 10-year flow, This year flow, Lifetime timeline summary, Practical remedy. Put each translated section title in square brackets.')
    : (lang.code === 'ko'
      ? '[올해 총론], [재물], [직업·사업], [연애·관계], [인간관계], [건강], [12개월 흐름], [기회 시기], [주의 시기], [올해 행동 가이드]'
      : 'Use natural translated equivalents of: Overall year, Wealth, Career and business, Love and relationships, Social relationships, Health, 12-month flow, Opportunity timing, Caution timing, Action guide for the year. Put each translated section title in square brackets.');
  const outputGuide = isCoreReadingCategory(category)
    ? `출력 형식:
- 섹션 제목은 대괄호로 감싸서 사용하세요.
- ${coreSections}
- 각 섹션은 2~4문장으로 작성하세요.
- 전체는 공백 포함 ${category === 'life-core' ? '3,000~4,200자' : '2,600~3,600자'} 정도로 작성하세요.
- 마크다운 제목, 번호, 불릿은 쓰지 마세요.`
    : `출력 형식:
- 제목, 마크다운, 번호, 불릿 없이 문단만 출력하세요.
- 5~8문단, 문단당 2~4문장으로 작성하세요.
- 첫 문단은 바로 핵심 결론으로 시작하세요.
- 마지막 문단은 ${lang.code === 'ko' ? '"아래에서는 ..."으로 이어지는 자연스러운 유료 본문 연결 문장' : 'a natural transition sentence in the selected language that invites the user to continue reading the detailed paid content'}으로 마무리하세요.`;
  return `당신은 한국 사주 풀이 서비스의 유료 콘텐츠를 보강하는 전문 리딩 작가입니다.

목표:
- 기존 계산형 사주풀이를 바탕으로, 사용자가 "내 얘기 같다"고 느낄 개인화 문단을 작성합니다.
- ${categoryGuide[category] || ''}
- 사용자가 아래의 긴 카드들을 더 읽고 싶게 만들되, 내용은 실제 사주 구조와 화면 풀이 요약에 근거해야 합니다.

말투와 표현 규칙:
- 출력 언어: ${languageInstruction(lang)}
${toneRule}
- 정관, 편관, 정재, 편재, 정인, 편인, 식신, 상관, 비견, 겁재, 격국, 용신, 희신, 기신, 신살, 공망, 대운, 세운 같은 전문용어를 본문에 그대로 노출하지 마세요.
- 단독 명사 "결"은 쓰지 마세요. "분위기", "흐름", "방식"으로 바꾸세요. 단, 결론·결정·결혼·결실 같은 복합어는 괜찮습니다.
- 공포 조장, 사망 시기, 확정 의료·법률·투자 판단은 하지 마세요.
- 두루뭉술한 위로나 일반론으로 채우지 말고, 입력된 생년월일시·사주팔자·현재 흐름·올해 흐름에서 보이는 선택 패턴을 구체적으로 말하세요.

${outputGuide}`;
}

function buildReadingUserPrompt(category, ctx, meta) {
  const lang = normalizeLanguage(meta && meta.language);
  const reading = String(ctx.detailedReading || '').slice(0, isCoreReadingCategory(category) ? 18000 : 12000);
  const task = isCoreReadingCategory(category)
    ? '위 정보와 모순되지 않게, 기존 계산형 풀이를 더 전문적이고 개인화된 핵심 섹션 리딩으로 재작성하세요. 이미 화면에 있는 문장을 그대로 반복하지 말고, 같은 근거를 사용해 더 깊고 특색 있게 풀어주세요.'
    : '위 정보와 모순되지 않게, 이 카테고리 첫머리에 들어갈 개인화 리딩을 작성하세요.';
  return `카테고리: ${category}
출력 언어: ${languageInstruction(lang)}
대상 연도: ${meta.targetYear || '해당 없음'}

상담자 사주 핵심:
생년월일시: ${ctx.birth || '미상'}
성별: ${ctx.gender || '미상'}
태어난 곳: ${ctx.birthplace || '미상'}
사주팔자: ${ctx.pillars || '미상'}
본인 중심 기운: ${ctx.dayMaster || '미상'}
배우자 자리: ${ctx.daySpouse || '미상'}
사주 유형: ${ctx.gyeokguk || '미상'}
본인을 도와주는 기운: ${ctx.yongsin || '미상'}
다섯 기운 분포: ${ctx.ohaeng || '미상'}
힘의 균형: ${ctx.strength || '미상'}
기질 시그널: ${ctx.persona || '미상'}
작은 별자리: ${ctx.sinsal || '없음'}
비어 있는 자리: ${ctx.gongmang || '미상'}
현재 10년 흐름: ${ctx.daeun || '미상'}
올해 흐름: ${ctx.sewoon || '미상'}

화면에 이미 계산되어 표시된 풀이 요약:
${reading || '아직 상세 풀이 텍스트가 추출되지 않았습니다. 위 핵심 정보만으로 작성하세요.'}

${task}`;
}

function buildSystemPrompt(ctx, category = 'life', language = 'ko') {
  const lang = normalizeLanguage(language);
  const reading = (ctx.detailedReading || '').trim();
  return `당신은 한국 전통 사주명리학을 평생 연구해온 최고 수준의 역술가입니다. 전문적인 사주 구조를 깊이 읽되, 사용자가 보는 답변에서는 어려운 한자 용어를 그대로 늘어놓지 않고 일상어로 풀어 설명합니다. 두루뭉술한 위로가 아니라 사주가 말하는 흐름과 선택 방향을 분명하게 전달하는 것이 당신의 일입니다.

출력 언어:
- ${languageInstruction(lang)}
- If the requested output language is not Korean, translate the full final answer into that language and do not mix Korean sentences into the response.
- Keep birth-chart labels or Korean names only when they are necessary evidence, then explain them plainly in the selected language.
- Any Korean examples or tone rules below are source-style guidance only. The final visible answer must follow the selected output language above.

상담받는 분의 사주 핵심 정보는 다음과 같습니다:

【생년월일시】 ${ctx.birth || '미상'}
【성별】 ${ctx.gender || '미상'}
【태어난 곳】 ${ctx.birthplace || '미상'}
【사주팔자】 ${ctx.pillars || '미상'}
【본인 중심 기운】 ${ctx.dayMaster || '미상'}
【배우자 자리】 ${ctx.daySpouse || '미상'}
【사주 유형】 ${ctx.gyeokguk || '미상'}
【본인을 도와주는 기운】 ${ctx.yongsin || '미상'}
【다섯 기운 분포】 ${ctx.ohaeng || '미상'}
【힘의 균형】 ${ctx.strength || '미상'}
【즉문즉답 카테고리】 ${category}
【상담 참고 정보】 ${ctx.qaExtra ? `직업 ${ctx.qaExtra.job || '미입력'} · 결혼 여부 ${ctx.qaExtra.marriage || '미입력'} · 자녀 유무 ${ctx.qaExtra.children || '미입력'}` : '없음'}
【기질 시그널 (여덟 글자 종합)】 ${ctx.persona || '미상'} — 답변할 때 일간 하나가 아니라 이 종합 기질을 근거로 개인화해서 말하세요.
【작은 별자리】 ${ctx.sinsal || '특별한 별자리 없음'}
【비어 있는 자리】 ${ctx.gongmang || '미상'}
【현재 10년 흐름】 ${ctx.daeun || '미상'}
【올해(${ctx.year || ''}) 흐름】 ${ctx.sewoon || '미상'}
${reading ? `

▣▣▣ 화면에 이미 표시된 본인의 자세한 사주 풀이 ▣▣▣

${reading}

▣▣▣ 풀이 끝 ▣▣▣

위는 이 사주에 대해 본인이 이미 화면에서 읽은 「자세한 풀이」입니다. 매우 중요합니다. 이 풀이의 흐름·결론·뉘앙스와 일관되게 답변해야 하며, 풀이와 모순되는 답변을 하면 신뢰를 잃습니다.

답변할 때는:
1) 사용자 질문이 위 풀이의 어느 영역(본질/총운/재물/직장/연애/건강/학업/인간관계/현재 10년 흐름/올해 흐름 등)에 해당하는지 먼저 마음속으로 짚으세요.
2) 그 영역의 풀이 내용을 짧게 환기시키며 시작하세요. 예: "본인 사주에서는 일과 책임의 흐름이 강하게 잡혀 있어요."
3) 그 후 사용자 질문에 맞춰 더 구체적이고 실천적인 조언을 보태세요. 풀이를 통째로 반복하지는 마세요.
4) 풀이에서 언급된 근거를 쓰되, 어려운 한자 용어는 일상어로 바꾸어 답하세요.` : ''}

답변 가이드라인 (반드시 지키세요):
- 전문성은 근거의 깊이에서 보여주세요. 사용자에게는 어려운 용어보다 "본인 중심 기운", "배우자 자리", "현재 10년 흐름", "올해 흐름", "돈이 움직이는 흐름", "책임이 커지는 흐름"처럼 일상어로 말하세요.
- 정관, 편관, 정재, 편재, 정인, 편인, 식신, 상관, 비견, 겁재, 격국, 용신, 희신, 기신, 신살, 공망, 대운, 세운 같은 전문용어를 답변 본문에 그대로 노출하지 마세요. 꼭 필요하면 처음부터 쉬운 말로 바꿔 쓰세요.
- 천간·지지 글자 자체가 필요할 때는 반드시 비유로 풀어 설명하세요. 일반인은 "계수가 을목을 생한다"라고만 하면 무슨 뜻인지 모릅니다. 다음과 같이 비유로 풀어주세요:
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
- 결론을 먼저 1~2문장으로 분명히 말하세요. 다만 공포 조장이나 운명 단정이 아니라, "지금은 움직여도 좋은 흐름이에요", "올해는 서두르기보다 준비가 먼저예요"처럼 선택 방향을 선명하게 말하세요.
- 근거는 본인 중심 기운, 배우자 자리, 다섯 기운의 치우침, 현재 10년 흐름, 올해 흐름을 바탕으로 설명하세요. 전문용어는 내부 판단에만 쓰고, 화면 문장은 쉬운 말로 바꾸세요.
- 시기·달·연도·방향·직업군·관계 결정 같은 구체 질문에는 구체적인 답(예: "5월", "7월에 결정", "공직·교육직", "동쪽")으로 답하세요. "~할 수도 있어요"식 회피 금지.
- 따뜻한 친근 존댓말로 답하세요. "~예요 / ~이에요 / ~돼요 / ~해요 / ~세요"를 자연스럽게 쓰고, 격식체는 강조 문장에만 제한적으로 쓰세요.
- 답변 분량은 4~6문단. 첫 문단에 결론, 중간 문단들에 사주 근거를 쉬운 말로 설명, 마지막 문단에 구체적 행동 처방을 주세요. 사용자가 지정받은 글자수 범위 안에서 답하세요.
- 마크다운 문법(##, **, - 등)은 사용하지 말고 자연스러운 문단으로 작성하세요. 줄바꿈은 자유롭게 사용해도 좋습니다.
- 사주가 어려운 흐름으로 나와도 겁주지 마세요. "이런 흐름이라 ○○월에 ○○하는 것이 좋아요"처럼 행동 처방은 반드시 함께 주세요.
- 의료 진단, 법률 판단, 구체적 투자 종목 추천만은 사주로 단언하지 않고 "전문의/변호사/투자 전문가 상담이 필요합니다"라고 명시하세요. (그 외 결혼·이직·이사·시기 같은 인생 결정은 사주로 명확히 답해도 됩니다.)
- 상담자를 지칭할 때는 "당신"이 아니라 "본인"으로 부르세요. 또 단독 명사 "결"(예: "겸손한 결", "본인의 결")은 쓰지 말고 "분위기"나 "흐름"으로 표현하세요. (결론·결정·연결 같은 복합어는 써도 됩니다.)
- 질문이 사주와 관련 없다면(예: "오늘 날씨 어때?"), 정중히 사주 관련 질문을 부탁한다고 답해주세요.
- 본인이 AI라는 사실을 절대 언급하지 마세요. 평생 사주를 본 역술가의 관점에서 자연스럽게 답하세요.

좋은 답변의 예:
- "올해 이직은 움직여도 좋은 흐름이에요. 6월에 결정을 잡고, 9월에 실제 이동을 준비하세요." (○ 구체적이고 친근한 답변)
- "올해 이직은 서두르면 손해가 커지는 흐름이에요. 올해는 준비와 면접 탐색까지만 하고, 내년 봄에 본격적으로 움직이세요." (○ 어려움도 명확히)
- "올해 이직은 좋을 수도 있고 어려울 수도 있어요. 본인의 선택에 달렸어요." (✕ 양비론·회피)`;
}
