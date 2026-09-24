import { getEnv } from '@chonghub/core/server/env';

const PRODUCTION_SITE_URL = 'https://chonghub.com';
const LOCAL_SITE_URL = 'http://localhost:3000';

function resolveSiteUrl(): URL {
  const configured = process.env.APP_ORIGIN;
  const fallback = process.env.NODE_ENV === 'production' ? PRODUCTION_SITE_URL : LOCAL_SITE_URL;
  let value = configured || fallback;
  try {
    // Validate the same environment contract used by the application when it is available.
    // Keep the SEO helpers usable in unit tests that do not boot the database layer.
    if (!configured) value = getEnv().APP_ORIGIN || fallback;
  } catch {
    value = fallback;
  }
  const url = new URL(value);
  if (process.env.NODE_ENV === 'production' || url.hostname === 'www.chonghub.com' || url.hostname === 'chonghub.com') {
    return new URL(PRODUCTION_SITE_URL);
  }
  url.pathname = '';
  url.search = '';
  url.hash = '';
  return url;
}

export const siteUrl = resolveSiteUrl();
export const siteName = 'ChongHub';
export const googleSiteVerification = 'FyJ0S0-fNhrPAwk2ZUg8YlzZDzvjCIQOY5vUw_xEARA';
export const siteDescription = '为已有 ChatGPT 账号提供人工会员充值服务，先检测账号状态，再由客服确认条件与交付。';
export const siteLogoPath = '/images/logo.svg';
export const siteOgImagePath = '/images/og-default.png';

export const siteMetadata = {
  title: 'ChatGPT 会员充值服务 | ChongHub',
  description: siteDescription,
  keywords: ['ChatGPT Plus', 'ChatGPT Pro', 'ChatGPT 充值', 'ChatGPT 会员充值'],
};

export function absoluteUrl(path = '/'): string {
  if (!path.startsWith('/')) throw new Error(`SEO URL path must start with '/': ${path}`);
  return new URL(path, siteUrl).toString();
}

export function canonicalPath(path: string): string {
  if (!path.startsWith('/') || path.includes('?') || path.includes('#')) {
    throw new Error(`Canonical SEO paths cannot contain a query or fragment: ${path}`);
  }
  return path === '/' ? '/' : path.replace(/\/+$/, '');
}

export function canonicalUrl(path = '/'): string {
  return absoluteUrl(canonicalPath(path));
}

export const siteLogoUrl = absoluteUrl(siteLogoPath);
export const siteOgImageUrl = absoluteUrl(siteOgImagePath);
