"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  mobileLabel?: string;
  className?: string;
  isActive: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: '/products',
    label: '商品',
    mobileLabel: '商品中心',
    className: 'nav-mobile-visible',
    isActive: (pathname) => pathname === '/products' || pathname.startsWith('/products/'),
  },
  {
    href: '/orders',
    label: '订单',
    mobileLabel: '订单中心',
    className: 'nav-mobile-visible',
    isActive: (pathname) => pathname === '/orders' || pathname.startsWith('/orders/') || pathname === '/guest/orders' || pathname.startsWith('/guest/orders/'),
  },
  {
    href: '/screening',
    label: '账号检测',
    isActive: (pathname) => pathname === '/screening' || pathname.endsWith('/screening'),
  },
  {
    href: '/guide',
    label: '购买说明',
    isActive: (pathname) => pathname === '/guide' || pathname.startsWith('/guide/'),
  },
  {
    href: '/privacy',
    label: '隐私说明',
    isActive: (pathname) => pathname === '/privacy' || pathname.startsWith('/privacy/'),
  },
  {
    href: '/me',
    label: '个人中心',
    isActive: (pathname) => pathname === '/me' || pathname.startsWith('/me/'),
  },
  {
    href: '/requests/new',
    label: '提交需求',
    isActive: (pathname) => pathname === '/requests/new' || pathname.startsWith('/requests/new/'),
    className: 'nav-action',
  },
];

function NavLink({ item, pathname, mobile = false }: { item: NavItem; pathname: string; mobile?: boolean }) {
  const active = item.isActive(pathname);
  return (
    <Link
      className={`${item.className ?? ''}${active ? ' is-active' : ''}`.trim()}
      href={item.href}
      aria-current={active ? 'page' : undefined}
    >
      {mobile ? item.mobileLabel ?? item.label : item.label}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname() ?? '/';

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href="/" aria-label="ChongHub 首页">
          <span className="brand-mark">C</span>
          <span>ChongHub</span>
        </Link>
        <nav className="main-nav" aria-label="主导航">
          {navItems.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
        </nav>
        <details className="mobile-menu">
          <summary aria-label="打开菜单">菜单</summary>
          <div className="mobile-menu-panel">
            {navItems.map((item) => <NavLink key={item.href} item={item} pathname={pathname} mobile />)}
          </div>
        </details>
      </div>
    </header>
  );
}
