import type { Metadata } from 'next';

export const metadata: Metadata = { title: '个人中心', robots: { index: false, follow: false } };
export default function MeLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
