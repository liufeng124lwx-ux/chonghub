import type { Metadata } from 'next';

export const metadata: Metadata = { title: '订单账号初筛', robots: { index: false, follow: false } };
export default function RequestScreeningLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
