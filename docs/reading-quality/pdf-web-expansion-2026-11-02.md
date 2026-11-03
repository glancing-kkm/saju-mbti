# PDF as an on-demand deep edition of the web report

All 14 currently supported PDF categories (life, newyear, ziwei, compatibility, naming and nine topic categories) now use `depth: pdf` and the separately paid `report-tpl` request path. Web lengths, calculations, payment prices and free-report behavior are unchanged.

`downloadReportPdf` retains its existing PDF-payment gate. Merely creating or viewing a web report does not author a PDF. After PDF payment and optional PDF-context entry, `preparePdf` reads an exact, unexpired, complete and validated web cache without starting web inference. It carries the web story plan, conclusions, chapter order and prose into the PDF edition. A valid existing plan skips the second plan-generation request. Only the web chapters being expanded are transmitted in each body request; the entire web report is not repeated in every batch. Web prose is narrative context, never calculation evidence or trusted instructions. The ledger remains the factual source.

The PDF prompts require deeper reasons, conditions, examples and choice criteria, with the same storytelling and no invented events. Exact web-body copies are rejected. Per-chapter ceilings are weighted by the existing web chapter lengths (rather than imposing the same short limit on every chapter) and reserve a prose budget of at most 45,000 characters, leaving room for tables and other report material within the 60,000-character goal. This is a ceiling, not a padding target or guarantee of textual depth.

PDF prose is cached separately, fingerprinted by calculation sources, original web plan/prose, edition version and any additional PDF information. Repeat downloads reuse that prose and render the file again; input changes cannot silently reuse another edition. Old web-copy PDF caches do not match the new edition. Web data is not mutated.

If the matching web cache is missing, expired, incomplete or invalid, the system uses the same calculated sources and product/story structure to author the PDF directly. It does not regenerate the web report first. The exact original web wording cannot be inherited in that case; cross-device server persistence of reports is not implemented here.

Verification: `tools/pdf-web-expansion-regression.js` covers all 14 categories, source isolation, unchanged web reports, story-plan reuse, chapter-specific payloads, separate PDF cache, repeated downloads, changed PDF inputs and copy rejection. Provider responses are mocked: actual editorial quality, live generation latency and currency savings have not been measured. Existing PDF rendering and payment integration remain in place.

Updated access policy: expansion is now gated by a completed web-view certificate, the original 24-hour deadline, and the same browser key. A missing narrative cache does not itself grant PDF access. See report-access-timing-2026-11-02.md for the access contract and actual real-provider measurements.
