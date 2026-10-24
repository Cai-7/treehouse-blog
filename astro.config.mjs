// @ts-check
import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  // 网站正式地址，用于生成绝对链接和 RSS。以后绑定自己的域名时改这里和 src/data/site.json 的 url。
  site: 'https://xujiacai.netlify.app',
  // 生成 /tech/ml/index.html 这样的目录结构，Cloudflare Pages 直接可用。
  build: { format: 'directory' },
  // 文章里的公式（行内 $...$，独立成行的 $$...$$）用 KaTeX 排版；样式文件在 public/katex/。
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { strict: false, throwOnError: false }]],
  },
});
