const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const Blog = require('../models/Blog');
const Review = require('../models/Review');
const SiteSettings = require('../models/SiteSettings');

const getBaseSiteUrl = async () => {
  const envUrl = process.env.SITE_URL || process.env.FRONTEND_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl.replace(/\/+$/, '');
  }
  try {
    const settings = await SiteSettings.findOne({}).lean();
    if (settings?.site_url && !settings.site_url.includes('localhost')) {
      return settings.site_url.replace(/\/+$/, '');
    }
  } catch {
    // ignore
  }
  return 'https://mdshomoeopathy.com';
};

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const stripHtml = (html) => {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const resolveAssetUrl = (url, siteUrl) => {
  if (!url) return `${siteUrl}/assets/md-logo.png`;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${siteUrl}${url}`;
  return `${siteUrl}/${url}`;
};

/**
 * Prerender HTML with dynamic SEO meta tags & JSON-LD structured data
 */
async function renderHtmlWithSeo(reqPath, templateHtml) {
  const siteUrl = await getBaseSiteUrl();
  const cleanPath = reqPath.split('?')[0].replace(/\/+$/, '') || '/';

  let title = "MD's Homoeopathy — Natural Treatment for Long-Term Relief";
  let description =
    "Safe, personalized Homoeopathy for hair fall, PCOD, thyroid, skin & anxiety. Online & clinic consultations. Book today.";
  let canonicalUrl = `${siteUrl}${cleanPath === '/' ? '' : cleanPath}`;
  let ogType = 'website';
  let ogImage = `${siteUrl}/assets/md-logo.png`;
  let extraMeta = '';
  let schemas = [];
  let statusCode = 200;

  // 1. Homepage
  if (cleanPath === '/' || cleanPath === '') {
    canonicalUrl = `${siteUrl}`;
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: "MD's Homoeopathy",
      url: siteUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/shop?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });

    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'MedicalClinic',
      name: "MD's Homoeopathy",
      url: siteUrl,
      logo: `${siteUrl}/assets/md-logo.png`,
      image: `${siteUrl}/assets/md-logo.png`,
      description,
      medicalSpecialty: ['Homeopathic', 'HolisticMedicine'],
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
      },
    });
  }

  // 2. Individual Product Page (/shop/:slug or /products/:slug)
  else if (cleanPath.startsWith('/shop/') || cleanPath.startsWith('/products/')) {
    const slug = cleanPath.split('/')[2];
    const product = await Product.findOne({ slug, active: true }).populate('category').lean();

    if (!product) {
      statusCode = 404;
      title = "Product Not Found | MD's Homoeopathy";
      description = 'The requested product could not be found.';
      extraMeta += `<meta name="robots" content="noindex, nofollow" />\n`;
    } else {
      canonicalUrl = `${siteUrl}/shop/${product.slug}`;
      title = `${product.name} | Natural Homeopathic Remedy | MD's Homoeopathy`;
      const rawDesc = stripHtml(product.description || product.whyWeChooseThis || product.name);
      description = rawDesc.length > 160 ? rawDesc.substring(0, 157) + '...' : rawDesc;
      ogType = 'product';
      ogImage = resolveAssetUrl(product.image, siteUrl);

      extraMeta += `<meta property="product:price:amount" content="${product.price}" />\n`;
      extraMeta += `<meta property="product:price:currency" content="INR" />\n`;
      extraMeta += `<meta property="product:availability" content="${product.in_stock ? 'in stock' : 'out of stock'}" />\n`;

      // Fetch genuine approved reviews for structured data
      const approvedReviews = await Review.find({
        type: 'product_review',
        target_slug: product.slug,
        $or: [{ status: 'approved' }, { approved: true, status: { $ne: 'rejected' } }],
      })
        .sort({ createdAt: -1 })
        .lean();

      const totalReviews = approvedReviews.length;
      const avgRating =
        totalReviews > 0
          ? Number(
              (
                approvedReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) /
                totalReviews
              ).toFixed(1)
            )
          : 0;

      const productImages = [ogImage];
      if (Array.isArray(product.gallery)) {
        product.gallery.forEach((g) => {
          if (g && g.url) productImages.push(resolveAssetUrl(g.url, siteUrl));
        });
      }

      const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: rawDesc,
        image: productImages.filter((v, i, a) => a.indexOf(v) === i),
        brand: {
          '@type': 'Brand',
          name: product.brand || "MD's Homoeopathy",
        },
        sku: product.sku || product.slug,
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'INR',
          price: product.price,
          availability: product.in_stock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
      };

      // Only add AggregateRating and Review when genuine customer reviews exist
      if (totalReviews > 0) {
        productSchema.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: avgRating.toFixed(1),
          reviewCount: totalReviews,
          bestRating: '5',
          worstRating: '1',
        };

        productSchema.review = approvedReviews.slice(0, 10).map((r) => ({
          '@type': 'Review',
          author: {
            '@type': 'Person',
            name: r.name,
          },
          datePublished: (r.reviewDate || r.createdAt || new Date()).toISOString().split('T')[0],
          reviewRating: {
            '@type': 'Rating',
            ratingValue: r.rating || 5,
            bestRating: '5',
            worstRating: '1',
          },
          reviewBody: r.message,
        }));
      }

      schemas.push(productSchema);
    }
  }

  // 3. Individual Blog Page (/blog/:slug or /blogs/:slug)
  else if (cleanPath.startsWith('/blog/') || cleanPath.startsWith('/blogs/')) {
    const slug = cleanPath.split('/')[2];
    const blog = await Blog.findOne({ slug, published: true }).lean();

    if (!blog) {
      statusCode = 404;
      title = "Blog Article Not Found | MD's Homoeopathy";
      description = 'The requested blog article could not be found.';
      extraMeta += `<meta name="robots" content="noindex, nofollow" />\n`;
    } else {
      canonicalUrl = `${siteUrl}/blog/${blog.slug}`;
      title = `${blog.title} | MD's Homoeopathy Blog`;
      description = stripHtml(blog.excerpt || blog.title);
      ogType = 'article';
      ogImage = resolveAssetUrl(blog.featured_image, siteUrl);

      const pubDate = (blog.published_at || blog.createdAt || new Date()).toISOString();
      const modDate = (blog.updatedAt || blog.published_at || blog.createdAt || new Date()).toISOString();

      extraMeta += `<meta property="article:published_time" content="${pubDate}" />\n`;
      extraMeta += `<meta property="article:modified_time" content="${modDate}" />\n`;
      extraMeta += `<meta property="article:author" content="${escapeHtml(blog.author || "MD's Homoeopathy")}" />\n`;

      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        headline: blog.title,
        description: description,
        image: [ogImage],
        datePublished: pubDate,
        dateModified: modDate,
        author: {
          '@type': 'Person',
          name: blog.author || 'Homeopathy Specialist',
          description: blog.author_bio || 'Expert homeopathic practitioner.',
        },
        publisher: {
          '@type': 'Organization',
          name: "MD's Homoeopathy",
          logo: {
            '@type': 'ImageObject',
            url: `${siteUrl}/assets/md-logo.png`,
          },
        },
      });
    }
  }

  // 4. Core Static Pages
  else if (cleanPath === '/shop') {
    title = "Homeopathic Remedies Store | Doctor-Formulated | MD's Homoeopathy";
    description =
      'Explore doctor-formulated natural homeopathic remedies for hair, skin, respiratory, and wellness care. Safe, effective & 100% natural.';
  } else if (cleanPath === '/blog') {
    title = "Health & Wellness Blog | MD's Homoeopathy";
    description =
      'Read doctor-verified health articles, lifestyle tips, and holistic remedy guides for long-term health relief.';
  } else if (cleanPath === '/about') {
    title = "About Us | MD's Homoeopathy Clinic & Wellness";
    description =
      "Learn about MD's Homoeopathy, our experienced doctors, philosophy of root-cause healing, and patient-first approach.";
  } else if (cleanPath === '/contact') {
    title = "Contact Us | MD's Homoeopathy";
    description =
      "Get in touch with MD's Homoeopathy clinic. Call, message on WhatsApp, or book your appointment online.";
  } else if (cleanPath === '/appointment') {
    title = "Book an Appointment | Online & Clinic Consultation | MD's Homoeopathy";
    description =
      'Book a confidential consultation with certified homeopathic doctors online from anywhere or visit our clinic.';
  } else if (cleanPath === '/services' || cleanPath === '/treatments') {
    title = "Treatments & Clinical Specialties | MD's Homoeopathy";
    description =
      'Holistic homeopathic treatments for chronic hair fall, allergies, thyroid, PCOD, digestive issues, and joint disorders.';
  }

  // Build the head injection block
  const schemaTags = schemas
    .map(
      (s) =>
        `    <script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n    </script>`
    )
    .join('\n');

  const metaBlock = `
    <!-- Dynamic SEO & Prerender Tags -->
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta name="robots" content="${statusCode === 404 ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta property="og:site_name" content="MD's Homoeopathy" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
${extraMeta ? '    ' + extraMeta : ''}
${schemaTags}
`;

  // Replace default title and description in templateHtml
  let rendered = templateHtml;
  rendered = rendered.replace(/<title>[\s\S]*?<\/title>/i, '');
  rendered = rendered.replace(/<meta\s+name=["']description["'][^>]*>/i, '');
  rendered = rendered.replace(/<\/head>/i, `${metaBlock}\n  </head>`);

  return { html: rendered, statusCode };
}

module.exports = {
  renderHtmlWithSeo,
  getBaseSiteUrl,
};
