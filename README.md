# Rhombus AI - Quality Engineering Take-Home

This repository contains the deliverables for the Software Engineer – Test take-home exercise.

## Deliverables Checklist

- [x] **Test Strategy** (`test-strategy.md`): Part 1 & Part 6.
- [x] **UI Automation** (`ui-tests/`): Playwright tests for the AI Pipeline flow.
- [x] **API Tests** (`api-tests/`): Playwright API tests for health check and negative scenarios.
- [x] **Data Validation** (`data-validation/`): Node.js script to validate CSV transformations.
- [x] **CI Design** (`ci-design.md`): Part 5.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    npx playwright install
    ```

2.  **Environment Variables**:
    Create a `.env` file (or export variables) for the UI tests:
    ```bash
    export TEST_USERNAME="your-email@example.com"
    export TEST_PASSWORD="your-password"
    ```

## Running Tests

### UI Tests (Part 2)
To run the UI automation suite (Headless by default):
```bash
npm run test:ui
```
To run in headed mode for visual verification:
```bash
npm run test:ui -- --headed
```

### API Tests (Part 3)
To run the API / Network tests:
```bash
npm run test:api
```

### Data Validation (Part 4)
To run the validation script against the sample data:
```bash
npm run test:data
```

## Assumptions & Limitations
These tests were built under the following assumptions based on the current state of the application:
1.  **Manual Signup**: The test assumes that the `TEST_USERNAME` and `TEST_PASSWORD` belong to an account that has already been created and verified. Signup automation was out of scope due to email verification requirements.
2.  **Single Popup**: The onboarding flow assumes only ONE "Start Building" popup appears. If multiple marketing modals appear, the test flow might be interrupted.
3.  **Fixed Prompt**: The AI prompt is hardcoded to clean the specific `input.csv` dataset. Using a different dataset may yield unpredictable results with this specific prompt.
4.  **Input File Duplicates**: The transformation performed on the dataset include removing duplicates, but this removal only checked the name and email fields and not the others. This will most likely change depending on the prompt provided. 

## What Was Not Tested
The following areas were explicitly excluded from this automation suite:
1.  **Sign-Up Flow**: Requires external email verification (OTP/Link), which introduces flakiness and security constraints not suitable for this level of testing.
2.  **Payment/Billing**: Out of scope for a technical assessment; testing real payments in production is blocked.
3.  **Complex Graph Branching**: The current test verifies a linear "Import -> Plan -> Result" flow. Complex branching with multiple concurrent nodes was not automated to keep the test deterministic.
4.  **Mobile Responsiveness**: The UI tests are configured for Desktop Viewports (1280x720) only.

## Demo Video (Part 7)

## Notes on Implementation
- **UI Tests**: The `pipeline.spec.ts` is designed to be robust against dynamic class names by using role-based and text-based locators.
- **File Upload**: Includes a smart automation strategy that targets the `+` icon using specific SVG selectors to handle the custom upload modal.
- **Resiliency**: The tests include retry logic and dynamic waiting to handle asynchronous AI processing times.
