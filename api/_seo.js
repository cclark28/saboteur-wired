// Server-rendered head + crawlable HTML for saboteur.one routes.
// Used by api/page.js (every page route except "/") and api/sitemap.js.
// Data comes from Sanity 6td8xalf/production (public, read-only). Nothing here writes anywhere.
'use strict';
const fs = require('fs');
const path = require('path');

const SITE = 'https://saboteur.one';
const BRAND = '\u00aeSaboteur';
const EMAIL = 'store@saboteur.one';
const SANITY = 'https://6td8xalf.apicdn.sanity.io/v2024-01-01/data/query/production';
// Non-explicit fallback share image: the full (R)SABOTEUR logo on white, 1200x630 PNG served by api/og-logo.js.
const FALLBACK_OG = { url: SITE + '/og/saboteur-logo.png', w: 1200, h: 630, alt: 'The ' + BRAND + ' logo, black on white' };
const COMICS_OG = { url: SITE + '/assets/og-tommys-cover.jpg', w: 1080, h: 1080, alt: "Tommy's Issue #1 comic cover" };
// Product images reviewed as non-explicit even though the product asks for 18+ confirmation.
const OG_SAFE_AGE_SLUGS = { 'tommys-issue-1': 1, 'tommys-issue-1-bts': 1 };
// Product images that show nudity although the product does not ask for 18+ confirmation (flagged for Charlie).
const OG_EXPLICIT_SLUGS = { 'pinup-issue-2-tommy-s': 1, 'crisdev': 1 };
const PHYSICAL_PAUSE_START_MS = Date.parse('2026-08-19T00:00:00-04:00');
const POLICIES_LASTMOD = '2026-10-21';
const FACTS_LASTMOD = '2026-10-21';
// Pages whose code-side copy changed (QC copy Rev 3/4); bumps sitemap lastmod even when Sanity did not change.
const CODE_LASTMOD = { comics: '2026-10-21', clothing: '2026-10-21', art: '2026-10-21', explorations: '2026-10-21' };

const CATS = [
  { id: 'comics', slug: 'comics', label: 'Comics',
    title: 'Comics - Indie Adult Comics | ' + BRAND,
    // QC copy Rev 3 A1 (no Tommy's plot claims; logline still awaiting Charlie).
    desc: 'Comics by Charlie Clark from ' + BRAND + ": Tommy's Issue #1 in print and its behind-the-scenes PDF. Print issue and digital extras. Adults only (18+).",
    intro: 'Comics by Charlie Clark from ' + BRAND + '. Print issue and digital extras. Adults only (18+).',
    og: COMICS_OG },
  { id: 'prints-and-books', slug: 'books', label: 'Books & Zines',
    title: 'Photo Books & Zines - Digital PDFs | ' + BRAND,
    desc: 'Digital photo books and zines by Charlie Clark, published by ' + BRAND + '. Fine art photography series delivered as PDF downloads. Adults only (18+).',
    intro: 'Digital photo books and zines by Charlie Clark, published by ' + BRAND + '. Fine art photography for adults (18+), delivered as PDF.' },
  { id: 'textures', slug: 'textures', label: 'Textures',
    title: 'Textures - Scanned Paper, Screentone & Paint | ' + BRAND,
    desc: 'High-resolution scanned textures for illustrators and designers: paper, screentone, newsprint, gel plate and paint. Many are free downloads from ' + BRAND + '.',
    intro: 'High-resolution scanned textures for illustrators and designers: paper, screentone, newsprint, gel plate, paint and more. Many are free.' },
  { id: 'original-art', slug: 'original-art', label: 'Original Art',
    title: 'Original Comic Art for Sale - Covers & Pinups | ' + BRAND,
    desc: 'Original comic covers and pinups by Charlie Clark: pencil, ink and screentone on bristol board, 11x17. One of a kind pieces from ' + BRAND + '.',
    intro: 'Original comic covers and pinups by Charlie Clark: pencil, ink and screentone on bristol board.' },
  { id: 'clothing', slug: 'apparel', label: 'Apparel',
    title: 'Apparel - Tees and Totes | ' + BRAND,
    desc: BRAND + " apparel: graphic tees and a tote bag in the studio's comic art style by Charlie Clark. Sold out for now. Physical shipping is paused.",
    intro: BRAND + " tees and totes in the studio's comic art style. Sold out. Physical shipping is paused." },
];
const catById = (id) => CATS.find((c) => c.id === id);
const catBySlug = (s) => CATS.find((c) => c.slug === s);

let SHELL = null;
function shell() {
  if (!SHELL) SHELL = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  return SHELL;
}

const QUERY = `{
  "products": *[_type == "product" && published == true && enabled != false] | order(coalesce(displayOrder, 999) asc, title asc) {
    _id, _updatedAt, title, "slug": slug.current, description, priceCents, fulfillmentType, category,
    requiresAgeConfirm, soldOut, comingSoon, stock, variants, productDetails, "seoDesc": seo.description,
    "imageUrl": images[0].asset->url, "imageW": images[0].asset->metadata.dimensions.width
  },
  "sections": *[_type == "section"] | order(sortOrder asc) { title, "slug": slug.current, showInNav, isInfoPage, isAbout, comingSoon, _updatedAt },
  "settings": *[_type == "siteSettings"][0] { infoHeadline, infoSubhead, infoParagraphs, physicalOrdersEnabled, _updatedAt },
  "assets": *[_type == "asset"] | order(_updatedAt desc) { headline, subhead, title, "secs": sections[]->slug.current, showOnHome, _updatedAt }
}`;

let cache = { at: 0, data: null };
async function loadData() {
  if (cache.data && Date.now() - cache.at < 60 * 1000) return cache.data;
  const res = await fetch(SANITY + '?query=' + encodeURIComponent(QUERY));
  if (!res.ok) throw new Error('Sanity ' + res.status);
  const json = await res.json();
  cache = { at: Date.now(), data: json.result };
  return json.result;
}

// ---------- helpers ----------
// No em dashes in anything we emit (QC): Sanity text with an em dash gets a comma instead.
const noDash = (s) => String(s == null ? '' : s).replace(/\s*\u2014\s*/g, ', ');
const esc = (s) => noDash(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isPhysical = (ft) => ft === 'paid_physical' || ft === 'paid_physical_variant';
const isComingSoon = (p) => p.comingSoon === true || p.comingSoon === 'true';
const isSoldOut = (p) => {
  if (p.soldOut === true || p.soldOut === 'true') return true;
  if (p.fulfillmentType === 'paid_physical' && p.stock !== null && p.stock !== undefined && p.stock !== '' && Number(p.stock) === 0) return true;
  if (p.fulfillmentType === 'paid_physical_variant' && Array.isArray(p.variants) && p.variants.length && p.variants.every((v) => Number(v && v.stock) === 0)) return true;
  return false;
};
function physicalLive(flag) {
  if (flag === false) return false;
  if (Date.now() >= PHYSICAL_PAUSE_START_MS) return flag === true;
  return true;
}
function isFree(p) { return p.fulfillmentType === 'free_digital' || !p.priceCents; }
function priceText(p) { return isFree(p) ? 'Free' : '$' + (Number(p.priceCents) / 100).toFixed(2).replace(/\.00$/, ''); }
function offerPrice(p) { return isFree(p) ? '0' : (Number(p.priceCents) / 100).toFixed(2); }
// Mirrors the SPA's isProductUnavailable / badge logic.
function status(p, settings) {
  if (isComingSoon(p)) return { key: 'coming', text: 'Coming soon', schema: null };
  if (isSoldOut(p)) return { key: 'sold', text: 'Sold out', schema: 'https://schema.org/SoldOut' };
  if (isPhysical(p.fulfillmentType) && !physicalLive(settings && settings.physicalOrdersEnabled)) {
    return { key: 'paused', text: 'Physical shipping is paused for now', schema: 'https://schema.org/OutOfStock' };
  }
  return { key: 'live', text: isFree(p) ? 'Free download' : 'Available now', schema: 'https://schema.org/InStock' };
}
function shortName(t) {
  return String(t || '').replace(/\s*\((digital download|u\.s\. shipping included)\)\s*$/i, '').trim();
}
function clip(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const i = cut.lastIndexOf(' ');
  return (i > n * 0.6 ? cut.slice(0, i) : cut).replace(/[,;:\s\u2014-]+$/, '') + '\u2026';
}
function fitTitle(name, qualifier) {
  const tail = ' | ' + BRAND;
  const D = ' - ';
  const cands = [name + (qualifier ? D + qualifier : ''), name];
  const ci = name.indexOf(': ');
  if (ci > 0) {
    const before = name.slice(0, ci).trim(), after = name.slice(ci + 2).trim();
    cands.push(after + D + before);
    if (qualifier) cands.push(after + D + qualifier);
    cands.push(after);
  }
  // Titles stay under 60 characters (QC).
  for (const c of cands) if ((c + tail).length < 60) return c + tail;
  return clip(name, 59 - tail.length) + tail;
}
function fitDesc(parts, pads) {
  let s = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  for (const p of pads) { if (s.length >= 120) break; if ((s + ' ' + p).length <= 155) s += ' ' + p; }
  return s.length > 155 ? clip(s, 155) : s;
}
const PADS = ['Sold by ' + BRAND + ', an independent art studio and publisher.'];
// Hand-written, non-explicit section descriptions (SITE.md: never pull post titles into metadata).
const SECTION_DESC = {
  art: 'Original drawings, paintings and comic art by Charlie Clark from ' + BRAND + ', an independent art studio and publishing imprint. Pencil, ink and paint.',
  photography: 'Photography by Charlie Clark from ' + BRAND + ': portraits, street work and figure studies, from an independent art studio and publishing imprint.',
  explorations: 'Experiments in ink, paper animation, video and 3D scanning by Charlie Clark from ' + BRAND + ', an independent art studio and publishing imprint.',
};
function details(p) { return p.productDetails || {}; }
function pagesOf(p) { const n = parseInt(details(p).pages, 10); return Number.isFinite(n) && n > 0 ? n : null; }
function isTommys(p) { return /tommy/i.test(p.title || '') || /tommy/i.test(p.slug || ''); }

function qualifier(p) {
  const c = p.category;
  if (c === 'prints-and-books') return 'Digital Photo Book';
  if (c === 'comics') return isPhysical(p.fulfillmentType) ? 'Print Comic' : 'Digital PDF';
  if (c === 'textures') return isFree(p) ? 'Free Texture Pack' : 'Texture Pack';
  if (c === 'original-art') return 'Original Art';
  if (c === 'clothing') return 'Apparel';
  return '';
}
// Trim whole sentences from the end before falling back to a mid-sentence clip.
function fitSentences(s, n) {
  if (s.length <= n) return s;
  const parts = s.split(/(?<=[.!?])\s+/);
  while (parts.length > 1 && parts.join(' ').length > n) parts.pop();
  const out = parts.join(' ');
  return out.length <= n ? out : clip(out, n);
}
function productDesc(p, settings) {
  // QC: the product's own Sanity seo.description wins; generated copy is only the fallback.
  const own = String(p.seoDesc || '').replace(/\s+/g, ' ').trim();
  if (own) {
    // Free downloads always say so (Charlie, 21 Oct): append when the Sanity text lacks it.
    const tail = isFree(p) && !/\bfree\b/i.test(own) ? ' Free download.' : '';
    return fitSentences(noDash(own), 155 - tail.length) + tail;
  }
  const name = shortName(p.title);
  const st = status(p, settings);
  const d = details(p);
  const pages = pagesOf(p);
  const price = st.key === 'coming' ? 'Coming soon.' : (isFree(p) ? 'Free download.' : priceText(p) + '.');
  const shipPaused = isPhysical(p.fulfillmentType) && !physicalLive(settings && settings.physicalOrdersEnabled);
  const avail = st.key === 'sold' ? (shipPaused ? 'Sold out, and physical shipping is paused for now.' : 'Sold out.') : st.key === 'paused' ? 'Physical shipping is paused for now.' : '';
  const c = p.category;
  let lead;
  if (c === 'prints-and-books') lead = name + ': a ' + (pages ? pages + '-page ' : '') + 'digital photo book (PDF) by Charlie Clark, published by ' + BRAND + '.';
  else if (c === 'comics') lead = isPhysical(p.fulfillmentType)
    ? name + ': ' + (pages ? 'a ' + pages + '-page ' : 'a ') + 'print comic book from ' + BRAND + '.'
    : name + ': ' + (pages ? 'a ' + pages + '-page ' : 'a ') + "digital PDF from " + BRAND + (isTommys(p) ? ", the making of Tommy's." : '.');
  else if (c === 'textures') lead = name + ': ' + (d.format ? d.format + ' of ' : '') + 'high-resolution texture scans for artists and designers from ' + BRAND + '.';
  else if (c === 'original-art') lead = name + ': original ' + (d.size || d.resolution ? String(d.size || d.resolution).trim() + ' ' : '') + 'art by Charlie Clark' + (d.format ? ' (' + String(d.format).trim() + ')' : '') + '.';
  else if (c === 'clothing') lead = name + ': ' + BRAND + ' apparel in the studio\u2019s comic art style.';
  else lead = name + ' from ' + BRAND + '.';
  const adult = p.requiresAgeConfirm ? 'Adults only (18+).' : '';
  return fitDesc([lead, price, avail, adult], PADS);
}
function imgAlt(p) {
  const name = shortName(p.title);
  const c = p.category;
  if (c === 'prints-and-books') return 'Cover of ' + name + ', a digital photo book by Charlie Clark';
  if (c === 'comics') return 'Cover of ' + name;
  if (c === 'textures') return 'Preview of the ' + name + ' texture scans';
  if (c === 'original-art') return name + ', original art by Charlie Clark';
  if (c === 'clothing') return name + ', ' + BRAND + ' apparel';
  return name;
}
function productOg(p) {
  const safe = !OG_EXPLICIT_SLUGS[p.slug] && (!p.requiresAgeConfirm || OG_SAFE_AGE_SLUGS[p.slug]);
  if (p.imageUrl && safe) {
    return { url: p.imageUrl + '?w=1200&h=630&fit=fill&bg=ffffff&fm=jpg&q=85', w: 1200, h: 630, alt: imgAlt(p) };
  }
  return Object.assign({ flagged: !!p.imageUrl }, FALLBACK_OG);
}
// SafeSearch: <meta name="rating" content="adult"> (https://developers.google.com/search/docs/specialty/explicit/guidelines,
// "Add metadata to pages with sexually explicit content"). Per page, only where the page's OWN images show nudity,
// from a visual check of the Sanity images on 2026-10-21. Pages we could not judge are listed in FIXES.md, not tagged.
const NUDITY_PRODUCT_SLUGS = { 'pinup-issue-2-tommy-s': 1, 'tommy': 1, 'this-book-is-anonymous': 1, 'the-romania-hotel-series-anato': 1, 'camelia-arama': 1 };
const NUDITY_CATEGORY_IDS = { 'prints-and-books': 1, 'original-art': 1 }; // grid thumbnails include the products above
const NUDITY_SECTION_SLUGS = { photography: 1 }; // gallery thumbnails include nude photographs
function adultImage(p) { return !!(p && NUDITY_PRODUCT_SLUGS[p.slug]); }
// Shopping signal (hasAdultConsideration): 18+ products and products whose images show nudity.
function adultProduct(p) { return !!(p && (p.requiresAgeConfirm || NUDITY_PRODUCT_SLUGS[p.slug] || OG_EXPLICIT_SLUGS[p.slug])); }
function productUrl(p) { return SITE + '/store/' + encodeURIComponent(p.slug); }
function catUrl(c) { return SITE + '/store/' + c.slug; }

// ---------- JSON-LD ----------
function breadcrumb(items) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: it[1] })) };
}
function productLd(p, settings) {
  const st = status(p, settings);
  const types = ['Product'];
  const ld = {
    '@id': productUrl(p) + '#product',
    name: shortName(p.title),
    // Adult titles get the neutral template text (SEO-RULES C: non-explicit metadata); others use the Sanity description.
    description: p.requiresAgeConfirm ? productDesc(p, settings) : clip(p.description || productDesc(p, settings), 500),
    sku: p.slug,
    url: productUrl(p),
    brand: { '@type': 'Brand', name: BRAND },
  };
  if (p.imageUrl) ld.image = [p.imageUrl + '?w=1200&fm=jpg&q=85'];
  if (adultProduct(p)) ld.hasAdultConsideration = 'https://schema.org/SexualContentConsideration';
  if (st.schema && p.fulfillmentType) {
    ld.offers = {
      '@type': 'Offer', url: productUrl(p), price: offerPrice(p), priceCurrency: 'USD',
      availability: st.schema, itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': SITE + '/#studio' },
      // Matches /policies: "All sales are final".
      hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: 'US', returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted', merchantReturnLink: SITE + '/policies' },
    };
  }
  const pages = pagesOf(p);
  if (p.category === 'prints-and-books' || (p.category === 'comics' && !isPhysical(p.fulfillmentType))) {
    types.push('Book');
    ld.author = { '@id': SITE + '/#charlie' };
    ld.publisher = { '@id': SITE + '/#studio' };
    ld.bookFormat = isPhysical(p.fulfillmentType) ? 'https://schema.org/Paperback' : 'https://schema.org/EBook';
    if (pages) ld.numberOfPages = pages;
    if (p.category === 'comics' && isTommys(p)) ld.about = { '@type': 'ComicSeries', name: "Tommy's", publisher: { '@id': SITE + '/#studio' } };
  } else if (p.category === 'comics') {
    types.push('ComicIssue');
    const m = /#\s*(\d+)/.exec(p.title || '');
    if (m) ld.issueNumber = Number(m[1]);
    ld.author = { '@id': SITE + '/#charlie' };
    ld.publisher = { '@id': SITE + '/#studio' };
    if (isTommys(p)) ld.isPartOf = { '@type': 'ComicSeries', name: "Tommy's", publisher: { '@id': SITE + '/#studio' } };
  } else if (p.category === 'original-art') {
    ld.material = details(p).format || undefined;
  }
  ld['@type'] = types.length === 1 ? 'Product' : types;
  return ld;
}
function ldScript(graph) {
  const json = noDash(JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })).replace(/</g, '\\u003c');
  return '<script type="application/ld+json" data-page-ld>' + json + '</script>';
}

// ---------- body (crawlable, replaced by the SPA on mount) ----------
const LINK = 'color:#18181B;text-decoration:underline;text-underline-offset:2px';
function navHtml(sections) {
  const secs = (sections || []).filter((s) => s.showInNav !== false && s.slug && s.slug !== 'store' && !s.isInfoPage && !s.isAbout);
  const links = [['/', 'Home'], ['/store', 'Store']]
    .concat(CATS.map((c) => ['/store/' + c.slug, c.label]))
    .concat(secs.map((s) => ['/' + s.slug, s.title]))
    .concat([['/about', 'About'], ['/policies', 'Store Policies'], ['/facts', 'What we sell']]);
  return '<nav aria-label="Site"><ul style="list-style:none;padding:0;margin:0 0 24px;display:flex;flex-wrap:wrap;gap:8px 16px">' +
    links.map((l) => '<li><a href="' + l[0] + '" style="' + LINK + '">' + esc(l[1]) + '</a></li>').join('') + '</ul></nav>';
}
function crumbsHtml(items) {
  return '<nav aria-label="Breadcrumb" style="margin:0 0 16px;font-size:12px">' + items.map((it, i) =>
    i === items.length - 1 ? '<span>' + esc(it[0]) + '</span>' : '<a href="' + it[1].replace(SITE, '') + '" style="' + LINK + '">' + esc(it[0]) + '</a> \u203a ').join('') + '</nav>';
}
function wrapBody(inner, sections) {
  // White veil = same look as the age gate, shown until the SPA mounts; content stays in the HTML underneath.
  return '<div id="ssr-veil" aria-hidden="true" style="position:fixed;inset:0;z-index:9999;background:#fff"></div>' +
    '<noscript><style>#ssr-veil{display:none}</style></noscript>' +
    '<div data-ssr style="max-width:720px;margin:0 auto;padding:96px 20px;font-family:IBM Plex Mono,ui-monospace,monospace;font-size:14px;line-height:1.6;color:#18181B">' +
    navHtml(sections) + inner +
    '<p style="margin-top:32px;font-size:12px">Contact: <a href="mailto:' + EMAIL + '" style="' + LINK + '">' + EMAIL + '</a> \u00b7 <a href="/policies" style="' + LINK + '">Store Policies</a></p>' +
    '</div>';
}
function productListHtml(list, settings) {
  return '<ul style="padding-left:18px">' + list.map((p) => {
    const st = status(p, settings);
    const price = st.key === 'coming' ? 'Coming soon' : priceText(p);
    const extra = (st.key === 'sold' || st.key === 'paused') ? ' \u00b7 ' + st.text : '';
    return '<li><a href="/store/' + encodeURIComponent(p.slug) + '" style="' + LINK + '">' + esc(p.title) + '</a>, ' + esc(price) + esc(extra) + '</li>';
  }).join('') + '</ul>';
}

// ---------- routes ----------
function base(meta) {
  return Object.assign({ adult: false, status: 200, robots: null, og: FALLBACK_OG, ogType: 'website', ld: [], body: '' }, meta);
}
function resolve(pathname, data) {
  const products = data.products || [];
  const sections = data.sections || [];
  const settings = data.settings || {};
  let p = String(pathname || '/').split('?')[0];
  try { p = decodeURIComponent(p); } catch (e) {}
  p = p.replace(/\/+$/, '') || '/';
  const lower = p.toLowerCase();
  const home = ['Home', SITE + '/'];
  const store = ['Store', SITE + '/store'];

  if (lower === '/store' || lower === '/store/all') {
    const desc = 'The ' + BRAND + ' store: comics, digital photo books and zines, texture packs, original comic art and apparel by Charlie Clark. Prices in USD.';
    const inner = crumbsHtml([home, ['Store', SITE + '/store']]) + '<h1>Store</h1>' +
      '<p>Comics, photo books and zines, textures, original art and apparel from ' + esc(BRAND) + '.</p>' +
      CATS.map((c) => {
        const list = products.filter((x) => x.category === c.id);
        return list.length ? '<h2><a href="/store/' + c.slug + '" style="' + LINK + '">' + esc(c.label) + '</a></h2>' + productListHtml(list, settings) : '';
      }).join('');
    return base({ adult: true, title: 'Store - Comics, Photo Books, Textures & Art | ' + BRAND, desc, canonical: SITE + '/store',
      ld: [{ '@type': 'CollectionPage', '@id': SITE + '/store#page', url: SITE + '/store', name: 'Store', isPartOf: { '@id': SITE + '/#website' } }, breadcrumb([home, store])],
      body: wrapBody(inner, sections) });
  }
  const m = lower.match(/^\/store\/([^/]+)$/);
  if (m) {
    const cat = catBySlug(m[1]) || catById(m[1]);
    if (cat) {
      const list = products.filter((x) => x.category === cat.id);
      const inner = crumbsHtml([home, store, [cat.label, catUrl(cat)]]) + '<h1>' + esc(cat.label) + '</h1><p>' + esc(cat.intro) + '</p>' +
        (list.length ? productListHtml(list, settings) : '<p>Nothing here yet. Check back soon.</p>') +
        '<p><a href="/store" style="' + LINK + '">All categories</a></p>';
      return base({ adult: !!NUDITY_CATEGORY_IDS[cat.id], title: cat.title, desc: cat.desc, canonical: catUrl(cat), og: cat.og || FALLBACK_OG,
        ld: [{ '@type': 'CollectionPage', '@id': catUrl(cat) + '#page', url: catUrl(cat), name: cat.label, isPartOf: { '@id': SITE + '/#website' },
          mainEntity: { '@type': 'ItemList', itemListElement: list.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: productUrl(x), name: shortName(x.title) })) } },
          breadcrumb([home, store, [cat.label, catUrl(cat)]])],
        body: wrapBody(inner, sections) });
    }
    const prod = products.find((x) => String(x.slug || '').toLowerCase() === m[1]);
    if (prod) return productRoute(prod, products, sections, settings);
    return notFound(sections);
  }
  if (lower === '/about' || lower === '/info' || lower === '/contact' || lower === '/info-contact') {
    const paras = (settings.infoParagraphs || []).filter(Boolean);
    const desc = fitDesc([(paras[0] || BRAND + ' is the art studio and publishing imprint of Charlie Clark.')], ['Contact: ' + EMAIL + '.', 'Comics, photo books, original art and apparel.']);
    const inner = crumbsHtml([home, ['About', SITE + '/about']]) + '<h1>' + esc(settings.infoHeadline || 'About') + '</h1>' +
      (settings.infoSubhead ? '<p>' + esc(settings.infoSubhead) + '</p>' : '') + paras.map((x) => '<p>' + esc(x) + '</p>').join('');
    // Title leads with the same words as the H1 (Sanity siteSettings.infoHeadline).
    return base({ title: (settings.infoHeadline || 'About') + ' - About ' + BRAND + ' and Charlie Clark', desc, canonical: SITE + '/about',
      ld: [{ '@type': 'AboutPage', '@id': SITE + '/about#page', url: SITE + '/about', name: 'About ' + BRAND, about: { '@id': SITE + '/#studio' }, isPartOf: { '@id': SITE + '/#website' } }, breadcrumb([home, ['About', SITE + '/about']])],
      body: wrapBody(inner, sections) });
  }
  if (lower === '/policies') return policiesRoute(sections);
  if (lower === '/checkout' || lower === '/resend' || lower === '/order-success') {
    const names = { '/checkout': 'Checkout', '/resend': 'Re-send downloads', '/order-success': 'Order confirmation' };
    return base({ title: names[lower] + ' | ' + BRAND, desc: BRAND + ' store: ' + names[lower].toLowerCase() + '.', canonical: SITE + lower, robots: 'noindex, follow',
      body: wrapBody('<h1>' + esc(names[lower]) + '</h1>', sections) });
  }
  if (lower === '/404' || lower === '/not-found') return notFound(sections);
  const one = lower.match(/^\/([a-z0-9-]+)$/);
  if (one) {
    const sec = sections.find((s) => s.slug === one[1]);
    if (sec && sec.slug !== 'store') {
      const posts = (data.assets || []).filter((a) => (a.secs || []).indexOf(sec.slug) >= 0);
      const hidden = sec.showInNav === false;
      const desc = SECTION_DESC[sec.slug] || fitDesc([sec.title + ' by Charlie Clark at ' + BRAND + ', an independent art studio and publishing imprint.'], PADS);
      const inner = crumbsHtml([home, [sec.title, SITE + '/' + sec.slug]]) + '<h1>' + esc(sec.title) + '</h1>' +
        (posts.length ? '<ul style="padding-left:18px">' + posts.map((a) => '<li><strong>' + esc(a.headline || a.title || 'Untitled') + '</strong>' + (a.subhead ? ': ' + esc(clip(a.subhead, 160)) : '') + '</li>').join('') + '</ul>' : '');
      return base({ adult: !!NUDITY_SECTION_SLUGS[sec.slug], title: fitTitle(sec.title, 'Charlie Clark'), desc, canonical: SITE + '/' + sec.slug, robots: hidden ? 'noindex, follow' : null,
        ld: [{ '@type': 'CollectionPage', '@id': SITE + '/' + sec.slug + '#page', url: SITE + '/' + sec.slug, name: sec.title, isPartOf: { '@id': SITE + '/#website' } }, breadcrumb([home, [sec.title, SITE + '/' + sec.slug]])],
        body: wrapBody(inner, sections) });
    }
  }
  return notFound(sections);
}
function productRoute(p, products, sections, settings) {
  const cat = catById(p.category);
  const st = status(p, settings);
  const d = details(p);
  const og = productOg(p);
  const crumbs = [['Home', SITE + '/'], ['Store', SITE + '/store']].concat(cat ? [[cat.label, catUrl(cat)]] : []).concat([[shortName(p.title), productUrl(p)]]);
  const related = products.filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 3);
  const facts = [];
  if (d.format) facts.push(['Format', d.format]);
  if (pagesOf(p)) facts.push(['Pages', String(pagesOf(p))]);
  if (d.size) facts.push(['Size', d.size]);
  if (d.resolution) facts.push(['Resolution', d.resolution]);
  if (d.material) facts.push(['Material', d.material]);
  facts.push(['Delivery', !isPhysical(p.fulfillmentType) ? 'Digital download' : (physicalLive(settings && settings.physicalOrdersEnabled) ? 'Physical item, ships within the U.S.' : 'Physical item, shipping is paused for now')]);
  const inner = crumbsHtml(crumbs) +
    '<h1>' + esc(p.title) + '</h1>' +
    (p.imageUrl ? '<img src="' + esc(p.imageUrl + '?w=800&fm=jpg&q=80') + '" alt="' + esc(imgAlt(p)) + '" width="400" loading="lazy" style="max-width:100%;height:auto;display:block;margin:0 0 16px">' : '') +
    '<p><strong>' + esc(st.key === 'coming' ? 'Coming soon' : priceText(p)) + '</strong>' + (st.key !== 'live' && st.key !== 'coming' ? ' \u00b7 ' + esc(st.text) : '') + '</p>' +
    '<dl>' + facts.map((f) => '<dt style="display:inline;font-weight:600">' + esc(f[0]) + ':</dt> <dd style="display:inline;margin:0 12px 0 4px">' + esc(String(f[1]).trim()) + '</dd>').join('') + '</dl>' +
    String(p.description || '').split(/\n\s*\n/).filter((x) => x.trim()).map((x) => '<p>' + esc(x.trim()) + '</p>').join('') +
    (p.requiresAgeConfirm ? '<p><strong>18+:</strong> This work contains nudity, violence and other adult material. You must be 18 or older to view or buy it.</p>' : '') +
    (cat ? '<p>More in <a href="' + catUrl(cat).replace(SITE, '') + '" style="' + LINK + '">' + esc(cat.label) + '</a>' : '<p>') +
    (related.length ? ': ' + related.map((x) => '<a href="/store/' + encodeURIComponent(x.slug) + '" style="' + LINK + '">' + esc(shortName(x.title)) + '</a>').join(', ') : '') + '</p>';
  return base({
    adult: adultImage(p),
    title: fitTitle(shortName(p.title), qualifier(p)), desc: productDesc(p, settings), canonical: productUrl(p), og, ogType: 'product',
    ld: [productLd(p, settings), breadcrumb(crumbs)], body: wrapBody(inner, sections),
    extraHead: (st.schema && p.fulfillmentType ? '<meta property="product:price:amount" content="' + offerPrice(p) + '"><meta property="product:price:currency" content="USD">' : ''),
  });
}
function policiesRoute(sections) {
  const mail = '<a href="mailto:' + EMAIL + '" style="' + LINK + '">';
  const inner = crumbsHtml([['Home', SITE + '/'], ['Store Policies', SITE + '/policies']]) + '<h1>Store Policies</h1>' +
    '<h2>Age requirement</h2><p>' + esc(BRAND) + ' publishes work for adults. Some titles contain nudity, violence and other mature content. By purchasing, you confirm you are 18 or older.</p>' +
    '<h2>Digital downloads</h2><p>After payment, your download opens on the confirmation page. Save it. If it does not work, email ' + mail + EMAIL + '</a>.</p>' +
    '<h2>Shipping</h2><p>Physical items are not shipping right now. Our full shipping policy will be posted here soon. Until then, physical orders are paused and only <a href="/store" style="' + LINK + '">digital downloads</a> are available.</p>' +
    '<h2>Returns and refunds</h2><p>All sales are final. Because of the nature of digital goods and limited-run prints, we do not accept returns or offer refunds. If an item arrives damaged or a download doesn\'t work, ' + mail + 'contact us</a> and we\'ll make it right.</p>' +
    '<h2>Contact</h2><p>Questions about an order? Email ' + mail + EMAIL + '</a>.</p>';
  const desc = BRAND + ' store policies: 18+ age requirement, how digital downloads work after payment, shipping status, returns, and how to contact us.';
  return base({ title: 'Store Policies - Age, Downloads & Refunds | ' + BRAND, desc, canonical: SITE + '/policies',
    ld: [{ '@type': 'WebPage', '@id': SITE + '/policies#page', url: SITE + '/policies', name: 'Store Policies', description: desc, isPartOf: { '@id': SITE + '/#website' }, publisher: { '@id': SITE + '/#studio' } },
      breadcrumb([['Home', SITE + '/'], ['Store', SITE + '/store'], ['Store Policies', SITE + '/policies']])],
    body: wrapBody(inner, sections) });
}
function notFound(sections) {
  return base({ status: 404, title: 'Page not found | ' + BRAND, desc: 'This page does not exist on ' + BRAND + '. Browse the store, photography and art from the homepage.', canonical: null, robots: 'noindex, follow',
    body: wrapBody('<h1>Page not found</h1><p>This page does not exist. <a href="/" style="' + LINK + '">Go to the homepage</a> or <a href="/store" style="' + LINK + '">the store</a>.</p>', sections) });
}

// ---------- HTML assembly ----------
function sub(html, re, rep) {
  if (!re.test(html)) throw new Error('shell pattern missing: ' + re);
  return html.replace(re, () => rep);
}
function render(meta) {
  let h = shell();
  const og = meta.og || FALLBACK_OG;
  const t = esc(meta.title), d = esc(meta.desc);
  h = sub(h, /<title>[^<]*<\/title>/, '<title>' + t + '</title>');
  h = sub(h, /<link rel="canonical" href="[^"]*">/, meta.canonical ? '<link rel="canonical" href="' + esc(meta.canonical) + '">' : '');
  h = sub(h, /<meta name="rating" content="adult">\n?/, meta.adult ? '<meta name="rating" content="adult">\n' : '');
  h = sub(h, /<meta name="description" content="[^"]*">/, '<meta name="description" content="' + d + '">' + (meta.robots ? '<meta name="robots" content="' + esc(meta.robots) + '">' : ''));
  h = sub(h, /<meta property="og:type" content="[^"]*">/, '<meta property="og:type" content="' + esc(meta.ogType) + '">');
  h = sub(h, /<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + t + '">');
  h = sub(h, /<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + d + '">');
  h = sub(h, /<meta property="og:url" content="[^"]*">/, meta.canonical ? '<meta property="og:url" content="' + esc(meta.canonical) + '">' : '');
  h = sub(h, /<meta property="og:image" content="[^"]*">/, '<meta property="og:image" content="' + esc(og.url) + '">');
  h = sub(h, /<meta property="og:image:width" content="[^"]*">/, '<meta property="og:image:width" content="' + og.w + '">');
  h = sub(h, /<meta property="og:image:height" content="[^"]*">/, '<meta property="og:image:height" content="' + og.h + '">');
  h = sub(h, /<meta property="og:image:alt" content="[^"]*">/, '<meta property="og:image:alt" content="' + esc(og.alt) + '">');
  h = sub(h, /<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="' + t + '">');
  h = sub(h, /<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="' + d + '">');
  h = sub(h, /<meta name="twitter:image" content="[^"]*">/, '<meta name="twitter:image" content="' + esc(og.url) + '">');
  h = sub(h, /<meta name="twitter:image:alt" content="[^"]*">/, '<meta name="twitter:image:alt" content="' + esc(og.alt) + '">');
  const extra = (meta.extraHead || '') + (meta.ld && meta.ld.length ? ldScript(meta.ld) : '');
  h = sub(h, /<\/head>/, extra + '</head>');
  h = h.replace('<h1>\u00aeSaboteur</h1>', '<p><strong>\u00aeSaboteur</strong></p>');
  h = sub(h, /<div id="root"><\/div>/, '<div id="root">' + (meta.body || '') + '</div>');
  return h;
}

// ---------- sitemap ----------
function day(iso) { return String(iso || '').slice(0, 10) || null; }
function maxDay(list) { return list.map(day).filter(Boolean).sort().pop() || null; }
function sitemap(data) {
  const products = data.products || [];
  const sections = (data.sections || []).filter((s) => s.showInNav !== false && s.slug && s.slug !== 'store' && !s.isInfoPage && !s.isAbout);
  const assets = data.assets || [];
  const urls = [];
  const add = (loc, lastmod) => urls.push({ loc, lastmod });
  add(SITE + '/', maxDay(assets.map((a) => a._updatedAt).concat(products.map((p) => p._updatedAt))));
  add(SITE + '/store', maxDay(products.map((p) => p._updatedAt)));
  CATS.forEach((c) => {
    const list = products.filter((p) => p.category === c.id);
    if (list.length) add(catUrl(c), maxDay(list.map((p) => p._updatedAt).concat(CODE_LASTMOD[c.id] ? [CODE_LASTMOD[c.id]] : [])));
  });
  products.forEach((p) => add(productUrl(p), day(p._updatedAt)));
  sections.forEach((s) => add(SITE + '/' + s.slug, maxDay([s._updatedAt].concat(assets.filter((a) => (a.secs || []).indexOf(s.slug) >= 0).map((a) => a._updatedAt), CODE_LASTMOD[s.slug] ? [CODE_LASTMOD[s.slug]] : []))));
  add(SITE + '/about', day(data.settings && data.settings._updatedAt));
  add(SITE + '/policies', POLICIES_LASTMOD);
  add(SITE + '/facts', FACTS_LASTMOD);
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => '  <url>\n    <loc>' + esc(u.loc) + '</loc>\n' + (u.lastmod ? '    <lastmod>' + u.lastmod + '</lastmod>\n' : '') + '  </url>').join('\n') + '\n</urlset>\n';
}

module.exports = { adultImage, loadData, resolve, render, sitemap, productOg, productDesc, fitTitle, shortName, qualifier, CATS, SITE, status, OG_EXPLICIT_SLUGS };
