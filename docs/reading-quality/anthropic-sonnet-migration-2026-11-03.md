# Claude Sonnet 5.5 model migration

- Claude API ID: `claude-sonnet-5-5` (https://platform.claude.com/docs/en/models/sonnet-5-5/overview).
- Local default: `ANTHROPIC_DEFAULT_MODEL`; all five Claude call sites (Q&A, reading/PDF, tarot, astrology, translation) respect `ANTHROPIC_MODEL`.
- Production: downloaded the currently deployed bundle and changed only its four Claude model references. The Q&A literal now respects `env2.ANTHROPIC_MODEL`. The live bundle has four Claude paths; the additional local translation fallback remains a local implementation until its broader changes are deployed.
- Set production `ANTHROPIC_MODEL=claude-sonnet-5-5`. GPT environment overrides remain `gpt-5.6-luna`.
- Active production Worker version: `552af399-1d8f-46b4-8a5a-be90bfc4ce34` (100%). Verified downloaded production module exactly matches the isolated patch; prior bindings, compatibility flags/date, logpush, tags, and tail consumers retained.
- Actual account test in isolated remote preview: Models API 200; Messages API 200, model `claude-sonnet-5-5`, stop_reason `end_turn`, text block present. Synthetic short prompt only, 35 input / 58 output tokens, about 2.1 seconds upstream; no user/order/cache data accessed. This does not establish full-report latency or narrative quality.
- Mock regression: both model-routing checks passed; 14 web + 14 PDF generation contracts passed. No calculation, payment, product, or free-AI policy changes.
- Unrelated working-tree changes were not included in the operating Worker patch. This change has not been committed or pushed to GitHub.
