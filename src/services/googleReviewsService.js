const Review = require('../models/Review');

const CACHE_TTL_MS = Number(process.env.GOOGLE_REVIEWS_CACHE_TTL_MS || 1000 * 60 * 10);

let cachedPayload = null;
let cachedAt = 0;

const mapGoogleReview = (review) => ({
  id: `${review.author_name || 'review'}-${review.time || Date.now()}`,
  reviewerName: review.author_name,
  rating: review.rating,
  text: review.text,
  profileImage: review.profile_photo_url,
  relativeTime: review.relative_time_description,
  reviewDate: review.time ? new Date(review.time * 1000).toISOString() : null,
  authorUrl: review.author_url,
  language: review.language,
});

const mapDbReview = (review) => ({
  id: review._id.toString(),
  reviewerName: review.name,
  rating: review.rating || 5,
  text: review.message,
  profileImage: review.profileImage || '',
  relativeTime: review.relativeTime || (review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recent review'),
  reviewDate: review.createdAt ? review.createdAt.toISOString() : null,
  authorUrl: review.target_slug || '',
});

exports.getGoogleReviews = async ({ forceRefresh = false } = {}) => {
  const now = Date.now();
  if (!forceRefresh && cachedPayload && now - cachedAt < CACHE_TTL_MS) {
    return { ...cachedPayload, cached: true };
  }

  // 1. Fetch DB reviews first (Admin managed)
  let dbReviews = [];
  try {
    dbReviews = await Review.find({
      type: { $in: ['google_review', 'testimonial'] },
      approved: true,
    }).sort({ order: 1, createdAt: -1 });
  } catch (err) {
    console.error('Error fetching DB reviews:', err.message);
  }

  const formattedDbReviews = dbReviews.map(mapDbReview);

  // 2. Fetch Google Places API if configured
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  let googleReviews = [];
  let placeName = "MD's Homoeopathy";
  let placeUrl = 'https://www.google.com/maps/search/?api=1&query=MD%27s+Homoeopathy+Mathura';
  let apiRating = null;
  let apiTotal = 0;

  if (apiKey && placeId) {
    try {
      const fields = 'name,rating,user_ratings_total,reviews,url';
      const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      url.searchParams.set('place_id', placeId);
      url.searchParams.set('fields', fields);
      url.searchParams.set('reviews_sort', 'newest');
      url.searchParams.set('key', apiKey);

      const response = await fetch(url);
      if (response.ok) {
        const body = await response.json();
        if (body.status === 'OK' && body.result) {
          placeName = body.result.name || placeName;
          placeUrl = body.result.url || placeUrl;
          apiRating = body.result.rating || null;
          apiTotal = body.result.user_ratings_total || 0;
          if (Array.isArray(body.result.reviews)) {
            googleReviews = body.result.reviews.map(mapGoogleReview);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch from Google Places API:', err.message);
    }
  }

  // Combine reviews: DB reviews (curated) prioritized + Google Places reviews
  const allReviews = [...formattedDbReviews, ...googleReviews];

  // Calculate dynamic rating and total reviews
  let finalRating = apiRating;
  let finalTotal = Math.max(apiTotal, allReviews.length);

  if (!finalRating && allReviews.length > 0) {
    const sum = allReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    finalRating = Number((sum / allReviews.length).toFixed(1));
  }

  const payload = {
    placeName,
    placeUrl,
    rating: finalRating,
    totalReviews: finalTotal,
    reviews: allReviews,
    source: googleReviews.length > 0 ? 'google' : 'curated',
    cached: false,
    updatedAt: new Date().toISOString(),
  };

  cachedPayload = payload;
  cachedAt = now;
  return payload;
};
