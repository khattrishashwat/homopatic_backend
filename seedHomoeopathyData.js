const mongoose = require('mongoose');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
const Blog = require('./src/models/Blog');
const Review = require('./src/models/Review');
const SiteSettings = require('./src/models/SiteSettings');
require('dotenv').config();

const seedData = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL;
    if (!uri) {
      throw new Error('MONGO_URI or MONGODB_URI or MONGODB_URL environment variable is required');
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB for Homoeopathy seeding...');

    // 1. Categories
    const categoriesData = [
      { name: 'Hair & Scalp', slug: 'hair-scalp', type: 'both', active: true, description: 'Natural solutions for hair loss, dandruff, and scalp health.' },
      { name: 'Pain & Mobility', slug: 'pain-mobility', type: 'both', active: true, description: 'Homeopathic relief for joint pain, arthritis, and stiffness.' },
      { name: "Women's Health", slug: 'womens-health', type: 'both', active: true, description: 'Holistic care for PCOS, hormonal balance, and thyroid.' },
      { name: 'Skin & Dermatology', slug: 'skin-dermatology', type: 'both', active: true, description: 'Gentle, root-cause healing for psoriasis, eczema, and vitiligo.' },
      { name: 'Wellness & Immunity', slug: 'wellness-immunity', type: 'both', active: true, description: 'Immunity building for kids, adults, and seniors.' },
    ];

    const categoryMap = {};
    for (const cat of categoriesData) {
      let existing = await Category.findOne({ slug: cat.slug });
      if (!existing) {
        existing = await Category.create(cat);
        console.log(`Created category: ${cat.name}`);
      }
      categoryMap[cat.slug] = existing._id;
    }

    // 2. Products
    const productsData = [
      {
        name: 'BR Oil',
        slug: 'br-oil',
        price: 399,
        compare_price: 499,
        category: categoryMap['pain-mobility'],
        stock: 50,
        in_stock: true,
        sku: 'MD-BR-OIL-30',
        active: true,
        featured: true,
        recommended: true,
        image_alt: "MD's Homoeopathy BR Oil — 30 ml arthritic oil bottle",
        short_description: 'Natural relief for pain, stiffness & better mobility.',
        description:
          '<p><strong>BR Oil</strong> is a therapeutic homeopathic arthritic oil crafted for natural relief from pain, stiffness and reduced mobility. Made with pure and selected homeopathic ingredients, it is gentle, non-greasy and safe for daily external use.</p><h3>How to use</h3><ul><li>Take a sufficient quantity of oil.</li><li>Gently massage the affected area in a downward-to-upward direction.</li><li>Apply once or twice daily, preferably after a warm bath or before bedtime.</li><li>Do not apply on open wounds or broken skin.</li></ul>',
        attributes: {
          shortDescription: 'Natural relief for pain, stiffness & better mobility.',
          recommended: true,
          durationWeeks: 4,
          benefits: [
            'Helps reduce pain, stiffness & discomfort',
            'Supports mobility & flexibility',
            'Made with pure & selected homeopathic ingredients',
            'Gentle, natural & non-greasy',
          ],
          ingredients: [
            'Natural homeopathic oil base',
            'Selected arthritic-relief homeopathic actives',
          ],
          usage: 'For external use only. Massage a sufficient quantity on the affected area, once or twice daily.',
          faqs: [
            {
              q: 'Is BR Oil safe for daily use?',
              a: 'Yes. BR Oil is natural, non-greasy and safe for regular external use. Avoid open wounds or broken skin.',
            },
          ],
        },
      },
      {
        name: 'Scalp Vital Spray',
        slug: 'scalp-vital-spray',
        price: 499,
        compare_price: 649,
        category: categoryMap['hair-scalp'],
        stock: 45,
        in_stock: true,
        sku: 'MD-SVS-50',
        active: true,
        featured: true,
        recommended: true,
        image_alt: "MD's Homoeopathy Scalp Vital Spray — 50 ml bottle",
        short_description: 'Overall solution for hair and scalp — healthy scalp, stronger hair, naturally.',
        description:
          '<p><strong>Scalp Vital Spray</strong> is a homeopathic formulation that works at the root to restore balance, relieve irritation and promote lasting scalp health. Nourish, strengthen and protect — for a healthy scalp and stronger hair, naturally.</p><h3>Why your scalp needs it</h3><ul><li>Removes dryness and locks in moisture.</li><li>Controls dandruff, flakes and itchiness.</li><li>Supports against fungal imbalance.</li><li>Soothes scalp psoriasis symptoms.</li></ul>',
        attributes: {
          shortDescription: 'Overall solution for hair and scalp — healthy scalp, stronger hair, naturally.',
          recommended: true,
          durationWeeks: 6,
          benefits: [
            'Removes dryness & prevents flakiness',
            'Controls dandruff & soothes itchy scalp',
            'Supports healthy hair follicles',
            'Non-sticky, easily absorbable spray',
          ],
          ingredients: [
            'Pure homeopathic botanical extracts',
            'Scalp-nourishing mineral actives',
          ],
          usage: 'Spray directly onto scalp sections twice daily. Gently massage with fingertips.',
          faqs: [
            {
              q: 'Does it leave an oily residue?',
              a: 'No, Scalp Vital Spray is completely water-based and non-sticky.',
            },
          ],
        },
      },
    ];

    for (const prod of productsData) {
      const existing = await Product.findOne({ slug: prod.slug });
      if (!existing) {
        await Product.create(prod);
        console.log(`Created product: ${prod.name}`);
      } else {
        existing.featured = true;
        existing.recommended = true;
        await existing.save();
        console.log(`Updated product: ${prod.name} with featured & recommended flags`);
      }
    }

    // 3. Blogs
    const blogsData = [
      {
        title: 'Homeopathy for PCOD and Hormonal Balance: A Natural Root-Cause Approach',
        slug: 'homeopathy-pcod-hormonal-balance',
        excerpt:
          'Learn how classical homeopathy works at the root cause to regularize menstrual cycles, restore ovulation, and balance hormones safely without synthetic drugs.',
        content:
          '<p>Polycystic Ovarian Disease (PCOD) and Polycystic Ovary Syndrome (PCOS) affect millions of women worldwide. Conventional treatments often rely on synthetic oral contraceptives or hormone replacement therapies that merely suppress symptoms rather than solving the constitutional underlying imbalance.</p><h2>The Root-Cause Homeopathic Approach</h2><p>Classical homeopathy evaluates the entire person — physical health, emotional patterns, metabolic tendency, and genetic susceptibility. Homeopathic remedies gently stimulate the endocrine axis (hypothalamus-pituitary-ovary), restoring regular cycles, promoting natural ovulation, and reducing unwanted symptoms like acne, weight gain, and facial hair.</p>',
        category: categoryMap['womens-health'],
        author: 'Dr. Parth Bhargava',
        author_bio: 'BHMS, Homoeopathic Consultant at MD’s Homoeopathy.',
        published: true,
        featured: true,
        published_at: new Date('2026-02-15'),
        reading_time: 6,
        tags: ['PCOD', 'Hormonal Health', 'Women Health', 'Homeopathy'],
      },
      {
        title: 'Managing Chronic Hair Fall & Alopecia with Homeopathic Medicine',
        slug: 'managing-hair-fall-alopecia-homeopathy',
        excerpt:
          'Understand the real triggers behind chronic hair loss, diffuse thinning, and dandruff, and discover how constitutional homeopathy restores scalp vitality.',
        content:
          '<p>Hair fall is rarely an isolated cosmetic concern; it is frequently an external signal of nutritional deficits, chronic stress, hormonal shifts, or auto-immune triggers (such as Alopecia Areata). Homeopathy treats the internal disharmony to strengthen the root of each follicle.</p><h2>Targeting Scalp and Internal Health</h2><p>Homeopathic remedies nourish follicular micro-circulation, soothe inflammation from dandruff and seborrhea, and arrest excessive shedding without any steroid dependency.</p>',
        category: categoryMap['hair-scalp'],
        author: 'Dr. Parth Bhargava',
        author_bio: 'BHMS, Homoeopathic Consultant at MD’s Homoeopathy.',
        published: true,
        featured: true,
        published_at: new Date('2026-02-28'),
        reading_time: 5,
        tags: ['Hair Fall', 'Alopecia', 'Scalp Care', 'Homeopathy'],
      },
      {
        title: 'Natural Healing for Arthritis and Joint Pain: Restoring Mobility Without Side Effects',
        slug: 'natural-healing-arthritis-joint-pain',
        excerpt:
          'Explore safe, long-term homeopathic therapies for Osteoarthritis, Rheumatoid Arthritis, and stiffness to preserve joint cartilage and improve daily flexibility.',
        content:
          '<p>Chronic joint pain and morning stiffness significantly impair daily quality of life. Long-term reliance on conventional pain relievers (NSAIDs) carries risks to gastrointestinal and renal health. Homeopathy offers safe, anti-inflammatory, and cartilage-supportive alternatives.</p><h2>Lasting Mobility</h2><p>By tailoring remedies to the exact modality of joint discomfort (aggravation by dampness, relief with gentle warmth), patients achieve sustainable pain reduction and increased range of motion.</p>',
        category: categoryMap['pain-mobility'],
        author: 'Dr. Gaurav Bhargava',
        author_bio: 'Senior Homoeopathic Consultant & Head of R&D Cell at MD’s Homoeopathy.',
        published: true,
        featured: true,
        published_at: new Date('2026-03-01'),
        reading_time: 7,
        tags: ['Arthritis', 'Joint Pain', 'Mobility', 'Pain Relief'],
      },
    ];

    for (const blog of blogsData) {
      const existing = await Blog.findOne({ slug: blog.slug });
      if (!existing) {
        await Blog.create(blog);
        console.log(`Created blog: ${blog.title}`);
      }
    }

    // 4. Reviews / Testimonials
    const reviewsData = [
      {
        type: 'google_review',
        name: 'Rakesh Kumar',
        rating: 5,
        message:
          'Consulted Dr. Parth for severe cervical spondylitis and chronic migraines. Within two months of starting homeopathic treatment, my neck pain has subsided completely without any painkillers.',
        relativeTime: '2 weeks ago',
        order: 1,
        approved: true,
      },
      {
        type: 'google_review',
        name: 'Meenakshi Sharma',
        rating: 5,
        message:
          'I was struggling with PCOD and irregular periods for 3 years. After starting treatment at MD’s Homoeopathy, my cycles are regular and hormonal reports have normalized. Truly grateful!',
        relativeTime: '1 month ago',
        order: 2,
        approved: true,
      },
      {
        type: 'google_review',
        name: 'Amit Agarwal',
        rating: 5,
        message:
          'Very professional clinic in Mathura. In-house diagnostics and genuine homeopathic medicines delivered right to our door. Highly recommended for safe, natural healing.',
        relativeTime: '3 weeks ago',
        order: 3,
        approved: true,
      },
      {
        type: 'google_review',
        name: 'Pooja Verma',
        rating: 5,
        message:
          'Using Scalp Vital Spray along with doctor consultation for hair fall. Dandruff is gone and my hair volume has noticeably improved. Gentle and effective.',
        relativeTime: '2 months ago',
        order: 4,
        approved: true,
      },
    ];

    for (const rev of reviewsData) {
      const existing = await Review.findOne({ name: rev.name, type: rev.type });
      if (!existing) {
        await Review.create(rev);
        console.log(`Created review: ${rev.name}`);
      }
    }

    // 5. SiteSettings
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings();
    }
    settings.site_name = "MD's HOMOEOPATHY";
    settings.phone = '+91 7668610031';
    settings.email = 'mdshomoeopathy13@gmail.com';
    settings.address = '1262/3A, Deeg Gali, Shahganj Darwaza, Mathura, Uttar Pradesh – 281001, India';
    settings.site_description = 'Personalized Homoeopathy treatment for chronic and acute conditions. Trusted by 1000+ patients.';
    settings.chatbot_settings = {
      enabled: true,
      welcome_message: "Hi! 👋 Welcome to MD's Homoeopathy. I'm your digital wellness assistant. How can I assist your health journey today?",
      suggested_questions: [
        'How long does homeopathic treatment take?',
        'What conditions do you treat?',
        'How to book an appointment?',
        'Do you offer online consultation & delivery?',
        'Are there any side effects?',
      ],
    };
    settings.social_links = {
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com',
      whatsapp: '+917668610031',
      youtube: 'https://youtube.com',
    };
    settings.business_hours = {
      monday_friday: '9:00 AM – 8:00 PM',
      saturday: '9:00 AM – 8:00 PM',
      sunday: '10:00 AM – 2:00 PM',
    };
    await settings.save();
    console.log('SiteSettings initialized with chatbot and clinic contact details.');

    console.log('Homoeopathy database seeding completed successfully!');
  } catch (error) {
    console.error('Error during Homoeopathy seeding:', error);
  } finally {
    await mongoose.connection.close();
  }
};

seedData();
