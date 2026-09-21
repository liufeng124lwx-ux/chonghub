import { test, expect } from '@playwright/test';

const synthetic = (planType = 'free', expires = '2099-01-01T00:00:00Z') => JSON.stringify({
  user: { id: 'synthetic-user' }, account: { id: 'synthetic-account', planType },
  accessToken: 'SYNTHETIC-NEVER-UPLOAD', expires,
});

const cases = [
  { name: 'malformed JSON', raw: '{broken', reason: /JSON/ },
  { name: 'missing login', raw: '{}', reason: /登录信息/ },
  { name: 'expired session', raw: synthetic('free', '2000-01-01T00:00:00Z'), reason: /过期/ },
  { name: 'active subscription', raw: synthetic('prolite'), reason: /订阅中/ },
  { name: 'missing fields', raw: synthetic('free', ''), reason: /字段/ },
  { name: 'unknown plan', raw: synthetic('not-supported'), reason: /套餐类型/ },
];

for (const fixture of cases) {
  test(`purchase explains ${fixture.name} before email validation`, async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (request) => { if (request.method() === 'POST') posts.push(request.postData() ?? ''); });
    await page.goto('/products/chatgpt-plus');
    await page.getByLabel('粘贴 ChatGPT 授权内容').fill(fixture.raw);
    await page.getByRole('button', { name: '检测账号', exact: true }).click();
    await page.getByRole('button', { name: '立即购买并生成订单', exact: true }).click();
    const purchase = page.locator('.purchase-order-card');
    await expect(purchase).toContainText(/账号检测(失败|未通过)/);
    await expect(purchase).toContainText(fixture.reason);
    await expect(purchase).toContainText(/换.*账号/);
    await expect(purchase.getByRole('link', { name: /ChatGPT/ })).toHaveAttribute('href', 'https://chatgpt.com/');
    await expect(purchase.locator('a[href="https://chatgpt.com/api/auth/session"]')).toBeVisible();
    await expect(purchase).not.toContainText('请先填写联系邮箱');
    expect(posts).toEqual([]);
  });
}

test('replacement authorization clears failed detection and allows recheck', async ({ page }) => {
  await page.goto('/products/chatgpt-plus');
  const input = page.getByLabel('粘贴 ChatGPT 授权内容');
  await input.fill('{}');
  await page.getByRole('button', { name: '检测账号', exact: true }).click();
  await page.getByRole('button', { name: '立即购买并生成订单', exact: true }).click();
  await input.fill(synthetic());
  await expect(page.locator('.purchase-order-card')).not.toContainText('账号检测失败');
  await page.getByRole('button', { name: '检测账号', exact: true }).click();
  await expect(page.getByText('账号检测通过，可以继续购买。', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '立即购买并生成订单', exact: true }).click();
  await expect(page.locator('.purchase-order-card')).toContainText('请先填写联系邮箱');
});
