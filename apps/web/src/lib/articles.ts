import fs from 'node:fs';
import path from 'node:path';

export type ArticleStatus = 'draft' | 'published';

export type ArticleFrontmatter = {
  slug: string;
  title: string;
  description: string;
  primaryIntent: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  reviewedBy: string;
  relatedProducts: string[];
  status: ArticleStatus;
};

export type PublishedArticle = ArticleFrontmatter & {
  body: string;
  path: string;
};

const ARTICLE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIRED_KEYS: Array<keyof ArticleFrontmatter> = [
  'slug', 'title', 'description', 'primaryIntent', 'publishedAt', 'updatedAt',
  'author', 'reviewedBy', 'relatedProducts', 'status',
];

function contentDirectory(): string {
  const packagePath = path.resolve(process.cwd(), 'content/articles');
  if (fs.existsSync(packagePath)) return packagePath;
  const workspacePath = path.resolve(process.cwd(), 'apps/web/content/articles');
  if (fs.existsSync(workspacePath)) return workspacePath;
  throw new Error(`Published article content directory is missing: ${workspacePath}`);
}

function parseScalar(value: string): string | string[] {
  const trimmed = value.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const parsed: unknown = JSON.parse(trimmed);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      throw new Error('relatedProducts must be an array of strings');
    }
    return parsed;
  }
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(source: string, filePath: string): { frontmatter: ArticleFrontmatter; body: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`Article ${filePath} must start with YAML frontmatter`);

  const values = new Map<string, string | string[]>();
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const separator = line.indexOf(':');
    if (separator < 1) throw new Error(`Invalid frontmatter line in ${filePath}: ${line}`);
    values.set(line.slice(0, separator).trim(), parseScalar(line.slice(separator + 1)));
  }
  for (const key of REQUIRED_KEYS) {
    if (!values.has(key)) throw new Error(`Article ${filePath} is missing frontmatter key: ${key}`);
  }

  const getString = (key: Exclude<keyof ArticleFrontmatter, 'relatedProducts'>): string => {
    const value = values.get(key);
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Article ${filePath} has invalid ${key}`);
    return value.trim();
  };
  const relatedProducts = values.get('relatedProducts');
  if (!Array.isArray(relatedProducts)) throw new Error(`Article ${filePath} has invalid relatedProducts`);
  const slug = getString('slug');
  const status = getString('status');
  if (!ARTICLE_SLUG.test(slug)) throw new Error(`Article ${filePath} has invalid slug: ${slug}`);
  if (status !== 'draft' && status !== 'published') throw new Error(`Article ${filePath} has invalid status: ${status}`);
  for (const dateKey of ['publishedAt', 'updatedAt'] as const) {
    if (Number.isNaN(Date.parse(getString(dateKey)))) throw new Error(`Article ${filePath} has invalid ${dateKey}`);
  }

  return {
    frontmatter: {
      slug,
      title: getString('title'),
      description: getString('description'),
      primaryIntent: getString('primaryIntent'),
      publishedAt: getString('publishedAt'),
      updatedAt: getString('updatedAt'),
      author: getString('author'),
      reviewedBy: getString('reviewedBy'),
      relatedProducts,
      status,
    },
    body: match[2].trim(),
  };
}

function readAllArticles(): PublishedArticle[] {
  const directory = contentDirectory();
  const articles = fs.readdirSync(directory)
    .filter((file) => file.endsWith('.mdx') || file.endsWith('.md'))
    .sort()
    .map((file) => {
      const filePath = path.join(directory, file);
      const parsed = parseFrontmatter(fs.readFileSync(filePath, 'utf8'), filePath);
      return { ...parsed.frontmatter, body: parsed.body, path: filePath };
    });
  const seen = new Set<string>();
  for (const article of articles) {
    if (seen.has(article.slug)) throw new Error(`Duplicate article slug: ${article.slug}`);
    seen.add(article.slug);
  }
  return articles;
}

export async function listPublishedArticles(): Promise<PublishedArticle[]> {
  return readAllArticles()
    .filter((article) => article.status === 'published')
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug));
}

export async function getPublishedArticle(slug: string): Promise<PublishedArticle | null> {
  if (!ARTICLE_SLUG.test(slug)) return null;
  const article = readAllArticles().find((candidate) => candidate.slug === slug && candidate.status === 'published');
  return article ?? null;
}

export async function listPublishedArticlePaths(): Promise<string[]> {
  const articles = await listPublishedArticles();
  return articles.map((article) => `/articles/${article.slug}`);
}
