'use strict';
const seo = require('./_seo');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'https://saboteur.one');
  const pathname = url.searchParams.get('__path') || url.pathname;
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
  const html = seo.render(meta);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
  if (meta.robots) res.setHeader('X-Robots-Tag', meta.robots);
  return res.status(meta.status).send(html);
};
