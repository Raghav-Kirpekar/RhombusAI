# Test Strategy - Rhombus AI

## 1. Top Regression Risks

1.  **Data Transformation Integrity**: The core value proposition is transforming data. If the output is corrupted, missing rows, or incorrectly mapped, the product fails. This is high risk because transformations often involve complex logic and can be sensitive to input schema variations.
    *   *Mitigation*: Data Validation Scripts (Part 4) & API Tests.
2.  **AI Pipeline Determinism & Reliability**: AI models can be non-deterministic. A regression could be a model degradation or a pipeline timeout. This is high impact because users rely on the AI to "do the work".
    *   *Mitigation*: API Tests with "fuzzy" assertions or structural validation, rather than exact string matching. Monitoring for timeout rates.
3.  **File Ingestion/Export**: Uploading large/messy CSVs and downloading the result. Use valid vs. invalid extensions, encodings.
    *   *Mitigation*: API Tests for edge cases (file types, sizes). UI Tests for the happy path upload integration.
4.  **Authentication & Session Management**: Users cannot use the app if they can't log in. Critical blocker.
    *   *Mitigation*: API Smoke Tests (run frequently) & single UI login test.
5.  **Billing/Quota Limits** (Risk assumption): If a user runs out of credits or the system fails to track usage, business revenue is at risk.
    *   *Mitigation*: API logic tests.

## 2. Automation Prioritisation

**Automate First:**
1.  **API Smoke Suite**: Login, simple pipeline creation, health checks. *Why*: Fast feedback, lowest maintenance.
2.  **Critical UI Happy Path (The "Golden Flow")**: Upload -> Transform -> Download. *Why*: Ensures the system puts it all together correctly for the user.
3.  **Core Data Validation**: A script that verifies the math/logic of transformations. *Why*: Unit tests might miss end-to-end data integrity issues.

**Intentionally Do Not Automate Yet:**
1.  **Complex AI Edge Cases via UI**: Testing every possible prompt variation via the UI is slow and flaky. *Approach*: Test prompt handling at the API/Model evaluation layer.
2.  **Visual Regression (Pixel Perfect)**: Unless branding is critical, maintaining pixel-perfect tests is high cost for a startup phase.
3.  **Third-party Integrations**: Mock these first. Flakiness from 3rd parties should not block internal builds.

## 3. Test Layering Strategy

| Layer | Focus | Types of Failures Caught |
| :--- | :--- | :--- |
| **UI (E2E)** | Critical User Journeys (Upload -> Transform -> Download) | Navigation issues, broken buttons, JS errors, browser compatibility, upload widget failures. |
| **API / Integration** | Business Logic, Permissions, Error Handling, specific Pipeline configurations | 500 errors, logic bugs, authentications failures, bad request handling, data persistence issues. |
| **Data Validation** | Correctness of the output | Pipeline logic errors, data corruption, "silent failures" where a file executes but produces garbage. |

## 4. Regression Strategy

*   **On Every Pull Request (PR):**
    *   Linting & Unit Tests.
    *   **API Smoke Tests**: Fast (< 2 min), verified critical endpoints.
    *   **Data Validation**: Run against a small, static "golden dataset".
*   **Nightly Builds (Full Regression):**
    *   **Full UI Suite**: All E2E flows, cross-browser (if verified).
    *   **Full API Suite**: All edge cases, negative tests.
    *   **Performance/Load**: (Optional) if scale is a concern.
*   **Blocking a Release:**
    *   100% Pass on PR checks (Smoke + Unit).
    *   No critical/P0 bugs found in Nightly.

## 5. Testing AI-Driven Behavior

AI behavior is probabilistic. To test it deterministically:
1.  **Structural Assertions**: Assert that the output *format* is correct (e.g., JSON schema, CSV headers exist), rather than the specific text content.
2.  **Semantic Similarity**: Use embedding distance or keyword inclusion to check if the answer is "roughly" correct, rather than string equality.
3.  **Temperature Control**: If possible, set the model temperature to 0 for test environments to maximize determinism.
4.  **Guardrails**: Test the *guardrails* (e.g., does it refuse to generate PII?) rather than the generation itself.

## 6. Flaky Test Analysis

**Common Causes in this System:**
*   **Asynchronous AI Delays**: The pipeline processing time varies. Fixed timeouts will flake. *Fix*: Polling (smart waits) on the job status API.
*   **DOM Updates**: Elements appearing/disappearing as the "AI thinks". *Fix*: Use Playwright's auto-waiting locators, not `wait_for_timeout`.
*   **Data State**: Using shared accounts where one test deletes a file another is using. *Fix*: Ephemeral users or namespaced data (e.g., `test_file_<uuid>.csv`).
*   **File Upload**: The file upload process is complex and can be flaky. *Fix*: Use Playwright's auto-waiting locators, not `wait_for_timeout`.
*   **Multiple Projects With the Same Name**: The project name is not unique and can cause flakiness. *Fix*: Use unique project names for each test.

**Mitigation Plan:**
*   **Retries**: limit to 1 retry in CI to handle transient network blips, but monitor "pass on retry" as a warning sign.
*   **Quarantine**: If a test fails > 5% of the time, move to "Quarantine" suite (non-blocking) until fixed.
*   **Observability**: Attach traces and videos to every failure (Playwright does this natively).
