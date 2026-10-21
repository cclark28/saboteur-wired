'use strict';
const seo = require('./_seo');

module.exports = async function handler(req, res) {
  try {
    const xml = seo.sitemap(await seo.loadData());
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(xml);
  } catch (err) {
    console.error('sitemap failed', err && err.message);
    return res.status(503).send('Sitemap temporarily unavailable');
  }
};
