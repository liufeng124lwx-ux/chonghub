import type { Metadata } from 'next';

export const metadata: Metadata = { title: '订单详情', robots: { index: false, follow: false } };
export default function OrderDetailLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
