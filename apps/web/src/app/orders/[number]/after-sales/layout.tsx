import type { Metadata } from 'next';

export const metadata: Metadata = { title: '售后申请', robots: { index: false, follow: false } };
export default function AfterSalesLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
