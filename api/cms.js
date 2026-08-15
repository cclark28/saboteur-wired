// Same-origin Sanity proxy. Always runs the site bundle query.
// Ignores the client `query` param so /cms cannot be used for arbitrary GROQ.

const SANITY_QUERY_URL =
  'https://6td8xalf.api.sanity.io/v2024-01-01/data/query/production';

// Keep in sync with fetchSanityBundle() in index.html.
const SITE_BUNDLE_QUERY = `{
    "assets": *[_type == "asset"] | order(coalesce(_updatedAt, _createdAt) desc) {
      _id, title, headline, subhead, body, showOnHome, soldOut,
      mainImage{ asset->{ _id, url, metadata{ dimensions } } },
      mainMedia{ asset->{ _id, url, mimeType, originalFilename } },
      "galleryUrls": gallery[].asset->url,
      "tags": tags[]->{ title, "slug": slug.current },
      "sections": sections[]->{ title, "slug": slug.current }
    },
    "sections": *[_type == "section" && showInNav != false] | order(sortOrder asc) {
      title, "slug": slug.current, sortOrder, comingSoon, isInfoPage, isAbout
    },
    "settings": *[_type == "siteSettings"][0]{
      infoHeadline, infoSubhead, infoParagraphs,
      "infoMediaUrl": infoMedia.asset->url,
      "infoMediaMime": infoMedia.asset->mimeType,
      socialLinks,
      physicalOrdersEnabled,
      physicalOrdersPausedMessage
    },
    "footer": *[_type == "footer"][0]{
      marqueeText,
      logoSubhead, copyright, nextLocation, nextTimezone, localLabel, localTimezone,
      itinerary[]{ _key, startDate, city, label, timezone },
      siteMapLinks[]{ label, linkType, sectionSlug, url },
      socialLinks[]{ label, url }
    },
    "tags": *[_type == "tag"] | order(title asc) { title, "slug": slug.current },
    "ageGate": *[_type == "ageGate"][0]{
      entryMessages,
      enterButtonLabel,
      exitButtonLabel,
      exitMessages,
      exitTitles,
      "exitGifUrls": exitGifs[].asset->url
    },
    "products": *[_type == "product"] | order(coalesce(displayOrder, 999) asc, title asc) {
      _id,
      title,
      "slug": slug.current,
      description,
      priceCents,
      fulfillmentType,
      category,
      enabled,
      requiresAgeConfirm,
      displayOrder,
      stock,
      "digitalFileUrl": select(fulfillmentType == "free_digital" => digitalFileUrl),
      published,
      soldOut,
      comingSoon,
      productDetails,
      variants,
      "imageUrl": images[0].asset->url,
      "imageId": images[0].asset->_id,
      "imageRef": images[0].asset._ref,
      "imageUrls": images[].asset->url
    }
  }`;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = SANITY_QUERY_URL + '?query=' + encodeURIComponent(SITE_BUNDLE_QUERY);

  try {
    const upstream = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.send(body);
  } catch (err) {
    console.error('cms proxy failed', err && err.message);
    return res.status(502).json({ error: 'Sanity fetch failed' });
  }
};
