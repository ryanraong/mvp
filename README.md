# ACTS — Apologetics for Christian Thinkers Singapore

Website for ACTS, a Singapore-based fellowship equipping Christians to examine
what they believe and give a reason for it with clarity and grace.

Anchor verse: **Acts 17:11–12** — *"they received the word with all eagerness,
examining the Scriptures daily to see if these things were so."*

## Structure

```
index.html    single-page site (hero, verse, about, beliefs, programmes, resources, events, contact)
styles.css    design system — navy/gold palette, Fraunces + Inter, responsive
script.js     mobile nav, sticky-header state, scroll reveals, footer year
```

No build step, no dependencies. Static files only.

## Running locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying

Any static host works — GitHub Pages, Netlify, Vercel, Cloudflare Pages.
Point it at the repository root; there is nothing to compile.

## Editing content

All copy lives in `index.html`. The most likely things to change:

- **Events** — the `<ul class="events">` list in `#events`
- **Resources** — the `<ul class="list">` list in `#resources`; swap the `href="#connect"`
  placeholders for real article links once they exist
- **Contact** — `hello@acts.sg` appears in the `#connect` section
- **Colours** — the `:root` custom properties at the top of `styles.css`

Programme details, dates and the contact address are placeholders pending
confirmation from ACTS.
