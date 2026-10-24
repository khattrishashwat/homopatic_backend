const express = require('express');
const router = express.Router();
const Product = require('../../models/Product');
const Blog = require('../../models/Blog');
const Category = require('../../models/Category');
const SiteSettings = require('../../models/SiteSettings');

const getBaseSiteUrl = async () => {
  const envUrl = process.env.SITE_URL || process.env.FRONTEND_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl.replace(/\/+$/, '');
  }
  const settings = await SiteSettings.findOne({}).lean();
  if (settings?.site_url && !settings.site_url.includes('localhost')) {
    return settings.site_url.replace(/\/+$/, '');
  }
  return 'https://mdshomoeopathy.com';
};

/**
 * Generate dynamic XML sitemap
 */
router.get(['/sitemap.xml', '/sitemap'], async (req, res) => {
  try {
    const siteUrl = await getBaseSiteUrl();

    // Fetch all published products, blogs, and categories
    const [products, blogs, categories] = await Promise.all([
      Product.find({ active: true }).select('slug updated_at').lean(),
      Blog.find({ published: true }).select('slug updated_at published_at').lean(),
      Category.find({ active: true }).select('slug updated_at').lean(),
    ]);

    const dateStr = (date) => {
      try {
        const d = date ? new Date(date) : new Date();
        return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
      } catch {
        return new Date().toISOString().split('T')[0];
      }
    };

    // Static core pages
    const staticPages = [
      { loc: `${siteUrl}`, priority: '1.0', changefreq: 'daily', lastmod: new Date() },
      { loc: `${siteUrl}/shop`, priority: '0.9', changefreq: 'daily', lastmod: new Date() },
      { loc: `${siteUrl}/blog`, priority: '0.9', changefreq: 'daily', lastmod: new Date() },
      { loc: `${siteUrl}/about`, priority: '0.8', changefreq: 'monthly', lastmod: new Date() },
      { loc: `${siteUrl}/services`, priority: '0.8', changefreq: 'monthly', lastmod: new Date() },
      { loc: `${siteUrl}/treatments`, priority: '0.8', changefreq: 'monthly', lastmod: new Date() },
      { loc: `${siteUrl}/appointment`, priority: '0.8', changefreq: 'weekly', lastmod: new Date() },
      { loc: `${siteUrl}/contact`, priority: '0.7', changefreq: 'monthly', lastmod: new Date() },
    ];

    // Dynamic Product pages (/shop/:slug)
    const productUrls = products.map((p) => ({
      loc: `${siteUrl}/shop/${p.slug}`,
      lastmod: p.updated_at,
      changefreq: 'weekly',
      priority: '0.9',
    }));

    // Dynamic Published Blog pages (/blog/:slug)
    const blogUrls = blogs.map((b) => ({
      loc: `${siteUrl}/blog/${b.slug}`,
      lastmod: b.updated_at || b.published_at,
      changefreq: 'weekly',
      priority: '0.8',
    }));

    // Dynamic Category pages (/category/:slug)
    const categoryUrls = categories.map((c) => ({
      loc: `${siteUrl}/category/${c.slug}`,
      lastmod: c.updated_at,
      changefreq: 'monthly',
      priority: '0.7',
    }));

    const allUrls = [...staticPages, ...productUrls, ...blogUrls, ...categoryUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${dateStr(url.lastmod)}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.set({
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    });
    res.send(xml);
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Generate sitemap index
 */
router.get('/sitemap-index.xml', async (req, res) => {
  try {
    const siteUrl = await getBaseSiteUrl();
    const today = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${siteUrl}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

    res.set({
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    });
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
    const siteUrl = await getBaseSiteUrl();

    const robots = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /
Disallow: /admin-panel
Disallow: /admin-panel/
Disallow: /checkout
Disallow: /order-success
Disallow: /payment
Disallow: /api/

Sitemap: ${siteUrl}/sitemap.xml
`;

    res.set({
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(robots);
  } catch (error) {
    console.error('Robots.txt error:', error);
    res.status(500).send('Error generating robots.txt');
  }
});

module.exports = router;
