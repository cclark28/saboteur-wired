'use strict';
const seo = require('./_seo');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'https://saboteur.one');
  const pathname = url.searchParams.get('__path') || url.pathname;
  // Old /store?tab=<id> links: 301 to the clean category URL with no query string (QC).
  const tab = url.searchParams.get('tab');
  if (tab !== null && /^\/store\/?$/i.test(pathname)) {
    const TABS = { comics: 'comics', 'prints-and-books': 'books', books: 'books', textures: 'textures', 'original-art': 'original-art', clothing: 'apparel', apparel: 'apparel' };
    const slug = TABS[String(tab).toLowerCase()];
    res.setHeader('Location', (slug ? '/store/' + slug : '/store'));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(301).end();
  }
  let meta;
  try {
    const data = await seo.loadData();
    meta = seo.resolve(pathname, data);
  } catch (err) {
    // Sanity unreachable: serve the plain SPA shell so the site still works, but don't let it be cached long.
    console.error('page render failed', err && err.message);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8'));
  }
  if (url.searchParams.get('__meta') === '1') {
    // Client-side route changes: the SPA asks for the page title and adult rating so they match the server-rendered head.
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
    res.setHeader('X-Robots-Tag', 'noindex');
    return res.status(200).send(JSON.stringify({ title: meta.title || null, adult: !!meta.adult, status: meta.status }));
  }
  const html = seo.render(meta);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
  if (meta.robots) res.setHeader('X-Robots-Tag', meta.robots);
  return res.status(meta.status).send(html);
};
