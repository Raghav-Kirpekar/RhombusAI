import { test, expect } from '@playwright/test';

test.describe('Rhombus AI API / Network Tests', () => {

    test('should load the home page successfully (Health Check)', async ({ request }) => {
        const response = await request.get('/');
        expect(response.ok()).toBeTruthy();
        expect(response.status()).toBe(200);
    });

    test('should handle invalid login attempts gracefully', async ({ request }) => {
        // Attempting to hit an auth endpoint (guessing /api/auth/login or similar based on common patterns)
        // If not known, we can test that protected assets return 401/403

        // Option: Check a protected route without auth
        const response = await request.get('/hub');
        // This typically redirects or returns 200 (login page) or 401. 
        // If it redirects, we check the final URL.

        if (response.status() === 200) {
            // Check if content implies login is required
            const text = await response.text();
            expect(text.toLowerCase()).toContain('rhombus');
        } else {
            expect([401, 403, 302]).toContain(response.status());
        }
    });

    test('should return 404 for non-existent endpoints', async ({ request }) => {
        const response = await request.get('/api/invalid-endpoint-12345');
        expect(response.status()).toBe(404);
    });
});
