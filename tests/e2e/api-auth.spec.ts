import { test, expect } from './fixtures';

test.describe('API auth boundary', () => {
  // These routes are currently unprotected. After Step 1's hardening lands,
  // every one of these should return 401 to an unauthenticated request.
  const protectedAfterStep1 = [
    '/api/attendance-today',
    '/api/hr-dashboard',
    '/api/manpower-cost',
    '/api/sync-medical-leave',
    '/api/test-scanner',
  ];

  for (const path of protectedAfterStep1) {
    test(`${path} returns 401 without a session`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(401);
    });
  }

  test('/api/employees returns 401 without a session', async ({ request }) => {
    const res = await request.get('/api/employees');
    expect(res.status()).toBe(401);
  });
});
