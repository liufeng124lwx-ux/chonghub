import type { Metadata } from 'next';

export const metadata: Metadata = { title: '游客订单查询', robots: { index: false, follow: false } };
export default function GuestOrdersLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
