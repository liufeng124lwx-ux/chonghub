import { test, expect } from '@playwright/test';

test('screening keeps the pasted session snapshot in the browser', async ({ page }) => {
  const bodies: string[] = [];
  page.on('request', (request) => bodies.push(request.postData() ?? ''));
  await page.goto('/requests/demo-order/screening');
  const secret = 'NEVER-SEND-SYNTHETIC';
  await page.getByLabel('会话信息').fill(JSON.stringify({ user: { id: 'fake-user' }, account: { id: 'fake-account', planType: 'free' }, accessToken: secret, expires: '2030-01-01T00:00:00Z' }));
  await page.getByRole('button', { name: '开始初筛' }).click();
  await expect(page.getByText('初步校验通过', { exact: true })).toBeVisible();
  expect(bodies.join('\n')).not.toContain(secret);
  await expect(page.getByLabel('会话信息')).toHaveValue('');
});
