# Pooja Taxi Service - SEO Optimization

## Current State
The site is a full-featured taxi service landing page with hero, services, fleet, benefits, testimonials, and contact sections. The index.html has a blank title and no meta tags.

## Requested Changes (Diff)

### Add
- Comprehensive meta tags: title, description, keywords, canonical URL
- Open Graph meta tags (Facebook/WhatsApp share previews)
- Twitter Card meta tags
- JSON-LD structured data: LocalBusiness schema with address, phone, geo coordinates, services
- robots.txt allowing all crawlers
- sitemap.xml for search engine discovery
- `lang="en"` already present, keep it
- Semantic HTML: ensure sections use proper heading hierarchy (h1 in hero, h2 for section titles)
- Alt text audit on images

### Modify
- index.html: add all meta tags, JSON-LD schema, favicon link
- Hero.tsx: ensure h1 is used for primary heading
- Services/Fleet/etc: ensure h2 section headings

### Remove
- Nothing removed

## Implementation Plan
1. Update index.html with full SEO meta tags and JSON-LD LocalBusiness schema
2. Add robots.txt to public folder
3. Add sitemap.xml to public folder
4. Audit and update heading hierarchy in components
