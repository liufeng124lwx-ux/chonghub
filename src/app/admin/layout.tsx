import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { readActor } from '@/modules/auth/access';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({children}:{children:React.ReactNode}){
  const requestHeaders = await headers();
  const actor = await readActor(new Request('http://localhost', { headers: requestHeaders }));
  if (!actor || actor.kind !== 'admin') redirect('/login?next=/admin');
  return <><header className="admin-header"><div className="container header-inner"><Link className="brand" href="/admin"><span className="brand-mark">C</span><span>ChongHub 管理后台</span></Link><nav><Link href="/admin/orders">订单</Link><Link href="/admin/products">商品</Link><Link href="/admin/settings">设置</Link></nav></div></header>{children}</>;
}
