# Validation completed — 8 October 2026

| Check | Result |
|---|---|
| Easy bank | 600 questions; 100 in each original category |
| Medium bank | 600 questions; 100 in each original category |
| Hard bank | 600 questions; 100 in each original category |
| Normalised duplicate question text across all banks | None |
| Schema | Original category/question/answer keys retained; hints added |
| Hint counts | Easy 0, medium 1, hard 2 on every row |
| Choice hints | Correct answer present; distinct alternatives; second hint narrows first |
| Original HTML and CSS | All four HTML files and style.css are byte-identical to the uploaded archive |
| Node gameplay tests | 7 passed, including complete exhaustion of all three banks |
| Chromium interaction scenarios | 9 passed |
| Visual review | Hard-mode page with both hints revealed inspected |

Browser scenarios covered all three difficulty pages, hint limits, Space on the hint button without an unintended roll, answer reveal, hint/answer clearing on a new roll, history after reload, rule toggling, exhaustion and explicit reset, preservation of other difficulty history, blocked and corrupt localStorage, HTTP failure, malformed JSON and delayed loading. No page JavaScript errors occurred in the normal difficulty flows.

The local browser run used Chromium 133 with Playwright. The environment's default browser download was unavailable; an alternate packaged Chromium executable was used successfully. Browser tooling is not a production dependency.

This validates structure and functionality. Automated checks cannot establish the truth or relative difficulty of every question. Content received an editorial pass, with provenance and selected fact-check references included separately.
