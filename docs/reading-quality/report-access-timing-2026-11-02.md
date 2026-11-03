# Generation timing, PDF access window, and progress

## Actual measurements

Measured against Cloudflare Worker version-preview URLs with real provider calls and the existing valid paid permissions in the user's browser. No new purchase was made, no live production route was switched, and no report or token text was exported into this record.

| Measurement | Observed duration |
|---|---:|
| Previous life reading, historical request log: first plan request start to last successful response | about 175.496 seconds |
| Modified life reading, 21 chapters, 21,955 body characters | 98.040 seconds |
| Successful deep PDF, including authorship/layout/server print, 41 pages | 45.389 seconds |
| Of that PDF, AI authorship | 36.702 seconds |
| Repeat of the same PDF, retained AI prose, server print again | 8.010 seconds |

The historical baseline and new sample are not a controlled statistical A/B test. Provider load, output, and repairs differ; the observed reduction is about 44%, not a latency guarantee. Ten-second full web authorship has not been achieved with the retained web length. A PDF attempt before the final editor stalled at 20/21 chapters due to a verbatim repeated sentence; the editor now removes exact cross-chapter boilerplate and re-runs the existing grounding/content checks without inventing replacement prose. The subsequent full PDF completed successfully. Paid plan/source validation remains intact.

## Access contract

`assets/report-access.js` stores a non-exportable ECDSA private key in IndexedDB. The public key identifier is pinned in new payment tokens. Web start/completion creates a server-signed, scope-specific access certificate and server record. PDF checkout and AI/printing requests require the matching complete web certificate and a fresh browser-key signature. The existing web access deadline is authoritative; PDF payment/reopening/retries do not extend it. New PDF payment tokens also pin the original web order and deadline. Older 30-day tokens infer their issue time from the original token lifetime and bind to the first confirmed browser; they do not acquire another 24 hours on reopening.

The same browser must have completed the web report before PDF generation. Copying localStorage receipts/tokens to another browser is insufficient because the private key is not exportable. Changing browser, clearing the browser's key storage, changing scope, or passing the web deadline prevents new generation. Previously downloaded PDF files themselves are not DRM-revoked.

The API fails closed when the access service or storage is unavailable. Authorization failures in server printing cannot fall through to local image-PDF generation. The PDF button checks eligibility before showing checkout. Checkout also verifies the web certificate before contacting the payment provider. Payment price and calculation engines are unchanged. Web narrative caches remain browser-local; only access metadata is stored by the server.

## Progress

Shared accessible progressbars carry `aria-valuenow` and a monotonic fill. Saju web: completed plan plus validated chapters; PDF: completed plan/chapters, layout, final server print or image-page rendering. Only complete content/file reaches 100%. Tarot/astrology expose available request/validation stages; they receive a single provider response and cannot reveal continuous internal token progress. No random interval or elapsed-time fake percentage is used. Percentages express completed work, not percent of elapsed time or a remaining-seconds prediction.

## Validation and rollout

- `tools/report-access-regression.js`: real cryptographic signatures, key non-exportability, product/order/scope/device checks, unfinished web rejection, exact expiry and no extension, original payment-worker ready/approve binding, invalid checkout rejection before provider call, legacy token handling, UI preflight and monotonic progress.
- `tools/report-access-browser.js`: real Chrome keys/IndexedDB, a copied receipt rejected in a second browser context, browser signatures verified by the Worker code, expiry, mobile PDF bar, zero page exceptions.
- `tools/reading-stage-browser.js`: mobile/desktop all-at-once content and in-progress bar.
- Both Workers bundle through Wrangler dry runs. Existing regression suite covers paid/free/PDF/report/payment routes with mocked providers; actual timings above are separately measured.

Deploy the chat Worker and payment Worker before the frontend assets, then verify a fresh reading and an existing valid reading. These are currently code changes plus version-preview validation, not a production rollout. Keep secrets/configuration and the two existing KV namespaces in place. If an old browser tab remains open across rollout, reload it to obtain the new access/progress client.

Version URLs are explicitly disabled in both production Wrangler configurations on rollout, so old preview versions cannot serve the previous access rules. See [Cloudflare version URL configuration](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/#enable-or-disable-version-urls). Measurements above were completed before that configuration change; production routes have not been changed. Signed completion certificates bridge cross-location KV propagation, while conflicting device/scope records and fixed expiry still fail closed.
