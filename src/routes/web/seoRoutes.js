const express = require('express');
const router = express.Router();
const Product = require('../../models/Product');
const Blog = require('../../models/Blog');
const Category = require('../../models/Category');
const SiteSettings = require('../../models/SiteSettings');

/**
 * Generate dynamic XML sitemap
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.SITE_URL || 'http://localhost:5000';
    const settings = await SiteSettings.findOne({});
    const siteUrl = settings?.site_url || baseUrl;

    // Fetch all published data
    const [products, blogs, categories] = await Promise.all([
      Product.find({ active: true }).select('slug updated_at').lean(),
      Blog.find({ published: true }).select('slug updated_at').lean(),
      Category.find({ active: true }).select('slug updated_at').lean(),
    ]);

    const generateUrlset = (urls) => {
      const dateStr = (date) => new Date(date).toISOString().split('T')[0];

      return `
  <url>
    <loc>${siteUrl}</loc>
    <lastmod>${dateStr(new Date())}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${urls.map(url => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${dateStr(url.lastmod || url.updated_at || new Date())}</lastmod>
    <changefreq>${url.changefreq || 'weekly'}</changefreq>
    <priority>${url.priority || '0.8'}</priority>
  </url>
  `).join('')}`.trim();
    };

    const productUrls = products.map(p => ({
      loc: `${siteUrl}/products/${p.slug}`,
      lastmod: p.updated_at,
      changefreq: 'weekly',
      priority: '0.9',
    }));

    const blogUrls = blogs.map(b => ({
      loc: `${siteUrl}/blog/${b.slug}`,
      lastmod: b.updated_at,
      changefreq: 'weekly',
      priority: '0.8',
    }));

    const categoryUrls = categories.map(c => ({
      loc: `${siteUrl}/category/${c.slug}`,
      lastmod: c.updated_at,
      changefreq: 'monthly',
      priority: '0.7',
    }));

    const allUrls = [...productUrls, ...blogUrls, ...categoryUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${generateUrlset(allUrls)}
</urlset>`;

    res.set({ 'Content-Type': 'application/xml' });
    res.send(xml);
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Generate sitemap index (for multiple sitemap files if needed)
 */
router.get('/sitemap-index.xml', async (req, res) => {
  try {
    const baseUrl = process.env.SITE_URL || 'http://localhost:5000';
    const settings = await SiteSettings.findOne({});
    const siteUrl = settings?.site_url || baseUrl;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${siteUrl}/api/seo/sitemap.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
</sitemapindex>`;

    res.set({ 'Content-Type': 'application/xml' });
    res.send(xml);
  } catch (error) {
    console.error('Sitemap index error:', error);
    res.status(500).send('Error generating sitemap index');
  }
});

/**
 * Robots.txt
 */
router.get('/robots.txt', async (req, res) => {
  try {
    const baseUrl = process.env.SITE_URL || 'http://localhost:5000';
    const settings = await SiteSettings.findOne({});
    const siteUrl = settings?.site_url || baseUrl;

    const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/api/seo/sitemap.xml
`;

    res.set({ 'Content-Type': 'text/plain' });
    res.send(robots);
  } catch (error) {
    console.error('Robots.txt error:', error);
    res.status(500).send('Error generating robots.txt');
  }
});

module.exports = router;
