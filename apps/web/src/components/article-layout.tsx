import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PublishedArticle } from '@/lib/articles';

function safeHref(href: string): string {
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  if (href.startsWith('https://')) return href;
  return '#';
}

function inlineText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tokenPattern = /(\[[^\]]+\]\([^\s)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith('[')) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const href = safeHref(link[2]);
        nodes.push(href.startsWith('https://')
          ? <a key={`${href}-${match.index}`} href={href} target="_blank" rel="noreferrer">{link[1]}</a>
          : <Link key={`${href}-${match.index}`} href={href}>{link[1]}</Link>);
      }
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={`strong-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<code key={`code-${match.index}`}>{token.slice(1, -1)}</code>);
    }
    cursor = match.index + token.length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function ArticleMarkdown({ body }: { body: string }) {
  const lines = body.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(<p key={`p-${blocks.length}`}>{inlineText(paragraph.join(' '))}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(<ul key={`ul-${blocks.length}`}>{list.map((item, index) => <li key={`${item}-${index}`}>{inlineText(item)}</li>)}</ul>);
    list = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const Heading = heading[1].length === 2 ? 'h2' : 'h3';
      blocks.push(<Heading key={`h-${blocks.length}`}>{inlineText(heading[2])}</Heading>);
      continue;
    }
    if (line.startsWith('- ')) {
      flushParagraph();
      list.push(line.slice(2).trim());
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();

  return <div className="article-prose prose">{blocks}</div>;
}

export function ArticleMeta({ article }: { article: PublishedArticle }) {
  return (
    <div className="article-meta" aria-label="文章信息">
      <span>作者：{article.author}</span>
      <span>审核：{article.reviewedBy}</span>
      <span>更新于：{article.updatedAt}</span>
    </div>
  );
}

export function ArticleRelatedLinks({ article }: { article: PublishedArticle }) {
  return (
    <aside className="article-related" aria-label="继续了解">
      <div>
        <span className="eyebrow">继续了解</span>
        <h2>按你的账号情况继续确认</h2>
        <p>商品条件、检测结果和客服确认以当前页面与订单为准。</p>
      </div>
      <div className="article-related-links">
        <Link className="button button-primary" href="/products">查看当前套餐 <span aria-hidden="true">→</span></Link>
        <Link className="text-link" href="/guide">阅读购买说明 →</Link>
        <Link className="text-link" href="/screening">先检测账号 →</Link>
        {article.relatedProducts.map((slug) => <Link key={slug} className="text-link" href={`/products/${slug}`}>查看 {slug === 'chatgpt-pro-5x' ? 'ChatGPT Pro' : 'ChatGPT Plus'} →</Link>)}
      </div>
    </aside>
  );
}
