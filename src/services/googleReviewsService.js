const CACHE_TTL_MS = Number(process.env.GOOGLE_REVIEWS_CACHE_TTL_MS || 1000 * 60 * 60 * 6);

let cachedPayload = null;
let cachedAt = 0;

const parseFallbackReviews = () => {
  if (!process.env.GOOGLE_REVIEWS_FALLBACK_JSON) {
    return [];
  }

  try {
    const parsed = JSON.parse(process.env.GOOGLE_REVIEWS_FALLBACK_JSON);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Invalid GOOGLE_REVIEWS_FALLBACK_JSON:', error.message);
    return [];
  }
};

const buildFallbackPayload = (reason) => ({
  rating: null,
  totalReviews: 0,
  reviews: parseFallbackReviews(),
  source: 'fallback',
  reason,
  cached: false,
  updatedAt: new Date().toISOString(),
});

const mapReview = (review) => ({
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

exports.getGoogleReviews = async ({ forceRefresh = false } = {}) => {
  const now = Date.now();
  if (!forceRefresh && cachedPayload && now - cachedAt < CACHE_TTL_MS) {
    return { ...cachedPayload, cached: true };
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    const payload = buildFallbackPayload('Google Places API is not configured');
    cachedPayload = payload;
    cachedAt = now;
    return payload;
  }

  const fields = 'name,rating,user_ratings_total,reviews,url';
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', fields);
  url.searchParams.set('reviews_sort', 'newest');
  url.searchParams.set('key', apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    if (cachedPayload) return { ...cachedPayload, cached: true };
    const error = new Error('Failed to fetch Google reviews');
    error.statusCode = response.status;
    throw error;
  }

  const body = await response.json();
  if (body.status !== 'OK') {
    if (cachedPayload) return { ...cachedPayload, cached: true };
    const payload = buildFallbackPayload(body.error_message || body.status);
    cachedPayload = payload;
    cachedAt = now;
    return payload;
  }

  const result = body.result || {};
  const payload = {
    placeName: result.name,
    placeUrl: result.url,
    rating: result.rating || null,
    totalReviews: result.user_ratings_total || 0,
    reviews: Array.isArray(result.reviews) ? result.reviews.map(mapReview) : [],
    source: 'google',
    cached: false,
    updatedAt: new Date().toISOString(),
  };

  cachedPayload = payload;
  cachedAt = now;
  return payload;
};
