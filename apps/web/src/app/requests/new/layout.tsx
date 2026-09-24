import type { Metadata } from 'next';

export const metadata: Metadata = { title: '提交需求', robots: { index: false, follow: false } };
export default function NewRequestLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
