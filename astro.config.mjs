// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // 换成你自己的域名（例如 https://yourname.eu.org），用于生成绝对链接、RSS 和 sitemap。
  site: 'https://example.com',
  // 生成 /tech/ml/index.html 这样的目录结构，Cloudflare Pages 直接可用。
  build: { format: 'directory' },
});
