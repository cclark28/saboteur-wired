#!/usr/bin/env python3
"""Build policies.html from index.html.

/policies is the same SPA as every other page, but it needs its own <title>,
description, canonical and share tags in the server HTML (SEO-RULES.md).
Vercel rewrites /policies -> /policies.html. Re-run this after ANY edit to
index.html so the two stay identical apart from the head and <noscript> text:

    python3 scripts/build-policies.py
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()

URL = 'https://saboteur.one/policies'
TITLE = 'Store Policies \u2014 Age, Downloads & Refunds | \u00aeSaboteur'
DESC = ('\u00aeSaboteur store policies: 18+ age requirement, digital download delivery, '
        'shipping status, returns and refunds, and how to contact us about an order.')
EMAIL = 'saboteur@mail.grokbot.com'

def sub1(pattern, repl, s):
    out, n = re.subn(pattern, lambda m: repl, s, count=1, flags=re.S)
    if n != 1:
        sys.exit('build-policies: pattern not found: ' + pattern)
    return out

def attr(v):
    return v.replace('&', '&amp;').replace('"', '&quot;')

s = src
s = sub1(r'<title>[^<]*</title>', '<title>' + TITLE.replace('&', '&amp;') + '</title>', s)
s = sub1(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="' + URL + '">', s)
s = sub1(r'<meta name="description" content="[^"]*">', '<meta name="description" content="' + attr(DESC) + '">', s)
s = sub1(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="' + attr(TITLE) + '">', s)
s = sub1(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="' + attr(DESC) + '">', s)
s = sub1(r'<meta property="og:url" content="[^"]*">', '<meta property="og:url" content="' + URL + '">', s)
s = sub1(r'<meta name="twitter:title" content="[^"]*">', '<meta name="twitter:title" content="' + attr(TITLE) + '">', s)
s = sub1(r'<meta name="twitter:description" content="[^"]*">', '<meta name="twitter:description" content="' + attr(DESC) + '">', s)

ld = ('<script type="application/ld+json">\n'
      '{"@context":"https://schema.org","@graph":['
      '{"@type":"WebPage","@id":"' + URL + '#page","url":"' + URL + '","name":"Store Policies","description":"' + DESC + '",'
      '"isPartOf":{"@id":"https://saboteur.one/#website"},"publisher":{"@id":"https://saboteur.one/#studio"}},'
      '{"@type":"BreadcrumbList","itemListElement":['
      '{"@type":"ListItem","position":1,"name":"Home","item":"https://saboteur.one/"},'
      '{"@type":"ListItem","position":2,"name":"Store","item":"https://saboteur.one/store"},'
      '{"@type":"ListItem","position":3,"name":"Store Policies","item":"' + URL + '"}]}]}\n'
      '</script>\n</head>')
s = sub1(r'</head>', ld, s)

noscript = '''<noscript>
  <main style="max-width:42rem;margin:2rem auto;padding:0 1.25rem;font-family:Helvetica,Arial,sans-serif;line-height:1.5">
    <h1>Store Policies</h1>
    <h2>Age requirement</h2>
    <p>&reg;Saboteur publishes work for adults. Some titles contain nudity, violence and other mature content. By purchasing, you confirm you are 18 or older.</p>
    <h2>Digital downloads</h2>
    <p>Digital products are delivered by email right after purchase. If your download link doesn't arrive or stops working, use <a href="/resend">Re-send downloads</a> at the bottom of the site, or contact us.</p>
    <h2>Shipping</h2>
    <p>Physical items are not shipping right now. Our full shipping policy will be posted here soon. Until then, physical orders are paused and only digital downloads are available.</p>
    <h2>Returns and refunds</h2>
    <p>All sales are final. Because of the nature of digital goods and limited-run prints, we do not accept returns or offer refunds. If an item arrives damaged or a download doesn't work, contact us and we'll make it right.</p>
    <h2>Contact</h2>
    <p>Questions about an order? Email <a href="mailto:EMAIL">EMAIL</a>.</p>
    <p><a href="/store">Store</a> &middot; <a href="/">Home</a></p>
  </main>
</noscript>'''.replace('EMAIL', EMAIL)
s = sub1(r'<noscript>.*?</noscript>', noscript, s.replace('\r\n', '\n')) if '<noscript>' in s else sys.exit('no noscript')

open(os.path.join(ROOT, 'policies.html'), 'w', encoding='utf-8').write(s)
print('wrote policies.html', len(s.encode('utf-8')), 'bytes')
