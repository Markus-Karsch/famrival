# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-02 [P2] open - Stored player still sees the name field while the list loads

**File:** src/views/HomeView.vue:144
**Found:** 2026-10-19 by /audit (scope: current; lens: quality)
**Why it matters:** `open` writes `rememberedId` before `GET /api/spielseasons/current/players` returns, while `players` is still empty. The greeting renders only when that id is already in the list, and the name form is the `v-else`. On every return to the matching link, "Spielername" and "Name speichern" stay on screen until that response arrives. A submit in that wait creates another row. `confirmRemembered` then treats the arriving list as final: if the response started before `save` and does not contain the id just stored, it deletes `famrival.player.<hash>` and the field comes back.
**Suggested fix:** Show the form only after the list has loaded and `rememberedId` is null. While a stored id is not yet confirmed, do not fall through to the empty form. Do not let an `open` response that started before `save` remove the id `save` just stored.
**Resolution:**
