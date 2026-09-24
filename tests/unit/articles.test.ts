import { describe, expect, test } from 'vitest';
import { getPublishedArticle, listPublishedArticlePaths, listPublishedArticles } from '../../apps/web/src/lib/articles';

describe('published SEO articles', () => {
  test('lists the five reviewed articles in date order', async () => {
    const articles = await listPublishedArticles();
    expect(articles).toHaveLength(5);
    expect(articles.map((article) => article.slug)).toEqual([
      'chatgpt-topup-safety',
      'chatgpt-account-ban-risk',
      'chatgpt-without-overseas-card',
      'chatgpt-topup-password',
      'chatgpt-plus-vs-pro',
    ]);
    expect(articles.every((article) => article.status === 'published')).toBe(true);
  });

  test('returns canonical article paths and rejects traversal or drafts', async () => {
    expect(await listPublishedArticlePaths()).toEqual([
      '/articles/chatgpt-topup-safety',
      '/articles/chatgpt-account-ban-risk',
      '/articles/chatgpt-without-overseas-card',
      '/articles/chatgpt-topup-password',
      '/articles/chatgpt-plus-vs-pro',
    ]);
    expect(await getPublishedArticle('../privacy')).toBeNull();
    expect(await getPublishedArticle('missing-article')).toBeNull();
  });

  test('keeps raw credential examples out of rendered article bodies', async () => {
    const articles = await listPublishedArticles();
    const body = articles.map((article) => article.body).join('\n');
    expect(body).not.toMatch(/accessToken\s*:/i);
    expect(body).not.toMatch(/password\s*[:：]\s*[^\s]/i);
    expect(body).not.toContain('SYNTHETIC-ONLY');
  });
});
