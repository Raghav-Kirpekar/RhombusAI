# CI Design Strategy

## Pipeline Triggers & Stages

This design assumes a GitHub Actions workflow, but applies to Jenkins/GitLab CI as well.

### 1. Pull Request (PR) Workflow
*Trigger*: Push to any open PR.
*Goal*: Fast feedback (< 10 mins).

*   **Job 1: Static Analysis**
    *   Linting (ESLint, Prettier)
    *   Type Checking (TypeScript)
*   **Job 2: API & Data Tests**
    *   Run `/api-tests/` (Fast, isolated)
    *   Run `/data-validation/` against a small golden sample.
*   **Job 3: UI Smoke Test**
    *   Run a single critical path spec from `/ui-tests/` (e.g., Login + Simple Upload).
    *   *Optimization*: Run headless.

### 2. Nightly / Master Integration
*Trigger*: Schedule (00:00 UTC) or Push to `main`.
*Goal*: Deep coverage, identifying regression trends and flakiness.

*   **Job 1: Full Regression**
    *   Run ALL `/ui-tests/` (multiple browsers: Chromium, Firefox, WebKit).
    *   Run ALL `/api-tests/` including edge cases.
    *   Run extended Data Validation on larger datasets.

## Artifact Collection
On failure, the CI pipeline must capture:
1.  **Playwright Traces**: Zip and upload `test-results/` (contains trace.zip, video, screenshots).
2.  **Container Logs**: If services are dockerized, capture `docker logs`.
3.  **Data Diff**: If data validation fails, save the `actual_output.csv` and a diff report against `expected_output.csv`.

## Blocking policy
*   **Merge Blockers**: All PR Job steps must pass.
*   **Release Blockers**: Nightly run must be green. If Nightly fails, release is paused until triage.
