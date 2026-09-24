import type { Metadata } from 'next';

export const metadata: Metadata = { title: '邮箱登录', robots: { index: false, follow: false } };
export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
