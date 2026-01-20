import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const TEST_USERNAME = process.env.TEST_USERNAME;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

test.describe('Rhombus AI Pipeline Flow', () => {

    test.setTimeout(180000); // Increased timeout for manual interactions

    test('should upload CSV, transform data, and download result (Fixed)', async ({ page }) => {
        console.log('Running Test Version: Final Robust (Auto-Graph + Hybrid Download)');
        // 1. Sign In
        await page.goto('https://rhombusai.com');

        // Check if we are on the marketing page and need to click "Open App"
        const openAppLink = page.getByRole('link', { name: 'Open App' }).first();
        if (await openAppLink.isVisible()) {
            console.log('Clicking Open App...');
            await openAppLink.click();
            await page.waitForLoadState('networkidle');
        }

        let shouldLogin = false;

        // Check if there is a "Log In" button (e.g. on homepage)
        const loginButton = page.getByRole('button', { name: 'Log In' });
        if (await loginButton.isVisible()) {
            console.log('Clicking Log In button...');
            await loginButton.click();
            shouldLogin = true;
        }

        // Check if we are already on login page or redirected
        if (!shouldLogin && (page.url().includes('login') || await page.getByRole('textbox', { name: /email/i }).isVisible().catch(() => false))) {
            shouldLogin = true;
        }

        if (shouldLogin) {
            console.log('Logging in...');
            const emailInput = page.getByRole('textbox', { name: /email/i });
            await emailInput.fill(TEST_USERNAME);
            await page.getByRole('textbox', { name: 'Password' }).fill(TEST_PASSWORD);
            await page.getByRole('button', { name: /sign in|log in/i }).click();
            await expect(page.getByRole('heading', { name: /Type a Prompt/i })).toBeVisible({ timeout: 20000 });
        }

        // Handle potential "Start Building" onboarding modal
        const closeButton = page.getByRole('button', { name: 'Close' });
        try {
            console.log('Waiting for potential onboarding modal...');
            await closeButton.waitFor({ state: 'visible', timeout: 10000 });
            console.log('Closing onboarding modal...');
            await closeButton.click();
            await expect(closeButton).toBeHidden();
        } catch (e: any) {
            console.log('Onboarding modal did not appear (or we missed it):', e.toString());
        }

        // 2. Upload a messy CSV file
        const filePath = path.join(__dirname, '../data-validation/input.csv');
        if (!fs.existsSync(filePath)) {
            test.skip(true, 'Input file input.csv not found for upload test.');
            return;
        }

        console.log('Attempting automated file upload...');
        let uploadSuccess = false;

        // Strategy: Click "+" icon -> Open Modal -> Direct Input Set (or Browse Fallback)
        try {
            // 1. Click the "+" button using the User-Verified Selector
            const plusBtn = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();

            if (await plusBtn.isVisible()) {
                await plusBtn.click({ force: true });

                // 2. Wait for Modal
                try {
                    await page.getByText('Add New File').waitFor({ state: 'visible', timeout: 5000 });

                    // 3. Automation Step: Try setting files safely inside modal
                    try {
                        await page.setInputFiles('input[type="file"]', filePath);
                    } catch (err) {
                        // Fallback: Click "Browse Here" to trigger file picker
                        const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });
                        await page.getByText('Browse Here').click({ force: true });
                        const fileChooser = await fileChooserPromise;
                        await fileChooser.setFiles(filePath);
                    }

                    // 4. Wait for file to be ready in the modal
                    await page.waitForTimeout(1000);

                    // 5. Click "Attach" button in the modal
                    const attachBtn = page.getByRole('button', { name: 'Attach', exact: true });
                    await attachBtn.click();

                    // 6. Verify upload success in main UI
                    await page.getByText(/input\.csv/i).waitFor({ state: 'visible', timeout: 10000 });
                    uploadSuccess = true;
                    console.log('File Upload Success!');

                } catch (e) {
                    console.log('Modal interaction failed:', e);
                }
            } else {
                console.log('Could not find "+" button with selector: button:has(svg.lucide-plus)');
            }

        } catch (e) { console.log('Upload automation failed:', e); }

        if (!uploadSuccess) {
            console.warn('Automation failed. Please manually drag and drop "data-validation/input.csv".');
            // Wait longer for manual fallback if automation fails
            await page.getByText(/input\.csv/i).waitFor({ state: 'visible', timeout: 60000 });
        }

        // 3. Prompt the AI and Run
        const promptInput = page.getByRole('textbox', { name: /What|Describe|Prompt/i });
        await promptInput.fill('Clean this dataset, remove duplicates based on Name and email, and normalize email addresses. After the processing is done, show me the preview of the output. ');

        console.log('Prompt filled. Attempting to click Run...');
        // Try multiple selectors for the run button as it might be an icon (arrow) or text
        const runButtonCandidates = [
            page.getByRole('button', { name: /generate|run|transform|build/i }),
            page.getByLabel('Run'),
            page.getByLabel('Generate'),
            page.locator('button[type="submit"]'),
            // Sometimes it's just an arrow icon button next to the input
            // We use .last() because there might be other buttons (like "remove file" X button)
            promptInput.locator('xpath=following-sibling::button').last(),
            promptInput.locator('..').locator('button').last()
        ];

        let clicked = false;
        for (const candidate of runButtonCandidates) {
            if (await candidate.isVisible()) {
                console.log('Found run button candidate, clicking...');
                await candidate.click();
                clicked = true;
                break;
            }
        }

        if (!clicked) {
            console.log('No visible run button found. Pressing Enter in the prompt box...');
            await promptInput.press('Enter');
        }

        // 4. Wait for pipeline creation and execution (Handling Async, Plan vs Result)

        // Sometimes the app shows a "Plan" or "Preview" table first (Actions/Transformations)
        console.log('Waiting for processing...');

        // Wait for ANY table to appear (Plan or Result) OR the graph nodes to appear
        try {
            await expect(page.locator('table, .react-flow__node')).toBeVisible({ timeout: 30000 });
        } catch (e) { console.log('Timeout waiting for table/graph, continuing to checks...'); }

        // Check if we are stuck on the "Plan" view (contains "Transformation" or "Action")
        const planTable = page.locator('table').filter({ hasText: /Transformation|Action|Purpose/i });
        if (await planTable.isVisible()) {
            console.log('Plan/Preview detected.');
            console.log('ACTION REQUIRED: If the pipeline is not running, please MANUALLY CLICK the "Run", "Apply", or "Play" button.');

            // Try to click run automatically, ONLY if it is explicit. 
            // We avoid clicking generic icons as they might be "Stop" buttons.
            try {
                const runBtn = page.locator('button').filter({ hasText: /proceed|confirm|execute|apply/i }).first();
                if (await runBtn.isVisible()) {
                    console.log('Found explicit Proceed/Execute button. Clicking...');
                    await runBtn.click();
                }
            } catch (e) { console.log('Auto-click exception:', e); }
        }

        // 5. Automate Result Preview (Click Last Node -> Preview)
        console.log('Automating Result Preview...');
        await page.waitForTimeout(5000); // Allow pipeline to finish processing

        // Retry loop: Click Node -> Check for Preview Button
        let previewOpened = false;
        // Specific text from the prompt that is likely to appear in the node title
        const targetNodeText = /Clean this dataset|Text Case/i;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                // Try to find the specific transformation node first
                const specificNode = page.locator('.react-flow__node').filter({ hasText: targetNodeText }).last();

                if (await specificNode.isVisible()) {
                    console.log(`Attempt ${attempt}: Clicking specific node with text matching ${targetNodeText}...`);
                    await specificNode.click({ force: true });
                } else {
                    // Fallback to purely index-based if specific text not found (e.g. if node is named differently)
                    const nodeCandidates = page.locator('.react-flow__node, [data-testid*="node"], .node');
                    const count = await nodeCandidates.count();
                    if (count > 0) {
                        console.log(`Attempt ${attempt}: Specific node not found. Clicking LAST node (index ${count - 1})...`);
                        await nodeCandidates.nth(count - 1).click({ force: true });
                    }
                }

                await page.waitForTimeout(5000);

                // Check if Preview tab/button is now visible
                // We use getByRole('tab') to be specific and avoid matching the word "preview" in the prompt text
                const previewBtn = page.getByRole('tab', { name: /Preview/i });
                if (await previewBtn.isVisible()) {
                    console.log('Preview Tab found! Clicking...');
                    await previewBtn.click({ force: true });
                    previewOpened = true;
                    // Wait for table to render
                    await page.waitForTimeout(2000);
                    break;
                }
            } catch (e) {
                console.log(`Preview attempt ${attempt} failed:`, e);
            }
        }

        if (!previewOpened) {
            console.log('WARNING: Could not auto-open preview. Manual intervention might be needed.');
        }

        // Wait for the FINAL Result Data
        console.log('Waiting for Final Result Data...');
        const resultTable = page.locator('table').filter({ hasText: /@/ });
        // Use a long timeout because processing might take time
        await expect(resultTable).toBeVisible({ timeout: 60000 });

        // Ensure result table has data
        await expect(resultTable).toContainText(/@/);

        console.log('Attempting download...');
        // 1. Try Automatic Download with robust clicking
        const downloadPromise = page.waitForEvent('download', { timeout: 20000 }); // 20s wait for event

        const downloadMenuCandidates = [
            page.getByRole('button', { name: /download|export|csv/i }),
            page.getByLabel(/download|export/i),
            page.locator('button:has(svg[data-icon="download"])'),
            page.getByText(/^Download$/i) // Exact match for button text
        ];

        let downloadTriggered = false;
        for (const candidate of downloadMenuCandidates) {
            try {
                if (await candidate.isVisible()) {
                    console.log('Found Download menu button. Clicking to open dropdown...');
                    await candidate.click({ force: true });
                    // Wait for any dropdown/menu to appear
                    await page.waitForTimeout(1000);

                    // Try to find the dropdown option "Download as CSV"
                    // candidates for the CSV option in a menu
                    const csvCandidates = [
                        page.getByText(/Download as CSV|CSV/i),
                        page.getByRole('menuitem', { name: /CSV/i }),
                        page.locator('li').filter({ hasText: /CSV/i }),
                        page.locator('div[role="option"]').filter({ hasText: /CSV/i })
                    ];

                    let csvOption = null;
                    for (const opt of csvCandidates) {
                        if (await opt.count() > 0 && await opt.first().isVisible()) {
                            csvOption = opt.first();
                            break;
                        }
                    }

                    if (csvOption) {
                        console.log('Found "Download as CSV" option. Clicking...');
                        await csvOption.click({ force: true });
                        downloadTriggered = true;
                        break;
                    } else {
                        console.log('Dropdown option not found. Checking if file downloaded immediately...');
                        // If the main button *was* the download button, downloadTriggered might be handled by the event listener
                    }
                }
            } catch (e) {
                console.log('Error interacting with download button:', e);
            }
        }

        let download;
        try {
            download = await downloadPromise;
        } catch (e) {
            console.log('-----------------------------------------------------------');
            console.log('Auto-download timed out.');
            console.log('ACTION REQUIRED: Please MANUALLY Open Dropdown and Select "Download as CSV".');
            console.log('-----------------------------------------------------------');
            // Fallback: Wait for manual download
            download = await page.waitForEvent('download', { timeout: 60000 });
        }

        // Save to valid path for validation step
        const downloadPath = path.join(__dirname, '../data-validation/output.csv');
        await download.saveAs(downloadPath);
        expect(fs.existsSync(downloadPath)).toBeTruthy();
        console.log(`Download successful! Saved to ${downloadPath}`);
    });
});
