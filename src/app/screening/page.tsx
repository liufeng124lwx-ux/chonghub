import Link from 'next/link';

export const metadata = { title: '账号检测' };

export default function ScreeningEntryPage() {
  return (
    <main className="content-page">
      <section className="container narrow-page">
        <span className="eyebrow">账号检测</span>
        <h1>在浏览器内检查 ChatGPT 账号状态</h1>
        <p className="page-lede">我们不接收、不保存 ChatGPT 会话原文。打开 ChatGPT 会话接口，把 JSON 粘贴到商品页检测框，由你的浏览器本地判断是否处于订阅中。</p>
        <div className="entry-card screening-intro-card">
          <h2>先检测，再购买</h2>
          <p>检测通过后再选择套餐、填写邮箱并生成订单。检测结果只是初步受理依据，不代表付款或交付承诺。</p>
          <div className="entry-actions">
            <Link className="button button-primary" href="/products/chatgpt-plus#purchase">检测 ChatGPT Plus</Link>
            <Link className="button button-secondary" href="/guide#screening">查看操作说明</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
